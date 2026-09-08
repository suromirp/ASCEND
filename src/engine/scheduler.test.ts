import { describe, it, expect } from 'vitest';
import { proposeMove, proposeNoTimeToday, proposeSkip, skipSession, dayHasRoomFor } from './scheduler';
import type { PlannedSession, SessionTemplate, SessionLog } from '../models/training';
import type { DailyTimeBudget } from '../models/goalEngineConfig';

// Phase 0a regression safety net (ASCEND Technical Architecture v0.3.2) —
// these lock in the scheduler's ACTUAL current behavior before any nearby
// domain migration starts, so a later change that quietly breaks the
// 48h-spacing cascade or the "geen tijd vandaag" fallback shows up here
// first, not in production.

function template(id: string, type: SessionTemplate['type'] = 'strength'): SessionTemplate {
  return { id, name: id, type, durationVariants: { full: 60 } };
}

function session(id: string, templateId: string, scheduledDate: string, weekStartDate: string, status: PlannedSession['status'] = 'planned'): PlannedSession {
  return { id, templateId, scheduledDate, weekStartDate, status, order: 0 };
}

function templateWithProfile(id: string, type: SessionTemplate['type'], lowerBodyLoad: 'none' | 'light' | 'moderate' | 'heavy'): SessionTemplate {
  return { id, name: id, type, durationVariants: { full: 60 }, baseStressProfile: { lowerBodyLoad, impact: 'moderate', eccentricLoad: 'light', intensity: 'moderate' } };
}

function log(overrides: Partial<SessionLog> & { plannedSessionId: string; completedDate: string }): SessionLog {
  return {
    id: `log-${overrides.plannedSessionId}`,
    templateId: 'tpl_x',
    type: 'strength',
    completedAt: `${overrides.completedDate}T10:00:00.000Z`,
    variant: 'full',
    durationMinutes: 60,
    source: 'manual',
    ...overrides,
  };
}

const templates = [
  template('tpl_lower_a'),
  template('tpl_lower_b'),
  template('tpl_bergconditie', 'hiking'),
  template('tpl_easy_run', 'cardio'),
  { ...templateWithProfile('tpl_hill_intervals', 'cardio', 'heavy'), pairingOverride: [{ withTemplateId: 'tpl_long_run', verdict: 'prefer' as const }] },
  templateWithProfile('tpl_long_run', 'hiking', 'heavy'),
];

const MON = '2026-09-07';
const TUE = '2026-09-08';
const WED = '2026-09-09';
const THU = '2026-09-10';
const FRI = '2026-09-11';
const SAT = '2026-09-12';
const SUN = '2026-09-13';

describe('proposeMove', () => {
  it('resolves with a single change when the target day has no leg-heavy conflict', () => {
    const week = [session('s1', 'tpl_easy_run', WED, MON)];
    const proposal = proposeMove(week, templates, 's1', FRI);
    expect(proposal.resolved).toBe(true);
    expect(proposal.changes).toEqual([{ sessionId: 's1', templateId: 'tpl_easy_run', templateName: 'tpl_easy_run', fromDate: WED, toDate: FRI }]);
    expect(proposal.reason).toBe('Geen conflicten gevonden.');
  });

  it('cascades a conflicting leg-heavy session to a later free day in the same week', () => {
    const week = [
      session('a', 'tpl_bergconditie', FRI, MON),
      session('b', 'tpl_lower_a', SUN, MON),
    ];
    const proposal = proposeMove(week, templates, 'a', SAT); // adjacent to b's Sunday slot
    expect(proposal.resolved).toBe(true);
    expect(proposal.changes).toHaveLength(2);
    expect(proposal.changes[0]).toEqual({ sessionId: 'a', templateId: 'tpl_bergconditie', templateName: 'tpl_bergconditie', fromDate: FRI, toDate: SAT });
    // b must land somewhere at least 2 days from a's new Saturday slot and free
    expect(proposal.changes[1].sessionId).toBe('b');
    expect(proposal.changes[1].fromDate).toBe(SUN);
    expect(proposal.reason).toMatch(/schuift op/);
  });

  // Groep C: onder de oude harde 48u-regel blokkeerde dit fixture élke
  // kandidaatdag voor de cascade (Monday's oude plek werd immers ook als
  // "binnen 48u van Tuesday" gezien, hoe ver ook). Nu beenbelasting een
  // zachte score is, wordt Monday — vrijgekomen zodra sessie 'a' naar
  // Tuesday verschuift — wél degelijk gevonden: 1 dag van Tuesday (cost
  // 0,5) is ruim onder de compromised-drempel, dus een schone plaatsing.
  // Dit is precies de bedoelde verbetering, geen regressie.
  it('cascades onto a day that only just became free, once clustering cost stays acceptable', () => {
    const week = [
      session('a', 'tpl_lower_a', MON, MON),
      session('b', 'tpl_lower_b', WED, MON),
      session('c', 'tpl_bergconditie', FRI, MON),
      session('d', 'tpl_lower_a', SUN, MON),
    ];
    const proposal = proposeMove(week, templates, 'a', TUE);
    expect(proposal.resolved).toBe(true);
    expect(proposal.changes).toHaveLength(2);
    expect(proposal.changes[1]).toMatchObject({ sessionId: 'b', fromDate: WED, toDate: MON });
    expect(proposal.reason).toMatch(/spreiden/);
    expect(proposal.reason).not.toMatch(/Let op:/);
  });

  it('never flags the intentional hill-intervals + long-run weekend as a conflict, even though both are leg-heavy', () => {
    const week = [
      session('hills', 'tpl_hill_intervals', SAT, MON),
      session('run', 'tpl_long_run', FRI, MON),
    ];
    const proposal = proposeMove(week, templates, 'run', SUN); // now adjacent to hills on Saturday
    expect(proposal.resolved).toBe(true);
    expect(proposal.changes).toHaveLength(1); // no cascade — this pairing is exempt
    expect(proposal.reason).toBe('Geen conflicten gevonden.');
  });

  it('still flags a conflict between an intentionally-paired template and an unrelated leg-heavy session', () => {
    const week = [
      session('hills', 'tpl_hill_intervals', SAT, MON),
      session('lower', 'tpl_lower_a', THU, MON),
    ];
    const proposal = proposeMove(week, templates, 'hills', FRI); // adjacent to lower's Thursday slot
    expect(proposal.changes.length).toBeGreaterThan(1); // the exemption does not extend to tpl_lower_a
  });

  it('widens the minimum gap to 2 days when the earlier leg-heavy session was itself unusually heavy (logged RPE 9)', () => {
    const recentLogs = [log({ plannedSessionId: 'a', completedDate: MON, rpe: 9 })];

    // Without the heavy log, Tuesday (1 day from Monday) is a normal
    // adjacent-day conflict either way — the real test is Wednesday (2
    // days out), which passes the plain 1-day rule but must now be
    // refused once Monday's session is known to have been unusually heavy.
    const week = [
      session('a', 'tpl_lower_a', MON, MON),
      session('c', 'tpl_lower_b', THU, MON),
    ];
    const withoutHeavyLog = proposeMove(week, templates, 'c', WED);
    expect(withoutHeavyLog.resolved).toBe(true); // 2 days out — fine under the plain 1-day rule

    const withHeavyLog = proposeMove(week, templates, 'c', WED, recentLogs);
    expect(withHeavyLog.changes.length).toBeGreaterThan(1); // now cascaded away — Wednesday conflicts once Monday's session is flagged heavy
  });

  // Time-budget scheduling redesign (Fase 3) + Groep C: the cascade's
  // free-day search goes through dayHasRoomFor, so a day that's already
  // occupied can become a valid cascade candidate once a real
  // DailyTimeBudget makes room for pairing. Groep C changes what happens
  // WITHOUT a budget too: Monday (freed up once 'a' moves to Tuesday) is
  // now a valid, low-cost candidate on its own (soft scoring, not a hard
  // 48h block) — so this no longer demonstrates "budget is the only way
  // in", it demonstrates "the search picks the objectively better spot":
  // without a budget, Monday (1 day from Tuesday, cost 0.5) is the only
  // option; with Thursday's budget added, Thursday (2 days from Tuesday,
  // cost 0.2 — genuinely less clustered) wins instead.
  it('picks the lowest-cost cascade candidate, and a DailyTimeBudget can unlock a genuinely better one', () => {
    const week = [
      session('a', 'tpl_lower_a', MON, MON),
      session('b', 'tpl_lower_b', WED, MON),
      session('busy', 'tpl_easy_run', THU, MON), // 60 min — occupied without a budget
      session('fri_filler', 'tpl_easy_run', FRI, MON),
      session('sat_filler', 'tpl_easy_run', SAT, MON),
      session('sun_filler', 'tpl_easy_run', SUN, MON),
    ];

    const withoutBudget = proposeMove(week, templates, 'a', TUE);
    expect(withoutBudget.resolved).toBe(true);
    expect(withoutBudget.changes).toHaveLength(2);
    expect(withoutBudget.changes[1]).toMatchObject({ sessionId: 'b', fromDate: WED, toDate: MON }); // the only free day without a budget

    const thuBudget: Record<string, DailyTimeBudget> = { thu: { preferredMinutes: 90, softFlexMinutes: 40 } }; // 60 (busy) + 60 (b) = 120 <= 130
    const withBudget = proposeMove(week, templates, 'a', TUE, [], null, thuBudget, 'automatic');
    expect(withBudget.resolved).toBe(true);
    expect(withBudget.changes).toHaveLength(2);
    expect(withBudget.changes[1]).toMatchObject({ sessionId: 'b', fromDate: WED, toDate: THU }); // now available AND objectively less clustered than Monday
  });
});

describe('proposeNoTimeToday', () => {
  it('moves today\'s sessions to the next free day this week', () => {
    const week = [session('s1', 'tpl_easy_run', WED, MON)];
    const proposals = proposeNoTimeToday(week, templates, WED);
    expect(proposals).toHaveLength(1);
    expect(proposals[0].resolved).toBe(true);
    expect(proposals[0].changes[0]).toMatchObject({ sessionId: 's1', fromDate: WED, toDate: THU });
  });

  it('falls back to a same-date skip marker when the week is fully booked', () => {
    const week = [MON, TUE, WED, THU, FRI, SAT, SUN].map((d, i) => session(`s${i}`, 'tpl_easy_run', d, MON));
    const proposals = proposeNoTimeToday(week, templates, WED);
    expect(proposals).toHaveLength(1);
    expect(proposals[0].resolved).toBe(false);
    expect(proposals[0].changes[0]).toMatchObject({ sessionId: 's2', fromDate: WED, toDate: WED });
    expect(proposals[0].reason).toMatch(/overgeslagen/);
  });

  it('ignores already-skipped sessions', () => {
    const week = [session('s1', 'tpl_easy_run', WED, MON, 'skipped')];
    expect(proposeNoTimeToday(week, templates, WED)).toEqual([]);
  });

  // Time-budget scheduling redesign (Fase 3): same dayHasRoomFor rewiring
  // as proposeMove — a "fully booked" week only stays fully booked when no
  // day has budget room; once one does, that day resolves it instead of
  // falling back to a same-date skip.
  it('a DailyTimeBudget turns an otherwise fully-booked week into a resolved pairing instead of a skip', () => {
    const week = [MON, TUE, WED, THU, FRI, SAT, SUN].map((d, i) => session(`s${i}`, 'tpl_easy_run', d, MON));
    const friBudget: Record<string, DailyTimeBudget> = { fri: { preferredMinutes: 90, softFlexMinutes: 40 } }; // 60 (existing) + 60 (moved) = 120 <= 130
    const proposals = proposeNoTimeToday(week, templates, WED, [], null, friBudget, 'automatic');
    expect(proposals).toHaveLength(1);
    expect(proposals[0].resolved).toBe(true);
    expect(proposals[0].changes[0]).toMatchObject({ sessionId: 's2', fromDate: WED, toDate: FRI });
  });
});

describe('skipSession', () => {
  it('sets status to skipped without touching other fields', () => {
    const s = session('s1', 'tpl_easy_run', WED, MON);
    expect(skipSession(s)).toEqual({ ...s, status: 'skipped' });
  });
});

describe('proposeSkip', () => {
  it('produces a same-date, resolved ScheduleProposal — the shape a skip is represented as', () => {
    const s = session('s1', 'tpl_easy_run', WED, MON);
    const proposal = proposeSkip(s, templates);
    expect(proposal.resolved).toBe(true);
    expect(proposal.changes).toEqual([{ sessionId: 's1', templateId: 'tpl_easy_run', templateName: 'tpl_easy_run', fromDate: WED, toDate: WED }]);
  });
});

// Time-budget scheduling redesign (Fase 1) — dayHasRoomFor replaces the
// old boolean isSlotFree as the hard placement gate.
describe('dayHasRoomFor', () => {
  const templateById = new Map(templates.map((t) => [t.id, t]));
  // WED (2026-09-09) is a Wednesday.
  function budget(overrides: Partial<DailyTimeBudget> = {}): Record<string, DailyTimeBudget> {
    return { wed: { preferredMinutes: 90, softFlexMinutes: 15, ...overrides } };
  }

  it('falls back to "only when genuinely empty" when no budget is configured for that weekday', () => {
    const week = [session('s1', 'tpl_easy_run', WED, MON)];
    expect(dayHasRoomFor(WED, template('tpl_upper_a'), week, templateById, null, undefined)).toBe(false);
    expect(dayHasRoomFor(WED, template('tpl_upper_a'), [], templateById, null, undefined)).toBe(true);
  });

  it('allows a second session when the combined duration fits the preferred+softFlex ceiling', () => {
    const week = [session('s1', 'tpl_easy_run', WED, MON)]; // 60 min
    // candidate is also 60 min (default template() duration) -> 120 total, ceiling 90+15=105
    expect(dayHasRoomFor(WED, template('tpl_x'), week, templateById, null, budget())).toBe(false);
    // a lighter budget with more flex covers it
    expect(dayHasRoomFor(WED, template('tpl_x'), week, templateById, null, budget({ softFlexMinutes: 60 }))).toBe(true);
  });

  it('a hard maximum blocks placement even when the soft ceiling would allow it', () => {
    const week = [session('s1', 'tpl_easy_run', WED, MON)]; // 60 min
    expect(dayHasRoomFor(WED, template('tpl_x'), week, templateById, null, budget({ softFlexMinutes: 60, hardMaximumMinutes: 100 }))).toBe(false);
  });

  it("'never' hard-blocks any second session regardless of budget", () => {
    const week = [session('s1', 'tpl_easy_run', WED, MON)];
    expect(dayHasRoomFor(WED, template('tpl_x'), week, templateById, null, budget({ softFlexMinutes: 60 }), 'never')).toBe(false);
    expect(dayHasRoomFor(WED, template('tpl_x'), [], templateById, null, budget({ softFlexMinutes: 60 }), 'never')).toBe(true);
  });

  it("'only_if_useful' drops the soft-flex margin once a session already exists that day", () => {
    const week = [session('s1', 'tpl_easy_run', WED, MON)]; // 60 min
    const b = budget({ preferredMinutes: 90, softFlexMinutes: 60 }); // 60+60=120 <= 150 normally fits
    expect(dayHasRoomFor(WED, template('tpl_x'), week, templateById, null, b, 'automatic')).toBe(true);
    expect(dayHasRoomFor(WED, template('tpl_x'), week, templateById, null, b, 'only_if_useful')).toBe(false); // 120 > preferred-only 90
  });

  it('an empty day still only needs to fit the candidate alone', () => {
    expect(dayHasRoomFor(WED, template('tpl_x'), [], templateById, null, budget({ preferredMinutes: 60, softFlexMinutes: 0 }))).toBe(true);
  });
});

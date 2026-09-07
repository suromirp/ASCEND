import { describe, it, expect } from 'vitest';
import { proposeMove, proposeNoTimeToday, proposeSkip, skipSession } from './scheduler';
import type { PlannedSession, SessionTemplate, SessionLog } from '../models/training';

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
  templateWithProfile('tpl_hill_intervals', 'cardio', 'heavy'),
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

  it('reports unresolved when no non-conflicting free day exists for the cascade', () => {
    const week = [
      session('a', 'tpl_lower_a', MON, MON),
      session('b', 'tpl_lower_b', WED, MON),
      session('c', 'tpl_bergconditie', FRI, MON),
      session('d', 'tpl_lower_a', SUN, MON),
    ];
    // Moving Monday's session onto Tuesday conflicts with Wednesday's —
    // and every other day in the week is either occupied or itself
    // adjacent to another leg-heavy session, per the fixture above.
    const proposal = proposeMove(week, templates, 'a', TUE);
    expect(proposal.resolved).toBe(false);
    expect(proposal.changes).toHaveLength(1);
    expect(proposal.reason).toMatch(/Geen vrije dag gevonden/);
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

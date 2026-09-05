import { describe, it, expect } from 'vitest';
import { isLegHeavy, proposeMove, proposeNoTimeToday, proposeSkip, skipSession } from './scheduler';
import type { PlannedSession, SessionTemplate } from '../models/training';

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

const templates = [
  template('tpl_lower_a'),
  template('tpl_lower_b'),
  template('tpl_bergconditie', 'hiking'),
  template('tpl_easy_run', 'cardio'),
];

const MON = '2026-09-07';
const TUE = '2026-09-08';
const WED = '2026-09-09';
const THU = '2026-09-10';
const FRI = '2026-09-11';
const SAT = '2026-09-12';
const SUN = '2026-09-13';

describe('isLegHeavy', () => {
  it('flags the three leg-heavy templates', () => {
    expect(isLegHeavy('tpl_lower_a')).toBe(true);
    expect(isLegHeavy('tpl_lower_b')).toBe(true);
    expect(isLegHeavy('tpl_bergconditie')).toBe(true);
  });

  it('does not flag other templates', () => {
    expect(isLegHeavy('tpl_easy_run')).toBe(false);
    expect(isLegHeavy('unknown_template')).toBe(false);
  });
});

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

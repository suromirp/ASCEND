import { describe, it, expect } from 'vitest';
import { computeStrengthPlacementPlan, computeStrengthPlacementPlanForCommittedRange } from './strengthScheduling';
import type { PlannedSession, SessionTemplate, SessionLog } from '../models/training';
import type { TrainingAvailability } from '../models/goalEngineConfig';
import type { StrengthProgramStrategy } from '../models/strengthProgram';
import type { TrainingGoal, GoalRequirement } from '../models/goals';
import type { GoalOverview } from './goalOverview';

const ASOF = '2026-09-09'; // Wednesday — forecast is week +2 onward: 2026-09-21 Monday and later
const FORECAST_MONDAY = '2026-09-21';

function availability(overrides: Partial<TrainingAvailability> = {}): TrainingAvailability {
  return { allowedDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], maxSessionDurationMin: {}, longSessionDays: ['sun'], temporaryExceptions: [], ...overrides };
}

function session(id: string, templateId: string, scheduledDate: string, weekStartDate: string, status: PlannedSession['status'] = 'planned'): PlannedSession {
  return { id, templateId, scheduledDate, weekStartDate, status, order: 0 };
}

const tplUpperA: SessionTemplate = { id: 'tpl_upper_a', name: 'Upper A', type: 'strength', durationVariants: { full: 75 }, baseStressProfile: { lowerBodyLoad: 'none', impact: 'none', eccentricLoad: 'none', intensity: 'moderate' } };
const tplLowerA: SessionTemplate = { id: 'tpl_lower_a', name: 'Lower A', type: 'strength', durationVariants: { full: 75 }, baseStressProfile: { lowerBodyLoad: 'heavy', impact: 'light', eccentricLoad: 'moderate', intensity: 'high' } };
const tplUpperB: SessionTemplate = { id: 'tpl_upper_b', name: 'Upper B', type: 'strength', durationVariants: { full: 75 }, baseStressProfile: { lowerBodyLoad: 'none', impact: 'none', eccentricLoad: 'none', intensity: 'moderate' } };
const tplLowerB: SessionTemplate = { id: 'tpl_lower_b', name: 'Lower B', type: 'strength', durationVariants: { full: 70 }, baseStressProfile: { lowerBodyLoad: 'heavy', impact: 'light', eccentricLoad: 'moderate', intensity: 'high' } };
const tplLongRun: SessionTemplate = { id: 'tpl_long_run', name: 'Lange Duurloop', type: 'hiking', durationVariants: { full: 75 }, baseStressProfile: { lowerBodyLoad: 'heavy', impact: 'moderate', eccentricLoad: 'heavy', intensity: 'high' } };
const tplEasyRun: SessionTemplate = { id: 'tpl_easy_run', name: 'Easy Run', type: 'cardio', durationVariants: { full: 30 }, baseStressProfile: { lowerBodyLoad: 'none', impact: 'light', eccentricLoad: 'none', intensity: 'moderate' } };
const templates = [tplUpperA, tplLowerA, tplUpperB, tplLowerB, tplLongRun, tplEasyRun];

function goalOverview(overrides: {
  goalId: string;
  discipline: string;
  normalizedPct: number;
  status?: GoalOverview['feasibility']['status'];
  tapering?: boolean;
}): GoalOverview {
  const requirements: GoalRequirement[] = [
    { id: 'r1', kind: 'distance', scope: 'SINGLE_EVENT', target: { amount: 20, unit: 'km' }, discipline: overrides.discipline },
  ];
  const goal: TrainingGoal = {
    id: overrides.goalId,
    name: overrides.goalId,
    requirements,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    status: 'active',
    targetDate: '2026-12-01',
  };
  return {
    goal,
    gaps: [],
    feasibility: { goalId: overrides.goalId, status: overrides.status ?? 'on_track', confidence: 'medium', explanation: '' },
    focus: {
      goalId: overrides.goalId,
      score: overrides.normalizedPct,
      normalizedPct: overrides.normalizedPct,
      reasons: overrides.tapering ? [{ component: 'phase', points: 15 }] : [{ component: 'base', points: 10 }],
      asOf: ASOF,
    },
  };
}

function strategy(overrides: Partial<StrengthProgramStrategy> = {}): StrengthProgramStrategy {
  return {
    id: 's1',
    source: 'macrofactor_workouts',
    startDate: '2026-09-01',
    sessionsPerWeek: 3,
    splitType: 'upper_lower',
    sessionTemplateIds: ['tpl_upper_a', 'tpl_lower_a', 'tpl_upper_b'],
    status: 'active',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('computeStrengthPlacementPlan', () => {
  it('produces no changes when the forecast week already matches the active strategy', () => {
    const sessions = [
      session('s1', 'tpl_upper_a', FORECAST_MONDAY, FORECAST_MONDAY),
      session('s2', 'tpl_lower_a', '2026-09-23', FORECAST_MONDAY),
      session('s3', 'tpl_upper_b', '2026-09-24', FORECAST_MONDAY),
    ];
    const proposal = computeStrengthPlacementPlan(strategy(), sessions, templates, availability(), ASOF, []);
    expect(proposal.changes).toEqual([]);
  });

  it('never proposes anything for the committed range, even with an off-strategy session there', () => {
    const committedSession = session('ps_committed', 'tpl_lower_b', '2026-09-07', '2026-09-07');
    const proposal = computeStrengthPlacementPlan(strategy(), [committedSession], templates, availability(), ASOF, []);
    expect(proposal.changes).toEqual([]);
  });

  it('removes an off-strategy strength session (old split leftover) in the forecast range', () => {
    const sessions = [session('leftover', 'tpl_lower_b', FORECAST_MONDAY, FORECAST_MONDAY)];
    const proposal = computeStrengthPlacementPlan(strategy(), sessions, templates, availability(), ASOF, []);
    const removeItem = proposal.changes.find((c) => c.plannedSessionId === 'leftover');
    expect(removeItem?.action).toBe('remove');
    expect(removeItem?.reason).toMatch(/Lower B/);
  });

  it('adds a missing on-strategy session when the week is short one', () => {
    const sessions = [
      session('s1', 'tpl_upper_a', FORECAST_MONDAY, FORECAST_MONDAY),
      session('s2', 'tpl_lower_a', '2026-09-23', FORECAST_MONDAY),
    ];
    const proposal = computeStrengthPlacementPlan(strategy(), sessions, templates, availability(), ASOF, []);
    const addItem = proposal.changes.find((c) => c.action === 'add');
    expect(addItem?.newSessionDraft?.templateId).toBe('tpl_upper_b');
    expect(addItem?.newSessionDraft?.weekStartDate).toBe(FORECAST_MONDAY);
  });

  it('never adds a new strength session on a day unavailable per TrainingAvailability', () => {
    const sessions: PlannedSession[] = [];
    const proposal = computeStrengthPlacementPlan(
      strategy({ sessionTemplateIds: ['tpl_upper_a'], sessionsPerWeek: 1 }),
      sessions,
      templates,
      availability({ allowedDays: ['tue', 'wed', 'thu', 'fri', 'sat', 'sun'] }), // Monday blocked
      ASOF,
      [],
    );
    const addItem = proposal.changes.find((c) => c.action === 'add');
    expect(addItem?.newSessionDraft?.scheduledDate).not.toBe(FORECAST_MONDAY);
  });

  it('never places a leg-heavy strength session within 48h of another leg-heavy session', () => {
    // A leg-heavy hike already sits on Tuesday/Wednesday; placing Lower A
    // must skip both the hike's day and the days within 48h of it.
    const sessions = [session('hike', 'tpl_long_run', '2026-09-22', FORECAST_MONDAY)];
    const proposal = computeStrengthPlacementPlan(
      strategy({ sessionTemplateIds: ['tpl_lower_a'], sessionsPerWeek: 1 }),
      sessions,
      templates,
      availability(),
      ASOF,
      [],
    );
    const addItem = proposal.changes.find((c) => c.action === 'add');
    expect(addItem?.newSessionDraft?.scheduledDate).toBeDefined();
    const chosen = addItem!.newSessionDraft!.scheduledDate;
    const daysFromHike = Math.abs(new Date(chosen).getTime() - new Date('2026-09-22').getTime()) / 86400000;
    expect(daysFromHike).toBeGreaterThan(1);
  });

  it('skips placement entirely for a week with no honest slot, rather than forcing a conflict', () => {
    // Every day is leg-heavy-occupied or unavailable — no free, non-conflicting day exists.
    const sessions = ['2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25', '2026-09-26', '2026-09-27'].map((d, i) =>
      session(`filler${i}`, 'tpl_long_run', d, FORECAST_MONDAY),
    );
    const proposal = computeStrengthPlacementPlan(
      strategy({ sessionTemplateIds: ['tpl_lower_a'], sessionsPerWeek: 1 }),
      sessions,
      templates,
      availability(),
      ASOF,
      [],
    );
    expect(proposal.changes.find((c) => c.action === 'add')).toBeUndefined();
  });

  it('honestly flags an unplaceable week in the proposal text — never a silent "already matches" when the week is simply fully booked, not agreement, is the real reason nothing was added', () => {
    // Every day already holds a session — the normal state for every
    // ASCEND week — so the true blocker is "no free day", not the 48h
    // rule (even though tpl_long_run happens to be leg-heavy too).
    const sessions = ['2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25', '2026-09-26', '2026-09-27'].map((d, i) =>
      session(`filler${i}`, 'tpl_long_run', d, FORECAST_MONDAY),
    );
    const proposal = computeStrengthPlacementPlan(
      strategy({ sessionTemplateIds: ['tpl_lower_a'], sessionsPerWeek: 1 }),
      sessions,
      templates,
      availability(),
      ASOF,
      [],
    );
    expect(proposal.changes).toEqual([]);
    expect(proposal.consequences).toMatch(/geen vrije dag/);
    expect(proposal.issue).not.toBe('Geen aanpassingen nodig');
  });

  it('blames the 48h rule specifically only when a free day actually existed but every one of them conflicted', () => {
    // Monday and Wednesday are the only free days; a leg-heavy hike sits on
    // Tuesday, so both free days fall within 48h of it and get refused —
    // a genuine conflict-caused unplaceability, distinct from a full week.
    const sessions = [
      session('tue', 'tpl_long_run', '2026-09-22', FORECAST_MONDAY),
      session('thu', 'tpl_easy_run', '2026-09-24', FORECAST_MONDAY),
      session('fri', 'tpl_easy_run', '2026-09-25', FORECAST_MONDAY),
      session('sat', 'tpl_easy_run', '2026-09-26', FORECAST_MONDAY),
      session('sun', 'tpl_easy_run', '2026-09-27', FORECAST_MONDAY),
    ];
    const proposal = computeStrengthPlacementPlan(
      strategy({ sessionTemplateIds: ['tpl_lower_a'], sessionsPerWeek: 1 }),
      sessions,
      templates,
      availability(),
      ASOF,
      [],
    );
    expect(proposal.changes).toEqual([]);
    expect(proposal.consequences).toMatch(/48-uursregel/);
    expect(proposal.consequences).not.toMatch(/geen vrije dag/);
  });

  it('never emits a replace/reduce action — placement only, content stays MacroFactor\'s job', () => {
    const sessions = [session('leftover', 'tpl_lower_b', FORECAST_MONDAY, FORECAST_MONDAY)];
    const proposal = computeStrengthPlacementPlan(strategy(), sessions, templates, availability(), ASOF, []);
    expect(proposal.changes.every((c) => c.action === 'add' || c.action === 'remove')).toBe(true);
  });

  it('is idempotent — running again after a first reconciliation produces no further changes', () => {
    const sessions = [session('leftover', 'tpl_lower_b', FORECAST_MONDAY, FORECAST_MONDAY)];
    const first = computeStrengthPlacementPlan(strategy(), sessions, templates, availability(), ASOF, []);

    // Simulate applying the first proposal: leftover skipped, new sessions added.
    const afterApply: PlannedSession[] = [
      { ...sessions[0], status: 'skipped' },
      ...first.changes
        .filter((c) => c.action === 'add')
        .map((c, i) => session(`new${i}`, c.newSessionDraft!.templateId, c.newSessionDraft!.scheduledDate, c.newSessionDraft!.weekStartDate)),
    ];
    const second = computeStrengthPlacementPlan(strategy(), afterApply, templates, availability(), ASOF, []);
    expect(second.changes).toEqual([]);
  });
});

describe('computeStrengthPlacementPlan — goal-relevance-ranked swap fallback', () => {
  // A fully-booked week (the normal ASCEND state) with one cardio filler
  // (Easy Run) among otherwise leg-heavy long-run days — a genuine,
  // honestly-scoreable swap candidate distinct from recovery/hiking, which
  // are never candidates regardless of score.
  // Easy Run sits between two unrecognized-template stub days (never
  // candidates, never leg-heavy) so placing the missing (leg-heavy) Lower A
  // there never trips the unrelated 48h rule — the long-run days are kept
  // safely >1 day away.
  function packedWeekWithFiller(): PlannedSession[] {
    return [
      session('herstel1', 'tpl_herstel_stub', '2026-09-21', FORECAST_MONDAY),
      session('easy', 'tpl_easy_run', '2026-09-22', FORECAST_MONDAY),
      session('herstel2', 'tpl_herstel_stub', '2026-09-23', FORECAST_MONDAY),
      session('h1', 'tpl_long_run', '2026-09-24', FORECAST_MONDAY),
      session('h2', 'tpl_long_run', '2026-09-25', FORECAST_MONDAY),
      session('h3', 'tpl_long_run', '2026-09-26', FORECAST_MONDAY),
      session('h4', 'tpl_long_run', '2026-09-27', FORECAST_MONDAY),
    ];
  }

  it('swaps in the missing strength session for a zero-relevance candidate when there are no active goals', () => {
    const proposal = computeStrengthPlacementPlan(
      strategy({ sessionTemplateIds: ['tpl_lower_a'], sessionsPerWeek: 1 }),
      packedWeekWithFiller(),
      templates,
      availability(),
      ASOF,
      [],
    );
    const removed = proposal.changes.find((c) => c.action === 'remove');
    const added = proposal.changes.find((c) => c.action === 'add');
    expect(removed?.plannedSessionId).toBe('easy'); // the only eligible (non-recovery, non-hiking) candidate
    expect(added?.newSessionDraft?.templateId).toBe('tpl_lower_a');
    expect(added?.newSessionDraft?.scheduledDate).toBe('2026-09-22');
  });

  it('never swaps out a hiking session even when it would otherwise be the lowest-relevance candidate', () => {
    // Same shape, but with no cardio filler at all — only hiking days plus
    // an unrecognized recovery-stub session — so no eligible candidate
    // exists no matter how low the (nonexistent) relevance bar is.
    const sessions = [
      session('herstel', 'tpl_herstel_stub', '2026-09-21', FORECAST_MONDAY),
      session('h1', 'tpl_long_run', '2026-09-22', FORECAST_MONDAY),
      session('h2', 'tpl_long_run', '2026-09-23', FORECAST_MONDAY),
      session('h3', 'tpl_long_run', '2026-09-24', FORECAST_MONDAY),
      session('h4', 'tpl_long_run', '2026-09-25', FORECAST_MONDAY),
      session('h5', 'tpl_long_run', '2026-09-26', FORECAST_MONDAY),
      session('h6', 'tpl_long_run', '2026-09-27', FORECAST_MONDAY),
    ];
    const proposal = computeStrengthPlacementPlan(
      strategy({ sessionTemplateIds: ['tpl_lower_a'], sessionsPerWeek: 1 }),
      sessions,
      templates,
      availability(),
      ASOF,
      [],
    );
    expect(proposal.changes.find((c) => c.action === 'add')).toBeUndefined();
    expect(proposal.consequences).toMatch(/geen vrije dag/);
  });

  it('refuses to swap out a candidate with meaningful goal relevance when no goal is under pressure', () => {
    // A single active running goal — Easy Run genuinely serves it, so its
    // relevance is 100% (the only goal always gets the full share) and no
    // goal is tapering/challenging — nothing clears the calm 0% bar.
    const overviews = [goalOverview({ goalId: 'g1', discipline: 'running', normalizedPct: 100 })];
    const proposal = computeStrengthPlacementPlan(
      strategy({ sessionTemplateIds: ['tpl_lower_a'], sessionsPerWeek: 1 }),
      packedWeekWithFiller(),
      templates,
      availability(),
      ASOF,
      overviews,
    );
    expect(proposal.changes.find((c) => c.action === 'add')).toBeUndefined();
  });

  it('allows swapping a modestly-relevant candidate once another active goal is under real pressure', () => {
    // Goal A (hiking, tapering — under pressure) has no link to the Easy
    // Run candidate at all; Goal B (running, calm) does, at a modest 15%
    // share. Goal A being under pressure raises the bar enough for Goal
    // B's own 15% to still clear it.
    const overviews = [
      goalOverview({ goalId: 'gA', discipline: 'hiking', normalizedPct: 85, tapering: true }),
      goalOverview({ goalId: 'gB', discipline: 'running', normalizedPct: 15 }),
    ];
    const proposal = computeStrengthPlacementPlan(
      strategy({ sessionTemplateIds: ['tpl_lower_a'], sessionsPerWeek: 1 }),
      packedWeekWithFiller(),
      templates,
      availability(),
      ASOF,
      overviews,
    );
    const removed = proposal.changes.find((c) => c.action === 'remove');
    expect(removed?.plannedSessionId).toBe('easy');
    expect(removed?.reason).toMatch(/Goal Focus/);
  });

  it('never touches an already-logged session as a swap candidate, even at zero relevance', () => {
    // ASOF = 2026-09-09 (Wednesday) — committed range starts 2026-09-07.
    const committedMonday = '2026-09-07';
    const sessions = [
      session('herstel', 'tpl_herstel_stub', '2026-09-07', committedMonday),
      session('easy', 'tpl_easy_run', '2026-09-08', committedMonday),
      session('easy2', 'tpl_easy_run', '2026-09-09', committedMonday),
      session('herstel2', 'tpl_herstel_stub', '2026-09-10', committedMonday),
      session('h2', 'tpl_long_run', '2026-09-11', committedMonday),
      session('h3', 'tpl_long_run', '2026-09-12', committedMonday),
      session('h4', 'tpl_long_run', '2026-09-13', committedMonday),
    ];
    const log: SessionLog = {
      id: 'log1',
      plannedSessionId: 'easy',
      templateId: 'tpl_easy_run',
      type: 'cardio',
      completedDate: '2026-09-08',
      completedAt: '2026-09-08T10:00:00.000Z',
      variant: 'full',
      durationMinutes: 30,
      source: 'manual',
    };
    // computeStrengthPlacementPlan itself never receives sessionLogs (the
    // forecast range has none by definition), so this exercises the same
    // guard through computeStrengthPlacementPlanForCommittedRange instead,
    // which does — a forecast-only equivalent isn't meaningfully
    // constructible since nothing in the forecast range can be logged yet.
    const proposal = computeStrengthPlacementPlanForCommittedRange(
      strategy({ sessionTemplateIds: ['tpl_lower_a'], sessionsPerWeek: 1 }),
      sessions,
      templates,
      availability(),
      [log],
      ASOF,
      [],
    );
    expect(proposal.changes.find((c) => c.action === 'remove' && c.plannedSessionId === 'easy')).toBeUndefined();
    // The unlogged twin is still fair game — proves 'easy' was skipped
    // specifically because it's logged, not because no candidate existed.
    expect(proposal.changes.find((c) => c.action === 'remove' && c.plannedSessionId === 'easy2')).toBeDefined();
  });
});

// ASOF = 2026-09-09 (Wednesday) — committed range is the Monday of that
// week (2026-09-07) and the following Monday (2026-09-14).
const COMMITTED_MONDAY_1 = '2026-09-07';
const COMMITTED_MONDAY_2 = '2026-09-14';

describe('computeStrengthPlacementPlanForCommittedRange', () => {
  it('adds a missing on-strategy session into the committed range when explicitly requested', () => {
    const sessions = [
      session('s1', 'tpl_upper_a', COMMITTED_MONDAY_1, COMMITTED_MONDAY_1),
      session('s2', 'tpl_lower_a', '2026-09-09', COMMITTED_MONDAY_1),
    ];
    const proposal = computeStrengthPlacementPlanForCommittedRange(strategy(), sessions, templates, availability(), [], ASOF, []);
    const addItem = proposal.changes.find((c) => c.action === 'add' && c.newSessionDraft?.weekStartDate === COMMITTED_MONDAY_1);
    expect(addItem?.newSessionDraft?.templateId).toBe('tpl_upper_b');
  });

  it('removes an off-strategy committed-range session that has no log', () => {
    const leftover = session('leftover', 'tpl_lower_b', COMMITTED_MONDAY_2, COMMITTED_MONDAY_2);
    const proposal = computeStrengthPlacementPlanForCommittedRange(strategy(), [leftover], templates, availability(), [], ASOF, []);
    const removeItem = proposal.changes.find((c) => c.plannedSessionId === 'leftover');
    expect(removeItem?.action).toBe('remove');
  });

  it('never touches a committed-range session a SessionLog already references, even when it is off-strategy', () => {
    const logged = session('logged', 'tpl_lower_b', COMMITTED_MONDAY_1, COMMITTED_MONDAY_1);
    const log: SessionLog = {
      id: 'log1',
      plannedSessionId: 'logged',
      templateId: 'tpl_lower_b',
      type: 'strength',
      completedDate: COMMITTED_MONDAY_1,
      completedAt: '2026-09-07T10:00:00.000Z',
      variant: 'full',
      durationMinutes: 70,
      source: 'manual',
    };
    const proposal = computeStrengthPlacementPlanForCommittedRange(strategy(), [logged], templates, availability(), [log], ASOF, []);
    expect(proposal.changes.some((c) => c.plannedSessionId === 'logged')).toBe(false);
  });

  it('never produces changes outside the committed range', () => {
    const forecastLeftover = session('leftover', 'tpl_lower_b', FORECAST_MONDAY, FORECAST_MONDAY);
    const proposal = computeStrengthPlacementPlanForCommittedRange(strategy(), [forecastLeftover], templates, availability(), [], ASOF, []);
    expect(proposal.changes.some((c) => c.plannedSessionId === 'leftover')).toBe(false);
  });

  it('widens the required gap around a session logged unusually heavy (RPE 9), sports-science review Fase 2', () => {
    const hike = session('hike', 'tpl_long_run', '2026-09-08', COMMITTED_MONDAY_1); // Tuesday
    const heavyLog: SessionLog = {
      id: 'hikelog',
      plannedSessionId: 'hike',
      templateId: 'tpl_long_run',
      type: 'hiking',
      completedDate: '2026-09-08',
      completedAt: '2026-09-08T10:00:00.000Z',
      variant: 'full',
      durationMinutes: 180,
      rpe: 9,
      source: 'manual',
    };
    const proposal = computeStrengthPlacementPlanForCommittedRange(
      strategy({ sessionTemplateIds: ['tpl_lower_a'], sessionsPerWeek: 1 }),
      [hike],
      templates,
      availability(),
      [heavyLog],
      ASOF,
      [],
    );
    const addItem = proposal.changes.find((c) => c.action === 'add' && c.newSessionDraft?.weekStartDate === COMMITTED_MONDAY_1);
    expect(addItem?.newSessionDraft?.scheduledDate).toBeDefined();
    const chosen = addItem!.newSessionDraft!.scheduledDate;
    const daysFromHike = Math.abs(new Date(chosen).getTime() - new Date('2026-09-08').getTime()) / 86400000;
    // Thursday (2 days out) would pass the plain 1-day rule — the widened
    // gap from the heavy RPE 9 log must push placement further out than that.
    expect(daysFromHike).toBeGreaterThan(2);
  });
});

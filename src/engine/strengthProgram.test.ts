import { describe, it, expect } from 'vitest';
import {
  activeStrengthStrategy,
  daysUntilBlockEnd,
  computeStrengthReviewTriggers,
  buildStrengthProgramRecommendation,
  type StrengthReviewSignals,
} from './strengthProgram';
import type { StrengthProgramStrategy } from '../models/strengthProgram';
import type { GoalOverview } from './goalOverview';

const ASOF = '2026-09-09';

function strategy(overrides: Partial<StrengthProgramStrategy> = {}): StrengthProgramStrategy {
  return {
    id: 's1',
    source: 'macrofactor_workouts',
    startDate: '2026-07-01',
    plannedEndDate: '2026-09-01',
    plannedBlockWeeks: 8,
    sessionsPerWeek: 3,
    splitType: 'upper_lower',
    sessionTemplateIds: ['tpl_upper_a', 'tpl_lower_a', 'tpl_upper_b'],
    status: 'active',
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

function noSignals(overrides: Partial<StrengthReviewSignals> = {}): StrengthReviewSignals {
  return {
    daysUntilBlockEnd: undefined,
    userReportedSchemaEnded: false,
    activeGoalChangedSinceBlockStart: false,
    goalEnteredNewPhaseSinceBlockStart: false,
    availabilityOrPriorityChangedSinceBlockStart: false,
    recentLegConflictCount: 0,
    injuryChangedSinceBlockStart: false,
    ...overrides,
  };
}

describe('activeStrengthStrategy', () => {
  it('finds the active or ending strategy, ignoring completed/archived ones', () => {
    const active = strategy({ id: 'active', status: 'active' });
    const completed = strategy({ id: 'old', status: 'completed' });
    expect(activeStrengthStrategy([completed, active])?.id).toBe('active');
  });

  it('returns undefined when no strategy has ever been started', () => {
    expect(activeStrengthStrategy([])).toBeUndefined();
  });
});

describe('daysUntilBlockEnd', () => {
  it('computes days remaining when a plannedEndDate exists', () => {
    expect(daysUntilBlockEnd(strategy({ plannedEndDate: '2026-09-16' }), ASOF)).toBe(7);
  });

  it('is undefined when the block has no planned end date', () => {
    expect(daysUntilBlockEnd(strategy({ plannedEndDate: undefined }), ASOF)).toBeUndefined();
  });
});

describe('computeStrengthReviewTriggers', () => {
  it('flags nothing when no signal is present', () => {
    expect(computeStrengthReviewTriggers(noSignals())).toEqual([]);
  });

  it('flags block_ending_soon within the review window, not before it', () => {
    expect(computeStrengthReviewTriggers(noSignals({ daysUntilBlockEnd: 14 }))).toContain('block_ending_soon');
    expect(computeStrengthReviewTriggers(noSignals({ daysUntilBlockEnd: 15 }))).not.toContain('block_ending_soon');
  });

  it('flags user_reported_schema_ended from the manual trigger alone', () => {
    expect(computeStrengthReviewTriggers(noSignals({ userReportedSchemaEnded: true }))).toEqual(['user_reported_schema_ended']);
  });

  it('flags both availability_changed and priority_changed from the single config-changed signal', () => {
    const triggers = computeStrengthReviewTriggers(noSignals({ availabilityOrPriorityChangedSinceBlockStart: true }));
    expect(triggers).toEqual(['availability_changed', 'priority_changed']);
  });

  it('only flags repeated_leg_conflicts at or above the threshold, not for a single one-off cascade', () => {
    expect(computeStrengthReviewTriggers(noSignals({ recentLegConflictCount: 1 }))).toEqual([]);
    expect(computeStrengthReviewTriggers(noSignals({ recentLegConflictCount: 2 }))).toEqual(['repeated_leg_conflicts']);
  });

  it('can flag multiple triggers at once', () => {
    const triggers = computeStrengthReviewTriggers(noSignals({ userReportedSchemaEnded: true, injuryChangedSinceBlockStart: true }));
    expect(triggers).toEqual(['user_reported_schema_ended', 'injury_changed']);
  });
});

describe('buildStrengthProgramRecommendation', () => {
  it('repeats the current block shape and gives a calm rationale when no trigger fired', () => {
    const rec = buildStrengthProgramRecommendation({ currentStrategy: strategy(), triggers: [], goalOverviews: [], asOf: ASOF });
    expect(rec.suggestedSessionsPerWeek).toBe(3);
    expect(rec.suggestedSplitType).toBe('upper_lower');
    expect(rec.suggestedBlockWeeks).toBe(8);
    expect(rec.rationale).toMatch(/Periodieke check-in/);
    expect(rec.strategyId).toBe('s1');
  });

  it('falls back to sensible defaults when there is no prior block at all', () => {
    const rec = buildStrengthProgramRecommendation({ triggers: [], goalOverviews: [], asOf: ASOF });
    expect(rec.suggestedSessionsPerWeek).toBe(3);
    expect(rec.suggestedSplitType).toBe('upper_lower');
    expect(rec.suggestedBlockWeeks).toBe(8);
    expect(rec.strategyId).toBeUndefined();
  });

  it('reduces suggested frequency and explains why for repeated leg conflicts', () => {
    const rec = buildStrengthProgramRecommendation({
      currentStrategy: strategy({ sessionsPerWeek: 3 }),
      triggers: ['repeated_leg_conflicts'],
      goalOverviews: [],
      asOf: ASOF,
    });
    expect(rec.suggestedSessionsPerWeek).toBe(2);
    expect(rec.rationale).toMatch(/conflicten tussen zware beensessies/);
  });

  it('never reduces frequency below 2 sessions/week', () => {
    const rec = buildStrengthProgramRecommendation({
      currentStrategy: strategy({ sessionsPerWeek: 2 }),
      triggers: ['repeated_leg_conflicts'],
      goalOverviews: [],
      asOf: ASOF,
    });
    expect(rec.suggestedSessionsPerWeek).toBe(2);
  });

  it('explains a goal_phase_changed trigger using the tapering goal Goal Focus already identified — never re-deriving taper state itself', () => {
    const overview = {
      goal: { id: 'g1', name: 'GR5', status: 'active', targetDate: '2026-09-20', requirements: [], createdAt: '', updatedAt: '' },
      gaps: [],
      feasibility: { goalId: 'g1', status: 'on_track', confidence: 'high', explanation: '' },
      focus: { goalId: 'g1', score: 25, normalizedPct: 100, reasons: [{ component: 'phase', points: 15 }], asOf: ASOF },
    } as unknown as GoalOverview;

    const rec = buildStrengthProgramRecommendation({
      currentStrategy: strategy(),
      triggers: ['goal_phase_changed'],
      goalOverviews: [overview],
      asOf: ASOF,
    });
    expect(rec.rationale).toMatch(/GR5 treedt de taper-fase in/);
  });

  it('combines multiple trigger rationales in one recommendation', () => {
    const rec = buildStrengthProgramRecommendation({
      currentStrategy: strategy(),
      triggers: ['block_ending_soon', 'injury_changed'],
      goalOverviews: [],
      asOf: ASOF,
    });
    expect(rec.rationale).toMatch(/krachtblok loopt bijna af/);
    expect(rec.rationale).toMatch(/blessure bijgewerkt/);
  });
});

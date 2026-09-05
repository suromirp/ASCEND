import { describe, it, expect } from 'vitest';
import { computeGoalFocus, normalizeGoalFocusScores } from './goalFocus';
import type { FeasibilityAssessment } from '../models/feasibility';

function feasibility(overrides: Partial<FeasibilityAssessment> = {}): FeasibilityAssessment {
  return { goalId: 'g1', status: 'on_track', confidence: 'high', explanation: 'test', ...overrides };
}

describe('computeGoalFocus', () => {
  it('always includes a base component, even for a goal under no pressure at all', () => {
    const focus = computeGoalFocus({ goalId: 'g1', feasibility: feasibility(), criticalGapStatuses: [], isTapering: false, asOf: '2026-09-05' });
    expect(focus.reasons).toContainEqual({ component: 'base', points: expect.any(Number) });
    expect(focus.score).toBeGreaterThan(0);
  });

  it('awards more urgency points the closer a deadline is', () => {
    const far = computeGoalFocus({ goalId: 'g1', feasibility: feasibility(), criticalGapStatuses: [], daysToGoal: 300, isTapering: false, asOf: '2026-09-05' });
    const near = computeGoalFocus({ goalId: 'g1', feasibility: feasibility(), criticalGapStatuses: [], daysToGoal: 3, isTapering: false, asOf: '2026-09-05' });
    expect(near.score).toBeGreaterThan(far.score);
  });

  it('gives a taper/phase bonus while tapering, even though training volume itself would be dropping', () => {
    const tapering = computeGoalFocus({ goalId: 'g1', feasibility: feasibility(), criticalGapStatuses: [], daysToGoal: 10, isTapering: true, asOf: '2026-09-05' });
    const notTapering = computeGoalFocus({ goalId: 'g1', feasibility: feasibility(), criticalGapStatuses: [], daysToGoal: 10, isTapering: false, asOf: '2026-09-05' });
    expect(tapering.score).toBeGreaterThan(notTapering.score);
    expect(tapering.reasons).toContainEqual({ component: 'phase', points: expect.any(Number) });
  });

  it('awards more feasibilityPressure points for a more pressing feasibility status', () => {
    const onTrack = computeGoalFocus({ goalId: 'g1', feasibility: feasibility({ status: 'on_track' }), criticalGapStatuses: [], isTapering: false, asOf: '2026-09-05' });
    const unlikely = computeGoalFocus({ goalId: 'g1', feasibility: feasibility({ status: 'unlikely' }), criticalGapStatuses: [], isTapering: false, asOf: '2026-09-05' });
    expect(unlikely.score).toBeGreaterThan(onTrack.score);
  });

  it('awards more trainableGap points for a major_gap than a gap, capped at a reasonable ceiling', () => {
    const oneMajor = computeGoalFocus({ goalId: 'g1', feasibility: feasibility(), criticalGapStatuses: ['major_gap'], isTapering: false, asOf: '2026-09-05' });
    const oneGap = computeGoalFocus({ goalId: 'g1', feasibility: feasibility(), criticalGapStatuses: ['gap'], isTapering: false, asOf: '2026-09-05' });
    expect(oneMajor.score).toBeGreaterThan(oneGap.score);
  });

  it('never invents a userPriority component when the caller supplies none', () => {
    const focus = computeGoalFocus({ goalId: 'g1', feasibility: feasibility(), criticalGapStatuses: [], isTapering: false, asOf: '2026-09-05' });
    expect(focus.reasons.some((r) => r.component === 'userPriority')).toBe(false);
  });

  it('respects an explicit userPriority when supplied', () => {
    const low = computeGoalFocus({ goalId: 'g1', feasibility: feasibility(), criticalGapStatuses: [], isTapering: false, userPriority: 0, asOf: '2026-09-05' });
    const high = computeGoalFocus({ goalId: 'g1', feasibility: feasibility(), criticalGapStatuses: [], isTapering: false, userPriority: 1, asOf: '2026-09-05' });
    expect(high.score).toBeGreaterThan(low.score);
  });

  it('leaves normalizedPct unset (0) until normalizeGoalFocusScores runs — it is only meaningful across the full set', () => {
    const focus = computeGoalFocus({ goalId: 'g1', feasibility: feasibility(), criticalGapStatuses: [], isTapering: false, asOf: '2026-09-05' });
    expect(focus.normalizedPct).toBe(0);
  });
});

describe('normalizeGoalFocusScores', () => {
  it('splits 100% proportionally to each goal\'s share of the total score', () => {
    const a = computeGoalFocus({ goalId: 'a', feasibility: feasibility({ status: 'unlikely' }), criticalGapStatuses: ['major_gap'], isTapering: false, asOf: '2026-09-05' });
    const b = computeGoalFocus({ goalId: 'b', feasibility: feasibility({ status: 'on_track' }), criticalGapStatuses: [], isTapering: false, asOf: '2026-09-05' });
    const normalized = normalizeGoalFocusScores([a, b]);
    const total = normalized.reduce((sum, g) => sum + g.normalizedPct, 0);
    expect(total).toBeCloseTo(100, 5);
    expect(normalized.find((g) => g.goalId === 'a')!.normalizedPct).toBeGreaterThan(normalized.find((g) => g.goalId === 'b')!.normalizedPct);
  });

  it('never divides by zero for an empty list', () => {
    expect(normalizeGoalFocusScores([])).toEqual([]);
  });
});

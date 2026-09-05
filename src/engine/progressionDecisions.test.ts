import { describe, it, expect } from 'vitest';
import { activeGoalDemandKeys, computeProgressionDecisionsForKeys } from './progressionDecisions';
import { keyId } from './capability';
import type { TrainingGoal } from '../models/goals';
import type { ReadinessBreakdown } from './readiness';

function activeGoal(overrides: Partial<TrainingGoal> = {}): TrainingGoal {
  return {
    id: 'g1', name: 'Test Goal', status: 'active', targetDate: '2026-12-01',
    requirements: [{ id: 'r1', kind: 'elevationGain', scope: 'SINGLE_EVENT', target: { amount: 1000, unit: 'm_elevation_gain' } }],
    createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as TrainingGoal;
}

function readiness(overrides: Partial<ReadinessBreakdown> = {}): ReadinessBreakdown {
  return { strength: 80, cardio: 80, climbing: 80, endurance: 80, recovery: 80, consistency: 80, packCapability: 80, overall: 80, ...overrides };
}

describe('activeGoalDemandKeys', () => {
  it('collects demand keys only from active (targetDate-bearing) goals', () => {
    const paused: TrainingGoal = { id: 'g2', name: 'Paused', status: 'paused', requirements: [{ id: 'r2', kind: 'packWeight', scope: 'SINGLE_EVENT', target: { amount: 10, unit: 'kg' } }], createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' };
    const keys = activeGoalDemandKeys([activeGoal(), paused]);
    expect(keys).toEqual([{ dimension: 'ascent_capacity' }]);
  });

  it('de-duplicates the same key demanded by more than one active goal', () => {
    const goalA = activeGoal({ id: 'a' });
    const goalB = activeGoal({ id: 'b', targetDate: '2027-01-01' });
    const keys = activeGoalDemandKeys([goalA, goalB]);
    expect(keys).toHaveLength(1);
  });

  it('returns an empty list when no goal is active', () => {
    expect(activeGoalDemandKeys([])).toEqual([]);
  });
});

describe('computeProgressionDecisionsForKeys', () => {
  it('produces one decision per key, addressable by the same keyId used everywhere else', () => {
    const keys = [{ dimension: 'ascent_capacity' as const }];
    const decisions = computeProgressionDecisionsForKeys(keys, [], readiness(), [], [], '2026-09-05');
    expect(decisions.size).toBe(1);
    expect(decisions.get(keyId(keys[0]))?.state).toBe('assess'); // no evidence -> unknown confidence -> assess
  });

  it('never computes a decision for a key it was not asked about', () => {
    const decisions = computeProgressionDecisionsForKeys([], [], readiness(), [], [], '2026-09-05');
    expect(decisions.size).toBe(0);
  });
});

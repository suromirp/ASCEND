import { describe, it, expect } from 'vitest';
import { activeGoalDemandKeys, computeProgressionDecisionsForKeys } from './progressionDecisions';
import { keyId } from './capability';
import type { TrainingGoal } from '../models/goals';
import type { ReadinessBreakdown } from './readiness';
import type { CapacityBreakdown } from './capacity';

function activeGoal(overrides: Partial<TrainingGoal> = {}): TrainingGoal {
  return {
    id: 'g1', name: 'Test Goal', status: 'active', targetDate: '2026-12-01',
    requirements: [{ id: 'r1', kind: 'elevationGain', scope: 'SINGLE_EVENT', target: { amount: 1000, unit: 'm_elevation_gain' } }],
    createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as TrainingGoal;
}

function readiness(overrides: Partial<ReadinessBreakdown> = {}): ReadinessBreakdown {
  return { recovery: 80, consistency: 80, subjectiveSignal: 80, overall: 80, ...overrides };
}

function capacity(overrides: Partial<CapacityBreakdown> = {}): CapacityBreakdown {
  return { strength: 80, cardio: 80, climbing: 80, endurance: 80, packCapability: 80, overall: 80, ...overrides };
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
    const decisions = computeProgressionDecisionsForKeys(keys, [], readiness(), capacity(), [], [], '2026-09-05', []);
    expect(decisions.size).toBe(1);
    expect(decisions.get(keyId(keys[0]))?.state).toBe('assess'); // no evidence -> unknown confidence -> assess
  });

  it('never computes a decision for a key it was not asked about', () => {
    const decisions = computeProgressionDecisionsForKeys([], [], readiness(), capacity(), [], [], '2026-09-05', []);
    expect(decisions.size).toBe(0);
  });

  // Fase 4 (sports-science review, item D3): applyTaperOverride was fully
  // implemented in goalArbiter.ts but never wired into a live decisions
  // pipeline before this — these confirm the wiring actually fires now.
  it('overrides a decision to taper when its key\'s nearest active goal deadline is inside the taper window', () => {
    const keys = [{ dimension: 'ascent_capacity' as const }];
    const asOf = '2026-09-05';
    const nearGoal = activeGoal({ id: 'near', targetDate: '2026-09-12' }); // 7 days out
    const decisions = computeProgressionDecisionsForKeys(
      keys, [], readiness(), capacity(), [], [], asOf, [nearGoal],
    );
    const decision = decisions.get(keyId(keys[0]));
    expect(decision?.state).toBe('taper');
    expect(decision?.taperReductionFactor).toBeGreaterThan(0);
  });

  it('leaves a decision untouched when no active goal demanding that key is inside the taper window', () => {
    const keys = [{ dimension: 'ascent_capacity' as const }];
    const asOf = '2026-09-05';
    const farGoal = activeGoal({ id: 'far', targetDate: '2026-12-01' }); // far outside the 21-day window
    const decisions = computeProgressionDecisionsForKeys(
      keys, [], readiness(), capacity(), [], [], asOf, [farGoal],
    );
    expect(decisions.get(keyId(keys[0]))?.state).not.toBe('taper');
  });
});

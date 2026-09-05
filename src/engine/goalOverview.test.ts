import { describe, it, expect } from 'vitest';
import { computeActiveGoalOverviews } from './goalOverview';
import type { TrainingGoal } from '../models/goals';
import type { CapabilityEvidence } from '../models/capability';
import type { TrainingAvailability } from '../models/goalEngineConfig';

function availability(): TrainingAvailability {
  return { allowedDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], maxSessionDurationMin: {}, longSessionDays: ['sun'], temporaryExceptions: [] };
}

function activeGoal(overrides: Partial<TrainingGoal> = {}): TrainingGoal {
  return {
    id: 'g1',
    name: 'Test Goal',
    status: 'active',
    targetDate: '2026-10-05',
    requirements: [{ id: 'r1', kind: 'elevationGain', scope: 'SINGLE_EVENT', target: { amount: 1000, unit: 'm_elevation_gain' } }],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as TrainingGoal;
}

describe('computeActiveGoalOverviews', () => {
  it('skips a goal with no targetDate (paused/completed/archived) entirely', () => {
    const paused: TrainingGoal = { id: 'g2', name: 'Paused', status: 'paused', requirements: [], createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' };
    const overviews = computeActiveGoalOverviews([paused], [], availability(), [], '2026-09-05');
    expect(overviews).toEqual([]);
  });

  it('produces an insufficient_data feasibility for an active goal with no capability evidence at all', () => {
    const overviews = computeActiveGoalOverviews([activeGoal()], [], availability(), [], '2026-09-05');
    expect(overviews).toHaveLength(1);
    expect(overviews[0].feasibility.status).toBe('insufficient_data');
  });

  it('normalizes focus percentages to sum to 100 across all active goals returned', () => {
    const goalA = activeGoal({ id: 'a' });
    const goalB = activeGoal({ id: 'b', targetDate: '2027-06-01' });
    const overviews = computeActiveGoalOverviews([goalA, goalB], [], availability(), [], '2026-09-05');
    const total = overviews.reduce((sum, o) => sum + o.focus.normalizedPct, 0);
    expect(total).toBeCloseTo(100, 5);
  });

  it('reads real capability evidence to move a gap off insufficient_data', () => {
    const evidence: CapabilityEvidence[] = [
      { id: 'e1', key: { dimension: 'ascent_capacity' }, measured: { amount: 950, unit: 'm_elevation_gain' }, date: '2026-08-20', evidenceType: 'manual', source: 'manualEntry' },
      { id: 'e2', key: { dimension: 'ascent_capacity' }, measured: { amount: 900, unit: 'm_elevation_gain' }, date: '2026-08-25', evidenceType: 'manual', source: 'manualEntry' },
    ];
    const overviews = computeActiveGoalOverviews([activeGoal()], evidence, availability(), [], '2026-09-05');
    expect(overviews[0].feasibility.status).not.toBe('insufficient_data');
    expect(overviews[0].gaps[0].status).toBe('near');
  });
});

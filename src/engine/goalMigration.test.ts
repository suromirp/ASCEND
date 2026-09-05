import { describe, it, expect } from 'vitest';
import { migrateGr5ObjectiveData, buildMarathonGoal, LEGACY_MILESTONE_ID_MAP } from './goalMigration';
import type { Objective, MilestoneProgress } from '../models/objectives';

const objective: Objective = {
  id: 'obj_gr5',
  name: 'GR5 / ALPINE READINESS',
  description: 'test',
  targetDate: '2027-06-01',
  targetDistanceKm: 600,
  milestones: [
    { id: 'obj_gr5_m1', objectiveId: 'obj_gr5', order: 1, title: '40 min Easy Run onafgebroken', requirement: { kind: 'duration', activityType: 'cardio', minMinutes: 40 } },
    { id: 'obj_gr5_m2', objectiveId: 'obj_gr5', order: 2, title: '60 min bergconditie volhouden', requirement: { kind: 'duration', activityType: 'hiking', minMinutes: 60 } },
  ],
};

describe('migrateGr5ObjectiveData', () => {
  it('produces an active TrainingGoal (targetDate present) with a distance requirement', () => {
    const { goal } = migrateGr5ObjectiveData(objective, []);
    expect(goal.id).toBe('obj_gr5');
    expect(goal.name).toBe('GR5 / ALPINE READINESS');
    expect(goal.status).toBe('active');
    expect(goal.status === 'active' && goal.targetDate).toBe('2027-06-01');
    expect(goal.requirements).toEqual([{ id: expect.any(String), kind: 'distance', scope: 'total_event', target: { amount: 600, unit: 'km' } }]);
  });

  it('produces a paused goal with no targetDate when the objective has none', () => {
    const { goal } = migrateGr5ObjectiveData({ ...objective, targetDate: undefined }, []);
    expect(goal.status).toBe('paused');
    expect(goal.targetDate).toBeUndefined();
  });

  it('remaps every legacy milestone id to its stable semantic id, preserving order/title/requirement', () => {
    const { milestones } = migrateGr5ObjectiveData(objective, []);
    expect(milestones).toEqual([
      { id: LEGACY_MILESTONE_ID_MAP.obj_gr5_m1, goalId: 'obj_gr5', order: 1, title: '40 min Easy Run onafgebroken', requirement: objective.milestones[0].requirement },
      { id: LEGACY_MILESTONE_ID_MAP.obj_gr5_m2, goalId: 'obj_gr5', order: 2, title: '60 min bergconditie volhouden', requirement: objective.milestones[1].requirement },
    ]);
  });

  it('remaps GoalMilestoneProgress rows to the new milestone ids and goalId, preserving cleared history', () => {
    const legacyProgress: MilestoneProgress[] = [
      { id: 'p1', objectiveId: 'obj_gr5', milestoneId: 'obj_gr5_m1', clearedDate: '2026-01-01', sourceSessionLogId: 'log1' },
      { id: 'p2', objectiveId: 'other_objective', milestoneId: 'obj_gr5_m2', clearedDate: '2026-01-02' }, // belongs to a different objective — must not leak in
    ];
    const { progress } = migrateGr5ObjectiveData(objective, legacyProgress);
    expect(progress).toEqual([
      { id: 'p1', goalId: 'obj_gr5', milestoneId: LEGACY_MILESTONE_ID_MAP.obj_gr5_m1, clearedDate: '2026-01-01', sourceSessionLogId: 'log1', note: undefined },
    ]);
  });
});

describe('buildMarathonGoal', () => {
  it('returns null when no race type is set', () => {
    expect(buildMarathonGoal(undefined, undefined, undefined)).toBeNull();
  });

  it('builds an active goal with distance + targetTime requirements when fully configured', () => {
    const goal = buildMarathonGoal('full', '2027-04-01', 240);
    expect(goal?.status).toBe('active');
    expect(goal?.name).toBe('Marathon');
    expect(goal?.requirements).toEqual([
      { id: expect.any(String), kind: 'distance', scope: 'single_event', target: { amount: 42.2, unit: 'km' }, discipline: 'running' },
      { id: expect.any(String), kind: 'targetTime', scope: 'single_event', target: { amount: 240, unit: 'min' }, discipline: 'running' },
    ]);
  });

  it('builds a paused goal with no targetDate', () => {
    const goal = buildMarathonGoal('half', undefined, undefined);
    expect(goal?.status).toBe('paused');
    expect(goal?.requirements).toEqual([
      { id: expect.any(String), kind: 'distance', scope: 'single_event', target: { amount: 21.1, unit: 'km' }, discipline: 'running' },
    ]);
  });
});

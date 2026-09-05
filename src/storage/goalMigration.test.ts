import { describe, it, expect, beforeEach } from 'vitest';
import {
  wipeAllData,
  ObjectivesRepo,
  MilestoneProgressRepo,
  TrainingGoalsRepo,
  GoalMilestonesRepo,
  GoalMilestoneProgressRepo,
  SettingsRepo,
  MetaRepo,
} from './database';
import { migrateToGoalEngine } from './goalMigration';
import { LEGACY_MILESTONE_ID_MAP } from '../engine/goalMigration';
import type { Objective } from '../models/objectives';

const objective: Objective = {
  id: 'obj_gr5',
  name: 'GR5 / ALPINE READINESS',
  targetDate: '2027-06-01',
  targetDistanceKm: 600,
  milestones: [
    { id: 'obj_gr5_m1', objectiveId: 'obj_gr5', order: 1, title: 'First', requirement: { kind: 'duration', activityType: 'cardio', minMinutes: 40 } },
  ],
};

describe('migrateToGoalEngine', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  it('migrates the GR5 objective and its progress into the new stores, then empties the legacy ones', async () => {
    await ObjectivesRepo.put(objective);
    await MilestoneProgressRepo.put({ id: 'p1', objectiveId: 'obj_gr5', milestoneId: 'obj_gr5_m1', clearedDate: '2026-01-01' });

    await migrateToGoalEngine();

    const goals = await TrainingGoalsRepo.getAll();
    expect(goals).toHaveLength(1);
    expect(goals[0].id).toBe('obj_gr5');
    expect(goals[0].status).toBe('active');

    const milestones = await GoalMilestonesRepo.getAll();
    expect(milestones).toEqual([
      { id: LEGACY_MILESTONE_ID_MAP.obj_gr5_m1, goalId: 'obj_gr5', order: 1, title: 'First', requirement: objective.milestones[0].requirement },
    ]);

    const progress = await GoalMilestoneProgressRepo.getAll();
    expect(progress).toEqual([
      { id: 'p1', goalId: 'obj_gr5', milestoneId: LEGACY_MILESTONE_ID_MAP.obj_gr5_m1, clearedDate: '2026-01-01', sourceSessionLogId: undefined, note: undefined },
    ]);

    expect(await ObjectivesRepo.getAll()).toEqual([]);
    expect(await MilestoneProgressRepo.getAll()).toEqual([]);
  });

  it('also migrates a configured marathon goal from AppSettings', async () => {
    await SettingsRepo.set({ marathonRaceType: 'full', marathonTargetDate: '2027-04-01', marathonTargetTimeMinutes: 240 });

    await migrateToGoalEngine();

    const goals = await TrainingGoalsRepo.getAll();
    const marathon = goals.find((g) => g.name === 'Marathon');
    expect(marathon).toBeDefined();
    expect(marathon?.status).toBe('active');
  });

  it('is a no-op the second time it runs (guarded by the goalEngineMigrated flag)', async () => {
    await ObjectivesRepo.put(objective);
    await migrateToGoalEngine();
    await TrainingGoalsRepo.delete('obj_gr5'); // simulate the user having since deleted the migrated goal
    await migrateToGoalEngine();
    expect(await TrainingGoalsRepo.getAll()).toEqual([]);
    expect(await MetaRepo.get<boolean>('goalEngineMigrated')).toBe(true);
  });

  it('does nothing when there is no legacy objective and no marathon goal configured', async () => {
    await migrateToGoalEngine();
    expect(await TrainingGoalsRepo.getAll()).toEqual([]);
  });
});

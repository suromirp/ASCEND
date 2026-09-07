import { describe, it, expect, beforeEach } from 'vitest';
import { wipeAllData, TrainingGoalsRepo, GoalMilestonesRepo, GoalMilestoneProgressRepo, MetaRepo } from './database';
import { syncGr5MilestoneDefinitions, GR5_MILESTONE_CONTENT_VERSION } from './goalMilestoneSync';
import type { TrainingGoal } from '../models/goals';

const goal: TrainingGoal = {
  id: 'obj_gr5', name: 'GR5 / ALPINE READINESS', requirements: [],
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
  status: 'active', targetDate: '2027-06-01',
};

describe('syncGr5MilestoneDefinitions', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  it('does nothing when the GR5 goal was never migrated on this device', async () => {
    await syncGr5MilestoneDefinitions();
    expect(await GoalMilestonesRepo.getAll()).toEqual([]);
    expect(await MetaRepo.get<number>('gr5MilestoneContentVersion')).toBe(GR5_MILESTONE_CONTENT_VERSION);
  });

  it('overwrites the GR5 goal milestones with the current ladder content, preserving stable ids used elsewhere', async () => {
    await TrainingGoalsRepo.put(goal);
    // Simulate a device that migrated under the OLD 12-milestone content —
    // a stale title/requirement under a stable id that the new ladder reuses.
    await GoalMilestonesRepo.put({ id: 'ms_gr5_dplus_300', goalId: 'obj_gr5', order: 4, title: '300 D+ / D-', requirement: { kind: 'elevation', minMeters: 300, minLossMeters: 300 } });

    await syncGr5MilestoneDefinitions();

    const milestones = await GoalMilestonesRepo.getAll();
    expect(milestones.length).toBeGreaterThan(1); // the full new ladder was written, not just the one stale row
    const ascent300 = milestones.find((m) => m.id === 'ms_gr5_dplus_300');
    expect(ascent300?.requirement).toEqual({ kind: 'elevation', minMeters: 300 }); // decoupled from D- now
    expect(milestones.some((m) => m.id === 'ms_gr5_pack_licht_8kg')).toBe(true); // the genuinely new milestone landed too
  });

  it('never touches GoalMilestoneProgress rows — existing history stays intact under the same stable ids', async () => {
    await TrainingGoalsRepo.put(goal);
    await GoalMilestoneProgressRepo.put({ id: 'p1', goalId: 'obj_gr5', milestoneId: 'ms_gr5_weekend_simulatie', clearedDate: '2026-05-01' });

    await syncGr5MilestoneDefinitions();

    const progress = await GoalMilestoneProgressRepo.getAll();
    expect(progress).toEqual([{ id: 'p1', goalId: 'obj_gr5', milestoneId: 'ms_gr5_weekend_simulatie', clearedDate: '2026-05-01' }]);
    // and that id still refers to a real milestone in the new ladder — no orphaning
    const milestoneIds = (await GoalMilestonesRepo.getAll()).map((m) => m.id);
    expect(milestoneIds).toContain('ms_gr5_weekend_simulatie');
  });

  it('never touches the TrainingGoal row itself — a real targetDate/targetDistanceKm is not overwritten by the seed defaults', async () => {
    await TrainingGoalsRepo.put(goal);
    await syncGr5MilestoneDefinitions();
    const goals = await TrainingGoalsRepo.getAll();
    expect(goals).toEqual([goal]);
  });

  it('is a no-op the second time it runs (guarded by the version flag)', async () => {
    await TrainingGoalsRepo.put(goal);
    await syncGr5MilestoneDefinitions();
    await GoalMilestonesRepo.delete('ms_gr5_pack_licht_8kg'); // simulate the user having since deleted it
    await syncGr5MilestoneDefinitions();
    expect((await GoalMilestonesRepo.getAll()).some((m) => m.id === 'ms_gr5_pack_licht_8kg')).toBe(false);
  });
});

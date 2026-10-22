import { describe, it, expect, beforeEach } from 'vitest';
import { wipeAllData, TrainingGoalsRepo, GoalMilestonesRepo, GoalMilestoneProgressRepo, SessionLogsRepo, MetaRepo } from './database';
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
    // Only the old default English name becomes Dutch; everything the user
    // set stays exactly as it was.
    expect(goals).toEqual([goal.name === 'GR5 / ALPINE READINESS' ? { ...goal, name: 'GR5 / ALPENKLAAR' } : goal]);
  });

  it('is a no-op the second time it runs (guarded by the version flag)', async () => {
    await TrainingGoalsRepo.put(goal);
    await syncGr5MilestoneDefinitions();
    await GoalMilestonesRepo.delete('ms_gr5_pack_licht_8kg'); // simulate the user having since deleted it
    await syncGr5MilestoneDefinitions();
    expect((await GoalMilestonesRepo.getAll()).some((m) => m.id === 'ms_gr5_pack_licht_8kg')).toBe(false);
  });

  describe('version 4: the full rucksack hike follows the rucksack target', () => {
    const oldPackMilestone = { id: 'ms_gr5_rugzaksessie', goalId: 'obj_gr5', order: 11, title: 'Volle rugzaktocht: 12 kg, 15 km', requirement: { kind: 'backpack' as const, minWeightKg: 12, minKm: 15 } };
    const hikeLog = (id: string, kg: number, date: string) => SessionLogsRepo.put({
      id, templateId: 'tpl_mountain_hike', type: 'hiking', completedDate: date, completedAt: `${date}T12:00:00Z`, variant: 'full', durationMinutes: 300,
      outdoorData: { durationMinutes: 300, distanceKm: 16, backpackWeightKg: kg, source: 'manual' }, source: 'manual',
    });
    const packMilestone = async () => (await GoalMilestonesRepo.getAll()).find((m) => m.id === 'ms_gr5_rugzaksessie')!;

    it('asks 14 kg by default, in the title and in the requirement', async () => {
      await TrainingGoalsRepo.put(goal);
      await GoalMilestonesRepo.put(oldPackMilestone);
      await syncGr5MilestoneDefinitions();
      expect(await packMilestone()).toMatchObject({ title: 'Volle rugzaktocht: 14 kg, 15 km', requirement: { kind: 'backpack', minWeightKg: 14, minKm: 15 } });
    });

    it('asks what the goal says: 16 kg, or 12 kg between huts', async () => {
      const withPack = (kg: number): TrainingGoal => ({ ...goal, requirements: [{ id: 'p', kind: 'packWeight', scope: 'SINGLE_EVENT', target: { amount: kg, unit: 'kg' } }] });
      await TrainingGoalsRepo.put(withPack(16));
      await syncGr5MilestoneDefinitions();
      expect((await packMilestone()).requirement).toMatchObject({ minWeightKg: 16 });
      await wipeAllData();
      await TrainingGoalsRepo.put(withPack(12));
      await syncGr5MilestoneDefinitions();
      expect((await packMilestone()).requirement).toMatchObject({ minWeightKg: 12, minKm: 15 });
    });

    it('what you reached under the old 12 kg stays reached: a row dated at that tour, nothing rewritten', async () => {
      await TrainingGoalsRepo.put(goal);
      await GoalMilestonesRepo.put(oldPackMilestone);
      await hikeLog('l-12', 12, '2026-09-20');
      await hikeLog('l-13', 13, '2026-10-04');
      // Another milestone, cleared by hand: its row is exactly as it was.
      const mine = { id: 'mine', goalId: 'obj_gr5', milestoneId: 'ms_gr5_weekend_simulatie', clearedDate: '2026-05-01' };
      await GoalMilestoneProgressRepo.put(mine);
      await syncGr5MilestoneDefinitions();
      const rows = await GoalMilestoneProgressRepo.getAll();
      expect(rows).toHaveLength(2);
      expect(rows).toContainEqual(mine);
      expect(rows.find((r) => r.id !== 'mine')).toMatchObject({ goalId: 'obj_gr5', milestoneId: 'ms_gr5_rugzaksessie', clearedDate: '2026-09-20' });
      // Idempotent: the version flag keeps a second run from adding more.
      await syncGr5MilestoneDefinitions();
      expect(await GoalMilestoneProgressRepo.getAll()).toHaveLength(2);
    });

    it('a tour that also fits the new requirement needs no row: it is reached anyway', async () => {
      await TrainingGoalsRepo.put(goal);
      await GoalMilestonesRepo.put(oldPackMilestone);
      await hikeLog('l-15', 15, '2026-09-20');
      await syncGr5MilestoneDefinitions();
      expect(await GoalMilestoneProgressRepo.getAll()).toEqual([]);
    });
  });
});

// ASCEND — one-time device migration: Objective -> TrainingGoal /
// GoalMilestone / GoalMilestoneProgress, and marathon AppSettings fields ->
// a second TrainingGoal (Technical Architecture v0.3.1 REVISED, Migration
// plan).
//
// Runs once per device, guarded by the 'goalEngineMigrated' meta flag —
// the same guard pattern already used for 'seeded'. No permanent second
// goal system: after this runs, trainingGoals/goalMilestones/
// goalMilestoneProgress are the live source of truth and the legacy
// objectives/milestoneProgress stores are emptied (kept, not deleted, so a
// pre-migration export still imports cleanly — see storage/backup.ts,
// which reuses the same pure transform below for that exact case).
//
// Pure transform logic lives in engine/goalMigration.ts — this file only
// orchestrates reading/writing IndexedDB.

import { migrateGr5ObjectiveData, buildMarathonGoal } from '../engine/goalMigration';
import {
  ObjectivesRepo,
  MilestoneProgressRepo,
  TrainingGoalsRepo,
  GoalMilestonesRepo,
  GoalMilestoneProgressRepo,
  MetaRepo,
  SettingsRepo,
  clearLegacyObjectiveStores,
} from './database';

export async function migrateToGoalEngine(): Promise<void> {
  const migrated = await MetaRepo.get<boolean>('goalEngineMigrated');
  if (migrated) return;

  const [objectives, legacyProgress, settings] = await Promise.all([
    ObjectivesRepo.getAll(),
    MilestoneProgressRepo.getAll(),
    SettingsRepo.get(),
  ]);

  const gr5 = objectives[0]; // today's real data always has exactly one — see CLAUDE.md
  if (gr5) {
    const { goal, milestones, progress } = migrateGr5ObjectiveData(gr5, legacyProgress);
    await TrainingGoalsRepo.put(goal);
    for (const m of milestones) await GoalMilestonesRepo.put(m);
    for (const p of progress) await GoalMilestoneProgressRepo.put(p);
  }

  const marathonGoal = buildMarathonGoal(settings.marathonRaceType, settings.marathonTargetDate, settings.marathonTargetTimeMinutes);
  if (marathonGoal) await TrainingGoalsRepo.put(marathonGoal);

  // Legacy stores emptied, not deleted (Technical Architecture v0.3.1
  // REVISED, Backward compatibility) — a pre-migration export still
  // imports cleanly against the store definitions, but nothing reads their
  // data anymore from here on.
  await clearLegacyObjectiveStores();

  await MetaRepo.set('goalEngineMigrated', true);
}

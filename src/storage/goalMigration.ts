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

import { migrateGr5ObjectiveData, buildMarathonGoal, buildDefaultStrengthProgramStrategy, convertLegacyRouteGoal } from '../engine/goalMigration';
import {
  ObjectivesRepo,
  MilestoneProgressRepo,
  TrainingGoalsRepo,
  GoalMilestonesRepo,
  GoalMilestoneProgressRepo,
  StrengthProgramStrategiesRepo,
  MetaRepo,
  SettingsRepo,
  clearLegacyObjectiveStores,
} from './database';
import { todayISO } from '../utils/dates';

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

  // An earlier run that stopped before the flag below was set may already
  // have written one; never mint a second Marathon goal.
  const marathonGoal = buildMarathonGoal(settings.marathonRaceType, settings.marathonTargetDate, settings.marathonTargetTimeMinutes);
  const hasMarathon = (await TrainingGoalsRepo.getAll()).some((g) => g.name === 'Marathon');
  if (marathonGoal && !hasMarathon) await TrainingGoalsRepo.put(marathonGoal);

  // Legacy stores emptied, not deleted (Technical Architecture v0.3.1
  // REVISED, Backward compatibility) — a pre-migration export still
  // imports cleanly against the store definitions, but nothing reads their
  // data anymore from here on.
  await clearLegacyObjectiveStores();

  await MetaRepo.set('goalEngineMigrated', true);
}

// Separate one-time migration (Strength Program Strategy Addendum v0.1,
// Phase 8), guarded by its own flag rather than folded into
// 'goalEngineMigrated' above — that flag is already true on every device
// that ran the Phase 1 migration, so reusing it here would mean this
// default never seeds for anyone except a brand-new install. Runs once
// per device regardless of when the app was first installed.
export async function migrateStrengthProgramDefault(): Promise<void> {
  const migrated = await MetaRepo.get<boolean>('strengthProgramDefaultSeeded');
  if (migrated) return;

  const existing = await StrengthProgramStrategiesRepo.getAll();
  if (existing.length === 0) {
    await StrengthProgramStrategiesRepo.put(buildDefaultStrengthProgramStrategy(todayISO()));
  }

  await MetaRepo.set('strengthProgramDefaultSeeded', true);
}

// Goal-flow redesign (Fase 1): gives every stored multi-day goal from
// before TrainingGoal.execution existed its route shape
// (engine/goalMigration.ts#convertLegacyRouteGoal). Deliberately not
// flag-guarded: the conversion is idempotent (a converted goal carries
// `execution`), so running it on every boot also catches goals that arrive
// later through a backup import made before this change.
export async function migrateGoalRouteProfiles(): Promise<void> {
  const goals = await TrainingGoalsRepo.getAll();
  for (const goal of goals) {
    const converted = convertLegacyRouteGoal(goal);
    if (converted) await TrainingGoalsRepo.put(converted);
  }
}

// ASCEND — de opstartstappen die de opgeslagen gegevens op orde brengen, in
// vaste volgorde. Stond in state/AppDataContext.tsx; hier los van React zodat
// de naspeeltest (bootReplay.test.ts) precies dezelfde volgorde draait als de
// app. De aanroeper zorgt voor het slot (Web Lock) en dat dit één keer per
// paginalading gebeurt.

import { seedIfEmpty, syncTemplateAndScheduleDefinitions, ensureDefaultTemplates, restorePatternSessionsRemovedByPrescription, normalizePlannedSessionWeeks } from './database';
import { migrateToGoalEngine, migrateStrengthProgramDefault, migrateGoalRouteProfiles } from './goalMigration';
import { syncGr5MilestoneDefinitions } from './goalMilestoneSync';
import { mergeDuplicateWeeklyPrescriptionLines } from './planLogCleanup';

export async function runBootMigrations(): Promise<void> {
  await seedIfEmpty();
  // Replaces the retired syncObjectiveDefinitions() — one-time migration
  // to TrainingGoal/GoalMilestone (Technical Architecture v0.3.1 REVISED,
  // Phase 1), guarded so it only ever runs once.
  await migrateToGoalEngine();
  await migrateGoalRouteProfiles();
  await syncGr5MilestoneDefinitions();
  await migrateStrengthProgramDefault();
  await syncTemplateAndScheduleDefinitions();
  await ensureDefaultTemplates();
  await restorePatternSessionsRemovedByPrescription();
  await normalizePlannedSessionWeeks();
  // Dubbele automatische regels uit de herschrijffout samenvoegen (idempotent).
  await mergeDuplicateWeeklyPrescriptionLines();
}

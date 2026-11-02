// De opslag van ASCEND in IndexedDB. Dit bestand verzamelt alleen de modules per
// onderwerp, zodat elke aanroeper uit './database' blijft lezen: het schema en de
// upgrade (databaseSchema), de repo's per store (databaseRepos), de instellingen
// (databaseSettings), vullen en opnieuw beginnen (databaseSeed), de planningsronde
// naar de doeldatum (databaseHorizon), het schrijven van een back-up
// (databaseBackupWrites) en eenmalige reparaties (databaseRepairs).

export { SCHEMA_VERSION, getDB, onDatabaseBlocked } from './databaseSchema';
export { ProgramsRepo, SessionTemplatesRepo, normalizePlannedSessionWeeks, PlannedSessionsRepo, SessionLogsRepo, ActivityStreamsRepo, ObjectivesRepo, MilestoneProgressRepo, InjuryNotesRepo, TrainingGoalsRepo, GoalMilestonesRepo, GoalMilestoneProgressRepo, TrainingPrescriptionsRepo, GoalEngineConfigRepo, CapabilityEvidenceRepo, PlanChangeProposalsRepo, StrengthProgramStrategiesRepo, StrengthProgramRecommendationsRepo, WeeklyPrescriptionsRepo, BackupSnapshotsRepo, RecoveryMetricsRepo, MetaRepo } from './databaseRepos';
export { DEFAULT_SETTINGS, SettingsRepo, StretchCompletionRepo } from './databaseSettings';
export type { AppSettings, StretchCompletion } from './databaseSettings';
export { seedIfEmpty, ensureDefaultTemplates, syncTemplateAndScheduleDefinitions, clearLegacyObjectiveStores, resetToDemoData, resetScheduleToDefault, rebuildPlanningFromWeekOne, restartProgramAtWeekOne } from './databaseSeed';
export { syncProgramHorizon, previewProgramHorizon } from './databaseHorizon';
export type { ProgramHorizonResult, HorizonOverrides, HorizonRun } from './databaseHorizon';
export { applyBackupWrites, wipeAllData } from './databaseBackupWrites';
export type { BackupStoreWrite, BackupWriteSet } from './databaseBackupWrites';
export { restorePatternSessionsRemovedByPrescription } from './databaseRepairs';

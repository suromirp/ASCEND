// Migration scaffold. V1 only knows schema version 1, so this is a pass
// through with a guard rail — but the shape (versioned export, a migrate
// function keyed on the version found in the file) is what every future
// migration will slot into, so an export made today keeps opening in
// ASCEND years from now.
//
// SessionTemplate.roles (2026-10-26) needs no step: the field is optional and
// additive, and engine/templateRoles.ts falls back to the roles of the id when
// it is missing or not a list, so an older backup imports as before.

export { CURRENT_SCHEMA_VERSION, migrateV1toV2, migrateExport } from './migrationsSchema';
export type { AscendExport } from './migrationsSchema';
export { migrateLeavePeriods, readWeekShape, migratePlanChangeProposal, migrateDirection, migrateWaveSettings } from './migrationsPlanning';
export { migrateNightJudgments, migrateLegEaseDays, migrateSweatEntries, migrateSweatPre, migrateInjuryNote, migrateWeeklyHealthCheck, migrateMornings, migrateExternalOneRm, migrateWeightEntries, dedupeInfluencesByPlace, migrateInfluences } from './migrationsBody';
export { migrateManualMeasured, migrateLogManualMeasured, migrateLogGymProfile, migrateLogFileDuration, migrateLogLinkedLater, migrateLogForgeLog, migrateLogBestEffort, migrateTestJudgments, migrateZoneAnswers, migrateLogSetTimes, migrateLogSets } from './migrationsLogs';
export { cleanNavigationSettings, migrateCardsAboveMission, migrateDataSettings, migrateAutoBackupSettings, migrateHealthConnectState } from './migrationsSettings';
export { migrateSportHandling, migrateSportCounting, migrateLogCountedSport, migratePlannedFixed, migrateKindAmount, migratePlannedAmount, migrateCustomSports, migrateLogCustomSport, migrateLogRpeAssumed } from './migrationsSports';
export { migrateActivityDetail, migrateLogDetail, migrateLogRunDetail, migrateActivityStreams, migrateSessionTrim, migrateLogTrim, migrateSourceSync, migrateLogSourceSync } from './migrationsLogDetail';
export { readGoalDetails, readGoalKind, readGoalPriority, priorityFromPlanRole, routePlanUsesTent, migrateTrainingGoal, readAcceptedConflicts, migrateTrainingGoals } from './migrationsGoals';
export type { GoalKindContext } from './migrationsGoals';

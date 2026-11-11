// Migration scaffold. V1 only knows schema version 1, so this is a pass
// through with a guard rail — but the shape (versioned export, a migrate
// function keyed on the version found in the file) is what every future
// migration will slot into, so an export made today keeps opening in
// ASCEND years from now.
//
// SessionTemplate.roles (2026-10-26) needs no step: the field is optional and
// additive, and engine/templateRoles.ts falls back to the roles of the id when
// it is missing or not a list, so an older backup imports as before.
//
// SetLog.seconds, band and clean (calisthenics, 2026-11-09) follow repsAsked: optional and additive, so
// the version stays; migrateLogSetSkill drops a damaged value on import and an older file reads the same.
//
// The goal Vaardigheid (calisthenics F4e, 2026-11-09) lives in its own optional `skillGoals` (goals and the
// append-only cleared steps), like `missedTraining`: optional and additive, so the version stays.
// migrateSkillGoals drops a damaged goal or row (unknown ladder, step outside it) and never throws.
//
// SkillGoal.general (2026-11-09, het doel Algemeen sterk met eigen gewicht) needs no step either: optional and
// additive, on a goal with ladderId 'algemeen' that an older app hides and keeps unchanged. A goal without it reads
// exactly as before; migrationsSkill.ts#readGeneral cleans the ladder list and the baseline, keeps unknown ladders
// and newer fields, and drops the goal (counted as skipped) when `general` is broken.
//
// PlanChangeItem.replacesSessionId (2026-11-09, weghaling met toevoeging) needs no step: optional and additive, only
// on an 'add' in a proposal, never read by applyPlanChangeItems. An older proposal without it reads the same.
//
// Plekken en bewaarde routes (2026-11-11, docs/beslissingen/2026-11-11-plekken-opslag.md) live in two optional
// fields, `places` and `savedRoutes`, like `skillGoals`: optional and additive, so the version stays. A file
// without them keeps the places of the device; migratePlaces and migrateSavedRoutes drop a damaged place or
// route (counted as skipped) and never throw. The old Vast punt (`routeStartPoint`, device only) becomes the
// place Thuis once at boot (storage/places.ts#migrateStartPointToHome), not here: it was never in a file.

export { CURRENT_SCHEMA_VERSION, migrateV1toV2, migrateExport } from './migrationsSchema';
export type { AscendExport } from './migrationsSchema';
export { migrateLeavePeriods, readWeekShape, migratePlanChangeProposal, migrateDirection, migrateWaveSettings } from './migrationsPlanning';
export { migrateNightJudgments, migrateLegEaseDays, migrateSweatEntries, migrateSweatPre, migrateInjuryNote, migrateWeeklyHealthCheck, migrateMornings, migrateExternalOneRm, migrateWeightEntries, dedupeInfluencesByPlace, migrateInfluences } from './migrationsBody';
export { migrateManualMeasured, migrateLogManualMeasured, migrateLogGymProfile, migrateLogFileDuration, migrateLogLinkedLater, migrateLogForgeLog, migrateLogBestEffort, migrateTestJudgments, migrateZoneAnswers, migrateLogSetTimes, migrateLogSets, migrateLogSetAsked, migrateLogSetSkill, migrateLogSetRow } from './migrationsLogs';
export { cleanNavigationSettings, migrateCardsAboveMission, migrateDataSettings, migrateAutoBackupSettings, migrateHealthConnectState } from './migrationsSettings';
export { migrateSportHandling, migrateSportCounting, migrateLogCountedSport, migratePlannedFixed, migrateKindAmount, migratePlannedAmount, migrateCustomSports, migrateLogCustomSport, migrateLogRpeAssumed } from './migrationsSports';
export { migrateActivityDetail, migrateLogDetail, migrateLogRunDetail, migrateActivityStreams, migrateSessionTrim, migrateLogTrim, migrateSourceSync, migrateLogSourceSync, migrateLogZone2Pieces } from './migrationsLogDetail';
export { readGoalDetails, readGoalKind, readGoalPriority, priorityFromPlanRole, routePlanUsesTent, migrateTrainingGoal, readAcceptedConflicts, migrateTrainingGoals } from './migrationsGoals';
export type { GoalKindContext } from './migrationsGoals';
export { migrateSkillGoals, readSkillGoalStore } from './migrationsSkill';
export type { SkillGoalsRead } from './migrationsSkill';
export { migratePlaces, migrateSavedRoutes, routesOfPlaces, readPlaceList, readSavedRouteList } from './migrationsPlaces';
export type { PlacesRead, SavedRoutesRead } from './migrationsPlaces';

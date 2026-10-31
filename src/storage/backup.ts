// ASCEND — Backup / Import / Restore pipeline
//
// Implements ASCEND Technical Architecture v0.3.2, scoped to what actually
// exists in the app today (see backupTypes.ts for the scoping rationale).
//
// Flow: buildBackupEnvelope() (export direction) is the mirror of
// normalizeBackupToCurrentModel() + buildImportPreview() + createImportPlan()
// + applyImportPlan() (import direction). The import direction never mutates
// IndexedDB until applyImportPlan — everything before that (diffing,
// conflict detection, preview) reads current data but only returns plain
// objects, so the caller (ImportWizard) can freely re-diff as the user
// changes their category selections without touching storage.
//
// applyImportPlan always takes a PreImportSnapshot first and only then
// writes — via database.ts#applyBackupWrites, a single atomic multi-store
// transaction — so a bad import can always be undone by re-importing that
// snapshot's own envelope.

import { cleanCardOrder } from '../engine/cardOrder';
import { localDateOf, todayISO } from '../utils/dates';
import { logIdsForBackup, resolveStreamsBackup, type StreamsBackup } from '../engine/streamsBackup';
import { morningsForBackup, resolveMorningBackup } from '../engine/morningBackup';
import { filterRecovery } from '../engine/watchUse';
import { getWatchState } from './externalActivities';
import { isEmptyStart } from '../engine/freshStart';
import type { Program } from '../models/program';
import type { SessionTemplate, PlannedSession, SessionLog } from '../models/training';
import type { Objective, MilestoneProgress } from '../models/objectives';
import type { TrainingGoal, GoalMilestone, GoalMilestoneProgress } from '../models/goals';
import type { CapabilityEvidence } from '../models/capability';
import type { InjuryNote } from '../models/injury';
import type { WeeklyHealthCheck } from '../models/checkIn';
import type { RecoveryMetric, WeightEntry } from '../models/metrics';
import type { ActivityStreams } from '../models/activityStreams';
import {
  ProgramsRepo,
  SessionTemplatesRepo,
  PlannedSessionsRepo,
  SessionLogsRepo,
  TrainingGoalsRepo,
  GoalMilestonesRepo,
  GoalMilestoneProgressRepo,
  CapabilityEvidenceRepo,
  InjuryNotesRepo,
  SettingsRepo,
  BackupSnapshotsRepo,
  MetaRepo,
  PlanChangeProposalsRepo,
  ActivityStreamsRepo,
  RecoveryMetricsRepo,
  StrengthProgramStrategiesRepo,
  StrengthProgramRecommendationsRepo,
  applyBackupWrites,
  type AppSettings,
} from './database';
import type { PlanChangeProposal } from '../models/planChange';
import type { StrengthProgramStrategy, StrengthProgramRecommendation } from '../models/strengthProgram';
import { migrateGr5ObjectiveData, buildMarathonGoal } from '../engine/goalMigration';
import { isWeeklyIntention, mergeIntentions } from '../engine/weeklyQuestion';
import { normalizeStrengthSettings } from '../engine/strengthSettings';
import { cleanClothingAdjust } from '../engine/clothingFeedback';
import { cleanRunInsight } from '../engine/runInsightSettings';
import { cleanMorningNotice } from '../engine/morningNotice';
import { MAX_JUDGMENTS } from '../engine/shortNight';
import { MAX_LEG_EASE_DAYS } from '../models/legEase';
import { mergeSweatEntries } from '../engine/sweat';
import { mergeTestJudgments } from '../engine/testJudgment';
import { BREAKIN_KM_OPTIONS } from '../engine/bootBreakIn';
import { cleanNavigationSettings, migrateDirection, migrateWaveSettings, migrateSportHandling, migrateLogRpeAssumed, migrateExport, dedupeInfluencesByPlace, migrateExternalOneRm, migrateInfluences, migrateLeavePeriods, migrateLegEaseDays, migrateLogDetail, migrateInjuryNote, migrateLogGymProfile, migrateLogFileDuration, migrateLogForgeLog, migrateLogBestEffort, migrateLogRunDetail, migrateActivityStreams, migrateTestJudgments, migrateWeeklyHealthCheck, migrateLogManualMeasured, migrateLogSets, migrateLogSetTimes, migrateLogSourceSync, migrateLogTrim, migrateNightJudgments, migrateSweatEntries, migrateSweatPre, migrateTrainingGoals, migrateWeightEntries, readWeekShape, migrateDataSettings, migratePlanChangeProposal, migrateMornings, type AscendExport } from './migrations';
import { mergeExternalOneRm } from '../engine/externalOneRm';
import { serializeStreams } from '../engine/streamPack';
import { mergeJourneyState, normalizeJourneyState } from '../engine/journey';
import { normalizePackList } from '../engine/packList';
import { makeId } from '../utils/id';
import { sanitizeRoutePlan, sanitizeSoloPlan } from '../engine/routePlan';
import { RoutePlanRepo, SoloPlanRepo, ROUTE_PLAN_KEY, SOLO_PLAN_KEY } from './routePlan';
import {
  CURRENT_BACKUP_SCHEMA_VERSION,
  ALL_CATEGORIES,
  type AscendBackupEnvelope,
  type AscendBackupPayloadV5,
  type NormalizedBackupData,
  type BackupDataCategory,
  type CategoryAction,
  type ImportMode,
  type PlanPolicy,
  type ImportConflict,
  type ImportDiffEntry,
  type ImportPreview,
  type ImportPlan,
  type PreImportSnapshot,
} from './backupTypes';

// A V1 backup's legacy objectives/milestoneProgress are migrated into
// trainingGoals/goalMilestones/goalMilestoneProgress here — the exact same
// transform storage/goalMigration.ts runs on-device (engine/goalMigration.ts),
// so restoring an old backup never silently loses GR5/marathon goal
// progress just because the on-disk shape has moved on. Today's app only
// ever has one GR5-shaped Objective, but this maps every row present, not
// just the first, in case an old export ever carried more than one.
function migrateLegacyObjectives(
  objectives: Objective[],
  legacyProgress: MilestoneProgress[],
  settings: Partial<AppSettings>,
): { trainingGoals: TrainingGoal[]; goalMilestones: GoalMilestone[]; goalMilestoneProgress: GoalMilestoneProgress[] } {
  const trainingGoals: TrainingGoal[] = [];
  const goalMilestones: GoalMilestone[] = [];
  const goalMilestoneProgress: GoalMilestoneProgress[] = [];

  for (const objective of objectives) {
    const migrated = migrateGr5ObjectiveData(objective, legacyProgress);
    trainingGoals.push(migrated.goal);
    goalMilestones.push(...migrated.milestones);
    goalMilestoneProgress.push(...migrated.progress);
  }

  const marathonGoal = buildMarathonGoal(settings.marathonRaceType, settings.marathonTargetDate, settings.marathonTargetTimeMinutes);
  if (marathonGoal) trainingGoals.push(marathonGoal);

  return { trainingGoals, goalMilestones, goalMilestoneProgress };
}

// --- export direction --------------------------------------------------------

export { BackupMessageError, backupErrorText } from './backupMessage';
import { BackupMessageError } from './backupMessage';
import { validCatchUp } from '../engine/catchUp';
import { clearForgeSessions } from '../utils/forgeSessionStore';
import { BREAK_ASK_OPTIONS } from '../engine/forgeSession';

export interface BuildEnvelopeOptions {
  // Whether the full series travel along. Left out: the setting "Reeksen in back-up" decides
  // (on unless you turned it off). The copy taken before an import passes false: it only
  // has to undo that import, and the series would make every copy tens of megabytes.
  streams?: boolean;
  // For the tests: the day "the last 2 years" counts back from.
  today?: string;
  // Whether the mornings of the watch travel along. Left out: the setting "Ochtendgetallen in
  // back-up" decides (on unless you turned it off). The copy taken before an import passes false.
  mornings?: boolean;
}

export async function buildBackupEnvelope(options: BuildEnvelopeOptions = {}): Promise<AscendBackupEnvelope> {
  const [programs, templates, plannedSessions, sessionLogs, trainingGoals, goalMilestones, goalMilestoneProgress, capabilityEvidence, injuryNotes, settings, goalEngineConfig, strengthProgramStrategies, strengthProgramRecommendations, planChangeProposals, adviceResponses, routePlan, soloPlan] = await Promise.all([
    ProgramsRepo.getAll(),
    SessionTemplatesRepo.getAll(),
    PlannedSessionsRepo.getAll(),
    SessionLogsRepo.getAll(),
    TrainingGoalsRepo.getAll(),
    GoalMilestonesRepo.getAll(),
    GoalMilestoneProgressRepo.getAll(),
    CapabilityEvidenceRepo.getAll(),
    InjuryNotesRepo.getAll(),
    SettingsRepo.get(),
    MetaRepo.get<Partial<import('../models/goalEngineConfig').GoalEngineConfig>>('goalEngineConfig'),
    StrengthProgramStrategiesRepo.getAll(),
    StrengthProgramRecommendationsRepo.getAll(),
    PlanChangeProposalsRepo.getAll(),
    MetaRepo.get<Record<string, unknown>>('adviceResponses'),
    RoutePlanRepo.get(),
    SoloPlanRepo.get(),
  ]);

  const payload: AscendBackupPayloadV5 = {
    version: 5,
    program: programs[0] ?? null,
    templates,
    plannedSessions,
    sessionLogs,
    trainingGoals,
    goalMilestones,
    goalMilestoneProgress,
    capabilityEvidence,
    injuryNotes,
    settings,
    goalEngineConfig: goalEngineConfig ?? null,
    strengthProgramStrategies,
    strengthProgramRecommendations,
    planChangeProposals,
    adviceResponses: adviceResponses ?? null,
    // Never filled in is stored as null, not as an empty plan, so a restore
    // doesn't overwrite a plan on another device with nothing.
    routePlan: routePlan.updatedAt ? routePlan : null,
    soloPlan: soloPlan.updatedAt ? soloPlan : null,
  };

  // The full series of runs and tochten, as base64. They may not be fetchable again from the
  // source, so they go along by default (docs/beslissingen/2026-10-27-run-in-detail-gegevens.md),
  // those of the last 2 years unless you chose all or none
  // (docs/beslissingen/2026-10-31-data-lange-termijn.md). The summary per run (runDetail,
  // bestEffort) is on the log itself and always goes along.
  const choice: StreamsBackup = options.streams === false ? 'none' : options.streams === true ? 'all' : resolveStreamsBackup(settings);
  if (choice !== 'none') {
    // Only the series of a log that still exists: a leftover of a deleted log stays out.
    const logIds = logIdsForBackup(sessionLogs, choice, options.today ?? todayISO());
    const streams = (await ActivityStreamsRepo.getAll()).filter((s) => logIds.has(s.logId));
    // In small steps, so a year of series does not hold the screen still in one long block.
    const serialized = [];
    for (let i = 0; i < streams.length; i++) {
      serialized.push(serializeStreams(streams[i]));
      if (i % 25 === 24) await new Promise((resolve) => setTimeout(resolve, 0));
    }
    if (serialized.length > 0) payload.activityStreams = serialized;
  }

  // The mornings of the watch (date, resting heart rate, HRV, sleep), so they survive when the
  // source stops giving them out (docs/beslissingen/2026-10-31-kansen-stap-0.md).
  if (options.mornings ?? resolveMorningBackup(settings)) {
    const mornings = morningsForBackup(await RecoveryMetricsRepo.getAll());
    if (mornings.length > 0) payload.mornings = mornings;
  }

  return {
    backupSchemaVersion: CURRENT_BACKUP_SCHEMA_VERSION,
    appVersion: typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : undefined,
    createdAt: new Date().toISOString(),
    payload,
  };
}

export function backupFileName(createdAt: string): string {
  // Double extension is deliberate (v0.3.2 §File naming): the leading
  // `.ascend-backup` segment is what a future ASCEND-aware file picker or
  // Android/iOS share-sheet integration can filter on, while the trailing
  // `.json` keeps every existing OS/browser/text-editor treating it as
  // plain, previewable JSON — nothing generic breaks on a file it doesn't
  // recognize.
  return `ascend-${localDateOf(createdAt)}.ascend-backup.json`;
}

// --- import direction: normalize ---------------------------------------------

// A file can be hand-edited, cut off or simply from somewhere else. Every
// record is checked for the fields the app relies on before it can reach
// storage; anything incomplete is dropped and counted, never written —
// one broken log used to crash the Today screen for good.
const DATE_RE = /^\d{4}-\d{2}-\d{2}/;
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const hasId = (v: unknown): v is Record<string, unknown> & { id: string } => isRecord(v) && typeof v.id === 'string' && v.id.length > 0;
const isDate = (v: unknown): boolean => typeof v === 'string' && DATE_RE.test(v);

const isTemplate = (v: unknown) => hasId(v) && typeof v.name === 'string' && typeof v.type === 'string';
const isPlanned = (v: unknown) => hasId(v) && typeof v.templateId === 'string' && isDate(v.scheduledDate) && isDate(v.weekStartDate) && typeof v.status === 'string';
const isLog = (v: unknown) => hasId(v) && typeof v.templateId === 'string' && isDate(v.completedDate) && typeof v.completedAt === 'string';

// Een inhaal (PlannedSession.catchUp) die niet klopt, valt weg; de rij blijft.
function cleanPlannedCatchUp(s: PlannedSession): PlannedSession {
  if (s.catchUp === undefined || validCatchUp(s.catchUp)) return s;
  const { catchUp: _drop, ...rest } = s;
  return rest;
}

interface Counter { n: number }

function cleanList<T>(raw: unknown, valid: (v: unknown) => boolean, skipped: Counter): T[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw.filter((v) => {
    if (valid(v)) return true;
    skipped.n++;
    return false;
  }) as T[];
}

function cleanSettings(raw: unknown, skipped: Counter): Partial<AppSettings> | undefined {
  if (!isRecord(raw)) return undefined;
  const s: Record<string, unknown> = { ...raw };
  const lists: [string, (v: unknown) => boolean][] = [
    ['weightEntries', (e) => isRecord(e) && isDate(e.date) && typeof e.kg === 'number' && Number.isFinite(e.kg) && (e.basis === undefined || e.basis === 'trend' || e.basis === 'scale') && (e.scaleKg === undefined || (typeof e.scaleKg === 'number' && Number.isFinite(e.scaleKg)))],
    ['illnessEpisodes', (e) => hasId(e) && isDate(e.startDate) && typeof e.kind === 'string'],
    ['morningCheckIns', (e) => isRecord(e) && isDate(e.date)],
    ['weeklyHealthChecks', (e) => isRecord(e) && isDate(e.weekStart) && typeof e.trouble === 'string'],
    ['weeklyIntentions', isWeeklyIntention],
  ];
  // Free days, holidays and treks (backup schema 5). A file from before that
  // simply has none: the key stays absent, which means "not in this backup".
  if ('leavePeriods' in s) {
    const leave = migrateLeavePeriods(s.leavePeriods);
    if (leave.periods === undefined) delete s.leavePeriods;
    else s.leavePeriods = leave.periods;
    skipped.n += leave.skipped;
  }
  for (const [key, valid] of lists) {
    if (!(key in s)) continue;
    const cleaned = cleanList(s[key], valid, skipped);
    if (cleaned === undefined) {
      delete s[key];
      skipped.n++;
    } else {
      s[key] = cleaned;
    }
  }
  // The day of "Niet nu" on the card "Hoe voelt je lijf?" is kept only as a date.
  if (Array.isArray(s.weeklyHealthChecks)) s.weeklyHealthChecks = (s.weeklyHealthChecks as WeeklyHealthCheck[]).map(migrateWeeklyHealthCheck);
  // Your verdicts on short nights: read record by record, a damaged one is
  // dropped and counted, an older file has none and leaves the verdicts on the
  // device alone (storage/migrations.ts#migrateNightJudgments).
  if ('nightJudgments' in s) {
    const nights = migrateNightJudgments(s.nightJudgments);
    if (nights.list === undefined) delete s.nightJudgments;
    else s.nightJudgments = nights.list;
    skipped.n += nights.skipped;
  }
  // What you chose on days with tired legs: record by record, a damaged one is dropped and counted
  // (storage/migrations.ts#migrateLegEaseDays).
  if ('legEaseDays' in s) {
    const eased = migrateLegEaseDays(s.legEaseDays);
    if (eased.list === undefined) delete s.legEaseDays;
    else s.legEaseDays = eased.list;
    skipped.n += eased.skipped;
  }
  // Your verdicts on test runs: record by record, a damaged one is dropped and counted, an
  // older file has none and leaves the verdicts on the device alone
  // (storage/migrations.ts#migrateTestJudgments).
  if ('testJudgments' in s) {
    const tests = migrateTestJudgments(s.testJudgments);
    if (tests.list === undefined) delete s.testJudgments;
    else s.testJudgments = tests.list;
    skipped.n += tests.skipped;
  }
  // Your own weighings for sweat loss: record by record, a damaged one is dropped and
  // counted, an older file has none and leaves the weighings on the device alone
  // (storage/migrations.ts#migrateSweatEntries).
  if ('sweatEntries' in s) {
    const sweat = migrateSweatEntries(s.sweatEntries);
    if (sweat.list === undefined) delete s.sweatEntries;
    else s.sweatEntries = sweat.list;
    skipped.n += sweat.skipped;
  }
  // Your weight before a training, kept until its log is there: record by record, a damaged
  // one is dropped and counted; an older file has none (storage/migrations.ts#migrateSweatPre).
  if ('sweatPre' in s) {
    const pre = migrateSweatPre(s.sweatPre);
    if (pre.list === undefined) delete s.sweatPre;
    else s.sweatPre = pre.list;
    skipped.n += pre.skipped;
  }
  // The switch for water per stage: a yes or a no, or not there.
  if ('showStageWater' in s && typeof s.showStageWater !== 'boolean') {
    delete s.showStageWater;
    skipped.n++;
  }
  // Your notes of "Wat speelde er": record by record, a damaged one is dropped and
  // counted, an older file has none and leaves the notes on the device alone
  // (storage/migrations.ts#migrateInfluences).
  if ('influences' in s) {
    const notes = migrateInfluences(s.influences);
    if (notes.list === undefined) delete s.influences;
    else s.influences = notes.list;
    skipped.n += notes.skipped;
  }
  // The shape of your week: known templates on a day from 1 to 7, or not there
  // (storage/migrations.ts#readWeekShape).
  if ('weekShape' in s) {
    const shape = readWeekShape(s.weekShape);
    if (shape === undefined) {
      delete s.weekShape;
      skipped.n++;
    } else {
      s.weekShape = shape;
    }
  }
  // The fat percentage on a weigh-in: a number between 3 and 60 or not there; the
  // weigh-in itself stays (storage/migrations.ts#migrateWeightEntries).
  if (Array.isArray(s.weightEntries)) {
    const weights = migrateWeightEntries(s.weightEntries as WeightEntry[]);
    s.weightEntries = weights.entries;
    skipped.n += weights.skipped;
  }
  // The switch for showing the fat percentage: a yes or a no, or not there.
  if ('showBodyFat' in s && typeof s.showBodyFat !== 'boolean') {
    delete s.showBodyFat;
    skipped.n++;
  }
  // The switches of "Wat speelde er": a yes or a no, and the cause one of three words, or not there.
  for (const key of ['influenceSign', 'influenceOverview', 'influenceTestMove', 'influenceNames']) {
    if (key in s && typeof s[key] !== 'boolean') {
      delete s[key];
      skipped.n++;
    }
  }
  if ('influenceCause' in s && s.influenceCause !== 'uit' && s.influenceCause !== 'weet' && s.influenceCause !== 'patroon') {
    delete s.influenceCause;
    skipped.n++;
  }
  // The 1RM per exercise from MacroFactor: read series by series, a damaged
  // reading is dropped and counted, an older file has none and leaves the
  // readings on the device alone (storage/migrations.ts#migrateExternalOneRm).
  if ('externalOneRm' in s) {
    const oneRm = migrateExternalOneRm(s.externalOneRm);
    if (oneRm.series === undefined) delete s.externalOneRm;
    else s.externalOneRm = oneRm.series;
    skipped.n += oneRm.skipped;
  }
  // The switch for weight from MacroFactor: a yes or a no, or not there.
  if ('weightFromMacroFactor' in s && typeof s.weightFromMacroFactor !== 'boolean') {
    delete s.weightFromMacroFactor;
    skipped.n++;
  }
  // The switches for the next tocht on Vandaag and the rest after a bergtocht:
  // a yes or a no, or one of two words, or not there.
  if ('showNextTrek' in s && typeof s.showNextTrek !== 'boolean') {
    delete s.showNextTrek;
    skipped.n++;
  }
  if ('showSeasonStrip' in s && typeof s.showSeasonStrip !== 'boolean') {
    delete s.showSeasonStrip;
    skipped.n++;
  }
  if ('bootBreakInKm' in s && !(BREAKIN_KM_OPTIONS as readonly unknown[]).includes(s.bootBreakInKm)) {
    delete s.bootBreakInKm;
    skipped.n++;
  }
  if ('bootBreakInReminder' in s && typeof s.bootBreakInReminder !== 'boolean') {
    delete s.bootBreakInReminder;
    skipped.n++;
  }
  for (const key of ['showWatchStatus', 'showWatchStatusOnWeek', 'watchRemoveDone', 'stravaText', 'askShortNight', 'askSweat', 'askDoubtTest', 'newTestOnStops', 'weekFixProposal', 'dragWeek', 'forgeQuickButtons', 'forgeSwipeDelete', 'haptics', 'proposeTargetTime', 'keepStreams', 'streamsInBackup', 'morningInBackup', 'watchSilence', 'illnessSigns', 'heatPace', 'weekdayPattern', 'airQuality', 'morningRule'] as const) {
    if (key in s && typeof s[key] !== 'boolean') {
      delete s[key];
      skipped.n++;
    }
  }
  // Reeksen in back-up als keuze en het opruimen van oude voorstellen
  // (storage/migrations.ts#migrateDataSettings).
  {
    const data = migrateDataSettings(s);
    delete s.streamsBackup;
    delete s.proposalTidyMonths;
    Object.assign(s, data.value);
    skipped.n += data.skipped;
  }
  if ('readinessWeighting' in s && s.readinessWeighting !== 'speed' && s.readinessWeighting !== 'equal') {
    delete s.readinessWeighting;
    skipped.n++;
  }
  if ('goalGrowth' in s && s.goalGrowth !== 'average' && s.goalGrowth !== 'careful') {
    delete s.goalGrowth;
    skipped.n++;
  }
  if ('limitMargin' in s && s.limitMargin !== 'ten' && s.limitMargin !== 'five' && s.limitMargin !== 'none') {
    delete s.limitMargin;
    skipped.n++;
  }
  if ('forgeLayout' in s && s.forgeLayout !== 'scherm' && s.forgeLayout !== 'lijst') {
    delete s.forgeLayout;
    skipped.n++;
  }
  if ('forgeLongBreak' in s && !(BREAK_ASK_OPTIONS as readonly number[]).includes(s.forgeLongBreak as number)) {
    delete s.forgeLongBreak;
    skipped.n++;
  }
  if ('exerciseArt' in s && s.exerciseArt !== 'beide' && s.exerciseArt !== 'spierkaart' && s.exerciseArt !== 'uit') {
    delete s.exerciseArt;
    skipped.n++;
  }
  if ('testStops' in s && s.testStops !== 'skip' && s.testStops !== 'count') {
    delete s.testStops;
    skipped.n++;
  }
  if ('intensityCounting' in s && s.intensityCounting !== 'heartrate' && s.intensityCounting !== 'plan') {
    delete s.intensityCounting;
    skipped.n++;
  }
  if ('watchNamePrefix' in s && s.watchNamePrefix !== 'short' && s.watchNamePrefix !== 'long' && s.watchNamePrefix !== 'none') {
    delete s.watchNamePrefix;
    skipped.n++;
  }
  if ('watchHeartRate' in s && s.watchHeartRate !== 'ascend' && s.watchHeartRate !== 'intervals') {
    delete s.watchHeartRate;
    skipped.n++;
  }
  if ('watchCalmRun' in s && typeof s.watchCalmRun !== 'boolean') {
    delete s.watchCalmRun;
    skipped.n++;
  }
  if ('longRunGrowth' in s && s.longRunGrowth !== 'weekly' && s.longRunGrowth !== 'biweekly' && s.longRunGrowth !== 'wave' && s.longRunGrowth !== 'firm' && s.longRunGrowth !== 'fast') {
    delete s.longRunGrowth;
    skipped.n++;
  }
  if ('trekLegRest' in s && s.trekLegRest !== 'soft' && s.trekLegRest !== 'strict') {
    delete s.trekLegRest;
    skipped.n++;
  }
  // Back button and resuming after a restart: known values stay, the rest goes.
  if ('tabBack' in s || 'resumeMinutes' in s) {
    const nav = cleanNavigationSettings({ tabBack: s.tabBack, resumeMinutes: s.resumeMinutes });
    delete s.tabBack;
    delete s.resumeMinutes;
    Object.assign(s, nav.value);
    skipped.n += nav.skipped;
  }
  // Zonder doel: the direction, its start and your weekly budget; known values stay.
  if ('direction' in s || 'directionStart' in s || 'weekBudget' in s) {
    const clean = migrateDirection({ direction: s.direction, directionStart: s.directionStart, weekBudget: s.weekBudget });
    delete s.direction;
    delete s.directionStart;
    delete s.weekBudget;
    Object.assign(s, clean.value);
    skipped.n += clean.skipped;
  }
  // Sporten die meetellen: known sports with a role they know, and real fixed appointments.
  if ('sportHandling' in s) {
    const clean = migrateSportHandling(s.sportHandling);
    delete s.sportHandling;
    if (clean.value) s.sportHandling = clean.value;
    skipped.n += clean.skipped;
  }
  // Zonder doel: the choices around waves; known values stay.
  if ('beginnerStart' in s || 'waves' in s || 'waveReviewDone' in s) {
    const clean = migrateWaveSettings({ beginnerStart: s.beginnerStart, waves: s.waves, waveReviewDone: s.waveReviewDone });
    delete s.beginnerStart;
    delete s.waves;
    delete s.waveReviewDone;
    Object.assign(s, clean.value);
    skipped.n += clean.skipped;
  }
  // The switches of "Overzichten en vragen": a record or not there; the engine
  // reads every key defensively (engine/overviewSettings.ts#resolveOverviews).
  if ('overviews' in s && !isRecord(s.overviews)) {
    delete s.overviews;
    skipped.n++;
  }
  // De volgorde van de blokken op Je stand: een record van lijsten tekst, anders weg.
  if ('cardOrder' in s) {
    const clean = cleanCardOrder(s.cardOrder);
    if (clean) s.cardOrder = clean;
    else {
      delete s.cardOrder;
      skipped.n++;
    }
  }
  // Forge (Kracht meerekenen): only valid values stay; rubbish is dropped.
  if ('strengthModel' in s) {
    const clean = normalizeStrengthSettings(s.strengthModel);
    if (!clean) {
      delete s.strengthModel;
      skipped.n++;
    } else {
      if (JSON.stringify(clean) !== JSON.stringify(s.strengthModel)) skipped.n++;
      s.strengthModel = clean;
    }
  }
  // Your nudge of the clothing advice: only known sports with a finite number
  // within plus or minus 4 degrees; the rest is dropped and counted.
  if ('clothingAdjust' in s) {
    const cleaned = cleanClothingAdjust(s.clothingAdjust);
    skipped.n += cleaned.skipped;
    if (Object.keys(cleaned.value).length > 0) s.clothingAdjust = cleaned.value;
    else delete s.clothingAdjust;
  }
  // Loopinzicht: only valid switches stay; the rest is dropped and counted.
  if ('runInsight' in s) {
    const cleaned = cleanRunInsight(s.runInsight);
    skipped.n += cleaned.dropped;
    if (cleaned.value) s.runInsight = cleaned.value;
    else delete s.runInsight;
  }
  // Ochtendmelding: a valid switch and time stay, the rest is dropped and counted.
  if ('morningNotice' in s) {
    const cleaned = cleanMorningNotice(s.morningNotice);
    skipped.n += cleaned.dropped;
    if (cleaned.value) s.morningNotice = cleaned.value;
    else delete s.morningNotice;
  }
  // Reisplanner and paklijst: kept readable or dropped, never stored half.
  if ('journey' in s) {
    const { state, skipped: n } = normalizeJourneyState(s.journey);
    skipped.n += n;
    if (state) s.journey = state;
    else delete s.journey;
  }
  if ('packList' in s) {
    const { state, skipped: n } = normalizePackList(s.packList);
    skipped.n += n;
    if (state) s.packList = state;
    else delete s.packList;
  }
  return s as Partial<AppSettings>;
}

interface RawSource {
  createdAt: string;
  sourceBackupSchemaVersion: number;
  raw: Record<string, unknown>;
  // V1 and the legacy flat export carry objectives/milestoneProgress
  // instead of goal-engine records.
  legacyGoals: boolean;
  hasCapability: boolean;
  hasV4Extras: boolean;
  hasV5Extras: boolean;
}

function buildNormalized({ createdAt, sourceBackupSchemaVersion, raw, legacyGoals, hasCapability, hasV4Extras, hasV5Extras }: RawSource): NormalizedBackupData {
  const skipped: Counter = { n: 0 };
  const templates = cleanList<SessionTemplate>(raw.templates, isTemplate, skipped);
  const plannedSessions = cleanList<PlannedSession>(raw.plannedSessions, isPlanned, skipped)?.map(cleanPlannedCatchUp);
  const sessionLogs = cleanList<SessionLog>(raw.sessionLogs, isLog, skipped)?.map(migrateLogManualMeasured).map(migrateLogSets).map(migrateLogSetTimes).map(migrateLogDetail).map(migrateLogTrim).map(migrateLogSourceSync).map(migrateLogGymProfile).map(migrateLogFileDuration).map(migrateLogForgeLog).map(migrateLogBestEffort).map(migrateLogRunDetail).map(migrateLogRpeAssumed);
  const injuryNotes = cleanList<InjuryNote>(raw.injuryNotes, hasId, skipped)?.map(migrateInjuryNote);
  const capabilityEvidence = hasCapability ? cleanList<CapabilityEvidence>(raw.capabilityEvidence, hasId, skipped) : undefined;
  const settings = cleanSettings(raw.settings, skipped);
  const program = hasId(raw.program) ? (raw.program as unknown as Program) : null;

  let trainingGoals: TrainingGoal[] | undefined;
  let goalMilestones: GoalMilestone[] | undefined;
  let goalMilestoneProgress: GoalMilestoneProgress[] | undefined;
  if (legacyGoals) {
    const objectives = cleanList<Objective>(raw.objectives, hasId, skipped);
    if (objectives !== undefined) {
      const migrated = migrateLegacyObjectives(objectives, cleanList<MilestoneProgress>(raw.milestoneProgress, hasId, skipped) ?? [], settings ?? {});
      trainingGoals = migrated.trainingGoals;
      goalMilestones = migrated.goalMilestones;
      goalMilestoneProgress = migrated.goalMilestoneProgress;
    }
  } else {
    trainingGoals = cleanList<TrainingGoal>(raw.trainingGoals, hasId, skipped);
    goalMilestones = cleanList<GoalMilestone>(raw.goalMilestones, hasId, skipped);
    goalMilestoneProgress = cleanList<GoalMilestoneProgress>(raw.goalMilestoneProgress, hasId, skipped);
  }

  const normalized: NormalizedBackupData = {
    createdAt,
    sourceBackupSchemaVersion,
    program,
    templates: templates ?? [],
    plannedSessions: plannedSessions ?? [],
    sessionLogs: sessionLogs ?? [],
    trainingGoals: trainingGoals ?? [],
    goalMilestones: goalMilestones ?? [],
    goalMilestoneProgress: goalMilestoneProgress ?? [],
    capabilityEvidence: capabilityEvidence ?? [],
    injuryNotes: injuryNotes ?? [],
    settings: settings ?? {},
    present: {
      program_and_templates: templates !== undefined,
      training_history: sessionLogs !== undefined,
      planned_schedule: plannedSessions !== undefined,
      objectives_and_milestones: trainingGoals !== undefined,
      capability_evidence: capabilityEvidence !== undefined,
      injuries: injuryNotes !== undefined,
      app_settings: settings !== undefined,
    },
    skippedInvalid: 0,
  };

  if (hasV4Extras) {
    if (isRecord(raw.goalEngineConfig)) normalized.goalEngineConfig = raw.goalEngineConfig as NormalizedBackupData['goalEngineConfig'];
    normalized.strengthProgramStrategies = cleanList<StrengthProgramStrategy>(raw.strengthProgramStrategies, hasId, skipped);
    normalized.strengthProgramRecommendations = cleanList<StrengthProgramRecommendation>(raw.strengthProgramRecommendations, hasId, skipped);
    normalized.planChangeProposals = cleanList<PlanChangeProposal>(raw.planChangeProposals, hasId, skipped)?.map(migratePlanChangeProposal);
    if (isRecord(raw.adviceResponses)) normalized.adviceResponses = raw.adviceResponses;
  }

  if (hasV5Extras) {
    // A plan that can't be read is dropped, never half-restored.
    const routePlan = sanitizeRoutePlan(raw.routePlan);
    if (routePlan) normalized.routePlan = routePlan;
    else if (raw.routePlan != null) skipped.n++;
    const soloPlan = sanitizeSoloPlan(raw.soloPlan);
    if (soloPlan) normalized.soloPlan = soloPlan;
    else if (raw.soloPlan != null) skipped.n++;
    // The full series: set by set, a damaged one is dropped and counted; no key means the
    // file has none and the device keeps its own.
    const streams = migrateActivityStreams(raw.activityStreams);
    if (streams.list) normalized.activityStreams = streams.list;
    skipped.n += streams.skipped;
  }
  // The mornings of the watch (storage/migrations.ts#migrateMornings): a file from before them has none.
  {
    const mornings = migrateMornings(raw.mornings);
    if (mornings.list) normalized.mornings = mornings.list;
    skipped.n += mornings.skipped;
  }

  // Soort, gegevens en belangrijkheid van elk doel (ronde 2a): een back-up van voor deze
  // ronde heeft ze niet. Het hoofddoel is het doel met mijlpalen.
  normalized.trainingGoals = migrateTrainingGoals(normalized.trainingGoals, new Set(normalized.goalMilestones.map((m) => m.goalId)), normalized.routePlan, { ladderKnown: false });

  normalized.skippedInvalid = skipped.n;
  return normalized;
}

export function normalizeBackupToCurrentModel(raw: unknown): NormalizedBackupData {
  if (!isRecord(raw)) {
    throw new BackupMessageError('Kon het bestand niet lezen. Is dit een geldig ASCEND-back-upbestand (.json)?');
  }
  const obj = raw;

  // New-style envelope (v0.3.2+).
  if (typeof obj.backupSchemaVersion === 'number' && isRecord(obj.payload)) {
    if (obj.backupSchemaVersion > CURRENT_BACKUP_SCHEMA_VERSION) {
      throw new BackupMessageError(
        `Deze back-up komt van een nieuwere versie van ASCEND (schema v${obj.backupSchemaVersion}). Werk de app bij voordat je hem importeert.`,
      );
    }
    const payload = obj.payload;
    const createdAt = typeof obj.createdAt === 'string' ? obj.createdAt : new Date().toISOString();
    const version = payload.version;
    if (version !== 1 && version !== 2 && version !== 3 && version !== 4 && version !== 5) {
      throw new BackupMessageError('Deze back-up heeft een onbekende gegevensversie en kan niet worden geïmporteerd.');
    }
    return buildNormalized({
      createdAt,
      sourceBackupSchemaVersion: obj.backupSchemaVersion,
      raw: payload,
      legacyGoals: version === 1,
      // V1/V2 predate the Capability Engine: no manual baseline evidence
      // could exist yet, so it's a true absence, not data loss.
      hasCapability: version >= 3,
      hasV4Extras: version >= 4,
      hasV5Extras: version >= 5,
    });
  }

  // Legacy flat export shape (pre-v0.3.2 — see migrations.ts).
  if (typeof obj.schemaVersion === 'number' && typeof obj.exportDate === 'string') {
    const migrated = migrateExport(obj as unknown as AscendExport) as unknown as Record<string, unknown> & { exportDate: string };
    return buildNormalized({
      createdAt: migrated.exportDate,
      sourceBackupSchemaVersion: 0,
      raw: migrated,
      legacyGoals: true,
      hasCapability: false,
      hasV4Extras: false,
      hasV5Extras: false,
    });
  }

  throw new BackupMessageError('Kon het bestand niet herkennen als een ASCEND-back-upbestand.');
}

// JSON.parse with a message the user can act on. A file cut off halfway
// (a failed download, a sync conflict) is the common case.
export function parseBackupText(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new BackupMessageError('Dit bestand is beschadigd of onvolledig: het is geen geldige back-up. Er is niets gewijzigd.');
  }
}

// --- category action support & defaults --------------------------------------

// Not every action makes sense for every category (v0.3.2 §Conflict & Merge
// Semantics) — planned_schedule in particular is governed by the separate
// PlanPolicy question below, never a free 4-way choice, since "merge two
// schedules" has no coherent meaning for a single-device local app.
// Training history has no 'replace': logs are append-only (CLAUDE.md), so
// no import may ever delete one. Restoring an older backup adds what's
// missing and keeps everything logged since.
export const CATEGORY_SUPPORTED_ACTIONS: Record<BackupDataCategory, CategoryAction[]> = {
  program_and_templates: ['keep_current', 'merge', 'replace'],
  training_history: ['keep_current', 'merge', 'ignore'],
  planned_schedule: ['keep_current', 'replace'],
  objectives_and_milestones: ['keep_current', 'merge', 'replace'],
  capability_evidence: ['keep_current', 'merge', 'replace', 'ignore'],
  injuries: ['keep_current', 'merge', 'replace', 'ignore'],
  app_settings: ['keep_current', 'replace'],
};

// Mode B (merge) deliberately omits planned_schedule entirely — the schedule
// is only ever touched via the separate PlanPolicy answer, never a bare
// category default. Mode C (custom) starts from the same sensible base as
// merge, since a blank slate of choices is worse UX than a reasonable
// starting point the user then tweaks.
export function defaultActionsForMode(mode: ImportMode): Partial<Record<BackupDataCategory, CategoryAction>> {
  if (mode === 'full_restore') {
    return {
      program_and_templates: 'replace',
      training_history: 'merge',
      planned_schedule: 'replace',
      objectives_and_milestones: 'replace',
      capability_evidence: 'replace',
      injuries: 'replace',
      app_settings: 'replace',
    };
  }
  // merge and custom
  return {
    program_and_templates: 'merge',
    training_history: 'merge',
    objectives_and_milestones: 'merge',
    capability_evidence: 'merge',
    injuries: 'merge',
    app_settings: 'keep_current',
  };
}

export function defaultPlanPolicyForMode(mode: ImportMode): PlanPolicy {
  return mode === 'full_restore' ? 'restore_backup_plan' : 'keep_current_plan';
}

// --- generic list-category resolution ----------------------------------------

interface Keyed {
  id: string;
}

interface ResolvedListCategory<T> {
  final: T[];
  toAdd: number;
  toReplace: number;
  toSkipDuplicate: number;
  toRemove: number;
  conflicts: ImportConflict[];
}

function shallowEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

// allowReplaceOverwrite=false means a merge conflict (same id, different
// content) is surfaced rather than silently applied — the append-only
// guarantee CLAUDE.md calls out for SessionLog/MilestoneProgress. Mutable
// categories (InjuryNote) pass true: a backup's newer version of the same
// record (e.g. a resolvedDate added since) is expected to win.
function resolveListCategory<T extends Keyed>(
  action: CategoryAction,
  incoming: T[],
  current: T[],
  allowReplaceOverwrite: boolean,
): ResolvedListCategory<T> {
  if (action === 'keep_current' || action === 'ignore') {
    return { final: current, toAdd: 0, toReplace: 0, toSkipDuplicate: 0, toRemove: 0, conflicts: [] };
  }
  const currentById = new Map(current.map((c) => [c.id, c]));
  if (action === 'replace') {
    const incomingIds = new Set(incoming.map((i) => i.id));
    let toAdd = 0;
    let toReplace = 0;
    let toSkipDuplicate = 0;
    for (const inc of incoming) {
      const existing = currentById.get(inc.id);
      if (!existing) toAdd++;
      else if (shallowEqual(existing, inc)) toSkipDuplicate++;
      else toReplace++;
    }
    const toRemove = current.filter((c) => !incomingIds.has(c.id)).length;
    return { final: incoming, toAdd, toReplace, toSkipDuplicate, toRemove, conflicts: [] };
  }

  // merge
  const final = [...current];
  const indexById = new Map(current.map((c, i) => [c.id, i]));
  let toAdd = 0;
  let toReplace = 0;
  let toSkipDuplicate = 0;
  const conflicts: ImportConflict[] = [];

  for (const inc of incoming) {
    const existingIndex = indexById.get(inc.id);
    if (existingIndex === undefined) {
      final.push(inc);
      toAdd++;
      continue;
    }
    const existing = final[existingIndex];
    if (shallowEqual(existing, inc)) {
      toSkipDuplicate++;
      continue;
    }
    if (allowReplaceOverwrite) {
      final[existingIndex] = inc;
      toReplace++;
    } else {
      conflicts.push({
        id: inc.id,
        reason: 'Bestaand record met dit id verschilt van de back-up en wordt niet overschreven (geschiedenis wordt nooit herschreven).',
      });
    }
  }

  return { final, toAdd, toReplace, toSkipDuplicate, toRemove: 0, conflicts };
}

// Lists that live inside AppSettings but are history, not preferences:
// restoring settings must never drop a weigh-in or an illness episode the
// device has and the backup doesn't. Union, the device's own record wins.
function mergeSettingsHistory(current: AppSettings, incoming: Partial<AppSettings>): Partial<AppSettings> {
  const merged: Partial<AppSettings> = { ...incoming };
  if (incoming.weightEntries || current.weightEntries) {
    const byDate = new Map((incoming.weightEntries ?? []).map((e) => [e.date, e]));
    for (const e of current.weightEntries ?? []) {
      // The device's own record wins, but a fat percentage only the backup has is added to it.
      const fromBackup = byDate.get(e.date);
      byDate.set(e.date, e.fatPct === undefined && fromBackup?.fatPct !== undefined ? { ...e, fatPct: fromBackup.fatPct } : e);
    }
    merged.weightEntries = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  }
  // The 1RM from MacroFactor is history too: per exercise and day the union,
  // the device's own reading wins.
  if (incoming.externalOneRm || current.externalOneRm) {
    merged.externalOneRm = mergeExternalOneRm(incoming.externalOneRm, current.externalOneRm ?? []);
  }
  if (incoming.illnessEpisodes || current.illnessEpisodes) {
    const byId = new Map((incoming.illnessEpisodes ?? []).map((e) => [e.id, e]));
    for (const e of current.illnessEpisodes ?? []) byId.set(e.id, e);
    merged.illnessEpisodes = [...byId.values()].sort((a, b) => a.startDate.localeCompare(b.startDate));
  }
  // Free days, holidays and treks: planned sessions on the device carry a
  // marker of the period that moved them, so a period is never dropped by a
  // settings restore (it could no longer be removed to put them back).
  // Union, the device's own period wins.
  if (incoming.leavePeriods || current.leavePeriods) {
    const byId = new Map((incoming.leavePeriods ?? []).map((p) => [p.id, p]));
    for (const p of current.leavePeriods ?? []) byId.set(p.id, p);
    merged.leavePeriods = [...byId.values()].sort((a, b) => a.startDate.localeCompare(b.startDate));
  }
  // Verdicts on short nights are history too: the union, the device's own wins, cut to
  // the newest MAX_JUDGMENTS like the list is on the device. A restore brings back a
  // verdict you undid on this device (the same pattern as weightEntries).
  if (incoming.nightJudgments || current.nightJudgments) {
    const byDate = new Map((incoming.nightJudgments ?? []).map((j) => [j.date, j]));
    for (const j of current.nightJudgments ?? []) byDate.set(j.date, j);
    merged.nightJudgments = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-MAX_JUDGMENTS);
  }
  // What you chose on days with tired legs: the union per date and training, the device's own wins.
  if (incoming.legEaseDays || current.legEaseDays) {
    const byKey = new Map((incoming.legEaseDays ?? []).map((d) => [`${d.date}|${d.plannedSessionId}`, d]));
    for (const d of current.legEaseDays ?? []) byKey.set(`${d.date}|${d.plannedSessionId}`, d);
    merged.legEaseDays = [...byKey.values()].sort((a, b) => a.date.localeCompare(b.date) || a.at.localeCompare(b.at)).slice(-MAX_LEG_EASE_DAYS);
  }
  // Verdicts on test runs: the union per log, the device's own wins.
  if (incoming.testJudgments || current.testJudgments) {
    merged.testJudgments = mergeTestJudgments(incoming.testJudgments, current.testJudgments);
  }
  // Weighings for sweat loss are history too: the union per id, the device's own wins, one
  // per training (engine/sweat.ts#mergeSweatEntries).
  if (incoming.sweatEntries || current.sweatEntries) {
    merged.sweatEntries = mergeSweatEntries(current.sweatEntries, incoming.sweatEntries);
  }
  // A weight from before a training is a draft: the union per day, the device's own wins.
  if (incoming.sweatPre || current.sweatPre) {
    const byDate = new Map((incoming.sweatPre ?? []).map((p) => [p.date, p]));
    for (const p of current.sweatPre ?? []) byDate.set(p.date, p);
    merged.sweatPre = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  }
  // Notes of "Wat speelde er" are history too: the union per id, the newest updatedAt
  // wins and on a tie the device does. A note you removed on this device comes back
  // with a restore, like a verdict on a night.
  if (incoming.influences || current.influences) {
    const byId = new Map((incoming.influences ?? []).map((e) => [e.id, e]));
    for (const e of current.influences ?? []) {
      const theirs = byId.get(e.id);
      if (!theirs || e.updatedAt >= theirs.updatedAt) byId.set(e.id, e);
    }
    merged.influences = dedupeInfluencesByPlace([...byId.values()]).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  }
  // Ticked-off journey tasks are history too: the union, the device wins.
  if (incoming.journey || current.journey) merged.journey = mergeJourneyState(current.journey, incoming.journey);
  if (incoming.weeklyIntentions || current.weeklyIntentions) {
    merged.weeklyIntentions = mergeIntentions(incoming.weeklyIntentions, current.weeklyIntentions);
  }
  return merged;
}

// --- preview ------------------------------------------------------------------

function resolvePlannedScheduleAction(planPolicy: PlanPolicy | undefined): CategoryAction {
  return planPolicy === 'restore_backup_plan' ? 'replace' : 'keep_current';
}

interface CurrentData {
  program: Program | null;
  templates: SessionTemplate[];
  plannedSessions: PlannedSession[];
  sessionLogs: SessionLog[];
  trainingGoals: TrainingGoal[];
  goalMilestones: GoalMilestone[];
  goalMilestoneProgress: GoalMilestoneProgress[];
  capabilityEvidence: CapabilityEvidence[];
  injuryNotes: InjuryNote[];
  settings: AppSettings;
  strengthProgramStrategies: StrengthProgramStrategy[];
  strengthProgramRecommendations: StrengthProgramRecommendation[];
  planChangeProposals: PlanChangeProposal[];
}

async function loadCurrentData(): Promise<CurrentData> {
  const [programs, templates, plannedSessions, sessionLogs, trainingGoals, goalMilestones, goalMilestoneProgress, capabilityEvidence, injuryNotes, settings, strengthProgramStrategies, strengthProgramRecommendations, planChangeProposals] = await Promise.all([
    ProgramsRepo.getAll(),
    SessionTemplatesRepo.getAll(),
    PlannedSessionsRepo.getAll(),
    SessionLogsRepo.getAll(),
    TrainingGoalsRepo.getAll(),
    GoalMilestonesRepo.getAll(),
    GoalMilestoneProgressRepo.getAll(),
    CapabilityEvidenceRepo.getAll(),
    InjuryNotesRepo.getAll(),
    SettingsRepo.get(),
    StrengthProgramStrategiesRepo.getAll(),
    StrengthProgramRecommendationsRepo.getAll(),
    PlanChangeProposalsRepo.getAll(),
  ]);
  return { program: programs[0] ?? null, templates, plannedSessions, sessionLogs, trainingGoals, goalMilestones, goalMilestoneProgress, capabilityEvidence, injuryNotes, settings, strengthProgramStrategies, strengthProgramRecommendations, planChangeProposals };
}

interface DiffResult {
  diffByCategory: ImportDiffEntry[];
  settingsChanges: { key: string; current: unknown; incoming: unknown }[];
  // The action that is actually applied per category: what the user asked,
  // except 'keep_current' when the file doesn't contain that category.
  effective: Record<BackupDataCategory, CategoryAction>;
  resolved: {
    program: Program | null;
    templates: ResolvedListCategory<SessionTemplate>;
    plannedSessions: ResolvedListCategory<PlannedSession>;
    sessionLogs: ResolvedListCategory<SessionLog>;
    trainingGoals: ResolvedListCategory<TrainingGoal>;
    goalMilestones: ResolvedListCategory<GoalMilestone>;
    goalMilestoneProgress: ResolvedListCategory<GoalMilestoneProgress>;
    capabilityEvidence: ResolvedListCategory<CapabilityEvidence>;
    injuryNotes: ResolvedListCategory<InjuryNote>;
    strengthProgramStrategies: ResolvedListCategory<StrengthProgramStrategy> | undefined;
    strengthProgramRecommendations: ResolvedListCategory<StrengthProgramRecommendation> | undefined;
    planChangeProposals: ResolvedListCategory<PlanChangeProposal> | undefined;
    settings: AppSettings | undefined;
    meta: Record<string, unknown>;
  };
}

function computeDiff(
  current: CurrentData,
  backup: NormalizedBackupData,
  categorySelections: Partial<Record<BackupDataCategory, CategoryAction>>,
  planPolicy: PlanPolicy | undefined,
): DiffResult {
  const diffByCategory: ImportDiffEntry[] = [];
  const requested: Record<BackupDataCategory, CategoryAction> = {
    program_and_templates: categorySelections.program_and_templates ?? 'keep_current',
    // An older plan could still carry 'replace' for history — logs are
    // append-only, so it can only ever mean merge.
    training_history: categorySelections.training_history === 'replace' ? 'merge' : (categorySelections.training_history ?? 'keep_current'),
    planned_schedule: resolvePlannedScheduleAction(planPolicy),
    objectives_and_milestones: categorySelections.objectives_and_milestones ?? 'keep_current',
    capability_evidence: categorySelections.capability_evidence ?? 'keep_current',
    injuries: categorySelections.injuries ?? 'keep_current',
    app_settings: categorySelections.app_settings ?? 'keep_current',
  };
  const effective = Object.fromEntries(
    ALL_CATEGORIES.map((c) => [c, backup.present[c] ? requested[c] : 'keep_current']),
  ) as Record<BackupDataCategory, CategoryAction>;
  const missing = (c: BackupDataCategory) => !backup.present[c] && requested[c] !== 'keep_current' && requested[c] !== 'ignore';

  const entry = (category: BackupDataCategory, parts: ResolvedListCategory<unknown & Keyed>[]): ImportDiffEntry => ({
    category,
    action: effective[category],
    toAdd: parts.reduce((n, p) => n + p.toAdd, 0),
    toReplace: parts.reduce((n, p) => n + p.toReplace, 0),
    toSkipDuplicate: parts.reduce((n, p) => n + p.toSkipDuplicate, 0),
    toRemove: parts.reduce((n, p) => n + p.toRemove, 0),
    missingInBackup: missing(category),
    conflicts: parts.flatMap((p) => p.conflicts),
  });

  const programAction = effective.program_and_templates;
  // A device with nothing of your own (no program, planning, training or goal)
  // only holds the building blocks ASCEND put there. A full restore then keeps
  // the ones the backup does not know (a backup from an older version lacks the
  // newer templates): they are not removed, so nothing "disappears" that you
  // never chose.
  const deviceEmpty = isEmptyStart({ programs: current.program ? 1 : 0, plannedSessions: current.plannedSessions.length, sessionLogs: current.sessionLogs.length, trainingGoals: current.trainingGoals.length });
  const keepUnlisted = <T extends Keyed>(r: ResolvedListCategory<T>, currentList: T[]): ResolvedListCategory<T> => {
    if (!deviceEmpty || programAction !== 'replace' || r.toRemove === 0) return r;
    const incomingIds = new Set(r.final.map((x) => x.id));
    return { ...r, final: [...r.final, ...currentList.filter((c) => !incomingIds.has(c.id))], toRemove: 0 };
  };
  const templatesResolved = keepUnlisted(resolveListCategory(programAction, backup.templates, current.templates, true), current.templates);
  const strategiesResolved = backup.strengthProgramStrategies
    ? keepUnlisted(resolveListCategory(programAction, backup.strengthProgramStrategies, current.strengthProgramStrategies, true), current.strengthProgramStrategies)
    : undefined;
  const resolvedProgram = programAction === 'keep_current' || programAction === 'ignore'
    ? current.program
    : programAction === 'replace'
      ? (backup.program ?? current.program)
      : (current.program ?? backup.program); // merge: adopt backup's program only if there wasn't one already
  diffByCategory.push(entry('program_and_templates', [templatesResolved]));

  const historyAction = effective.training_history;
  const sessionLogsResolved = resolveListCategory(historyAction, backup.sessionLogs, current.sessionLogs, false);
  // Append-only audit trails travel with the history and only ever merge.
  const proposalsResolved = backup.planChangeProposals
    ? resolveListCategory(historyAction === 'merge' ? 'merge' : 'keep_current', backup.planChangeProposals, current.planChangeProposals, false)
    : undefined;
  const recommendationsResolved = backup.strengthProgramRecommendations
    ? resolveListCategory(historyAction === 'merge' ? 'merge' : 'keep_current', backup.strengthProgramRecommendations, current.strengthProgramRecommendations, false)
    : undefined;
  diffByCategory.push(entry('training_history', [sessionLogsResolved]));

  const scheduleAction = effective.planned_schedule;
  const plannedSessionsResolved = resolveListCategory(scheduleAction, backup.plannedSessions, current.plannedSessions, true);
  diffByCategory.push(entry('planned_schedule', [plannedSessionsResolved]));

  const goalsAction = effective.objectives_and_milestones;
  const trainingGoalsResolved = resolveListCategory(goalsAction, backup.trainingGoals, current.trainingGoals, true);
  const goalMilestonesResolved = resolveListCategory(goalsAction, backup.goalMilestones, current.goalMilestones, true);
  // Milestone progress is a record of what was actually cleared — append-
  // only like the logs, so even a goal 'replace' only ever merges it.
  const goalMilestoneProgressResolved = resolveListCategory(goalsAction === 'replace' ? 'merge' : goalsAction, backup.goalMilestoneProgress, current.goalMilestoneProgress, false);
  diffByCategory.push(entry('objectives_and_milestones', [trainingGoalsResolved, goalMilestonesResolved, goalMilestoneProgressResolved]));

  // Manual CapabilityEvidence rows are user-authored answers, not
  // append-only observed history — a conflicting id can be safely
  // overwritten by a newer answer on merge, same as InjuryNote.
  const capabilityEvidenceResolved = resolveListCategory(effective.capability_evidence, backup.capabilityEvidence, current.capabilityEvidence, true);
  diffByCategory.push(entry('capability_evidence', [capabilityEvidenceResolved]));

  const injuryNotesResolved = resolveListCategory(effective.injuries, backup.injuryNotes, current.injuryNotes, true);
  diffByCategory.push(entry('injuries', [injuryNotesResolved]));

  const settingsAction = effective.app_settings;
  const settingsChanges: { key: string; current: unknown; incoming: unknown }[] = [];
  let resolvedSettings: AppSettings | undefined;
  const meta: Record<string, unknown> = {};
  if (settingsAction === 'replace') {
    const incoming = mergeSettingsHistory(current.settings, backup.settings);
    resolvedSettings = { ...current.settings, ...incoming };
    for (const key of Object.keys(incoming) as (keyof AppSettings)[]) {
      if (!shallowEqual(current.settings[key], incoming[key])) {
        settingsChanges.push({ key, current: current.settings[key], incoming: incoming[key] });
      }
    }
    if (backup.goalEngineConfig) meta.goalEngineConfig = backup.goalEngineConfig;
    if (backup.adviceResponses) meta.adviceResponses = backup.adviceResponses;
    if (backup.routePlan) meta[ROUTE_PLAN_KEY] = backup.routePlan;
    if (backup.soloPlan) meta[SOLO_PLAN_KEY] = backup.soloPlan;
  }
  diffByCategory.push({
    category: 'app_settings',
    action: settingsAction,
    toAdd: 0,
    toReplace: settingsChanges.length,
    toSkipDuplicate: 0,
    toRemove: 0,
    missingInBackup: missing('app_settings'),
    conflicts: [],
  });

  return {
    diffByCategory,
    settingsChanges,
    effective,
    resolved: {
      program: resolvedProgram,
      templates: templatesResolved,
      plannedSessions: plannedSessionsResolved,
      sessionLogs: sessionLogsResolved,
      trainingGoals: trainingGoalsResolved,
      goalMilestones: goalMilestonesResolved,
      goalMilestoneProgress: goalMilestoneProgressResolved,
      capabilityEvidence: capabilityEvidenceResolved,
      injuryNotes: injuryNotesResolved,
      strengthProgramStrategies: strategiesResolved,
      strengthProgramRecommendations: recommendationsResolved,
      planChangeProposals: proposalsResolved,
      settings: resolvedSettings,
      meta,
    },
  };
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function buildImportPreview(
  backup: NormalizedBackupData,
  categorySelections: Partial<Record<BackupDataCategory, CategoryAction>>,
  planPolicy: PlanPolicy | undefined,
): Promise<ImportPreview> {
  const current = await loadCurrentData();
  const { diffByCategory, settingsChanges } = computeDiff(current, backup, categorySelections, planPolicy);

  const recordCounts: Partial<Record<BackupDataCategory, number>> = {
    program_and_templates: backup.templates.length,
    training_history: backup.sessionLogs.length,
    planned_schedule: backup.plannedSessions.length,
    objectives_and_milestones: backup.trainingGoals.length + backup.goalMilestones.length + backup.goalMilestoneProgress.length,
    capability_evidence: backup.capabilityEvidence.length,
    injuries: backup.injuryNotes.length,
    app_settings: Object.keys(backup.settings).length,
  };

  const ageMs = Date.now() - new Date(backup.createdAt).getTime();
  const restoreDateWarning =
    Number.isFinite(ageMs) && ageMs > THIRTY_DAYS_MS
      ? 'Deze back-up is meer dan 30 dagen oud. Je planning en instellingen gaan terug naar die stand.'
      : undefined;
  const logsSinceBackup = current.sessionLogs.filter((l) => l.completedAt > backup.createdAt).length;

  return {
    backupMeta: {
      createdAt: backup.createdAt,
      backupSchemaVersion: backup.sourceBackupSchemaVersion,
      recordCounts,
      hasTrainingPlan: backup.program !== null,
      isFromOlderVersion: backup.sourceBackupSchemaVersion < CURRENT_BACKUP_SCHEMA_VERSION,
      restoreDateWarning,
      logsSinceBackup,
      skippedInvalid: backup.skippedInvalid,
    },
    diffByCategory,
    settingsChanges,
  };
}

// --- plan & apply ---------------------------------------------------------

// Enough to undo the last few imports; older copies only cost storage
// (each one is the whole database).
const MAX_SNAPSHOTS = 5;

export async function listSnapshots(): Promise<PreImportSnapshot[]> {
  const all = await BackupSnapshotsRepo.getAll();
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createPreImportSnapshot(): Promise<PreImportSnapshot> {
  const envelope = await buildBackupEnvelope({ streams: false, mornings: false });
  const snapshot: PreImportSnapshot = {
    id: makeId('snapshot'),
    createdAt: new Date().toISOString(),
    envelope,
    reason: 'pre_import',
  };
  await BackupSnapshotsRepo.put(snapshot);
  const all = await listSnapshots();
  for (const old of all.slice(MAX_SNAPSHOTS)) await BackupSnapshotsRepo.delete(old.id);
  return snapshot;
}

// Puts a pre-import copy back: everything returns to that moment, except
// trainings logged since — those are never deleted (history is
// append-only). Takes its own snapshot first, so this too can be undone.
export async function restoreSnapshot(id: string): Promise<void> {
  const snapshot = (await BackupSnapshotsRepo.getAll()).find((s) => s.id === id);
  if (!snapshot) throw new BackupMessageError('Deze kopie bestaat niet meer.');
  const backup = normalizeBackupToCurrentModel(snapshot.envelope);
  const before = await createPreImportSnapshot();
  const selections = defaultActionsForMode('full_restore');
  const plan = createImportPlan(backup, 'full_restore', selections, 'restore_backup_plan', [], before.id);
  await applyImportPlan(backup, plan);
}

export function createImportPlan(
  backup: NormalizedBackupData,
  mode: ImportMode,
  categorySelections: Partial<Record<BackupDataCategory, CategoryAction>>,
  planPolicy: PlanPolicy | undefined,
  conflicts: ImportConflict[],
  preImportSnapshotId: string,
): ImportPlan {
  return {
    id: makeId('importplan'),
    sourceBackupSchemaVersion: backup.sourceBackupSchemaVersion,
    backupCreatedAt: backup.createdAt,
    mode,
    categorySelections,
    planPolicy,
    conflicts,
    preImportSnapshotId,
    approvedAt: new Date().toISOString(),
  };
}

// The plan is exactly what was approved — this never re-asks a question or
// makes a new decision, it only re-derives the same resolveListCategory
// output (pure, deterministic) and issues the writes. A snapshot must
// already exist (created by createPreImportSnapshot before the user ever
// saw the confirmation step) so an import can always be undone.
export async function applyImportPlan(backup: NormalizedBackupData, plan: ImportPlan): Promise<void> {
  const current = await loadCurrentData();
  const { resolved, effective } = computeDiff(current, backup, plan.categorySelections, plan.planPolicy);

  const touches = (a: CategoryAction) => a !== 'keep_current' && a !== 'ignore';
  const listWrite = <T,>(action: CategoryAction, r: ResolvedListCategory<T> | undefined) =>
    r && touches(action) ? { clear: action === 'replace', puts: r.final } : undefined;

  const programAction = effective.program_and_templates;
  const historyAction = effective.training_history;
  const goalsAction = effective.objectives_and_milestones;

  // A device that had no program yet (a new installation) gets one from the
  // backup: the old default strength block must not turn up unasked at the next
  // update, so its flag is set (storage/goalMigration.ts#migrateStrengthProgramDefault).
  const restoredMeta: Record<string, unknown> = !current.program && touches(programAction) && resolved.program ? { strengthProgramDefaultSeeded: true } : {};

  // The series that came with the file: only for logs that are there afterwards, and never over
  // a set the device already has for that log (its own is the newer reading). With "Volledige
  // reeks bewaren" off (as it is afterwards) no series are written at all.
  let streamPuts: ActivityStreams[] = [];
  const keepStreams = (resolved.settings ?? current.settings)?.keepStreams !== false;
  if (keepStreams && touches(historyAction) && backup.activityStreams && backup.activityStreams.length > 0) {
    const have = new Set(await ActivityStreamsRepo.keys());
    const logIds = new Set(resolved.sessionLogs.final.map((l) => l.id));
    streamPuts = backup.activityStreams.filter((s) => logIds.has(s.logId) && !have.has(s.logId));
  }

  // The mornings that came with the file: only those the device does not have yet, never over a
  // morning the device fetched itself (its own is the newer reading). What is switched off under
  // "Wat ASCEND van je horloge gebruikt" stays out (engine/watchUse.ts#filterRecovery).
  let morningPuts: RecoveryMetric[] = [];
  if (touches(historyAction) && backup.mornings && backup.mornings.length > 0) {
    const have = new Set((await RecoveryMetricsRepo.getAll()).map((m) => m.id));
    morningPuts = filterRecovery(backup.mornings.filter((m) => !have.has(m.id)), (await getWatchState()).use);
  }

  try {
    await applyBackupWrites({
      programs: touches(programAction) && resolved.program ? { clear: true, puts: [resolved.program] } : undefined,
      sessionTemplates: listWrite(programAction, resolved.templates),
      strengthProgramStrategies: listWrite(programAction, resolved.strengthProgramStrategies),
      plannedSessions: touches(effective.planned_schedule) ? { clear: true, puts: resolved.plannedSessions.final } : undefined,
      // Never cleared: logs, milestone progress and audit trails only grow.
      sessionLogs: touches(historyAction) ? { clear: false, puts: resolved.sessionLogs.final } : undefined,
      planChangeProposals: touches(historyAction) && resolved.planChangeProposals ? { clear: false, puts: resolved.planChangeProposals.final } : undefined,
      strengthProgramRecommendations: touches(historyAction) && resolved.strengthProgramRecommendations ? { clear: false, puts: resolved.strengthProgramRecommendations.final } : undefined,
      activityStreams: streamPuts.length > 0 ? { clear: false, puts: streamPuts } : undefined,
      recoveryMetrics: morningPuts.length > 0 ? { clear: false, puts: morningPuts } : undefined,
      trainingGoals: listWrite(goalsAction, resolved.trainingGoals),
      goalMilestones: listWrite(goalsAction, resolved.goalMilestones),
      goalMilestoneProgress: touches(goalsAction) ? { clear: false, puts: resolved.goalMilestoneProgress.final } : undefined,
      capabilityEvidence: listWrite(effective.capability_evidence, resolved.capabilityEvidence),
      injuryNotes: listWrite(effective.injuries, resolved.injuryNotes),
      settings: resolved.settings,
      meta: Object.keys({ ...resolved.meta, ...restoredMeta }).length > 0 ? { ...resolved.meta, ...restoredMeta } : undefined,
    });
  } catch (err) {
    const detail = err instanceof Error ? ` (${err.message})` : '';
    throw new Error(`Importeren is mislukt. Er is niets gewijzigd.${detail}`);
  }
  // De geplande sessies zijn vervangen: een lopende training hoort bij de oude planning (wijzer en concepten mee).
  if (touches(effective.planned_schedule) || touches(programAction)) clearForgeSessions();
}

export { ALL_CATEGORIES };

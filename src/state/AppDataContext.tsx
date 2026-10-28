import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Program } from '../models/program';
import type { PlannedSession, SessionLog, SessionTemplate, SessionVariant } from '../models/training';
import type { TrainingGoal, GoalMilestone, GoalMilestoneProgress, GoalPriority } from '../models/goals';
import type { InjuryNote } from '../models/injury';
import type { CapabilityEvidence } from '../models/capability';
import type { StrengthProgramStrategy, StrengthProgramRecommendation } from '../models/strengthProgram';
import { DEFAULT_GOAL_ENGINE_CONFIG, type GoalEngineConfig } from '../models/goalEngineConfig';
import type { CelebrationEvent } from '../components/CompletionMoment';
import { haptics } from '../utils/haptics';
import { playMilestoneChime, playSessionCompleteChime } from '../utils/sound';
import { pickCompletionQuote, pickVictoryQuote } from '../utils/quotes';
import {
  ProgramsRepo,
  SessionTemplatesRepo,
  PlannedSessionsRepo,
  SessionLogsRepo,
  TrainingGoalsRepo,
  GoalMilestonesRepo,
  GoalMilestoneProgressRepo,
  InjuryNotesRepo,
  CapabilityEvidenceRepo,
  PlanChangeProposalsRepo,
  StrengthProgramStrategiesRepo,
  StrengthProgramRecommendationsRepo,
  GoalEngineConfigRepo,
  SettingsRepo,
  MetaRepo,
  StretchCompletionRepo,
  resetScheduleToDefault,
  restartProgramAtWeekOne,
  rebuildPlanningFromWeekOne,
  DEFAULT_SETTINGS,
  type AppSettings,
  type StretchCompletion,
} from '../storage/database';
import { migrateToGoalEngine, migrateStrengthProgramDefault } from '../storage/goalMigration';
import { runBootMigrations } from '../storage/bootMigrations';
import { withPlausibleDurations } from '../engine/logDuration';
import { runBootUnderLock } from '../storage/bootLock';
import { describeStorageError, describeWriteError } from '../storage/storageError';
import { storageIsOpen, whenStorageOpen } from '../storage/lifecycle';
import { syncGr5MilestoneDefinitions } from '../storage/goalMilestoneSync';
import { weekLoadInput, type WeekLoadKind } from '../storage/weekLoadPlan';
import { currentBodyKg } from '../engine/bodyWeight';
import { packWeightOf, tentPackProposal, withPackWeight } from '../engine/gr5Profile';
import { buildMarathonGoal } from '../engine/goalMigration';
import { orderForRestored, PRIORITY_RULE } from '../engine/goalList';
import { setFreshnessContext, setHardSameDayAllowed, proposeMove, proposeNoTimeToday, proposeSkip as proposeSkipEngine, proposeBackOnPlan as proposeBackOnPlanEngine, skipSession as skipSessionEngine, type ScheduleProposal } from '../engine/scheduler';
import { planIllnessChange, type IllnessChange, type IllnessPlan } from '../engine/illness';
import type { LeavePeriod } from '../models/leave';
import { sortPeriods } from '../engine/leave';
import { planLeaveChange, type LeavePlan } from '../engine/leaveProposal';
import { applyRestDayInOrder, planRestDayChange, type RestDayPlan } from '../engine/restDayProposal';
import { suggestMoveDates, type MoveSuggestion } from '../engine/moveSuggestions';
import { extractEvidenceFromLogs } from '../engine/capability';
import { activeGoalDemandKeys } from '../engine/progressionDecisions';
import { computeForecastReplan } from '../engine/adaptiveReplanner';
import { runWeeklyPrescriptionStep } from '../storage/weeklyPrescriptionStep';
import { applyPlanChangeItems } from '../engine/proposalEngine';
import { prescriptionSummary } from '../engine/changeImpact';
import { describeChanges } from '../engine/changeImpact';
import { applyScheduleAnomalyFixNow } from '../storage/scheduleAnomalyFix';
import { undoPlanChangeNow } from '../storage/undoPlanChange';
import { applyHorizonPlanNow, computeHorizonPlan, type HorizonApplyResult, type HorizonApplyStatus, type HorizonChangeInput, type HorizonPlan } from '../storage/horizonPlan';
import { SHOW_SPLASH } from '../utils/updateFlag';
import { resolveMotion, splashMinimumMs } from '../engine/motionSettings';
import { computeAdvice, type Advice } from '../engine/adviceEngine';
import { resolveLegEase } from '../engine/legEaseSettings';
import { influenceMove, influenceMoveCause, type InfluenceMove } from '../engine/influenceProposal';
import { useWeatherForecast, type WeatherView } from './useWeather';
import { useFollowLocation } from './useFollowLocation';
import { syncWatchActivities } from '../storage/externalActivities';
import { ensureRecentTestEfforts } from '../storage/activityDetail';
import { resetAllDataAndAgenda, syncWatchWorkouts, syncWatchWorkoutsAfterPlanChange } from '../storage/watchWorkouts';
import { applyFeedback, type FeedbackPatch } from '../engine/autoTick';
import { announcementFor, type SavedMoment } from '../engine/savedMoments';
import { recordClearedMilestones } from '../storage/milestoneClearing';
import { applyAlignments, inTurn, restoreAlignments, type AlignRequest } from '../storage/watchAlign';
import { trimStoredLog, undoTrimStoredLog } from '../storage/trim';
import { onSourceCorrected, restoreSourceUpdateStored, takeOverOfferedStored } from '../storage/sourceCorrection';
import type { StreamSet } from '../models/activityDetail';
import { applyStrengthTakeovers, restoreStrengthTakeovers, type TakeoverRequest } from '../storage/macrofactorLead';
import { createSerialQueue } from '../utils/serialQueue';
import { bootLockChoice, runBoot, type BootStep } from '../engine/bootWatch';

type AdviceResponse = StoredResponse;

export type MarathonGoalPatch = Partial<Pick<AppSettings, 'marathonRaceType' | 'marathonTargetDate' | 'marathonTargetTimeMinutes'>>;
export interface GoalActivationResult {
  applied: boolean;
  reason?: 'stale' | 'review' | 'failed' | 'pending' | 'partial';
  horizon?: HorizonPlan;
}

// The boot sequence must run once per page load. React StrictMode mounts
// effects twice in development; two concurrent seedIfEmpty() calls both saw
// an empty database and seeded it twice (every session doubled). One shared
// promise makes the second caller wait for the first instead.
let bootMigrations: Promise<void> | null = null;
let backgroundPlanningStarted = false;
// The part of the migrations that runs, for the watch on the opening screen
// (engine/bootWatch.ts#bootStepName): never just "migraties".
let currentBootMigration: string | null = null;
const bootMigrationListeners = new Set<(id: string) => void>();
function noteBootMigration(id: string) {
  currentBootMigration = id;
  bootMigrationListeners.forEach((fn) => fn(id));
}

const syncChannel: BroadcastChannel | null = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('ascend-data') : null;

// Web Locks serialize the boot across windows too: a fresh install opened
// in two tabs at once used to seed the whole program twice, and the boot
// migrations write planned sessions and templates on every opening. So a window
// never runs them without the lock. When another window holds it for longer
// than 10 s (a tab frozen in the background), this window says so, with
// Opnieuw proberen, instead of a black screen or a second run at the same time
// (docs/beslissingen/2026-10-22-openen-wacht-niet-op-de-planning.md).
// The lock is asked only while the page is in view, let go when it goes out of
// view between two steps, and kept until a repair that went over its time is
// really done (storage/bootLock.ts).
// Resolves when the boot steps are really done, a slow repair included. The
// planning sync waits for it, so it never writes the plan at the same time.
let bootSettled: Promise<void> = Promise.resolve();
function sessionStorageOrNull(): Storage | null {
  try {
    return typeof sessionStorage !== 'undefined' ? sessionStorage : null;
  } catch {
    return null;
  }
}
function runBootMigrationsOnce(): Promise<void> {
  if (!bootMigrations) {
    const { ready, settled } = runBootUnderLock({
      locks: typeof navigator !== 'undefined' ? navigator.locks : undefined,
      whenOpen: whenStorageOpen,
      isOpen: storageIsOpen,
      run: (shouldPause, isCancelled) => runBootMigrations({ onStep: noteBootMigration, shouldPause, isCancelled }),
      // Toch openen (the screen for a lock that stays taken): this one load
      // takes the lock over (docs/beslissingen/2026-10-22-toch-openen.md).
      steal: bootLockChoice(sessionStorageOrNull()) === 'steal',
    });
    bootSettled = settled;
    bootMigrations = ready.then(
      (skipped) => {
        if (skipped.length > 0) console.warn('Opstartstappen overgeslagen tot de volgende keer', skipped);
      },
      (err: unknown) => {
        // Opnieuw proberen in the same page asks for the lock again.
        bootMigrations = null;
        throw err;
      },
    );
  }
  return bootMigrations;
}

// The program follows the main goal's date (storage/database.ts
// #syncProgramHorizon). Checked on every refresh, but only run when
// something it depends on changed: the goal date, the start of week 1, the
// sports, the long-Sunday choice, or a new day. Serialized, so two
// refreshes at once can never add the same weeks twice.
let lastHorizonKey = '';
function planFingerprint(planned: PlannedSession[]): number {
  let h = 0;
  for (const s of [...planned].sort((a, b) => a.id.localeCompare(b.id))) {
    const line = `${s.id}|${s.scheduledDate}|${s.status}|${s.templateId}|${s.plannedMinutes ?? ''}|${s.lock ? 1 : 0}`;
    for (let i = 0; i < line.length; i++) h = (Math.imul(h, 31) + line.charCodeAt(i)) | 0;
  }
  return h;
}
// One sync at a time, always (utils/serialQueue.ts): the next one starts only
// when the one before has really finished. A caller that waited longer than a
// minute is let go, so no button or screen waits for ever on the planning.
const horizonQueue = createSerialQueue({ timeoutMs: 60_000, name: 'Planningssync' });
// Everything that changes the plan waits for the syncs already queued, so it
// never works on the plan of before a sync that is still writing (the app opens
// before its first sync has run, engine/bootWatch.ts). It reads the stored plan
// afterwards, never the state on screen.
function planSettled(): Promise<void> {
  return horizonQueue.run(async () => undefined).then(() => undefined);
}
// Raised after every Akkoord and every move or skip of your own, so the sync
// checks the week right away instead of the next day (docs/onderzoek/Planning op een
// lijn.md, conflict 9).
let planRevision = 0;
// The durations, spacing and leg index every planning step reads (engine/
// substitutions.ts, engine/scheduler.ts). Set before the sync too, so the
// sync and its week check never work with the state of the refresh before
// (docs/onderzoek/Planning op een lijn.md, conflict 10).
function setPlanningRegisters(program: Program | null, tpls: SessionTemplate[], planned: PlannedSession[], logs: SessionLog[], loadedSettings: AppSettings, goals: TrainingGoal[]) {
  // Volume after illness follows the illness history everywhere a duration
  // is shown or planned; strength trainings take your estimate or the
  // duration learned from logs; the ambition in force (engine/durationScope.ts).
  const scope = durationScopeFor(loadedSettings, logs, tpls, program, todayISO());
  setDurationAdjustments(scope.durationAdjustments);
  // No session in the next two weeks asks for more than 110% of the
  // longest of its kind in the last 30 days.
  // A run on the date of a running goal is that race (engine/runGrowth.ts), not a reference for the 110%.
  const raceGoalDates = new Set(goals.filter((g) => g.targetDate && isRaceGoal(g)).map((g) => g.targetDate!));
  setRecentSessionMaxima(recentSessionMaxima(logs, todayISO(), raceGoalDates));
  setLearnedDurations(scope.learnedDurations);
  setHardSameDayAllowed(!!loadedSettings.hardSameDay);
  // The planner's leg index with the same inputs as the Benen card.
  const lastWeight = currentBodyKg(loadedSettings.weightEntries, loadedSettings.weightFromMacroFactor);
  setFreshnessContext({ today: todayISO(), bodyKg: lastWeight, program, minutesOf: (s, t) => resolveVariantDuration(t, 'full', s.scheduledDate, program) });
  setFixedSessionMinutes(planned);
  setAmbition(scope.ambition);
}

// Always as stored. A proposal's preview never sets these to values you did
// not accept: it passes its own registers to the planning run
// (storage/horizonPlan.ts, Warden Planning punt 3).
async function primePlanningRegisters() {
  const [programs, tpls, planned, logs, loadedSettings, goals] = await Promise.all([ProgramsRepo.getAll(), SessionTemplatesRepo.getAll(), PlannedSessionsRepo.getAll(), SessionLogsRepo.getAll(), SettingsRepo.get(), TrainingGoalsRepo.getAll()]);
  setPlanningRegisters(programs[0] ?? null, tpls, planned, logs, loadedSettings, goals);
}

// What the week check put right in the last sync, until refresh() shows it.
let pendingRepairs: ProgramHorizonResult['repairs'];

// The stored phases are part of the key, so a reset or an import that
// rewrites the program also triggers a sync.
async function horizonKey(): Promise<string> {
    const [programs, goals, milestones, settings, planned] = await Promise.all([
      ProgramsRepo.getAll(), TrainingGoalsRepo.getAll(), GoalMilestonesRepo.getAll(), SettingsRepo.get(), PlannedSessionsRepo.getAll(),
    ]);
    return JSON.stringify([
      todayISO(),
      planRevision,
      // Any change to the planned sessions, by whatever step or by you: the
      // sync and its week check run again (docs/onderzoek/Planning op een
      // lijn.md, conflict 9).
      planFingerprint(planned),
      programs[0]?.startDate,
      programs[0]?.phases,
      // A repeated week changes the wave week the Saturday follows; a rest week
      // trained through and the days held before a change do the same.
      programs[0]?.repeatedWeeks,
      programs[0]?.skippedRestWeeks,
      programs[0]?.heldWeekDays,
      programAnchorDate(goals, milestones, todayISO()),
      settings.longSundaySession,
      settings.enabledSports,
      settings.programPhaseOverrides,
      settings.restDay,
      // Free days, holidays and treks (engine/leave.ts).
      settings.leavePeriods,
      // Soft or strict rest after a bergtocht: switching it plans again at once.
      settings.trekLegRest,
      // How fast the long run grows toward a race (engine/runGrowth.ts).
      settings.longRunGrowth,
      // Planning after the main goal (engine/programLayout.ts#planEndDay).
      settings.afterMainGoal,
      // The fourth run in Opbouw (engine/extraRun.ts) is off on Rustig.
      settings.ambition,
      // Tussendoelen (engine/raceBlock.ts) change the plan too. The rucksack
      // target of the main goal sets the pack ladder (engine/packLadder.ts).
      goals.map((g) => [g.id, g.status, g.targetDate, g.planRole, g.priorityChosen, g.requirements.length, packWeightOf(g.requirements)]),
    ]);
}

// True when the sync ran (something it depends on had changed).
function syncProgramHorizonWhenChanged(prime?: () => Promise<void>): Promise<boolean> {
  const currentKey = horizonKey;
  return horizonQueue
    .run(async () => {
      // A repair from the opening that went over its time may still write the
      // plan (storage/bootLock.ts): first let it finish.
      await bootSettled;
      if ((await currentKey()) === lastHorizonKey) return false;
      await prime?.();
      const result = await syncProgramHorizon();
      // Two syncs before one refresh: both notices count.
      if (result.repairs) pendingRepairs = pendingRepairs
        ? { lines: [...pendingRepairs.lines, ...result.repairs.lines], before: [...pendingRepairs.before, ...result.repairs.before.filter((b) => !pendingRepairs!.before.some((p) => p.id === b.id))], stored: [...pendingRepairs.stored, ...result.repairs.stored.filter((b) => !pendingRepairs!.stored.some((p) => p.id === b.id))], addedIds: [...(pendingRepairs.addedIds ?? []), ...(result.repairs.addedIds ?? [])] }
        : result.repairs;
      lastHorizonKey = await currentKey();
      return true;
    })
    .then((ran) => ran ?? false);
}

function simpleHash(text: string): string {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
import { isSportEnabled, weeklyPatternTemplates, fixedFrequencySports, DEFAULT_ENABLED_SPORTS, SPORT_LABEL, type Sport } from '../engine/sports';
import { computeSportFrequencyPlan } from '../engine/sportFrequency';
import { computeInputStateHash, applyGoalActivationPlan } from '../engine/goalActivation';
import type { GoalActivationPlan, PlanChangeProposal, RecentPlanChange } from '../models/planChange';
import { computeActiveGoalOverviews, type GoalOverview } from '../engine/goalOverview';
import { activeStrengthStrategy, strengthTrackedExternally, daysUntilBlockEnd, computeStrengthReviewTriggers, buildStrengthProgramRecommendation, type StrengthReviewSignals } from '../engine/strengthProgram';
import { computeStrengthPlacementPlan, computeStrengthPlacementPlanForCommittedRange } from '../engine/strengthScheduling';
import { mondayOfWeek, todayISO, daysBetween, addDays, weekdayShortNL, formatDateNL, localDateOf } from '../utils/dates';
import { withProgramExercises } from '../engine/macrofactorProgram';
import { makeId } from '../utils/id';
import type { InfluenceEntry } from '../models/influence';
import type { SweatEntry } from '../models/sweat';
import { clearSweatPre, setSweatPre } from '../engine/sweatMoments';
import { applyChange, blankEntry, excludedLogIds, type NoteTarget } from '../engine/influence';
import { buildBackupEnvelope, backupFileName } from '../storage/backup';
import { webBackupFileAdapter } from '../storage/backupFileAdapter';
import { setDurationAdjustments, setRecentSessionMaxima, recentSessionMaxima, setLearnedDurations, setFixedSessionMinutes, setAmbition, resolveVariantDuration } from '../engine/substitutions';
import { coachReaction } from '../engine/coach';
import { requestPersistentStorage } from '../storage/persistence';
import { durationScopeFor } from '../engine/durationScope';
import { patternDays, previewPlanPass } from '../engine/planPass';
import { adviceSessionIds, weekNotice, weekNoticeConcerns, type WeekNotice } from '../engine/weekFixProposal';
import { declinedRules, learnFromDeclines, type StoredResponse } from '../engine/learning';
import { onDatabaseBlocked, syncProgramHorizon, type ProgramHorizonResult } from '../storage/database';
import { planEndDay, programAnchorDate } from '../engine/programLayout';
import { rankFocusGaps } from '../engine/extraRun';
import { aerobicTrend, progressMoment, type ProgressCelebrated } from '../engine/aerobicTrend';
import { raceBlocks, afterGoalWindows, isRaceGoal } from '../engine/raceBlock';
import { withTargetMinutes } from '../engine/goals';
import { needsWeather, showCompletionQuote, showWeatherSwap } from '../engine/overviewSettings';
import { isMarathonGoal, mainGoal } from '../engine/mainGoal';
import { injuryChangedSince } from '../engine/injuryKind';

interface AppData {
  loading: boolean;
  // Set when local storage can't be opened at all (private mode, blocked
  // storage, a newer version open elsewhere). The app shows why instead of
  // an endless splash.
  bootError: string | null;
  // The step of opening that is running (engine/bootWatch.ts).
  bootStep: BootStep;
  // The migration step that runs (engine/bootWatch.ts#BOOT_MIGRATIONS), or null.
  bootMigration: string | null;
  program: Program | null;
  templates: SessionTemplate[];
  plannedSessions: PlannedSession[];
  sessionLogs: SessionLog[];
  trainingGoals: TrainingGoal[];
  goalMilestones: GoalMilestone[];
  goalMilestoneProgress: GoalMilestoneProgress[];
  injuryNotes: InjuryNote[];
  capabilityEvidence: CapabilityEvidence[];
  // Read-only for now — Phase 4 (Feasibility/Goal Focus/Goal Arbiter) is the
  // first consumer; no Settings UI to edit guardrails/availability exists
  // yet, so this always reflects DEFAULT_GOAL_ENGINE_CONFIG until one does.
  goalEngineConfig: GoalEngineConfig;
  settings: AppSettings;
  // The forecast for your place (Weer, state/useWeather.ts).
  weather: WeatherView;
  stretchCompletion: StretchCompletion;
  templateById: Map<string, SessionTemplate>;
  goalOverviews: GoalOverview[];
  refresh: () => Promise<void>;
  sessionsForWeek: (weekStartDate: string) => PlannedSession[];
  // Resolves false when nothing was stored: the save failed (storageNotice
  // says why) or this planned session already has a log (a double tap).
  // `batch`: no moment after Gedaan for this one yet; it goes into the list the
  // caller owns, and the caller then calls announceSaved(batch) once, so they
  // get one summary instead of one screen each (MacroFactor "Alles opslaan").
  // Each caller has its own list: what one saves is never announced by another.
  logSession: (input: LogSessionInput, opts?: { batch?: SavedMoment[] }) => Promise<boolean>;
  announceSaved: (batch: SavedMoment[]) => void;
  // A write to local storage failed (storage full, blocked). Shown as a
  // banner so a failed save is never silent.
  storageNotice: string | null;
  reportStorageError: (err: unknown) => void;
  dismissStorageNotice: () => void;
  undoLog: (logId: string) => Promise<void>;
  // "Hoe ging het?" on a training that was ticked off by itself: adds the RPE,
  // the feel and any pain to that log, nothing else (engine/autoTick.ts).
  setLogFeedback: (logId: string, patch: FeedbackPatch) => Promise<void>;
  // "Garmin is leidend": typed-in trainings take over the watch's numbers, with
  // a notice and "Ongedaan maken" (engine/watchAlign.ts). Resolves to how many
  // were changed. And the other way: the hand-made numbers back.
  alignWithWatch: (requests: AlignRequest[]) => Promise<number>;
  restoreFromWatch: (logIds: string[]) => Promise<number>;
  // "Inkorten": a watch activity cut at the end and/or the beginning (the series
  // come from the sheet, in memory), and "Inkorten ongedaan maken". Both
  // resolve to whether anything was written; the week check and the counters
  // read the new numbers through the usual refresh (engine/trimLog.ts).
  trimWatchActivity: (logId: string, streams: StreamSet, startSec: number, endSec: number) => Promise<boolean>;
  undoTrimWatchActivity: (logId: string) => Promise<boolean>;
  // "Correcties uit intervals.icu overnemen" (engine/sourceCorrection.ts): the old
  // numbers of an updated log come back, or the numbers of intervals.icu replace the
  // cut of a log that was cut here. Both resolve to whether anything was written.
  restoreSourceUpdate: (logId: string) => Promise<boolean>;
  takeOverSourceNumbers: (logId: string) => Promise<boolean>;
  // "MacroFactor is leidend voor kracht": existing strength logs take over the
  // numbers of the file; the moments go into the caller's batch, which the
  // caller announces once. restoreFromMacroFactor puts the old numbers back.
  takeOverFromMacroFactor: (requests: TakeoverRequest[], batch: SavedMoment[]) => Promise<number>;
  restoreFromMacroFactor: (logIds: string[]) => Promise<number>;
  // Fill in or correct what the hard part was, afterwards. Only this
  // field; what was logged otherwise stays as it was.
  setLogWorkout: (logId: string, workout: SessionLog['workout']) => Promise<void>;
  // Train through (or restore) a rest week, or let a week carry last week's
  // load (or take that back): a proposal first (storage/weekLoadPlan.ts),
  // stored with applyHorizonPlan after Akkoord. Throws the sentence of the
  // card when there is nothing left to change.
  planWeekLoadChange: (kind: WeekLoadKind, weekStart: string, on: boolean) => Promise<HorizonPlan>;
  moveSession: (sessionId: string, targetDate: string) => ScheduleProposal;
  // One-tap move: the best few days for this session (engine/moveSuggestions.ts).
  suggestMoves: (sessionId: string) => MoveSuggestion[];
  applyProposal: (proposal: ScheduleProposal) => Promise<void>;
  // Phase 5: folded into the same proposal-confirm pattern moveSession
  // already uses (Technical Architecture v0.3.1 REVISED,
  // "skipSession folded into the same pattern") — a skip is never applied
  // silently, matching SYSTEM_INVARIANTS' confirmation_horizon_respected.
  // applyProposal (below) recognizes the same-date shape proposeSkipEngine
  // produces and calls the skip mutator instead of a move.
  proposeSkip: (sessionId: string) => ScheduleProposal;
  // "Toch doen": a skipped training back on its own day (engine/scheduler.ts#proposeBackOnPlan).
  proposeBackOnPlan: (sessionId: string) => ScheduleProposal;
  clearMilestoneManually: (goalId: string, milestoneId: string) => Promise<void>;
  // Afstand en rugzak van het doel. Een andere datum gaat via planGoalChange (een voorstel).
  updateGoal: (goalId: string, patch: { targetDistanceKm?: number; packWeightKg?: number }) => Promise<void>;
  // Een andere doeldatum of het doel archiveren: eerst het voorstel met wat er
  // in je planning verandert (storage/horizonPlan.ts); opgeslagen pas met
  // applyHorizonPlan, na Akkoord. `targetDate: null` zet het doel op pauze.
  planGoalChange: (goalId: string, change: { targetDate?: string | null; archive?: boolean }) => Promise<HorizonPlan | null>;
  // Elke verandering van een doel of planningsinstelling die de planningsronde
  // anders laat lopen: het voorstel, en het toepassen na Akkoord (met ongedaan
  // maken). 'stale': de planning veranderde intussen, er is niets gebeurd.
  // 'failed': het lukte niet en alles staat weer zoals het was. 'pending': het
  // loopt nog; de melding komt zodra het klaar is. 'partial': half gelukt en
  // terugzetten lukte niet; de melding toont wat veranderde, met ongedaan maken.
  planHorizonChange: (input: HorizonChangeInput) => Promise<HorizonPlan>;
  // `onLate`: when the result is 'pending', called once the late run is done
  // with how it ended, so an advice that waits on it can be answered then.
  applyHorizonPlan: (plan: HorizonPlan, options?: { onLate?: (status: HorizonApplyStatus) => void }) => Promise<HorizonApplyStatus>;
  // Tussendoel or only followed (engine/raceBlock.ts): a proposal first,
  // stored with applyHorizonPlan after Akkoord.
  planGoalRole: (goalId: string, role: 'secondary' | 'track') => Promise<HorizonPlan | null>;
  // Het label van een doel (Top, Voortop, Verkenning) als voorstel, eventueel met de nieuwe
  // volgorde van de doelen erbij (ronde 2c). Opgeslagen met applyHorizonPlan, na Akkoord; de
  // botsingen met andere doelen staan in HorizonPlan.conflicts.
  planGoalPriority: (goalId: string, priority: GoalPriority, orderIds?: string[]) => Promise<HorizonPlan | null>;
  // De volgorde van de doelen in de lijst, zonder voorstel: alleen voor een verplaatsing die de
  // planning niet raakt. Geeft wat er stond terug, voor ongedaan maken.
  setGoalOrder: (patch: { id: string; order: number | undefined }[]) => Promise<{ id: string; order: number | undefined }[]>;
  // Soft-delete: sets status:'archived' rather than removing the row, so
  // GoalMilestoneProgress/PlanChangeProposal rows that still reference this
  // goalId stay valid (models/goals.ts's GoalStatus already has 'archived'
  // for exactly this). computeActiveGoalOverviews/goalOverview.ts already
  // filters to status:'active', so an archived goal drops out of DOELFOCUS
  // for free — callers only need to also stop finding it by other means
  // (Ascend.tsx's own goal/marathonGoal lookups).
  archiveGoal: (goalId: string) => Promise<void>;
  // The other half of the soft-delete above: archiving used to be a one-way
  // door in the UI (no un-archive path existed at all) — for GR5 specifically
  // that meant losing the Ascent Ladder for good, since goalMilestones are
  // pinned to the original goalId ('obj_gr5') and "+ NIEUW DOEL" mints a
  // fresh id that can never re-link to them. Restores to 'paused' (never
  // straight back to 'active' — targetDate was cleared on archive, and the
  // TrainingGoal union requires one for 'active'), so the goal reappears on
  // its dedicated card/in the custom-goals list, ready to be given a date
  // again.
  unarchiveGoal: (goalId: string) => Promise<void>;
  // Phase 7 — the single-transaction activation flow (engine/goalActivation.ts,
  // review point 11) applied for real, for both a brand-new goal draft and
  // an edit to an existing one: persists the goal, applies its
  // committed-range changes, and records the append-only audit row — never
  // a silent re-analysis against whatever the plan was actually shown
  // against (inputStateHash re-checked here, live, right before persisting).
  // Changes the planning: without `horizon` it first returns the proposal
  // (reason 'review'), and only with the horizon plan you agreed to it stores.
  // Never throws: a planning that does not answer is reason 'failed', one that
  // is still running after the queue's minute is 'pending'.
  activateGoal: (plan: GoalActivationPlan, horizon?: HorizonPlan) => Promise<GoalActivationResult>;
  updateSettings: (patch: Partial<AppSettings>) => Promise<AppSettings>;
  // Time-budget scheduling redesign (Fase 4) — the Settings UI's only write
  // path onto TrainingAvailability/TrainingStrategyProfile. A top-level
  // patch key (e.g. `availability`) replaces that whole sub-object
  // (GoalEngineConfigRepo.set's own shallow-merge contract), so a caller
  // that only means to change one weekday's DailyTimeBudget must spread the
  // existing `goalEngineConfig.availability` itself first — never a deep
  // merge here, to keep this function's behavior identical to every other
  // patch-shaped update* function in this file.
  updateGoalEngineConfig: (patch: Partial<GoalEngineConfig>) => Promise<GoalEngineConfig>;
  // Keeps the migrated Marathon TrainingGoal row (storage/goalMigration.ts#
  // buildMarathonGoal, called once at migration time only) in sync with
  // AppSettings' own marathon fields — without this, any edit made after
  // that first migration would leave every goal-engine consumer (Goal
  // Focus, Feasibility, the Adaptive Replanner's activeGoalDemandKeys, this
  // phase's own Plan Preview) silently reading a stale requirements/
  // targetDate forever, never the value actually shown on MarathonGoalCard.
  // Another date or race type changes the planning: a proposal first, stored
  // with applyHorizonPlan after Akkoord (Warden Planning punt 6).
  planMarathonGoal: (patch: MarathonGoalPatch) => Promise<HorizonPlan | null>;
  toggleStretchRoutine: (kind: keyof StretchCompletion) => Promise<void>;
  addInjury: (input: Omit<InjuryNote, 'id'>) => Promise<void>;
  resolveInjury: (id: string) => Promise<void>;
  deleteInjury: (id: string) => Promise<void>;
  addManualCapabilityEvidence: (input: Omit<CapabilityEvidence, 'id' | 'evidenceType' | 'source'>) => Promise<void>;
  deleteCapabilityEvidence: (id: string) => Promise<void>;
  proposeNoTimeToday: () => ScheduleProposal[];
  applyNoTimeToday: (proposals: ScheduleProposal[]) => Promise<void>;
  // 'saved': written to a file the user picked; 'downloaded': handed to
  // the browser's download (can't be confirmed); null: cancelled.
  exportData: () => Promise<'saved' | 'downloaded' | null>;
  resetDemoData: () => Promise<void>;
  // Settings' SCHEMA OPNIEUW LADEN — regenerates the future weekly schedule
  // back to the standard rotation. Deliberately NOT resetDemoData: this
  // never touches sessionLogs/injuryNotes/capabilityEvidence/trainingGoals
  // (storage/database.ts#resetScheduleToDefault's own comment has the full
  // reasoning — production bug: the old wiring silently wiped all of that).
  resetSchedule: (startFrom: 'this_week' | 'next_week') => Promise<void>;
  // Moves week 1 of the program to this or next week, keeping the
  // planning and history as they are (storage/database.ts).
  // mode 'clean': week 1 moves AND the planning from there is rebuilt,
  // with sports on/off and the active strength block applied; returns a
  // short summary of what happened. 'count_only': only the week count moves.
  restartProgram: (startFrom: 'this_week' | 'next_week', mode: 'clean' | 'count_only') => Promise<string>;
  // "Reset alles / nieuwe aanbevelingen" (production feedback: the strength
  // review and the forecast replan both only ever run once at app boot —
  // there was no way to ask ASCEND to look again after changing something
  // (availability, a goal) without force-quitting and reopening the app).
  // Re-evaluates both live, on demand — never fabricates a recommendation
  // when nothing actually warrants one, same honesty standard as every
  // other engine here.
  rebuildRecommendations: () => Promise<void>;
  celebration: CelebrationEvent | null;
  dismissCelebration: () => void;
  // Phase 6 — the live Adaptive Replanner for the forecast range (week +2
  // onward). Runs once at boot (never on every refresh — each run writes
  // fresh TrainingPrescription rows, so re-running constantly would just
  // accumulate churn for no new information) and exposes a one-line
  // passive summary — never a popup — the caller can show and dismiss.
  forecastSummary: string | null;
  // Fase 2 feedback pattern (engine/changeImpact.ts): apply a proposal,
  // remember what it touched, and let the user undo it right after.
  recentChange: RecentPlanChange | null;
  commitPlanChange: (proposal: PlanChangeProposal, title: string, restore?: UndoRestore) => Promise<boolean>;
  undoRecentChange: () => Promise<void>;
  // Ziek melden / weer beter (engine/illness.ts): one tap each.
  // "Wat speelde er" (engine/influence.ts): your own notes next to the history. Each call
  // saves at once and reads the stored list first, so quick taps never overwrite each other.
  saveInfluence: (target: NoteTarget, change: (entry: InfluenceEntry) => InfluenceEntry) => Promise<void>;
  // Your weighing for sweat loss, one per training (settings.sweatEntries); a weighing without
  // numbers is removed.
  saveSweat: (entry: SweatEntry | { logId: string; remove: true }) => Promise<void>;
  // Your weight from before a training, kept until its log is there (settings.sweatPre, one per
  // day); null takes it away.
  saveSweatPre: (date: string, weightKg: number | null) => Promise<void>;
  removeInfluence: (id: string) => Promise<void>;
  clearInfluences: () => Promise<void>;
  planIllness: (change: IllnessChange) => IllnessPlan | undefined;
  applyIllness: (plan: IllnessPlan) => Promise<void>;
  dismissRecentChange: () => void;
  // Fase 3: advice engine (engine/adviceEngine.ts) + change log.
  planChangeLog: PlanChangeProposal[];
  advice: Advice[];
  // "Wat speelde er": the proposal to move a test after what you noted (engine/influenceProposal.ts).
  // Not part of `advice`: Vandaag shows it as its own quiet card. Answered through respondToAdvice.
  influenceMove: InfluenceMove | undefined;
  // Advice you already answered (Akkoord or Liever niet): not shown again.
  answeredAdviceIds: Set<string>;
  // The rest of the planning run over a proposed week, for its preview. With
  // `leave`: as if those were your periods (a period you have not agreed to yet).
  planPreviewPass: (sessions: PlannedSession[], leave?: LeavePeriod[], restDay?: number) => PlannedSession[];
  // What is wrong in a week and the proposal for it (engine/weekFixProposal.ts), for the card on Week.
  // The concerns of a week at once; the proposals only when asked for (weekFixesFor, may take a few hundred ms).
  weekNoticeFor: (weekStart: string) => WeekNotice;
  weekFixesFor: (weekStart: string) => WeekNotice;
  // Rustdag: changing it is a proposal (engine/restDayProposal.ts); applyRestDay
  // stores the rest day and the planning together, only on Akkoord.
  planRestDay: (restDay: number) => RestDayPlan;
  applyRestDay: (plan: RestDayPlan) => Promise<void>;
  // Vrije dagen, vakanties en tochten (engine/leave.ts). Adding or removing
  // one is a proposal: planLeave computes it, applyLeave stores the period
  // and applies the proposal, only after Akkoord.
  leavePeriods: LeavePeriod[];
  planLeave: (mode: 'add' | 'remove', period: LeavePeriod, replaces?: LeavePeriod) => LeavePlan;
  applyLeave: (plan: LeavePlan) => Promise<void>;
  respondToAdvice: (advice: Advice, response: 'accepted' | 'declined') => Promise<void>;
  debriefLogId: string | null;
  dismissDebrief: () => void;
  dismissForecastSummary: () => void;
  // Phase 8 — Strength Program Strategy (Addendum v0.1). ASCEND owns block
  // strategy/frequency/split/placement; MacroFactor Workouts (or a future
  // provider) keeps owning exercise-level content — see
  // models/strengthProgram.ts and engine/strengthScheduling.ts.
  strengthProgramStrategies: StrengthProgramStrategy[];
  // Strength sets/reps live in MacroFactor (or another app): one-tap tick-off.
  strengthExternal: boolean;
  setStrengthExternal: (external: boolean) => Promise<void>;
  // The one currently-unresolved suggestion, if any (§5: "a review is a
  // suggestion, not an automatic rewrite") — never more than one at a time,
  // matching forecastSummary's own "single pending thing to show" shape.
  strengthRecommendation: StrengthProgramRecommendation | null;
  // Single-transaction activation (mirrors activateGoal): persists the
  // strategy (retiring any previous active/ending one to 'completed'),
  // recomputes and applies the forecast-range placement fresh against
  // live data, and records the append-only audit proposal.
  activateStrengthProgram: (strategy: StrengthProgramStrategy) => Promise<void>;
  // The explicit "apply it sooner" opt-in (Strength Program Strategy
  // Addendum §3's confirmation-horizon rule stays the default — this is
  // only ever called from a dedicated, separately-confirmed step in the
  // wizard, never automatically alongside activateStrengthProgram above).
  // Returns false when the freshly-recomputed committed-range plan turned
  // out to contain nothing applicable (structurally unsupported items) —
  // the caller should treat that as "nothing happened", not a silent success.
  applyStrengthPlacementToCommittedRange: (strategy: StrengthProgramStrategy) => Promise<boolean>;
  // engine/scheduleAnomalies.ts's confirm/dismiss flow. Applies the fix
  // currently proposable (recomputed fresh, see the function's own
  // comment); false means there was nothing left to fix.
  applyScheduleAnomalyFix: () => Promise<boolean>;
  // §5/§7's manual "Mijn schema is afgelopen" trigger — computes and shows
  // a recommendation immediately, never waiting for the next boot check.
  reportStrengthSchemaEnded: () => Promise<void>;
  resolveStrengthRecommendation: (id: string, resolution: 'accepted' | 'dismissed') => Promise<void>;
}

export interface LogSessionInput {
  plannedSessionId?: string;
  templateId: string;
  type: SessionLog['type'];
  sport?: SessionLog['sport'];
  variant: SessionVariant;
  durationMinutes: number;
  rpe?: number;
  notes?: string;
  strengthData?: SessionLog['strengthData'];
  cardioData?: SessionLog['cardioData'];
  outdoorData?: SessionLog['outdoorData'];
  subjectiveFeel?: SessionLog['subjectiveFeel'];
  painAreas?: SessionLog['painAreas'];
  painReports?: SessionLog['painReports'];
  workout?: SessionLog['workout'];
  strengthRir?: SessionLog['strengthRir'];
  gymProfileId?: SessionLog['gymProfileId'];
  legsAtStart?: SessionLog['legsAtStart'];
  // The day it was actually done. Defaults to today; logging a missed
  // session afterwards can pass its own date.
  completedDate?: string;
  // An activity imported from a watch (engine/activityImport.ts): where it
  // came from, its id there, and when it ended. Absent on manual logs.
  source?: SessionLog['source'];
  externalId?: string;
  sourceSync?: SessionLog['sourceSync'];
  completedAt?: string;
  // Ticked off by itself (components/WatchActivityCard.tsx): no chime, no
  // completion moment and no debrief for something the user did not just do.
  // A milestone it clears is still celebrated.
  quiet?: boolean;
}

// What undo must put back besides the planning itself.
export interface UndoRestore {
  settings?: Partial<AppSettings>;
  config?: Partial<GoalEngineConfig>;
}

const AppDataContext = createContext<AppData | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [bootError, setBootError] = useState<string | null>(null);
  // Which step of opening is running, for the watch on the opening screen (App.tsx).
  const [bootStep, setBootStep] = useState<BootStep>('migraties');
  const [bootMigration, setBootMigration] = useState<string | null>(currentBootMigration);
  useEffect(() => {
    bootMigrationListeners.add(setBootMigration);
    return () => void bootMigrationListeners.delete(setBootMigration);
  }, []);
  const [program, setProgram] = useState<Program | null>(null);
  // The templates as stored; `templates` below is what the app shows (a
  // strength program from MacroFactor fills the strength templates).
  const [storedTemplates, setTemplates] = useState<SessionTemplate[]>([]);
  const [plannedSessions, setPlannedSessions] = useState<PlannedSession[]>([]);
  const [sessionLogs, setSessionLogs] = useState<SessionLog[]>([]);
  const [trainingGoals, setTrainingGoals] = useState<TrainingGoal[]>([]);
  const [goalMilestones, setGoalMilestones] = useState<GoalMilestone[]>([]);
  const [goalMilestoneProgress, setGoalMilestoneProgress] = useState<GoalMilestoneProgress[]>([]);
  const [injuryNotes, setInjuryNotes] = useState<InjuryNote[]>([]);
  const [capabilityEvidence, setCapabilityEvidence] = useState<CapabilityEvidence[]>([]);
  const [goalEngineConfig, setGoalEngineConfig] = useState<GoalEngineConfig>(DEFAULT_GOAL_ENGINE_CONFIG);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const strengthProgram = settings.strengthModel?.program;
  const templates = useMemo(() => withProgramExercises(storedTemplates, strengthProgram, todayISO()), [storedTemplates, strengthProgram]);
  const [stretchCompletion, setStretchCompletion] = useState<StretchCompletion>({});
  const [celebration, setCelebration] = useState<CelebrationEvent | null>(null);
  const [forecastSummary, setForecastSummary] = useState<string | null>(null);
  const [recentChange, setRecentChange] = useState<RecentPlanChange | null>(null);
  const [planChangeLog, setPlanChangeLog] = useState<PlanChangeProposal[]>([]);
  const [adviceResponses, setAdviceResponses] = useState<Record<string, AdviceResponse>>({});
  const [debriefLogId, setDebriefLogId] = useState<string | null>(null);
  const [storageNotice, setStorageNotice] = useState<string | null>(null);
  // Planned sessions with a log being written right now: a second tap
  // before the first write lands must not create a second log.
  const loggingInFlight = useRef(new Set<string>());
  const reportStorageError = useCallback((err: unknown) => {
    setStorageNotice(describeWriteError(err));
  }, []);
  const [plannerAdvice, setPlannerAdvice] = useState<Advice | null>(null);
  const [strengthProgramStrategies, setStrengthProgramStrategies] = useState<StrengthProgramStrategy[]>([]);
  const [strengthRecommendation, setStrengthRecommendation] = useState<StrengthProgramRecommendation | null>(null);

  // Every write ends in refresh(); telling other open ASCEND windows to
  // reload from storage keeps a stale window from writing back old state
  // over a change made elsewhere.
  // Reads everything from storage and shows it. No planning sync here.
  const loadState = useCallback(async () => {
    const [programs, tpls, planned, storedLogs, goals, milestones, progress, injuries, manualEvidence, engineConfig, loadedSettings, loadedStretchCompletion, strengthStrategies, strengthRecs, proposals, responses] = await Promise.all([
      ProgramsRepo.getAll(),
      SessionTemplatesRepo.getAll(),
      PlannedSessionsRepo.getAll(),
      SessionLogsRepo.getAll(),
      TrainingGoalsRepo.getAll(),
      GoalMilestonesRepo.getAll(),
      GoalMilestoneProgressRepo.getAll(),
      InjuryNotesRepo.getAll(),
      CapabilityEvidenceRepo.getAll(),
      GoalEngineConfigRepo.get(),
      SettingsRepo.get(),
      StretchCompletionRepo.get(),
      StrengthProgramStrategiesRepo.getAll(),
      StrengthProgramRecommendationsRepo.getAll(),
      PlanChangeProposalsRepo.getAll(),
      MetaRepo.get<Record<string, AdviceResponse>>('adviceResponses'),
    ]);
    // A strength workout that stayed open for days reads as its estimate (engine/logDuration.ts).
    const logs = withPlausibleDurations(storedLogs, tpls);
    setProgram(programs[0] ?? null);
    setPlanChangeLog(proposals);
    setAdviceResponses(responses ?? {});
    setTemplates(tpls);
    setPlannedSessions(planned);
    setSessionLogs(logs);
    setTrainingGoals(goals);
    setGoalMilestones(milestones);
    setGoalMilestoneProgress(progress);
    setInjuryNotes(injuries);
    setCapabilityEvidence(manualEvidence);
    setGoalEngineConfig(engineConfig);
    setPlanningRegisters(programs[0] ?? null, tpls, planned, logs, loadedSettings, goals);
    setSettings(loadedSettings);
    setStretchCompletion(loadedStretchCompletion);
    setStrengthProgramStrategies(strengthStrategies);
    setStrengthRecommendation(strengthRecs.find((r) => !r.resolvedAt) ?? null);
    // The week check put something right: say what, with undo.
    const repaired = pendingRepairs;
    pendingRepairs = undefined;
    // Not on a fresh install: there is nothing of yours to put right yet.
    if (repaired && logs.length > 0) {
      const id = makeId('plancheck');
      const why = 'Na elke wijziging controleert ASCEND je weken op vaste regels: je rustdag vrij, niet te veel op een dag, genoeg ruimte tussen zware dagen, frisse benen voor een test. Wat het systeem zelf plande, zet het dan recht. Wat jij zelf zette en je test of wedstrijd verschuift het nooit; daarvoor krijg je een voorstel.';
      const now = new Date().toISOString();
      await PlanChangeProposalsRepo.put({ id, trigger: 'plan_check', issue: 'Weekcontrole', changes: [], alternatives: [], consequences: repaired.lines.join('; '), explanation: why, createdAt: now, resolvedAt: now, resolution: 'accepted' });
      setRecentChange((prev) => {
        // Right after a change of yours (a move, an Akkoord): the repairs
        // join that notice, so its undo still works and puts everything
        // back as it was before your change.
        if (prev && prev.trigger !== 'plan_check' && Date.now() - Date.parse(prev.createdAt) < 15_000) {
          const known = new Set(prev.before.map((s) => s.id));
          return { ...prev, lines: [...prev.lines, ...repaired.lines], before: [...prev.before, ...repaired.stored.filter((s) => !known.has(s.id))], addedIds: [...prev.addedIds, ...(repaired.addedIds ?? [])] };
        }
        return { id, trigger: 'plan_check', title: 'Planning bijgewerkt', lines: repaired.lines, why, before: repaired.before, addedIds: repaired.addedIds ?? [], createdAt: now };
      });
    }
  }, []);

  // What you change shows at once; the planning sync runs after it, in its own
  // queue, and what it changed is read once more. A sync that hangs can never
  // keep the screen from showing your change.
  const refresh = useCallback(async (fromOtherWindow = false) => {
    await loadState();
    if (fromOtherWindow) return;
    syncChannel?.postMessage('changed');
    if (await syncProgramHorizonWhenChanged(primePlanningRegisters)) {
      await loadState();
      syncChannel?.postMessage('changed');
    }
  }, [loadState]);

  useEffect(() => {
    if (!syncChannel) return;
    const onMessage = () => void refresh(true);
    syncChannel.addEventListener('message', onMessage);
    return () => syncChannel.removeEventListener('message', onMessage);
  }, [refresh]);

  // `afterWrites`: runs once the plan rows are stored and before the planning
  // run, for a setting that goes with this layout (the rest day).
  const commitPlanChange = useCallback(async (proposal: PlanChangeProposal, title: string, restore?: UndoRestore, afterWrites?: () => Promise<void>): Promise<boolean> => {
    const real = proposal.changes.filter((c) => c.action !== 'keep');
    if (real.length === 0) return false;
    await planSettled();
    const [planned, tpls] = await Promise.all([PlannedSessionsRepo.getAll(), SessionTemplatesRepo.getAll()]);
    // What you agreed to stays as you saw it: the moved, added and shown
    // sessions are locked against the automatic planning.
    const { sessions: updatedSessions, unsupported } = applyPlanChangeItems(proposal.changes, planned, undefined, { by: 'proposal', proposalId: proposal.id, at: new Date().toISOString() });
    if (unsupported.length > 0) {
      console.error('commitPlanChange: refusing to apply, unsupported plan change items present', unsupported);
      return false;
    }
    const touchedIds = new Set(proposal.changes.map((c) => c.plannedSessionId).filter((id): id is string => Boolean(id)));
    const originalIds = new Set(planned.map((s) => s.id));
    const addedIds: string[] = [];
    for (const session of updatedSessions) {
      if (!originalIds.has(session.id)) addedIds.push(session.id);
      if (touchedIds.has(session.id) || !originalIds.has(session.id)) await PlannedSessionsRepo.put(session);
    }
    // A tochtdag that goes with its tocht leaves the plan (item.discard); undo
    // puts it back from `before`, like every other touched row.
    const remaining = new Set(updatedSessions.map((s) => s.id));
    for (const s of planned) if (touchedIds.has(s.id) && !remaining.has(s.id)) await PlannedSessionsRepo.delete(s.id);
    await PlanChangeProposalsRepo.put({ ...proposal, resolvedAt: new Date().toISOString(), resolution: 'accepted' });
    setRecentChange({
      id: proposal.id,
      trigger: proposal.trigger,
      title,
      lines: describeChanges(proposal.changes, planned, tpls),
      why: proposal.consequences,
      before: planned.filter((s) => touchedIds.has(s.id)),
      addedIds,
      settingsBefore: restore?.settings,
      configBefore: restore?.config,
      createdAt: new Date().toISOString(),
    });
    await afterWrites?.();
    planRevision++;
    await refresh();
    // The intervals.icu agenda follows the move now, not at the next opening;
    // in the background, and nothing happens while the switch is off.
    void syncWatchWorkoutsAfterPlanChange();
    return true;
  }, [refresh]);

  const respondToAdvice = useCallback(async (item: Advice, response: 'accepted' | 'declined') => {
    if (response === 'accepted' && item.proposal && (await commitPlanChange(item.proposal, item.title))) {
      setRecentChange((prev) => (prev && prev.id === item.proposal!.id ? { ...prev, adviceId: item.id } : prev));
    }
    // Training through a rest week (REST-WEEK-SKIP) and "Deze week nog een
    // keer" (REPEAT-WEEK) change the program through their own proposal with
    // Akkoord (planWeekLoadChange, components/AdviceWeekLoad); this only records
    // the answer, and undo of that notice brings the advice back.
    if (response === 'accepted' && (item.restWeekSkip || item.repeatWeek)) {
      setRecentChange((prev) => (prev && prev.trigger === 'week_load_changed' ? { ...prev, adviceId: item.id } : prev));
    }
    // A goal setting (rule GR5-PACK-TENT): only ever on Akkoord.
    if (response === 'accepted' && item.goalChange) {
      const goal = (await TrainingGoalsRepo.getAll()).find((g) => g.id === item.goalChange!.goalId);
      if (goal) {
        await TrainingGoalsRepo.put(withPackWeight(goal, item.goalChange.packWeightKg));
        await refresh();
      }
    }
    // A goal time proposal changes the goal, and only on Akkoord.
    if (response === 'accepted' && item.goalTargetTime) {
      const goal = (await TrainingGoalsRepo.getAll()).find((g) => g.id === item.goalTargetTime!.goalId);
      if (goal) {
        await TrainingGoalsRepo.put(withTargetMinutes(goal, item.goalTargetTime.minutes, new Date().toISOString()));
        await refresh();
      }
    }
    const current = (await MetaRepo.get<Record<string, AdviceResponse>>('adviceResponses')) ?? {};
    const next = { ...current, [item.id]: { response, at: new Date().toISOString(), ruleId: item.ruleId } };
    await MetaRepo.set('adviceResponses', next);
    setAdviceResponses(next);
  }, [commitPlanChange, refresh]);

  const undoRecentChange = useCallback(async () => {
    if (!recentChange) return;
    await planSettled();
    // Numbers of the watch taken over by typed-in trainings: the hand-made ones
    // come back first. When that was all the change did, that is the undo.
    if (recentChange.alignedLogIds?.length) {
      await restoreAlignments(recentChange.alignedLogIds);
      if (recentChange.before.length === 0 && recentChange.addedIds.length === 0) {
        setRecentChange(null);
        planRevision++;
        await refresh();
        return;
      }
    }
    // Settings, config, goals and rows back as they were (storage/undoPlanChange.ts).
    const undone = await undoPlanChangeNow(recentChange);
    if (undone.settings) setSettings(undone.settings);
    if (undone.config) setGoalEngineConfig(undone.config);
    if (undone.responses) setAdviceResponses(undone.responses);
    setRecentChange(null);
    await refresh();
    void syncWatchWorkoutsAfterPlanChange();
  }, [recentChange, refresh]);

  // Phase 6 — the live Adaptive Replanner for the forecast range. Reads
  // directly from the repos rather than React state, since this runs
  // once at boot right after refresh() — before that state necessarily
  // reflects the fetch it just did. Deliberately only ever called once per
  // app load (see the boot effect below). Weekly Prescription Builder
  // architecture pass, Fase 6: this now ONLY runs the availability
  // cascade (move/skip a session off a now-unavailable day) — the former
  // progression-driven replace/reduce pass moved to
  // engine/weeklyPrescriptionEngine.ts, which also actually supplies
  // candidate numbers to the specialists (see runWeeklyPrescriptionBuild).
  const runForecastReplan = useCallback(async () => {
    const [goals, planned, tpls, engineConfig] = await Promise.all([
      TrainingGoalsRepo.getAll(),
      PlannedSessionsRepo.getAll(),
      SessionTemplatesRepo.getAll(),
      GoalEngineConfigRepo.get(),
    ]);

    const keys = activeGoalDemandKeys(goals);
    if (keys.length === 0) return; // no active goal's demand to adapt the forecast around

    const asOf = todayISO();

    const { proposal, passiveSummary } = computeForecastReplan({
      plannedSessions: planned,
      templates: tpls,
      availability: engineConfig.availability,
      asOf,
    });

    if (proposal.changes.length === 0) return;

    const { sessions: updatedSessions, unsupported } = applyPlanChangeItems(proposal.changes, planned);
    if (unsupported.length > 0) {
      // Never an unintended partial apply: if any item in this batch can't
      // be honored, nothing from this run is persisted — no sessions, no
      // prescriptions, no audit record, no passive summary claiming
      // success. Structurally shouldn't happen from this module's own
      // output (see engine/adaptiveReplanner.ts, which never emits a
      // malformed or unpaired item) — this is the safety net for if it
      // ever does, not the expected path. The next boot recomputes fresh
      // against then-current data rather than retrying this exact batch.
      console.error('Adaptive Replanner: refusing to apply, unsupported plan change items present', unsupported);
      return;
    }

    const touchedIds = new Set(proposal.changes.map((c) => c.plannedSessionId).filter((id): id is string => Boolean(id)));
    const originalIds = new Set(planned.map((s) => s.id));
    for (const session of updatedSessions) {
      if (touchedIds.has(session.id) || !originalIds.has(session.id)) {
        await PlannedSessionsRepo.put(session);
      }
    }

    // Append-only audit trail (Storage plan: "audit trail of shown
    // proposals + resolution") — resolvedAt/resolution set immediately
    // since the forecast range auto-applies, never user-confirmed.
    await PlanChangeProposalsRepo.put({ ...proposal, resolvedAt: new Date().toISOString(), resolution: 'accepted' });

    setForecastSummary(passiveSummary);
    await refresh();
  }, [refresh]);

  // Weekly Prescription Builder architecture pass, Fase 7 — decides WAT
  // each forecast week should contain (engine/weeklyPrescriptionEngine.ts);
  // engine/candidatePlacement.ts (Groep C, via reconcileWeekComposition)
  // still decides WAAR, unchanged. Reads repos directly for the same
  // reason runForecastReplan does — fires right after refresh(), before
  // React state necessarily reflects that fetch. No active goal, or no
  // forecast weeks yet scheduled → no-op, same precedent as
  // runForecastReplan's own activeGoalDemandKeys gate.
  const runWeeklyPrescriptionBuild = useCallback(async () => {
    // Reading, computing, comparing with what is stored and writing only the
    // difference lives in storage/weeklyPrescriptionStep.ts (testable without
    // React). Nothing changed -> nothing written, no notice, no log line.
    const outcome = await runWeeklyPrescriptionStep();

    if (outcome.kind === 'ask') {
      const { proposal, realChanges, planned, templates: tpls } = outcome;
      const signature = realChanges.map((c) => `${c.action}:${c.plannedSessionId ?? c.newSessionDraft?.templateId}:${c.toDate ?? c.newSessionDraft?.scheduledDate ?? ''}`).sort().join('|');
      setPlannerAdvice({
        id: `planner:${simpleHash(signature)}`,
        trigger: 'plan_update',
        ruleId: 'WEEKLY-PRESCRIPTION',
        title: 'Weekplanning voor de komende weken',
        effect: `${realChanges.length} ${realChanges.length === 1 ? 'wijziging' : 'wijzigingen'} vanaf week +2: ${describeChanges(realChanges, planned, tpls).slice(0, 2).join('; ')}${realChanges.length > 2 ? ' …' : ''}`,
        why: `Op basis van je doelen, je trainingen en je herstel van nu bepaalt de weekplanning per week wat erin hoort. ${proposal.explanation}`,
        priority: 2,
        proposal,
      });
      return;
    }

    if (outcome.kind === 'applied') {
      // Fase 3: say what changed (melding), even though it was automatic.
      const { proposal, realChanges, planned, templates: tpls, updatedSessions } = outcome;
      const touched = new Set(realChanges.map((c) => c.plannedSessionId).filter((id): id is string => Boolean(id)));
      const originalIds = new Set(planned.map((s) => s.id));
      setRecentChange({
        id: proposal.id,
        trigger: proposal.trigger,
        title: 'Weekplanning bijgewerkt',
        lines: describeChanges(realChanges, planned, tpls),
        summary: prescriptionSummary(realChanges),
        why: proposal.consequences,
        before: planned.filter((x) => touched.has(x.id)),
        addedIds: updatedSessions.filter((x) => !originalIds.has(x.id)).map((x) => x.id),
        createdAt: new Date().toISOString(),
      });
    }

    if (outcome.wrote) await refresh();
  }, [refresh]);

  // Phase 8 — the single-transaction activation flow for a Strength
  // Program Strategy (mirrors activateGoal): the forecast-range placement
  // is always recomputed fresh, right here, against live data rather than
  // trusting whatever the wizard's Plan Preview showed a moment earlier —
  // simpler than a stale-plan hash check, and correct by construction
  // since there's no intervening step (unlike goal activation's baseline
  // questions) between preview and confirm.
  const activateStrengthProgram = useCallback(
    async (strategy: StrengthProgramStrategy) => {
      const [strategies, planned, tpls, engineConfig, goals, logs, manualEvidence, programs] = await Promise.all([
        StrengthProgramStrategiesRepo.getAll(),
        PlannedSessionsRepo.getAll(),
        SessionTemplatesRepo.getAll(),
        GoalEngineConfigRepo.get(),
        TrainingGoalsRepo.getAll(),
        SessionLogsRepo.getAll(),
        CapabilityEvidenceRepo.getAll(),
        ProgramsRepo.getAll(),
      ]);
      const asOf = todayISO();
      const allEvidence = [...extractEvidenceFromLogs(logs), ...manualEvidence];
      const overviews = computeActiveGoalOverviews(goals, allEvidence, engineConfig.availability, engineConfig.guardrails, asOf);

      const proposal = computeStrengthPlacementPlan(strategy, planned, tpls, engineConfig.availability, asOf, overviews, programs[0] ?? null, engineConfig.strategy.sameDayPairingPreference);
      const { sessions: updatedSessions, unsupported } = applyPlanChangeItems(proposal.changes, planned);
      if (unsupported.length > 0) {
        // Same atomicity guarantee as runForecastReplan: never an
        // unintended partial apply.
        console.error('Strength placement: refusing to apply, unsupported plan change items present', unsupported);
        return;
      }

      // Only one strategy is ever 'active'/'ending' at a time — starting a
      // new block retires the previous one to 'completed' rather than
      // deleting it (§2: "keep historical blocks... instead of only
      // storing one global current setting").
      const previousActive = activeStrengthStrategy(strategies);
      if (previousActive && previousActive.id !== strategy.id) {
        await StrengthProgramStrategiesRepo.put({ ...previousActive, status: 'completed', updatedAt: new Date().toISOString() });
      }
      await StrengthProgramStrategiesRepo.put(strategy);

      const touchedIds = new Set(proposal.changes.map((c) => c.plannedSessionId).filter((id): id is string => Boolean(id)));
      const originalIds = new Set(planned.map((s) => s.id));
      for (const session of updatedSessions) {
        if (touchedIds.has(session.id) || !originalIds.has(session.id)) {
          await PlannedSessionsRepo.put(session);
        }
      }

      await PlanChangeProposalsRepo.put({ ...proposal, resolvedAt: new Date().toISOString(), resolution: 'accepted' });
      await refresh();
    },
    [refresh],
  );

  const applyStrengthPlacementToCommittedRange = useCallback(
    async (strategy: StrengthProgramStrategy): Promise<boolean> => {
      const [planned, tpls, logs, engineConfig, goals, manualEvidence, programs] = await Promise.all([
        PlannedSessionsRepo.getAll(),
        SessionTemplatesRepo.getAll(),
        SessionLogsRepo.getAll(),
        GoalEngineConfigRepo.get(),
        TrainingGoalsRepo.getAll(),
        CapabilityEvidenceRepo.getAll(),
        ProgramsRepo.getAll(),
      ]);
      const asOf = todayISO();
      const allEvidence = [...extractEvidenceFromLogs(logs), ...manualEvidence];
      const overviews = computeActiveGoalOverviews(goals, allEvidence, engineConfig.availability, engineConfig.guardrails, asOf);

      const proposal = computeStrengthPlacementPlanForCommittedRange(strategy, planned, tpls, engineConfig.availability, logs, asOf, overviews, programs[0] ?? null, engineConfig.strategy.sameDayPairingPreference);
      if (proposal.changes.length === 0) return false;

      const { sessions: updatedSessions, unsupported } = applyPlanChangeItems(proposal.changes, planned);
      if (unsupported.length > 0) {
        console.error('Strength placement (committed range): refusing to apply, unsupported plan change items present', unsupported);
        return false;
      }

      const touchedIds = new Set(proposal.changes.map((c) => c.plannedSessionId).filter((id): id is string => Boolean(id)));
      const originalIds = new Set(planned.map((s) => s.id));
      for (const session of updatedSessions) {
        if (touchedIds.has(session.id) || !originalIds.has(session.id)) {
          await PlannedSessionsRepo.put(session);
        }
      }

      await PlanChangeProposalsRepo.put({ ...proposal, resolvedAt: new Date().toISOString(), resolution: 'accepted' });
      await refresh();
      return true;
    },
    [refresh],
  );

  // engine/scheduleAnomalies.ts's fix, applied. Always recomputes fresh
  // against live data right before applying (same reasoning as
  // activateStrengthProgram above) rather than trusting whatever the card
  // last rendered — nothing else to key a staleness check against here,
  // since the detection itself has no id, just current PlannedSessions.
  // Returns false when there's nothing left to fix (e.g. the user already
  // resolved it another way) so the caller never reports a false success.
  const applyScheduleAnomalyFix = useCallback(async (): Promise<boolean> => {
    await planSettled();
    // Your Akkoord on the card: what it moves is yours (storage/scheduleAnomalyFix.ts).
    const fixed = await applyScheduleAnomalyFixNow();
    if (!fixed) return false;
    planRevision++;
    await refresh();
    return true;
  }, [refresh]);

  // §5/§7's manual trigger — computes and persists a recommendation right
  // away rather than waiting for the next boot's review check.
  const reportStrengthSchemaEnded = useCallback(async () => {
    const [strategies, goals, logs, manualEvidence, engineConfig] = await Promise.all([
      StrengthProgramStrategiesRepo.getAll(),
      TrainingGoalsRepo.getAll(),
      SessionLogsRepo.getAll(),
      CapabilityEvidenceRepo.getAll(),
      GoalEngineConfigRepo.get(),
    ]);
    const asOf = todayISO();
    const allEvidence = [...extractEvidenceFromLogs(logs), ...manualEvidence];
    const overviews = computeActiveGoalOverviews(goals, allEvidence, engineConfig.availability, engineConfig.guardrails, asOf);
    const rec = buildStrengthProgramRecommendation({
      currentStrategy: activeStrengthStrategy(strategies),
      triggers: ['user_reported_schema_ended'],
      goalOverviews: overviews,
      asOf,
    });
    await StrengthProgramRecommendationsRepo.put(rec);
    await refresh();
  }, [refresh]);

  const resolveStrengthRecommendation = useCallback(
    async (id: string, resolution: 'accepted' | 'dismissed') => {
      const recs = await StrengthProgramRecommendationsRepo.getAll();
      const rec = recs.find((r) => r.id === id);
      if (!rec) return;
      await StrengthProgramRecommendationsRepo.put({ ...rec, resolvedAt: new Date().toISOString(), resolution });
      await refresh();
    },
    [refresh],
  );

  // Boot-time review check (§5) — only ever surfaces a *suggestion*
  // (never a rewrite), and only when nothing is already pending, so
  // repeated boots never stack duplicate recommendations. Reads repos
  // directly for the same reason runForecastReplan does: this fires right
  // after refresh(), before React state necessarily reflects that fetch.
  const runStrengthReviewCheck = useCallback(async () => {
    const [strategies, existingRecs, goals, logs, manualEvidence, injuries, engineConfig, proposals] = await Promise.all([
      StrengthProgramStrategiesRepo.getAll(),
      StrengthProgramRecommendationsRepo.getAll(),
      TrainingGoalsRepo.getAll(),
      SessionLogsRepo.getAll(),
      CapabilityEvidenceRepo.getAll(),
      InjuryNotesRepo.getAll(),
      GoalEngineConfigRepo.get(),
      PlanChangeProposalsRepo.getAll(),
    ]);

    const currentStrategy = activeStrengthStrategy(strategies);
    if (!currentStrategy) return; // nothing to review yet
    if (existingRecs.some((r) => !r.resolvedAt)) return; // one is already pending

    const asOf = todayISO();
    const allEvidence = [...extractEvidenceFromLogs(logs), ...manualEvidence];
    const overviews = computeActiveGoalOverviews(goals, allEvidence, engineConfig.availability, engineConfig.guardrails, asOf);

    // More than one 48h-spacing cascade in the last 4 weeks is the
    // "repeated lower-body conflicts" signal (§5) — reusing the exact
    // reason text engine/scheduler.ts#proposeMove already stamps onto its
    // own cascade proposals, never a second conflict-detection formula.
    const recentLegConflictCount = proposals.filter(
      (p) => daysBetween(localDateOf(p.createdAt), asOf) <= 28 && p.changes.some((c) => c.reason?.includes('48 uur hersteltijd')),
    ).length;

    const signals: StrengthReviewSignals = {
      daysUntilBlockEnd: daysUntilBlockEnd(currentStrategy, asOf),
      userReportedSchemaEnded: false,
      activeGoalChangedSinceBlockStart: goals.some((g) => g.status === 'active' && g.updatedAt > currentStrategy.updatedAt),
      goalEnteredNewPhaseSinceBlockStart: overviews.some((o) => o.focus.reasons.some((r) => r.component === 'phase')),
      availabilityOrPriorityChangedSinceBlockStart: Boolean(engineConfig.updatedAt && engineConfig.updatedAt > currentStrategy.updatedAt),
      recentLegConflictCount,
      injuryChangedSinceBlockStart: injuryChangedSince(injuries, currentStrategy.updatedAt),
    };

    const triggers = computeStrengthReviewTriggers(signals);
    if (triggers.length === 0) return;

    const rec = buildStrengthProgramRecommendation({ currentStrategy, triggers, goalOverviews: overviews, asOf });
    await StrengthProgramRecommendationsRepo.put(rec);
    await refresh();
  }, [refresh]);

  const rebuildRecommendations = useCallback(async () => {
    // runStrengthReviewCheck refuses to run again while a recommendation is
    // already pending (never stacks duplicates on repeated boots) — a
    // deliberate rebuild means the user wants a fresh look regardless, so
    // any pending one is dismissed first rather than left blocking it.
    const pendingRecs = await StrengthProgramRecommendationsRepo.getAll();
    for (const rec of pendingRecs.filter((r) => !r.resolvedAt)) {
      await StrengthProgramRecommendationsRepo.put({ ...rec, resolvedAt: new Date().toISOString(), resolution: 'dismissed' });
    }
    await runForecastReplan();
    await runStrengthReviewCheck();
    await runWeeklyPrescriptionBuild();
    await refresh();
  }, [refresh, runForecastReplan, runStrengthReviewCheck, runWeeklyPrescriptionBuild]);

  useEffect(() => {
    (async () => {
      // AscendSplashLogo's entrance sequence (glow, ring, crest, mountain,
      // trail, dot with spark, wordmark; .alogo-* in index.css) finishes at
      // 2.2s in Normaal, 0.8s in Rustig; Uit stands still at once
      // (engine/motionSettings.ts#splashMinimumMs). On a warm load,
      // seedIfEmpty/refresh can resolve in a handful of ms; without a floor
      // the splash would unmount before the sequence is seen. It is only a
      // floor: the loading never waits for the animation, and the ambient
      // motion (glow, breathing ring, travelling light) stops with the splash.
      // Only the first open of the day shows the splash (utils/updateFlag.ts
      // #SHOW_SPLASH); otherwise there is no minimum duration.
      const splashMotion = resolveMotion({ motion: document.documentElement.dataset.motion });
      const minSplashDuration = new Promise((resolve) => setTimeout(resolve, SHOW_SPLASH ? splashMinimumMs(splashMotion) : 0));
      const stopBlockedNotice = onDatabaseBlocked(() =>
        setBootError('ASCEND is in een ander venster nog open met een oudere versie. Sluit dat venster om de update af te ronden.'),
      );
      // First the data, then the app, and only then the planning run in the
      // background (engine/bootWatch.ts#runBoot): a run that does not finish
      // can never keep the screen black.
      const background = async () => {
        // Once per page load, like the migrations.
        if (backgroundPlanningStarted) return;
        backgroundPlanningStarted = true;
        // A repair from the opening that still runs writes the plan too: the
        // background steps start when it is done (storage/bootLock.ts).
        await bootSettled;
        // One after the other, never at once: the sync of today first, then
        // the steps below; each reads what the one before wrote, and each ends
        // in a refresh that runs the sync and its week check over the result
        // (docs/onderzoek/Planning op een lijn.md, conflict 12).
        // Each on its own: one that fails doesn't stop the next.
        // Tests of the last 60 days that still want their best 5 km: read once, refresh when one was added.
        const readRecentTestEfforts = async () => {
          if (await ensureRecentTestEfforts()) await refresh();
        };
        for (const [name, step] of [['planning sync', () => refresh()], ['availability', runForecastReplan], ['strength review', runStrengthReviewCheck], ['weekly prescription', runWeeklyPrescriptionBuild], ['watch activities', syncWatchActivities], ['best 5 km of recent tests', readRecentTestEfforts], ['watch workouts', syncWatchWorkouts]] as const) {
          try {
            await step();
          } catch (err) {
            console.error(`Background planning (${name}) failed`, err);
          }
        }
      };
      let ready = false;
      try {
        await Promise.all([
          runBoot({
            migrate: runBootMigrationsOnce,
            load: loadState,
            onStep: setBootStep,
            onReady: () => {
              ready = true;
            },
            // After the splash, so the planning does not slow the opening down.
            background: async () => {
              await minSplashDuration;
              await background();
            },
          }),
          minSplashDuration,
        ]);
      } catch (err) {
        setBootError(describeStorageError(err));
        setLoading(false);
        return;
      } finally {
        stopBlockedNotice();
      }
      if (!ready) return;
      setBootError(null);
      setLoading(false);
      void requestPersistentStorage();
    })();
  }, [refresh, loadState, runForecastReplan, runStrengthReviewCheck, runWeeklyPrescriptionBuild]);

  const templateById = useMemo(() => new Map(templates.map((t) => [t.id, t])), [templates]);

  // Reactive mirror of the same computeActiveGoalOverviews call every
  // strength-review function already makes from fresh repo reads — exposed
  // here too so UI-time consumers (e.g. StrengthProgramWizard's committed-
  // range opt-in) can read current Goal Focus without duplicating the
  // wiring or waiting for a refresh() round-trip.
  const goalOverviews = useMemo(
    () =>
      computeActiveGoalOverviews(
        trainingGoals,
        [...extractEvidenceFromLogs(sessionLogs), ...capabilityEvidence],
        goalEngineConfig.availability,
        goalEngineConfig.guardrails,
        todayISO(),
      ),
    [trainingGoals, sessionLogs, capabilityEvidence, goalEngineConfig],
  );

  const sessionsForWeek = useCallback(
    (weekStartDate: string) => plannedSessions.filter((s) => mondayOfWeek(s.scheduledDate) === weekStartDate),
    [plannedSessions],
  );

  // One moment after Gedaan for what one caller saved (engine/savedMoments.ts):
  // a single log gets its own, several (Alles opslaan) one summary. The debrief
  // follows for a single log the user ticked off, not for one ticked off by
  // itself. A cleared milestone gets the bigger quote and chime.
  const announceSaved = useCallback((batch: SavedMoment[]) => {
    const saved = batch.splice(0, batch.length);
    const announcement = announcementFor(saved);
    if (!announcement) return;
    haptics.success();
    if (settings.introSoundEnabled) {
      if (announcement.kind === 'milestone') playMilestoneChime();
      else playSessionCompleteChime();
    }
    // "Citaten na een training" uit: het scherm blijft, alleen het citaat
    // (voor een behaalde mijlpaal blijft het) valt weg.
    const withQuote = showCompletionQuote(settings.overviews, announcement.kind === 'milestone');
    setCelebration({
      id: makeId('celebration'),
      kind: announcement.kind,
      title: announcement.title,
      quote: withQuote ? (announcement.kind === 'milestone' ? pickVictoryQuote() : pickCompletionQuote()) : undefined,
      coachNote: announcement.coachNote,
      logIds: announcement.logIds,
    });
    // The debrief (components/DebriefSheet.tsx) opens after the moment.
    if (announcement.debriefLogId) setDebriefLogId(announcement.debriefLogId);
  }, [settings.introSoundEnabled, settings.overviews]);

  const logSession = useCallback(
    async (input: LogSessionInput, opts?: { batch?: SavedMoment[] }): Promise<boolean> => {
      const plannedId = input.plannedSessionId;
      if (plannedId) {
        if (loggingInFlight.current.has(plannedId)) return false;
        loggingInFlight.current.add(plannedId);
      }
      try {
        const existing = plannedId || input.externalId ? await SessionLogsRepo.getAll() : [];
        if (plannedId && existing.some((l) => l.plannedSessionId === plannedId)) return false;
        // The same watch activity is never stored twice.
        if (input.externalId && existing.some((l) => l.externalId === input.externalId)) return false;
        const log: SessionLog = {
          id: makeId('log'),
          plannedSessionId: input.plannedSessionId,
          templateId: input.templateId,
          type: input.type,
          sport: input.sport,
          completedDate: input.completedDate ?? todayISO(),
          completedAt: input.completedAt ?? new Date().toISOString(),
          variant: input.variant,
          durationMinutes: input.durationMinutes,
          rpe: input.rpe,
          notes: input.notes,
          strengthData: input.strengthData,
          cardioData: input.cardioData,
          outdoorData: input.outdoorData,
          subjectiveFeel: input.subjectiveFeel,
          painAreas: input.painAreas && input.painAreas.length > 0 ? input.painAreas : undefined,
          painReports: input.painReports && input.painReports.length > 0 ? input.painReports : undefined,
          workout: input.workout,
          strengthRir: input.strengthRir,
          ...(input.gymProfileId ? { gymProfileId: input.gymProfileId } : {}),
          legsAtStart: input.legsAtStart,
          externalId: input.externalId,
          sourceSync: input.sourceSync,
          source: input.source ?? 'manual',
        };
        await SessionLogsRepo.put(log);

        // If this log satisfies the current front-of-ladder milestone on any
        // goal, record the historical moment it was cleared. Progress and logs
        // are read fresh from storage: a copy from the closure would let a log
        // ticked off right after another clear the same milestone twice.
        const clearedTitle = await recordClearedMilestones(log);

        await refresh();
        // Ticked off by itself from the watch (engine/autoTick.ts): no moment
        // after Gedaan, unless it cleared a milestone.
        if (input.quiet && !clearedTitle) return true;
        // Every completion gets a quote — a regular session a lighter one, a
        // milestone clear (if this same log happened to satisfy one) the
        // bigger victory-tier treatment with the milestone's title attached.
        // The coach reacts in one line to what you filled in (engine/coach.ts).
        const allTemplates = await SessionTemplatesRepo.getAll();
        const currentProgram = (await ProgramsRepo.getAll())[0] ?? null;
        const allLogs = await SessionLogsRepo.getAll();
        let coachNote = coachReaction(log, allTemplates.find((t) => t.id === log.templateId), currentProgram, allLogs);
        // Faster at the same heart rate over weeks: said once, right after
        // an easy run (engine/aerobicTrend.ts#progressMoment).
        // A training set to "Niet meetellen voor hartslag" stays out of the trend (engine/influence.ts).
        const excluded = excludedLogIds((await SettingsRepo.get()).influences);
        const trend = aerobicTrend(allLogs, allTemplates, currentProgram, settings.heartRate, log.completedDate, excluded);
        const lastProgress = await MetaRepo.get<ProgressCelebrated>('aerobicProgressCelebrated');
        const counted = trend.runs > aerobicTrend(allLogs.filter((l) => l.id !== log.id), allTemplates, currentProgram, settings.heartRate, log.completedDate, excluded).runs;
        const progress = counted ? progressMoment(trend, lastProgress, log.completedDate) : undefined;
        if (progress && trend.changeSec !== undefined) {
          coachNote = `${coachNote} ${progress}`;
          await MetaRepo.set('aerobicProgressCelebrated', { date: log.completedDate, changeSec: trend.changeSec });
        }
        const moment: SavedMoment = { logId: log.id, recovery: log.type === 'recovery', clearedTitle, coachNote, auto: input.quiet };
        if (opts?.batch) opts.batch.push(moment);
        else announceSaved([moment]);
        return true;
      } catch (err) {
        reportStorageError(err);
        return false;
      } finally {
        if (plannedId) loggingInFlight.current.delete(plannedId);
      }
    },
    [refresh, settings.heartRate, reportStorageError, announceSaved],
  );

  // Undoing a log also removes any milestone auto-cleared by it (matched
  // via sourceSessionLogId) — otherwise the Ascent Ladder would keep
  // showing a milestone as cleared with no log left to back it up.
  // Manually-cleared milestones (no sourceSessionLogId) are untouched.
  const undoLog = useCallback(
    async (logId: string) => {
      await SessionLogsRepo.delete(logId);
      for (const p of goalMilestoneProgress) {
        if (p.sourceSessionLogId === logId) await GoalMilestoneProgressRepo.delete(p.id);
      }
      await refresh();
    },
    [goalMilestoneProgress, refresh],
  );

  const setLogFeedback = useCallback(
    async (logId: string, patch: FeedbackPatch) => {
      // In the same queue as trimming and aligning with the watch, so a stale
      // copy never writes over a trim that landed in between.
      const written = await inTurn(async () => {
        const log = (await SessionLogsRepo.getAll()).find((l) => l.id === logId);
        if (!log) return false;
        await SessionLogsRepo.put(applyFeedback(log, patch));
        return true;
      });
      if (written) await refresh();
    },
    [refresh],
  );

  // The notice is set before the refresh, so a repair the week check makes
  // because of the new numbers joins it and one undo takes both back.
  const alignWithWatch = useCallback(
    async (requests: AlignRequest[]): Promise<number> => {
      const outcome = await applyAlignments(requests);
      if (outcome.logIds.length === 0) return 0;
      const n = outcome.logIds.length;
      const now = new Date().toISOString();
      setRecentChange({
        id: makeId('watchalign'),
        trigger: 'new_training_data',
        title: 'Bijgewerkt met je horloge',
        summary: n === 1 ? outcome.lines[0] : `${n} trainingen kregen de cijfers van je horloge`,
        lines: outcome.lines,
        why: 'Garmin is leidend: voor een training die je zelf invulde nam ASCEND de lengte, afstand, hartslag en hoogtemeters van je horloge over. Wat jij zelf invulde, zoals gevoel, inspanning en pijn, bleef staan. Je eigen cijfers zijn bewaard; met Ongedaan maken, of later via Terugzetten bij Garmin koppelen, komen ze terug.',
        before: [],
        addedIds: [],
        alignedLogIds: outcome.logIds,
        createdAt: now,
      });
      // The leg index and the week load count with the new numbers: the plan
      // is checked again, and what the system planned itself may follow.
      planRevision++;
      await refresh();
      void syncWatchWorkoutsAfterPlanChange();
      return n;
    },
    [refresh],
  );

  const restoreFromWatch = useCallback(
    async (logIds: string[]): Promise<number> => {
      const n = await restoreAlignments(logIds);
      if (n > 0) {
        setRecentChange((prev) => (prev?.alignedLogIds ? null : prev));
        planRevision++;
        await refresh();
        void syncWatchWorkoutsAfterPlanChange();
      }
      return n;
    },
    [refresh],
  );

  // A cut changes the length, the distance and the climb of a training: the leg
  // index, the week load and the Ascent meters count with the new numbers, so the
  // plan is checked again, like after a putting back.
  const trimWatchActivity = useCallback(
    async (logId: string, streams: StreamSet, startSec: number, endSec: number): Promise<boolean> => {
      const written = await trimStoredLog(logId, streams, startSec, endSec);
      if (written) {
        planRevision++;
        await refresh();
        void syncWatchWorkoutsAfterPlanChange();
      }
      return written;
    },
    [refresh],
  );

  const undoTrimWatchActivity = useCallback(
    async (logId: string): Promise<boolean> => {
      const written = await undoTrimStoredLog(logId);
      if (written) {
        planRevision++;
        await refresh();
        void syncWatchWorkoutsAfterPlanChange();
      }
      return written;
    },
    [refresh],
  );

  const restoreSourceUpdate = useCallback(
    async (logId: string): Promise<boolean> => {
      const written = await restoreSourceUpdateStored(logId);
      if (written) {
        planRevision++;
        await refresh();
      }
      return written;
    },
    [refresh],
  );

  const takeOverSourceNumbers = useCallback(
    async (logId: string): Promise<boolean> => {
      const written = await takeOverOfferedStored(logId);
      if (written) {
        planRevision++;
        await refresh();
      }
      return written;
    },
    [refresh],
  );

  // A fetch from intervals.icu rewrote logs (a correction at the source): read them again.
  useEffect(
    () =>
      onSourceCorrected(() => {
        planRevision++;
        void refresh();
      }),
    [refresh],
  );

  // The leg index and the week load count with the new numbers: the plan is
  // checked again, like after the watch's numbers took over.
  const takeOverFromMacroFactor = useCallback(
    async (requests: TakeoverRequest[], batch: SavedMoment[]): Promise<number> => {
      const outcome = await applyStrengthTakeovers(requests);
      if (outcome.moments.length === 0) return 0;
      // Nothing the user just did: no debrief afterwards (auto).
      for (const m of outcome.moments) batch.push({ logId: m.logId, recovery: false, clearedTitle: m.clearedTitle, auto: true });
      planRevision++;
      await refresh();
      void syncWatchWorkoutsAfterPlanChange();
      return outcome.moments.length;
    },
    [refresh],
  );

  const restoreFromMacroFactor = useCallback(
    async (logIds: string[]): Promise<number> => {
      const n = await restoreStrengthTakeovers(logIds);
      if (n > 0) {
        planRevision++;
        await refresh();
        void syncWatchWorkoutsAfterPlanChange();
      }
      return n;
    },
    [refresh],
  );

  const setLogWorkout = useCallback(
    async (logId: string, workout: SessionLog['workout']) => {
      // The stored log, not the one on screen: the run profile may have come in since.
      // In the queue of trimming and aligning, like setLogFeedback.
      const written = await inTurn(async () => {
        const log = (await SessionLogsRepo.getAll()).find((l) => l.id === logId);
        if (!log) return false;
        await SessionLogsRepo.put({ ...log, workout });
        return true;
      });
      if (written) await refresh();
    },
    [refresh],
  );

  const moveSession = useCallback(
    (sessionId: string, targetDate: string): ScheduleProposal => {
      const targetMonday = mondayOfWeek(targetDate);
      // Groep C, Fase 5 — de weekgrens-bug: cross-day belastingsscoring
      // (candidatePlacement.ts#findLoadOverlaps) kijkt tot 2 dagen terug/
      // vooruit, wat de eigen kalenderweek kan overschrijden (bv. maandag
      // vergeleken met de voorgaande zondag). `week` alleen zou zo'n
      // aangrenzende-week-sessie stilzwijgend missen — de buurweken worden
      // hier meegenomen zodat searchWeeklyPlacement's nabijheidscontext
      // altijd compleet is, ook al blijven de kandidaatdata zelf beperkt
      // tot de kalenderweek van targetDate (scheduler.ts#proposeMove).
      const week = sessionsForWeek(targetMonday);
      const previousWeek = sessionsForWeek(addDays(targetMonday, -7));
      const nextWeek = sessionsForWeek(addDays(targetMonday, 7));
      const nearby = [...previousWeek, ...week, ...nextWeek];
      const combined = nearby.some((s) => s.id === sessionId) ? nearby : [...nearby, ...plannedSessions.filter((s) => s.id === sessionId)];
      return proposeMove(combined, templates, sessionId, targetDate, sessionLogs, program, goalEngineConfig.availability.dailyTimeBudget, goalEngineConfig.strategy.sameDayPairingPreference);
    },
    [sessionsForWeek, plannedSessions, templates, sessionLogs, program, goalEngineConfig],
  );

  const suggestMoves = useCallback(
    (sessionId: string): MoveSuggestion[] => {
      const session = plannedSessions.find((s) => s.id === sessionId);
      if (!session) return [];
      const monday = mondayOfWeek(session.scheduledDate);
      const nearby = [-7, 0, 7, 14].flatMap((offset) => sessionsForWeek(addDays(monday, offset)));
      const today = todayISO();
      // Never a day the planning keeps free (Warden Logica punt 6).
      return suggestMoveDates(
        nearby, templates, sessionId, sessionLogs, program,
        goalEngineConfig.availability.dailyTimeBudget, goalEngineConfig.strategy.sameDayPairingPreference, today, undefined,
        { leave: settings.leavePeriods, restDay: settings.restDay ?? 1, goalDay: planEndDay(trainingGoals, goalMilestones, today, settings.afterMainGoal), illness: settings.illnessEpisodes },
      );
    },
    [plannedSessions, sessionsForWeek, templates, sessionLogs, program, goalEngineConfig, settings.leavePeriods, settings.restDay, settings.afterMainGoal, settings.illnessEpisodes, trainingGoals, goalMilestones],
  );

  // A same-date change (toDate === fromDate) is how proposeSkipEngine
  // represents a skip — applied as a skip, never as a no-op "move" to the
  // date the session already occupied (mirrors applyNoTimeToday's existing
  // fallback for the same shape).
  // Every move or skip the user confirms can be undone right away: the
  // touched rows are snapshotted into recentChange, which ChangeNotice
  // shows with "Ongedaan maken" (production feedback: "stel ik heb een
  // foutje gemaakt, dan moet ik het weer ongedaan kunnen maken"). Moving a
  // session back to the day it came from makes it a plain planned session
  // again instead of "verplaatst".
  const applyProposal = useCallback(
    async (proposal: ScheduleProposal) => {
      await planSettled();
      const stored = await PlannedSessionsRepo.getAll();
      const before: PlannedSession[] = [];
      const lines: string[] = [];
      const day = (iso: string) => `${weekdayShortNL(iso).toLowerCase()} ${formatDateNL(iso)}`;
      // Your own move or skip is yours: the automatic planning leaves it.
      // Back on its own day it is the plan's again.
      const lock = { by: 'user' as const, at: new Date().toISOString() };
      for (const change of proposal.changes) {
        const session = stored.find((s) => s.id === change.sessionId);
        if (!session) continue;
        before.push(session);
        if (change.restore) {
          // "Toch doen": your own choice, so it stays yours against the automatic planning.
          await PlannedSessionsRepo.put({ ...session, scheduledDate: change.toDate, status: change.toDate === (session.movedFromDate ?? change.toDate) ? 'planned' : 'moved', lock });
          lines.push(`${change.templateName} op ${day(change.toDate)} staat weer op de planning`);
        } else if (change.toDate === change.fromDate) {
          await PlannedSessionsRepo.put({ ...skipSessionEngine(session), lock });
          lines.push(`${change.templateName} op ${day(change.fromDate)} overgeslagen`);
        } else if (change.toDate === session.movedFromDate) {
          await PlannedSessionsRepo.put({ ...session, scheduledDate: change.toDate, status: 'planned', movedFromDate: undefined, lock: undefined });
          lines.push(`${change.templateName}: terug naar ${day(change.toDate)}`);
        } else {
          await PlannedSessionsRepo.put({
            ...session,
            scheduledDate: change.toDate,
            status: 'moved',
            movedFromDate: session.movedFromDate ?? change.fromDate,
            lock,
          });
          lines.push(`${change.templateName}: ${day(change.fromDate)} → ${day(change.toDate)}`);
        }
      }
      if (before.length > 0) {
        const restored = proposal.changes[0]?.restore === true;
        const skipped = !restored && proposal.changes.every((c) => c.toDate === c.fromDate);
        const first = proposal.changes[0]?.templateName ?? 'Sessie';
        setRecentChange({
          id: makeId('usermove'),
          trigger: skipped ? 'session_skipped' : 'session_moved',
          title: restored ? `${first} staat weer op de planning` : skipped ? `${first} overgeslagen` : proposal.changes.length === 1 ? `${first} verplaatst` : 'Sessies verplaatst',
          lines,
          why: proposal.changes.length > 1 ? proposal.reason : '',
          before,
          addedIds: [],
          createdAt: new Date().toISOString(),
        });
      }
      planRevision++;
      await refresh();
    },
    [refresh],
  );

  const proposeSkip = useCallback(
    (sessionId: string): ScheduleProposal => {
      const session = plannedSessions.find((s) => s.id === sessionId);
      if (!session) return { changes: [], reason: 'Sessie niet gevonden.', resolved: false };
      return proposeSkipEngine(session, templates);
    },
    [plannedSessions, templates],
  );

  const proposeBackOnPlan = useCallback(
    (sessionId: string): ScheduleProposal => {
      const session = plannedSessions.find((s) => s.id === sessionId);
      if (!session) return { changes: [], reason: 'Sessie niet gevonden.', resolved: false };
      const monday = mondayOfWeek(session.scheduledDate);
      // The neighbouring weeks too, as for a move: the 48 hours cross the week's edge.
      const nearby = [-7, 0, 7].flatMap((offset) => sessionsForWeek(addDays(monday, offset)));
      const combined = nearby.some((s) => s.id === sessionId) ? nearby : [...nearby, session];
      return proposeBackOnPlanEngine(combined, templates, sessionId, sessionLogs, program, goalEngineConfig.availability.dailyTimeBudget, goalEngineConfig.strategy.sameDayPairingPreference, todayISO());
    },
    [plannedSessions, sessionsForWeek, templates, sessionLogs, program, goalEngineConfig],
  );

  const clearMilestoneManually = useCallback(
    async (goalId: string, milestoneId: string) => {
      await GoalMilestoneProgressRepo.put({
        id: makeId('progress'),
        goalId,
        milestoneId,
        clearedDate: todayISO(),
      });
      const title = goalMilestones.find((m) => m.goalId === goalId && m.id === milestoneId)?.title;
      await refresh();
      haptics.success();
      if (settings.introSoundEnabled) playMilestoneChime();
      if (title) setCelebration({ id: makeId('celebration'), kind: 'milestone', title, quote: pickVictoryQuote() });
    },
    [goalMilestones, refresh, settings.introSoundEnabled],
  );

  // Only targetDate/targetDistanceKm are editable from the UI today — the
  // ladder content itself (name, milestones) is static, migrated once from
  // data/defaultProgram.ts (storage/goalMigration.ts). targetDistanceKm
  // isn't a direct TrainingGoal field (Technical Architecture v0.3.1
  // REVISED) — it's expressed as a 'distance'/'TOTAL_EVENT' GoalRequirement,
  // upserted here by kind. Setting/clearing targetDate also flips the
  // discriminated union's status between 'active' and 'paused', since an
  // active goal cannot exist without one.
  const updateGoal = useCallback(
    async (goalId: string, patch: { targetDistanceKm?: number; packWeightKg?: number }) => {
      const goal = trainingGoals.find((g) => g.id === goalId);
      if (!goal) return;
      const now = new Date().toISOString();
      let requirements = goal.requirements;
      if ('targetDistanceKm' in patch) {
        const withoutDistance = goal.requirements.filter((r) => r.kind !== 'distance');
        // discipline: 'hiking' — this function is only ever called for the
        // GR5 goal (the one goal with a milestone ladder; the marathon goal
        // uses its own AppSettings-backed MarathonGoalCard/updateSettings
        // path). Without it, computeDemand's endurance_duration/
        // mechanical_tolerance keys would carry discipline: undefined,
        // which can never match any real evidence — extractEvidenceFromLog
        // only ever produces a discipline-specific key. Phase 4/6 surfaced
        // this: the Gap/Feasibility/Adaptive Replanner pipeline silently
        // never engaged with GR5's own distance demand at all.
        requirements = patch.targetDistanceKm !== undefined
          ? [...withoutDistance, { id: makeId('req'), kind: 'distance' as const, scope: 'TOTAL_EVENT' as const, target: { amount: patch.targetDistanceKm, unit: 'km' as const }, discipline: 'hiking' }]
          : withoutDistance;
      }
      // The rucksack target of this goal (engine/gr5Profile.ts): each goal
      // carries its own, so a different trip can have a different weight.
      if ('packWeightKg' in patch) requirements = withPackWeight({ ...goal, requirements }, patch.packWeightKg, now).requirements;
      // The date stays: another date is a proposal (planGoalChange).
      await TrainingGoalsRepo.put({ ...goal, requirements, updatedAt: now });
      await refresh();
    },
    [trainingGoals, refresh],
  );

  const archiveGoal = useCallback(
    async (goalId: string) => {
      const goal = trainingGoals.find((g) => g.id === goalId);
      if (!goal) return;
      await TrainingGoalsRepo.put({ ...goal, status: 'archived', targetDate: undefined, updatedAt: new Date().toISOString() });
      // MarathonGoalCard's populated view is gated on settings.marathonRaceType
      // (the quick-pick field), not on whether a live TrainingGoal exists —
      // without this, archiving the Marathon goal left that field set, so the
      // card kept showing exactly as before (production feedback: "verwijderen
      // doet niks", and it read as a permanent, undeletable goal slot).
      // Clearing it here resets the card to its unconfigured state, the same
      // as GR5's own dedicated card disappearing once archived.
      if (isMarathonGoal(goal)) {
        const nextSettings = await SettingsRepo.set({ marathonRaceType: undefined, marathonTargetDate: undefined, marathonTargetTimeMinutes: undefined });
        setSettings(nextSettings);
      }
      await refresh();
    },
    [trainingGoals, refresh],
  );

  const unarchiveGoal = useCallback(
    async (goalId: string) => {
      const goal = trainingGoals.find((g) => g.id === goalId);
      if (!goal || goal.status !== 'archived') return;
      // Een teruggehaald doel komt achteraan de lijst die je nu ziet.
      const order = orderForRestored(trainingGoals, new Set(goalMilestones.map((m) => m.goalId)), todayISO());
      await TrainingGoalsRepo.put({ ...goal, status: 'paused', order, updatedAt: new Date().toISOString() });
      await refresh();
    },
    [trainingGoals, goalMilestones, refresh],
  );

  const strengthExternal = strengthTrackedExternally(strengthProgramStrategies, settings.strengthTrackedExternally);

  // One switch: the settings flag and the active block's source move together.
  const setStrengthExternal = useCallback(async (external: boolean) => {
    const active = activeStrengthStrategy(await StrengthProgramStrategiesRepo.getAll());
    if (active && (active.source !== 'manual') !== external) {
      await StrengthProgramStrategiesRepo.put({ ...active, source: external ? 'macrofactor_workouts' : 'manual', updatedAt: new Date().toISOString() });
    }
    // The switch shows its new place at once; the rest follows in refresh.
    setSettings(await SettingsRepo.set({ strengthTrackedExternally: external }));
    setStrengthProgramStrategies(await StrengthProgramStrategiesRepo.getAll());
    await refresh();
  }, [refresh]);

  const updateSettings = useCallback(async (patch: Partial<AppSettings>): Promise<AppSettings> => {
    const next = await SettingsRepo.set(patch);
    setSettings(next);
    return next;
  }, []);

  // An illness status change that didn't need any calendar change still
  // gets its own notice, so "Ongedaan maken" always undoes this tap and
  // never an older change.
  const showStatusOnlyChange = useCallback(async (proposal: PlanChangeProposal, restore?: UndoRestore) => {
    setRecentChange({
      id: proposal.id,
      trigger: proposal.trigger,
      title: proposal.issue,
      lines: ['Je planning hoefde niet te veranderen.'],
      why: proposal.consequences,
      before: [],
      addedIds: [],
      settingsBefore: restore?.settings,
      configBefore: restore?.config,
      createdAt: new Date().toISOString(),
    });
    await refresh();
  }, [refresh]);

  // Notes of "Wat speelde er": one write at a time, each from the stored list.
  const influenceTail = useRef<Promise<unknown>>(Promise.resolve());
  const writeInfluences = useCallback((compute: (stored: InfluenceEntry[]) => InfluenceEntry[]): Promise<void> => {
    const job = influenceTail.current.then(async () => {
      const stored = await SettingsRepo.get();
      setSettings(await SettingsRepo.set({ influences: compute(stored.influences ?? []) }));
    });
    influenceTail.current = job.catch(() => undefined);
    return job;
  }, []);
  const saveInfluence = useCallback(
    (target: NoteTarget, change: (entry: InfluenceEntry) => InfluenceEntry) =>
      writeInfluences((list) => {
        const now = new Date().toISOString();
        const found = list.find((e) => (target.logId ? e.logId === target.logId : !e.logId && e.date === target.date));
        return applyChange(list, found ?? blankEntry(target, makeId('influence'), now), change, now);
      }),
    [writeInfluences],
  );
  // Weighings for sweat loss share the same one-at-a-time lane as the notes.
  const saveSweat = useCallback(
    async (entry: SweatEntry | { logId: string; remove: true }) => {
      const job = influenceTail.current.then(async () => {
        const stored = await SettingsRepo.get();
        const rest = (stored.sweatEntries ?? []).filter((e) => e.logId !== entry.logId);
        setSettings(await SettingsRepo.set({ sweatEntries: 'remove' in entry ? rest : [...rest, entry] }));
      });
      influenceTail.current = job.catch(() => undefined);
      return job;
    },
    [],
  );
  const saveSweatPre = useCallback(
    async (date: string, weightKg: number | null) => {
      const job = influenceTail.current.then(async () => {
        const stored = await SettingsRepo.get();
        const list = weightKg === null ? clearSweatPre(stored.sweatPre, date) : setSweatPre(stored.sweatPre, { date, weightKg, updatedAt: new Date().toISOString() }, todayISO());
        setSettings(await SettingsRepo.set({ sweatPre: list }));
      });
      influenceTail.current = job.catch(() => undefined);
      return job;
    },
    [],
  );
  const removeInfluence = useCallback((id: string) => writeInfluences((list) => list.filter((e) => e.id !== id)), [writeInfluences]);
  const clearInfluences = useCallback(() => writeInfluences(() => []), [writeInfluences]);

  // Ziek melden en weer beter zijn voorstellen (engine/illness.ts#planIllnessChange):
  // niets wordt bewaard voor Akkoord (applyIllness), bij Liever niet blijft alles
  // zoals het was.
  const planIllness = useCallback(
    (change: IllnessChange): IllnessPlan | undefined =>
      planIllnessChange(change, settings.illnessEpisodes ?? [], plannedSessions, templates, sessionLogs, todayISO()),
    [settings.illnessEpisodes, plannedSessions, templates, sessionLogs],
  );

  const applyIllness = useCallback(async (plan: IllnessPlan) => {
    await planSettled();
    const stored = await SettingsRepo.get();
    // Undo zet de periodes terug zoals ze waren, samen met de planning.
    const restore = { settings: { illnessEpisodes: stored.illnessEpisodes ?? [] } };
    setSettings(await SettingsRepo.set({ illnessEpisodes: plan.episodesAfter }));
    if (!(await commitPlanChange(plan.proposal, plan.proposal.issue, restore))) await showStatusOnlyChange(plan.proposal, restore);
  }, [commitPlanChange, showStatusOnlyChange]);

  const updateGoalEngineConfig = useCallback(async (patch: Partial<GoalEngineConfig>): Promise<GoalEngineConfig> => {
    const next = await GoalEngineConfigRepo.set(patch);
    setGoalEngineConfig(next);
    return next;
  }, []);

  // Een doel of planningsinstelling als voorstel (storage/horizonPlan.ts), in de
  // wachtrij van de planningssync, zodat er nooit twee rondes tegelijk lopen.
  const planHorizonChangeImpl = useCallback(async (input: HorizonChangeInput): Promise<HorizonPlan> => {
    const plan = await horizonQueue.run(async () => {
      await bootSettled;
      return computeHorizonPlan(input, { prime: primePlanningRegisters });
    });
    if (!plan) throw new Error('De planning reageert nu niet. Er is niets aangepast; probeer het zo nog eens.');
    return plan;
  }, []);

  // The notice of an applied proposal, with undo. Also when Akkoord finished
  // after its caller was let go ('pending'): then it comes when it is done.
  const showHorizonResult = useCallback(async (plan: HorizonPlan, result: Extract<HorizonApplyResult, { before: PlannedSession[] }>) => {
    const now = new Date().toISOString();
    // Also when the sessions stayed: a rest week trained through changes only
    // the program, and belongs in the change log on Week all the same.
    if (result.status !== 'unchanged' || result.restore.program) await PlanChangeProposalsRepo.put({ ...plan.proposal, resolvedAt: now, resolution: 'accepted' });
    // The first plan of an empty app has no notice with undo: there is nothing
    // to go back to but an empty app, and undoing the plan would leave a
    // program the planning then fills in again without asking. The plan on
    // Vandaag is the answer (docs/beslissingen/2026-10-25-eerst-vragen-dan-plannen.md).
    // Only when it half worked ('partial') the usual notice does show, so you can see what changed.
    if (plan.input.firstPlan && result.status !== 'partial') {
      planRevision++;
      await refresh();
      void syncWatchWorkoutsAfterPlanChange();
      return;
    }
    const tpls = await SessionTemplatesRepo.getAll();
    const lines = [...describeChanges(plan.proposal.changes, result.before, tpls), ...plan.lengths];
    setRecentChange({
      id: plan.proposal.id,
      trigger: plan.proposal.trigger,
      title: result.status === 'partial' ? `Half gelukt: ${plan.proposal.issue}` : plan.proposal.issue,
      lines: lines.length > 0 ? lines : ['Je planning hoefde niet te veranderen.'],
      ...(lines.length > 3 ? { summary: plan.proposal.consequences } : {}),
      why: plan.proposal.explanation,
      before: result.before,
      addedIds: result.addedIds,
      settingsBefore: result.restore.settings,
      goalsBefore: result.restore.goals,
      goalsAdded: result.restore.newGoalIds,
      ...(result.restore.program ? { programBefore: result.restore.program } : {}),
      createdAt: now,
    });
    planRevision++;
    await refresh();
    void syncWatchWorkoutsAfterPlanChange();
  }, [refresh]);

  const applyHorizonPlanImpl = useCallback(async (plan: HorizonPlan, options?: { onLate?: (status: HorizonApplyStatus) => void }): Promise<HorizonApplyStatus> => {
    const job = async () => {
      await bootSettled;
      const done = await applyHorizonPlanNow(plan, { prime: primePlanningRegisters });
      // Not knowing the key only means the next sync checks once more.
      lastHorizonKey = await horizonKey().catch(() => lastHorizonKey);
      return done;
    };
    // Still running after the minute the queue waits: say so now, and show the
    // normal notice once it is done (Warden Planning punt 2).
    // A late failure gets a visible outcome too (Warden Planning N2).
    const lateFailed = () => {
      setStorageNotice('Je planning bijwerken lukte niet. Alles staat weer zoals het was.');
      void refresh();
      options?.onLate?.('failed');
    };
    const outcome = await horizonQueue.runOrLate(job, (late) => {
      if (late.status === 'stale') {
        setStorageNotice('Je planning was intussen veranderd, dus er is niets aangepast. Probeer het opnieuw.');
        void refresh();
        options?.onLate?.('stale');
        return;
      }
      if (late.status === 'failed') { lateFailed(); return; }
      // The plan is stored by now, also when showing the result fails.
      const answered = () => options?.onLate?.(late.status);
      void showHorizonResult(plan, late).then(answered, answered);
    }, lateFailed);
    if (outcome.status === 'late') return 'pending';
    if (outcome.status === 'failed') {
      await refresh();
      return 'failed';
    }
    const result = outcome.value;
    if (result.status === 'stale' || result.status === 'failed') return result.status;
    await showHorizonResult(plan, result);
    return result.status;
  }, [refresh, showHorizonResult]);

  // A rest week or a repeated week (storage/weekLoadPlan.ts), as a proposal in
  // the queue of the planning sync, like every other planning setting.
  const planWeekLoadChange = useCallback(async (kind: WeekLoadKind, weekStart: string, on: boolean): Promise<HorizonPlan> => {
    const outcome = await horizonQueue.run(async () => {
      await bootSettled;
      await primePlanningRegisters();
      // Nothing to choose (the week is over, nothing open changes): the sentence, not a failure.
      const input = await weekLoadInput(kind, weekStart, on).catch((err: unknown) => (err instanceof Error ? err.message : String(err)));
      if (typeof input === 'string') return { refusal: input };
      return { plan: await computeHorizonPlan(input, { prime: primePlanningRegisters }) };
    });
    if (outcome && 'refusal' in outcome) throw new Error(outcome.refusal);
    if (!outcome?.plan) throw new Error('De planning reageert nu niet. Er is niets aangepast; probeer het zo nog eens.');
    return outcome.plan;
  }, []);

  const planGoalChange = useCallback(async (goalId: string, change: { targetDate?: string | null; archive?: boolean }): Promise<HorizonPlan | null> => {
    const goal = (await TrainingGoalsRepo.getAll()).find((g) => g.id === goalId);
    if (!goal) return null;
    const now = new Date().toISOString();
    const explanation = 'Je doel bepaalt de fasen van je planning en de dag waarop het eindigt. Een andere datum of een gearchiveerd doel verandert je planning nooit ongemerkt: je ziet eerst wat er verschuift, omgaat of vervalt; pas na jouw Akkoord gebeurt er iets. Wat je al deed en zelf vastzette, blijft staan.';
    if (change.archive) {
      const archived: TrainingGoal = { ...goal, status: 'archived', targetDate: undefined, updatedAt: now };
      // The Marathon card reads its own settings: those go with it (see archiveGoal).
      const settingsPatch = isMarathonGoal(goal) ? { marathonRaceType: undefined, marathonTargetDate: undefined, marathonTargetTimeMinutes: undefined } : undefined;
      return planHorizonChangeImpl({ title: `${goal.name} archiveren`, why: 'Je doel is gearchiveerd.', explanation, trigger: 'goal_removed', goals: [archived], ...(settingsPatch ? { settings: settingsPatch } : {}) });
    }
    const date = change.targetDate || undefined;
    const next: TrainingGoal = date
      ? { ...goal, status: 'active', targetDate: date, updatedAt: now }
      : { ...goal, status: 'paused', targetDate: undefined, updatedAt: now };
    return planHorizonChangeImpl({
      title: date ? `Doeldatum naar ${formatDateNL(date)}` : `${goal.name} zonder datum`,
      why: date ? 'Volgt je nieuwe doeldatum.' : 'Je doel heeft geen datum meer.',
      explanation,
      trigger: date ? 'goal_changed' : 'goal_paused',
      goals: [next],
    });
  }, [planHorizonChangeImpl]);

  // Tussendoel or Alleen volgen: the race block comes or goes, so a proposal
  // first, like another date (Warden Planning punt 6).
  const planGoalRole = useCallback(async (goalId: string, role: 'secondary' | 'track'): Promise<HorizonPlan | null> => {
    const goal = (await TrainingGoalsRepo.getAll()).find((g) => g.id === goalId);
    if (!goal) return null;
    return planHorizonChangeImpl({
      title: `${goal.name || 'Je doel'}: ${role === 'secondary' ? 'tussendoel' : 'alleen volgen'}`,
      why: role === 'secondary' ? 'Je traint nu voor deze wedstrijd.' : 'Je volgt deze wedstrijd alleen.',
      explanation: 'Een tussendoel krijgt een eigen blok in je planning: kwaliteitstrainingen, een testloop en een lichte wedstrijdweek. Alleen volgen haalt dat blok weg; de wedstrijd zelf komt dan als training op zijn dag in je planning, met de dag ervoor licht voor de benen. ASCEND laat eerst zien wat er verandert en past het pas toe na jouw akkoord.',
      trigger: 'goal_changed',
      // The main goal (Top) keeps its label: this choice is only for a race next to it.
      goals: [{ ...goal, planRole: role, priority: goal.priority === 'top' ? 'top' : role === 'secondary' ? 'voortop' : 'verkenning', ...(goal.priority === 'top' ? {} : { priorityChosen: true }), updatedAt: new Date().toISOString() }],
    });
  }, [planHorizonChangeImpl]);

  const planGoalPriority = useCallback(async (goalId: string, priority: GoalPriority, orderIds?: string[]): Promise<HorizonPlan | null> => {
    const all = await TrainingGoalsRepo.getAll();
    const goal = all.find((g) => g.id === goalId);
    if (!goal) return null;
    const now = new Date().toISOString();
    const name = goal.name || 'Je doel';
    const label = priority === 'top' ? 'Top' : priority === 'voortop' ? 'Voortop' : 'Verkenning';
    const changed: TrainingGoal[] = [{
      ...goal, priority, priorityChosen: true, planRole: priority === 'verkenning' ? 'track' : 'secondary', updatedAt: now,
      // Een eigen kortere afbouw hoorde bij het oude label: het nieuwe krijgt het advies.
      ...(priority !== goal.priority ? { taperDays: undefined } : {}),
    }];
    if (changed[0].taperDays === undefined) delete changed[0].taperDays;
    if (orderIds) {
      orderIds.forEach((id, order) => {
        if (id === goalId) { changed[0].order = order; return; }
        const other = all.find((g) => g.id === id);
        if (other && other.order !== order) changed.push({ ...other, order, updatedAt: now });
      });
    }
    return planHorizonChangeImpl({
      title: `${name}: ${label}`,
      why: PRIORITY_RULE[priority],
      explanation: 'Het label bepaalt hoeveel rust er voor een doel komt en of het een eigen opbouw krijgt. Je ziet eerst wat er in je planning verandert; pas na jouw Akkoord gebeurt er iets. Wat je al deed en zelf vastzette, blijft staan.',
      trigger: 'goal_changed',
      goals: changed,
    });
  }, [planHorizonChangeImpl]);

  const setGoalOrder = useCallback(async (patch: { id: string; order: number | undefined }[]) => {
    const all = await TrainingGoalsRepo.getAll();
    const before: { id: string; order: number | undefined }[] = [];
    const now = new Date().toISOString();
    for (const { id, order } of patch) {
      const goal = all.find((g) => g.id === id);
      if (!goal) continue;
      before.push({ id, order: goal.order });
      const next: TrainingGoal = { ...goal, updatedAt: now };
      if (order === undefined) delete next.order; else next.order = order;
      await TrainingGoalsRepo.put(next);
    }
    await refresh();
    return before;
  }, [refresh]);

  // The Marathon card: race type, date and time live in settings and on the
  // goal. Another date or type changes the planning, so all of it goes through
  // the same proposal; when nothing in the plan changes it is simply stored.
  const planMarathonGoal = useCallback(async (patch: MarathonGoalPatch): Promise<HorizonPlan | null> => {
    const [goals, stored] = await Promise.all([TrainingGoalsRepo.getAll(), SettingsRepo.get()]);
    const existing = goals.find((g) => isMarathonGoal(g) && g.status !== 'archived') ?? goals.find((g) => isMarathonGoal(g));
    // A date set in the goal wizard lives on the goal, not in settings; a quick
    // pick (Halve, Hele) keeps it instead of rebuilding the goal without one.
    const keptDate = 'marathonTargetDate' in patch ? patch.marathonTargetDate : (stored.marathonTargetDate ?? existing?.targetDate);
    const nextSettings = { ...patch, marathonTargetDate: keptDate };
    const merged = { ...stored, ...nextSettings };
    const rebuilt = buildMarathonGoal(merged.marathonRaceType, merged.marathonTargetDate, merged.marathonTargetTimeMinutes);
    const goal = rebuilt ? (existing ? { ...existing, ...rebuilt, id: existing.id, createdAt: existing.createdAt } : rebuilt) : undefined;
    const dateChanged = 'marathonTargetDate' in patch && patch.marathonTargetDate !== (existing?.targetDate ?? stored.marathonTargetDate);
    return planHorizonChangeImpl({
      title: dateChanged
        ? (patch.marathonTargetDate ? `Wedstrijddatum naar ${formatDateNL(patch.marathonTargetDate)}` : 'Marathon zonder datum')
        : 'Marathondoel: zo verandert je planning',
      why: dateChanged ? 'Volgt je nieuwe wedstrijddatum.' : 'Volgt je marathondoel.',
      explanation: 'Je wedstrijd bepaalt een blok in je planning. Een andere datum of afstand verandert je planning nooit ongemerkt: je ziet eerst wat er verandert; pas na jouw Akkoord gebeurt er iets. Wat je al deed en zelf vastzette, blijft staan.',
      trigger: 'goal_changed',
      settings: nextSettings,
      ...(goal ? { goals: [goal] } : {}),
    });
  }, [planHorizonChangeImpl]);

  // Phase 7 — mirrors runForecastReplan's own persistence pattern (reads
  // repos directly for the freshest possible inputStateHash check, rather
  // than trusting React state that may lag one render behind an in-flight
  // mutation). committedWeekChanges only ever contains 'keep' entries
  // (engine/goalActivation.ts) — a no-op for applyPlanChangeItems — so
  // there is nothing to persist on PlannedSession itself here, only the
  // goal draft and the append-only audit record.
  const activateGoal = useCallback(
    async (plan: GoalActivationPlan, horizon?: HorizonPlan): Promise<GoalActivationResult> => {
      const [logs, manualEvidence, planned] = await Promise.all([
        SessionLogsRepo.getAll(),
        CapabilityEvidenceRepo.getAll(),
        PlannedSessionsRepo.getAll(),
      ]);
      const allEvidence = [...extractEvidenceFromLogs(logs), ...manualEvidence];
      const currentHash = computeInputStateHash({ goalDraft: plan.goalDraft, allEvidence, plannedSessions: planned });
      const result = applyGoalActivationPlan(plan, currentHash, planned);
      if (!result.applied) return { applied: false, reason: result.reason };

      // What the new goal does to your planning is a proposal first (Warden
      // Logica punt 1): the wizard shows it, and only with Akkoord it is stored.
      if (!horizon) {
        // The planning not answering is an outcome too, never a wizard that
        // hangs (Warden Planning punt 1).
        const proposal = await planHorizonChangeImpl({
          title: `${plan.goalDraft.name || 'Je doel'}: zo verandert je planning`,
          why: 'Volgt je doel.',
          explanation: 'Een doel bepaalt de fasen van je planning en de dag waarop het eindigt. Je ziet eerst wat er verandert; pas na jouw Akkoord gebeurt er iets. Wat je al deed en zelf vastzette, blijft staan.',
          trigger: plan.goalDraft.createdAt === plan.goalDraft.updatedAt ? 'goal_created' : 'goal_changed',
          goals: [plan.goalDraft],
        }).catch(() => null);
        if (!proposal) return { applied: false, reason: 'failed' };
        if (proposal.proposal.changes.length > 0 || proposal.lengths.length > 0) return { applied: false, reason: 'review', horizon: proposal };
        horizon = proposal;
      }
      const status = await applyHorizonPlanImpl(horizon).catch((): HorizonApplyStatus => 'failed');
      if (status === 'stale') return { applied: false, reason: 'stale' };
      if (status === 'failed') return { applied: false, reason: 'failed' };
      if (status === 'pending') return { applied: false, reason: 'pending' };
      await PlanChangeProposalsRepo.put({ ...plan.committedWeekChanges, resolvedAt: new Date().toISOString(), resolution: 'accepted' });
      return { applied: true, ...(status === 'partial' ? { reason: 'partial' as const } : {}) };
    },
    [planHorizonChangeImpl, applyHorizonPlanImpl],
  );

  // Stores the date last checked off, not a boolean — so the box reads as
  // unchecked again the moment todayISO() rolls over to a new day, with no
  // separate reset step needed.
  const toggleStretchRoutine = useCallback(
    async (kind: keyof StretchCompletion) => {
      const today = todayISO();
      const isDoneToday = stretchCompletion[kind] === today;
      const next = await StretchCompletionRepo.set({ [kind]: isDoneToday ? undefined : today });
      setStretchCompletion(next);
    },
    [stretchCompletion],
  );

  const addInjury = useCallback(
    async (input: Omit<InjuryNote, 'id'>) => {
      await InjuryNotesRepo.put({ ...input, id: makeId('injury') });
      await refresh();
    },
    [refresh],
  );

  // Resolving is a status change, not a historical rewrite (see
  // models/injury.ts) — unlike SessionLog this store is fine to update in
  // place.
  const resolveInjury = useCallback(
    async (id: string) => {
      const note = injuryNotes.find((n) => n.id === id);
      if (!note) return;
      await InjuryNotesRepo.put({ ...note, resolvedDate: todayISO() });
      await refresh();
    },
    [injuryNotes, refresh],
  );

  const deleteInjury = useCallback(
    async (id: string) => {
      await InjuryNotesRepo.delete(id);
      await refresh();
    },
    [refresh],
  );

  // Targeted baseline questions (Algorithm Contract v0.2 §27) — manual
  // evidence, never a fake SessionLog (§5.4). Always evidenceType:'manual',
  // source:'manualEntry'; the caller (a baseline-entry form) only ever
  // supplies the measured value/date/key.
  const addManualCapabilityEvidence = useCallback(
    async (input: Omit<CapabilityEvidence, 'id' | 'evidenceType' | 'source'>) => {
      await CapabilityEvidenceRepo.put({ ...input, id: makeId('evidence'), evidenceType: 'manual', source: 'manualEntry' });
      await refresh();
    },
    [refresh],
  );

  const deleteCapabilityEvidence = useCallback(
    async (id: string) => {
      await CapabilityEvidenceRepo.delete(id);
      await refresh();
    },
    [refresh],
  );

  // "Geen tijd vandaag" — proposeNoTimeToday returns one ScheduleProposal
  // per session still due today (each already resolved against the others,
  // since the engine threads a simulated week through the loop), for the UI
  // to merge into a single confirmation and apply as one batch.
  const proposeNoTimeTodayAction = useCallback((): ScheduleProposal[] => {
    const today = todayISO();
    const week = sessionsForWeek(mondayOfWeek(today));
    return proposeNoTimeToday(week, templates, today, sessionLogs, program, goalEngineConfig.availability.dailyTimeBudget, goalEngineConfig.strategy.sameDayPairingPreference);
  }, [sessionsForWeek, templates, sessionLogs, program, goalEngineConfig]);

  // Mirrors applyProposal's move semantics, plus the scheduler's
  // "no free day left" fallback (a same-date no-op change) which reads as a
  // skip rather than a move.
  const applyNoTimeToday = useCallback(
    async (proposals: ScheduleProposal[]) => {
      await planSettled();
      const lock = { by: 'user' as const, at: new Date().toISOString() };
      const stored = await PlannedSessionsRepo.getAll();
      for (const proposal of proposals) {
        for (const change of proposal.changes) {
          const session = stored.find((s) => s.id === change.sessionId);
          if (!session) continue;
          if (proposal.resolved && change.toDate !== change.fromDate) {
            await PlannedSessionsRepo.put({
              ...session,
              scheduledDate: change.toDate,
              status: 'moved',
              movedFromDate: session.movedFromDate ?? change.fromDate,
              lock,
            });
          } else {
            await PlannedSessionsRepo.put({ ...skipSessionEngine(session), lock });
          }
        }
      }
      planRevision++;
      await refresh();
    },
    [refresh],
  );

  // The rest of the planning run over the week a proposal gives, exactly as
  // the sync runs it after Akkoord (engine/planPass.ts): for the preview.
  const planPreviewPass = useCallback((sessions: PlannedSession[], leave?: LeavePeriod[], restDayOverride?: number): PlannedSession[] => {
    const today = todayISO();
    const anchor = planEndDay(trainingGoals, goalMilestones, today, settings.afterMainGoal);
    const ladder = new Set(goalMilestones.map((m) => m.goalId));
    const mainGoalId = mainGoal(trainingGoals, ladder)?.id;
    const restDay = restDayOverride ?? settings.restDay ?? 1;
    let n = 0;
    const periods = leave ?? settings.leavePeriods;
    // The weeks near, and the weeks of a period further away.
    const until = [addDays(today, 28), ...(periods ?? []).map((p) => addDays(p.endDate, 21))].sort().pop()!;
    return previewPlanPass(sessions, {
      today, logs: sessionLogs, templates, program, blocks: raceBlocks(trainingGoals, mainGoalId, anchor, today), afterGoals: afterGoalWindows(trainingGoals, mainGoalId, anchor, today), restDay, goalDay: anchor,
      dailyTimeBudget: goalEngineConfig.availability.dailyTimeBudget, sameDayPairingPreference: goalEngineConfig.strategy.sameDayPairingPreference,
      slotDays: patternDays(templates, settings, restDay),
      minutesOf: (s, t) => resolveVariantDuration(t, 'full', s.scheduledDate, program),
      newId: () => `preview-pass-${n++}`,
      until,
      leave: periods, hikingEnabled: isSportEnabled('hiking', settings.enabledSports), trekRest: settings.trekLegRest,
    });
  }, [trainingGoals, goalMilestones, settings, sessionLogs, templates, program, goalEngineConfig]);

  // Vrije dagen, vakanties en tochten: the proposal for adding or removing a
  // period (engine/leaveProposal.ts), computed with the same planning run as
  // the sync. Nothing is stored until Akkoord (applyLeave).
  const leavePeriods = useMemo(() => sortPeriods(settings.leavePeriods ?? []), [settings.leavePeriods]);
  const planLeave = useCallback((mode: 'add' | 'remove', period: LeavePeriod, replaces?: LeavePeriod): LeavePlan => {
    const today = todayISO();
    const anchor = planEndDay(trainingGoals, goalMilestones, today, settings.afterMainGoal);
    const ladder = new Set(goalMilestones.map((m) => m.goalId));
    const mainGoalId = mainGoal(trainingGoals, ladder)?.id;
    const restDay = settings.restDay ?? 1;
    const blocks = raceBlocks(trainingGoals, mainGoalId, anchor, today);
    const slotDays = patternDays(templates, settings, restDay);
    return planLeaveChange({
      mode, period, replaces, existing: settings.leavePeriods ?? [], sessions: plannedSessions, logs: sessionLogs, templates, today,
      context: (periods) => {
        let n = 0;
        return {
          today, logs: sessionLogs, templates, program, blocks, afterGoals: afterGoalWindows(trainingGoals, mainGoalId, anchor, today), restDay, goalDay: anchor,
          dailyTimeBudget: goalEngineConfig.availability.dailyTimeBudget, sameDayPairingPreference: goalEngineConfig.strategy.sameDayPairingPreference,
          slotDays,
          minutesOf: (s, t) => resolveVariantDuration(t, 'full', s.scheduledDate, program),
          newId: () => `leave-${n++}`,
          until: addDays(replaces && replaces.endDate > period.endDate ? replaces.endDate : period.endDate, 21),
          leave: periods, hikingEnabled: isSportEnabled('hiking', settings.enabledSports), trekRest: settings.trekLegRest,
        };
      },
    });
  }, [trainingGoals, goalMilestones, settings, plannedSessions, sessionLogs, templates, program, goalEngineConfig]);

  const applyLeave = useCallback(async (plan: LeavePlan) => {
    await planSettled();
    const stored = await SettingsRepo.get();
    const current = stored.leavePeriods ?? [];
    const after = plan.mode === 'add' ? [...current.filter((p) => p.id !== plan.period.id), plan.period] : current.filter((p) => p.id !== plan.period.id);
    setSettings(await SettingsRepo.set({ leavePeriods: sortPeriods(after) }));
    // Undo puts the periods back exactly as they were, with the planning.
    const restore = { settings: { leavePeriods: current } };
    if (!(await commitPlanChange(plan.proposal, plan.proposal.issue, restore))) await showStatusOnlyChange(plan.proposal, restore);
  }, [commitPlanChange, showStatusOnlyChange]);

  // Rustdag: the proposal for another rest day (engine/restDayProposal.ts),
  // with the same planning run as the sync. Nothing is stored until Akkoord.
  const planRestDay = useCallback((restDay: number): RestDayPlan => {
    const today = todayISO();
    const anchor = planEndDay(trainingGoals, goalMilestones, today, settings.afterMainGoal);
    const ladder = new Set(goalMilestones.map((m) => m.goalId));
    const mainGoalId = mainGoal(trainingGoals, ladder)?.id;
    let n = 0;
    return planRestDayChange({
      restDay, sessions: plannedSessions, logs: sessionLogs, templates, today, anchor,
      context: {
        today, logs: sessionLogs, templates, program, blocks: raceBlocks(trainingGoals, mainGoalId, anchor, today), afterGoals: afterGoalWindows(trainingGoals, mainGoalId, anchor, today), restDay, goalDay: anchor,
        dailyTimeBudget: goalEngineConfig.availability.dailyTimeBudget, sameDayPairingPreference: goalEngineConfig.strategy.sameDayPairingPreference,
        slotDays: patternDays(templates, settings, restDay),
        minutesOf: (s, t) => resolveVariantDuration(t, 'full', s.scheduledDate, program),
        newId: () => `restday-${n++}`,
        leave: settings.leavePeriods, hikingEnabled: isSportEnabled('hiking', settings.enabledSports), trekRest: settings.trekLegRest,
      },
    });
  }, [trainingGoals, goalMilestones, settings, plannedSessions, sessionLogs, templates, program, goalEngineConfig]);

  const applyRestDay = useCallback(async (plan: RestDayPlan) => {
    await planSettled();
    const stored = await SettingsRepo.get();
    const restore = { settings: { restDay: stored.restDay } };
    // The rest day and its layout go together: first the layout, then the rest
    // day, so a layout that could not be stored never leaves a rest day without
    // it; the sync after it does not lay the week out again.
    await applyRestDayInOrder(plan, {
      commit: (afterWrites) => commitPlanChange(plan.proposal, plan.proposal.issue, restore, afterWrites),
      storeRestDay: async (day) => {
        setSettings(await SettingsRepo.set({ restDay: day as AppSettings['restDay'] }));
        await MetaRepo.set('appliedRestDay', day);
      },
      showUnchanged: () => showStatusOnlyChange(plan.proposal, restore),
    });
  }, [commitPlanChange, showStatusOnlyChange]);

  // What the extra training of the week is chosen from (engine/extraRun.ts).
  const extraSessionContext = useMemo(() => {
    const today = todayISO();
    const anchor = planEndDay(trainingGoals, goalMilestones, today, settings.afterMainGoal);
    const ladder = new Set(goalMilestones.map((m) => m.goalId));
    const mainGoalId = mainGoal(trainingGoals, ladder)?.id;
    return {
      gaps: rankFocusGaps(goalOverviews),
      races: raceBlocks(trainingGoals, mainGoalId, anchor, today),
      ambition: settings.ambition,
      anchor,
      restDay: settings.restDay,
      planChangeLog,
      leave: settings.leavePeriods,
    };
  }, [trainingGoals, goalMilestones, goalOverviews, settings.ambition, settings.restDay, settings.leavePeriods, settings.afterMainGoal, planChangeLog]);

  const weather = useWeatherForecast(settings.homeLocation, !loading && needsWeather(settings.overviews));
  useFollowLocation(settings, updateSettings, !loading);

  const answeredAdviceIds = useMemo(() => new Set(Object.keys(adviceResponses)), [adviceResponses]);
  const advice = useMemo(
    // Proposals you kept turning down come last (engine/learning.ts).
    () => learnFromDeclines([
      ...(plannerAdvice && !adviceResponses[plannerAdvice.id] ? [plannerAdvice] : []),
      ...computeAdvice({
        logs: sessionLogs,
        plannedSessions,
        templates,
        injuries: injuryNotes,
        program,
        dailyTimeBudget: goalEngineConfig.availability.dailyTimeBudget,
        sameDayPairingPreference: goalEngineConfig.strategy.sameDayPairingPreference,
        enabledSports: settings.enabledSports,
        respondedIds: new Set(Object.keys(adviceResponses)),
        asOf: todayISO(),
        illnessEpisodes: settings.illnessEpisodes,
        checkIns: settings.morningCheckIns,
        legEase: resolveLegEase({ legEase: settings.legEase }),
        testJudgments: settings.testJudgments,
        askDoubtTest: settings.askDoubtTest !== false,
        proposeTargetTime: settings.proposeTargetTime !== false,
        newTestOnStops: settings.newTestOnStops !== false,
        leave: settings.leavePeriods,
        removedByPlanIds: new Set(planChangeLog.filter((p) => p.resolution === 'accepted').flatMap((p) => p.changes.filter((c) => c.action === 'remove' && c.plannedSessionId).map((c) => c.plannedSessionId!))),
        extraSession: extraSessionContext,
        tentPack: tentPackProposal(trainingGoals, new Set(goalMilestones.map((m) => m.goalId))),
        raceGoals: extraSessionContext.races,
        weather: weather.forecast && showWeatherSwap(settings.overviews) ? { forecast: weather.forecast, now: new Date(), leave: settings.leavePeriods } : undefined,
      }),
    ].sort((a, b) => b.priority - a.priority), declinedRules(adviceResponses, todayISO())),
    [plannerAdvice, sessionLogs, plannedSessions, templates, injuryNotes, program, goalEngineConfig, settings.enabledSports, settings.illnessEpisodes, settings.morningCheckIns, settings.legEase, settings.testJudgments, settings.askDoubtTest, settings.proposeTargetTime, settings.newTestOnStops, adviceResponses, planChangeLog, extraSessionContext, trainingGoals, goalMilestones, weather.forecast, settings.leavePeriods, settings.overviews],
  );

  // The week check over the week you look at, with what is yours reported too (rule WEEK-CHECK).
  // Two steps so drawing never waits: `weekNoticeFor` gives the concerns at once (about 10 ms), and
  // `weekFixesFor` works out the proposals (a few hundred milliseconds) only when you ask for them in Week
  // ("Bekijk voorstel"). Never throws: a failure leaves Week with its plain list.
  const weekNoticeCache = useRef<{ key: unknown[]; quick: Map<string, WeekNotice>; full: Map<string, WeekNotice> } | null>(null);
  const weekCheckInput = useCallback(() => {
    const today = todayISO();
    const anchor = planEndDay(trainingGoals, goalMilestones, today, settings.afterMainGoal);
    const ladder = new Set(goalMilestones.map((m) => m.goalId));
    const mainGoalId = mainGoal(trainingGoals, ladder)?.id;
    const restDay = settings.restDay ?? 1;
    const blocks = raceBlocks(trainingGoals, mainGoalId, anchor, today);
    return {
      sessions: plannedSessions, logs: sessionLogs, templates, today, restDay, goalDay: anchor,
      raceDays: blocks.map((b) => b.raceDate), afterGoals: afterGoalWindows(trainingGoals, mainGoalId, anchor, today), program,
      dailyTimeBudget: goalEngineConfig.availability.dailyTimeBudget, sameDayPairingPreference: goalEngineConfig.strategy.sameDayPairingPreference,
      slotDays: patternDays(templates, settings, restDay),
      minutesOf: (s: PlannedSession, t: SessionTemplate) => resolveVariantDuration(t, 'full', s.scheduledDate, program),
      leave: settings.leavePeriods, trekRest: settings.trekLegRest,
    };
  }, [trainingGoals, goalMilestones, settings, plannedSessions, sessionLogs, templates, program, goalEngineConfig]);
  const weekNoticeState = useCallback((): NonNullable<typeof weekNoticeCache.current> => {
    const key = [weekCheckInput, advice];
    if (!weekNoticeCache.current || weekNoticeCache.current.key.some((v, i) => v !== key[i])) weekNoticeCache.current = { key, quick: new Map(), full: new Map() };
    return weekNoticeCache.current;
  }, [weekCheckInput, advice]);
  const weekNoticeFor = useCallback((weekStart: string): WeekNotice => {
    const state = weekNoticeState();
    const cached = state.quick.get(weekStart);
    if (cached) return cached;
    try {
      const result = weekNoticeConcerns(weekCheckInput(), weekStart, adviceSessionIds(advice));
      state.quick.set(weekStart, result);
      return result;
    } catch (err) {
      console.error('De weekmelding kon niet worden berekend:', err);
      return { concerns: [], fixes: {}, covered: [] };
    }
  }, [weekNoticeState, weekCheckInput, advice]);
  const weekFixesFor = useCallback((weekStart: string): WeekNotice => {
    const state = weekNoticeState();
    const cached = state.full.get(weekStart);
    if (cached) return cached;
    const result = weekNotice(weekCheckInput(), weekStart, settings.weekFixProposal !== false, adviceSessionIds(advice));
    state.full.set(weekStart, result);
    return result;
  }, [weekNoticeState, weekCheckInput, advice, settings.weekFixProposal]);

  // The proposal to move a test after what you noted about the evening before. Its own memo
  // so the coach advice above stays as it was; the answer is kept like any advice response.
  const influenceMoveNow = useMemo(() => {
    const today = todayISO();
    const cause = influenceMoveCause({ today, plannedSessions, logs: sessionLogs, entries: settings.influences ?? [], enabled: settings.influenceTestMove !== false });
    return influenceMove({
      logs: sessionLogs,
      plannedSessions,
      templates,
      injuries: injuryNotes,
      program,
      dailyTimeBudget: goalEngineConfig.availability.dailyTimeBudget,
      sameDayPairingPreference: goalEngineConfig.strategy.sameDayPairingPreference,
      enabledSports: settings.enabledSports,
      respondedIds: new Set(Object.keys(adviceResponses)),
      asOf: today,
      illnessEpisodes: settings.illnessEpisodes,
    }, cause);
  }, [plannedSessions, sessionLogs, templates, injuryNotes, program, goalEngineConfig, settings.influences, settings.influenceTestMove, settings.enabledSports, settings.illnessEpisodes, adviceResponses]);

  const value: AppData = {
    loading,
    bootError,
    bootStep,
    bootMigration,
    storageNotice,
    reportStorageError,
    dismissStorageNotice: () => setStorageNotice(null),
    program,
    templates,
    plannedSessions,
    sessionLogs,
    trainingGoals,
    goalMilestones,
    goalMilestoneProgress,
    injuryNotes,
    capabilityEvidence,
    goalEngineConfig,
    settings,
    weather,
    stretchCompletion,
    templateById,
    goalOverviews,
    refresh,
    sessionsForWeek,
    logSession,
    announceSaved,
    undoLog,
    setLogFeedback,
    alignWithWatch,
    restoreFromWatch,
    trimWatchActivity,
    undoTrimWatchActivity,
    restoreSourceUpdate,
    takeOverSourceNumbers,
    takeOverFromMacroFactor,
    restoreFromMacroFactor,
    setLogWorkout,
    planWeekLoadChange,
    moveSession,
    suggestMoves,
    applyProposal,
    proposeSkip,
    proposeBackOnPlan,
    clearMilestoneManually,
    updateGoal,
    planGoalRole,
    planGoalPriority,
    setGoalOrder,
    archiveGoal,
    unarchiveGoal,
    activateGoal,
    updateSettings,
    updateGoalEngineConfig,
    planMarathonGoal,
    toggleStretchRoutine,
    addInjury,
    resolveInjury,
    deleteInjury,
    addManualCapabilityEvidence,
    deleteCapabilityEvidence,
    proposeNoTimeToday: proposeNoTimeTodayAction,
    applyNoTimeToday,
    exportData: async () => {
      const envelope = await buildBackupEnvelope();
      const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: 'application/json' });
      const result = await webBackupFileAdapter.saveBackup(blob, backupFileName(envelope.createdAt));
      if (!result.success) return null;
      await updateSettings({ lastExportedAt: new Date().toISOString() });
      return result.viaDownload ? 'downloaded' : 'saved';
    },
    resetDemoData: async () => {
      // The coming trainings leave the intervals.icu agenda first (storage/watchWorkouts.ts).
      await resetAllDataAndAgenda();
      await migrateToGoalEngine();
      await syncGr5MilestoneDefinitions();
      await migrateStrengthProgramDefault();
      await refresh();
    },
    resetSchedule: async (startFrom) => {
      await resetScheduleToDefault(startFrom);
      await refresh();
    },
    restartProgram: async (startFrom, mode) => {
      const weekOne = startFrom === 'this_week' ? 'Deze week is nu week 1.' : 'Volgende week wordt week 1.';
      if (mode === 'count_only') {
        await restartProgramAtWeekOne(startFrom);
        await refresh();
        return `${weekOne} Je planning is niet veranderd.`;
      }
      const appSettings = await SettingsRepo.get();
      const enabled = { ...DEFAULT_ENABLED_SPORTS, ...appSettings.enabledSports };
      await rebuildPlanningFromWeekOne(startFrom, (tpls) => weeklyPatternTemplates(tpls, { ...appSettings, enabledSports: enabled }));
      const lines = [`${weekOne} De planning is vanaf daar opnieuw opgebouwd; eigen verplaatsingen daarna zijn vervallen, je geschiedenis is bewaard.`];
      const active = activeStrengthStrategy(await StrengthProgramStrategiesRepo.getAll());
      if (active) {
        await applyStrengthPlacementToCommittedRange(active);
        await activateStrengthProgram(active);
        lines.push(`Je krachtblok is toegepast (${active.sessionsPerWeek}x per week).`);
      }
      // Sports with a number per week: bring every week to that number.
      for (const sport of fixedFrequencySports({ ...appSettings, enabledSports: enabled })) {
        const perWeek = appSettings.sportFrequency![sport]!;
        const [planned, tpls, logs, engineConfig, programs] = await Promise.all([
          PlannedSessionsRepo.getAll(), SessionTemplatesRepo.getAll(), SessionLogsRepo.getAll(), GoalEngineConfigRepo.get(), ProgramsRepo.getAll(),
        ]);
        const { proposal, shortWeeks } = computeSportFrequencyPlan({
          sport, perWeek, plannedSessions: planned, templates: tpls, sessionLogs: logs, program: programs[0] ?? null,
          dailyTimeBudget: engineConfig.availability.dailyTimeBudget, sameDayPairingPreference: engineConfig.strategy.sameDayPairingPreference, asOf: todayISO(),
        });
        await commitPlanChange(proposal, proposal.issue);
        lines.push(`${SPORT_LABEL[sport]}: ${perWeek}x per week${shortWeeks > 0 ? `, past in ${shortWeeks} ${shortWeeks === 1 ? 'week' : 'weken'} niet` : ''}.`);
      }
      const off = (Object.keys(enabled) as Sport[]).filter((sport) => !enabled[sport]).map((sport) => SPORT_LABEL[sport]);
      if (off.length > 0) lines.push(`Niet ingepland omdat het uit staat: ${off.join(', ')}.`);
      await runWeeklyPrescriptionBuild();
      await refresh();
      return lines.join(' ');
    },
    rebuildRecommendations,
    celebration,
    dismissCelebration: () => setCelebration(null),
    forecastSummary,
    dismissForecastSummary: () => setForecastSummary(null),
    planChangeLog,
    advice,
    influenceMove: influenceMoveNow,
    answeredAdviceIds,
    planPreviewPass,
    weekNoticeFor,
    weekFixesFor,
    leavePeriods,
    planLeave,
    applyLeave,
    planRestDay,
    applyRestDay,
    planGoalChange,
    planHorizonChange: planHorizonChangeImpl,
    applyHorizonPlan: applyHorizonPlanImpl,
    respondToAdvice,
    debriefLogId,
    dismissDebrief: () => setDebriefLogId(null),
    recentChange,
    commitPlanChange,
    undoRecentChange,
    saveInfluence,
    saveSweat,
    saveSweatPre,
    removeInfluence,
    clearInfluences,
    planIllness,
    applyIllness,
    dismissRecentChange: () => setRecentChange(null),
    strengthProgramStrategies,
    strengthExternal,
    setStrengthExternal,
    strengthRecommendation,
    activateStrengthProgram,
    applyStrengthPlacementToCommittedRange,
    applyScheduleAnomalyFix,
    reportStrengthSchemaEnded,
    resolveStrengthRecommendation,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppData {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider');
  return ctx;
}

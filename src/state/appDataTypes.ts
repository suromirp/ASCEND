// De vorm van wat useAppData geeft, en de invoer van een paar acties. Alleen typen.

import type { Program } from '../models/program';
import type { PlannedSession, SessionLog, SessionTemplate, SessionVariant } from '../models/training';
import type { TrainingGoal, GoalMilestone, GoalMilestoneProgress, GoalPriority } from '../models/goals';
import type { InjuryNote } from '../models/injury';
import type { CapabilityEvidence } from '../models/capability';
import type { StrengthProgramStrategy, StrengthProgramRecommendation } from '../models/strengthProgram';
import type { GoalEngineConfig } from '../models/goalEngineConfig';
import type { CelebrationEvent } from '../components/CompletionMoment';
import type { AppSettings, StretchCompletion } from '../storage/database';
import type { WeekLoadKind } from '../storage/weekLoadPlan';
import type { ScheduleProposal } from '../engine/scheduler';
import type { MissedMemory, ResolvedMissedMemory } from '../engine/missedTraining';
import type { IllnessChange, IllnessPlan } from '../engine/illness';
import type { LeavePeriod } from '../models/leave';
import type { LeavePlan } from '../engine/leaveProposal';
import type { RestDayPlan } from '../engine/restDayProposal';
import type { MoveSuggestion } from '../engine/moveSuggestions';
import type { DayVerdict, MoveDecision } from '../engine/weekDrag';
import type { SwapOption } from '../engine/weekSwap';
import type { HorizonApplyStatus, HorizonChangeInput, HorizonPlan } from '../storage/horizonPlan';
import type { Advice } from '../engine/adviceEngine';
import type { InfluenceMove } from '../engine/influenceProposal';
import type { WeatherView } from './useWeather';
import type { FeedbackPatch } from '../engine/autoTick';
import type { SavedMoment } from '../engine/savedMoments';
import type { AlignRequest } from '../storage/watchAlign';
import type { StreamSet } from '../models/activityDetail';
import type { TakeoverRequest } from '../storage/macrofactorLead';
import type { BootStep } from '../engine/bootWatch';
import type { GoalActivationPlan, PlanChangeProposal, RecentPlanChange } from '../models/planChange';
import type { GoalOverview } from '../engine/goalOverview';
import type { InfluenceEntry } from '../models/influence';
import type { SweatEntry } from '../models/sweat';
import type { NoteTarget } from '../engine/influence';
import type { WeekNotice } from '../engine/weekFixProposal';
import type { StoredResponse } from '../engine/learning';

export type AdviceResponse = StoredResponse;

export type MarathonGoalPatch = Partial<Pick<AppSettings, 'marathonRaceType' | 'marathonTargetDate' | 'marathonTargetTimeMinutes'>>;
export interface GoalActivationResult {
  applied: boolean;
  reason?: 'stale' | 'review' | 'failed' | 'pending' | 'partial';
  horizon?: HorizonPlan;
}

// What committing an accepted proposal came to: applied, nothing to do, or could not (the plan changed).
export type CommitOutcome = 'applied' | 'nothing' | 'stale';

export interface AppData {
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
  // Training die niet doorging (engine/missedTraining.ts): op overgeslagen zetten, op je antwoord
  // ("Niet gedaan") of vanzelf ("Zelf overslaan"), en een log van het horloge of MacroFactor na Akkoord
  // aan een geplande training koppelen. Elk met een melding en Ongedaan maken; er komt nooit een log bij.
  // Resolve to how many were skipped, and whether the link was written.
  skipMissed: (sessionIds: string[], how: 'answer' | 'auto') => Promise<number>;
  linkMissedLog: (logId: string, sessionId: string) => Promise<boolean>;
  // Wat dit toestel onthoudt van je antwoorden op die kaart (Niet nu, Liever niet, wat ASCEND zelf
  // oversloeg). Null tot het gelezen is. Het inhaaladvies leest hieruit welke koppelingen je afwees.
  missedMemory: ResolvedMissedMemory | null;
  rememberMissed: (change: (m: ResolvedMissedMemory) => MissedMemory) => void;
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
  // Slepen in Week (engine/weekDrag.ts): what each day of the week says about this training, and
  // the new week concerns a move to a day would cause (skipRules: those the day already says itself).
  dragVerdicts: (sessionId: string, weekStart: string) => DayVerdict[];
  previewDrop: (sessionId: string, date: string, skipRules?: string[]) => string[];
  // Geeft deze plek twee zware beendagen achter elkaar die de regels niet als botsing zien? Dan vraagt
  // Week eerst "Toch hier?" (engine/weekDrag.ts#legsCloseAfterMove).
  legsCloseAt: (sessionId: string, date: string) => boolean;
  // Twee trainingen van één week ruilen van dag (engine/weekSwap.ts): het besluit (meteen, vragen of niet)
  // en de trainingen waarmee deze kan ruilen, voor het actieblad in Week.
  proposeSwap: (sessionId: string, otherId: string) => MoveDecision;
  swapOptionsFor: (sessionId: string) => SwapOption[];
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
  // Een handeling die niet lukte, als melding zonder Ongedaan maken (bijvoorbeeld een ruil die niet kon).
  showFailure: (title: string, line: string) => void;
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
  // 'stale': the planning changed since the proposal was made; nothing was stored.
  applyLeave: (plan: LeavePlan) => Promise<'applied' | 'stale'>;
  // Only another note on a period: the planning does not change, so it is stored
  // at once, with Ongedaan maken in the notice (engine/leaveEdit.ts).
  saveLeaveNote: (periodId: string, note: string) => Promise<void>;
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
  // A sport that counts (engine/sportTemplate.ts): swimming, padel, football.
  countedSport?: SessionLog['countedSport'];
  customSport?: SessionLog['customSport'];
  variant: SessionVariant;
  durationMinutes: number;
  rpe?: number;
  // The RPE was preselected and not touched (engine/sessionLoad.ts).
  rpeAssumed?: SessionLog['rpeAssumed'];
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
  fileDurationMinutes?: SessionLog['fileDurationMinutes'];
  // Het verloop van de training in Forge; alleen bij het maken van het log (engine/forgeLog.ts).
  forgeLog?: SessionLog['forgeLog'];
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

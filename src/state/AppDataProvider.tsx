// De provider van de app: alle gegevens en acties in een context. De acties staan per onderwerp
// in eigen hooks, die hier in vaste volgorde worden aangeroepen.

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Program } from '../models/program';
import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import type { TrainingGoal, GoalMilestone, GoalMilestoneProgress } from '../models/goals';
import type { InjuryNote } from '../models/injury';
import type { CapabilityEvidence } from '../models/capability';
import type { StrengthProgramStrategy, StrengthProgramRecommendation } from '../models/strengthProgram';
import { DEFAULT_GOAL_ENGINE_CONFIG, type GoalEngineConfig } from '../models/goalEngineConfig';
import type { CelebrationEvent } from '../components/CompletionMoment';
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
import { tidyOldProposals } from '../storage/proposalTidy';
import { noteBackupMade } from '../storage/autoBackup';
import { withPlausibleDurations } from '../engine/logDuration';
import { describeWriteError } from '../storage/storageError';
import { syncGr5MilestoneDefinitions } from '../storage/goalMilestoneSync';
import { goalDetailsOf } from '../engine/goalLabels';
import { updateMissedMemory } from '../storage/missedTraining';
import { resolveMissedMemory, MISSED_MEMORY_KEY, type MissedMemory, type ResolvedMissedMemory } from '../engine/missedTraining';
import { extractEvidenceFromLogs } from '../engine/capability';
import { carryTargetTimeAnswers, type Advice } from '../engine/adviceEngine';
import { resetAllDataAndAgenda } from '../storage/watchWorkouts';
import type { BootStep } from '../engine/bootWatch';
import { weeklyPatternTemplates, fixedFrequencySports, DEFAULT_ENABLED_SPORTS, SPORT_LABEL, type Sport } from '../engine/sports';
import { computeSportFrequencyPlan } from '../engine/sportFrequency';
import type { PlanChangeProposal, RecentPlanChange } from '../models/planChange';
import { computeActiveGoalOverviews } from '../engine/goalOverview';
import { activeStrengthStrategy } from '../engine/strengthProgram';
import { mondayOfWeek, todayISO } from '../utils/dates';
import { withProgramExercises } from '../engine/macrofactorProgram';
import { withCountingSports } from '../engine/sportTemplate';
import { makeId } from '../utils/id';
import { buildBackupEnvelope, backupFileName } from '../storage/backup';
import { webBackupFileAdapter } from '../storage/backupFileAdapter';
import { runManualBackup } from '../storage/manualBackup';
import { AppDataContext } from './useAppData';
import type { AdviceResponse, AppData } from './appDataTypes';
import { bootMigrationListeners, currentBootMigration, useBoot } from './boot';
import {
  clearPendingRepairs,
  takeSyncTouched,
  failureNotice,
  pendingRepairs,
  primePlanningRegisters,
  setPlanningRegisters,
  syncChannel,
  syncProgramHorizonWhenChanged,
  useRefreshFromOtherWindows,
} from './planningSync';
import { usePlanChangeActions } from './planChangeActions';
import { useStrengthAndReplan } from './strengthAndReplan';
import { useLogActions, useWatchAndSourceActions } from './logActions';
import { useWeekReplanActions } from './weekReplanActions';
import { useMoveActions } from './moveActions';
import { useGoalActions } from './goalActions';
import { useNotesAndIllness } from './notesAndIllness';
import { useHorizonActions } from './horizonActions';
import { useBodyAndLeave } from './bodyAndLeave';
import { useAdviceAndWeek } from './adviceAndWeek';
import { snapshotWritten } from '../storage/undoPlanChange';
import { refreshWritten } from '../engine/undoGuard';
import { onHealthWeightChange } from '../storage/healthConnect';

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
  // A sport that counts (swimming, padel, football) has a derived template while it counts
  // (engine/sportTemplate.ts): its logs then count in the leg index and the week check like any training.
  const { sportHandling, sportCounting, customSports } = settings;
  const templates = useMemo(
    () => withCountingSports(withProgramExercises(storedTemplates, strengthProgram, todayISO()), { sportHandling, sportCounting, customSports }),
    [storedTemplates, strengthProgram, sportHandling, sportCounting, customSports],
  );
  const [stretchCompletion, setStretchCompletion] = useState<StretchCompletion>({});
  const [celebration, setCelebration] = useState<CelebrationEvent | null>(null);
  const [forecastSummary, setForecastSummary] = useState<string | null>(null);
  const [recentChange, setRecentChange] = useState<RecentPlanChange | null>(null);
  const [planChangeLog, setPlanChangeLog] = useState<PlanChangeProposal[]>([]);
  const [adviceResponses, setAdviceResponses] = useState<Record<string, AdviceResponse>>({});
  const [missedMemory, setMissedMemory] = useState<ResolvedMissedMemory | null>(null);
  // Volgnummer van de laatste rememberMissed en hoeveel schrijfacties nog lopen: een lezing in loadState die
  // begon voor een antwoord, of terwijl het nog geschreven wordt, mag dat antwoord niet overschrijven.
  const missedSeq = useRef(0);
  const missedWriting = useRef(0);
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
    const missedSeqAtRead = missedSeq.current;
    const [programs, tpls, planned, storedLogs, goals, milestones, progress, injuries, manualEvidence, engineConfig, loadedSettings, loadedStretchCompletion, strengthStrategies, strengthRecs, proposals, responses, missedRaw] = await Promise.all([
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
      MetaRepo.get<unknown>(MISSED_MEMORY_KEY).catch(() => undefined),
    ]);
    // A strength workout that stayed open for days reads as its estimate (engine/logDuration.ts).
    const logs = withPlausibleDurations(storedLogs, tpls);
    setProgram(programs[0] ?? null);
    setPlanChangeLog(proposals);
    // Een Liever niet op TARGET-TIME met het oude id gaat eenmalig over op het id met de doeltijd.
    const carried = carryTargetTimeAnswers(responses ?? {}, goals.map((g) => ({ id: g.id, updatedAt: g.updatedAt, targetMinutes: goalDetailsOf(g).targetMinutes })));
    if (carried) await MetaRepo.set('adviceResponses', carried);
    setAdviceResponses(carried ?? responses ?? {});
    if (missedSeq.current === missedSeqAtRead && missedWriting.current === 0) setMissedMemory(resolveMissedMemory(missedRaw));
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
    clearPendingRepairs();
    // Every row the syncs wrote or took off since the last read: the notice of your last change takes it as the
    // planning left it, but only when it was still what the notice recorded before the planning ran, so its undo is
    // not refused because the planning moved on, and a writer without a notice is never taken over
    // (engine/undoGuard.ts#refreshWritten).
    const syncTouched = takeSyncTouched();
    const noticeIds = (c: RecentPlanChange) => [...c.before.map((s) => s.id), ...c.addedIds];
    // Rows the week check put right that join a notice now: as they are now.
    const repairedIds = repaired ? [...new Set([...repaired.before, ...repaired.stored].map((s) => s.id).concat(repaired.addedIds ?? []))] : [];
    const repairedRows = new Map((repairedIds.length > 0 ? await snapshotWritten([], repairedIds) : []).map((s) => [s.id, s]));
    const freshFor = (ids: string[]) => new Map(ids.map((x) => [x, repairedRows.get(x) ?? null]));
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
        if (prev && !prev.failed && prev.trigger !== 'plan_check' && Date.now() - Date.parse(prev.createdAt) < 15_000) {
          const known = new Set(prev.before.map((s) => s.id));
          const joined = { ...prev, lines: [...prev.lines, ...repaired.lines], before: [...prev.before, ...repaired.stored.filter((s) => !known.has(s.id))], addedIds: [...prev.addedIds, ...(repaired.addedIds ?? [])] };
          const joinedIds = noticeIds(joined).filter((x) => !noticeIds(prev).includes(x));
          return { ...joined, written: refreshWritten(prev.written, syncTouched, noticeIds(joined), freshFor(joinedIds)) };
        }
        const notice: RecentPlanChange = { id, trigger: 'plan_check', title: 'Planning bijgewerkt', lines: repaired.lines, why, before: repaired.before, addedIds: repaired.addedIds ?? [], createdAt: now };
        return { ...notice, written: refreshWritten([], syncTouched, noticeIds(notice), freshFor(noticeIds(notice))) };
      });
    } else if (syncTouched.size > 0) {
      setRecentChange((prev) => {
        if (!prev || prev.failed) return prev;
        const ids = noticeIds(prev).filter((x) => syncTouched.has(x));
        return ids.length === 0 ? prev : { ...prev, written: refreshWritten(prev.written, syncTouched, ids) };
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
  useRefreshFromOtherWindows({ refresh });
  // Een ronde van Health Connect bracht nieuw gewicht: opnieuw lezen, zonder planningsronde, zodat een
  // eigen invoer daarna de nieuwe lijst gebruikt (docs/beslissingen/2026-11-04-gewicht-uit-health-connect.md).
  useEffect(() => onHealthWeightChange(() => void loadState().catch(() => undefined)), [loadState]);
  const { commitPlanChangeOutcome, commitPlanChange, respondToAdvice, undoRecentChange } = usePlanChangeActions({ setGoalEngineConfig, setSettings, setRecentChange, recentChange, setAdviceResponses, refresh });
  const { runForecastReplan, runWeeklyPrescriptionBuild, activateStrengthProgram, applyStrengthPlacementToCommittedRange, applyScheduleAnomalyFix, reportStrengthSchemaEnded, resolveStrengthRecommendation, runStrengthReviewCheck, rebuildRecommendations } = useStrengthAndReplan({ setForecastSummary, setRecentChange, setPlannerAdvice, refresh });
  useBoot({ setLoading, setBootError, setBootStep, loadState, refresh, runForecastReplan, runWeeklyPrescriptionBuild, runStrengthReviewCheck });

  const templateById = useMemo(() => new Map(templates.map((t) => [t.id, t])), [templates]);
  const { planWeekReplan, applyWeekReplan } = useWeekReplanActions({ templates, setRecentChange, refresh });

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
  const { announceSaved, logSession, undoLog, setLogFeedback, alignWithWatch, skipMissed } = useLogActions({ goalMilestoneProgress, settings, setCelebration, setRecentChange, setDebriefLogId, loggingInFlight, reportStorageError, refresh });

  // Een antwoord op de kaart (Niet nu, Liever niet, wat ASCEND zelf oversloeg): meteen in beeld, dan op dit toestel.
  const rememberMissed = useCallback((change: (m: ResolvedMissedMemory) => MissedMemory) => {
    const seq = ++missedSeq.current;
    missedWriting.current++;
    setMissedMemory((m) => resolveMissedMemory(change(m ?? resolveMissedMemory(undefined))));
    void updateMissedMemory(change)
      .then((stored) => {
        if (missedSeq.current === seq) setMissedMemory(stored);
      })
      .catch(() => undefined)
      .finally(() => {
        missedWriting.current--;
      });
  }, []);
  const { linkMissedLog, restoreFromWatch, trimWatchActivity, undoTrimWatchActivity, restoreSourceUpdate, takeOverSourceNumbers, takeOverFromMacroFactor, restoreFromMacroFactor, setLogWorkout } = useWatchAndSourceActions({ setRecentChange, refresh });
  const { moveSession, suggestMoves, dragContextFor, dragVerdicts, applyProposal, proposeSkip, proposeBackOnPlan } = useMoveActions({ program, plannedSessions, sessionLogs, trainingGoals, goalMilestones, goalEngineConfig, settings, templates, setRecentChange, refresh, sessionsForWeek, planChangeLog });
  const { clearMilestoneManually, updateGoal, archiveGoal, unarchiveGoal, strengthExternal, setStrengthExternal, updateSettings, showStatusOnlyChange } = useGoalActions({ trainingGoals, goalMilestones, settings, setSettings, setCelebration, setRecentChange, strengthProgramStrategies, setStrengthProgramStrategies, refresh });
  const { saveInfluence, saveSweat, saveSweatPre, removeInfluence, clearInfluences, planIllness, applyIllness } = useNotesAndIllness({ plannedSessions, sessionLogs, setSettings, settings, templates, commitPlanChange, showStatusOnlyChange });
  const { updateGoalEngineConfig, planHorizonChangeImpl, applyHorizonPlanImpl, planWeekLoadChange, planGoalChange, planGoalRole, planGoalPriority, setGoalOrder, planMarathonGoal, activateGoal } = useHorizonActions({ setGoalEngineConfig, setRecentChange, setStorageNotice, refresh });
  const { toggleStretchRoutine, addInjury, resolveInjury, deleteInjury, addManualCapabilityEvidence, deleteCapabilityEvidence, proposeNoTimeTodayAction, applyNoTimeToday, planPreviewPass, leavePeriods, planLeave, applyLeave, saveLeaveNote, planRestDay, applyRestDay } = useBodyAndLeave({ program, plannedSessions, sessionLogs, trainingGoals, goalMilestones, injuryNotes, goalEngineConfig, settings, setSettings, templates, stretchCompletion, setStretchCompletion, setRecentChange, refresh, commitPlanChangeOutcome, commitPlanChange, sessionsForWeek, showStatusOnlyChange });
  const { weather, answeredAdviceIds, advice, weekNoticeFor, weekFixesFor, previewDrop, legsCloseAt, proposeSwap, swapOptionsFor, influenceMoveNow } = useAdviceAndWeek({ loading, program, plannedSessions, sessionLogs, trainingGoals, goalMilestones, injuryNotes, goalEngineConfig, settings, templates, planChangeLog, adviceResponses, missedMemory, plannerAdvice, templateById, goalOverviews, dragContextFor, updateSettings });

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
    skipMissed,
    linkMissedLog,
    missedMemory,
    rememberMissed,
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
    dragVerdicts,
    previewDrop,
    legsCloseAt,
    proposeSwap,
    swapOptionsFor,
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
    exportData: () =>
      runManualBackup({
        adapter: webBackupFileAdapter,
        prepare: async () => {
          // Oude, besliste voorstellen eerst samenvatten (engine/proposalTidy.ts). Lukt dat niet, dan
          // gaat de back-up gewoon door.
          await tidyOldProposals().catch(() => 0);
          const envelope = await buildBackupEnvelope();
          return { text: JSON.stringify(envelope, null, 2), fileName: backupFileName(envelope.createdAt) };
        },
        // Pas na een gelukte schrijfactie. Wanneer en waar, voor Laatste back-up; een mislukte
        // automatische back-up is daarmee opgelost.
        markMade: async (at, where) => {
          await updateSettings({ lastExportedAt: at });
          await noteBackupMade(where, at).catch(() => undefined);
        },
      }),
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
    saveLeaveNote,
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
    showFailure: (title: string, line: string) => setRecentChange(failureNotice(title, line)),
    planWeekReplan,
    applyWeekReplan,
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

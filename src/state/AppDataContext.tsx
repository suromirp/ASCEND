import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Program } from '../models/program';
import type { PlannedSession, SessionLog, SessionTemplate, SessionVariant } from '../models/training';
import type { TrainingGoal, GoalMilestone, GoalMilestoneProgress } from '../models/goals';
import type { InjuryNote } from '../models/injury';
import type { CapabilityEvidence } from '../models/capability';
import { DEFAULT_GOAL_ENGINE_CONFIG, type GoalEngineConfig } from '../models/goalEngineConfig';
import type { CelebrationEvent } from '../components/CompletionMoment';
import { haptics } from '../utils/haptics';
import { playMilestoneChime, playSessionCompleteChime } from '../utils/sound';
import { pickCompletionQuote, pickVictoryQuote } from '../utils/quotes';
import {
  seedIfEmpty,
  syncTemplateAndScheduleDefinitions,
  ProgramsRepo,
  SessionTemplatesRepo,
  PlannedSessionsRepo,
  SessionLogsRepo,
  TrainingGoalsRepo,
  GoalMilestonesRepo,
  GoalMilestoneProgressRepo,
  InjuryNotesRepo,
  CapabilityEvidenceRepo,
  TrainingPrescriptionsRepo,
  PlanChangeProposalsRepo,
  GoalEngineConfigRepo,
  SettingsRepo,
  StretchCompletionRepo,
  resetToDemoData,
  DEFAULT_SETTINGS,
  type AppSettings,
  type StretchCompletion,
} from '../storage/database';
import { migrateToGoalEngine } from '../storage/goalMigration';
import { proposeMove, proposeNoTimeToday, proposeSkip as proposeSkipEngine, skipSession as skipSessionEngine, type ScheduleProposal } from '../engine/scheduler';
import { computeGoalProgress, requirementAutoSatisfied } from '../engine/progression';
import { computeReadiness } from '../engine/readiness';
import { extractEvidenceFromLogs } from '../engine/capability';
import { activeGoalDemandKeys, computeProgressionDecisionsForKeys } from '../engine/progressionDecisions';
import { computeForecastReplan } from '../engine/adaptiveReplanner';
import { applyPlanChangeItems } from '../engine/proposalEngine';
import { mondayOfWeek, todayISO } from '../utils/dates';
import { makeId } from '../utils/id';
import { buildBackupEnvelope, backupFileName } from '../storage/backup';
import { webBackupFileAdapter } from '../storage/backupFileAdapter';

interface AppData {
  loading: boolean;
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
  stretchCompletion: StretchCompletion;
  templateById: Map<string, SessionTemplate>;
  refresh: () => Promise<void>;
  sessionsForWeek: (weekStartDate: string) => PlannedSession[];
  logSession: (input: LogSessionInput) => Promise<void>;
  undoLog: (logId: string) => Promise<void>;
  moveSession: (sessionId: string, targetDate: string) => ScheduleProposal;
  applyProposal: (proposal: ScheduleProposal) => Promise<void>;
  // Phase 5: folded into the same proposal-confirm pattern moveSession
  // already uses (Technical Architecture v0.3.1 REVISED,
  // "skipSession folded into the same pattern") — a skip is never applied
  // silently, matching SYSTEM_INVARIANTS' confirmation_horizon_respected.
  // applyProposal (below) recognizes the same-date shape proposeSkipEngine
  // produces and calls the skip mutator instead of a move.
  proposeSkip: (sessionId: string) => ScheduleProposal;
  clearMilestoneManually: (goalId: string, milestoneId: string) => Promise<void>;
  updateGoal: (goalId: string, patch: { targetDate?: string; targetDistanceKm?: number }) => Promise<void>;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
  toggleStretchRoutine: (kind: keyof StretchCompletion) => Promise<void>;
  addInjury: (input: Omit<InjuryNote, 'id'>) => Promise<void>;
  resolveInjury: (id: string) => Promise<void>;
  deleteInjury: (id: string) => Promise<void>;
  addManualCapabilityEvidence: (input: Omit<CapabilityEvidence, 'id' | 'evidenceType' | 'source'>) => Promise<void>;
  deleteCapabilityEvidence: (id: string) => Promise<void>;
  proposeNoTimeToday: () => ScheduleProposal[];
  applyNoTimeToday: (proposals: ScheduleProposal[]) => Promise<void>;
  exportData: () => Promise<boolean>;
  resetDemoData: () => Promise<void>;
  celebration: CelebrationEvent | null;
  dismissCelebration: () => void;
  // Phase 6 — the live Adaptive Replanner for the forecast range (week +2
  // onward). Runs once at boot (never on every refresh — each run writes
  // fresh TrainingPrescription rows, so re-running constantly would just
  // accumulate churn for no new information) and exposes a one-line
  // passive summary — never a popup — the caller can show and dismiss.
  forecastSummary: string | null;
  dismissForecastSummary: () => void;
}

export interface LogSessionInput {
  plannedSessionId?: string;
  templateId: string;
  type: SessionLog['type'];
  variant: SessionVariant;
  durationMinutes: number;
  rpe?: number;
  notes?: string;
  strengthData?: SessionLog['strengthData'];
  cardioData?: SessionLog['cardioData'];
  outdoorData?: SessionLog['outdoorData'];
  subjectiveFeel?: SessionLog['subjectiveFeel'];
}

const AppDataContext = createContext<AppData | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [program, setProgram] = useState<Program | null>(null);
  const [templates, setTemplates] = useState<SessionTemplate[]>([]);
  const [plannedSessions, setPlannedSessions] = useState<PlannedSession[]>([]);
  const [sessionLogs, setSessionLogs] = useState<SessionLog[]>([]);
  const [trainingGoals, setTrainingGoals] = useState<TrainingGoal[]>([]);
  const [goalMilestones, setGoalMilestones] = useState<GoalMilestone[]>([]);
  const [goalMilestoneProgress, setGoalMilestoneProgress] = useState<GoalMilestoneProgress[]>([]);
  const [injuryNotes, setInjuryNotes] = useState<InjuryNote[]>([]);
  const [capabilityEvidence, setCapabilityEvidence] = useState<CapabilityEvidence[]>([]);
  const [goalEngineConfig, setGoalEngineConfig] = useState<GoalEngineConfig>(DEFAULT_GOAL_ENGINE_CONFIG);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [stretchCompletion, setStretchCompletion] = useState<StretchCompletion>({});
  const [celebration, setCelebration] = useState<CelebrationEvent | null>(null);
  const [forecastSummary, setForecastSummary] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [programs, tpls, planned, logs, goals, milestones, progress, injuries, manualEvidence, engineConfig, loadedSettings, loadedStretchCompletion] = await Promise.all([
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
    ]);
    setProgram(programs[0] ?? null);
    setTemplates(tpls);
    setPlannedSessions(planned);
    setSessionLogs(logs);
    setTrainingGoals(goals);
    setGoalMilestones(milestones);
    setGoalMilestoneProgress(progress);
    setInjuryNotes(injuries);
    setCapabilityEvidence(manualEvidence);
    setGoalEngineConfig(engineConfig);
    setSettings(loadedSettings);
    setStretchCompletion(loadedStretchCompletion);
  }, []);

  // Phase 6 — the live Adaptive Replanner for the forecast range. Reads
  // directly from the repos rather than React state, since this runs
  // once at boot right after refresh() — before that state necessarily
  // reflects the fetch it just did. Deliberately only ever called once per
  // app load (see the boot effect below): every 'reduce'/'replace' item
  // writes a fresh TrainingPrescription row, so re-running on every
  // micro-interaction would just accumulate churn, not new information.
  const runForecastReplan = useCallback(async () => {
    const [goals, logs, manualEvidence, planned, tpls, engineConfig] = await Promise.all([
      TrainingGoalsRepo.getAll(),
      SessionLogsRepo.getAll(),
      CapabilityEvidenceRepo.getAll(),
      PlannedSessionsRepo.getAll(),
      SessionTemplatesRepo.getAll(),
      GoalEngineConfigRepo.get(),
    ]);

    const keys = activeGoalDemandKeys(goals);
    if (keys.length === 0) return; // no active goal's demand to adapt the forecast around

    const asOf = todayISO();
    const allEvidence = [...extractEvidenceFromLogs(logs), ...manualEvidence];
    const readiness = computeReadiness(logs, planned);
    const recentLogs = [...logs].sort((a, b) => b.completedDate.localeCompare(a.completedDate)).slice(0, 3);
    const decisionsByKey = computeProgressionDecisionsForKeys(keys, allEvidence, readiness, engineConfig.guardrails, recentLogs, asOf);

    const { proposal, prescriptions, passiveSummary } = computeForecastReplan({
      plannedSessions: planned,
      templates: tpls,
      decisionsByKey,
      availability: engineConfig.availability,
      strengthProtection: engineConfig.strategy.strengthProtection,
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
      console.error('Adaptive Replanner: refusing to apply — unsupported plan change items present', unsupported);
      return;
    }

    const touchedIds = new Set(proposal.changes.map((c) => c.plannedSessionId).filter((id): id is string => Boolean(id)));
    const originalIds = new Set(planned.map((s) => s.id));
    for (const session of updatedSessions) {
      if (touchedIds.has(session.id) || !originalIds.has(session.id)) {
        await PlannedSessionsRepo.put(session);
      }
    }

    // A session gets at most one *current* prescription — replace, never
    // accumulate, across repeated replanner runs on later app opens.
    for (const prescription of prescriptions) {
      const existing = await TrainingPrescriptionsRepo.byPlannedSession(prescription.plannedSessionId);
      if (existing) await TrainingPrescriptionsRepo.delete(existing.id);
      await TrainingPrescriptionsRepo.put(prescription);
    }

    // Append-only audit trail (Storage plan: "audit trail of shown
    // proposals + resolution") — resolvedAt/resolution set immediately
    // since the forecast range auto-applies, never user-confirmed.
    await PlanChangeProposalsRepo.put({ ...proposal, resolvedAt: new Date().toISOString(), resolution: 'accepted' });

    setForecastSummary(passiveSummary);
    await refresh();
  }, [refresh]);

  useEffect(() => {
    (async () => {
      // AscendSplashLogo's entrance sequence (ring/mountain/trail draw-in,
      // peak flash, wordmark fade-up) finishes around 2.3s in, with the
      // light-travel loop starting at 2.2s. 2.6s gives that loop a brief
      // moment to actually be seen, not just the reveal, while keeping the
      // splash noticeably shorter than before. On a warm load,
      // seedIfEmpty/refresh can resolve in a handful of ms — without a
      // floor, the splash would unmount before its later stages ever fire,
      // so the animation would "sometimes" look broken depending on how
      // fast IndexedDB happened to respond.
      const minSplashDuration = new Promise((resolve) => setTimeout(resolve, 2600));
      await Promise.all([
        (async () => {
          await seedIfEmpty();
          // Replaces the retired syncObjectiveDefinitions() — one-time
          // migration to TrainingGoal/GoalMilestone (Technical Architecture
          // v0.3.1 REVISED, Phase 1), guarded so it only ever runs once.
          await migrateToGoalEngine();
          await syncTemplateAndScheduleDefinitions();
          await refresh();
        })(),
        minSplashDuration,
      ]);
      setLoading(false);
      // Fire-and-forget, after the splash — this is background forecast
      // adaptation, never something the user waits on to see Today/Week.
      void runForecastReplan();
    })();
  }, [refresh, runForecastReplan]);

  const templateById = useMemo(() => new Map(templates.map((t) => [t.id, t])), [templates]);

  const sessionsForWeek = useCallback(
    (weekStartDate: string) => plannedSessions.filter((s) => s.weekStartDate === weekStartDate || mondayOfWeek(s.scheduledDate) === weekStartDate),
    [plannedSessions],
  );

  const logSession = useCallback(
    async (input: LogSessionInput) => {
      const log: SessionLog = {
        id: makeId('log'),
        plannedSessionId: input.plannedSessionId,
        templateId: input.templateId,
        type: input.type,
        completedDate: todayISO(),
        completedAt: new Date().toISOString(),
        variant: input.variant,
        durationMinutes: input.durationMinutes,
        rpe: input.rpe,
        notes: input.notes,
        strengthData: input.strengthData,
        cardioData: input.cardioData,
        outdoorData: input.outdoorData,
        subjectiveFeel: input.subjectiveFeel,
        source: 'manual',
      };
      await SessionLogsRepo.put(log);

      // If this log satisfies the current front-of-ladder milestone on any
      // goal, record the historical moment it was cleared.
      let clearedTitle: string | undefined;
      for (const goal of trainingGoals) {
        const milestonesForGoal = goalMilestones.filter((m) => m.goalId === goal.id);
        if (milestonesForGoal.length === 0) continue;
        const progress = computeGoalProgress(goal.id, goal.name, milestonesForGoal, goalMilestoneProgress, sessionLogs);
        const current = progress.currentMilestone;
        if (current && requirementAutoSatisfied(current.definition.requirement, [log])) {
          await GoalMilestoneProgressRepo.put({
            id: makeId('progress'),
            goalId: goal.id,
            milestoneId: current.definition.id,
            clearedDate: log.completedDate,
            sourceSessionLogId: log.id,
          });
          clearedTitle = current.definition.title;
        }
      }

      await refresh();
      haptics.success();
      if (settings.introSoundEnabled) {
        if (clearedTitle) playMilestoneChime();
        else playSessionCompleteChime();
      }
      // Every completion gets a quote — a regular session a lighter one, a
      // milestone clear (if this same log happened to satisfy one) the
      // bigger victory-tier treatment with the milestone's title attached.
      setCelebration(
        clearedTitle
          ? { id: makeId('celebration'), kind: 'milestone', title: clearedTitle, quote: pickVictoryQuote() }
          : { id: makeId('celebration'), kind: 'session', quote: pickCompletionQuote() },
      );
    },
    [trainingGoals, goalMilestones, goalMilestoneProgress, sessionLogs, refresh, settings.introSoundEnabled],
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

  const moveSession = useCallback(
    (sessionId: string, targetDate: string): ScheduleProposal => {
      const week = sessionsForWeek(mondayOfWeek(targetDate));
      const combined = week.some((s) => s.id === sessionId) ? week : [...week, ...plannedSessions.filter((s) => s.id === sessionId)];
      return proposeMove(combined, templates, sessionId, targetDate);
    },
    [sessionsForWeek, plannedSessions, templates],
  );

  // A same-date change (toDate === fromDate) is how proposeSkipEngine
  // represents a skip — applied as a skip, never as a no-op "move" to the
  // date the session already occupied (mirrors applyNoTimeToday's existing
  // fallback for the same shape).
  const applyProposal = useCallback(
    async (proposal: ScheduleProposal) => {
      for (const change of proposal.changes) {
        const session = plannedSessions.find((s) => s.id === change.sessionId);
        if (!session) continue;
        if (change.toDate === change.fromDate) {
          await PlannedSessionsRepo.put(skipSessionEngine(session));
        } else {
          await PlannedSessionsRepo.put({
            ...session,
            scheduledDate: change.toDate,
            status: 'moved',
            movedFromDate: session.movedFromDate ?? change.fromDate,
          });
        }
      }
      await refresh();
    },
    [plannedSessions, refresh],
  );

  const proposeSkip = useCallback(
    (sessionId: string): ScheduleProposal => {
      const session = plannedSessions.find((s) => s.id === sessionId);
      if (!session) return { changes: [], reason: 'Sessie niet gevonden.', resolved: false };
      return proposeSkipEngine(session, templates);
    },
    [plannedSessions, templates],
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
    async (goalId: string, patch: { targetDate?: string; targetDistanceKm?: number }) => {
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
      const targetDate = 'targetDate' in patch ? patch.targetDate : goal.targetDate;
      const next: TrainingGoal = targetDate
        ? { ...goal, requirements, updatedAt: now, status: 'active', targetDate }
        : { ...goal, requirements, updatedAt: now, status: 'paused', targetDate: undefined };
      await TrainingGoalsRepo.put(next);
      await refresh();
    },
    [trainingGoals, refresh],
  );

  const updateSettings = useCallback(async (patch: Partial<AppSettings>) => {
    const next = await SettingsRepo.set(patch);
    setSettings(next);
  }, []);

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
    return proposeNoTimeToday(week, templates, today);
  }, [sessionsForWeek, templates]);

  // Mirrors applyProposal's move semantics, plus the scheduler's
  // "no free day left" fallback (a same-date no-op change) which reads as a
  // skip rather than a move.
  const applyNoTimeToday = useCallback(
    async (proposals: ScheduleProposal[]) => {
      for (const proposal of proposals) {
        for (const change of proposal.changes) {
          const session = plannedSessions.find((s) => s.id === change.sessionId);
          if (!session) continue;
          if (proposal.resolved && change.toDate !== change.fromDate) {
            await PlannedSessionsRepo.put({
              ...session,
              scheduledDate: change.toDate,
              status: 'moved',
              movedFromDate: session.movedFromDate ?? change.fromDate,
            });
          } else {
            await PlannedSessionsRepo.put(skipSessionEngine(session));
          }
        }
      }
      await refresh();
    },
    [plannedSessions, refresh],
  );

  const value: AppData = {
    loading,
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
    stretchCompletion,
    templateById,
    refresh,
    sessionsForWeek,
    logSession,
    undoLog,
    moveSession,
    applyProposal,
    proposeSkip,
    clearMilestoneManually,
    updateGoal,
    updateSettings,
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
      if (result.success) await updateSettings({ lastExportedAt: new Date().toISOString() });
      return result.success;
    },
    resetDemoData: async () => {
      await resetToDemoData();
      await migrateToGoalEngine();
      await refresh();
    },
    celebration,
    dismissCelebration: () => setCelebration(null),
    forecastSummary,
    dismissForecastSummary: () => setForecastSummary(null),
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppData {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider');
  return ctx;
}

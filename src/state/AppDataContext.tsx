import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Program } from '../models/program';
import type { PlannedSession, SessionLog, SessionTemplate, SessionVariant } from '../models/training';
import type { TrainingGoal, GoalMilestone, GoalMilestoneProgress } from '../models/goals';
import type { InjuryNote } from '../models/injury';
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
  SettingsRepo,
  StretchCompletionRepo,
  resetToDemoData,
  DEFAULT_SETTINGS,
  type AppSettings,
  type StretchCompletion,
} from '../storage/database';
import { migrateToGoalEngine } from '../storage/goalMigration';
import { proposeMove, proposeNoTimeToday, skipSession as skipSessionEngine, type ScheduleProposal } from '../engine/scheduler';
import { computeGoalProgress, requirementAutoSatisfied } from '../engine/progression';
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
  settings: AppSettings;
  stretchCompletion: StretchCompletion;
  templateById: Map<string, SessionTemplate>;
  refresh: () => Promise<void>;
  sessionsForWeek: (weekStartDate: string) => PlannedSession[];
  logSession: (input: LogSessionInput) => Promise<void>;
  undoLog: (logId: string) => Promise<void>;
  moveSession: (sessionId: string, targetDate: string) => ScheduleProposal;
  applyProposal: (proposal: ScheduleProposal) => Promise<void>;
  skipSession: (sessionId: string) => Promise<void>;
  clearMilestoneManually: (goalId: string, milestoneId: string) => Promise<void>;
  updateGoal: (goalId: string, patch: { targetDate?: string; targetDistanceKm?: number }) => Promise<void>;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
  toggleStretchRoutine: (kind: keyof StretchCompletion) => Promise<void>;
  addInjury: (input: Omit<InjuryNote, 'id'>) => Promise<void>;
  resolveInjury: (id: string) => Promise<void>;
  deleteInjury: (id: string) => Promise<void>;
  proposeNoTimeToday: () => ScheduleProposal[];
  applyNoTimeToday: (proposals: ScheduleProposal[]) => Promise<void>;
  exportData: () => Promise<boolean>;
  resetDemoData: () => Promise<void>;
  celebration: CelebrationEvent | null;
  dismissCelebration: () => void;
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
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [stretchCompletion, setStretchCompletion] = useState<StretchCompletion>({});
  const [celebration, setCelebration] = useState<CelebrationEvent | null>(null);

  const refresh = useCallback(async () => {
    const [programs, tpls, planned, logs, goals, milestones, progress, injuries, loadedSettings, loadedStretchCompletion] = await Promise.all([
      ProgramsRepo.getAll(),
      SessionTemplatesRepo.getAll(),
      PlannedSessionsRepo.getAll(),
      SessionLogsRepo.getAll(),
      TrainingGoalsRepo.getAll(),
      GoalMilestonesRepo.getAll(),
      GoalMilestoneProgressRepo.getAll(),
      InjuryNotesRepo.getAll(),
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
    setSettings(loadedSettings);
    setStretchCompletion(loadedStretchCompletion);
  }, []);

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
    })();
  }, [refresh]);

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

  const applyProposal = useCallback(
    async (proposal: ScheduleProposal) => {
      for (const change of proposal.changes) {
        const session = plannedSessions.find((s) => s.id === change.sessionId);
        if (!session) continue;
        await PlannedSessionsRepo.put({
          ...session,
          scheduledDate: change.toDate,
          status: 'moved',
          movedFromDate: session.movedFromDate ?? change.fromDate,
        });
      }
      await refresh();
    },
    [plannedSessions, refresh],
  );

  const skipSession = useCallback(
    async (sessionId: string) => {
      const session = plannedSessions.find((s) => s.id === sessionId);
      if (!session) return;
      await PlannedSessionsRepo.put(skipSessionEngine(session));
      await refresh();
    },
    [plannedSessions, refresh],
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
  // REVISED) — it's expressed as a 'distance'/'total_event' GoalRequirement,
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
        requirements = patch.targetDistanceKm !== undefined
          ? [...withoutDistance, { id: makeId('req'), kind: 'distance' as const, scope: 'total_event' as const, target: { amount: patch.targetDistanceKm, unit: 'km' as const } }]
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
    settings,
    stretchCompletion,
    templateById,
    refresh,
    sessionsForWeek,
    logSession,
    undoLog,
    moveSession,
    applyProposal,
    skipSession,
    clearMilestoneManually,
    updateGoal,
    updateSettings,
    toggleStretchRoutine,
    addInjury,
    resolveInjury,
    deleteInjury,
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
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppData {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider');
  return ctx;
}

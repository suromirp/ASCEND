import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Program } from '../models/program';
import type { PlannedSession, SessionLog, SessionTemplate, SessionVariant } from '../models/training';
import type { Objective, MilestoneProgress } from '../models/objectives';
import {
  seedIfEmpty,
  ProgramsRepo,
  SessionTemplatesRepo,
  PlannedSessionsRepo,
  SessionLogsRepo,
  ObjectivesRepo,
  MilestoneProgressRepo,
  resetToDemoData,
} from '../storage/database';
import { proposeMove, skipSession as skipSessionEngine, type ScheduleProposal } from '../engine/scheduler';
import { computeObjectiveProgress, requirementAutoSatisfied } from '../engine/progression';
import { mondayOfWeek, todayISO } from '../utils/dates';
import { makeId } from '../utils/id';
import { downloadExport } from '../storage/export';
import { importFromFile } from '../storage/import';

interface AppData {
  loading: boolean;
  program: Program | null;
  templates: SessionTemplate[];
  plannedSessions: PlannedSession[];
  sessionLogs: SessionLog[];
  objectives: Objective[];
  milestoneProgress: MilestoneProgress[];
  templateById: Map<string, SessionTemplate>;
  refresh: () => Promise<void>;
  sessionsForWeek: (weekStartDate: string) => PlannedSession[];
  logSession: (input: LogSessionInput) => Promise<void>;
  moveSession: (sessionId: string, targetDate: string) => ScheduleProposal;
  applyProposal: (proposal: ScheduleProposal) => Promise<void>;
  skipSession: (sessionId: string) => Promise<void>;
  clearMilestoneManually: (objectiveId: string, milestoneId: string) => Promise<void>;
  exportData: () => Promise<void>;
  importData: (file: File) => Promise<void>;
  resetDemoData: () => Promise<void>;
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
}

const AppDataContext = createContext<AppData | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [program, setProgram] = useState<Program | null>(null);
  const [templates, setTemplates] = useState<SessionTemplate[]>([]);
  const [plannedSessions, setPlannedSessions] = useState<PlannedSession[]>([]);
  const [sessionLogs, setSessionLogs] = useState<SessionLog[]>([]);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [milestoneProgress, setMilestoneProgress] = useState<MilestoneProgress[]>([]);

  const refresh = useCallback(async () => {
    const [programs, tpls, planned, logs, objs, progress] = await Promise.all([
      ProgramsRepo.getAll(),
      SessionTemplatesRepo.getAll(),
      PlannedSessionsRepo.getAll(),
      SessionLogsRepo.getAll(),
      ObjectivesRepo.getAll(),
      MilestoneProgressRepo.getAll(),
    ]);
    setProgram(programs[0] ?? null);
    setTemplates(tpls);
    setPlannedSessions(planned);
    setSessionLogs(logs);
    setObjectives(objs);
    setMilestoneProgress(progress);
  }, []);

  useEffect(() => {
    (async () => {
      await seedIfEmpty();
      await refresh();
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
        source: 'manual',
      };
      await SessionLogsRepo.put(log);

      // If this log satisfies the current front-of-ladder milestone on any
      // objective, record the historical moment it was cleared.
      for (const objective of objectives) {
        const progress = computeObjectiveProgress(objective, milestoneProgress, sessionLogs);
        const current = progress.currentMilestone;
        if (current && requirementAutoSatisfied(current.definition.requirement, [log])) {
          await MilestoneProgressRepo.put({
            id: makeId('progress'),
            objectiveId: objective.id,
            milestoneId: current.definition.id,
            clearedDate: log.completedDate,
            sourceSessionLogId: log.id,
          });
        }
      }

      await refresh();
    },
    [objectives, milestoneProgress, sessionLogs, refresh],
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
    async (objectiveId: string, milestoneId: string) => {
      await MilestoneProgressRepo.put({
        id: makeId('progress'),
        objectiveId,
        milestoneId,
        clearedDate: todayISO(),
      });
      await refresh();
    },
    [refresh],
  );

  const value: AppData = {
    loading,
    program,
    templates,
    plannedSessions,
    sessionLogs,
    objectives,
    milestoneProgress,
    templateById,
    refresh,
    sessionsForWeek,
    logSession,
    moveSession,
    applyProposal,
    skipSession,
    clearMilestoneManually,
    exportData: downloadExport,
    importData: async (file: File) => {
      await importFromFile(file);
      await refresh();
    },
    resetDemoData: async () => {
      await resetToDemoData();
      await refresh();
    },
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppData {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider');
  return ctx;
}

// Rekken, blessures, eigen metingen, geen tijd vandaag, vrije dagen en de rustdag.

import { useCallback, useMemo } from 'react';
import type { Program } from '../models/program';
import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import type { TrainingGoal, GoalMilestone } from '../models/goals';
import type { InjuryNote } from '../models/injury';
import type { CapabilityEvidence } from '../models/capability';
import type { GoalEngineConfig } from '../models/goalEngineConfig';
import {
  PlannedSessionsRepo,
  InjuryNotesRepo,
  CapabilityEvidenceRepo,
  SettingsRepo,
  MetaRepo,
  StretchCompletionRepo,
  type AppSettings,
  type StretchCompletion,
} from '../storage/database';
import { proposeNoTimeToday, skipSession as skipSessionEngine, type ScheduleProposal } from '../engine/scheduler';
import type { LeavePeriod } from '../models/leave';
import { sortPeriods } from '../engine/leave';
import { withNote } from '../engine/leaveEdit';
import { planLeaveChange, type LeavePlan } from '../engine/leaveProposal';
import { applyRestDayInOrder, planRestDayChange, type RestDayPlan } from '../engine/restDayProposal';
import { staleItems } from '../engine/proposalEngine';
import { isSportEnabled } from '../engine/sports';
import type { PlanChangeProposal, RecentPlanChange } from '../models/planChange';
import { mondayOfWeek, todayISO, addDays } from '../utils/dates';
import { parseKindAmounts } from '../engine/kindAmount';
import { makeId } from '../utils/id';
import { resolveVariantDuration } from '../engine/substitutions';
import { patternDays, previewPlanPass } from '../engine/planPass';
import { planEndDay } from '../engine/programLayout';
import { raceBlocks, afterGoalWindows } from '../engine/raceBlock';
import { mainGoal } from '../engine/mainGoal';
import type { CommitOutcome, UndoRestore } from './appDataTypes';
import { bumpPlanRevision, planSettled } from './planningSync';
import type { Dispatch, SetStateAction } from 'react';

export function useBodyAndLeave(deps: {
  program: Program | null;
  plannedSessions: PlannedSession[];
  sessionLogs: SessionLog[];
  trainingGoals: TrainingGoal[];
  goalMilestones: GoalMilestone[];
  injuryNotes: InjuryNote[];
  goalEngineConfig: GoalEngineConfig;
  settings: AppSettings;
  setSettings: Dispatch<SetStateAction<AppSettings>>;
  templates: SessionTemplate[];
  stretchCompletion: StretchCompletion;
  setStretchCompletion: Dispatch<SetStateAction<StretchCompletion>>;
  setRecentChange: Dispatch<SetStateAction<RecentPlanChange | null>>;
  refresh: (fromOtherWindow?: boolean) => Promise<void>;
  commitPlanChangeOutcome: (proposal: PlanChangeProposal, title: string, restore?: UndoRestore | undefined, afterWrites?: (() => Promise<void>) | undefined) => Promise<CommitOutcome>;
  commitPlanChange: (proposal: PlanChangeProposal, title: string, restore?: UndoRestore | undefined, afterWrites?: (() => Promise<void>) | undefined) => Promise<boolean>;
  sessionsForWeek: (weekStartDate: string) => PlannedSession[];
  showStatusOnlyChange: (proposal: PlanChangeProposal, restore?: UndoRestore | undefined) => Promise<void>;
}) {
  const { program, plannedSessions, sessionLogs, trainingGoals, goalMilestones, injuryNotes, goalEngineConfig, settings, setSettings, templates, stretchCompletion, setStretchCompletion, setRecentChange, refresh, commitPlanChangeOutcome, commitPlanChange, sessionsForWeek, showStatusOnlyChange } = deps;
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
    [stretchCompletion, setStretchCompletion],
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
      bumpPlanRevision();
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
      leave: periods, hikingEnabled: isSportEnabled('hiking', settings.enabledSports), trekRest: settings.trekLegRest, leaveCrowding: settings.leaveCrowding, fixedSports: settings.sportHandling ?? null, kindAmounts: parseKindAmounts(settings.kindAmount).value ?? null,
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
          leave: periods, hikingEnabled: isSportEnabled('hiking', settings.enabledSports), trekRest: settings.trekLegRest, leaveCrowding: settings.leaveCrowding, fixedSports: settings.sportHandling ?? null, kindAmounts: parseKindAmounts(settings.kindAmount).value ?? null,
        };
      },
    });
  }, [trainingGoals, goalMilestones, settings, plannedSessions, sessionLogs, templates, program, goalEngineConfig]);

  const applyLeave = useCallback(async (plan: LeavePlan): Promise<'applied' | 'stale'> => {
    await planSettled();
    // First a dry run on the stored rows: when the planning changed since the
    // proposal was made, nothing is stored, not even the period.
    if (staleItems(plan.proposal.changes, await PlannedSessionsRepo.getAll()).length > 0) return 'stale';
    const stored = await SettingsRepo.get();
    const current = stored.leavePeriods ?? [];
    const after = plan.mode === 'add' ? [...current.filter((p) => p.id !== plan.period.id), plan.period] : current.filter((p) => p.id !== plan.period.id);
    setSettings(await SettingsRepo.set({ leavePeriods: sortPeriods(after) }));
    // Undo puts the periods back exactly as they were, with the planning.
    const restore = { settings: { leavePeriods: current } };
    const outcome = await commitPlanChangeOutcome(plan.proposal, plan.proposal.issue, restore);
    if (outcome === 'stale') {
      // Changed between the dry run and the write: the period goes back too.
      setSettings(await SettingsRepo.set({ leavePeriods: current }));
      return 'stale';
    }
    if (outcome === 'nothing') await showStatusOnlyChange(plan.proposal, restore);
    return 'applied';
  }, [commitPlanChangeOutcome, showStatusOnlyChange, setSettings]);

  const saveLeaveNote = useCallback(async (periodId: string, note: string) => {
    await planSettled();
    const stored = await SettingsRepo.get();
    const current = stored.leavePeriods ?? [];
    if (!current.some((p) => p.id === periodId)) return;
    setSettings(await SettingsRepo.set({ leavePeriods: sortPeriods(withNote(current, periodId, note)) }));
    setRecentChange({
      id: makeId('leavenote'),
      trigger: 'leave_note',
      title: 'Notitie bewaard',
      lines: ['Je planning blijft zoals ze was.'],
      why: 'Alleen de notitie van je periode is anders.',
      before: [],
      addedIds: [],
      settingsBefore: { leavePeriods: current },
      createdAt: new Date().toISOString(),
    });
  }, [setRecentChange, setSettings]);

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
        leave: settings.leavePeriods, hikingEnabled: isSportEnabled('hiking', settings.enabledSports), trekRest: settings.trekLegRest, leaveCrowding: settings.leaveCrowding, fixedSports: settings.sportHandling ?? null, kindAmounts: parseKindAmounts(settings.kindAmount).value ?? null,
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
  }, [commitPlanChange, showStatusOnlyChange, setSettings]);

  return { toggleStretchRoutine, addInjury, resolveInjury, deleteInjury, addManualCapabilityEvidence, deleteCapabilityEvidence, proposeNoTimeTodayAction, applyNoTimeToday, planPreviewPass, leavePeriods, planLeave, applyLeave, saveLeaveNote, planRestDay, applyRestDay };
}

// Een training verplaatsen, slepen en overslaan, en terug naar het plan.

import { useCallback } from 'react';
import type { Program } from '../models/program';
import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import type { TrainingGoal, GoalMilestone } from '../models/goals';
import type { GoalEngineConfig } from '../models/goalEngineConfig';
import { SessionTemplatesRepo, PlannedSessionsRepo, SessionLogsRepo, type AppSettings } from '../storage/database';
import {
  proposeMove,
  proposeSkip as proposeSkipEngine,
  proposeBackOnPlan as proposeBackOnPlanEngine,
  skipSession as skipSessionEngine,
  type ScheduleProposal,
} from '../engine/scheduler';
import { caughtUpMap, qualifiesForCatchUp } from '../engine/catchUp';
import { writeCatchUp } from '../storage/catchUpApply';
import { writeSwap } from '../storage/weekSwap';
import { resolveDropOnTraining } from '../engine/dropOnTraining';
import { suggestMoveDates, type MoveSuggestion } from '../engine/moveSuggestions';
import { dayVerdicts, type DayVerdict, type DragContext } from '../engine/weekDrag';
import { withSwapVerdicts } from '../engine/weekSwap';
import { armFlip, disarmFlip } from '../utils/flipDom';
import type { PlanChangeProposal, RecentPlanChange } from '../models/planChange';
import { restoreSentence, restoresForTestMove } from '../engine/testMoveRestore';
import { mondayOfWeek, todayISO, addDays, weekdayShortNL, formatDateNL } from '../utils/dates';
import { makeId } from '../utils/id';
import { planEndDay } from '../engine/programLayout';
import { bumpPlanRevision, planSettled } from './planningSync';
import type { Dispatch, SetStateAction } from 'react';

export function useMoveActions(deps: {
  program: Program | null;
  plannedSessions: PlannedSession[];
  sessionLogs: SessionLog[];
  trainingGoals: TrainingGoal[];
  goalMilestones: GoalMilestone[];
  goalEngineConfig: GoalEngineConfig;
  settings: AppSettings;
  templates: SessionTemplate[];
  setRecentChange: Dispatch<SetStateAction<RecentPlanChange | null>>;
  refresh: (fromOtherWindow?: boolean) => Promise<void>;
  sessionsForWeek: (weekStartDate: string) => PlannedSession[];
  // Het wijzigingslog: welke test een nieuwe testpoging was (engine/testMoveRestore.ts).
  planChangeLog?: PlanChangeProposal[];
}) {
  const { program, plannedSessions, sessionLogs, trainingGoals, goalMilestones, goalEngineConfig, settings, templates, setRecentChange, refresh, sessionsForWeek, planChangeLog } = deps;
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
      const proposal = proposeMove(combined, templates, sessionId, targetDate, sessionLogs, program, goalEngineConfig.availability.dailyTimeBudget, goalEngineConfig.strategy.sameDayPairingPreference);
      // Een nieuwe testpoging die verhuist: wat alleen voor die test wegging komt in hetzelfde voorstel terug.
      const own = proposal.changes[0];
      if (!own || own.sessionId !== sessionId || own.toDate === own.fromDate) return proposal;
      const back = restoresForTestMove({ testId: sessionId, toDate: own.toDate, sessions: plannedSessions, proposals: planChangeLog ?? [], logs: sessionLogs, templates, today: todayISO() })
        .filter((c) => !proposal.changes.some((x) => x.sessionId === c.sessionId));
      if (back.length === 0) return proposal;
      return { ...proposal, changes: [...proposal.changes, ...back], reason: [proposal.reason, restoreSentence(back)].filter(Boolean).join(' ') };
    },
    [sessionsForWeek, plannedSessions, templates, sessionLogs, program, goalEngineConfig, planChangeLog],
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

  // The week of `weekStart` and the weeks around it, with what keeps a day free: for dragging and swapping.
  const dragContextFor = useCallback(
    (weekStart: string): DragContext => {
      const today = todayISO();
      const monday = mondayOfWeek(weekStart);
      const nearby = [-7, 0, 7].flatMap((offset) => sessionsForWeek(addDays(monday, offset)));
      return {
        sessions: nearby, templates, logs: sessionLogs, program,
        dailyTimeBudget: goalEngineConfig.availability.dailyTimeBudget, sameDayPairingPreference: goalEngineConfig.strategy.sameDayPairingPreference, asOf: today,
        move: { leave: settings.leavePeriods, restDay: settings.restDay ?? 1, goalDay: planEndDay(trainingGoals, goalMilestones, today, settings.afterMainGoal), illness: settings.illnessEpisodes },
      };
    },
    [sessionsForWeek, templates, sessionLogs, program, goalEngineConfig, settings.leavePeriods, settings.restDay, settings.afterMainGoal, settings.illnessEpisodes, trainingGoals, goalMilestones],
  );

  // A day with exactly one training that may move becomes Ruilen (engine/weekSwap.ts#withSwapVerdicts), unless
  // the setting "Loslaten op een training" says Samen (engine/dropOnTraining.ts).
  const dropOnTraining = resolveDropOnTraining(settings);
  const dragVerdicts = useCallback(
    (sessionId: string, weekStart: string): DayVerdict[] => {
      const ctx = dragContextFor(weekStart);
      const verdicts = dayVerdicts(ctx, sessionId, mondayOfWeek(weekStart));
      return dropOnTraining === 'swap' ? withSwapVerdicts(ctx, sessionId, verdicts) : verdicts;
    },
    [dragContextFor, dropOnTraining],
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
      armFlip();
      await planSettled();
      const stored = await PlannedSessionsRepo.getAll();
      const before: PlannedSession[] = [];
      const lines: string[] = [];
      const day = (iso: string) => `${weekdayShortNL(iso).toLowerCase()} ${formatDateNL(iso)}`;
      // Your own move or skip is yours: the automatic planning leaves it.
      // Back on its own day it is the plan's again.
      const lock = { by: 'user' as const, at: new Date().toISOString() };
      // Ruilen (engine/weekSwap.ts): beide rijen in één keer, of geen van beide (storage/weekSwap.ts).
      if (proposal.swap && proposal.changes.length === 2) {
        const [ca, cb] = proposal.changes;
        let written: Awaited<ReturnType<typeof writeSwap>>;
        try {
          written = await writeSwap({ aId: ca.sessionId, aFrom: ca.fromDate, bId: cb.sessionId, bFrom: cb.fromDate }, lock);
        } catch (err) {
          // Niets geschreven, dus er mag ook niets gaan schuiven; de aanroeper meldt het (Week.tsx#applyOrTell).
          // Het scherm leest de opslag opnieuw, zodat je ziet wat er nu echt staat.
          disarmFlip();
          await refresh();
          throw err;
        }
        setRecentChange({
          id: makeId('usermove'),
          trigger: 'session_moved',
          title: `${ca.templateName} en ${cb.templateName} geruild`,
          lines: proposal.changes.map((c) => `${c.templateName}: ${day(c.fromDate)} → ${day(c.toDate)}`),
          why: '',
          before: written.before,
          swapAfter: written.after,
          addedIds: [],
          createdAt: new Date().toISOString(),
        });
        bumpPlanRevision();
        await refresh();
        return;
      }
      // Inhalen: een gemiste training die naar vandaag of later gaat. De rij van toen blijft op zijn dag,
      // overgeslagen, en er komt een nieuwe rij op de gekozen dag (engine/catchUp.ts).
      const catchUpTemplates = new Map((await SessionTemplatesRepo.getAll()).map((t) => [t.id, t]));
      const loggedIds = new Set((await SessionLogsRepo.getAll()).map((l) => l.plannedSessionId));
      const caughtUp = caughtUpMap(stored);
      const addedIds: string[] = [];
      let caughtUpCount = 0;
      for (const change of proposal.changes) {
        const session = stored.find((s) => s.id === change.sessionId);
        if (!session) continue;
        before.push(session);
        const template = catchUpTemplates.get(session.templateId);
        if (template && qualifiesForCatchUp(session, template, change, { logged: loggedIds.has(session.id), today: todayISO(), caughtUp: caughtUp.has(session.id) })) {
          const added = await writeCatchUp(session, change.toDate, lock, makeId('planned'));
          addedIds.push(added.id);
          caughtUpCount++;
          lines.push(`${change.templateName} van ${day(change.fromDate)} ingehaald op ${day(change.toDate)}`);
          continue;
        }
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
        const skipped = !restored && caughtUpCount === 0 && proposal.changes.every((c) => c.toDate === c.fromDate);
        const first = proposal.changes[0]?.templateName ?? 'Sessie';
        setRecentChange({
          id: makeId('usermove'),
          trigger: skipped ? 'session_skipped' : 'session_moved',
          title: restored ? `${first} staat weer op de planning` : caughtUpCount > 0 ? `${first} ingehaald` : skipped ? `${first} overgeslagen` : proposal.changes.length === 1 ? `${first} verplaatst` : 'Sessies verplaatst',
          lines,
          why: proposal.changes.length > 1 ? proposal.reason : '',
          before,
          addedIds,
          createdAt: new Date().toISOString(),
        });
      }
      bumpPlanRevision();
      await refresh();
    },
    [refresh, setRecentChange],
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

  return { moveSession, suggestMoves, dragContextFor, dragVerdicts, applyProposal, proposeSkip, proposeBackOnPlan };
}

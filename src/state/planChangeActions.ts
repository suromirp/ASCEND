// Een aanvaard voorstel vastleggen, een antwoord op advies bewaren en de laatste wijziging ongedaan maken.

import { useCallback } from 'react';
import type { GoalEngineConfig } from '../models/goalEngineConfig';
import { SessionTemplatesRepo, PlannedSessionsRepo, TrainingGoalsRepo, PlanChangeProposalsRepo, MetaRepo, type AppSettings } from '../storage/database';
import { withPackWeight } from '../engine/gr5Profile';
import { undoSwap, SWAP_UNDO_STALE } from '../storage/weekSwap';
import { undoWeekReplan, REPLAN_UNDO_STALE } from '../storage/weekReplan';
import { unlinkLogsNow } from '../storage/missedTraining';
import { applyPlanChangeItems } from '../engine/proposalEngine';
import { describeChanges } from '../engine/changeImpact';
import { armFlip, disarmFlip } from '../utils/flipDom';
import { PLAN_UNDO_STALE, snapshotWritten, undoPlanChangeNow } from '../storage/undoPlanChange';
import type { Advice } from '../engine/adviceEngine';
import { syncWatchWorkoutsAfterPlanChange } from '../storage/watchWorkouts';
import { restoreAlignments } from '../storage/watchAlign';
import type { PlanChangeProposal, RecentPlanChange } from '../models/planChange';
import type { StoredResponse } from '../engine/learning';
import { withTargetMinutes } from '../engine/goals';
import type { AdviceResponse, CommitOutcome, UndoRestore } from './appDataTypes';
import { bumpPlanRevision, failureNotice, planSettled } from './planningSync';
import type { Dispatch, SetStateAction } from 'react';

export function usePlanChangeActions(deps: {
  setGoalEngineConfig: Dispatch<SetStateAction<GoalEngineConfig>>;
  setSettings: Dispatch<SetStateAction<AppSettings>>;
  setRecentChange: Dispatch<SetStateAction<RecentPlanChange | null>>;
  recentChange: RecentPlanChange | null;
  setAdviceResponses: Dispatch<SetStateAction<Record<string, StoredResponse>>>;
  refresh: (fromOtherWindow?: boolean) => Promise<void>;
}) {
  const { setGoalEngineConfig, setSettings, setRecentChange, recentChange, setAdviceResponses, refresh } = deps;
  // `afterWrites`: runs once the plan rows are stored and before the planning
  // run, for a setting that goes with this layout (the rest day).
  // The outcome tells "nothing to do" ('nothing') apart from "could not"
  // ('stale': the stored plan changed and an item no longer fits).
  const commitPlanChangeOutcome = useCallback(async (proposal: PlanChangeProposal, title: string, restore?: UndoRestore, afterWrites?: () => Promise<void>): Promise<CommitOutcome> => {
    // A 'keep' that clears the mark of a period (engine/leaveProposal.ts) is a write too.
    const real = proposal.changes.filter((c) => c.action !== 'keep' || c.leave === null);
    if (real.length === 0) return 'nothing';
    armFlip();
    await planSettled();
    const [planned, tpls] = await Promise.all([PlannedSessionsRepo.getAll(), SessionTemplatesRepo.getAll()]);
    // What you agreed to stays as you saw it: the moved, added and shown
    // sessions are locked against the automatic planning.
    const { sessions: updatedSessions, unsupported } = applyPlanChangeItems(proposal.changes, planned, undefined, { by: 'proposal', proposalId: proposal.id, at: new Date().toISOString() });
    if (unsupported.length > 0) {
      console.error('commitPlanChange: refusing to apply, unsupported plan change items present', unsupported);
      return 'stale';
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
    const before = planned.filter((s) => touchedIds.has(s.id));
    setRecentChange({
      id: proposal.id,
      trigger: proposal.trigger,
      title,
      lines: describeChanges(proposal.changes, planned, tpls),
      why: proposal.consequences,
      before,
      addedIds,
      written: await snapshotWritten(before, addedIds),
      settingsBefore: restore?.settings,
      configBefore: restore?.config,
      createdAt: new Date().toISOString(),
    });
    await afterWrites?.();
    bumpPlanRevision();
    await refresh();
    // The intervals.icu agenda follows the move now, not at the next opening;
    // in the background, and nothing happens while the switch is off.
    void syncWatchWorkoutsAfterPlanChange();
    return 'applied';
  }, [refresh, setRecentChange]);

  // True when the change was applied; false for nothing to do or could not.
  const commitPlanChange = useCallback(
    async (proposal: PlanChangeProposal, title: string, restore?: UndoRestore, afterWrites?: () => Promise<void>): Promise<boolean> =>
      (await commitPlanChangeOutcome(proposal, title, restore, afterWrites)) === 'applied',
    [commitPlanChangeOutcome],
  );

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
    // Neutrale golven zonder doel (engine/noGoalWaves.ts): hetzelfde, ongedaan maken brengt het voorstel terug.
    if (response === 'accepted' && item.noGoalWaves) {
      setRecentChange((prev) => (prev && prev.trigger === 'direction_changed' ? { ...prev, adviceId: item.id } : prev));
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
  }, [commitPlanChange, refresh, setRecentChange, setAdviceResponses]);

  const undoRecentChange = useCallback(async () => {
    if (!recentChange || recentChange.failed) return;
    armFlip();
    await planSettled();
    // Een ruil gaat alleen terug als beide rijen nog zijn wat de ruil schreef (storage/weekSwap.ts#undoSwap).
    if (recentChange.swapAfter) {
      try {
        await undoSwap(recentChange.before, recentChange.swapAfter);
      } catch (err) {
        disarmFlip();
        setRecentChange(failureNotice('Niet teruggezet', err instanceof Error && err.message === SWAP_UNDO_STALE ? SWAP_UNDO_STALE : 'Er ging iets mis; je week staat zoals hij na de ruil was.'));
        await refresh();
        return;
      }
      // Alleen het logboek van het ongedaan maken; de rijen staan al terug.
      await undoPlanChangeNow({ ...recentChange, before: [], addedIds: [] });
      setRecentChange(null);
      bumpPlanRevision();
      await refresh();
      return;
    }
    // Week opnieuw plannen gaat alleen terug als de week nog is wat het schreef (storage/weekReplan.ts#undoWeekReplan).
    if (recentChange.replan) {
      try {
        await undoWeekReplan({ before: recentChange.before, written: recentChange.replan.written, addedIds: recentChange.addedIds, removedIds: recentChange.replan.removedIds });
      } catch (err) {
        disarmFlip();
        setRecentChange(failureNotice('Niet teruggezet', err instanceof Error && err.message === REPLAN_UNDO_STALE ? REPLAN_UNDO_STALE : 'Er ging iets mis; je week staat zoals hij na het opnieuw plannen was.'));
        await refresh();
        return;
      }
      await undoPlanChangeNow({ ...recentChange, before: [], addedIds: [] });
      setRecentChange(null);
      bumpPlanRevision();
      await refresh();
      return;
    }
    // A log linked to a planned training afterwards, or numbers of the watch taken over by typed-in trainings:
    // when that was all the change did, only the link goes (engine/missedTraining.ts) or the hand-made numbers
    // come back (storage/watchAlign.ts), and that is the undo.
    const rowsTouched = recentChange.before.length > 0 || recentChange.addedIds.length > 0;
    if (!rowsTouched && (recentChange.linkedLogIds?.length || recentChange.alignedLogIds?.length)) {
      if (recentChange.linkedLogIds?.length) await unlinkLogsNow(recentChange.linkedLogIds);
      if (recentChange.alignedLogIds?.length) await restoreAlignments(recentChange.alignedLogIds);
      setRecentChange(null);
      bumpPlanRevision();
      await refresh();
      return;
    }
    // Settings, config, goals and rows back as they were, in one transaction, and only when the rows are still
    // exactly what the change wrote and nothing of it was logged since (storage/undoPlanChange.ts). Otherwise
    // nothing changes and the notice says so.
    let undone: Awaited<ReturnType<typeof undoPlanChangeNow>>;
    try {
      undone = await undoPlanChangeNow(recentChange);
    } catch (err) {
      disarmFlip();
      setRecentChange(failureNotice('Niet teruggezet', err instanceof Error && err.message === PLAN_UNDO_STALE ? PLAN_UNDO_STALE : 'Er ging iets mis; je planning staat zoals hij na de wijziging was.'));
      await refresh();
      return;
    }
    // The link and the hand-made numbers go back once the rows did.
    if (recentChange.linkedLogIds?.length) await unlinkLogsNow(recentChange.linkedLogIds);
    if (recentChange.alignedLogIds?.length) await restoreAlignments(recentChange.alignedLogIds);
    if (undone.settings) setSettings(undone.settings);
    if (undone.config) setGoalEngineConfig(undone.config);
    if (undone.responses) setAdviceResponses(undone.responses);
    setRecentChange(null);
    await refresh();
    void syncWatchWorkoutsAfterPlanChange();
  }, [recentChange, refresh, setRecentChange, setGoalEngineConfig, setSettings, setAdviceResponses]);

  return { commitPlanChangeOutcome, commitPlanChange, respondToAdvice, undoRecentChange };
}

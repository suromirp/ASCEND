// Voorstellen die door de wachtrij van de planningssync gaan: doelen, rustweek, volgorde, marathon en
// het activeren van een doel.

import { useCallback } from 'react';
import type { PlannedSession } from '../models/training';
import type { TrainingGoal, GoalPriority } from '../models/goals';
import type { GoalEngineConfig } from '../models/goalEngineConfig';
import {
  SessionTemplatesRepo,
  PlannedSessionsRepo,
  SessionLogsRepo,
  TrainingGoalsRepo,
  CapabilityEvidenceRepo,
  PlanChangeProposalsRepo,
  GoalEngineConfigRepo,
  SettingsRepo,
} from '../storage/database';
import { weekLoadInput, type WeekLoadKind } from '../storage/weekLoadPlan';
import { buildMarathonGoal } from '../engine/goalMigration';
import { PRIORITY_RULE } from '../engine/goalList';
import { extractEvidenceFromLogs } from '../engine/capability';
import { describeChanges } from '../engine/changeImpact';
import { applyHorizonPlanNow, computeHorizonPlan, type HorizonApplyResult, type HorizonApplyStatus, type HorizonChangeInput, type HorizonPlan } from '../storage/horizonPlan';
import { syncWatchWorkoutsAfterPlanChange } from '../storage/watchWorkouts';
import { snapshotWritten } from '../storage/undoPlanChange';
import { computeInputStateHash, applyGoalActivationPlan } from '../engine/goalActivation';
import type { GoalActivationPlan, RecentPlanChange } from '../models/planChange';
import { formatDateNL } from '../utils/dates';
import { isMarathonGoal } from '../engine/mainGoal';
import type { GoalActivationResult, MarathonGoalPatch } from './appDataTypes';
import { bootSettled } from './boot';
import { bumpPlanRevision, horizonKey, horizonQueue, lastHorizonKey, primePlanningRegisters, setLastHorizonKey } from './planningSync';
import type { Dispatch, SetStateAction } from 'react';

export function useHorizonActions(deps: {
  setGoalEngineConfig: Dispatch<SetStateAction<GoalEngineConfig>>;
  setRecentChange: Dispatch<SetStateAction<RecentPlanChange | null>>;
  setStorageNotice: Dispatch<SetStateAction<string | null>>;
  refresh: (fromOtherWindow?: boolean) => Promise<void>;
}) {
  const { setGoalEngineConfig, setRecentChange, setStorageNotice, refresh } = deps;
  const updateGoalEngineConfig = useCallback(async (patch: Partial<GoalEngineConfig>): Promise<GoalEngineConfig> => {
    const next = await GoalEngineConfigRepo.set(patch);
    setGoalEngineConfig(next);
    return next;
  }, [setGoalEngineConfig]);

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
      bumpPlanRevision();
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
      written: await snapshotWritten(result.before, result.addedIds),
      settingsBefore: result.restore.settings,
      goalsBefore: result.restore.goals,
      goalsAdded: result.restore.newGoalIds,
      ...(result.restore.program ? { programBefore: result.restore.program } : {}),
      ...(result.restore.strategies ? { strategiesBefore: result.restore.strategies } : {}),
      createdAt: now,
    });
    bumpPlanRevision();
    await refresh();
    void syncWatchWorkoutsAfterPlanChange();
  }, [refresh, setRecentChange]);

  const applyHorizonPlanImpl = useCallback(async (plan: HorizonPlan, options?: { onLate?: (status: HorizonApplyStatus) => void }): Promise<HorizonApplyStatus> => {
    const job = async () => {
      await bootSettled;
      const done = await applyHorizonPlanNow(plan, { prime: primePlanningRegisters });
      // Not knowing the key only means the next sync checks once more.
      setLastHorizonKey(await horizonKey().catch(() => lastHorizonKey));
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
  }, [refresh, showHorizonResult, setStorageNotice]);

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

  return { updateGoalEngineConfig, planHorizonChangeImpl, applyHorizonPlanImpl, planWeekLoadChange, planGoalChange, planGoalRole, planGoalPriority, setGoalOrder, planMarathonGoal, activateGoal };
}

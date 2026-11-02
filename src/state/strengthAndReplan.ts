// De planning op de achtergrond na het openen (beschikbaarheid, weekvoorschrift) en de stappen van het
// krachtprogramma: activeren, plaatsen, herzien en aanbevelen.

import { useCallback } from 'react';
import type { StrengthProgramStrategy } from '../models/strengthProgram';
import {
  ProgramsRepo,
  SessionTemplatesRepo,
  PlannedSessionsRepo,
  SessionLogsRepo,
  TrainingGoalsRepo,
  InjuryNotesRepo,
  CapabilityEvidenceRepo,
  PlanChangeProposalsRepo,
  StrengthProgramStrategiesRepo,
  StrengthProgramRecommendationsRepo,
  GoalEngineConfigRepo,
} from '../storage/database';
import { extractEvidenceFromLogs } from '../engine/capability';
import { activeGoalDemandKeys } from '../engine/progressionDecisions';
import { computeForecastReplan } from '../engine/adaptiveReplanner';
import { runWeeklyPrescriptionStep } from '../storage/weeklyPrescriptionStep';
import { applyPlanChangeItems } from '../engine/proposalEngine';
import { prescriptionSummary } from '../engine/changeImpact';
import { describeChanges } from '../engine/changeImpact';
import { applyScheduleAnomalyFixNow } from '../storage/scheduleAnomalyFix';
import { snapshotWritten } from '../storage/undoPlanChange';
import type { Advice } from '../engine/adviceEngine';
import type { RecentPlanChange } from '../models/planChange';
import { computeActiveGoalOverviews } from '../engine/goalOverview';
import {
  activeStrengthStrategy,
  daysUntilBlockEnd,
  computeStrengthReviewTriggers,
  buildStrengthProgramRecommendation,
  type StrengthReviewSignals,
} from '../engine/strengthProgram';
import { computeStrengthPlacementPlan, computeStrengthPlacementPlanForCommittedRange } from '../engine/strengthScheduling';
import { todayISO, daysBetween, localDateOf } from '../utils/dates';
import { injuryChangedSince } from '../engine/injuryKind';
import { bumpPlanRevision, planSettled, simpleHash } from './planningSync';
import type { Dispatch, SetStateAction } from 'react';

export function useStrengthAndReplan(deps: {
  setForecastSummary: Dispatch<SetStateAction<string | null>>;
  setRecentChange: Dispatch<SetStateAction<RecentPlanChange | null>>;
  setPlannerAdvice: Dispatch<SetStateAction<Advice | null>>;
  refresh: (fromOtherWindow?: boolean) => Promise<void>;
}) {
  const { setForecastSummary, setRecentChange, setPlannerAdvice, refresh } = deps;
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
  }, [refresh, setForecastSummary]);

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
      const before = planned.filter((x) => touched.has(x.id));
      const addedIds = updatedSessions.filter((x) => !originalIds.has(x.id)).map((x) => x.id);
      setRecentChange({
        id: proposal.id,
        trigger: proposal.trigger,
        title: 'Weekplanning bijgewerkt',
        lines: describeChanges(realChanges, planned, tpls),
        summary: prescriptionSummary(realChanges),
        why: proposal.consequences,
        before,
        addedIds,
        written: await snapshotWritten(before, addedIds),
        createdAt: new Date().toISOString(),
      });
    }

    if (outcome.wrote) await refresh();
  }, [refresh, setRecentChange, setPlannerAdvice]);

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
    bumpPlanRevision();
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

  return { runForecastReplan, runWeeklyPrescriptionBuild, activateStrengthProgram, applyStrengthPlacementToCommittedRange, applyScheduleAnomalyFix, reportStrengthSchemaEnded, resolveStrengthRecommendation, runStrengthReviewCheck, rebuildRecommendations };
}

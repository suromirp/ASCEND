// ASCEND — Progression decision aggregation across active goals (Phase 6).
//
// The Adaptive Replanner needs one ProgressionDecision per CapabilityKey
// that actually matters right now — every key any active goal's Demand
// Engine output touches. This is pure composition over already-existing
// engines (Demand, Capability, Progression Orchestrator); it never
// computes capability, readiness or a decision rule itself.

import type { TrainingGoal } from '../models/goals';
import type { CapabilityEvidence, CapabilityKey } from '../models/capability';
import type { TrainingGuardrail } from '../models/goalEngineConfig';
import type { SessionLog } from '../models/training';
import type { ProgressionDecision } from '../models/progression';
import type { ReadinessBreakdown } from './readiness';
import type { CapacityBreakdown } from './capacity';
import { computeDemand } from './demand';
import { computeCapabilityEstimate, keyId } from './capability';
import { computeProgressionDecision } from './progressionOrchestrator';
import { applyTaperOverride } from './goalArbiter';
import { daysBetween } from '../utils/dates';

export function activeGoalDemandKeys(goals: TrainingGoal[]): CapabilityKey[] {
  const keys: CapabilityKey[] = [];
  const seen = new Set<string>();
  for (const goal of goals) {
    if (goal.status !== 'active') continue;
    for (const demand of computeDemand(goal.requirements)) {
      const id = keyId(demand.key);
      if (!seen.has(id)) {
        seen.add(id);
        keys.push(demand.key);
      }
    }
  }
  return keys;
}

// Fase 4 (sports-science review, item D3) — the nearest active goal's
// deadline that actually demands this key, so applyTaperOverride can fire
// per-key rather than only globally. A goal past its own targetDate is
// excluded (daysBetween would go negative, which applyTaperOverride
// already treats as "outside the window" — filtered here too so a single
// stale goal can't hide a real, still-upcoming one behind it via Math.min).
function nearestGoalDaysToGoal(goals: TrainingGoal[], key: CapabilityKey, asOf: string): number | undefined {
  let nearest: number | undefined;
  for (const goal of goals) {
    if (goal.status !== 'active') continue;
    const demandsKey = computeDemand(goal.requirements).some((d) => keyId(d.key) === keyId(key));
    if (!demandsKey) continue;
    const days = daysBetween(asOf, goal.targetDate);
    if (days < 0) continue;
    if (nearest === undefined || days < nearest) nearest = days;
  }
  return nearest;
}

export function computeProgressionDecisionsForKeys(
  keys: CapabilityKey[],
  allEvidence: CapabilityEvidence[],
  readiness: ReadinessBreakdown,
  capacity: CapacityBreakdown,
  guardrails: TrainingGuardrail[],
  // Most-recent-first; not filtered per key here (a per-key match would
  // need real evidence-source tracing this aggregation layer doesn't have)
  // — the same recent history is read for every key's 2-of-3 response
  // check, a deliberate simplification over the fully key-specific
  // contract computeProgressionDecision itself supports.
  recentLogs: SessionLog[],
  asOf: string,
  // Fase 4 (sports-science review, item D3) — active goals, so the taper
  // trigger (proximity to a goal's targetDate, §32) can actually fire.
  // Previously this aggregation never called applyTaperOverride at all:
  // 'taper' was fully implemented in engine/goalArbiter.ts but never
  // invoked from any live pipeline, so it never fired in production.
  goals: TrainingGoal[],
): Map<string, ProgressionDecision> {
  const decisions = new Map<string, ProgressionDecision>();
  for (const key of keys) {
    const estimate = computeCapabilityEstimate(key, allEvidence, asOf);
    const decision = computeProgressionDecision({
      key,
      estimate,
      readiness,
      capacity,
      guardrails,
      recentLogs,
      // No decision-history store exists yet (Phase 3's own documented
      // scope boundary) — always 0, never guessed.
      consecutiveProgressCount: 0,
    });
    const daysToGoal = nearestGoalDaysToGoal(goals, key, asOf);
    decisions.set(keyId(key), applyTaperOverride(decision, daysToGoal));
  }
  return decisions;
}

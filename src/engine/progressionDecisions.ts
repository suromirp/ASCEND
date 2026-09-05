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
import { computeDemand } from './demand';
import { computeCapabilityEstimate, keyId } from './capability';
import { computeProgressionDecision } from './progressionOrchestrator';

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

export function computeProgressionDecisionsForKeys(
  keys: CapabilityKey[],
  allEvidence: CapabilityEvidence[],
  readiness: ReadinessBreakdown,
  guardrails: TrainingGuardrail[],
  // Most-recent-first; not filtered per key here (a per-key match would
  // need real evidence-source tracing this aggregation layer doesn't have)
  // — the same recent history is read for every key's 2-of-3 response
  // check, a deliberate simplification over the fully key-specific
  // contract computeProgressionDecision itself supports.
  recentLogs: SessionLog[],
  asOf: string,
): Map<string, ProgressionDecision> {
  const decisions = new Map<string, ProgressionDecision>();
  for (const key of keys) {
    const estimate = computeCapabilityEstimate(key, allEvidence, asOf);
    const decision = computeProgressionDecision({
      key,
      estimate,
      readiness,
      guardrails,
      recentLogs,
      // No decision-history store exists yet (Phase 3's own documented
      // scope boundary) — always 0, never guessed.
      consecutiveProgressCount: 0,
    });
    decisions.set(keyId(key), decision);
  }
  return decisions;
}

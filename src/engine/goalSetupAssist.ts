// ASCEND — Goal Setup Assist (Technical Architecture v0.3.1 REVISED,
// Phase 7 — "gebruik eerst wat ASCEND al weet, stel alleen ontbrekende
// relevante baselinevragen").
//
// Composes the existing, unchanged Demand Engine (Phase 2) and Capability
// Engine (Phase 2) — never a new decision-making formula of its own. A
// capability key a goal draft demands only needs a targeted baseline
// question when nothing substantive is already known about it: 'unknown'
// (no evidence at all, v0.2 §23) or 'low' (a single data point, not yet
// corroborated). 'medium'/'high' confidence means real training history —
// or an earlier answer — already covers it; asking again would be noise,
// not care.

import type { GoalRequirement } from '../models/goals';
import type { CapabilityEvidence, CapabilityKey, Confidence, Criticality } from '../models/capability';
import { computeDemand } from './demand';
import { computeCapabilityEstimate } from './capability';

export interface BaselineCapabilityStatus {
  key: CapabilityKey;
  criticality: Criticality;
  confidence: Confidence;
}

const NEEDS_QUESTION: Confidence[] = ['unknown', 'low'];

function demandStatuses(requirements: GoalRequirement[], allEvidence: CapabilityEvidence[], asOf: string): BaselineCapabilityStatus[] {
  return computeDemand(requirements).map((d) => ({
    key: d.key,
    criticality: d.criticality,
    confidence: computeCapabilityEstimate(d.key, allEvidence, asOf).confidence,
  }));
}

// What this goal draft demands but ASCEND can't yet honestly speak to —
// worth a targeted baseline question. Order follows computeDemand's own
// output order (distance-derived keys first, then elevation/pack/multi-day)
// — never re-sorted by criticality, since demand.ts today only ever emits
// 'critical' entries anyway (v0.2 §17's aerobic_engine/strength omission).
export function identifyBaselineNeeds(
  requirements: GoalRequirement[],
  allEvidence: CapabilityEvidence[],
  asOf: string,
): BaselineCapabilityStatus[] {
  return demandStatuses(requirements, allEvidence, asOf).filter((s) => NEEDS_QUESTION.includes(s.confidence));
}

// The mirror image — what ASCEND already has a reasonable read on, so the
// setup flow can say so explicitly rather than silently skipping past it.
export function identifyKnownCapabilities(
  requirements: GoalRequirement[],
  allEvidence: CapabilityEvidence[],
  asOf: string,
): BaselineCapabilityStatus[] {
  return demandStatuses(requirements, allEvidence, asOf).filter((s) => !NEEDS_QUESTION.includes(s.confidence));
}

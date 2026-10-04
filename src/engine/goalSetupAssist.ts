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
import type { MeasuredValue } from '../models/units';
import { UNIT_COMPARISON_DIRECTION } from '../models/units';
import { computeCapabilityEstimate, keyId } from './capability';

export interface BaselineCapabilityStatus {
  key: CapabilityKey;
  criticality: Criticality;
  confidence: Confidence;
}

const NEEDS_QUESTION: Confidence[] = ['unknown', 'low'];

// Each capability appears once (production report: "Klimcapaciteit (D+)"
// listed twice in the setup flow) — computeDemand is the only producer,
// deduplicated here by key so no caller can show one twice.
function demandStatuses(requirements: GoalRequirement[], allEvidence: CapabilityEvidence[], asOf: string): BaselineCapabilityStatus[] {
  const seen = new Set<string>();
  return computeDemand(requirements)
    .filter((d) => {
      const id = keyId(d.key);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .map((d) => ({
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

// --- Capacity input helpers (goal-flow redesign, Fase 1) -------------------

// The user's own best logged value for a capability — a reference point
// drawn only from their real training history, never a preset example.
// Manual entries are excluded on purpose: this is "what your logs show",
// shown next to the question so an answer can be anchored in fact.
export function ownHistoryAnchor(key: CapabilityKey, evidence: CapabilityEvidence[]): { measured: MeasuredValue; date: string } | undefined {
  const id = keyId(key);
  let best: CapabilityEvidence | undefined;
  for (const e of evidence) {
    if (e.source !== 'sessionLog' || keyId(e.key) !== id) continue;
    if (!best) { best = e; continue; }
    const higherIsMore = UNIT_COMPARISON_DIRECTION[e.measured.unit] === 'higher_is_more';
    if (higherIsMore ? e.measured.amount > best.measured.amount : e.measured.amount < best.measured.amount) best = e;
  }
  return best ? { measured: best.measured, date: best.date } : undefined;
}

// One recent activity, described the way people remember it.
export interface RecentActivityInput {
  durationMinutes?: number;
  distanceKm?: number;
  elevationGainM?: number;
  elevationLossM?: number;
  packWeightKg?: number;
}

// Turns one described activity ("my hardest hike or training of the last
// 8 weeks") into evidence for every capability this goal still needs that
// the activity actually says something about — one answer instead of a
// question per capability. Only direct readings: duration -> time-based
// endurance/leg tolerance/aerobic, D+ -> ascent, D− -> descent, pack ->
// load carriage, and pace only for running. Nothing is extrapolated; a
// capability the activity says nothing about stays a separate question.
export function evidenceFromRecentActivity(
  activity: RecentActivityInput,
  needs: CapabilityKey[],
): { key: CapabilityKey; measured: MeasuredValue }[] {
  const result: { key: CapabilityKey; measured: MeasuredValue }[] = [];
  for (const key of needs) {
    const d = key.dimension;
    // Cycling endurance is measured in km (engine/capability.ts, Fase 4).
    if (key.discipline === 'cycling' && (d === 'endurance_duration' || d === 'mechanical_tolerance')) {
      if (activity.distanceKm) result.push({ key, measured: { amount: activity.distanceKm, unit: 'km' } });
    } else if ((d === 'endurance_duration' || d === 'mechanical_tolerance' || d === 'aerobic_engine') && activity.durationMinutes) {
      result.push({ key, measured: { amount: activity.durationMinutes, unit: 'min' } });
    } else if (d === 'ascent_capacity' && activity.elevationGainM) {
      result.push({ key, measured: { amount: activity.elevationGainM, unit: 'm_elevation_gain' } });
    } else if (d === 'descent_tolerance' && activity.elevationLossM) {
      result.push({ key, measured: { amount: activity.elevationLossM, unit: 'm_elevation_loss' } });
    } else if (d === 'load_carriage' && activity.packWeightKg) {
      result.push({ key, measured: { amount: activity.packWeightKg, unit: 'kg' } });
    } else if (d === 'sustainable_output' && key.discipline === 'running' && activity.durationMinutes && activity.distanceKm) {
      result.push({ key, measured: { amount: activity.durationMinutes / activity.distanceKm, unit: 'min_per_km' } });
    }
  }
  return result;
}

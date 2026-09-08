// ASCEND — Weekly Prescription Builder: specificity ramp (Weekly
// Prescription Builder architecture pass, Fase 2).
//
// Pure functions only — no IO, no scheduling, no branch anywhere on goal
// identity/name/type. Only ever reads CapabilityDimension/Criticality/
// GapStatus (models/capability.ts), all already goal-generic vocabulary —
// this is exactly what lets GR5 and a future Marathon goal reuse the same
// curve unchanged: they differ only in which CapabilityDemand rows
// engine/demand.ts#computeDemand emits for their own GoalRequirement[], not
// in any code path here.

import type { Criticality, GapStatus } from '../models/capability';
import type { SpecificityRampBand } from '../models/weeklyPrescription';

// ASCEND_HEURISTIC(SPECIFICITY-RAMP-BANDS): daysToGoal <= 21 -> 'taper'
// (matches TAPER_WINDOW_DAYS, engine/goalArbiter.ts — never a second,
// disagreeing taper boundary); <= 42 -> 'specific'; <= 84 -> 'build';
// otherwise 'base'. A negative daysToGoal (goal date already passed) is
// still read as 'taper' — there's nothing further to ramp toward.
export function computeSpecificityRampBand(daysToGoal: number): SpecificityRampBand {
  if (daysToGoal <= 21) return 'taper';
  if (daysToGoal <= 42) return 'specific';
  if (daysToGoal <= 84) return 'build';
  return 'base';
}

export interface SpecificityWeightInputs {
  // engine/demand.ts#computeDemand's own output for this key, for this
  // goal — undefined means this goal never asked for this key at all (e.g.
  // aerobic_engine, which computeDemand deliberately never emits a
  // CapabilityDemand for, per its own "no schijnprecisie" comment).
  criticality: Criticality | undefined;
  // engine/gap.ts#computeCapabilityGaps's own output for this key, if any.
  gapStatus: GapStatus | undefined;
  band: SpecificityRampBand;
}

// ASCEND_HEURISTIC(SPECIFICITY-RAMP-WEIGHT): 1.0 baseline for every key —
// including aerobic_engine, which always reads criticality: undefined here
// (computeDemand never emits it) and so always stays at the flat 1.0
// floor, by construction, never singled out by name. A key with
// criticality 'critical' for this goal scales up by band: base=1.0,
// build=1.15, specific/taper=1.35 — 'taper' deliberately FREEZES at the
// 'specific' value rather than climbing further (engine/weeklyPrescriptionBuilder.ts
// relies on this: WHICH slots exist must stop shifting once volume-taper
// begins, or the specificity curve and taperReductionFactor would fight
// over the same numeric field). A 'major_gap'/'gap' status on that same
// key adds a further +0.1 — a critical dimension that's ALSO clearly
// behind deserves more of the week's room sooner than one already meeting
// demand, without inventing a second, disagreeing severity scale (reuses
// GapStatus, models/capability.ts, verbatim). Not a validated formula —
// numbers here are a first, honest starting point, same disclaimer as
// TAPER_MAX_REDUCTION/URGENT_GOAL_SWAP_THRESHOLD_PCT elsewhere in this
// codebase.
export function computeSpecificityWeight(inputs: SpecificityWeightInputs): number {
  if (inputs.criticality !== 'critical') return 1.0;

  const bandWeight = inputs.band === 'base' ? 1.0 : inputs.band === 'build' ? 1.15 : 1.35; // 'specific' and 'taper' share the same value — see header
  const gapBump = inputs.gapStatus === 'major_gap' || inputs.gapStatus === 'gap' ? 0.1 : 0;
  return bandWeight + gapBump;
}

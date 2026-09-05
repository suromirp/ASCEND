// ASCEND — Mountain-Adventure specialist (Technical Architecture v0.3.1
// REVISED, Phase 3; Algorithm Contract v0.2b REVISED §25-§30).
//
// Turns a ProgressionDecision into a candidate TrainingPrescription for a
// hiking/mountain session. Its own file, not a shared formula with Running/
// Cycling: this is the one specialist that has to reason about ascent,
// descent, pack load and multi-day durability as genuinely separate axes
// (§26: descent progression stays fully independent of ascent) rather than
// a single generic "harder/easier" knob.

import type { CapabilityDimension } from '../../models/capability';
import type { ProgressionDecision, ProgressionState } from '../../models/progression';
import type { TrainingPrescriptionCandidate, SessionRole, LoadLevel } from '../../models/prescription';

function roleForState(state: ProgressionState): SessionRole {
  switch (state) {
    case 'progress':
      return 'key';
    case 'consolidate':
      return 'support';
    case 'reduce':
      return 'maintenance';
    case 'recover':
      return 'recovery';
    case 'taper':
      return 'maintenance';
    case 'assess':
      return 'assessment';
  }
}

export interface MountainAdventureSpecialistInputs {
  decision: ProgressionDecision;
  plannedSessionId: string;
  // Only ever read when the caller supplies a real target — never invented.
  candidateElevationGainM?: number;
  candidateElevationLossM?: number;
  candidatePackWeightKg?: number;
}

function dimensionOverride(dimension: CapabilityDimension, state: ProgressionState): Partial<{ eccentricLoad: LoadLevel; lowerBodyLoad: LoadLevel }> | undefined {
  // Descent-specific progression genuinely needs more eccentric loading
  // (§26) — kept fully independent of ascent, matching
  // engine/stressProfile.ts#deriveObservedStressFromLog's own real-D-
  // based eccentric-load inference elsewhere in this phase.
  if (dimension === 'descent_tolerance' && state === 'progress') {
    return { eccentricLoad: 'heavy' };
  }
  // A heavier pack raises real lower-body load regardless of terrain (§27).
  if (dimension === 'load_carriage' && state === 'progress') {
    return { lowerBodyLoad: 'heavy' };
  }
  return undefined;
}

export function proposeMountainAdventurePrescription(inputs: MountainAdventureSpecialistInputs): TrainingPrescriptionCandidate {
  const { decision, plannedSessionId, candidateElevationGainM, candidateElevationLossM, candidatePackWeightKg } = inputs;
  const state = decision.state;

  const baseOverride = state === 'reduce' || state === 'recover' ? { intensity: 'low' as const } : {};
  const specificOverride = dimensionOverride(decision.key.dimension, state);
  const stressProfileOverride = { ...baseOverride, ...specificOverride };

  return {
    plannedSessionId,
    role: roleForState(state),
    stressProfileOverride: Object.keys(stressProfileOverride).length > 0 ? stressProfileOverride : undefined,
    elevationGain: candidateElevationGainM !== undefined ? { amount: candidateElevationGainM, unit: 'm_elevation_gain' } : undefined,
    elevationLoss: candidateElevationLossM !== undefined ? { amount: candidateElevationLossM, unit: 'm_elevation_loss' } : undefined,
    packWeight: candidatePackWeightKg !== undefined ? { amount: candidatePackWeightKg, unit: 'kg' } : undefined,
    generatedBy: ['engine/specialists/mountainAdventure.ts', decision.ruleId],
    reason: decision.reason,
  };
}

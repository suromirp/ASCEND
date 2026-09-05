// ASCEND — Cycling specialist (Technical Architecture v0.3.1 REVISED,
// Phase 3; Algorithm Contract v0.2b REVISED §21-§22).
//
// Turns a ProgressionDecision into a candidate TrainingPrescription for a
// cycling session. Its own file, not a shared formula with Running/
// Mountain-Adventure: cycling's genuinely distinct physiological property
// is that it is non-weight-bearing and produces essentially no eccentric
// (downhill-style) loading the way running or descending on foot does —
// engine/capability.ts already declines to derive a running-style pace
// estimate for cycling (§18.2: unreliable without route/wind/equipment
// context), so this specialist never sets targetPaceRange either.

import type { ProgressionDecision, ProgressionState } from '../../models/progression';
import type { TrainingPrescriptionCandidate, SessionRole } from '../../models/prescription';

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

export interface CyclingSpecialistInputs {
  decision: ProgressionDecision;
  plannedSessionId: string;
  // Only ever read when the caller supplies a real target — never invented.
  candidateDurationMinutes?: number;
}

export function proposeCyclingPrescription(inputs: CyclingSpecialistInputs): TrainingPrescriptionCandidate {
  const { decision, plannedSessionId, candidateDurationMinutes } = inputs;
  const state = decision.state;

  // Cycling is non-impact/near-zero-eccentric regardless of progression
  // state — a genuine, discipline-specific fact worth overriding the
  // template's own base profile for, not a fabricated number.
  const stressProfileOverride =
    state === 'reduce' || state === 'recover'
      ? { intensity: 'low' as const, impact: 'none' as const, eccentricLoad: 'none' as const }
      : { impact: 'none' as const, eccentricLoad: 'none' as const };

  return {
    plannedSessionId,
    role: roleForState(state),
    stressProfileOverride,
    targetDuration: candidateDurationMinutes !== undefined ? { amount: candidateDurationMinutes, unit: 'min' } : undefined,
    generatedBy: ['engine/specialists/cycling.ts', decision.ruleId],
    reason: decision.reason,
  };
}

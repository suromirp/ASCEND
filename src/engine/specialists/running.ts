// ASCEND — Running specialist (Technical Architecture v0.3.1 REVISED,
// Phase 3; Algorithm Contract v0.2b REVISED §14-§20).
//
// Turns a ProgressionDecision into a candidate TrainingPrescription for a
// running session. Deliberately its own file, not a shared "specialist
// formula" with Cycling/Mountain-Adventure (engine module map: "Must NOT
// share one generic formula across disciplines") — running's genuinely
// distinct piece of logic is RULE-RUN-SPIKE-001 (§15): a single-session
// distance spike ≥10% above the longest run in the preceding 30 days is
// used only as a risk flag, combined with the rest of the decision, never
// as a hard medical threshold or the primary progression formula on its own.

import type { ProgressionDecision, ProgressionState } from '../../models/progression';
import type { TrainingPrescriptionCandidate } from '../../models/prescription';
import type { SessionRole } from '../../models/prescription';

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

export interface RunningSpecialistInputs {
  decision: ProgressionDecision;
  plannedSessionId: string;
  // Only ever read for the RULE-RUN-SPIKE-001 flag below — never invented
  // when the caller doesn't supply real recent history/candidate numbers.
  recentLongestSessionKm?: number;
  candidateDistanceKm?: number;
}

export function proposeRunningPrescription(inputs: RunningSpecialistInputs): TrainingPrescriptionCandidate {
  const { decision, plannedSessionId, recentLongestSessionKm, candidateDistanceKm } = inputs;

  let state = decision.state;
  let reason = decision.reason;
  const generatedBy = ['engine/specialists/running.ts', decision.ruleId];
  const evidenceRefs: string[] = [];
  let distanceKm = candidateDistanceKm;

  const spikeFlagged =
    recentLongestSessionKm !== undefined &&
    candidateDistanceKm !== undefined &&
    recentLongestSessionKm > 0 &&
    candidateDistanceKm >= recentLongestSessionKm * 1.1;

  if (spikeFlagged) {
    evidenceRefs.push('E-RUN-PROG-001');
    generatedBy.push('RULE-RUN-SPIKE-001');
    // Risk flag, not a hard block (§15): cap the candidate distance to the
    // safer increment and never let this occurrence read as 'progress'.
    distanceKm = recentLongestSessionKm * 1.1;
    if (state === 'progress') {
      state = 'consolidate';
      reason = `${reason} Voorgestelde afstand lag ≥10% boven de langste duurloop van de afgelopen 30 dagen — als risicosignaal afgetopt op een kleinere stap.`;
    }
  }

  const stressProfileOverride =
    state === 'reduce' || state === 'recover' ? { intensity: 'low' as const } : undefined;

  return {
    plannedSessionId,
    role: roleForState(state),
    stressProfileOverride,
    targetDistance: distanceKm !== undefined ? { amount: distanceKm, unit: 'km' } : undefined,
    generatedBy,
    reason,
    evidenceRefs: evidenceRefs.length > 0 ? evidenceRefs : undefined,
  };
}

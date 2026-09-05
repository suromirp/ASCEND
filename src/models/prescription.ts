// ASCEND — session stress profile & training prescription (Technical
// Architecture v0.3.1 REVISED, review point 8 & 14).
//
// SessionStressProfile is layered, not duplicated: a SessionTemplate will
// carry a base default (Phase 3), a TrainingPrescription may override a
// subset of fields for one specific occurrence, and resolveEffectiveStressProfile()
// (Phase 3) is the one pure function every guardrail check goes through.
// None of that is wired up yet — Phase 1 only introduces the types
// TrainingPrescription references.

import type { MeasuredValue } from './units';
import type { TerrainContext } from './goals';

export type LoadLevel = 'none' | 'light' | 'moderate' | 'heavy';

export interface SessionStressProfile {
  lowerBodyLoad: LoadLevel;
  impact: LoadLevel;
  eccentricLoad: LoadLevel; // descent-heavy / downhill-specific
  intensity: 'low' | 'moderate' | 'high';
  // recoveryCostHours deliberately absent (Technical Architecture v0.3.4
  // §5): an unvalidated predicted-recovery-time estimate with no
  // evidence-backed formula behind it. engine/readiness.ts's `recovery`
  // category already measures real observed recovery-session frequency
  // over an actual 28-day window — a guessed per-template number would
  // either duplicate or silently disagree with that signal.
}

// Lives on the prescription, not the template (review point 14) — the
// same session template is 'key' during a goal's peak block and
// 'support' earlier; attaching this to the template would make that
// impossible to express.
export type SessionRole = 'key' | 'support' | 'maintenance' | 'recovery' | 'optional' | 'assessment';

export interface TrainingPrescription {
  id: string;
  plannedSessionId: string; // the ONLY direction of this relationship (review point 5) —
                             // PlannedSession itself gains no new field at all
  role: SessionRole;
  stressProfileOverride?: Partial<SessionStressProfile>; // layered over the template's base — see resolveEffectiveStressProfile (Phase 3)
  targetDuration?: MeasuredValue;
  targetDistance?: MeasuredValue;
  targetPaceRange?: { min: MeasuredValue; max: MeasuredValue };
  targetHrZone?: string;
  targetRpe?: number;
  elevationGain?: MeasuredValue;
  elevationLoss?: MeasuredValue;
  packWeight?: MeasuredValue;
  context?: TerrainContext;
  generatedBy: string[];
  reason: string;
  evidenceRefs?: string[];
  createdAt: string;
}

// A specialist's draft output (engine module map: "Candidate
// TrainingPrescription draft") — before the (later-phase) writer module
// assigns an id/createdAt and actually persists it via
// storage/database.ts#TrainingPrescriptionsRepo. Phase 3 only builds the
// specialists that produce this candidate; wiring one up to an actual
// planned session automatically is Goal Arbiter/Adaptive Replanner
// territory (Phase 4+).
export type TrainingPrescriptionCandidate = Omit<TrainingPrescription, 'id' | 'createdAt'>;

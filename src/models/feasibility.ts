// ASCEND — Goal Arbiter / Feasibility / Goal Focus domain models (Technical
// Architecture v0.3.1 REVISED, Phase 4; Algorithm Contract v0.2b REVISED
// §35-§42).

import type { CapabilityKey, Confidence } from './capability';

// Detect one session covering multiple goals (engine module map) — one row
// per (plannedSession, goal) pair a session's template genuinely serves;
// a session contested by >1 goal simply has >1 row sharing the same
// plannedSessionId.
export interface SessionContribution {
  plannedSessionId: string;
  goalId: string;
  capabilityKeys: CapabilityKey[];
}

export type GoalFocusReasonComponent = 'base' | 'urgency' | 'phase' | 'feasibilityPressure' | 'trainableGap' | 'userPriority';

export interface GoalFocusReason {
  component: GoalFocusReasonComponent;
  points: number;
}

// Read-only weekly priority score (v0.2b REVISED §42) — never writable,
// never presented as a % of training time/workload. Only a relative
// priority ranking across a user's own active goals.
export interface GoalFocus {
  goalId: string;
  score: number;
  normalizedPct: number;
  reasons: GoalFocusReason[];
  asOf: string;
}

// v0.2b REVISED §35: an ASCEND-calibrated model, explicitly not a
// scientifically validated predictor — never a pseudo-precise success %.
export type FeasibilityStatus = 'on_track' | 'challenging' | 'unlikely' | 'insufficient_data';

export interface FeasibilityAssessment {
  goalId: string;
  status: FeasibilityStatus;
  // §36: bottleneck-aware — a supporting strength can't average out one
  // major critical gap. Absent only when nothing rises above 'near'.
  bottleneck?: CapabilityKey;
  confidence: Confidence;
  explanation: string;
  bestPossiblePreparation?: string;
}

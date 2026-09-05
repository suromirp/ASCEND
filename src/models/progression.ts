// ASCEND — Progression state machine (Technical Architecture v0.3.1 REVISED,
// Phase 3; Algorithm Contract v0.2b REVISED §5-§13).
//
// Output of the Progression Orchestrator (engine/progressionOrchestrator.ts)
// — the one place Capability + Readiness + guardrails meet (engine module
// map). This file only defines the shape; it never computes capability or
// readiness itself.

import type { CapabilityKey } from './capability';

// v0.2b REVISED §1.2: CONSOLIDATE is a full state, not a fallback of PROGRESS.
// §32: taper is its own state, not a special case of reduce.
export type ProgressionState = 'progress' | 'consolidate' | 'reduce' | 'recover' | 'taper' | 'assess';

export interface ProgressionDecision {
  key: CapabilityKey;
  state: ProgressionState;
  reason: string;
  ruleId: string;
  // v0.2b REVISED §10-§13, §110: 2-of-3 recent sessions read as a poor
  // response — a stronger signal for re-assessing capability than any
  // single session (§12: one bad session never wipes capability on its own).
  poorResponsePattern: boolean;
  // v0.2b REVISED implied by §69's "3-progression accumulation review"
  // heuristic parameter: three consecutive PROGRESS decisions for the same
  // key are a deliberate checkpoint, not silent indefinite progression.
  accumulationReviewDue: boolean;
}

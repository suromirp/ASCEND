// ASCEND — Strength Program Strategy domain models (Strength Program
// Strategy Addendum v0.1, Phase 8).
//
// The locked product principle (§10): ASCEND decides strength strategy,
// frequency, split, focus, block timing and calendar placement.
// MacroFactor Workouts (or a future external strength app) provides/
// executes the detailed exercise workout and tracks exercise progression.
// This model never carries exercise-level detail (§1/§4) — that stays
// entirely outside ASCEND. Exercise CONTENT for a given session type still
// lives on SessionTemplate (§8: "SessionTemplate — reusable static workout
// shape" is a separate, existing concept this strategy only references by
// id, never duplicates).
//
// One row per strength-training BLOCK, not per workout (§2) — ASCEND keeps
// historical blocks (status: 'completed'/'archived') rather than only ever
// storing one global current setting, the same append-only-in-spirit
// pattern as GoalMilestoneProgress/PlanChangeProposal elsewhere in this
// codebase.

export type StrengthProgramSource = 'macrofactor_workouts' | 'manual' | 'future_provider';

export type StrengthProgramStatus = 'active' | 'ending' | 'completed' | 'archived';

export interface StrengthProgramStrategy {
  id: string;
  source: StrengthProgramSource;
  startDate: string;
  plannedEndDate?: string;
  plannedBlockWeeks?: number;
  sessionsPerWeek: number;
  // Free-form, deliberately a plain string (e.g. 'upper_lower', 'full_body',
  // 'push_pull_legs', or custom text) rather than a closed union — mirrors
  // GoalRequirement.discipline/ActivityModality elsewhere: the set of
  // splits is content, not domain structure (§1: "preferred split e.g.
  // Upper/Lower, Full Body, Push/Pull/Legs, custom").
  splitType: string;
  // References existing SessionTemplate rows (type: 'strength') that make
  // up this block's session types, in the order they should be cycled
  // through when placing new sessions (engine/strengthScheduling.ts) —
  // never a duplicate copy of duration/stress/exercise data, which stays
  // exactly where it already lives (SessionTemplate).
  sessionTemplateIds: string[];
  musclePriorities?: string[];
  muscleMaintenance?: string[];
  notes?: string;
  status: StrengthProgramStatus;
  createdAt: string;
  updatedAt: string;
}

// §5 — every condition ASCEND can suggest a review for. A review is only
// ever a suggestion (StrengthProgramRecommendation below), never an
// automatic rewrite of the active strategy.
export type StrengthReviewTrigger =
  | 'block_ending_soon'
  | 'user_reported_schema_ended'
  | 'goal_added_or_changed'
  | 'goal_phase_changed'
  | 'availability_changed'
  | 'repeated_leg_conflicts'
  | 'injury_changed'
  | 'priority_changed';

// §6 — advises at strategy level only; never prescribes individual
// exercises. `rationale` must explain *why* it fits the user's current
// active goals and training phase (§6's own requirement), not just state
// numbers.
export interface StrengthProgramRecommendation {
  id: string;
  strategyId?: string; // the block being reviewed — absent if no prior block existed
  triggeredBy: StrengthReviewTrigger[];
  suggestedSessionsPerWeek: number;
  suggestedSplitType: string;
  suggestedBlockWeeks?: number;
  rationale: string;
  createdAt: string;
  resolvedAt?: string;
  resolution?: 'accepted' | 'dismissed';
}

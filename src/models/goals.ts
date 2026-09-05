// ASCEND — generic goal domain models (Technical Architecture v0.3.1
// REVISED, "Foundation" phase). Replaces Objective/MilestoneDefinition as
// the live source of truth — see storage/goalMigration.ts. The legacy
// Objective/MilestoneProgress types (models/objectives.ts) are kept,
// unchanged, purely so an export made before this migration still opens.
//
// MilestoneRequirement is reused as-is from models/objectives.ts — its
// vocabulary was never the problem, only its exclusive attachment to the
// old Objective type was (v0.3.1 REVISED).

import type { MeasuredValue } from './units';
import type { MilestoneRequirement, MilestoneStatus } from './objectives';

export type TerrainContext =
  | 'road' | 'flat_trail' | 'uneven_trail' | 'mountain' | 'technical' // running/hiking
  | 'gravel' | 'mtb_trail' | 'indoor'                                  // cycling (road shared)
  | 'unknown';

export type GoalStatus = 'active' | 'paused' | 'completed' | 'archived';

// Requirement scope — over what span a GoalRequirement's target is measured
// (Technical Architecture v0.3.6 §E1, correcting v0.3.1 REVISED's original
// lowercase casing to what was explicitly re-confirmed there).
export type RequirementScope = 'SINGLE_EVENT' | 'PER_DAY' | 'TOTAL_EVENT' | 'CONSECUTIVE_DAYS';

export interface GoalRequirement {
  id: string;
  kind: 'distance' | 'elevationGain' | 'elevationLoss' | 'duration' | 'targetTime'
      | 'packWeight' | 'consecutiveDays' | 'manual';
  scope: RequirementScope;
  target?: MeasuredValue; // absent for 'manual'
  // Free-form, deliberately a plain string rather than a closed union
  // (Technical Architecture v0.3.6 §E1) — mirrors ActivityModality
  // (models/training.ts): the set of disciplines is content, not domain
  // structure, so a new one never needs a model change.
  discipline?: string;
  context?: TerrainContext; // optional context layer, never a requirement kind of its own
}

export interface TrainingGoalBase {
  id: string;
  name: string;
  requirements: GoalRequirement[];
  createdAt: string;
  updatedAt: string;
}

// Discriminated union — an ACTIVE goal cannot be constructed or stored
// without a targetDate; enforced by the compiler at every call site.
export type TrainingGoal =
  | (TrainingGoalBase & { status: 'active'; targetDate: string })
  | (TrainingGoalBase & { status: 'paused' | 'completed' | 'archived'; targetDate?: string });

// --- Generic achievement ladder — replaces Objective.milestones -----------

export interface GoalMilestone {
  id: string;    // STABLE — semantic slug, never order-derived
  goalId: string;
  order: number; // DISPLAY order only; identity lives in `id`
  title: string;
  requirement: MilestoneRequirement;
}

export interface GoalAchievementTrack {
  goalId: string;
  milestones: GoalMilestone[];
}

// Append-only — identical semantics to the legacy MilestoneProgress.
export interface GoalMilestoneProgress {
  id: string;
  goalId: string;
  milestoneId: string;
  clearedDate: string;
  sourceSessionLogId?: string;
  note?: string;
}

export type { MilestoneStatus };

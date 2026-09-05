// ASCEND — Plan Change Proposal / Goal Activation domain models (Technical
// Architecture v0.3.1 REVISED, Phase 5, review points 9 and 11).

import type { TrainingGoal } from './goals';
import type { CapabilityGap, PreparationTarget } from './capability';
import type { FeasibilityAssessment } from './feasibility';

export type PlanChangeAction = 'keep' | 'add' | 'move' | 'swap' | 'reduce' | 'replace' | 'remove';

export interface PlanChangeItem {
  plannedSessionId?: string; // absent only for 'add' — the row doesn't exist yet
  action: PlanChangeAction;
  fromDate?: string;
  toDate?: string;
  newPrescriptionId?: string;
  newSessionDraft?: { templateId: string; scheduledDate: string; weekStartDate: string }; // 'add' only
  // 'swap' only — the other PlannedSession's id this item exchanges dates
  // with. A bare 'swap' with no partner is structurally meaningless (one
  // PlanChangeItem alone can't express "with what"); a genuine swap is
  // always two items, each naming the other via this field, each carrying
  // its own new toDate (the partner's original date).
  pairedWithSessionId?: string;
}

export type EngineEvent =
  | 'goal_created' | 'goal_changed' | 'goal_removed' | 'goal_paused'
  | 'strategy_changed' | 'goal_priority_changed'
  | 'session_completed' | 'session_skipped' | 'session_moved' | 'no_time_today'
  | 'injury_added' | 'injury_resolved'
  | 'availability_changed' | 'new_training_data';

export interface PlanChangeAlternative {
  label: string;
  changes: PlanChangeItem[];
  consequences: string;
}

export interface PlanChangeProposal {
  id: string;
  trigger: EngineEvent;
  issue: string;
  changes: PlanChangeItem[];
  alternatives: PlanChangeAlternative[];
  consequences: string;
  explanation: string;
  createdAt: string;
  resolvedAt?: string;
  resolution?: 'accepted' | 'rejected';
}

export interface GoalActivationPlan {
  id: string;
  goalDraft: TrainingGoal; // normalized, not yet persisted
  preparationTargets: PreparationTarget[];
  gaps: CapabilityGap[];
  feasibility: FeasibilityAssessment;
  strategyOptions: { label: string; description: string }[];
  chosenStrategy?: string;
  committedWeekChanges: PlanChangeProposal; // current + next week
  forecastChanges: PlanChangeProposal; // week +2 onward, summary-level
  consequences: string;
  computedAt: string;
  inputStateHash: string; // detects "something changed since preview was shown"
}

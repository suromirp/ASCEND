// ASCEND — Plan Change Proposal / Goal Activation domain models (Technical
// Architecture v0.3.1 REVISED, Phase 5, review points 9 and 11).
//
// This IS the locked architecture's own audit-trail concept — the Storage
// plan names `planChangeProposals` directly ("Audit trail of shown
// proposals + resolution"). A differently-named/shaped `PlanRevision`
// entity was sketched only in this project's own SECONDARY, non-
// authoritative v0.3.3 self-authored patch — explicitly marked there as
// "recommended... not something this patch mandates," and never promoted
// to locked status. Persisting `PlanChangeProposal` (storage/database.ts's
// `PlanChangeProposalsRepo`, Phase 6) is a deliberate choice to use the
// PRIMARY document's own vocabulary, not a `PlanRevision` gap.

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
  // Why this specific item was proposed, and which engine/rule produced
  // it — captured HERE, not only on a referenced TrainingPrescription
  // (newPrescriptionId), because that row is deliberately NOT append-only
  // (storage/database.ts#TrainingPrescriptionsRepo keeps at most one
  // *current* prescription per session, deleting the previous one every
  // time the Adaptive Replanner re-runs). Without its own copy, a
  // PlanChangeProposal — meant to be a permanent, append-only audit
  // record — would silently lose exactly the "why"/"which rule version"
  // it exists to preserve the moment a later run supersedes that
  // prescription. generatedBy mirrors TrainingPrescription.generatedBy's
  // own shape: an ordered list ending in the deciding rule/ruleId.
  reason?: string;
  generatedBy?: string[];
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

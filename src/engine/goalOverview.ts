// ASCEND — Goal overview aggregator (Technical Architecture v0.3.1
// REVISED, Phase 4).
//
// Ties the existing Demand → Capability → Gap pipeline (Phase 2) together
// with this phase's Feasibility Engine and Goal Focus into one read model
// per active goal, for the read-only UI to render without re-deriving the
// wiring itself. Purely a composition layer — every actual computation
// still happens in its own engine file; this never invents a rule of its
// own.

import type { TrainingGoal } from '../models/goals';
import type { CapabilityEvidence, CapabilityGap } from '../models/capability';
import type { TrainingAvailability, TrainingGuardrail } from '../models/goalEngineConfig';
import type { FeasibilityAssessment, GoalFocus } from '../models/feasibility';
import { computeDemand } from './demand';
import { computeCapabilityEstimate } from './capability';
import { computeCapabilityGaps } from './gap';
import { computeFeasibility } from './feasibility';
import { computeGoalFocus, normalizeGoalFocusScores } from './goalFocus';
import { TAPER_WINDOW_DAYS } from './goalArbiter';
import { daysBetween } from '../utils/dates';

export interface GoalOverview {
  goal: TrainingGoal;
  gaps: CapabilityGap[];
  feasibility: FeasibilityAssessment;
  focus: GoalFocus;
}

// Only status:'active' goals have a targetDate at all (models/goals.ts's
// discriminated union) — a paused/completed/archived goal has nothing for
// Feasibility/Goal Focus to meaningfully assess yet, so it's simply
// skipped, never given an invented runway.
export function computeActiveGoalOverviews(
  goals: TrainingGoal[],
  allEvidence: CapabilityEvidence[],
  availability: TrainingAvailability,
  guardrails: TrainingGuardrail[],
  asOf: string,
): GoalOverview[] {
  const activeGoals = goals.filter((g): g is TrainingGoal & { status: 'active'; targetDate: string } => g.status === 'active');

  const partial = activeGoals.map((goal) => {
    const demands = computeDemand(goal.requirements);
    const estimates = demands.map((d) => computeCapabilityEstimate(d.key, allEvidence, asOf));
    const gaps = computeCapabilityGaps(demands, estimates);
    const daysToGoal = daysBetween(asOf, goal.targetDate);
    const weeksRemaining = Math.ceil(daysToGoal / 7);
    const isTapering = daysToGoal >= 0 && daysToGoal <= TAPER_WINDOW_DAYS;

    const feasibility = computeFeasibility({ goalId: goal.id, gaps, weeksRemaining, availability, guardrails });
    const criticalGapStatuses = gaps.filter((g) => g.criticality === 'critical').map((g) => g.status);
    const focus = computeGoalFocus({ goalId: goal.id, feasibility, criticalGapStatuses, daysToGoal, isTapering, asOf });

    return { goal, gaps, feasibility, focus };
  });

  const normalizedFoci = normalizeGoalFocusScores(partial.map((p) => p.focus));
  return partial.map((p, i) => ({ ...p, focus: normalizedFoci[i] }));
}

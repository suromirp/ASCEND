// ASCEND — Goal Focus (Technical Architecture v0.3.1 REVISED, Phase 4;
// Algorithm Contract v0.2b REVISED §42).
//
// Read-only weekly priority score — never writable, never presented as a
// workload percentage (engine module map's own "Must NOT" column). §42:
// "Goal Focus blijft read-only output... Geen simpele [universal formula]" —
// the exact weights below are one more ASCEND_HEURISTIC
// (HEURISTIC-GOAL-FOCUS-WEIGHTS, seeded in Phase 1, first consumed here),
// not a validated prioritization formula. Consumes FeasibilityAssessment
// and CapabilityGap statuses that are already computed elsewhere — this
// file never computes a gap, an estimate, or feasibility itself.

import type { FeasibilityAssessment, GoalFocus, GoalFocusReason } from '../models/feasibility';
import type { GapStatus } from '../models/capability';

const BASE_POINTS = 10;
const MAX_URGENCY_POINTS = 30;
const TAPER_PHASE_POINTS = 15;
const MAX_TRAINABLE_GAP_POINTS = 30;
const MAX_USER_PRIORITY_POINTS = 20;

const FEASIBILITY_PRESSURE_POINTS: Record<FeasibilityAssessment['status'], number> = {
  on_track: 5,
  challenging: 15,
  unlikely: 25,
  insufficient_data: 10,
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function urgencyPoints(daysToGoal: number | undefined): number {
  if (daysToGoal === undefined) return 0;
  // Linear ramp: far out contributes ~0, right up to the deadline ramps to
  // the max — an explainable heuristic, not a validated urgency curve.
  return clamp(MAX_URGENCY_POINTS - daysToGoal / 7, 0, MAX_URGENCY_POINTS);
}

function trainableGapPoints(criticalGapStatuses: GapStatus[]): number {
  const points = criticalGapStatuses.reduce((sum, status) => {
    if (status === 'major_gap') return sum + 10;
    if (status === 'gap') return sum + 5;
    return sum;
  }, 0);
  return clamp(points, 0, MAX_TRAINABLE_GAP_POINTS);
}

export interface GoalFocusInputs {
  goalId: string;
  feasibility: FeasibilityAssessment;
  // Only this goal's own critical-criticality CapabilityGap statuses
  // (§36 — non-critical gaps never drive priority either).
  criticalGapStatuses: GapStatus[];
  // Days until the goal's targetDate — undefined for a goal with no
  // deadline (e.g. paused).
  daysToGoal?: number;
  isTapering: boolean;
  // Optional manual weight (0-1) — absent means no explicit user
  // preference; never invented on the user's behalf.
  userPriority?: number;
  asOf: string;
}

// Unnormalized — call normalizeGoalFocusScores() across ALL of a user's
// active goals afterward to fill in normalizedPct (a relative share, only
// meaningful across the full set at once).
export function computeGoalFocus(inputs: GoalFocusInputs): GoalFocus {
  const { goalId, feasibility, criticalGapStatuses, daysToGoal, isTapering, userPriority, asOf } = inputs;

  const reasons: GoalFocusReason[] = [{ component: 'base', points: BASE_POINTS }];

  const urgency = urgencyPoints(daysToGoal);
  if (urgency > 0) reasons.push({ component: 'urgency', points: urgency });

  if (isTapering) reasons.push({ component: 'phase', points: TAPER_PHASE_POINTS });

  const feasibilityPressure = FEASIBILITY_PRESSURE_POINTS[feasibility.status];
  reasons.push({ component: 'feasibilityPressure', points: feasibilityPressure });

  const trainableGap = trainableGapPoints(criticalGapStatuses);
  if (trainableGap > 0) reasons.push({ component: 'trainableGap', points: trainableGap });

  if (userPriority !== undefined) {
    reasons.push({ component: 'userPriority', points: clamp(userPriority, 0, 1) * MAX_USER_PRIORITY_POINTS });
  }

  const score = reasons.reduce((sum, r) => sum + r.points, 0);

  return { goalId, score, normalizedPct: 0, reasons, asOf };
}

// A relative priority share across a user's own active goals — never a %
// of training time/workload. Splits the total evenly (0%) only when every
// goal scored exactly 0, which never happens in practice (BASE_POINTS
// alone is always > 0 for every goal passed in).
export function normalizeGoalFocusScores(list: GoalFocus[]): GoalFocus[] {
  const total = list.reduce((sum, g) => sum + g.score, 0);
  if (total <= 0) return list.map((g) => ({ ...g, normalizedPct: 0 }));
  return list.map((g) => ({ ...g, normalizedPct: (g.score / total) * 100 }));
}

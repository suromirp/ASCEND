// ASCEND — Strength Program Strategy: review triggers & recommendation
// (Strength Program Strategy Addendum v0.1 §5-§6, Phase 8).
//
// A review is a suggestion, never an automatic rewrite (§5) — this module
// only ever DECIDES whether/why a review is due and what it would suggest;
// applying a change is always a separate, explicit user action (see
// engine/strengthScheduling.ts + state/AppDataContext.tsx#activateStrengthProgram).
//
// Deliberately takes already-computed signals as plain input rather than
// re-deriving "did X change" itself (e.g. from GoalFocus/Feasibility,
// PlanChangeProposal history, injury notes) — this file never computes a
// gap, an estimate, a feasibility, or a goal focus; it only composes
// already-existing engine outputs into a strength-specific decision,
// exactly like engine/goalArbiter.ts does for cross-goal conflicts.

import type { StrengthProgramStrategy, StrengthProgramRecommendation, StrengthReviewTrigger } from '../models/strengthProgram';
import type { GoalOverview } from './goalOverview';
import { daysBetween } from '../utils/dates';
import { makeId } from '../utils/id';

export function activeStrengthStrategy(strategies: StrengthProgramStrategy[]): StrengthProgramStrategy | undefined {
  return strategies.find((s) => s.status === 'active' || s.status === 'ending');
}

export function daysUntilBlockEnd(strategy: StrengthProgramStrategy, asOf: string): number | undefined {
  return strategy.plannedEndDate ? daysBetween(asOf, strategy.plannedEndDate) : undefined;
}

// §5's own "roughly 8-week review can be a sensible default/product
// heuristic, but must not be a universal hard rule" — this is the review
// WINDOW (how far ahead of the end date to start suggesting a look), not
// the block length itself, which the user sets per block.
const REVIEW_WINDOW_DAYS = 14;

// More than one 48h leg-heavy cascade recently is a real, repeated signal
// (§5: "repeated lower-body conflicts occur") — a single one-off cascade
// is exactly what the existing scheduler already resolves on its own and
// isn't, by itself, evidence the strategy needs rethinking.
const REPEATED_LEG_CONFLICT_THRESHOLD = 2;

export interface StrengthReviewSignals {
  daysUntilBlockEnd?: number;
  userReportedSchemaEnded: boolean;
  activeGoalChangedSinceBlockStart: boolean;
  goalEnteredNewPhaseSinceBlockStart: boolean;
  availabilityOrPriorityChangedSinceBlockStart: boolean;
  recentLegConflictCount: number;
  injuryChangedSinceBlockStart: boolean;
}

export function computeStrengthReviewTriggers(signals: StrengthReviewSignals): StrengthReviewTrigger[] {
  const triggers: StrengthReviewTrigger[] = [];
  if (signals.daysUntilBlockEnd !== undefined && signals.daysUntilBlockEnd <= REVIEW_WINDOW_DAYS) triggers.push('block_ending_soon');
  if (signals.userReportedSchemaEnded) triggers.push('user_reported_schema_ended');
  if (signals.activeGoalChangedSinceBlockStart) triggers.push('goal_added_or_changed');
  if (signals.goalEnteredNewPhaseSinceBlockStart) triggers.push('goal_phase_changed');
  if (signals.availabilityOrPriorityChangedSinceBlockStart) {
    triggers.push('availability_changed', 'priority_changed');
  }
  if (signals.recentLegConflictCount >= REPEATED_LEG_CONFLICT_THRESHOLD) triggers.push('repeated_leg_conflicts');
  if (signals.injuryChangedSinceBlockStart) triggers.push('injury_changed');
  return triggers;
}

export interface StrengthRecommendationInputs {
  currentStrategy?: StrengthProgramStrategy;
  triggers: StrengthReviewTrigger[];
  // Only ever read for the already-computed `focus.reasons`/`feasibility`
  // shape (Phase 4) — never recomputed here.
  goalOverviews: GoalOverview[];
  asOf: string;
}

const DEFAULT_SESSIONS_PER_WEEK = 3;
const DEFAULT_SPLIT_TYPE = 'upper_lower';
const DEFAULT_BLOCK_WEEKS = 8; // §5's own "roughly 8-week... default heuristic, not a universal rule"

// §6 — advises at strategy level, explains WHY it fits the user's current
// active goals/phase. Every suggested number here is either carried over
// from the current block (repeat-by-default) or nudged by one concrete,
// named trigger below — never a fabricated "optimal" figure with no
// evidence behind it (the same anti-schijnprecisie discipline the Gap/
// Preparation Target engines already follow).
export function buildStrengthProgramRecommendation(inputs: StrengthRecommendationInputs): StrengthProgramRecommendation {
  const { currentStrategy, triggers, goalOverviews, asOf } = inputs;

  let suggestedSessionsPerWeek = currentStrategy?.sessionsPerWeek ?? DEFAULT_SESSIONS_PER_WEEK;
  const suggestedSplitType = currentStrategy?.splitType ?? DEFAULT_SPLIT_TYPE;
  const suggestedBlockWeeks = currentStrategy?.plannedBlockWeeks ?? DEFAULT_BLOCK_WEEKS;
  const rationaleParts: string[] = [];

  // The one concrete, honest "why" this engine can currently read from an
  // active goal's phase: Goal Focus already flags a tapering goal via its
  // own 'phase' reason component (engine/goalFocus.ts) — reused as-is,
  // never re-derived here. Matches §6's own worked example ("lower-body
  // volume/intensity moderated because running load is increasing").
  const taperingGoal = goalOverviews.find((o) => o.focus.reasons.some((r) => r.component === 'phase'));
  if (taperingGoal && triggers.includes('goal_phase_changed')) {
    rationaleParts.push(
      `${taperingGoal.goal.name} treedt de taper-fase in — lower-body volume/intensiteit kan gematigd worden zolang dat duurt.`,
    );
  }

  if (triggers.includes('repeated_leg_conflicts')) {
    rationaleParts.push(
      'Er waren de laatste tijd herhaaldelijk conflicten tussen zware beensessies en andere training — een lagere frequentie kan dit verminderen.',
    );
    suggestedSessionsPerWeek = Math.max(2, suggestedSessionsPerWeek - 1);
  }

  if (triggers.includes('block_ending_soon')) {
    rationaleParts.push('Je huidige krachtblok loopt bijna af.');
  }
  if (triggers.includes('user_reported_schema_ended')) {
    rationaleParts.push('Je gaf zelf aan dat je huidige schema is afgelopen.');
  }
  if (triggers.includes('goal_added_or_changed')) {
    rationaleParts.push('Er is een actief doel toegevoegd of gewijzigd sinds dit blok begon.');
  }
  if (triggers.includes('availability_changed')) {
    rationaleParts.push('Je trainingsbeschikbaarheid of -voorkeuren zijn gewijzigd sinds dit blok begon.');
  }
  if (triggers.includes('injury_changed')) {
    rationaleParts.push('Er is een blessure bijgewerkt sinds dit blok begon.');
  }
  if (rationaleParts.length === 0) {
    rationaleParts.push('Periodieke check-in — geen specifiek knelpunt gevonden, dit is het huidige blok herhalen.');
  }

  return {
    id: makeId('strengthrec'),
    strategyId: currentStrategy?.id,
    triggeredBy: triggers,
    suggestedSessionsPerWeek,
    suggestedSplitType,
    suggestedBlockWeeks,
    rationale: rationaleParts.join(' '),
    createdAt: asOf,
  };
}

// ASCEND — Weekly Prescription Builder domain models.
//
// Decides WHAT a week needs (session count/duration/volume/D+/D-/intensity
// per capability, and PROGRESS/CONSOLIDATE/REDUCE/REPLACE/TAPER/KEEP) —
// never WHERE. Placement stays exclusively engine/candidatePlacement.ts's
// searchWeeklyPlacement (via engine/weekReconciliation.ts) — this file's
// own shapes carry no date/day-of-week field anywhere, on purpose,
// mirroring StrengthProgramStrategy's own "never a scheduling decision"
// boundary (models/strengthProgram.ts).
//
// Reuses TrainingPrescription's numeric field shapes (models/prescription.ts)
// rather than inventing a second vocabulary — a WeeklyPrescriptionLine's
// target* fields are exactly what a downstream TrainingPrescription/
// newSessionDraft gets populated from once the line is realized into actual
// sessions (engine/weeklyPrescriptionEngine.ts).
//
// Strength is deliberately absent as a line kind: ASCEND already owns
// strength frequency/split/placement via StrengthProgramStrategy +
// engine/strengthScheduling.ts (Strength Program Strategy Addendum v0.1).
// This file only ever READS an active StrengthProgramStrategy as an
// occupancy constraint (how much room is left in the week) — never
// produces a line that looks like it decides strength content, which would
// blur a boundary this codebase states identically in ~10 other files.

import type { MeasuredValue } from './units';
import type { TerrainContext } from './goals';
import type { CapabilityKey } from './capability';
import type { ProgressionState } from './progression';

// Week-level decision, distinct from (and consuming, never replacing) the
// existing per-CapabilityKey ProgressionDecision.state (models/progression.ts).
// A ProgressionDecision answers "should this capability get harder" in the
// abstract; a WeeklyPrescriptionDecision answers "what should THIS WEEK's
// session count/volume for this slot actually be, and why" — the same
// distinction v0.2b REVISED §1.2 draws for CONSOLIDATE-as-a-full-state
// applies here too: 'keep' is a full, reasoned state, never a silent default.
//
// 'replace' here means: session count/volume unchanged, but the candidate
// SessionTemplate(s) that should satisfy this slot changed character (e.g.
// a generic long run swapped for a loaded hike as the specificity ramp
// enters the 'specific' band) — distinct from PlanChangeItem's own
// 'replace' (which means "new TrainingPrescription content for an existing
// PlannedSession"), though this decision is exactly what drives emitting
// that PlanChangeItem action downstream.
export type WeeklyPrescriptionDecision = 'keep' | 'progress' | 'consolidate' | 'reduce' | 'replace' | 'taper';

// ASCEND_HEURISTIC(SPECIFICITY-RAMP-BANDS): coarse, quantized bands rather
// than a continuous function of raw daysToGoal — deliberately, so the same
// band persists across many weeks and KEEP (engine/weeklyPrescriptionBuilder.ts)
// is actually achievable, not defeated by a number that changes every
// single day even when nothing else about the week did. 'taper' aligns
// exactly with the existing TAPER_WINDOW_DAYS=21 (engine/goalArbiter.ts) —
// never a second, disagreeing taper boundary. Boundaries beyond that are a
// first-pass starting point, not validated against any specific goal length.
export type SpecificityRampBand = 'base' | 'build' | 'specific' | 'taper';

export interface WeeklyPrescriptionLine {
  id: string;
  // Stable across weeks for the SAME purpose (same primaryKey + same
  // driving goalId set) — derived deterministically, never a fresh makeId()
  // per week, or week-over-week KEEP comparison (the whole point of this
  // field existing) would have nothing to match against. See
  // engine/weeklyPrescriptionBuilder.ts#slotIdFor.
  slotId: string;
  // What this line exists to build — reuses CapabilityKey's own shape
  // (models/capability.ts) rather than a parallel vocabulary.
  primaryKey: CapabilityKey;
  // Every active goal this line's target volume was derived from, for
  // audit only. A session can structurally serve more than one goal at
  // once (engine/sessionContribution.ts) — MERGE (one session's volume
  // need deliberately shared/reasoned across two goals at once) stays
  // explicitly out of scope for this phase, exactly as it was excluded
  // from the Groep C placement-quality work; this field never implies that
  // decision was made, only that the line's target was influenced by these
  // goals. Cross-goal arbitration (which goal's demand actually WINS when
  // they differ for the same key) happens earlier, in
  // engine/weeklyPrescriptionBuilder.ts#resolveWeeklyCapabilityDemand —
  // goalIds is never itself the arbitration rule.
  goalIds: string[];
  targetSessionCount: number;
  // Reuses TrainingPrescription's own numeric field shapes (models/
  // prescription.ts) as a MIN/MAX range rather than a point value — a week-
  // level target is inherently a range ("one of the week's sessions should
  // land 14-18km"), collapsed to a single candidate value only once
  // engine/weeklyPrescriptionEngine.ts hands a concrete number to
  // engine/specialists/{running,mountainAdventure}.ts for one specific
  // occurrence.
  targetDuration?: { min: MeasuredValue; max: MeasuredValue };
  targetDistance?: { min: MeasuredValue; max: MeasuredValue };
  elevationGain?: { min: MeasuredValue; max: MeasuredValue };
  elevationLoss?: { min: MeasuredValue; max: MeasuredValue };
  packWeight?: MeasuredValue; // event-specificity, never a range — see engine/demand.ts#targetPackWeightKg precedent
  targetRpe?: number;
  context?: TerrainContext;
  // Which of the EXISTING SessionTemplate rows could satisfy this line —
  // read-only relationship, exactly like StrengthProgramStrategy.
  // sessionTemplateIds (models/strengthProgram.ts) — never a duplicate copy
  // of duration/stress/exercise data, which stays on SessionTemplate.
  candidateTemplateIds: string[];
  decision: WeeklyPrescriptionDecision;
  reason: string;
  ruleId: string;
  // Carried straight through from the per-CapabilityKey ProgressionDecision
  // this line consumed as input (engine/progressionOrchestrator.ts via
  // engine/progressionDecisions.ts, resolved across goals by
  // resolveWeeklyCapabilityDemand) — this file never recomputes capability/
  // readiness/progression itself, only derives the week-level session-
  // count/volume CONSEQUENCE of an already-made decision.
  sourceProgressionState: ProgressionState;
  specificityWeight: number; // the multiplier actually applied this week — for audit/explainability, not itself a decision input elsewhere
}

export interface WeeklyPrescription {
  id: string;
  weekStartDate: string; // Monday — models/training.ts's own PlannedSession.weekStartDate convention
  lines: WeeklyPrescriptionLine[];
  // Read-only echo of the active StrengthProgramStrategy at computation
  // time, for audit/explainability only ("why was there less room this
  // week") — never a decision this file makes, never written back to
  // StrengthProgramStrategy. Absent when no strategy is active.
  strengthConstraintSnapshot?: { strategyId: string; sessionsPerWeek: number };
  // Quantized-input fingerprint, audit-only — never a computation shortcut
  // (engine/weeklyPrescriptionBuilder.ts always fully recomputes every
  // line; this field only records what the computation was based on).
  skeletonSignature: string;
  consecutiveKeepWeeks: number;
  // Mirrors ProgressionDecision.accumulationReviewDue's own precedent
  // (models/progression.ts) exactly: never itself forces a change, purely a
  // "worth a human glance" flag once a skeleton has gone unchanged long
  // enough that staleness, not genuine stability, becomes the more likely
  // explanation — same "deliberate checkpoint, not automatic rewrite"
  // framing accumulationReviewDue's own comment already establishes.
  reviewDue: boolean;
  specificityRampBand: SpecificityRampBand;
  // Per-goal daysToGoal snapshot at computation time, for audit — the
  // taper/specificity math itself always re-reads goal.targetDate live,
  // never trusts a stale copy of this.
  goalSnapshot: { goalId: string; daysToGoal: number }[];
  generatedBy: string[];
  computedAt: string;
}

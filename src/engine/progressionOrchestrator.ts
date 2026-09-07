// ASCEND — Progression Orchestrator (Technical Architecture v0.3.1 REVISED,
// Phase 3; Algorithm Contract v0.2b REVISED §5, §8-§13).
//
// The one place Capability + Confidence + Readiness + Capacity + guardrails
// meet (engine module map). Deliberately does NOT compute capability,
// readiness, or capacity itself — all three are passed in, already
// computed by engine/capability.ts, engine/readiness.ts, and (Fase 3,
// sports-science review) engine/capacity.ts. This file only combines them
// into one ProgressionDecision per CapabilityKey.
//
// v0.2b REVISED §1.2: CONSOLIDATE is a full state, never just "not quite
// PROGRESS". §11: no single readiness metric is a master override — the
// gates below read engine/readiness.ts's already-multi-signal
// ReadinessBreakdown (acute recovery: recovery/consistency/subjective
// response) alongside engine/capacity.ts's exposure breakdown (how much
// recent building-block volume exists per dimension) — never one raw
// wearable number, and never conflating "have you built the base" with
// "are you recovered enough right now," the two questions the Fase 3
// split exists to keep separate. §12: one poor session never wipes
// capability on its own — poorResponsePattern only trips on 2-of-3 recent
// sessions (HEURISTIC-POOR-RESPONSE-2-OF-3), matching the contract's
// explicit rejection of a single-session penalty formula.

import type { CapabilityEstimate, CapabilityDimension, CapabilityKey } from '../models/capability';
import type { TrainingGuardrail } from '../models/goalEngineConfig';
import type { SessionLog } from '../models/training';
import type { ProgressionDecision, ProgressionState } from '../models/progression';
import type { ReadinessBreakdown } from './readiness';
import type { CapacityBreakdown } from './capacity';
import { detectRecentSpike } from './progressionSpikes';

// ASCEND_HEURISTIC cutoffs (HEURISTIC-PROGRESSION-READINESS-GATE) —
// calibration values, not a validated readiness formula; the underlying
// "readiness is multi-signal" principle is itself evidence-backed
// (E-RECOVERY-001..004). Sports-science review (Fase 3, September 2026):
// widened from the original exact 35/55 cliff-edges into a small buffer
// band, so a 1-point score change right at the boundary is less likely to
// flip the decision outright. This is NOT full persistent hysteresis
// (remembering the previous zone across calls, requiring decision-history
// storage this codebase doesn't have yet) — that's a natural next step,
// not built here; this is a modest, honest first step toward it.
const READINESS_RECOVER_THRESHOLD = 30;
const READINESS_CAUTION_THRESHOLD = 60;

// Guardrail rule ids that specifically gate progression rate (the
// §69-seeded "*-progression-bands"/pack-weight-bands heuristics) — a user
// 'block' guardrail on one of these caps an intended 'progress' down to
// 'consolidate' (v0.2b REVISED §1.3: a deadline/decision never silently
// overrides a guardrail).
const PROGRESSION_GUARDRAIL_RULE_IDS = new Set([
  'HEURISTIC-RUNNING-PROGRESSION-BANDS',
  'HEURISTIC-CYCLING-PROGRESSION-BANDS',
  'HEURISTIC-ELEVATION-PROGRESSION-BANDS',
  'HEURISTIC-PACK-WEIGHT-BANDS',
]);

// Renamed from readinessSignalForDimension (Fase 3): this was always
// reading "how much recent exposure/volume has there been in this area" —
// a CAPACITY question (has the base been built to progress further from),
// not a readiness one (are you acutely recovered enough right now). It
// stayed a gate either way (progressive overload needs an adequately built
// base), just housed in the wrong module before the capacity/readiness
// split.
function capacitySignalForDimension(dimension: CapabilityDimension, capacity: CapacityBreakdown): number {
  switch (dimension) {
    case 'aerobic_engine':
    case 'sustainable_output':
      return capacity.cardio;
    case 'endurance_duration':
    case 'multi_day_durability':
    case 'fatigue_resistance':
      return capacity.endurance;
    case 'mechanical_tolerance':
      return capacity.endurance;
    case 'ascent_capacity':
    case 'descent_tolerance':
      return capacity.climbing;
    case 'load_carriage':
      return capacity.packCapability;
    case 'strength':
      return capacity.strength;
    default:
      return capacity.overall;
  }
}

// Session Response classification (v0.2b REVISED §10) is multi-signal in
// the full contract; this is the deliberately narrow slice actually
// available on a SessionLog today — subjective feel, RPE, and completion
// variant — without inventing pace/HR-deviation-from-target data no
// TrainingPrescription exists yet to compare against (that comparison is
// Phase 4+, once specialists' prescriptions are actually being logged
// against).
function isPoorResponse(log: SessionLog): boolean {
  if (log.subjectiveFeel === 'worse') return true;
  if (log.rpe !== undefined && log.rpe >= 9) return true;
  if (log.variant === 'minimum') return true;
  return false;
}

export interface ProgressionOrchestratorInputs {
  key: CapabilityKey;
  estimate: CapabilityEstimate;
  readiness: ReadinessBreakdown;
  // engine/capacity.ts's exposure/fitness breakdown (Fase 3) — how much
  // recent building-block volume exists in this dimension, distinct from
  // acute readiness. Deliberately required, not defaulted: a missing
  // capacity input silently defaulting to all-zero would read as "no
  // recent exposure anywhere" and degrade every decision to consolidate —
  // far worse than a compile error at the call site.
  capacity: CapacityBreakdown;
  guardrails?: TrainingGuardrail[];
  // Most-recent-first, already filtered to logs relevant to this key by the
  // caller. The most recent 3 feed the §10-13 poor-response classification
  // window; the full array (ideally ~30+ days deep) feeds
  // engine/progressionSpikes.ts's single-session-spike check.
  recentLogs?: SessionLog[];
  // How many consecutive 'progress' decisions this key already received —
  // caller-tracked, since this function is a pure combiner and never reads
  // decision history itself (HEURISTIC-ACCUMULATION-REVIEW-3-PROGRESSIONS).
  consecutiveProgressCount?: number;
}

export function computeProgressionDecision(inputs: ProgressionOrchestratorInputs): ProgressionDecision {
  const { key, estimate, readiness, capacity, guardrails = [], recentLogs = [], consecutiveProgressCount = 0 } = inputs;

  // v0.2 §23: missing data is never interpreted as bad capability — nor as
  // a reason to progress. 'unknown' confidence always resolves to 'assess'.
  if (estimate.confidence === 'unknown') {
    return {
      key,
      state: 'assess',
      reason: 'Hier is nog te weinig over jou bekend — eerst gegevens verzamelen voordat er een voortgangsbeslissing valt.',
      ruleId: 'PRODUCT-ASSESS-INSUFFICIENT-DATA',
      poorResponsePattern: false,
      accumulationReviewDue: false,
    };
  }

  // The weaker of the two acute-readiness signals, not their average —
  // matches the review's critique of naive averaging: a good recovery
  // score should never mask a run of "worse than normal" subjective
  // responses, or vice versa.
  const recoverySignal = Math.min(readiness.recovery, readiness.subjectiveSignal);
  const dimensionSignal = capacitySignalForDimension(key.dimension, capacity);

  const recentThree = recentLogs.slice(0, 3);
  const poorCount = recentThree.filter(isPoorResponse).length;
  const poorResponsePattern = recentThree.length >= 2 && poorCount >= 2;
  const spikeSignal = detectRecentSpike(recentLogs);

  let state: ProgressionState;
  let reason: string;
  let ruleId: string;

  if (recoverySignal < READINESS_RECOVER_THRESHOLD) {
    state = 'recover';
    reason = `Herstelsignaal is laag (${recoverySignal}%) — voorrang aan herstel boven verdere opbouw.`;
    ruleId = 'HEURISTIC-PROGRESSION-READINESS-GATE';
  } else if (poorResponsePattern) {
    // §12: repeated poor responses are a stronger capability-reassessment
    // signal than any single one — 'reduce', not just 'consolidate'.
    state = 'reduce';
    reason = 'Meerdere recente sessies vielen zwaarder uit dan verwacht — belasting tijdelijk verlagen.';
    ruleId = 'HEURISTIC-POOR-RESPONSE-2-OF-3';
  } else if (estimate.trend === 'declining') {
    state = 'consolidate';
    reason = 'De trend hierin is dalend — huidige belasting vasthouden in plaats van opbouwen.';
    ruleId = 'HEURISTIC-PROGRESSION-TREND-GATE';
  } else if (spikeSignal.detected) {
    // engine/progressionSpikes.ts — the most recent session already
    // represented an outsized single-session jump vs. its own 30-day
    // baseline. Let the body absorb that before pushing further, rather
    // than stacking a second progression on top of an unabsorbed one.
    state = 'consolidate';
    reason = spikeSignal.reason!;
    ruleId = 'HEURISTIC-PROGRESSION-SPIKE-DETECTED';
  } else if (recoverySignal < READINESS_CAUTION_THRESHOLD || dimensionSignal < READINESS_CAUTION_THRESHOLD) {
    state = 'consolidate';
    reason = recoverySignal < dimensionSignal
      ? `Je herstel is nog niet stevig genoeg (${recoverySignal}%) om verder op te bouwen.`
      : `Nog niet genoeg recente opbouw in dit gebied (${dimensionSignal}%) om verder te gaan.`;
    ruleId = 'HEURISTIC-PROGRESSION-READINESS-GATE';
  } else if (estimate.confidence === 'low') {
    state = 'assess';
    reason = 'Nog te weinig over jou bekend hierover — eerst meer bevestiging verzamelen.';
    ruleId = 'PRODUCT-ASSESS-INSUFFICIENT-DATA';
  } else if (estimate.confidence === 'medium') {
    state = 'consolidate';
    reason = 'Nog niet genoeg bekend voor een volgende stap — huidige belasting vasthouden.';
    ruleId = 'HEURISTIC-PROGRESSION-CONFIDENCE-GATE';
  } else {
    state = 'progress';
    reason = 'Genoeg bekend, een stabiele of stijgende trend en goed herstel ondersteunen een volgende stap.';
    ruleId = 'HEURISTIC-PROGRESSION-CONFIDENCE-GATE';
  }

  if (state === 'progress') {
    const blocked = guardrails.some((g) => g.mode === 'block' && PROGRESSION_GUARDRAIL_RULE_IDS.has(g.ruleId));
    if (blocked) {
      state = 'consolidate';
      reason = `${reason} Een ingestelde grens blokkeert verdere opbouw op dit moment.`;
      ruleId = 'PRODUCT-GUARDRAIL-BLOCK';
    }
  }

  const accumulationReviewDue = state === 'progress' && consecutiveProgressCount + 1 >= 3;

  // Fase 6 (sports-science review, item D4): this signal never itself
  // forces a scale-back — `state` above is untouched by it, still
  // 'progress'. Its only job is to make that explicit in the reason text
  // too, the moment this ever reaches a UI (HEURISTIC-ACCUMULATION-REVIEW-
  // 3-PROGRESSIONS's own trigger doc already says the same at the type
  // level — this is that framing actually reaching the explanation a human
  // would read, not a second, silently-conflicting copy of it).
  const finalReason = accumulationReviewDue
    ? `${reason} Dit is de derde opeenvolgende stap — een natuurlijk controlemoment om samen te checken of dit tempo nog goed voelt, geen automatische terugschaling.`
    : reason;

  return { key, state, reason: finalReason, ruleId, poorResponsePattern, accumulationReviewDue };
}

// Note: this function never returns 'taper'. Per v0.2b REVISED §32, taper
// is triggered by proximity to a goal's event date, not by capability/
// readiness signals — that trigger belongs to Phase 4's Feasibility/Goal
// Arbiter work ("taper/freshen states"), which this Phase 3 orchestrator
// deliberately doesn't implement yet. The state stays in the type because
// every other module already models it (ProgressionDecision, the
// specialists' role mapping) — only its trigger is still missing.

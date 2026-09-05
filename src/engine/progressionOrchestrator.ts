// ASCEND — Progression Orchestrator (Technical Architecture v0.3.1 REVISED,
// Phase 3; Algorithm Contract v0.2b REVISED §5, §8-§13).
//
// The one place Capability + Confidence + Readiness + guardrails meet
// (engine module map). Deliberately does NOT compute capability or
// readiness itself — both are passed in, already computed by the Capability
// Engine (engine/capability.ts) and the existing, independent
// engine/readiness.ts. This file only combines them into one
// ProgressionDecision per CapabilityKey.
//
// v0.2b REVISED §1.2: CONSOLIDATE is a full state, never just "not quite
// PROGRESS". §11: no single readiness metric is a master override — the
// gates below read engine/readiness.ts's already-multi-signal
// ReadinessBreakdown, never one raw wearable number. §12: one poor session
// never wipes capability on its own — poorResponsePattern only trips on 2-
// of-3 recent sessions (HEURISTIC-POOR-RESPONSE-2-OF-3), matching the
// contract's explicit rejection of a single-session penalty formula.

import type { CapabilityEstimate, CapabilityDimension, CapabilityKey } from '../models/capability';
import type { TrainingGuardrail } from '../models/goalEngineConfig';
import type { SessionLog } from '../models/training';
import type { ProgressionDecision, ProgressionState } from '../models/progression';
import type { ReadinessBreakdown } from './readiness';

// ASCEND_HEURISTIC cutoffs against engine/readiness.ts's existing 0-100
// scores (HEURISTIC-PROGRESSION-READINESS-GATE) — calibration values, not a
// validated readiness formula; the underlying "readiness is multi-signal"
// principle is itself evidence-backed (E-RECOVERY-001..004).
const READINESS_RECOVER_THRESHOLD = 35;
const READINESS_CAUTION_THRESHOLD = 55;

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

function readinessSignalForDimension(dimension: CapabilityDimension, readiness: ReadinessBreakdown): number {
  switch (dimension) {
    case 'aerobic_engine':
    case 'sustainable_output':
      return readiness.cardio;
    case 'endurance_duration':
    case 'multi_day_durability':
    case 'fatigue_resistance':
      return readiness.endurance;
    case 'mechanical_tolerance':
      return readiness.endurance;
    case 'ascent_capacity':
    case 'descent_tolerance':
      return readiness.climbing;
    case 'load_carriage':
      return readiness.packCapability;
    case 'strength':
      return readiness.strength;
    default:
      return readiness.overall;
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
  guardrails?: TrainingGuardrail[];
  // Most-recent-first, already filtered to logs relevant to this key by the
  // caller — only the most recent 3 are read (§10-13's response
  // classification window).
  recentLogs?: SessionLog[];
  // How many consecutive 'progress' decisions this key already received —
  // caller-tracked, since this function is a pure combiner and never reads
  // decision history itself (HEURISTIC-ACCUMULATION-REVIEW-3-PROGRESSIONS).
  consecutiveProgressCount?: number;
}

export function computeProgressionDecision(inputs: ProgressionOrchestratorInputs): ProgressionDecision {
  const { key, estimate, readiness, guardrails = [], recentLogs = [], consecutiveProgressCount = 0 } = inputs;

  // v0.2 §23: missing data is never interpreted as bad capability — nor as
  // a reason to progress. 'unknown' confidence always resolves to 'assess'.
  if (estimate.confidence === 'unknown') {
    return {
      key,
      state: 'assess',
      reason: 'Nog geen evidence voor deze capability — eerst data verzamelen voordat een voortgangsbeslissing wordt genomen.',
      ruleId: 'PRODUCT-ASSESS-INSUFFICIENT-DATA',
      poorResponsePattern: false,
      accumulationReviewDue: false,
    };
  }

  const recoverySignal = readiness.recovery;
  const dimensionSignal = readinessSignalForDimension(key.dimension, readiness);

  const recentThree = recentLogs.slice(0, 3);
  const poorCount = recentThree.filter(isPoorResponse).length;
  const poorResponsePattern = recentThree.length >= 2 && poorCount >= 2;

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
    reason = 'Capability-trend is dalend — huidige belasting consolideren in plaats van opbouwen.';
    ruleId = 'HEURISTIC-PROGRESSION-TREND-GATE';
  } else if (recoverySignal < READINESS_CAUTION_THRESHOLD || dimensionSignal < READINESS_CAUTION_THRESHOLD) {
    state = 'consolidate';
    reason = `Readiness is nog niet stevig genoeg (${Math.min(recoverySignal, dimensionSignal)}%) om verder op te bouwen.`;
    ruleId = 'HEURISTIC-PROGRESSION-READINESS-GATE';
  } else if (estimate.confidence === 'low') {
    state = 'assess';
    reason = 'Beperkte evidence voor deze capability — eerst meer bevestiging verzamelen.';
    ruleId = 'PRODUCT-ASSESS-INSUFFICIENT-DATA';
  } else if (estimate.confidence === 'medium') {
    state = 'consolidate';
    reason = 'Evidence is nog niet robuust genoeg voor een volgende stap — huidige belasting consolideren.';
    ruleId = 'HEURISTIC-PROGRESSION-CONFIDENCE-GATE';
  } else {
    state = 'progress';
    reason = 'Voldoende evidence, een stabiele of stijgende trend en goede readiness ondersteunen een volgende stap.';
    ruleId = 'HEURISTIC-PROGRESSION-CONFIDENCE-GATE';
  }

  if (state === 'progress') {
    const blocked = guardrails.some((g) => g.mode === 'block' && PROGRESSION_GUARDRAIL_RULE_IDS.has(g.ruleId));
    if (blocked) {
      state = 'consolidate';
      reason = `${reason} Een ingestelde guardrail blokkeert verdere opbouw op dit moment.`;
      ruleId = 'PRODUCT-GUARDRAIL-BLOCK';
    }
  }

  const accumulationReviewDue = state === 'progress' && consecutiveProgressCount + 1 >= 3;

  return { key, state, reason, ruleId, poorResponsePattern, accumulationReviewDue };
}

// Note: this function never returns 'taper'. Per v0.2b REVISED §32, taper
// is triggered by proximity to a goal's event date, not by capability/
// readiness signals — that trigger belongs to Phase 4's Feasibility/Goal
// Arbiter work ("taper/freshen states"), which this Phase 3 orchestrator
// deliberately doesn't implement yet. The state stays in the type because
// every other module already models it (ProgressionDecision, the
// specialists' role mapping) — only its trigger is still missing.

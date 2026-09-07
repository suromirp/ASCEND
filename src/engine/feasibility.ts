// ASCEND — Feasibility Engine (Technical Architecture v0.3.1 REVISED,
// Phase 4; Algorithm Contract v0.2b REVISED §35-§38).
//
// An ASCEND-calibrated model, explicitly not a validated predictor (§35) —
// never a pseudo-precise success percentage, only a coarse
// ON_TRACK/CHALLENGING/UNLIKELY/INSUFFICIENT_DATA category plus a
// bottleneck and an explanation. Bottleneck-aware (§36): a supporting
// strength can never average out one major critical gap. Consumes
// CapabilityGap[] from the existing, independent Gap Engine — this file
// never computes a gap or an estimate itself.

import type { CapabilityGap, GapStatus } from '../models/capability';
import type { TrainingAvailability, TrainingGuardrail } from '../models/goalEngineConfig';
import type { FeasibilityAssessment } from '../models/feasibility';
import { capabilityKeyLabel } from '../data/baselineQuestions';

// ASCEND_HEURISTIC runway calibration (HEURISTIC-FEASIBILITY-CATEGORY-
// SIMULATION, seeded in Phase 1, first consumed here) — a starting default
// for "required development vs. plausible runway" (§37), not a validated
// formula. Deadline never silently inflates this (§37: "Deadline vergroot
// de progression heuristic niet stil").
const TIGHT_RUNWAY_WEEKS = 4;
const GENEROUS_RUNWAY_WEEKS = 8;
// Only used when there's no deadline to simulate a runway against at all
// (see hasSufficientAvailability below) — a plain "is this a workable
// weekly pattern" snapshot, not a hard gate on whether a real gap can close.
const FALLBACK_MIN_ALLOWED_DAYS = 4;

// ASCEND_HEURISTIC(FEASIBILITY-FORWARD-SIMULATION): Fase 6 (sports-science
// review, item E1). A closed major_gap realistically needs several repeated
// long-session exposures (the D+/distance/pack sessions that actually move
// a mountain-adventure capability), not just calendar weeks. Not a
// validated number — a starting estimate of "the fewest long-session
// occurrences that could plausibly close a major gap," reused as the
// forward-simulation's pass bar below.
const MIN_LONG_SESSION_EXPOSURES_FOR_MAJOR_GAP = 6;

const GAP_SEVERITY: Record<GapStatus, number> = {
  exceeds: 0,
  meets: 0,
  near: 1,
  gap: 2,
  major_gap: 3,
  unknown: -1, // handled separately — never treated as a demonstrated deficiency (§23)
};

// Previously a static snapshot — <4 allowed days OR 0 long-session days
// always read as "insufficient" regardless of how many weeks remained, and
// conversely any pattern meeting that bar always counted as "sufficient"
// even with almost no runway left to actually use it. Replaced with a
// simple forward simulation: how many real long-session exposures the
// remaining weeks × the weekly long-session pattern would actually produce.
// A goal with no deadline has no runway to simulate against, so it falls
// back to the original day-count snapshot — a plain "is this a workable
// weekly pattern" read, not a projection.
export function hasSufficientAvailability(weeksRemaining: number | undefined, availability: TrainingAvailability): boolean {
  if (weeksRemaining === undefined) {
    return availability.allowedDays.length >= FALLBACK_MIN_ALLOWED_DAYS && availability.longSessionDays.length >= 1;
  }
  const projectedLongSessionExposures = Math.floor(Math.max(0, weeksRemaining)) * availability.longSessionDays.length;
  return availability.allowedDays.length >= 1 && projectedLongSessionExposures >= MIN_LONG_SESSION_EXPOSURES_FOR_MAJOR_GAP;
}

function worstOf(gaps: CapabilityGap[]): CapabilityGap | undefined {
  const known = gaps.filter((g) => g.status !== 'unknown');
  if (known.length === 0) return undefined;
  return known.reduce((worst, g) => (GAP_SEVERITY[g.status] > GAP_SEVERITY[worst.status] ? g : worst));
}

export interface FeasibilityInputs {
  goalId: string;
  // Only this goal's own CapabilityGap[] (Gap Engine output) — critical-
  // criticality gaps drive the bottleneck; non-critical ones never do
  // (§36).
  gaps: CapabilityGap[];
  // Weeks until the goal's targetDate — undefined for a goal with no
  // deadline (e.g. a paused goal), in which case runway never constrains
  // the status.
  weeksRemaining?: number;
  availability: TrainingAvailability;
  guardrails: TrainingGuardrail[];
}

export function computeFeasibility(inputs: FeasibilityInputs): FeasibilityAssessment {
  const { goalId, gaps, weeksRemaining, availability, guardrails } = inputs;
  const criticalGaps = gaps.filter((g) => g.criticality === 'critical');

  // No critical CapabilityGap at all means the Demand Engine found nothing
  // to assess for this goal (today's computeDemand() only ever emits
  // 'critical' items — it never emits, then filters out, a satisfied one).
  // That's an absence of DEMAND data, the mirror image of §23's "absence of
  // EVIDENCE is never a deficiency" — and just as easily misread the wrong
  // way: reporting 'on_track' here would claim a verified sufficiency that
  // was never actually checked. Read honestly as 'insufficient_data'.
  if (criticalGaps.length === 0) {
    return {
      goalId,
      status: 'insufficient_data',
      confidence: 'unknown',
      explanation: 'Dit doel vraagt nog niets concreets van je — er is niets om de haalbaarheid tegen af te zetten.',
    };
  }

  const allUnknown = criticalGaps.every((g) => g.status === 'unknown');
  if (allUnknown) {
    return {
      goalId,
      status: 'insufficient_data',
      bottleneck: criticalGaps.length === 1 ? criticalGaps[0].key : undefined,
      confidence: 'unknown',
      explanation: 'Nog te weinig over jou bekend om de haalbaarheid van dit doel te beoordelen — geen tekortkoming, gewoon een kwestie van tijd.',
    };
  }

  const worst = worstOf(criticalGaps);
  // worst is defined here: allUnknown is false, so at least one gap has a
  // known (non-'unknown') status.
  const severity = worst ? GAP_SEVERITY[worst.status] : 0;
  const sufficientAvailability = hasSufficientAvailability(weeksRemaining, availability);

  let status: FeasibilityAssessment['status'];
  if (severity <= 1) {
    // 'near', 'meets' or 'exceeds' — no real critical gap left standing.
    status = 'on_track';
  } else if (weeksRemaining === undefined) {
    // No deadline pressure — a real gap exists but nothing is running out.
    status = 'challenging';
  } else if (weeksRemaining < TIGHT_RUNWAY_WEEKS) {
    status = 'unlikely';
  } else if (severity === 3 && !(weeksRemaining >= GENEROUS_RUNWAY_WEEKS && sufficientAvailability)) {
    // major_gap needs both a generous runway AND real training room to
    // still read as merely 'challenging'.
    status = 'unlikely';
  } else {
    status = 'challenging';
  }

  const blockingGuardrail = guardrails.find((g) => g.mode === 'block');
  const bestPossiblePreparation = buildBestPossiblePreparation(status, worst, sufficientAvailability, blockingGuardrail);

  return {
    goalId,
    status,
    bottleneck: worst?.key,
    confidence: worst?.confidence ?? 'unknown',
    explanation: worst?.explanation ?? 'Geen specifiek knelpunt gevonden.',
    bestPossiblePreparation,
  };
}

function buildBestPossiblePreparation(
  status: FeasibilityAssessment['status'],
  worst: CapabilityGap | undefined,
  sufficientAvailability: boolean,
  blockingGuardrail: TrainingGuardrail | undefined,
): string | undefined {
  if (status === 'on_track' || !worst) return undefined;

  const parts = [`Regelmatig en gericht trainen op ${capabilityKeyLabel(worst.key)} brengt dit doel dichter bij haalbaar.`];

  if (!sufficientAvailability) {
    parts.push('Meer beschikbare trainingsdagen, of een vaste dag voor een langere sessie, zou de haalbaarheid ook verbeteren.');
  }
  if (status === 'unlikely' && blockingGuardrail) {
    // §38: an outside-guardrail alternative is never applied automatically
    // — only surfaced, explicitly, for the user to confirm.
    parts.push('Een agressievere opbouw buiten je ingestelde grenzen zou dit doel dichterbij kunnen brengen, maar wordt nooit automatisch toegepast.');
  }
  return parts.join(' ');
}

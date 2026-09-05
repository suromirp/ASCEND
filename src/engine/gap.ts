// ASCEND — Gap Engine
//
// Algorithm Contract v0.2 LOCKED v2 §21-§23. Target vs. capability,
// unit-aware, via engine/units.ts#isDemandMet(). Missing data is NEVER
// interpreted as bad capability (§23): an absent CapabilityEstimate
// (confidence: 'unknown', no repeatableAnchor/peakExposure) always
// produces status 'unknown', never a computed gap against zero.

import { isDemandMet } from './units';
import { UNIT_COMPARISON_DIRECTION } from '../models/units';
import type { MeasuredValue } from '../models/units';
import type { CapabilityDemand, CapabilityEstimate, CapabilityGap, GapStatus, Confidence } from '../models/capability';

// No schijnprecisie (§22) — a coarse, explainable category derived from the
// ratio between what's demonstrated and what's demanded, direction-aware so
// the same thresholds apply whether higher or lower is more capable.
function statusFromRatio(ratio: number): GapStatus {
  if (ratio >= 1.1) return 'exceeds';
  if (ratio >= 1.0) return 'meets';
  if (ratio >= 0.85) return 'near';
  if (ratio >= 0.6) return 'gap';
  return 'major_gap';
}

function capabilityRatio(demand: MeasuredValue, current: MeasuredValue): number {
  const direction = UNIT_COMPARISON_DIRECTION[demand.unit];
  // Always expressed as "how much of the demand is covered" — >=1 is good
  // — regardless of whether the underlying unit is higher_is_more or
  // lower_is_more (pace).
  return direction === 'higher_is_more' ? current.amount / demand.amount : demand.amount / current.amount;
}

export function computeCapabilityGap(demand: CapabilityDemand, estimate: CapabilityEstimate): CapabilityGap {
  // Prefer the robust repeatable anchor; fall back to peak exposure (with
  // the estimate's own confidence already reflecting that it's less
  // certain) only when no repeatable anchor exists yet.
  const currentEstimate = estimate.repeatableAnchor ?? estimate.peakExposure;

  if (currentEstimate === undefined) {
    return {
      key: demand.key,
      demand: demand.demand,
      currentEstimate: undefined,
      status: 'unknown',
      confidence: estimate.confidence,
      criticality: demand.criticality,
      explanation: 'Onvoldoende gegevens om deze capaciteit te bepalen — dit telt niet als een tekortkoming.',
    };
  }

  const ratio = capabilityRatio(demand.demand, currentEstimate);
  const status = statusFromRatio(ratio);
  const met = isDemandMet(demand.demand, currentEstimate);

  return {
    key: demand.key,
    demand: demand.demand,
    currentEstimate,
    status,
    confidence: estimate.confidence,
    criticality: demand.criticality,
    explanation: met
      ? `Doel vraagt ${demand.demand.amount} ${demand.demand.unit}; aantoonbaar ${currentEstimate.amount} ${currentEstimate.unit} (vertrouwen: ${confidenceLabel(estimate.confidence)}).`
      : `Doel vraagt ${demand.demand.amount} ${demand.demand.unit}; nu aantoonbaar ${currentEstimate.amount} ${currentEstimate.unit} (vertrouwen: ${confidenceLabel(estimate.confidence)}).`,
  };
}

function confidenceLabel(confidence: Confidence): string {
  switch (confidence) {
    case 'high': return 'hoog';
    case 'medium': return 'gemiddeld';
    case 'low': return 'laag';
    case 'unknown': return 'onbekend';
  }
}

export function computeCapabilityGaps(demands: CapabilityDemand[], estimates: CapabilityEstimate[]): CapabilityGap[] {
  return demands.map((demand) => {
    const estimate = estimates.find((e) => e.key.dimension === demand.key.dimension && e.key.discipline === demand.key.discipline);
    return computeCapabilityGap(
      demand,
      estimate ?? { key: demand.key, confidence: 'unknown', unconfirmedPeak: false, evidenceRefs: [], asOf: new Date().toISOString() },
    );
  });
}

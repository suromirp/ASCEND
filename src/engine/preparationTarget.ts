// ASCEND — Preparation Target Engine
//
// Technical Architecture v0.3.1 REVISED engine map: "Event Demand →
// trainable targets... must NOT require literal event-distance
// replication." Turns a raw CapabilityDemand into a trainable range —
// deliberately not equal to the raw demand itself. A multi-day trek's full
// distance/D+ or a marathon's exact race distance need not be literally
// reproduced in training to be well-prepared for it.
//
// One uniform ASCEND_HEURISTIC factor pair is used across every dimension
// rather than per-dimension tuned numbers — Algorithm Contract v0.2 §16.2
// warns explicitly against "schijnprecisie zonder labdata" (false
// precision without lab data); a single, clearly-labelled range is more
// honest than pretending each dimension's factor has been individually
// validated.

import type { CapabilityDemand, PreparationTarget } from '../models/capability';
import { UNIT_COMPARISON_DIRECTION } from '../models/units';

// 0.95 = the more ambitious end of the range (closest to fully meeting the
// raw demand); 0.7 = the more conservative end (furthest from it, still a
// meaningful trainable exposure). For a lower_is_more unit (pace), "closer
// to the demand" means a smaller number, so the factor is inverted rather
// than applied directly — see below.
const CLOSER_TO_DEMAND_FACTOR = 0.95;
const FURTHER_FROM_DEMAND_FACTOR = 0.7;

export function computePreparationTargets(demands: CapabilityDemand[]): PreparationTarget[] {
  return demands.map((d) => {
    const higherIsMore = UNIT_COMPARISON_DIRECTION[d.demand.unit] === 'higher_is_more';
    const closer = higherIsMore ? d.demand.amount * CLOSER_TO_DEMAND_FACTOR : d.demand.amount / CLOSER_TO_DEMAND_FACTOR;
    const further = higherIsMore ? d.demand.amount * FURTHER_FROM_DEMAND_FACTOR : d.demand.amount / FURTHER_FROM_DEMAND_FACTOR;
    // targetRange is a plain numeric range (min <= max) regardless of unit
    // direction — for a higher_is_more unit "closer to demand" is the
    // larger number, for a lower_is_more unit (pace) it's the smaller one,
    // so which of the two computed values is min vs. max flips accordingly.
    const [min, max] = closer <= further ? [closer, further] : [further, closer];

    return {
      key: d.key,
      targetRange: {
        min: { amount: min, unit: d.demand.unit },
        max: { amount: max, unit: d.demand.unit },
      },
      criticality: d.criticality,
      // Confidence in the TARGET itself (not yet compared against any
      // estimate) — 'low' across the board, honestly reflecting that the
      // 0.7/0.95 factors are a heuristic starting point, not a validated
      // per-dimension formula.
      confidence: 'low',
      ruleClass: 'ascend_heuristic',
      evidenceRefs: [],
      explanation: `Trainingsdoel afgeleid van de event-eis (${d.demand.amount} ${d.demand.unit}) — niet per se identiek aan het evenement zelf.`,
    };
  });
}

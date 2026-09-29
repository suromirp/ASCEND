// ASCEND — Demand Engine
//
// Algorithm Contract v0.2 LOCKED v2 §15-§18. Translates a goal's explicit
// GoalRequirement[] (Event Demand — models/goals.ts, deliberately NOT
// CapabilityKey-shaped, see engine/goalMigration.ts's TrainingGoal
// migration) into demand per CapabilityKey + Criticality. Golden rule
// (§15): "not filled in is UNKNOWN/NOT REQUIRED BY INPUT — never
// automatically zero." A requirement this engine doesn't recognize is
// simply skipped, never guessed at.

import type { GoalRequirement } from '../models/goals';
import type { CapabilityDemand } from '../models/capability';
import type { MeasuredValue } from '../models/units';
import { typicalDayValue, estimatedHikingMinutes } from './goalRoute';

function req(requirements: GoalRequirement[], kind: GoalRequirement['kind']): GoalRequirement | undefined {
  return requirements.find((r) => r.kind === kind);
}

// Fase 6 (sports-science review, item D2) — the event-specific target pack
// weight a goal actually asks for, when one was set. The one place this
// extraction happens, so engine/capacity.ts's packCapability score (and any
// other future consumer) reads the same authoritative number instead of a
// generic universal default.
export function targetPackWeightKg(requirements: GoalRequirement[]): number | undefined {
  return req(requirements, 'packWeight')?.target?.amount;
}

// Criticality defaults below mirror v0.2 §17's two worked examples
// (marathon vs. multi-day mountain trip) as closely as a general-purpose
// mapping can — an ASCEND_HEURISTIC starting point, not a per-goal-type
// algorithm. A future Progression/Feasibility phase may refine this
// per-discipline; nothing here claims more precision than that.
export function computeDemand(requirements: GoalRequirement[]): CapabilityDemand[] {
  const demand: CapabilityDemand[] = [];
  const discipline = requirements.find((r) => r.discipline)?.discipline;

  // Route values are compared as a TYPICAL DAY, never as route totals
  // (goal-flow redesign, Fase 1 — engine/goalRoute.ts): a 600 km / 30.000 m
  // D+ trip over 35 days asks ~17 km and ~860 m D+ of one day, and that is
  // what a training session can meaningfully be held against. A multi-day
  // goal whose day count is still empty yields no per-day demand at all
  // for these dimensions (unknown, v0.2 §15) rather than the raw total.
  const distanceDay = typicalDayValue(requirements, 'distance')?.value;
  const gainDay = typicalDayValue(requirements, 'elevationGain')?.value;
  const lossDay = typicalDayValue(requirements, 'elevationLoss')?.value;
  const targetTime = req(requirements, 'targetTime');
  const duration = req(requirements, 'duration');
  const packWeight = req(requirements, 'packWeight');
  const consecutiveDays = req(requirements, 'consecutiveDays');

  // distance signals discipline-specific endurance AND repeated mechanical
  // exposure (§18.1) — both critical when present. For hiking the day is
  // expressed as time on foot (engine/goalRoute.ts#estimatedHikingMinutes)
  // — the unit hiking evidence is actually recorded in — so the two can be
  // compared at all instead of always reading "niet vergelijkbaar".
  if (distanceDay) {
    let enduranceDemand: MeasuredValue = distanceDay;
    if (discipline === 'hiking' && distanceDay.unit === 'km') {
      enduranceDemand = { amount: estimatedHikingMinutes(distanceDay.amount, gainDay?.amount, lossDay?.amount), unit: 'min' };
    }
    demand.push({ key: { dimension: 'endurance_duration', discipline }, demand: enduranceDemand, criticality: 'critical' });
    demand.push({ key: { dimension: 'mechanical_tolerance', discipline }, demand: enduranceDemand, criticality: 'critical' });
  }

  // A bare duration requirement (no distance given) still demands
  // discipline-specific endurance directly.
  if (!distanceDay && duration?.target) {
    demand.push({ key: { dimension: 'endurance_duration', discipline }, demand: duration.target, criticality: 'critical' });
  }

  // distance + targetTime → required average pace (§18.2's one sanctioned
  // derivation) — running only. Cycling target speed without route/wind/
  // equipment context is explicitly called out as unreliable in §18.2, so
  // no derived pace demand is produced for any other discipline.
  if (discipline === 'running' && distanceDay && targetTime?.target && distanceDay.unit === 'km' && targetTime.target.unit === 'min') {
    const paceMinPerKm = targetTime.target.amount / distanceDay.amount;
    demand.push({
      key: { dimension: 'sustainable_output', discipline },
      demand: { amount: paceMinPerKm, unit: 'min_per_km' },
      criticality: 'critical',
    });
  }

  // Fase 4 — a cycling goal climbs on the bike: its own ascent key, met by
  // rides. Descending on a bike and bike bags aren't the leg/eccentric
  // descent tolerance or rucksack carrying the hiking dimensions measure,
  // so a cycling goal doesn't demand those.
  const cycling = discipline === 'cycling';
  if (gainDay && gainDay.amount > 0) {
    demand.push({ key: cycling ? { dimension: 'ascent_capacity', discipline } : { dimension: 'ascent_capacity' }, demand: gainDay, criticality: 'critical' });
  }

  // descent stays independent of ascent — never inferred from D+ (§18.4).
  if (!cycling && lossDay && lossDay.amount > 0) {
    demand.push({ key: { dimension: 'descent_tolerance' }, demand: lossDay, criticality: 'critical' });
  }

  if (!cycling && packWeight?.target && packWeight.target.amount > 0) {
    demand.push({ key: { dimension: 'load_carriage' }, demand: packWeight.target, criticality: 'critical' });
  }

  // Multi-day demand is only meaningfully "critical" once it's actually
  // asking for back-to-back days (§18.6) — a single day is not a multi-day
  // demand at all. This is the longest stretch of consecutive days, never
  // the total day count of a trip done in stages (35 walking days over a
  // summer are not 35 days in a row); for a continuous trip the wizard
  // keeps consecutiveDays equal to the total (engine/goalRoute.ts).
  if (consecutiveDays?.target && consecutiveDays.target.amount > 1) {
    demand.push({ key: { dimension: 'multi_day_durability' }, demand: consecutiveDays.target, criticality: 'critical' });
  }

  // aerobic_engine and strength show as IMPORTANT/SUPPORTING in both worked
  // examples (§17), but neither has a GoalRequirement kind of its own and
  // neither has a principled numeric target derivable from one — inventing
  // a placeholder MeasuredValue just to populate CapabilityDemand.demand
  // would be exactly the "schijnprecisie zonder labdata" §16.2 warns
  // against. Their importance is qualitative context for a later
  // Feasibility/Goal Focus phase, not a CapabilityDemand this engine can
  // honestly produce — deliberately omitted rather than fabricated.

  return demand;
}

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

function req(requirements: GoalRequirement[], kind: GoalRequirement['kind']): GoalRequirement | undefined {
  return requirements.find((r) => r.kind === kind);
}

// Criticality defaults below mirror v0.2 §17's two worked examples
// (marathon vs. multi-day mountain trip) as closely as a general-purpose
// mapping can — an ASCEND_HEURISTIC starting point, not a per-goal-type
// algorithm. A future Progression/Feasibility phase may refine this
// per-discipline; nothing here claims more precision than that.
export function computeDemand(requirements: GoalRequirement[]): CapabilityDemand[] {
  const demand: CapabilityDemand[] = [];
  const discipline = requirements.find((r) => r.discipline)?.discipline;

  const distance = req(requirements, 'distance');
  const targetTime = req(requirements, 'targetTime');
  const elevationGain = req(requirements, 'elevationGain');
  const elevationLoss = req(requirements, 'elevationLoss');
  const duration = req(requirements, 'duration');
  const packWeight = req(requirements, 'packWeight');
  const consecutiveDays = req(requirements, 'consecutiveDays');

  // distance signals discipline-specific endurance AND repeated mechanical
  // exposure (§18.1) — both critical when present.
  if (distance?.target) {
    demand.push({ key: { dimension: 'endurance_duration', discipline }, demand: distance.target, criticality: 'critical' });
    demand.push({ key: { dimension: 'mechanical_tolerance', discipline }, demand: distance.target, criticality: 'critical' });
  }

  // A bare duration requirement (no distance given) still demands
  // discipline-specific endurance directly.
  if (!distance?.target && duration?.target) {
    demand.push({ key: { dimension: 'endurance_duration', discipline }, demand: duration.target, criticality: 'critical' });
  }

  // distance + targetTime → required average pace (§18.2's one sanctioned
  // derivation) — running only. Cycling target speed without route/wind/
  // equipment context is explicitly called out as unreliable in §18.2, so
  // no derived pace demand is produced for any other discipline.
  if (discipline === 'running' && distance?.target && targetTime?.target && distance.target.unit === 'km' && targetTime.target.unit === 'min') {
    const paceMinPerKm = targetTime.target.amount / distance.target.amount;
    demand.push({
      key: { dimension: 'sustainable_output', discipline },
      demand: { amount: paceMinPerKm, unit: 'min_per_km' },
      criticality: 'critical',
    });
  }

  if (elevationGain?.target && elevationGain.target.amount > 0) {
    demand.push({ key: { dimension: 'ascent_capacity' }, demand: elevationGain.target, criticality: 'critical' });
  }

  // descent stays independent of ascent — never inferred from D+ (§18.4).
  if (elevationLoss?.target && elevationLoss.target.amount > 0) {
    demand.push({ key: { dimension: 'descent_tolerance' }, demand: elevationLoss.target, criticality: 'critical' });
  }

  if (packWeight?.target && packWeight.target.amount > 0) {
    demand.push({ key: { dimension: 'load_carriage' }, demand: packWeight.target, criticality: 'critical' });
  }

  // Multi-day demand is only meaningfully "critical" once it's actually
  // asking for back-to-back days (§18.6) — a single day is not a multi-day
  // demand at all.
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

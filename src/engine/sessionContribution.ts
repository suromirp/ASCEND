// ASCEND — Session Contribution resolver (Technical Architecture v0.3.1
// REVISED, Phase 4; engine module map: "Detect one session covering
// multiple goals").
//
// A planned session hasn't happened yet, so this can't read what it
// evidenced (that's engine/capability.ts#extractEvidenceFromLog, which only
// ever reads a completed SessionLog) — instead it reads what the
// SessionTemplate's own shape genuinely, structurally exercises. Both
// functions independently answer "what capability keys does this exercise"
// from the same underlying signals (type/discipline/outdoor target), but
// for two different concerns — planned intent vs. demonstrated fact — so
// they're deliberately not merged into one shared function.

import type { PlannedSession, SessionTemplate } from '../models/training';
import type { CapabilityDemand, CapabilityKey } from '../models/capability';
import type { SessionContribution } from '../models/feasibility';

function inferDiscipline(template: SessionTemplate): string | undefined {
  if (template.type === 'cardio') return 'running';
  if (template.type === 'hiking') return 'hiking';
  return undefined;
}

// Mirrors the dimensions engine/capability.ts#extractEvidenceFromLog would
// derive evidence for from a session of this shape — a structural read of
// the template's own fields, not a new physiological claim.
export function inferCapabilityKeysForTemplate(template: SessionTemplate): CapabilityKey[] {
  const keys: CapabilityKey[] = [];
  const discipline = inferDiscipline(template);

  if (template.type !== 'recovery') {
    keys.push({ dimension: 'aerobic_engine' });
  }

  if (discipline) {
    keys.push({ dimension: 'endurance_duration', discipline });
    keys.push({ dimension: 'mechanical_tolerance', discipline });
    if (discipline === 'running') {
      keys.push({ dimension: 'sustainable_output', discipline });
    }
  }

  if (template.outdoorTarget?.targetElevationM) {
    keys.push({ dimension: 'ascent_capacity' });
    // Only a real hike has a genuine, structural descent component — an
    // incline-treadmill template has no equivalent (v0.2 §9.6, same
    // reasoning engine/capability.ts already applies to logged evidence).
    if (template.type === 'hiking') {
      keys.push({ dimension: 'descent_tolerance' });
    }
  }

  if (template.outdoorTarget?.backpackWeightKg) {
    keys.push({ dimension: 'load_carriage' });
  }

  if (template.type === 'strength') {
    keys.push({ dimension: 'strength' });
  }

  return keys;
}

function keysOverlap(a: CapabilityKey[], b: CapabilityKey[]): boolean {
  return a.some((ak) => b.some((bk) => ak.dimension === bk.dimension && ak.discipline === bk.discipline));
}

export interface GoalDemand {
  goalId: string;
  demands: CapabilityDemand[];
}

// One row per (plannedSession, goal) the session's template genuinely
// serves. A session contested by more than one goal (engine/goalArbiter.ts
// consumes this) simply has more than one row sharing the same
// plannedSessionId — e.g. this repo's own tpl_long_run, whose real D+/D-
// and distance serve both the GR5 goal and an active marathon goal at once.
export function resolveSessionContributions(
  plannedSessions: PlannedSession[],
  templates: SessionTemplate[],
  goalDemands: GoalDemand[],
): SessionContribution[] {
  const templateById = new Map(templates.map((t) => [t.id, t]));
  const contributions: SessionContribution[] = [];

  for (const session of plannedSessions) {
    const template = templateById.get(session.templateId);
    if (!template) continue;
    const sessionKeys = inferCapabilityKeysForTemplate(template);
    if (sessionKeys.length === 0) continue;

    for (const goal of goalDemands) {
      const demandKeys = goal.demands.map((d) => d.key);
      const matchingKeys = sessionKeys.filter((sk) => keysOverlap([sk], demandKeys));
      if (matchingKeys.length > 0) {
        contributions.push({ plannedSessionId: session.id, goalId: goal.goalId, capabilityKeys: matchingKeys });
      }
    }
  }

  return contributions;
}

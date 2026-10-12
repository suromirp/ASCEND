// ASCEND — ambition (Settings → Training → Ambitie): how fast the planned
// minutes of your runs and hikes build up.
//
// - Rustig: 10% under the plan.
// - Standaard: the plan.
// - Stevig: 10% over the plan, and a milder rest week (15% over).
//
// What never changes: one session stays within 110% of your longest of
// the last 30 days (engine/substitutions.ts; Nielsen et al. 2025, the best
// supported running injury rule), also for the young and fit: tendons and
// bones adapt more slowly than heart and lungs.
//
// Stevig falls back to Standaard by itself when the signals say so, so a
// bad patch never builds on: pain after a training, or two or more
// trainings that felt clearly heavier than planned, in the last 14 days.
//
// Pure: no React, no IndexedDB.

import type { SessionLog, SessionTemplate } from '../models/training';
import type { Program } from '../models/program';
import { plannedRpeTop } from './coach';
import { addDays } from '../utils/dates';

export { AMBITION_FACTOR, ambitionFactor, type Ambition } from './ambitionLevels';
import type { Ambition } from './ambitionLevels';

const SIGNAL_DAYS = 14;

export interface EffectiveAmbition {
  chosen: Ambition;
  effective: Ambition;
  reason?: string; // why Stevig is on hold, in one sentence
}

export function effectiveAmbition(
  chosen: Ambition | undefined,
  logs: SessionLog[],
  templateById: Map<string, SessionTemplate>,
  program: Program | null | undefined,
  today: string,
): EffectiveAmbition {
  const c = chosen ?? 'standaard';
  if (c !== 'stevig') return { chosen: c, effective: c };
  const since = addDays(today, -SIGNAL_DAYS);
  const recent = logs.filter((l) => l.completedDate >= since && l.completedDate <= today);
  if (recent.some((l) => (l.painAreas ?? []).length > 0)) {
    return { chosen: c, effective: 'standaard', reason: 'Je gaf de afgelopen twee weken pijn aan na een training.' };
  }
  const heavy = recent.filter((l) => {
    if (l.subjectiveFeel === 'worse') return true;
    const t = templateById.get(l.templateId);
    const top = t && l.rpe !== undefined ? plannedRpeTop(t, l.completedDate, program) : undefined;
    return top !== undefined && l.rpe! >= top + 2;
  });
  if (heavy.length >= 2) {
    return { chosen: c, effective: 'standaard', reason: `${heavy.length} trainingen voelden de afgelopen twee weken zwaarder dan gepland.` };
  }
  return { chosen: c, effective: c };
}


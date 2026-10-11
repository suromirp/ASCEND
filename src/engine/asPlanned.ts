// ASCEND — "Gedaan zoals gepland": tick a training off in one tap with what
// the plan asked for (audit 2026-10, B). Only what the plan actually fixes
// goes in: the minutes, and for a hike the planned climb and pack. Nothing
// is made up: no distance, heart rate or effort score.
//
// Pure: no React, no IndexedDB.

import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import type { Program } from '../models/program';
import { resolveEffectiveFullDuration } from './substitutions';
import { progressionTarget } from './programLayout';
import { templateSport } from './sports';
import { ACTIVE_RECOVERY_MINUTES } from '../data/restDayCopy';

export interface AsPlannedLog {
  plannedSessionId: string;
  templateId: string;
  type: SessionLog['type'];
  sport?: SessionLog['sport'];
  variant: 'full';
  durationMinutes: number;
  completedDate?: string;
  outdoorData?: SessionLog['outdoorData'];
}

export function asPlannedLog(session: PlannedSession, template: SessionTemplate, program: Program | null | undefined, today: string): AsPlannedLog {
  // A light recovery day: its own short length (data/restDayCopy.ts).
  const durationMinutes = template.type === 'recovery' ? ACTIVE_RECOVERY_MINUTES : resolveEffectiveFullDuration(template, session.scheduledDate, program);
  const step = progressionTarget(template, program, session.scheduledDate)?.step;
  return {
    plannedSessionId: session.id,
    templateId: template.id,
    type: template.type,
    sport: templateSport(template),
    variant: 'full',
    durationMinutes,
    // Ticked off afterwards: it happened on its own day.
    completedDate: session.scheduledDate < today ? session.scheduledDate : undefined,
    outdoorData: template.type === 'hiking'
      ? {
          durationMinutes,
          elevationGainM: step?.elevationGainM,
          backpackWeightKg: step?.backpackKg,
          source: 'manual',
        }
      : undefined,
  };
}

// Strength logged elsewhere has its own one-tap button; a rest day is
// nothing to tick off, a light recovery day is.
export function canTickOffAsPlanned(template: SessionTemplate, strengthExternal: boolean, restDayMode: 'rest' | 'active' = 'rest'): boolean {
  if (template.type === 'recovery') return restDayMode === 'active';
  if (template.type === 'strength') return !strengthExternal;
  return true;
}

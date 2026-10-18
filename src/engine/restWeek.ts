// ASCEND — training through a rest week (production feedback: "ik wil de
// deload overslaan, ik zit net goed in de flow"). A planned rest week is
// good practice, not a law: the deload consensus (Bell e.a. 2023) treats
// it as a tool to manage fatigue, also to be moved or left out when there
// is little fatigue to shed. Two limits stay: never two rest weeks in a
// row skipped, and not right after pain. The skipped week becomes a
// normal build week (engine/programLayout.ts#waveWeek), so a run still
// never grows more than 10% over the month before (engine/substitutions.ts).
//
// Pure: no React, no IndexedDB.

import type { Program } from '../models/program';
import type { SessionLog } from '../models/training';
import { addDays, mondayOfWeek, resolveProgramWeek } from '../utils/dates';
import { PHASE_TAPER, WAVE_LENGTH } from './programLayout';

export interface RestWeekState {
  isRestWeek: boolean; // a rest week in the plan (skipped or not)
  skipped: boolean;
  canSkip: boolean;
  reason?: string; // why it can't be skipped
}

export function restWeekState(program: Program, weekStart: string, logs: SessionLog[], today: string): RestWeekState {
  const monday = mondayOfWeek(weekStart);
  const position = resolveProgramWeek(program, monday);
  const isRestWeek = !!position && position.phase.id !== PHASE_TAPER && ((position.weekInPhase - 1) % WAVE_LENGTH) + 1 === WAVE_LENGTH;
  const skipped = isRestWeek && !!position?.restSkipped;
  if (!isRestWeek) return { isRestWeek, skipped, canSkip: false };
  if (monday < mondayOfWeek(today)) return { isRestWeek, skipped, canSkip: false, reason: 'Deze week is al voorbij.' };
  if (program.skippedRestWeeks?.includes(addDays(monday, -7 * WAVE_LENGTH))) {
    return { isRestWeek, skipped, canSkip: false, reason: 'Je sloeg de vorige rustweek al over. Twee keer achter elkaar doorgaan stapelt vermoeidheid op, juist dan komt de rust binnen.' };
  }
  const since = addDays(today, -14);
  if (logs.some((l) => l.completedDate >= since && (l.painAreas ?? []).length > 0)) {
    return { isRestWeek, skipped, canSkip: false, reason: 'Je gaf de afgelopen twee weken pijn aan. Dan is deze rustweek juist nodig.' };
  }
  return { isRestWeek, skipped, canSkip: true };
}

// The program with this week's rest week skipped or restored.
export function withRestWeekSkipped(program: Program, weekStart: string, skip: boolean): Program {
  const monday = mondayOfWeek(weekStart);
  const others = (program.skippedRestWeeks ?? []).filter((w) => w !== monday);
  const next = skip ? [...others, monday].sort() : others;
  return { ...program, skippedRestWeeks: next.length ? next : undefined };
}

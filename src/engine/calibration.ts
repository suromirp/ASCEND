// ASCEND: de ijkset, eens per vier weken (KR-12 in docs/onderzoek/Kracht loggen en progressie.md,
// docs/beslissingen/2026-11-09-ijkset.md).
//
// Een schatting van hoeveel je over hebt (RIR) klopt pas als je hem af en toe tegen een echte uitkomst houdt.
// Eens per vier weken stelt Forge daarom een set erbij voor bij één hoofdoefening: zo ver als netjes gaat. Het is een
// voorstel met Akkoord; zonder Akkoord verandert de training niet. Niet in een week met een tocht, een test of een
// wedstrijd, en niet in de drie dagen ervoor, want de set maakt moe. Puur: geen React, geen opslag.

import type { PlannedSession, SessionTemplate } from '../models/training';
import { addDays, daysBetween, mondayOfWeek } from '../utils/dates';
import { isMountainTrip } from './sportKind';
import { isTestOrRace } from './templateRoles';
import type { WorkoutExercise } from './forgeWorkout';
import { exerciseById } from '../data/exercises';
import { isCompound } from './warmup';

export const CALIBRATION_DAYS = 28;
// De reserve van de ijkset: zo ver als netjes gaat, met nog één over.
export const CALIBRATION_RIR = 1;
// Zo ver voor een tocht, test of wedstrijd valt de set niet meer.
const LEAD_DAYS = 3;
// Zoveel trainingen met de oefening gingen eraan vooraf (`WorkoutExercise.trainings`).
const MIN_TRAININGS = 3;

export type CalibrationBlock = 'recent' | 'trip' | 'test';

export interface CalibrationInput {
  // De dag van de training.
  date: string;
  // De dag van de laatste Akkoord.
  lastAt?: string;
  planned: PlannedSession[];
  templates: SessionTemplate[];
}

// Waarom het nu niet kan (undefined: het kan).
export function calibrationBlock(i: CalibrationInput): CalibrationBlock | undefined {
  if (i.lastAt && Math.abs(daysBetween(i.lastAt, i.date)) < CALIBRATION_DAYS) return 'recent';
  const week = mondayOfWeek(i.date);
  const until = addDays(i.date, LEAD_DAYS);
  const byId = new Map(i.templates.map((t) => [t.id, t]));
  let block: CalibrationBlock | undefined;
  for (const s of i.planned) {
    if (s.status === 'skipped') continue;
    const inWeek = mondayOfWeek(s.scheduledDate) === week;
    const soon = s.scheduledDate >= i.date && s.scheduledDate <= until;
    if (!inWeek && !soon) continue;
    const t = byId.get(s.templateId);
    if (!t) continue;
    if (isTestOrRace(t)) return 'test';
    if (isMountainTrip(t)) block = 'trip';
  }
  return block;
}

// De hoofdoefening: de eerste samengestelde oefening met een gewicht van buiten en een werkset die nog open is.
export function calibrationSlot(workout: WorkoutExercise[]): string | undefined {
  for (const ex of workout) {
    // Pas als je gevoel voor deze oefening geijkt is: de eerste drie keer vraagt Forge elke set al hoeveel je over had.
    if (!ex.known || (ex.trainings ?? 0) < MIN_TRAININGS) continue;
    const exercise = exerciseById(ex.exerciseId);
    if (!exercise || !isCompound(exercise) || exercise.resistance === 'bodyweight' || exercise.resistance === 'assisted_bodyweight' || exercise.measure === 'hold') continue;
    const work = ex.rows.filter((r) => r.kind === 'work');
    if (work.length === 0 || work.some((r) => r.done)) continue;
    return ex.slot;
  }
  return undefined;
}

// De werkset die Akkoord erbij zette (via `addSetLogged`, dus met een regel in het verloop) krijgt de reserve van de
// ijkset: de laatste werkset. Gewicht en herhalingen volgen de set ervoor.
export function withCalibrationTarget(ex: WorkoutExercise): WorkoutExercise {
  const at = ex.rows.map((r) => r.kind).lastIndexOf('work');
  if (at < 0) return ex;
  return { ...ex, rows: ex.rows.map((r, i) => (i === at ? { ...r, target: { ...r.target, rir: CALIBRATION_RIR, failure: false, open: false } } : r)) };
}

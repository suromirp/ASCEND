// ASCEND: de ijkset, eens per vier weken (KR-12 in docs/onderzoek/Kracht loggen en progressie.md,
// docs/beslissingen/2026-11-09-ijkset.md).
//
// Een schatting van hoeveel je over hebt (RIR) klopt pas als je hem af en toe tegen een echte uitkomst houdt.
// Eens per vier weken stelt Forge daarom een set erbij voor bij één hoofdoefening: zo ver als netjes gaat. Het is een
// voorstel met Akkoord; zonder Akkoord verandert de training niet. Niet in een week met een tocht, een test of een
// wedstrijd, en niet in de drie dagen ervoor, want de set maakt moe. Met de stand Automatisch erbij staat de set er bij
// het openen al (docs/beslissingen/2026-11-15-ijkset-automatisch.md). Nooit als je ziek bent of opbouwt na ziek, op een
// dag zonder sportschool, in een vakantie of op een tocht. Puur: geen React, geen opslag.

import type { PlannedSession, SessionTemplate } from '../models/training';
import { addDays, daysBetween, mondayOfWeek } from '../utils/dates';
import { isMountainTrip } from './sportKind';
import { isTestOrRace } from './templateRoles';
import type { WorkoutExercise, WorkoutRow } from './forgeWorkout';
import type { ForgeEvent } from '../models/forgeLog';
import { setCountEvent } from './forgeLog';
import { rowLabel } from './forgeRows';
import { addRow } from './forgeWorkout';
import { exerciseById } from '../data/exercises';
import { isCompound } from './warmup';
import type { IllnessEpisode } from '../models/illness';
import type { LeavePeriod } from '../models/leave';
import { leaveDays } from './leave';
import { dayRules, type EasedRange } from './dayRules';
import { raceDatesOf } from './raceWindow';

export const CALIBRATION_DAYS = 28;
// De reserve van de ijkset: zo ver als netjes gaat, met nog één over.
export const CALIBRATION_RIR = 1;
// Zo ver voor een tocht, test of wedstrijd valt de set niet meer.
const LEAD_DAYS = 3;
// Zoveel trainingen met de oefening gingen eraan vooraf (`WorkoutExercise.trainings`).
const MIN_TRAININGS = 3;

// quiet: een rustige week (rustige instap, de lichte week van een golf); off: krachttraining staat uit.
export type CalibrationBlock = 'ill' | 'away' | 'nogym' | 'quiet' | 'off' | 'eased' | 'pending' | 'recent' | 'trip' | 'test';

// De stand van de instelling IJkset (strengthModel.calibrationMode): Vragen is het advies.
export type { CalibrationMode } from './strengthSettings';

export interface CalibrationInput {
  // De dag van de training.
  date: string;
  // De dag van de laatste Akkoord.
  lastAt?: string;
  planned: PlannedSession[];
  templates: SessionTemplate[];
  // Ziekmeldingen (settings.illnessEpisodes): ziek en de opbouw erna.
  illness?: IllnessEpisode[];
  // Vrije periodes (settings.leavePeriods): vakantie, tocht en zonder sportschool.
  leave?: LeavePeriod[];
  // Forge maakt deze training lichter (Lichter bij vermoeide benen): geen set tot bijna falen erbij.
  eased?: boolean;
  // De rustige weken rond deze dag (engine/dayRules.ts#easedWeeks): rustige instap, de lichte week van een golf.
  quietWeeks?: readonly EasedRange[];
  // Krachttraining staat uit.
  strengthOff?: boolean;
  // Een andere training loopt nog als concept met een ijkset erin: de vier weken tellen pas bij Afronden, dus anders
  // komen er twee binnen vier weken.
  pending?: boolean;
}

// Wat de ene regel (engine/dayRules.ts, stap een set erbij) zegt, in de woorden van de ijkset.
const BLOCK_OF: Partial<Record<string, CalibrationBlock>> = {
  ill: 'ill', ill_light: 'ill', ramp: 'ill', off: 'away', trek: 'away', nogym: 'nogym', race: 'test', taper: 'test', eased: 'quiet', strength_off: 'off',
};

// Waarom het nu niet kan (undefined: het kan).
export function calibrationBlock(i: CalibrationInput): CalibrationBlock | undefined {
  // De ene regel: ziek of nog aan het opbouwen (de set maakt moe en meet dan iets anders dan je gewone kracht),
  // vakantie of tocht, zonder sportschool, de week voor een race (het venster van adviceShared.ts#raceWeekGuard, I-67
  // gat 4), een rustige week en kracht uit.
  const v = dayRules({
    today: i.date, illness: i.illness, leave: i.leave, races: raceDatesOf(i.planned, i.templates), eased: i.quietWeeks, strengthOff: i.strengthOff,
  }).may({ date: i.date, step: 'add_set', template: { id: 'calibration', type: 'strength' } });
  if (!v.ok && BLOCK_OF[v.cause]) return BLOCK_OF[v.cause];
  const days = leaveDays(i.leave);
  if (i.eased) return 'eased';
  if (i.pending) return 'pending';
  if (i.lastAt && Math.abs(daysBetween(i.lastAt, i.date)) < CALIBRATION_DAYS) return 'recent';
  const week = mondayOfWeek(i.date);
  const until = addDays(i.date, LEAD_DAYS);
  const byId = new Map(i.templates.map((t) => [t.id, t]));
  let block: CalibrationBlock | undefined;
  // Een tocht met rugzak als vrije periode in dezelfde week of de drie dagen erna telt als een tocht.
  for (let n = 0; n < 7 + LEAD_DAYS; n++) {
    const d = n < 7 ? addDays(week, n) : addDays(i.date, n - 7 + 1);
    if (days.get(d)?.kind === 'trek') block = 'trip';
  }
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

// De ijkset van Automatisch erbij heeft een vaste id: een toegevoegde set (`isOwnRow`), dus weg te tikken zoals elke
// set, en in het concept te herkennen zonder nieuw veld.
const AUTO_ROW = 'aijk';
export function isCalibrationRow(row: Pick<WorkoutRow, 'id'>): boolean {
  return row.id.endsWith(`:${AUTO_ROW}`);
}

// Automatisch erbij: de werkset staat bij het openen al bij de hoofdoefening, als gewone toegevoegde set met nog één
// over. Geeft de oefening terug waar hij bij kwam (undefined: geen ijkset).
export function withAutoCalibration(workout: WorkoutExercise[]): { workout: WorkoutExercise[]; slot: string; rowId: string } | undefined {
  const slot = calibrationSlot(workout);
  if (!slot) return undefined;
  const rowId = `${slot}:${AUTO_ROW}`;
  const next = workout.map((ex) => {
    if (ex.slot !== slot) return ex;
    const added = addRow(ex, 'work');
    const rows = added.rows.map((r, n) => (n === added.rows.length - 1 ? { ...r, id: rowId } : r));
    return withCalibrationTarget({ ...added, rows });
  });
  return { workout: next, slot, rowId };
}

// De dag telt pas als de training is afgerond met de ijkset afgevinkt.
export function calibrationDone(workout: WorkoutExercise[]): boolean {
  return workout.some((ex) => ex.rows.some((r) => r.done && r.kind === 'work' && isCalibrationRow(r)));
}

// In het verloop: wie de set erbij zette.
export const CALIBRATION_AUTO_FACT = 'Forge zette deze ijkset erbij (IJkset: Automatisch erbij).';

// De regel boven de oefening met de ijkset.
export const CALIBRATION_AUTO_LINE = 'IJkset, eens per vier weken: de laatste set zo ver als netjes gaat, met nog één over. Wil je hem niet, haal hem weg.';

// Een concept (de rijen van een lopende training) met een ijkset erin.
export function hasCalibrationRow(workout: readonly Pick<WorkoutExercise, 'rows'>[] | undefined): boolean {
  return (workout ?? []).some((ex) => Array.isArray(ex.rows) && ex.rows.some((r) => typeof r?.id === 'string' && isCalibrationRow(r)));
}

// Je haalde de ijkset in deze training zelf weg: dan komt hij niet terug.
export function calibrationRemoved(log: readonly ForgeEvent[]): boolean {
  return log.some((e) => e.kind === 'weggehaald' && typeof e.rowId === 'string' && isCalibrationRow({ id: e.rowId }));
}

// Zet de ijkset van Automatisch erbij in een (opnieuw) opgebouwde training, of laat hem weg, en houdt het verloop
// daarmee gelijk: bij het openen, na Lichter aan of uit (`replan`) en na een heropend concept dat opnieuw werd
// gepland. `want` is de stand Automatisch zonder blok; een set die je zelf weghaalde komt nooit terug. Een
// afgevinkte ijkset blijft altijd staan. Een regel "toegevoegd" van een ijkset die er niet meer staat valt weg.
export function syncAutoCalibration(workout: WorkoutExercise[], log: ForgeEvent[], want: boolean, at: number, newId: () => string): { workout: WorkoutExercise[]; log: ForgeEvent[] } {
  let next = workout;
  if (!want || calibrationRemoved(log)) {
    next = workout.map((ex) => (ex.rows.some((r) => isCalibrationRow(r) && !r.done) ? { ...ex, rows: ex.rows.filter((r) => !(isCalibrationRow(r) && !r.done)) } : ex));
  } else if (!hasCalibrationRow(workout)) {
    next = withAutoCalibration(workout)?.workout ?? workout;
  }
  const rowIds = new Set(next.flatMap((ex) => ex.rows.filter(isCalibrationRow).map((r) => r.id)));
  const added = (e: ForgeEvent) => e.kind === 'toegevoegd' && typeof e.rowId === 'string' && isCalibrationRow({ id: e.rowId });
  let nextLog = log.filter((e) => !added(e) || rowIds.has(e.rowId!));
  for (const ex of next) {
    const row = ex.rows.find(isCalibrationRow);
    if (row && !nextLog.some((e) => added(e) && e.rowId === row.id)) {
      nextLog = [...nextLog, { ...setCountEvent('toegevoegd', ex, row, rowLabel(ex, row.id), at, newId()), fact: CALIBRATION_AUTO_FACT }];
    }
  }
  return { workout: next, log: nextLog };
}

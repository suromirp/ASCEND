// ASCEND: "MacroFactor is leidend voor kracht"
// (docs/beslissingen/2026-10-22-macrofactor-leidend-voor-kracht.md), the second
// exception to "a SessionLog is append-only", next to "Garmin is leidend"
// (engine/watchAlign.ts).
//
// Pure: no React, no IndexedDB. For a strength log that already exists (made by
// hand, "Gedaan" for strength kept in MacroFactor, or a strength entry from the watch) the numbers
// MacroFactor measured take over: the duration, the sets with their reps and
// weights, and the reps in reserve. Where the file has no value, the log keeps
// its own. What the user filled in himself is not even read here: feel, effort
// (RPE), pain, notes.
//
// The old numbers are kept on the log in `manualMeasured`, the same field as
// the watch uses, so engine/watchAlign.ts#restoreManual puts every one of them
// back. A key is kept only for what was really replaced or added.

import type { ExerciseSetLog, ManualMeasured, ManualStrength, SessionLog, SessionTemplate } from '../models/training';
import { formatNumberNL } from '../utils/number';
import type { MacroFactorWorkout } from './macrofactorImport';
import { isWorkSet } from './workSets';
import { legacySetShape, minutesLabel, strengthDataFor, strengthRirFor } from './macrofactorSets';

export const isStrengthTakeover = (log: SessionLog): boolean => !!log.manualMeasured?.strength;

const setCount = (data: ExerciseSetLog[] | undefined): number | undefined => (data ? data.reduce((n, e) => n + e.sets.filter(isWorkSet).length, 0) : undefined);

// --- what would change ----------------------------------------------------------

export interface StrengthChange {
  // The minutes the log has and the file has; present only when they differ.
  duration?: { before: number; after: number };
  // The exercises and sets: always present when they differ, with the number
  // of sets on each side (before is absent when the log had no sets at all).
  exercises?: { before: number | undefined; after: number };
  // Reps in reserve (a leg session only, strengthRirFor).
  rir?: { before: number | undefined; after: number };
}

export function strengthChangeFor(log: SessionLog, workout: MacroFactorWorkout, template: SessionTemplate): StrengthChange | undefined {
  const change: StrengthChange = {};
  if (workout.durationSec) {
    const after = Math.max(1, Math.round(workout.durationSec / 60));
    if (after !== log.durationMinutes) change.duration = { before: log.durationMinutes, after };
  }
  const data = strengthDataFor(workout, template);
  if (JSON.stringify(legacySetShape(data, log.strengthData)) !== JSON.stringify(legacySetShape(log.strengthData))) change.exercises = { before: setCount(log.strengthData), after: setCount(data)! };
  const rir = strengthRirFor(workout, template);
  if (rir !== undefined && rir !== log.strengthRir) change.rir = { before: log.strengthRir, after: rir };
  return change.duration || change.exercises || change.rir ? change : undefined;
}

// --- applying it ------------------------------------------------------------------

// The log after MacroFactor's numbers took over; as it was when there is
// nothing to change or when the watch already put a takeover on it.
export function applyStrengthTakeover(
  log: SessionLog,
  workout: MacroFactorWorkout,
  template: SessionTemplate,
  now: Date,
  clearedProgressIds: string[] = [],
): SessionLog {
  if (log.manualMeasured) return log;
  const change = strengthChangeFor(log, workout, template);
  if (!change) return log;
  const values: ManualMeasured['values'] = {};
  const strength: ManualStrength = { workoutId: workout.externalId };
  const next: SessionLog = { ...log };
  if (change.duration) {
    values.durationMinutes = change.duration.before;
    next.durationMinutes = change.duration.after;
  }
  if (change.exercises) {
    strength.strengthData = log.strengthData ?? null;
    next.strengthData = strengthDataFor(workout, template);
  }
  if (change.rir) {
    strength.strengthRir = log.strengthRir ?? null;
    next.strengthRir = change.rir.after;
  }
  // A log that has no id of its own is tied to the workout, so the same
  // workout is never offered again. A strength entry from the watch keeps its
  // own id (the watch activity stays tied to it).
  if (log.externalId === undefined) {
    strength.tied = { source: log.source };
    next.externalId = workout.externalId;
    next.source = 'macrofactor';
  }
  next.manualMeasured = {
    at: now.toISOString(),
    values,
    strength,
    ...(clearedProgressIds.length > 0 ? { clearedProgressIds } : {}),
  };
  return next;
}

// --- words ---------------------------------------------------------------------------

const setsText = (n: number) => `${n} ${n === 1 ? 'set' : 'sets'}`;

// "duur 75 min wordt 62 min, 13 sets komen erbij, herhalingen in reserve 1 komt erbij":
// every number with what it is.
export function describeStrengthChange(change: StrengthChange): string {
  const parts: string[] = [];
  if (change.duration) parts.push(`duur ${minutesLabel(change.duration.before)} wordt ${minutesLabel(change.duration.after)}`);
  if (change.exercises) {
    const { before, after } = change.exercises;
    parts.push(before === undefined ? `${setsText(after)} komen erbij` : before === after ? `de oefeningen en gewichten worden die van MacroFactor` : `${setsText(before)} wordt ${setsText(after)}`);
  }
  if (change.rir) {
    const { before, after } = change.rir;
    const n = (v: number) => formatNumberNL(v, v % 1 === 0 ? 0 : 1);
    parts.push(before === undefined ? `herhalingen in reserve ${n(after)} komt erbij` : `herhalingen in reserve ${n(before)} wordt ${n(after)}`);
  }
  return parts.join(', ');
}

// What the log said before MacroFactor took over, for the list of what was
// taken over: "Eerst met de hand: 1 uur 15 min, 13 sets, herhalingen in reserve 3".
export function describeStrengthManualLine(log: SessionLog): string {
  const m = log.manualMeasured;
  const s = m?.strength;
  if (!m || !s) return '';
  const before: string[] = [];
  const added: string[] = [];
  const duration = m.values.durationMinutes;
  if (typeof duration === 'number') before.push(minutesLabel(duration));
  if ('strengthData' in s) {
    if (s.strengthData) before.push(setsText(setCount(s.strengthData) ?? 0));
    else added.push('de sets');
  }
  if ('strengthRir' in s) {
    if (typeof s.strengthRir === 'number') before.push(`herhalingen in reserve ${formatNumberNL(s.strengthRir, s.strengthRir % 1 === 0 ? 0 : 1)}`);
    else added.push('de herhalingen in reserve');
  }
  if (before.length > 0) return `Eerst met de hand: ${before.join(', ')}`;
  return added.length > 0 ? `MacroFactor vulde aan: ${added.join(' en ')}. Je eigen cijfers bleven staan.` : 'Er veranderde niets aan je cijfers.';
}

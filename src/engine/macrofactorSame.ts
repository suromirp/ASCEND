// ASCEND: is this MacroFactor workout the one a log already holds? Pure.
//
// The id of a workout ("macrofactor:2026-10-14:upper a") contains its name, so
// a workout that is renamed in MacroFactor, or moved to another program, gets
// a new id for the same training. Without more, it was saved a second time.
// The second check: a log that came from MacroFactor, on the same day, with
// (nearly) the same working sets is the same workout, whatever it is called.
// Nothing is rewritten for this: the log keeps its own id, and the renamed
// workout is simply treated as done (or as one that may be enriched).

import type { SessionLog } from '../models/training';
import { cleanExerciseName } from './exerciseMatch';
import { nameKey, type MacroFactorWorkout } from './macrofactorImport';
import { isWorkSet } from './workSets';

// The part of the working sets that must be the same: 4 of every 5.
export const SAME_SETS_RATIO = 0.8;

// A log that came from a MacroFactor file, or that took over its numbers.
const isMacroFactorLog = (l: SessionLog) => !!l.externalId?.startsWith('macrofactor:') || !!l.manualMeasured?.strength;

const setKey = (exercise: string, reps: number, weightKg: number | undefined) => `${nameKey(cleanExerciseName(exercise))}|${reps}|${Math.round((weightKg ?? 0) * 100)}`;

function workoutKeys(workout: MacroFactorWorkout): string[] {
  return workout.exercises.flatMap((e) => e.sets.map((s) => setKey(e.name, s.reps, s.weightKg)));
}

function logKeys(log: SessionLog): string[] {
  return (log.strengthData ?? []).flatMap((e) => e.sets.filter(isWorkSet).map((s) => setKey(e.exerciseName, s.reps, s.weightKg)));
}

// How much of the larger of the two lists the lists share, 0 to 1.
export function setOverlap(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const left = new Map<string, number>();
  for (const k of a) left.set(k, (left.get(k) ?? 0) + 1);
  let shared = 0;
  for (const k of b) {
    const n = left.get(k) ?? 0;
    if (n > 0) {
      shared++;
      left.set(k, n - 1);
    }
  }
  return shared / Math.max(a.length, b.length);
}

// The stored log of the same day whose working sets are (nearly) this workout's;
// the best one when there are more. `taken` holds log ids that another workout
// of the same file already matched.
export function findSameWorkoutLog(workout: MacroFactorWorkout, logs: SessionLog[], taken: ReadonlySet<string> = new Set()): SessionLog | undefined {
  const keys = workoutKeys(workout);
  let best: { log: SessionLog; overlap: number } | undefined;
  for (const log of logs) {
    if (log.completedDate !== workout.date || taken.has(log.id) || !isMacroFactorLog(log)) continue;
    const overlap = setOverlap(keys, logKeys(log));
    if (overlap >= SAME_SETS_RATIO && (!best || overlap > best.overlap)) best = { log, overlap };
  }
  return best?.log;
}

// The logs that already belong to a workout of this file: their externalId, or
// the workout whose numbers a hand-made log took over, is one of the file's
// workouts. A renamed workout may never pick such a log: two workouts on one
// day with (nearly) the same sets are then two trainings, not one renamed.
// Pass the result as `taken` to findSameWorkoutLog.
export function logsOfWorkoutsInFile(workouts: MacroFactorWorkout[], logs: SessionLog[]): Set<string> {
  const inFile = new Set(workouts.map((w) => w.externalId));
  const ids = new Set<string>();
  for (const l of logs) {
    if ((l.externalId && inFile.has(l.externalId)) || (l.manualMeasured?.strength?.workoutId && inFile.has(l.manualMeasured.strength.workoutId))) ids.add(l.id);
  }
  return ids;
}

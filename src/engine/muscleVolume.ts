// ASCEND: sets per muscle group per week, rule KR-10 of
// docs/onderzoek/Kracht loggen en progressie.md. Pure. Not shown anywhere yet.
//
// A set counts when it is a working set (not a warm-up) and at most 4 reps were
// left (RIR 4 or less); a set without a known RIR counts too. A primary muscle
// gets 1 for the set, a secondary muscle half. The week is Monday to Sunday,
// by the day the training was done.

import { exerciseById } from '../data/exercises';
import { MUSCLE_GROUPS, type Exercise, type MuscleGroup } from '../models/exercise';
import type { ExerciseSetLog, SessionLog, SetLog } from '../models/training';
import { mondayOfWeek } from '../utils/dates';
import { matchExercise } from './exerciseMatch';
import { isWorkSet } from './workSets';

// The most reps in reserve at which a set still counts as hard enough.
export const HARD_SET_MAX_RIR = 4;
export const PRIMARY_WEIGHT = 1;
export const SECONDARY_WEIGHT = 0.5;

export type MuscleVolume = Record<MuscleGroup, number>;

export const emptyMuscleVolume = (): MuscleVolume => Object.fromEntries(MUSCLE_GROUPS.map((m) => [m, 0])) as MuscleVolume;

export const countsAsHardSet = (set: SetLog): boolean => isWorkSet(set) && (set.rir === undefined || set.rir <= HARD_SET_MAX_RIR);

// The exercise of a stored entry: by its own id when that is one of ours, else
// by its name. Absent when the list does not know it for sure.
export function exerciseOfEntry(entry: ExerciseSetLog): Exercise | undefined {
  const byId = exerciseById(entry.exerciseId);
  if (byId) return byId;
  const matched = matchExercise(entry.exerciseName);
  return matched ? exerciseById(matched) : undefined;
}

export interface WeekVolume {
  // Monday of the week.
  weekStart: string;
  sets: MuscleVolume;
  // Hard working sets of exercises the list does not know: not counted anywhere.
  unknownSets: number;
}

export function muscleVolumeByWeek(logs: SessionLog[]): WeekVolume[] {
  const weeks = new Map<string, WeekVolume>();
  for (const log of logs) {
    if (!log.strengthData || log.strengthData.length === 0) continue;
    const weekStart = mondayOfWeek(log.completedDate);
    let week = weeks.get(weekStart);
    for (const entry of log.strengthData) {
      const hard = entry.sets.filter(countsAsHardSet).length;
      if (hard === 0) continue;
      week ??= weeks.set(weekStart, { weekStart, sets: emptyMuscleVolume(), unknownSets: 0 }).get(weekStart)!;
      const exercise = exerciseOfEntry(entry);
      if (!exercise) {
        week.unknownSets += hard;
        continue;
      }
      for (const m of exercise.primary) week.sets[m] += hard * PRIMARY_WEIGHT;
      for (const m of exercise.secondary) week.sets[m] += hard * SECONDARY_WEIGHT;
    }
  }
  return [...weeks.values()].sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}

// One week, empty when nothing was logged in it.
export function muscleVolumeForWeek(logs: SessionLog[], weekStart: string): WeekVolume {
  return muscleVolumeByWeek(logs).find((w) => w.weekStart === weekStart) ?? { weekStart, sets: emptyMuscleVolume(), unknownSets: 0 };
}

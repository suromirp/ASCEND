// ASCEND: the parts of a MacroFactor workout that become fields of a log: the
// sets as ASCEND keeps them, the reps in reserve, and a length in words. Shared
// by engine/macrofactorLink.ts (a new log, filling in) and
// engine/macrofactorLead.ts (MacroFactor takes over). Pure.

import type { SessionLog, SessionTemplate, SetLog } from '../models/training';
import { resolveEffectiveStressProfile } from './stressProfile';
import { isWorkSet } from './workSets';
import { lowestTopRir, nameKey, type MacroFactorWorkout } from './macrofactorImport';

// --- legs and reps in reserve -------------------------------------------------

// A leg session: the legs carry real load. Only for these does the reps-in-
// reserve number mean something for the leg index (engine/legFatigue.ts reads
// strengthRir as RPE = 10 - RIR: 0 left is about RPE 10, 2 left about RPE 8).
export function isLegSession(template: SessionTemplate): boolean {
  const load = resolveEffectiveStressProfile(template).lowerBodyLoad;
  return load === 'moderate' || load === 'heavy';
}

// The scale the rest of the app uses: 0 to 4 (StrengthDoneElsewhere stores
// 0, 1, 2.5, 4). More than 4 left is "4 of meer".
export function strengthRirFor(workout: MacroFactorWorkout, template: SessionTemplate): number | undefined {
  if (!isLegSession(template)) return undefined;
  const rir = lowestTopRir(workout);
  return rir === undefined ? undefined : Math.min(4, Math.max(0, rir));
}

// --- the sets as ASCEND keeps them ----------------------------------------------

const slug = (s: string) => nameKey(s).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

// An exercise that has the same name in the template keeps that exercise id,
// so the progression chart finds it; any other gets an id of its own.
export function strengthDataFor(workout: MacroFactorWorkout, template: SessionTemplate): NonNullable<SessionLog['strengthData']> {
  const byName = new Map((template.exercises ?? []).map((e) => [nameKey(e.exerciseName), e.id]));
  const used = new Set<string>();
  return workout.exercises.map((exercise) => {
    const known = byName.get(nameKey(exercise.name));
    const exerciseId = known && !used.has(known) ? known : `mf_${slug(exercise.name)}`;
    used.add(exerciseId);
    return {
      exerciseId,
      exerciseName: exercise.name,
      sets: (exercise.loggedSets ?? exercise.sets).map(
        (s): SetLog => ({
          reps: s.reps,
          ...(s.weightKg !== undefined ? { weightKg: s.weightKg } : {}),
          ...(s.rir !== undefined ? { rir: s.rir } : {}),
          ...(s.kind === 'warmup' ? { kind: 'warmup' as const } : {}),
        }),
      ),
    };
  });
}

export function minutesLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  if (h === 0) return `${minutes} min`;
  return minutes % 60 === 0 ? `${h} uur` : `${h} uur ${minutes % 60} min`;
}

// --- working sets only ----------------------------------------------------------

// The sets as ASCEND kept them before reps in reserve and warm-ups were stored:
// working sets with reps and weight only. Used to find out whether a log
// already holds what the file holds.
// A weight the log lacks, against a negative weight in the file: the help on an
// assisted machine that an older import did not keep. Counts as an empty field.
export const isMissingHelp = (stored: number | undefined, file: number | undefined): boolean => stored === undefined && file !== undefined && file < 0;

// `reference` is the data the shape is compared with: a negative weight in
// this data that the reference lacks is left out, so it does not count as a difference.
// The exercise id is left out too: it is ASCEND's own link to a template slot and
// changes when a template exercise gets another name, while what you did stays the same.
export function legacySetShape(data: SessionLog['strengthData'], reference?: SessionLog['strengthData']): unknown {
  return data?.map(({ exerciseId: _id, ...e }, ei) => {
    const refWork = reference?.[ei]?.sets.filter(isWorkSet);
    return {
      ...e,
      sets: e.sets.filter(isWorkSet).map((s, si) => {
        const keep = s.weightKg !== undefined && !(refWork && si < refWork.length && isMissingHelp(refWork[si].weightKg, s.weightKg));
        return keep ? { reps: s.reps, weightKg: s.weightKg } : { reps: s.reps };
      }),
    };
  });
}

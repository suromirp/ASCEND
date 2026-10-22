// ASCEND: a log that came from MacroFactor earlier, before the reps in reserve
// and the warm-up sets were kept per set, gets those added when the same
// workout is read again. Pure.
//
// Only EMPTY fields are filled (decision 2026-10-22-lege-velden-aanvullen.md,
// and docs/beslissingen/2026-10-22-rir-aanvullen.md): the `rir` of a set that
// has none, and the warm-up sets of an exercise that has none stored. Reps and
// weight of the working sets must be exactly equal to the file's, per exercise;
// if they differ at all, that exercise is left as it is. Nothing is ever
// overwritten and nothing is removed. It happens only on a tap of the user on
// the import card.

import type { ExerciseSetLog, SessionLog, SetLog } from '../models/training';
import { nameKey, type MacroFactorSet, type MacroFactorWorkout } from './macrofactorImport';
import { isMissingHelp } from './macrofactorSets';
import { isWorkSet } from './workSets';

const sameWeight = (a: number | undefined, b: number | undefined) => (a === undefined || b === undefined ? a === b : Math.abs(a - b) < 1e-9);

function mergeEntry(entry: ExerciseSetLog, fileSets: MacroFactorSet[]): ExerciseSetLog | undefined {
  const fileWork = fileSets.filter((s) => s.kind !== 'warmup');
  const storedWork = entry.sets.filter(isWorkSet);
  if (fileWork.length !== storedWork.length || storedWork.length === 0) return undefined;
  if (!storedWork.every((s, i) => s.reps === fileWork[i].reps && (sameWeight(s.weightKg, fileWork[i].weightKg) || isMissingHelp(s.weightKg, fileWork[i].weightKg)))) return undefined;

  const hasWarmups = entry.sets.some((s) => !isWorkSet(s));
  const fillRir = (stored: SetLog, file: MacroFactorSet): SetLog => {
    let next = stored;
    // A stored set without a weight where the file has a negative one: the help on an assisted machine.
    if (isMissingHelp(next.weightKg, file.weightKg)) next = { ...next, weightKg: file.weightKg };
    if (next.rir === undefined && file.rir !== undefined) next = { ...next, rir: file.rir };
    return next;
  };

  let sets: SetLog[];
  if (hasWarmups) {
    // The stored warm-up sets stay as they are; only the working sets get a RIR.
    let w = 0;
    sets = entry.sets.map((s) => (isWorkSet(s) ? fillRir(s, fileWork[w++]) : s));
  } else {
    let w = 0;
    sets = [];
    for (const file of fileSets) {
      if (file.kind === 'warmup') {
        sets.push({ reps: file.reps, ...(file.weightKg !== undefined ? { weightKg: file.weightKg } : {}), ...(file.rir !== undefined ? { rir: file.rir } : {}), kind: 'warmup' });
      } else {
        sets.push(fillRir(storedWork[w], file));
        w++;
      }
    }
  }
  return JSON.stringify(sets) === JSON.stringify(entry.sets) ? undefined : { ...entry, sets };
}

// The sets of the log with the missing reps in reserve and warm-up sets added,
// or undefined when there is nothing to add.
export function enrichStrengthData(log: SessionLog, workout: MacroFactorWorkout): ExerciseSetLog[] | undefined {
  if (!log.strengthData || log.strengthData.length === 0) return undefined;
  const byName = new Map(workout.exercises.map((e) => [nameKey(e.name), e]));
  let changed = false;
  const data = log.strengthData.map((entry) => {
    const file = byName.get(nameKey(entry.exerciseName));
    if (!file) return entry;
    const merged = mergeEntry(entry, file.loggedSets ?? file.sets);
    if (!merged) return entry;
    changed = true;
    return merged;
  });
  return changed ? data : undefined;
}

// What a short line on the card says: "de herhalingen in reserve en de opwarmsets".
export function describeEnrichment(log: SessionLog, data: ExerciseSetLog[]): string {
  let rir = false;
  let warmups = false;
  let help = false;
  (log.strengthData ?? []).forEach((entry, i) => {
    const after = data[i];
    if (after === entry) return;
    if (after.sets.some((s) => !isWorkSet(s)) && !entry.sets.some((s) => !isWorkSet(s))) warmups = true;
    const beforeWork = entry.sets.filter(isWorkSet);
    if (after.sets.filter(isWorkSet).some((s, j) => s.weightKg !== undefined && beforeWork[j]?.weightKg === undefined)) help = true;
    if (after.sets.some((s) => s.rir !== undefined) && entry.sets.some((s) => isWorkSet(s) && s.rir === undefined)) rir = true;
  });
  const parts: string[] = [];
  if (help) parts.push('de hulp bij optrekken');
  if (rir) parts.push('de herhalingen in reserve');
  if (warmups) parts.push('de opwarmsets');
  if (parts.length === 0) return 'de herhalingen in reserve';
  return parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} en ${parts[parts.length - 1]}`;
}

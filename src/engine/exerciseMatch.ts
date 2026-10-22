// ASCEND: from the name of an exercise in an import to an id of our own list
// (data/exercises.ts). Pure.
//
// Deterministic and careful: a name is found only when it is, after tidying
// (capitals, punctuation, accents and the degree sign do not matter), exactly
// the Dutch name or one of the aliases of one exercise. A name that fits two
// exercises, or none, gives nothing. "Romanian Deadlift" is not "Deadlift", and
// "Bench Press" with a different tool is not the barbell one. Better no answer
// than a wrong one: the volume and the progression read from this.

import { EXERCISES } from '../data/exercises';

// "Barbell Back Squat", "barbell back-squat" and "BARBELL  BACK SQUAT." all
// become "barbell back squat"; "45° Incline" becomes "45 incline".
export function normalizeExerciseName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const AMBIGUOUS = Symbol('ambiguous');
let index: Map<string, string | typeof AMBIGUOUS> | undefined;

function buildIndex(): Map<string, string | typeof AMBIGUOUS> {
  const map = new Map<string, string | typeof AMBIGUOUS>();
  for (const exercise of EXERCISES) {
    for (const key of new Set([exercise.name, ...exercise.aliases].map(normalizeExerciseName))) {
      const known = map.get(key);
      map.set(key, known === undefined || known === exercise.id ? exercise.id : AMBIGUOUS);
    }
  }
  return map;
}

function lookup(key: string): string | undefined {
  index ??= buildIndex();
  const found = index.get(key);
  return found === undefined || found === AMBIGUOUS ? undefined : found;
}

// "Back Squat (Barbell)" is also read as "Barbell Back Squat": the tool in
// brackets, the way some exports write it, in front of the name.
export function matchExercise(name: string): string | undefined {
  const direct = lookup(normalizeExerciseName(name));
  if (direct) return direct;
  const bracket = name.trim().match(/^(.*?)\s*\(([^)]*)\)$/);
  if (!bracket) return undefined;
  return lookup(normalizeExerciseName(`${bracket[2]} ${bracket[1]}`));
}

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

// MacroFactor writes a superset as "Hanging Leg Raise ∈ SS1": the code after
// the sign says which superset the exercise belongs to, not what it is. It is
// left off the name wherever a name is shown or compared. Spaces around the
// sign, "SS 1" and text after the code ("∈ SS1 (3 sets)") do not matter.
export function cleanExerciseName(name: string): string {
  return name.replace(/\s*[\u2208\u220A]\s*SS\s*\d+\b.*$/i, '').trim();
}

// "Barbell Back Squat", "barbell back-squat" and "BARBELL  BACK SQUAT." all
// become "barbell back squat"; "45° Incline" becomes "45 incline".
export function normalizeExerciseName(name: string): string {
  return cleanExerciseName(name)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’‘ʼ`´]/g, '')
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
  const bracket = cleanExerciseName(name).match(/^(.*?)\s*\(([^)]*)\)$/);
  if (!bracket) return undefined;
  return lookup(normalizeExerciseName(`${bracket[2]} ${bracket[1]}`));
}

// ASCEND: calisthenics als ladders (docs/beslissingen/2026-11-09-calisthenics-ontwerp.md).
// Per bewegingspatroon een lijst stappen van licht naar zwaar; elke stap is een eigen oefening met een
// eigen id in data/exercises.ts, zodat je logt op de variant die je deed en een ladder die later
// verandert niets herschrijft. Statische data, nergens opgeslagen. De ladders en toetsen zijn praktijk
// (de Recommended Routine van r/bodyweightfitness, in eigen woorden); de volgorde van de push-up volgt
// de meting van Wurm en Ebben (2010), zie docs/onderzoek/Calisthenics in apps en wetenschap.md.
//
// Dit bestand leest data/exercises.ts niet: exercises.ts leest de plek op de ladder hier (LADDER_PLACE).

// De toets van een stap: de bovenkant. Gehaald met `sets` werksets op `reps` herhalingen (of `seconds`
// seconden bij een houding), met nette vorm. `addedKg`: hoeveel extra gewicht een set minstens heeft
// om voor deze stap te tellen (de stappen met extra gewicht).
export type SkillTest =
  | { kind: 'reps'; sets: number; reps: number; addedKg?: number }
  | { kind: 'hold'; sets: number; seconds: number };

// De onderkant waar een stap begint: 3 keer 5, of 3 keer 10 seconden.
export const SKILL_FLOOR_REPS = 5;
export const SKILL_FLOOR_SECONDS = 10;

export interface SkillLadderStep {
  exerciseId: string;
  test: SkillTest;
  // Een korte regel bij de stap.
  note: string;
}

export interface SkillLadder {
  id: string;
  name: string;
  kind: 'balance' | 'strength';
  steps: SkillLadderStep[];
}

const reps = (n = 8): SkillTest => ({ kind: 'reps', sets: 3, reps: n });
const hold = (seconds = 30): SkillTest => ({ kind: 'hold', sets: 3, seconds });

export const SKILL_LADDERS: SkillLadder[] = [
  {
    id: 'push-up',
    name: 'Push-up',
    kind: 'strength',
    steps: [
      { exerciseId: 'incline-push-up-high', test: reps(), note: 'Handen op ongeveer 60 cm, een aanrecht of hoge bank.' },
      { exerciseId: 'knee-push-up', test: reps(), note: 'Op je knieën, lichaam recht van knie tot hoofd.' },
      { exerciseId: 'incline-push-up', test: reps(), note: 'Handen op ongeveer 30 cm, een lage bank of trede.' },
      { exerciseId: 'push-up', test: reps(), note: 'Handen op de grond, lichaam als een plank.' },
      { exerciseId: 'decline-push-up', test: reps(), note: 'Voeten op ongeveer 30 cm, handen op de grond.' },
      { exerciseId: 'diamond-push-up', test: reps(), note: 'Handen dicht bij elkaar onder je borst.' },
      { exerciseId: 'archer-push-up', test: reps(), note: 'Per kant geteld; de andere arm blijft gestrekt opzij.' },
    ],
  },
  {
    id: 'pull-up',
    name: 'Optrekken',
    kind: 'strength',
    steps: [
      { exerciseId: 'dead-hang', test: hold(), note: 'Hang stil aan de stang, schouders actief.' },
      { exerciseId: 'scapular-pull-up', test: reps(), note: 'Armen gestrekt, alleen je schouderbladen bewegen.' },
      { exerciseId: 'negative-chin-up', test: reps(), note: 'Begin boven de stang en zak in ongeveer 5 seconden.' },
      { exerciseId: 'pull-up', test: reps(), note: 'Uit een volle hang tot je kin boven de stang.' },
      { exerciseId: 'weighted-pull-up', test: { kind: 'reps', sets: 3, reps: 8, addedKg: 2.5 }, note: 'Extra gewicht aan een riem of in een vest, in stappen van 2,5 kg.' },
    ],
  },
  {
    id: 'dip',
    name: 'Dip',
    kind: 'strength',
    steps: [
      { exerciseId: 'support-hold', test: hold(), note: 'Steun met gestrekte armen boven de leuningen.' },
      { exerciseId: 'negative-dip', test: reps(), note: 'Begin boven en zak in ongeveer 5 seconden.' },
      { exerciseId: 'dip', test: reps(), note: 'Zak tot je bovenarmen ongeveer waterpas zijn.' },
      { exerciseId: 'weighted-dip', test: { kind: 'reps', sets: 3, reps: 8, addedKg: 2.5 }, note: 'Extra gewicht aan een riem of in een vest, in stappen van 2,5 kg.' },
    ],
  },
];

const BY_ID = new Map(SKILL_LADDERS.map((l) => [l.id, l]));

export function skillLadderById(id: string): SkillLadder | undefined {
  return BY_ID.get(id);
}

// Per oefening-id de plek op een ladder; de stap telt vanaf 1. Een oefening staat op hoogstens één ladder.
export const LADDER_PLACE = new Map<string, { id: string; step: number }>();
for (const ladder of SKILL_LADDERS) {
  ladder.steps.forEach((s, i) => LADDER_PLACE.set(s.exerciseId, { id: ladder.id, step: i + 1 }));
}

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
  // F4f: de overige ladders. Elke stap is een eigen oefening die in geen ander programma voorkomt, zodat een
  // stapvoorstel nooit een oefening uit je krachttraining raakt (de Bulgarian split squat met dumbbells staat
  // dus bewust niet in de ladder van de squat op één been).
  {
    id: 'pistol',
    name: 'Squat op één been',
    kind: 'strength',
    steps: [
      { exerciseId: 'assisted-pistol-squat', test: reps(), note: 'Je houdt je vast aan een paal of ring; per kant geteld.' },
      { exerciseId: 'skater-squat', test: reps(), note: 'Eén been achter je, de knie bijna op de grond; per kant geteld.' },
      { exerciseId: 'box-pistol-squat', test: reps(), note: 'Op een box of bank zitten en opstaan; per kant geteld.' },
      { exerciseId: 'pistol-squat', test: reps(), note: 'Diep op één been zonder steun; per kant geteld.' },
    ],
  },
  {
    id: 'handstand',
    name: 'Handstand',
    kind: 'balance',
    steps: [
      { exerciseId: 'wall-plank-hold', test: hold(), note: 'Handen op de vloer, voeten tegen de muur, lichaam in één lijn.' },
      { exerciseId: 'pike-hold', test: hold(), note: 'Heupen hoog boven je schouders, armen en benen gestrekt.' },
      { exerciseId: 'wall-handstand-hold', test: hold(), note: 'Buik naar de muur, armen gestrekt, schouders omhoog gedrukt.' },
      { exerciseId: 'free-handstand-hold', test: hold(), note: 'Zonder muur, lichaam in één rechte lijn boven je handen.' },
    ],
  },
  {
    id: 'handstand-push-up',
    name: 'Handstand push-up',
    kind: 'strength',
    steps: [
      { exerciseId: 'pike-push-up', test: reps(), note: 'Heupen hoog, hoofd naar de vloer tussen je handen.' },
      { exerciseId: 'elevated-pike-push-up', test: reps(), note: 'Voeten op een bank of box, hoe hoger hoe zwaarder.' },
      { exerciseId: 'wall-hspu-negative', test: reps(), note: 'In een handstand tegen de muur, zakken in ongeveer 5 seconden.' },
      { exerciseId: 'wall-hspu', test: reps(), note: 'Tegen de muur zakken tot je hoofd de mat raakt en terugduwen.' },
    ],
  },
  {
    id: 'l-sit',
    name: 'L-sit',
    kind: 'strength',
    steps: [
      { exerciseId: 'tuck-l-sit', test: hold(), note: 'Steun op je handen, knieën naar je borst.' },
      { exerciseId: 'one-leg-l-sit', test: hold(), note: 'Eén been gestrekt, het andere gebogen; wissel per set.' },
      { exerciseId: 'l-sit', test: hold(), note: 'Beide benen gestrekt voor je, op de vloer, parallettes of dip bars.' },
    ],
  },
  {
    id: 'front-lever',
    name: 'Front lever',
    kind: 'strength',
    steps: [
      { exerciseId: 'tuck-front-lever', test: hold(), note: 'Knieën naar je borst, rug horizontaal, armen gestrekt.' },
      { exerciseId: 'advanced-tuck-front-lever', test: hold(), note: 'Heupen open, knieën op een rechte hoek, schenen parallel aan je romp.' },
      { exerciseId: 'one-leg-front-lever', test: hold(), note: 'Eén been gestrekt, het andere gebogen; wissel per set.' },
      { exerciseId: 'straddle-front-lever', test: hold(), note: 'Beide benen gestrekt en gespreid, rug horizontaal.' },
    ],
  },
  {
    id: 'muscle-up',
    name: 'Muscle-up',
    kind: 'strength',
    steps: [
      { exerciseId: 'chest-to-bar-pull-up', test: reps(), note: 'Trek tot de stang je onderste borst raakt.' },
      { exerciseId: 'straight-bar-dip', test: reps(), note: 'Steun boven een rechte stang, borst voorover over de stang.' },
      { exerciseId: 'negative-muscle-up', test: reps(), note: 'Begin in steun boven de stang en zak in ongeveer 5 seconden naar een hang.' },
      { exerciseId: 'muscle-up', test: reps(), note: 'Trek over de stang heen tot je in steun staat.' },
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

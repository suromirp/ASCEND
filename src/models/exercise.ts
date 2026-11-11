// ASCEND: the exercise list's own vocabulary. No React, no IndexedDB. The list
// itself is data/exercises.ts; the matching of imported names is
// engine/exerciseMatch.ts; the volume per muscle group is engine/muscleVolume.ts.

// A fixed list of muscle groups, finer than a gym app usually has where the
// mountains ask for it: calves, shin muscles and hip abductors are groups of
// their own.
export const MUSCLE_GROUPS = [
  'quadriceps',
  'hamstrings',
  'glutes',
  'calves',
  'tibialis',
  'hip_abductors',
  'hip_adductors',
  'lower_back',
  'core',
  'chest',
  'lats',
  'upper_back',
  'front_delts',
  'side_delts',
  'rear_delts',
  'biceps',
  'triceps',
  'forearms',
  'traps',
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

// Dutch names, as shown to the user.
export const MUSCLE_LABEL: Record<MuscleGroup, string> = {
  quadriceps: 'Quadriceps',
  hamstrings: 'Hamstrings',
  glutes: 'Bilspieren',
  calves: 'Kuiten',
  tibialis: 'Tibialis',
  hip_abductors: 'Abductoren',
  hip_adductors: 'Adductoren',
  lower_back: 'Onderrug',
  core: 'Core',
  chest: 'Borst',
  lats: 'Lats',
  upper_back: 'Bovenrug',
  front_delts: 'Delts voor',
  side_delts: 'Delts zij',
  rear_delts: 'Delts achter',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Onderarmen',
  traps: 'Traps',
};

// What the weight is made of. It decides how a weight is rounded later (a
// stack goes in steps of its plates, a barbell in the plates you have).
export const RESISTANCES = [
  'barbell', // stang met schijven
  'dumbbell',
  'cable',
  'machine_stack', // machine met gewichtstapel
  'machine_plates', // machine met schijven
  'bodyweight',
  'assisted_bodyweight', // lichaamsgewicht met hulp (het gewicht is hulp)
  'pack_or_vest', // rugzak of vest
] as const;

export type Resistance = (typeof RESISTANCES)[number];

export const MOVEMENT_PATTERNS = [
  'squat',
  'hinge',
  'lunge_step',
  'push_horizontal',
  'push_vertical',
  'pull_horizontal',
  'pull_vertical',
  'calf',
  'shin',
  'hip',
  'core',
  'isolation_arm',
  'isolation_shoulder',
  'isolation_leg', // kniestrekken en kniebuigen op de machine
  'isolation_upper', // flyes, pullovers, straight-arm pulldown en shrugs: één gewricht, borst of rug
  'balance', // enkel en evenwicht: op één been staan en reiken (docs/beslissingen/2026-11-11-enkel-evenwicht.md)
] as const;

export type MovementPattern = (typeof MOVEMENT_PATTERNS)[number];

export const PATTERN_LABEL: Record<MovementPattern, string> = {
  squat: 'Squat',
  hinge: 'Heupscharnier',
  lunge_step: 'Lunge of step',
  push_horizontal: 'Horizontaal duwen',
  push_vertical: 'Verticaal duwen',
  pull_horizontal: 'Horizontaal trekken',
  pull_vertical: 'Verticaal trekken',
  calf: 'Kuit',
  shin: 'Scheenbeen',
  hip: 'Heup',
  core: 'Core',
  isolation_arm: 'Isolatie arm',
  isolation_shoulder: 'Isolatie schouder',
  isolation_leg: 'Isolatie been',
  isolation_upper: 'Isolatie borst of rug',
  balance: 'Evenwicht',
};

export interface Exercise {
  // Stable slug; never changes once a log refers to it.
  id: string;
  // Dutch name.
  name: string;
  // Other names, English and Dutch, also the way MacroFactor writes them.
  // The Dutch name does not have to be repeated here.
  aliases: string[];
  primary: MuscleGroup[];
  secondary: MuscleGroup[];
  resistance: Resistance;
  pattern: MovementPattern;
  // The share of the body weight that moves with the exercise, 0 to 1, where
  // that plays a part (a push-up, a pull-up). A rough, honest estimate.
  bodyweightFraction?: number;
  // The legs carry real load (for the leg index and the warm-up).
  loadsLegs: boolean;
  // Done with one dumbbell (goblet squat, single arm row): a logged weight is never
  // the total of two dumbbells.
  oneDumbbell?: boolean;
  // Tot het uiterste gaan kan hier misgaan zonder spotter of veiligheidsarmen: een stang op je
  // borst of schouders. Forge schrijft er dan minstens 1 herhaling in reserve voor
  // (engine/spotter.ts, docs/beslissingen/2026-10-28-zonder-spotter.md). Toestellen, kabels en
  // dumbbells hebben het niet.
  failureRisk?: boolean;
  // De beweging (data/exerciseFamilies.ts): oefeningen in dezelfde familie zijn echte vervangers van
  // elkaar bij het ruilen. Ontbreekt hij, dan valt het ruilen terug op de spieren alleen.
  family?: string;
  // Kenmerken die de beweging binnen de familie iets anders maken (een pauze, een brede greep).
  nuance?: string[];
  // Three to five short points: what you do, what to watch, the most made mistake.
  cues: string[];
  // De uitleg met twee lagen (data/exerciseGuides.ts, docs/beslissingen/2026-11-09-uitleg-bij-oefeningen.md).
  // Heeft een oefening hem, dan toont het blad hem in plaats van de drie oude regels in `cues`.
  guide?: ExerciseGuide;
  videoUrl?: string;
  // Calisthenics (docs/beslissingen/2026-11-09-calisthenics-ontwerp.md); all optional and additive.
  // How a set is measured: in reps or as a hold in seconds. Absent means reps.
  measure?: 'reps' | 'hold';
  // The place on a ladder of data/skillLadders.ts (step counts from 1, light to heavy).
  ladder?: { id: string; step: number };
  // Reps count per side (archer push-up).
  perSide?: boolean;
  // Done with the help of a band; how strong the band was is in the log (SetLog.band), not in the id.
  assist?: 'band';
}

// "In het kort" (precies drie regels) altijd zichtbaar, de rest achter "Lees verder".
export interface ExerciseGuide {
  short: [string, string, string];
  setup: string;
  movement: string;
  // In gewone woorden ("twee tellen omlaag"), geen code als 3010.
  tempo: string;
  mistakes: { fault: string; fix: string }[];
  // Id's van andere oefeningen; de tik verschijnt alleen als het id in de lijst staat.
  easier?: string;
  harder?: string;
  // Alleen als de tekst op een open bron met licentie is gebaseerd.
  source?: { name: string; license: string; url?: string };
}

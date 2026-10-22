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
  quadriceps: 'Bovenbenen voor',
  hamstrings: 'Bovenbenen achter',
  glutes: 'Billen',
  calves: 'Kuiten',
  tibialis: 'Scheenbeenspieren',
  hip_abductors: 'Heupabductoren',
  hip_adductors: 'Heupadductoren',
  lower_back: 'Onderrug',
  core: 'Romp',
  chest: 'Borst',
  lats: 'Brede rugspieren',
  upper_back: 'Bovenrug',
  front_delts: 'Schouders voor',
  side_delts: 'Schouders zij',
  rear_delts: 'Schouders achter',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Onderarmen',
  traps: 'Trapezius',
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

export const RESISTANCE_LABEL: Record<Resistance, string> = {
  barbell: 'Stang met schijven',
  dumbbell: 'Dumbbells',
  cable: 'Kabel',
  machine_stack: 'Machine met gewichtstapel',
  machine_plates: 'Machine met schijven',
  bodyweight: 'Lichaamsgewicht',
  assisted_bodyweight: 'Lichaamsgewicht met hulp',
  pack_or_vest: 'Rugzak of vest',
};

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
  core: 'Romp',
  isolation_arm: 'Isolatie arm',
  isolation_shoulder: 'Isolatie schouder',
  isolation_leg: 'Isolatie been',
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
  // Three to five short points: what you do, what to watch, the most made mistake.
  cues: string[];
  videoUrl?: string;
}

// ASCEND: welke oefening dezelfde beweging is als welke, naast de lijst in exercises.ts.
// Een familie is één beweging (zelfde gewrichten, zelfde richting, zelfde hoek); binnen een familie
// is een oefening een echte vervanger van een andere. Een nuance is een kenmerk dat de beweging
// binnen de familie iets anders maakt. Statische data, nergens opgeslagen.
// Opzet en bronnen: docs/onderzoek/Echte vervangers bij ruilen in Forge.md,
// besluit docs/beslissingen/2026-11-09-forge-echte-vervangers.md.

export type Nuance =
  | 'pause' | 'wide' | 'low' | 'front' | 'light' | 'single' | 'underhand' | 'preacher' | 'floor' | 'step'
  | 'walking' | 'elevated' | 'trap' | 'sumo' | 'quad' | 'hinged' | 'legs' | 'negative' | 'lying' | 'frog' | 'y';

// Eén regel per familie: een id, of [id, ...nuances].
const FAMILIES: Record<string, (string | [string, ...Nuance[]])[]> = {
  squat: ['back-squat', ['front-squat', 'front'], ['goblet-squat', 'front', 'light'], 'hack-squat', ['pause-back-squat', 'pause']],
  leg_press: ['leg-press', 'leg-press-plates', ['leg-press-quad-biased', 'quad']],
  knee_extension: ['leg-extension', 'reverse-nordic-curl'],
  quad_bodyweight: ['spanish-squat', 'eccentric-squat'],
  split_squat: ['split-squat', ['bulgarian-split-squat', 'elevated'], ['reverse-lunge', 'step'], ['walking-lunge', 'step', 'walking']],
  step_up: ['step-up', 'step-up-pack'],
  step_down: ['step-down', 'step-down-pack'],
  deadlift: ['deadlift', ['trap-bar-deadlift', 'trap'], ['sumo-deadlift', 'sumo']],
  hip_hinge: ['romanian-deadlift', 'dumbbell-rdl', ['single-leg-rdl', 'single']],
  back_extension: ['back-extension', 'weighted-roman-chair-back-extension', 'weighted-ghd-hip-hinge', ['superman', 'light']],
  hip_thrust: ['hip-thrust', ['barbell-glute-bridge', 'floor'], ['dumbbell-glute-bridge', 'floor'], ['glute-bridge', 'floor'], ['dumbbell-frog-pump', 'floor', 'frog']],
  knee_flexion: ['seated-leg-curl', ['lying-leg-curl', 'lying'], ['seated-single-leg-curl', 'single'], ['nordic-curl', 'negative'], 'glute-ham-raise'],
  calf_straight: ['standing-calf-raise', 'leg-press-calf-raise', 'bodyweight-calf-raise', ['single-leg-calf-raise', 'single']],
  calf_bent: ['seated-calf-raise'],
  tibialis: ['tibialis-raise', 'tibialis-raise-loaded'],
  hip_abduction: ['hip-abduction-machine', 'cable-hip-abduction', 'hip-abduction-band', ['lateral-band-walk', 'walking'], 'side-lying-hip-abduction'],
  hip_adduction: ['hip-adduction-machine', 'copenhagen-plank'],
  anti_extension: ['plank', 'dead-bug', 'ab-wheel-rollout', 'barbell-rollout'],
  trunk_flexion: ['hanging-leg-raise', 'cable-crunch', 'decline-weighted-sit-up'],
  anti_rotation: ['pallof-press', 'horizontal-cable-chop', 'machine-torso-rotation'],
  side_plank: ['side-plank'],
  carry: ['farmers-carry'],
  flat_press: ['bench-press', 'dumbbell-bench-press', 'machine-chest-press', ['wide-grip-bench-press', 'wide'], ['pause-dumbbell-bench-press', 'pause']],
  incline_press: ['incline-bench-press', 'incline-dumbbell-press', ['low-incline-barbell-press', 'low'], ['low-incline-dumbbell-press', 'low']],
  close_press: ['close-grip-bench-press'],
  dip: ['dip'],
  push_up: ['push-up'],
  chest_fly: ['cable-fly', 'pec-deck-fly', ['low-incline-dumbbell-fly', 'low'], ['low-to-high-cable-fly', 'low']],
  overhead_press: ['overhead-press', 'dumbbell-shoulder-press', 'machine-shoulder-press', ['push-press', 'legs']],
  lateral_raise: ['lateral-raise', ['single-arm-cable-lateral-raise', 'single']],
  rear_delt: ['rear-delt-fly', 'face-pull', ['chest-supported-dumbbell-y-raise', 'y']],
  shrug: ['shrug', ['snatch-grip-shrug', 'wide']],
  kelso: ['kelso-shrug'],
  vertical_pull: ['pull-up', ['chin-up', 'underhand'], 'assisted-pull-up', 'lat-pulldown', ['single-arm-cable-lat-pulldown', 'single'], ['negative-chin-up', 'underhand', 'negative']],
  row: [['barbell-row', 'hinged'], ['dumbbell-row', 'single'], 'chest-supported-row', 'seated-cable-row', 'machine-row', 'machine-row-plates', 'inverted-row'],
  high_row: ['cable-high-row', 'chest-supported-dumbbell-high-row', ['bent-over-barbell-high-row', 'hinged']],
  lat_isolation: ['straight-arm-pulldown', 'dumbbell-pullover'],
  curl: ['barbell-curl', 'dumbbell-curl', ['dumbbell-preacher-curl', 'preacher'], ['machine-preacher-curl', 'preacher']],
  hammer_curl: ['hammer-curl', 'incline-hammer-curl'],
  triceps_pushdown: ['triceps-pushdown'],
  triceps_overhead: ['overhead-triceps-extension'],
};

export const FAMILY = new Map<string, string>();
export const NUANCE = new Map<string, readonly Nuance[]>();
for (const [family, members] of Object.entries(FAMILIES)) {
  for (const m of members) {
    const [id, ...nuances] = typeof m === 'string' ? [m] : m;
    FAMILY.set(id, family);
    if (nuances.length > 0) NUANCE.set(id, nuances as Nuance[]);
  }
}

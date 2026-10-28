// ASCEND: welke tekening bij welke oefening hoort. De tekeningen zijn van Workout Guide (de
// vernieuwde Everkinetic-set, CC BY-SA 4.0), bewaard in public/exercise-art/<slug>.json.
// Eén slug kan bij meer oefeningen horen (een gewone en een pauze-squat). 'zeker' is dezelfde
// oefening; 'variant' is dezelfde beweging met één verschil, dat in `note` staat en in het blad
// onder de tekening verschijnt ("Op de tekening: ..."). Een oefening die hier niet staat heeft
// alleen de spierkaart. Zie docs/onderzoek/Afbeeldingen bij oefeningen.md en
// docs/beslissingen/2026-10-28-plaatjes-bij-oefeningen.md.

export interface ExerciseArtLink {
  slug: string;
  match: 'zeker' | 'variant';
  // Alleen bij een variant: wat er op de tekening anders is, als stukje na "Op de tekening: ".
  note?: string;
}

const z = (slug: string): ExerciseArtLink => ({ slug, match: 'zeker' });
const v = (slug: string, note: string): ExerciseArtLink => ({ slug, match: 'variant', note });

export const EXERCISE_ART: Record<string, ExerciseArtLink> = {
  // knie, squat en pers
  'back-squat': z('squat'),
  'pause-back-squat': z('squat'),
  'front-squat': z('front-squat'),
  'goblet-squat': z('goblet-squat'),
  'leg-press': z('leg-press'),
  'leg-press-plates': z('leg-press'),
  'leg-extension': z('leg-extension'),
  'bulgarian-split-squat': z('bulgarian-split-squat'),
  'split-squat': z('split-squat'),
  'walking-lunge': z('walking-lunge'),
  'reverse-lunge': z('reverse-lunge'),
  'step-up': z('step-up'),
  'step-down': z('step-down'),
  // heupscharnier en hamstrings
  deadlift: z('deadlift'),
  'sumo-deadlift': z('sumo-deadlift'),
  'romanian-deadlift': z('romanian-deadlift'),
  'trap-bar-deadlift': z('trap-bar-deadlift'),
  'dumbbell-rdl': z('dumbbell-romanian-deadlift'),
  'single-leg-rdl': z('single-leg-romanian-deadlift'),
  'hip-thrust': z('hip-thrust'),
  'glute-bridge': z('glute-bridge'),
  'dumbbell-glute-bridge': z('dumbbell-glute-bridge'),
  'barbell-glute-bridge': z('barbell-glute-bridge'),
  'back-extension': z('back-extension'),
  superman: z('superman'),
  'nordic-curl': z('nordic-hamstring-curl'),
  'lying-leg-curl': z('lying-leg-curl'),
  'seated-leg-curl': z('seated-leg-curl'),
  // kuit en heup
  'standing-calf-raise': z('standing-calf-raise'),
  'bodyweight-calf-raise': v('calf-raise', 'met twee stangen om je aan vast te houden'),
  'single-leg-calf-raise': z('single-leg-calf-raise'),
  'seated-calf-raise': z('seated-calf-raise'),
  'leg-press-calf-raise': z('leg-press-calf-raise'),
  'hip-abduction-machine': z('hip-abduction-machine'),
  'hip-abduction-band': z('banded-standing-hip-abduction'),
  'lateral-band-walk': z('banded-lateral-walk'),
  'side-lying-hip-abduction': z('side-lying-hip-abduction'),
  'cable-hip-abduction': z('cable-standing-hip-abduction'),
  'hip-adduction-machine': z('hip-adduction-machine'),
  'copenhagen-plank': z('copenhagen-plank'),
  // romp
  plank: z('plank'),
  'side-plank': z('side-plank'),
  'dead-bug': z('dead-bug'),
  'hanging-leg-raise': z('hanging-leg-raise'),
  'cable-crunch': z('cable-crunch'),
  'farmers-carry': z('farmer-carry'),
  // duwen
  'bench-press': z('bench-press'),
  'incline-bench-press': z('incline-bench-press'),
  'dumbbell-bench-press': v('dumbbell-bench-press', 'een schuine bank'),
  'pause-dumbbell-bench-press': v('dumbbell-bench-press', 'een schuine bank'),
  'incline-dumbbell-press': z('incline-dumbbell-press'),
  'close-grip-bench-press': z('close-grip-bench-press'),
  'push-up': z('push-up'),
  'machine-chest-press': z('machine-chest-press'),
  'cable-fly': z('cable-fly'),
  'pec-deck-fly': z('pec-deck'),
  dip: v('dip', 'op een toestel dat je helpt, op je knieën'),
  'overhead-press': z('overhead-press'),
  'push-press': z('push-press'),
  'dumbbell-shoulder-press': z('seated-dumbbell-press'),
  'machine-shoulder-press': z('machine-shoulder-press'),
  'lateral-raise': z('lateral-raise'),
  'single-arm-cable-lateral-raise': z('cable-lateral-raise'),
  'rear-delt-fly': z('rear-delt-fly'),
  'face-pull': z('face-pull'),
  // trekken
  'pull-up': z('pull-up'),
  'chin-up': z('chin-up'),
  'assisted-pull-up': z('assisted-pull-up'),
  'lat-pulldown': v('lat-pulldown', 'een bovenhandse greep'),
  'straight-arm-pulldown': z('straight-arm-pulldown'),
  'barbell-row': v('barbell-row', 'een brede greep, bovenhands'),
  'dumbbell-row': z('one-arm-dumbbell-row'),
  'chest-supported-row': z('chest-supported-row'),
  'seated-cable-row': z('seated-row'),
  'machine-row': z('machine-row'),
  'inverted-row': z('inverted-row'),
  shrug: z('dumbbell-shrug'),
  // armen
  'dumbbell-curl': z('bicep-curl'),
  'hammer-curl': z('hammer-curl'),
  'machine-preacher-curl': z('preacher-curl'),
  'triceps-pushdown': z('tricep-pushdown'),
  'overhead-triceps-extension': z('overhead-tricep-extension'),

  // varianten: dezelfde beweging, op de tekening iets anders
  'step-up-pack': v('step-up', 'zonder rugzak'),
  'step-down-pack': v('step-down', 'zonder rugzak'),
  'eccentric-squat': v('bodyweight-squat', 'een gewone squat, het langzaam zakken zie je niet'),
  'leg-press-quad-biased': v('leg-press', 'een gewone voetstand'),
  'seated-single-leg-curl': v('seated-leg-curl', 'met twee benen'),
  'weighted-roman-chair-back-extension': v('back-extension', 'zonder gewicht'),
  'weighted-ghd-hip-hinge': v('back-extension', 'een ander toestel'),
  'glute-ham-raise': v('nordic-hamstring-curl', 'zonder toestel'),
  'dumbbell-frog-pump': v('frog-pump', 'zonder gewicht'),
  'decline-weighted-sit-up': v('decline-sit-up', 'zonder gewicht'),
  'horizontal-cable-chop': v('cable-woodchop', 'schuin in plaats van horizontaal'),
  'low-incline-barbell-press': v('incline-bench-press', 'een steilere bank'),
  'low-incline-dumbbell-press': v('incline-dumbbell-press', 'een steilere bank'),
  'low-incline-dumbbell-fly': v('dumbbell-fly', 'een steilere bank'),
  'wide-grip-bench-press': v('bench-press', 'een gewone greep'),
  'low-to-high-cable-fly': v('incline-cable-fly', 'op een schuine bank in plaats van staand'),
  'chest-supported-dumbbell-y-raise': v('prone-y-raise', 'liggend zonder gewicht'),
  'chest-supported-dumbbell-high-row': v('chest-supported-row', 'de ellebogen lager'),
  'bent-over-barbell-high-row': v('barbell-row', 'de ellebogen lager'),
  'machine-row-plates': v('machine-row', 'een ander toestel'),
  'single-arm-cable-lat-pulldown': v('lat-pulldown', 'met twee armen'),
  'negative-chin-up': v('negative-pull-up', 'een andere greep'),
  'barbell-curl': v('ez-bar-curl', 'een gebogen stang'),
  'dumbbell-preacher-curl': v('preacher-curl', 'op een toestel'),
  'incline-hammer-curl': v('incline-dumbbell-curl', 'een andere stand van de handen'),
  'snatch-grip-shrug': v('dumbbell-shrug', 'met dumbbells'),
};

// De volgorde van de drie beelden in een bestand is die van de bron en niet altijd die van de
// beweging. `order` zegt per slug welk beeld (0, 1 of 2) bij stap 1, 2 en 3 hoort: stap 1 is de
// beginhouding, stap 2 het midden en stap 3 de eindstand. Zonder regel is de volgorde van het bestand goed.
export type ArtOrder = readonly [number, number, number];

const REVERSED: ArtOrder = [2, 1, 0];

export const ART_ORDER: Record<string, ArtOrder> = {
  // hangen en trekken: van hangend naar boven, of van gestrekt naar bij je borst
  'assisted-pull-up': REVERSED,
  'chin-up': REVERSED,
  'pull-up': REVERSED,
  'negative-pull-up': REVERSED,
  'inverted-row': REVERSED,
  'lat-pulldown': REVERSED,
  'seated-row': REVERSED,
  'machine-row': REVERSED,
  'one-arm-dumbbell-row': REVERSED,
  'chest-supported-row': REVERSED,
  'straight-arm-pulldown': REVERSED,
  'face-pull': REVERSED,
  'barbell-row': [1, 2, 0],
  // curlen, heffen en duwen vanaf de schouder
  'bicep-curl': REVERSED,
  'ez-bar-curl': REVERSED,
  'hammer-curl': REVERSED,
  'preacher-curl': REVERSED,
  'incline-dumbbell-curl': REVERSED,
  'tricep-pushdown': REVERSED,
  'lateral-raise': REVERSED,
  'cable-lateral-raise': REVERSED,
  'rear-delt-fly': REVERSED,
  'overhead-press': REVERSED,
  'push-press': REVERSED,
  'seated-dumbbell-press': REVERSED,
  'machine-shoulder-press': REVERSED,
  'prone-y-raise': REVERSED,
  'cable-fly': REVERSED,
  'incline-cable-fly': REVERSED,
  'cable-woodchop': REVERSED,
  'dumbbell-shrug': [0, 2, 1],
  // benen: van staand naar diep, of van gestrekt naar opgetrokken
  'bodyweight-squat': REVERSED,
  'goblet-squat': REVERSED,
  'bulgarian-split-squat': REVERSED,
  'split-squat': REVERSED,
  'reverse-lunge': REVERSED,
  'walking-lunge': [1, 0, 2],
  'step-up': [2, 0, 1],
  'step-down': REVERSED,
  'single-leg-romanian-deadlift': REVERSED,
  'dumbbell-romanian-deadlift': [2, 0, 1],
  deadlift: [1, 2, 0],
  'leg-extension': REVERSED,
  'lying-leg-curl': REVERSED,
  'nordic-hamstring-curl': REVERSED,
  'calf-raise': REVERSED,
  'standing-calf-raise': REVERSED,
  'seated-calf-raise': [1, 2, 0],
  // heup en romp
  'glute-bridge': REVERSED,
  'hip-thrust': REVERSED,
  'hip-abduction-machine': REVERSED,
  'banded-lateral-walk': REVERSED,
  'banded-standing-hip-abduction': REVERSED,
  'cable-standing-hip-abduction': REVERSED,
  'side-lying-hip-abduction': REVERSED,
  'back-extension': [2, 0, 1],
  superman: REVERSED,
  'dead-bug': REVERSED,
  'decline-sit-up': REVERSED,
  'hanging-leg-raise': REVERSED,
  'cable-crunch': [2, 0, 1],
};

export function artOrder(slug: string): ArtOrder {
  return ART_ORDER[slug] ?? [0, 1, 2];
}

export function exerciseArt(id: string): ExerciseArtLink | undefined {
  return EXERCISE_ART[id];
}

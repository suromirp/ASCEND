// ASCEND: waar het aandeel van je lichaamsgewicht per oefening vandaan komt
// (`Exercise.bodyweightFraction`, docs/beslissingen/2026-11-09-gewicht-bij-eigen-gewicht.md).
//
// Het getal zelf staat bij de oefening in `data/exercises.ts`; hier staat de bron als korte zin voor het blad
// in Forge, en de aanvullingen voor oefeningen die er nog geen hadden. Elk getal is een schatting of een
// meting van een deel van het lichaam; geen enkele is jouw eigen meting.
//
// Niet aangevuld, met reden: houdingen (seconden, het moment rond de schouder telt, geen gewicht), balans
// (handstand, L-sit, front lever), oefeningen zonder last (banden, plank, bird dog) en de handstand
// push-ups en pike push-ups (geen meting gevonden).

const PUSH_UP = 'Gemeten bij push-ups (Wurm en Ebben, 2010)';
const WHOLE = 'Je hele lichaam beweegt mee';
const PARTS = 'Berekend uit het gewicht van je lichaamsdelen (de Leva, 1996)';

// Aanvullingen op `ex()`: oefeningen met eigen gewicht en herhalingen die er nog geen aandeel hadden.
export const EXTRA_FRACTION: ReadonlyMap<string, number> = new Map([
  ['hanging-leg-raise', 0.5],
  ['chest-to-bar-pull-up', 1],
  ['straight-bar-dip', 1],
  ['negative-muscle-up', 1],
  ['muscle-up', 1],
  ['pistol-squat', 0.9],
  ['box-pistol-squat', 0.9],
  ['skater-squat', 0.9],
]);

const SOURCE = new Map<string, string>([
  ['push-up', PUSH_UP], ['incline-push-up', PUSH_UP], ['decline-push-up', PUSH_UP], ['knee-push-up', PUSH_UP], ['incline-push-up-high', PUSH_UP],
  ['diamond-push-up', 'Schatting: zoals een gewone push-up'], ['archer-push-up', 'Schatting: zoals een gewone push-up'],
  ['dip', WHOLE], ['negative-dip', WHOLE], ['weighted-dip', WHOLE], ['straight-bar-dip', WHOLE],
  ['pull-up', WHOLE], ['chin-up', WHOLE], ['assisted-pull-up', WHOLE], ['negative-chin-up', WHOLE], ['weighted-pull-up', WHOLE], ['scapular-pull-up', WHOLE],
  ['chest-to-bar-pull-up', WHOLE], ['negative-muscle-up', WHOLE], ['muscle-up', WHOLE],
  ['hanging-leg-raise', 'Schatting: je benen en heupen bewegen mee'],
  ['pistol-squat', PARTS], ['box-pistol-squat', PARTS], ['skater-squat', PARTS],
  ['glute-bridge', 'Schatting, de berekening uit je lichaamsdelen geeft minder'],
  ['inverted-row', 'Schatting uit de hoek van je lichaam'],
  ['barbell-row', 'Schatting: je romp hangt mee'], ['bent-over-barbell-high-row', 'Schatting: je romp hangt mee'],
]);

// De bron bij het getal van een oefening, voor het blad. Alles wat hierboven niet staat is een schatting.
export function shareSource(id: string): string {
  return SOURCE.get(id) ?? 'Schatting uit de lichaamsdelen die meebewegen';
}

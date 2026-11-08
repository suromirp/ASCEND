// ASCEND: de maanstand van een dag, uitgerekend en niet opgehaald, dus ook zonder internet.
// De gemiddelde maanmaand (29,53 dagen) vanaf een bekende nieuwe maan (6 januari 2000, 18:14 UTC).
// De echte maan wijkt daar tot ongeveer een halve dag van af; genoeg voor "volle maan" en "nieuwe
// maan" met een marge van anderhalve dag. Het is alleen een regel tekst bij een avondtocht of een
// nacht buiten; het verandert de planning nooit.
//
// Pure: no React, no IndexedDB.

const SYNODIC_DAYS = 29.530588853;
const NEW_MOON_2000_MS = Date.UTC(2000, 0, 6, 18, 14);
const DAY_MS = 86_400_000;
// "Vol" en "nieuw" gelden anderhalve dag aan weerszijden, ruim boven de rekenfout.
const NEAR_DAYS = 1.5;

export type MoonPhase = 'full' | 'new';

export interface MoonNote {
  phase: MoonPhase;
  text: string;
}

// Dagen sinds de laatste nieuwe maan, op de avond (18:00 UTC) van die dag. NaN voor een datum die
// geen datum is; de aanroepers vangen dat af.
export function moonAge(dateIso: string): number {
  const [y, m, d] = dateIso.split('-').map(Number);
  const at = Date.UTC(y, m - 1, d, 18, 0);
  const days = (at - NEW_MOON_2000_MS) / DAY_MS;
  return ((days % SYNODIC_DAYS) + SYNODIC_DAYS) % SYNODIC_DAYS;
}

// Het deel van de maan dat verlicht is: 0 bij nieuwe maan, 1 bij volle maan.
export function moonIllumination(dateIso: string): number {
  return (1 - Math.cos((2 * Math.PI * moonAge(dateIso)) / SYNODIC_DAYS)) / 2;
}

// Een regel bij volle of nieuwe maan, anders niets.
export function moonNote(dateIso: string): MoonNote | undefined {
  const age = moonAge(dateIso);
  if (!Number.isFinite(age)) return undefined;
  if (Math.abs(age - SYNODIC_DAYS / 2) <= NEAR_DAYS) return { phase: 'full', text: 'Volle maan, je ziet het pad meestal zonder lamp.' };
  if (age <= NEAR_DAYS || SYNODIC_DAYS - age <= NEAR_DAYS) return { phase: 'new', text: 'Nieuwe maan, het wordt echt donker; neem een goede lamp mee.' };
  return undefined;
}

// Alleen als je na zonsondergang buiten bent of buiten slaapt.
export function eveningMoonNote(dateIso: string, ctx: { endsAfterSunset: boolean; overnight: boolean }): MoonNote | undefined {
  return ctx.endsAfterSunset || ctx.overnight ? moonNote(dateIso) : undefined;
}

// ASCEND: UV en hoogte bij een training buiten (backlog ronde 1, "Buiten: UV en hoogte van je plek").
//
// Twee korte stukjes tekst voor de rij Weer van de Briefing en de pagina Weer. Alleen tekst: dit
// bestand haalt niets op en verandert de planning nooit. De UV komt uit de uurlijkse voorspelling
// (het hoogste uur in je training, engine/weather.ts#sessionWeather), de hoogte uit het veld
// `elevation` dat Open-Meteo bij elk weerantwoord meestuurt (integrations/openMeteo.ts#mapForecast).
//
// Wanneer iets verschijnt:
// - UV pas vanaf 3, op hele getallen. De WHO zegt van 0 tot 2 geen bescherming, vanaf 3 zonnebrand,
//   pet en schaduw rond de middag, vanaf 8 is het een must (docs/onderzoek/Kleding bij het weer.md,
//   "Zon en uv"). 's Nachts is de UV 0: dan niets.
// - Wat je doet volgt het kledingadvies (clothing.ts), zodat ze elkaar niet tegenspreken: korter dan
//   45 minuten alleen het getal; vanaf 6 ook pet en zonnebril, maar alleen op de pagina Weer (`full`),
//   de rij in de Briefing blijft kort. Noemt het kledingadvies de zonnebrand al, dan alleen het getal
//   (besluit 2026-11-14-uv-en-hoogte-aanvulling.md).
// - Hoogte pas vanaf 1000 m, op 10 m afgerond. Lager zegt het in Nederland en de heuvels niets;
//   daarboven is het kouder en sterker in de zon dan je van huis gewend bent (eigen keuze).
// - Alleen buiten (trainingPlace.ts#placeIsOutdoor) en alleen met de instelling aan.

import { formatNumberNL } from '../utils/number';
import { SUNSCREEN_MINUTES } from './clothing';

export const UV_FROM = 3;
export const UV_STRONG = 6;
export const ALTITUDE_FROM_M = 1000;

export interface UvOptions {
  // Het kledingadvies op hetzelfde scherm noemt de zonnebrand al.
  sunscreenSaid?: boolean;
  // De lengte van de training; korter dan SUNSCREEN_MINUTES alleen het getal. Afwezig: geen grens.
  minutes?: number;
  // Op de pagina Weer: vanaf 6 ook pet en zonnebril. In de rij van de Briefing niet.
  full?: boolean;
}

// "UV 4, smeer je in", of alleen "UV 4".
export function uvPhrase(uvIndex: number | undefined, options: UvOptions = {}): string | undefined {
  if (uvIndex === undefined || !Number.isFinite(uvIndex)) return undefined;
  const uv = Math.round(uvIndex);
  if (uv < UV_FROM) return undefined;
  const short = options.minutes !== undefined && options.minutes < SUNSCREEN_MINUTES;
  if (options.sunscreenSaid || short) return `UV ${uv}`;
  return options.full && uv >= UV_STRONG ? `UV ${uv}, smeer je in en zet pet en zonnebril op` : `UV ${uv}, smeer je in`;
}

// "je plek ligt op 1.240 m". Onder de 1000 m, of zonder hoogte: niets.
export function altitudePhrase(elevationM: number | undefined): string | undefined {
  if (elevationM === undefined || !Number.isFinite(elevationM)) return undefined;
  const m = Math.round(elevationM / 10) * 10;
  if (m < ALTITUDE_FROM_M) return undefined;
  return `je plek ligt op ${formatNumberNL(m, 0)} m`;
}

export interface OutdoorSunInput {
  on: boolean;
  outdoor: boolean;
  uvIndex: number | undefined;
  // De hoogte van de plek van de voorspelling. Laat weg als die voorspelling niet van de plek van
  // je training is (de plek laadde niet en het weer is van huis).
  elevationM: number | undefined;
  sunscreenSaid?: boolean;
  minutes?: number;
  full?: boolean;
}

// De stukjes die erbij komen, in volgorde: UV, dan hoogte. Leeg: er komt niets bij.
export function outdoorSunParts(input: OutdoorSunInput): string[] {
  if (!input.on || !input.outdoor) return [];
  const uv = uvPhrase(input.uvIndex, { sunscreenSaid: input.sunscreenSaid, minutes: input.minutes, full: input.full });
  return [uv, altitudePhrase(input.elevationM)].filter((p): p is string => !!p);
}

// Als zin, voor de pagina Weer: "UV 4, smeer je in. Je plek ligt op 1.240 m."
export function outdoorSunSentence(input: OutdoorSunInput): string | undefined {
  const parts = outdoorSunParts(input);
  if (parts.length === 0) return undefined;
  return parts.map((p) => `${p.charAt(0).toUpperCase()}${p.slice(1)}.`).join(' ');
}

// ASCEND: wat een wandeltraining van een lus vraagt, en hoe lang een lus duurt
// (docs/visie/Ontwerp routes wandelen en rugzak.md, hoofdstuk 2 en 3).
//
// Een wandeling is een duur, geen afstand. De tijd van een lus volgt de wandelnorm (DIN 33466,
// goalRoute.ts#estimatedHikingMinutes): 4 km per uur vlak, 300 m per uur omhoog en 500 omlaag; de
// grootste van de vlakke tijd en de klimtijd, plus de helft van de kleinste. Met genoeg eigen klimmen
// (climbPace.ts, zes klimmen uit drie tochten) rekent het met jouw meters per uur omhoog en omlaag;
// vlak blijft 4 km per uur, net als in climbPace.ts#ownHikingBand.
//
// De rugzak verandert de lus niet, alleen de tijd, en alleen op je eigen klimtempo met een bekend gewicht
// op je klimmen en een bekend lichaamsgewicht: trager naar verhouding van lichaam plus rugzak, nooit
// sneller dan gemeten. Op de norm komt er geen opslag bij; het onderzoek noemt 10 tot 20 procent bij
// 14 kg uitdrukkelijk een aanname.
//
// Het doel: de duur is leidend (advies, later instelbaar). De hoogtemeters gaan mee tot klimmen en dalen
// samen twee derde van de duur vullen; dat is een eigen aanname, tegen lussen zonder vlak stuk. De afstand
// is de norm omgekeerd: de duur min de helft van de klimtijd, maal de vlakke snelheid.
//
// Puur: geen React, geen IndexedDB. Plant niets en verandert geen ladder.

import { NORM_DOWN_MPH, NORM_UP_MPH, type ClimbPace, type ClimbPaceState, type HikeDay, type PackOptions } from './climbPace';
import type { WalkRates } from '../models/route';

// Vlak op de norm, ook op je eigen tempo (climbPace.ts rekent vlak ook met 4 km per uur).
export const WALK_FLAT_KMH = 4;
// Klimmen en dalen samen hoogstens dit deel van de duur (eigen aanname, ontwerp hoofdstuk 2).
export const MAX_CLIMB_SHARE = 2 / 3;
// De hoogtemeters die passen, naar beneden op 5 m: nooit boven wat in de duur past.
const ASCENT_STEP_M = 5;
// De afstand op een halve kilometer, zoals bij een looptraining (routeTarget.ts).
const DISTANCE_STEP_KM = 0.5;

// Wandeltempo voor routes (ontwerp hoofdstuk 4, instelling in stap 5): je eigen klimtempo als het er is
// (advies), of altijd de wandelnorm.
export type WalkPaceChoice = 'own' | 'norm';
export const resolveWalkPace = (raw: unknown): WalkPaceChoice => (raw === 'norm' ? 'norm' : 'own');

// Als duur en hoogtemeters botsen (vraag 1 aan de eigenaar, instelling in stap 5): duur eerst (advies),
// of hoogtemeters eerst. Iets onbekends is het advies.
export type WalkClashChoice = 'duration' | 'ascent';
export const resolveWalkClash = (raw: unknown): WalkClashChoice => (raw === 'ascent' ? 'ascent' : 'duration');

export type { WalkRates } from '../models/route';

export const NORM_WALK_RATES: Readonly<WalkRates> = { flatKmh: WALK_FLAT_KMH, upMph: NORM_UP_MPH, downMph: NORM_DOWN_MPH, basis: 'norm' };

const finitePositive = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;
// Een getal dat geen getal is, of negatief, telt als nul: nooit NaN in een tijd of een afstand.
const nonNegative = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0);

// Hoeveel trager met deze rugzak dan op je klimmen: 1 of meer, nooit sneller dan gemeten. Dezelfde regel
// als climbPace.ts#packFactor (daar niet uitgevoerd); hikeTarget.test.ts houdt de twee gelijk.
function packSlowdown(pace: ClimbPace, options: PackOptions): number | undefined {
  const { packKg, bodyKg } = options;
  if (!finitePositive(packKg) || !finitePositive(bodyKg) || pace.packKg === undefined || !(pace.packKg >= 0)) return undefined;
  return Math.max(1, (bodyKg + packKg) / (bodyKg + pace.packKg));
}

// Het tempo waarmee een lus gerekend wordt: je eigen klimtempo als er genoeg klimmen zijn en de keuze
// het toelaat, anders de wandelnorm zonder rugzak.
export function walkRates(state: ClimbPaceState | undefined, options: PackOptions & { pace?: unknown } = {}): WalkRates {
  if (resolveWalkPace(options.pace) === 'norm' || state?.state !== 'enough') return { ...NORM_WALK_RATES };
  const pace = state.pace;
  const factor = packSlowdown(pace, options);
  const f = factor ?? 1;
  const upMph = pace.upMph / f;
  const downMph = (finitePositive(pace.downMph) ? pace.downMph : NORM_DOWN_MPH) / f;
  if (!finitePositive(upMph) || !finitePositive(downMph)) return { ...NORM_WALK_RATES };
  return { flatKmh: WALK_FLAT_KMH, upMph, downMph, basis: 'own', ...(factor !== undefined ? { packKg: options.packKg } : {}) };
}

const usable = (rates: WalkRates | undefined): WalkRates =>
  rates && finitePositive(rates.flatKmh) && finitePositive(rates.upMph) && finitePositive(rates.downMph) ? rates : NORM_WALK_RATES;

// De tijd van een lus in minuten, op zijn afstand, stijging en daling, zonder pauzes. Dezelfde som als
// climbPace.ts#dinHours; op de norm dezelfde minuten als goalRoute.ts#estimatedHikingMinutes (die rondt
// af op 5 minuten, dit niet).
export function hikeMinutes(day: HikeDay, rates: WalkRates = NORM_WALK_RATES): number {
  const r = usable(rates);
  const horizontal = nonNegative(day.km) / r.flatKmh;
  const vertical = nonNegative(day.up) / r.upMph + nonNegative(day.down) / r.downMph;
  return (Math.max(horizontal, vertical) + Math.min(horizontal, vertical) / 2) * 60;
}

export interface WalkTarget {
  // De duur van de training.
  minutes: number;
  // De afstand van de lus, op een halve kilometer.
  distanceKm: number;
  // De hoogtemeters waar de lus op mikt (op en weer af: een lus eindigt waar hij begon).
  ascentM: number;
  // Wat de training vraagt; 0 zonder gevraagde hoogtemeters.
  askedAscentM: number;
  // De meeste hoogtemeters die in de duur passen (twee derde van de tijd klimmen en dalen).
  maxAscentM: number;
  // Past wat de training vraagt in de duur?
  fits: boolean;
  // De tijd van dit doel op dit tempo. Bij duur eerst gelijk aan de duur, op de afronding na; bij
  // hoogtemeters eerst langer als de klim niet in de duur past.
  loopMinutes: number;
}

// Van minuten en gevraagde hoogtemeters naar een afstand en de hoogtemeters die passen.
export function walkTarget(minutes: number, askedAscentM: number | undefined, rates: WalkRates = NORM_WALK_RATES, clash: unknown = 'duration'): WalkTarget {
  const r = usable(rates);
  const total = nonNegative(minutes);
  const asked = nonNegative(askedAscentM);
  const hours = total / 60;
  // Uren per meter op en weer af.
  const perMetre = 1 / r.upMph + 1 / r.downMph;
  const maxAscentM = Math.floor((hours * MAX_CLIMB_SHARE) / perMetre / ASCENT_STEP_M + 1e-9) * ASCENT_STEP_M;
  const fits = asked <= maxAscentM;
  const ascentFirst = resolveWalkClash(clash) === 'ascent';
  const ascentM = fits || ascentFirst ? asked : maxAscentM;
  const vertical = ascentM * perMetre;
  // Vlak is de grootste (tot twee derde klimmen): duur = vlak + klim/2. Is de klim de grootste (alleen bij
  // hoogtemeters eerst): duur = klim + vlak/2. Past de klim zelfs niet in de hele duur, dan geen vlak.
  const flatHours = vertical <= hours * MAX_CLIMB_SHARE ? hours - vertical / 2 : vertical <= hours ? 2 * (hours - vertical) : 0;
  const distanceKm = Math.round((Math.max(0, flatHours) * r.flatKmh) / DISTANCE_STEP_KM) * DISTANCE_STEP_KM;
  const loopMinutes = hikeMinutes({ km: distanceKm, up: ascentM, down: ascentM }, r);
  return { minutes: total, distanceKm, ascentM, askedAscentM: asked, maxAscentM, fits, loopMinutes };
}

// "45 minuten", "3 uur", "3 uur 5": een tijd zoals de zinnen van een wandeling hem zeggen, op 5 minuten.
// Een tijd die geen getal is wordt nul, nooit NaN.
export function walkTimeText(minutes: number): string {
  const m = Math.round(nonNegative(minutes) / 5) * 5;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (h === 0) return `${m} minuten`;
  return rest === 0 ? `${h} uur` : `${h} uur ${rest}`;
}

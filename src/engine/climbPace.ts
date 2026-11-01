// ASCEND: je eigen klimtempo met rugzak, uit je bergtochten en wandelingen met hoogtemeters
// (docs/onderzoek/Kansen met gegevens.md, kans A; docs/beslissingen/2026-11-01-kansen-middelgroot.md).
//
// Wat telt: de klimstukken en dalingen uit het profiel van een wandeling of tocht buiten
// (engine/runMetrics.ts#climbsOf en #descentsOf: minstens 50 meter, 4 minuten en 4 procent, en
// alleen als de hoogte van het horloge klopt met die van de bron). Geen hardlopen, geen
// loopband, het laatste jaar tot en met vandaag. Per stuk de meters per uur, bewegend.
//
// De drempel: zes klimmen uit minstens drie verschillende tochten. Zes is wat de trend
// Bergop en bergaf ook vraagt (runTrends.ts); drie tochten zodat één dag met een goed of slecht
// gevoel het getal niet maakt. In Nederland zijn echte klimmen schaars, dus dit komt vaak pas in
// de bergen; tot dan zegt ASCEND hoeveel er al zijn.
//
// Het getal is de mediaan, met het middelste deel (van een kwart tot driekwart) als band. Een
// etappe op je eigen tempo rekent zoals de wandelnorm (DIN 33466, goalRoute.ts#estimatedHikingMinutes)
// met 4 km per uur vlak, maar met jouw meters per uur omhoog en omlaag in plaats van 300 en 500.
// Met een zwaardere rugzak dan op je klimmen gaat het trager in verhouding tot je totale massa
// (lichaam plus rugzak, Looney e.a. 2021, matig bewijs); met een lichtere nooit sneller dan gemeten.
// Altijd een band van minstens een uur, in halve uren, zonder pauzes, en vermoeidheid na een paar
// dagen lopen valt erbuiten. Dit is een tijd, geen percentage: "Klaar voor je doel" blijft het
// ene voortgangsgetal (docs/architectuur/doelen.md).
//
// Puur: geen React, geen IndexedDB.

import type { SessionLog } from '../models/training';
import { climbsOf, descentsOf, isUnavailable } from './runMetrics';
import { isIndoorLog, isWalkOrTripLog } from './sports';
import { addDays, formatHoursMinutesNL } from '../utils/dates';
import { formatNumberNL } from '../utils/number';
import { estimatedHikingMinutes } from './goalRoute';

export const CLIMB_PACE_MIN = { climbs: 6, trips: 3 };
export const CLIMB_WINDOW_DAYS = 365;
// Zonder eigen dalingen geldt de norm omlaag; met drie of meer je eigen tempo.
export const DESCENT_MIN = 3;
// De norm (DIN 33466).
export const NORM_FLAT_KMH = 4;
export const NORM_UP_MPH = 300;
export const NORM_DOWN_MPH = 500;
const BAND_STEP = 30;
const BAND_MIN = 60;

export interface ClimbPace {
  climbs: number;
  trips: number;
  // Meters per uur omhoog: de mediaan, en het trage en snelle eind van het middelste deel.
  upMph: number;
  upSlow: number;
  upFast: number;
  descents: number;
  // Alleen met minstens DESCENT_MIN dalingen.
  downMph?: number;
  downSlow?: number;
  downFast?: number;
  // Het gemiddelde rugzakgewicht op je klimmen, als dat bij minstens de helft bekend is.
  packKg?: number;
  // De helling van de klimmen, afgerond op hele procenten.
  gradeLow: number;
  gradeHigh: number;
  lastDate: string;
}

export type ClimbPaceState =
  | { state: 'enough'; pace: ClimbPace }
  | { state: 'notYet'; climbs: number; trips: number };

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 1) return sorted[0];
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

const round10 = (v: number) => Math.round(v / 10) * 10;

// Undefined zonder een enkele klim: dan is er niets te zeggen.
export function climbPace(logs: readonly SessionLog[], today: string): ClimbPaceState | undefined {
  const since = addDays(today, -CLIMB_WINDOW_DAYS);
  const ups: { mph: number; grade: number; pack?: number; date: string; logId: string }[] = [];
  const downs: number[] = [];
  for (const l of logs) {
    if (l.completedDate > today || l.completedDate < since) continue;
    if (!isWalkOrTripLog(l) || isIndoorLog(l)) continue;
    const pack = l.outdoorData?.backpackWeightKg;
    const c = climbsOf(l.detail);
    if (!isUnavailable(c)) for (const x of c) ups.push({ mph: x.metresPerHour, grade: x.gradientPct, pack: pack && pack > 0 ? pack : undefined, date: l.completedDate, logId: l.id });
    const d = descentsOf(l.detail);
    if (!isUnavailable(d)) for (const x of d) downs.push(x.metresPerHour);
  }
  if (ups.length === 0) return undefined;
  const trips = new Set(ups.map((u) => u.logId)).size;
  if (ups.length < CLIMB_PACE_MIN.climbs || trips < CLIMB_PACE_MIN.trips) return { state: 'notYet', climbs: ups.length, trips };
  const up = ups.map((u) => u.mph).sort((a, b) => a - b);
  const down = [...downs].sort((a, b) => a - b);
  const packs = ups.map((u) => u.pack).filter((p): p is number => p !== undefined);
  const grades = ups.map((u) => u.grade);
  const pace: ClimbPace = {
    climbs: ups.length,
    trips,
    upMph: round10(quantile(up, 0.5)),
    upSlow: round10(quantile(up, 0.25)),
    upFast: round10(quantile(up, 0.75)),
    descents: down.length,
    ...(down.length >= DESCENT_MIN ? { downMph: round10(quantile(down, 0.5)), downSlow: round10(quantile(down, 0.25)), downFast: round10(quantile(down, 0.75)) } : {}),
    ...(packs.length * 2 >= ups.length ? { packKg: Math.round((packs.reduce((a, b) => a + b, 0) / packs.length) * 10) / 10 } : {}),
    gradeLow: Math.round(Math.min(...grades)),
    gradeHigh: Math.round(Math.max(...grades)),
    lastDate: ups.map((u) => u.date).sort().at(-1)!,
  };
  return { state: 'enough', pace };
}

export interface HikeDay {
  km: number;
  up: number;
  down: number;
}

export interface PackOptions {
  // Het rugzakgewicht van de dag of het doel, en je lichaamsgewicht (bodyWeight.ts#currentBodyKg).
  packKg?: number;
  bodyKg?: number;
}

// Hoeveel trager met deze rugzak dan op je klimmen: 1 of meer, nooit sneller dan gemeten.
function packFactor(pace: ClimbPace, options: PackOptions): number {
  const { packKg, bodyKg } = options;
  if (!packKg || !bodyKg || bodyKg <= 0) return 1;
  const measured = pace.packKg ?? 0;
  return Math.max(1, (bodyKg + packKg) / (bodyKg + measured));
}

function dinHours(day: HikeDay, upMph: number, downMph: number): number {
  const horizontal = day.km / NORM_FLAT_KMH;
  const vertical = day.up / upMph + day.down / downMph;
  return Math.max(horizontal, vertical) + Math.min(horizontal, vertical) / 2;
}

export interface HikingBand {
  low: number;
  high: number;
  // Het midden, op 5 minuten.
  mid: number;
}

// Een dag op je eigen tempo, in minuten: een band van minstens een uur in halve uren.
export function ownHikingBand(pace: ClimbPace, day: HikeDay, options: PackOptions = {}): HikingBand {
  const f = packFactor(pace, options);
  const down = (v: number | undefined) => v ?? NORM_DOWN_MPH;
  const mid = dinHours(day, pace.upMph / f, down(pace.downMph) / f) * 60;
  const fast = dinHours(day, pace.upFast / f, down(pace.downFast) / f) * 60;
  const slow = dinHours(day, pace.upSlow / f, down(pace.downSlow) / f) * 60;
  let low = Math.floor(fast / BAND_STEP) * BAND_STEP;
  let high = Math.ceil(slow / BAND_STEP) * BAND_STEP;
  if (high - low < BAND_MIN) {
    low = Math.max(BAND_STEP, Math.round((mid - BAND_MIN / 2) / BAND_STEP) * BAND_STEP);
    high = low + BAND_MIN;
  }
  return { low, high, mid: Math.round(mid / 5) * 5 };
}

export type StageTimeEstimate =
  | { kind: 'own'; band: HikingBand; norm: number }
  | { kind: 'norm'; minutes: number };

// De schatting van een etappe: op je eigen tempo als er genoeg klimmen zijn en de instelling
// "Etappetijd op je eigen tempo" aan staat, anders de oude schatting (de wandelnorm).
export function stageTimeEstimate(state: ClimbPaceState | undefined, day: HikeDay, options: PackOptions & { on?: boolean } = {}): StageTimeEstimate {
  const norm = estimatedHikingMinutes(day.km, day.up, day.down);
  if (options.on === false || state?.state !== 'enough') return { kind: 'norm', minutes: norm };
  return { kind: 'own', band: ownHikingBand(state.pace, day, options), norm };
}

// "6,5 tot 7,5 uur".
export function hoursBandText(band: Pick<HikingBand, 'low' | 'high'>): string {
  return `${formatNumberNL(band.low / 60, 1)} tot ${formatNumberNL(band.high / 60, 1)} uur`;
}

// --- de woorden ---------------------------------------------------------------------------------

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

// Waar het getal op rust: "Uit 6 klimmen in 3 tochten van het laatste jaar, op hellingen van 9
// tot 11 procent, met gemiddeld 9 kg rugzak."
export function climbPaceBasisLine(pace: ClimbPace): string {
  const grade = pace.gradeLow === pace.gradeHigh ? `op hellingen van ongeveer ${pace.gradeLow} procent` : `op hellingen van ${pace.gradeLow} tot ${pace.gradeHigh} procent`;
  const pack = pace.packKg ? `, met gemiddeld ${formatNumberNL(pace.packKg, 1)} kg rugzak` : ', zonder bekend rugzakgewicht';
  return `Uit ${plural(pace.climbs, 'klim', 'klimmen')} in ${plural(pace.trips, 'tocht', 'tochten')} van het laatste jaar, ${grade}${pack}.`;
}

// Bij een etappe: "Op je eigen tempo 6,5 tot 7,5 uur lopen, zonder pauzes." Undefined bij de oude
// schatting: dan blijft de looptijd van de site staan.
export function stageOwnLine(estimate: StageTimeEstimate): string | undefined {
  return estimate.kind === 'own' ? `Op je eigen tempo ${hoursBandText(estimate.band)} lopen, zonder pauzes.` : undefined;
}

// Bij een gewone dag van je hoofddoel, op Je stand. Undefined bij de oude schatting.
export function goalDayOwnLine(estimate: StageTimeEstimate, day: HikeDay): string | undefined {
  if (estimate.kind !== 'own') return undefined;
  const route = `${formatNumberNL(day.km, 1)} km met ${formatNumberNL(day.up, 0)} m omhoog en ${formatNumberNL(day.down, 0)} m omlaag`;
  return `Een gewone dag van je hoofddoel, ${route}, is voor jou dan ${hoursBandText(estimate.band)} lopen. De wandelnorm zegt ${formatHoursMinutesNL(estimate.norm)}.`;
}

// Tot er genoeg zijn: hoeveel er nodig zijn en hoeveel er al zijn.
export function climbPaceWaitLine(state: Extract<ClimbPaceState, { state: 'notYet' }>): string {
  return `Je eigen klimtempo zie je na ${CLIMB_PACE_MIN.climbs} klimmen van minstens 50 meter uit ${CLIMB_PACE_MIN.trips} tochten. Nu zijn het er ${state.climbs} uit ${plural(state.trips, 'tocht', 'tochten')}.`;
}

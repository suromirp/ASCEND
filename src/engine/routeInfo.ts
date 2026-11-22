// ASCEND: wat er bij de gekozen lus staat zonder dat er iets de deur uit gaat: terug voor het donker
// (I-115), het hoogteprofiel (I-116), de ondergrond (I-117) en waar je kunt afhaken (I-118). Alles komt uit
// de lus zelf (punten, hoogtes, de ondergrond die BRouter per stuk meegaf) en uit de zon, die ASCEND zelf
// uitrekent (engine/sun.ts). Pure: geen React, geen netwerk, bewaart niets en plant niets.
// Besluit: docs/beslissingen/2026-11-22-route-info.md.

import type { RoutePoint, RouteProposal } from '../models/route';
import { formatNumberNL } from '../utils/number';
import { isNearlyFlat } from './elevation';
import { cumulative, metersBetween, repeatedShare } from './routeGeometry';
import { sunDay } from './sun';

const pad = (n: number) => String(n).padStart(2, '0');
const clock = (minute: number) => {
  const m = ((Math.round(minute) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
};
const km1 = (m: number) => `${formatNumberNL(Math.round(m / 100) / 10, 1)} km`;

// ── Terug voor het donker ───────────────────────────────────────────────

// De regel staat er vanaf een uur voor zonsondergang.
export const DARK_MARGIN_MIN = 60;

// De duur van de lus in minuten: een wandeltraining rekent met zijn eigen tempo (engine/routePlanner.ts#loopMinutes,
// dat de aanroeper meegeeft), een looptraining met het tempo waarop de afstand is bepaald (routeTarget.ts#runPaceSecKm).
// Zonder tempo weten we het niet: undefined.
export function loopDurationMin(p: Pick<RouteProposal, 'distanceM'>, paceSecKm: number | undefined, walkMinutes?: number): number | undefined {
  if (walkMinutes !== undefined) return walkMinutes;
  const pace = paceSecKm;
  return pace !== undefined && pace > 0 ? ((p.distanceM / 1000) * pace) / 60 : undefined;
}

export interface BackLineInput {
  // De dag van de training en vandaag, als JJJJ-MM-DD. Alleen vandaag heeft een bekende start (nu).
  date: string;
  today: string;
  // Nu, in minuten na middernacht van de plaatselijke tijd.
  nowMin: number;
  durationMin: number | undefined;
  // De plek, afgerond zoals het startpunt dat de deur uit gaat.
  place: { lat: number; lon: number };
  utcOffsetMin: number;
  enabled: boolean;
}

// "Je bent rond 17:20 terug; de zon gaat om 16:45 onder." Alleen als je binnen een uur voor zonsondergang
// of later terug bent. Er is geen geplande starttijd in ASCEND: de start is nu, en alleen voor vandaag.
export function backLine(i: BackLineInput): string | undefined {
  if (!i.enabled || i.durationMin === undefined || !(i.durationMin > 0) || i.date !== i.today) return undefined;
  const day = sunDay(i.date, i.place.lat, i.place.lon, i.utcOffsetMin);
  if (typeof day === 'string' || day.sunset < day.sunrise) return undefined;
  // Voor zonsopgang gaat het over de ochtend: daar is de lamp van De avond ervoor voor.
  if (i.nowMin < day.sunrise) return undefined;
  const back = i.nowMin + i.durationMin;
  if (back < day.sunset - DARK_MARGIN_MIN) return undefined;
  const backAt = clock(Math.round(back / 5) * 5);
  const past = i.nowMin >= day.sunset || back >= day.sunset;
  return `Je bent rond ${backAt} terug; de zon ${past ? 'ging' : 'gaat'} om ${clock(day.sunset)} onder.`;
}

// ── Hoogteprofiel ───────────────────────────────────────────────────────

// Steiler dan dit (8 procent) is amber in het profiel.
export const STEEP_GRADE = 0.08;
export const PROFILE_WIDTH = 320;
export const PROFILE_HEIGHT = 64;
// Een profiel met minder verschil dan dit zou een vlakke lus overdrijven.
const MIN_RANGE_M = 30;
// Eén stuk tekent het profiel hooguit op deze lengte.
const SEGMENT_M = 100;

export interface ProfileSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  steep: boolean;
}

export type ElevationProfile =
  | { kind: 'flat'; line: string }
  | { kind: 'profile'; width: number; height: number; segments: ProfileSegment[]; lowM: number; highM: number; steepM: number; line: string };

export const FLAT_PROFILE_LINE = 'Vrijwel vlak, dus geen profiel.';

// De hoogte op afstand `at` langs de lijn, tussen de twee punten met hoogte eromheen.
function heightAt(dist: number[], ele: number[], at: number): number {
  let hi = dist.findIndex((d) => d >= at);
  if (hi < 0) hi = dist.length - 1;
  if (hi === 0) return ele[0];
  const lo = hi - 1;
  const span = dist[hi] - dist[lo];
  return span > 0 ? ele[lo] + ((ele[hi] - ele[lo]) * (at - dist[lo])) / span : ele[hi];
}

// Het profiel uit de hoogtes die de lus al heeft, zonder iets op te halen. Zonder hoogtes: undefined. Een
// vlakke lus krijgt een regel in plaats van een plat profiel. De hoogte wordt over drie stappen gemiddeld,
// zodat een meetruis van een meter geen steil stuk maakt.
export function elevationProfile(p: Pick<RouteProposal, 'points' | 'ascentM'>): ElevationProfile | undefined {
  const withEle = p.points.map((pt, i) => ({ pt, i })).filter((x) => x.pt.ele !== undefined);
  if (withEle.length < 2 || p.points.length < 2) return undefined;
  const cum = cumulative(p.points as RoutePoint[]);
  const total = cum[cum.length - 1];
  if (!(total > 0)) return undefined;
  if (isNearlyFlat(p.ascentM)) return { kind: 'flat', line: FLAT_PROFILE_LINE };
  const dist = withEle.map((x) => cum[x.i]);
  const ele = withEle.map((x) => x.pt.ele as number);
  const n = Math.min(60, Math.max(12, Math.round(total / SEGMENT_M)));
  const raw = Array.from({ length: n + 1 }, (_, k) => heightAt(dist, ele, (total * k) / n));
  const smooth = raw.map((h, k) => (k === 0 || k === n ? h : (raw[k - 1] + h + raw[k + 1]) / 3));
  const lowM = Math.min(...smooth);
  const highM = Math.max(...smooth);
  const range = Math.max(highM - lowM, MIN_RANGE_M);
  const step = total / n;
  const x = (k: number) => (k / n) * PROFILE_WIDTH;
  // Een rand boven en onder, zodat de lijn niet tegen de rand van het vak ligt.
  const edge = 4;
  const y = (h: number) => PROFILE_HEIGHT - edge - ((h - lowM) / range) * (PROFILE_HEIGHT - 2 * edge);
  const segments: ProfileSegment[] = [];
  let steepM = 0;
  for (let k = 0; k < n; k++) {
    const steep = Math.abs(smooth[k + 1] - smooth[k]) / step > STEEP_GRADE;
    if (steep) steepM += step;
    segments.push({ x1: x(k), y1: y(smooth[k]), x2: x(k + 1), y2: y(smooth[k + 1]), steep });
  }
  const steepNote = steepM >= SEGMENT_M ? ` Steiler dan 8 %: ${km1(steepM)}.` : '';
  const line = `Laagste punt ${formatNumberNL(Math.round(lowM), 0)} m, hoogste ${formatNumberNL(Math.round(highM), 0)} m.${steepNote}`;
  return { kind: 'profile', width: PROFILE_WIDTH, height: PROFILE_HEIGHT, segments, lowM, highM, steepM, line };
}

// ── Ondergrond ──────────────────────────────────────────────────────────

// Hoeveel van de lus de ondergrond bekend moet zijn, voor er een regel komt.
export const SURFACE_MIN_KNOWN = 0.8;

// "Ongeveer 65 % onverhard, 35 % verhard." Op 5 procent afgerond. Zegt de bron niets over de ondergrond
// (Valhalla, of te weinig stukken): undefined, geen regel.
export function surfaceLine(points: readonly RoutePoint[]): string | undefined {
  let paved = 0;
  let unpaved = 0;
  let all = 0;
  for (let i = 1; i < points.length; i++) {
    const d = metersBetween(points[i - 1], points[i]);
    all += d;
    const s = points[i].surface;
    if (s === 'paved') paved += d;
    else if (s === 'unpaved') unpaved += d;
  }
  const known = paved + unpaved;
  if (!(all > 0) || known / all < SURFACE_MIN_KNOWN) return undefined;
  const un = Math.round((unpaved / known) * 20) * 5;
  if (un <= 0) return 'Vrijwel alles verhard.';
  if (un >= 100) return 'Vrijwel alles onverhard.';
  return `Ongeveer ${un} % onverhard, ${100 - un} % verhard.`;
}

// ── Afhaken ─────────────────────────────────────────────────────────────

export const BAIL_FROM = 0.35;
export const BAIL_TO = 0.65;
// Een lus die grotendeels over hetzelfde pad terugkomt heeft geen afhaakpunt: je loopt al terug.
const BAIL_MAX_REPEATED = 0.5;
const BAIL_MIN_M = 150;

export interface BailPoint {
  point: RoutePoint;
  // Hoe ver langs de lus, en hemelsbreed naar de start.
  atM: number;
  backM: number;
}

// Het punt tussen 35 en 65 procent van de lus dat hemelsbreed het dichtst bij de start ligt. Alleen rekenwerk.
export function bailPoint(p: Pick<RouteProposal, 'points'> & { repeatedShare?: number }): BailPoint | undefined {
  const pts = p.points;
  if (pts.length < 4 || (p.repeatedShare ?? repeatedShare(pts)) > BAIL_MAX_REPEATED) return undefined;
  const cum = cumulative(pts as RoutePoint[]);
  const total = cum[cum.length - 1];
  if (!(total > 0)) return undefined;
  let best: BailPoint | undefined;
  for (let i = 0; i < pts.length; i++) {
    const share = cum[i] / total;
    if (share < BAIL_FROM || share > BAIL_TO) continue;
    const backM = metersBetween(pts[0], pts[i]);
    if (!best || backM < best.backM) best = { point: pts[i], atM: cum[i], backM };
  }
  return best && best.backM >= BAIL_MIN_M ? best : undefined;
}

// "Onderweg kun je hier afhaken: 1,2 km hemelsbreed terug." Hemelsbreed, want de weg terug kan langer zijn.
export function bailLine(b: BailPoint | undefined): string | undefined {
  return b ? `Onderweg kun je hier afhaken: ${km1(b.backM)} hemelsbreed terug.` : undefined;
}

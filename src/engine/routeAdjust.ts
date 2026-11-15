// ASCEND: een voorgestelde lus bijsturen, het pure deel (besluit 2026-11-14-route-kaart-vervolg.md).
// Andere kant op (dezelfde punten achterstevoren, geen nieuwe zoektocht), langer of korter (een nieuwe
// zoektocht met een andere afstand, nooit onder 1 km) en een stuk vermijden (een kleine cirkel die de
// routeplanner moet mijden). Daarnaast de lus in stukken met hun afstand en hoogtemeters. Geen React,
// geen netwerk; components/useRouteSearch.ts houdt de stand, components/RouteAdjust.tsx tekent.
// Bijsturen plant niets en bewaart niets: het geldt voor deze lus zolang het blad open is.

import type { AvoidArea, RoutePoint, RouteProposal, RouteStyle, RouteTarget } from '../models/route';
import { hysteresisLine, modelThresholdM } from './elevation';
import { ascentOf, cumulative, metersBetween } from './routeGeometry';
import { formatNumberNL } from '../utils/number';

// Korter dan dit zoekt ASCEND geen lus: onder een kilometer is een lus geen training meer.
export const MIN_LOOP_KM = 1;
// Langer gaat tot de helft erbij, en bij een korte training tot 2 km erbij.
export const MAX_LONGER_SHARE = 0.5;
export const MIN_LONGER_KM = 2;
// Hoogstens zoveel stukken vermijden: elk stuk maakt de vraag aan de routeplanner zwaarder.
export const MAX_AVOID = 3;
// De cirkel om het midden van een stuk die de routeplanner mijdt: een kwart van het stuk, tussen deze grenzen.
export const AVOID_MIN_M = 60;
export const AVOID_MAX_M = 200;
// Zo dicht bij de start kan een stuk niet weg: de lus moet daar beginnen.
export const AVOID_START_M = 100;

const kmText = (km: number) => `${formatNumberNL(Math.round(km * 10) / 10, 1)} km`;

// De stap van Langer en Korter: een halve kilometer bij een korte training, anders een hele.
export const adjustStepKm = (trainingKm: number): number => (trainingKm < 5 ? 0.5 : 1);

// Hoe ver Langer mag gaan.
export const maxLoopKm = (trainingKm: number): number => Math.round(Math.max(trainingKm * (1 + MAX_LONGER_SHARE), trainingKm + MIN_LONGER_KM) * 10) / 10;

// Langer of Korter: de nieuwe afwijking van de afstand van de training, of de regel waarom het niet kan.
// Het getal is op 0,1 km, net als de afstand van een lus.
// Het doel waarmee gezocht wordt: het doel van de training, met Langer of Korter op de afstand. Alle andere
// velden gaan mee (de duur, de rugzak, wat de training aan hoogtemeters vraagt): de zinnen van de planner
// lezen ze (routePlanner.ts#askedAscent). Dit is het enige doel dat useRouteSearch aan findRoutes geeft.
export function searchTarget(training: RouteTarget, deltaKm: number): RouteTarget {
  if (!(deltaKm !== 0) || !Number.isFinite(deltaKm)) return training;
  return { ...training, distanceKm: Math.round((training.distanceKm + deltaKm) * 10) / 10 };
}

export function stepDistance(trainingKm: number, deltaKm: number, dir: 'longer' | 'shorter'): { ok: true; deltaKm: number } | { ok: false; line: string } {
  const step = adjustStepKm(trainingKm);
  const next = Math.round((deltaKm + (dir === 'longer' ? step : -step)) * 10) / 10;
  const total = Math.round((trainingKm + next) * 10) / 10;
  if (dir === 'shorter' && !(total >= MIN_LOOP_KM)) return { ok: false, line: `Korter dan ${formatNumberNL(MIN_LOOP_KM, 0)} km: geen lus.` };
  if (dir === 'longer' && !(total <= maxLoopKm(trainingKm))) return { ok: false, line: `Langer dan ${kmText(maxLoopKm(trainingKm))}: niet bij deze training.` };
  return { ok: true, deltaKm: next };
}

// Andere kant op: dezelfde punten achterstevoren. Afstand blijft gelijk; de hoogtemeters tellen opnieuw,
// met dezelfde teller (routeGeometry.ts#ascentOf), want omhoog wordt omlaag. Simpel gaat heen en terug
// over hetzelfde pad: daar is de andere kant op dezelfde lus, dus geen knop.
export const canReverse = (p: Pick<RouteProposal, 'style'>): boolean => p.style === 'adventure';

export function reverseProposal(p: RouteProposal): RouteProposal {
  const points = [...p.points].reverse();
  const threshold = modelThresholdM(points.map((x) => x.ele));
  return { ...p, points, ascentM: ascentOf(points, threshold) };
}

export interface LoopPiece {
  index: number;
  // Waar het stuk begint en eindigt, in meters vanaf de start.
  fromM: number;
  toM: number;
  distanceM: number;
  // Opgeteld met de hysterese van engine/elevation.ts over de hele lus, verdeeld over de stukken: de stukken
  // samen zijn de klim van de hele lijn. Undefined als dit stuk geen enkele hoogte kent.
  ascentM: number | undefined;
  points: RoutePoint[];
}

// Hoe lang een stuk is: een kilometer tot 10 km, twee tot 20 km, daarboven zo dat er tien stukken zijn.
export function pieceLengthM(totalM: number): number {
  if (totalM <= 10_000) return 1000;
  if (totalM <= 20_000) return 2000;
  return Math.ceil(totalM / 10 / 1000) * 1000;
}

// Een punt op `meters` langs de lijn, met de hoogte ertussen als beide kanten hem kennen.
function pointAt(points: RoutePoint[], cum: number[], meters: number): RoutePoint {
  const i = Math.max(1, cum.findIndex((c) => c >= meters));
  const span = cum[i] - cum[i - 1];
  const t = span > 0 ? (meters - cum[i - 1]) / span : 0;
  const a = points[i - 1];
  const b = points[i];
  const p: RoutePoint = { lat: a.lat + (b.lat - a.lat) * t, lon: a.lon + (b.lon - a.lon) * t };
  if (a.ele !== undefined && b.ele !== undefined) p.ele = a.ele + (b.ele - a.ele) * t;
  return p;
}

// De lus in stukken. Een laatste stuk korter dan 30 procent van een stuk gaat bij het vorige.
export function loopPieces(points: RoutePoint[]): LoopPiece[] {
  if (points.length < 2) return [];
  const cum = cumulative(points);
  const total = cum[cum.length - 1];
  if (!(total > 0)) return [];
  const len = pieceLengthM(total);
  const edges: number[] = [0];
  for (let at = len; at < total; at += len) edges.push(at);
  if (edges.length > 1 && total - edges[edges.length - 1] < len * 0.3) edges.pop();
  edges.push(total);
  const ele = points.map((p) => p.ele);
  const known = ele.some((e) => e !== undefined && Number.isFinite(e));
  const line = hysteresisLine(ele, modelThresholdM(ele));
  const pieces: LoopPiece[] = [];
  for (let k = 0; k + 1 < edges.length; k++) {
    const fromM = edges[k];
    const toM = edges[k + 1];
    // Een stap van punt i-1 naar i hoort bij het stuk waarin hij begint.
    let up = 0;
    let anyEle = false;
    for (let i = 1; i < points.length; i++) {
      if (cum[i - 1] < fromM || cum[i - 1] >= toM) continue;
      const d = line[i] - line[i - 1];
      if (d > 0) up += d;
      if (ele[i] !== undefined && ele[i - 1] !== undefined) anyEle = true;
    }
    const inner = points.filter((_, i) => cum[i] > fromM && cum[i] < toM);
    pieces.push({
      index: k,
      fromM,
      toM,
      distanceM: toM - fromM,
      ascentM: known && anyEle ? up : undefined,
      points: [pointAt(points, cum, fromM), ...inner, pointAt(points, cum, toM)],
    });
  }
  return pieces;
}

// Een stuk in één regel: afstand op 0,1 km en hoogtemeters op hele meters (de hysterese van de lus).
export function pieceLine(p: LoopPiece): string {
  const from = formatNumberNL(Math.round(p.fromM / 100) / 10, 1);
  const to = formatNumberNL(Math.round(p.toM / 100) / 10, 1);
  const up = p.ascentM === undefined ? 'hoogte onbekend' : `${formatNumberNL(Math.round(p.ascentM), 0)} m omhoog`;
  return `Km ${from} tot ${to} · ${kmText(p.distanceM / 1000)} · ${up}`;
}

// Afstand in meters van punt p tot het stuk a-b, plat gerekend rond p (op deze schaal klopt dat op een meter).
function toSegmentM(p: RoutePoint, a: RoutePoint, b: RoutePoint): number {
  const k = Math.cos((p.lat * Math.PI) / 180);
  const ax = (a.lon - p.lon) * k, ay = a.lat - p.lat;
  const bx = (b.lon - p.lon) * k, by = b.lat - p.lat;
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 > 0 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2)) : 0;
  const x = ax + dx * t, y = ay + dy * t;
  return Math.sqrt(x * x + y * y) * 111_195;
}

// Ligt een lijn in de cirkel? Ook een lang recht stuk dat er dwars doorheen gaat telt.
export function crossesArea(points: readonly RoutePoint[], area: AvoidArea): boolean {
  if (points.length === 1) return metersBetween(points[0], area) <= area.radiusM;
  for (let i = 1; i < points.length; i++) {
    if (toSegmentM(area, points[i - 1], points[i]) <= area.radiusM) return true;
  }
  return false;
}

export const crossesAny = (points: readonly RoutePoint[], areas: readonly AvoidArea[] | undefined): boolean => (areas ?? []).some((a) => crossesArea(points, a));
export const insideAny = (p: RoutePoint, areas: readonly AvoidArea[] | undefined): boolean => (areas ?? []).some((a) => metersBetween(p, a) <= a.radiusM);

// Vermijd dit stuk: een cirkel om het midden van het stuk, of de regel waarom het niet kan.
export function avoidPiece(piece: LoopPiece, start: RoutePoint, avoided: readonly AvoidArea[]): { ok: true; area: AvoidArea } | { ok: false; line: string } {
  if (avoided.length >= MAX_AVOID) return { ok: false, line: `Hoogstens ${MAX_AVOID} stukken vermijden. Kies Terug naar het voorstel om alles terug te zetten.` };
  const cum = cumulative(piece.points);
  const mid = pointAt(piece.points, cum, cum[cum.length - 1] / 2);
  const radiusM = Math.round(Math.max(AVOID_MIN_M, Math.min(AVOID_MAX_M, piece.distanceM / 4)));
  if (metersBetween(mid, start) <= radiusM + AVOID_START_M) return { ok: false, line: 'Dit stuk ligt bij je start en kan niet weg.' };
  return { ok: true, area: { lat: mid.lat, lon: mid.lon, radiusM } };
}

export interface LoopAdjust {
  deltaKm: number;
  avoid: AvoidArea[];
  reversed: RouteStyle[];
}

export const NO_ADJUST: LoopAdjust = { deltaKm: 0, avoid: [], reversed: [] };
export const isAdjusted = (a: LoopAdjust): boolean => a.deltaKm !== 0 || a.avoid.length > 0 || a.reversed.length > 0;

// Wat er nu bijgestuurd is, in één regel; leeg als niets.
export function adjustSummary(a: LoopAdjust, trainingKm: number, style: RouteStyle | undefined): string {
  const parts: string[] = [];
  if (a.deltaKm !== 0) parts.push(`${a.deltaKm > 0 ? 'langer' : 'korter'}, gezocht op ${kmText(trainingKm + a.deltaKm)}`);
  if (a.avoid.length > 0) parts.push(a.avoid.length === 1 ? '1 stuk vermeden' : `${a.avoid.length} stukken vermeden`);
  if (style && a.reversed.includes(style)) parts.push('andere kant op');
  if (parts.length === 0) return '';
  const text = parts.join(', ');
  return `Bijgestuurd: ${text}.`;
}

export type AdjustAction = 'longer' | 'shorter' | 'avoid';

// De regel als bijsturen niet lukte; de lus blijft dan zoals hij was.
export function adjustFailLine(action: AdjustAction, kind: 'offline' | 'timeout' | 'failed'): string {
  if (kind === 'offline') return 'Zonder netwerk kan de lus niet bijgestuurd worden. De lus blijft zoals hij was.';
  if (kind === 'timeout') return 'De routeplanner antwoordde niet op tijd. De lus blijft zoals hij was.';
  if (action === 'avoid') return 'Om dit stuk ligt geen andere weg. De lus blijft zoals hij was.';
  return action === 'longer' ? 'Geen langere lus gevonden. De lus blijft zoals hij was.' : 'Geen kortere lus gevonden. De lus blijft zoals hij was.';
}

// Een lus die na bijsturen onder MIN_LOOP_KM uitkomt telt als mislukt: zo kort is geen lus.
export const tooTiny = (p: Pick<RouteProposal, 'distanceM'>): boolean => !(p.distanceM >= MIN_LOOP_KM * 1000);

// De sleutel van een stand om in de zoeksleutel te zetten.
export const adjustKey = (a: LoopAdjust): string => `${a.deltaKm}|${a.avoid.map((x) => `${x.lat.toFixed(5)},${x.lon.toFixed(5)},${x.radiusM}`).join(';')}`;

// Een bijsturing die klaar is met zoeken: blijft hij (de lus die je bijstuurde kwam er), of gaat alles
// terug naar wat ervoor gold, met de regel waarom. Zonder netwerk, te laat of geen lus: terug.
export function settleAdjust(
  action: AdjustAction,
  style: RouteStyle | undefined,
  search: { kind: 'offline' | 'timeout' } | { kind: 'plans'; plans: Record<RouteStyle, { ok: boolean }> },
): { keep: true } | { keep: false; line: string } {
  if (search.kind !== 'plans') return { keep: false, line: adjustFailLine(action, search.kind) };
  const fine = style ? search.plans[style].ok : search.plans.simple.ok || search.plans.adventure.ok;
  return fine ? { keep: true } : { keep: false, line: adjustFailLine(action, 'failed') };
}

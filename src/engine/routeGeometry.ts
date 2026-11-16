// ASCEND: meetkunde voor een voorgestelde lus: lengte, opgetelde hoogtemeters (engine/elevation.ts) en
// welk deel van een lus je twee keer loopt. Pure: geen React, geen IndexedDB, geen netwerk.
// Zie docs/beslissingen/2026-11-09-routeplanner.md en docs/onderzoek/Routeplanner voor een training.md.

import type { RoutePoint } from '../models/route';
import { ELEVATION_THRESHOLD_M, climbAndDescent, modelThresholdM } from './elevation';

// Onder deze stap telt een stijging niet mee: de hoogte uit een hoogtemodel van 30 m zit er in bos
// een paar meter naast, en die ruis telt anders op tot hoogtemeters die er niet zijn. De drempels
// per bron staan in engine/elevation.ts.
export const ASCENT_DEAD_BAND_M = ELEVATION_THRESHOLD_M.model30;

const RAD = Math.PI / 180;
const EARTH_M = 6_371_000;

// Hemelsbreed in meters, niet afgerond (anders telt de afronding op over honderden stukjes).
export function metersBetween(a: RoutePoint, b: RoutePoint): number {
  const dLat = (b.lat - a.lat) * RAD;
  const dLon = (b.lon - a.lon) * RAD;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function lineLength(points: RoutePoint[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += metersBetween(points[i - 1], points[i]);
  return total;
}

// De afstand vanaf het begin tot elk punt.
export function cumulative(points: RoutePoint[]): number[] {
  const out = [0];
  for (let i = 1; i < points.length; i++) out.push(out[i - 1] + metersBetween(points[i - 1], points[i]));
  return out;
}

// Opgetelde stijging in meters, met de teller van engine/elevation.ts: een klim telt zodra hij de
// drempel haalt, en dan van het echte dal tot de echte top. Zonder eigen drempel geldt die van een
// model van 30 m (5 m, in de bergen 10 m). Punten zonder hoogte doen niet mee.
export function ascentOf(points: readonly RoutePoint[], thresholdM?: number): number {
  const ele = points.map((p) => p.ele);
  return climbAndDescent(ele, thresholdM ?? modelThresholdM(ele)).ascentM;
}

// In de richting van `bearingDeg` (0 is noord, 90 is oost) op `meters` afstand.
export function offsetPoint(from: RoutePoint, bearingDeg: number, meters: number): RoutePoint {
  const d = meters / EARTH_M;
  const b = bearingDeg * RAD;
  const lat1 = from.lat * RAD;
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(b));
  const lon2 = from.lon * RAD + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
  return { lat: lat2 / RAD, lon: lon2 / RAD };
}

// Richting van a naar b in graden, 0 tot 360.
export function bearing(a: RoutePoint, b: RoutePoint): number {
  const y = Math.sin((b.lon - a.lon) * RAD) * Math.cos(b.lat * RAD);
  const x = Math.cos(a.lat * RAD) * Math.sin(b.lat * RAD) - Math.sin(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.cos((b.lon - a.lon) * RAD);
  return (Math.atan2(y, x) / RAD + 360) % 360;
}

const CELL_DEG = 0.0002; // ongeveer 22 m noord-zuid
const STEP_M = 20;
// Zo ver terug telt een punt nog als "net gelopen" en niet als een stuk dat je twee keer loopt.
const RECENT_M = 120;

// Welk deel van de lijn over een stuk gaat waar je eerder al liep (0 tot 1). De lijn wordt elke
// twintig meter bemonsterd; een monster telt als herhaling als in zijn vakje of een buurvakje een
// monster ligt van meer dan 120 m eerder.
export function repeatedShare(points: RoutePoint[]): number {
  if (points.length < 2) return 0;
  const cum = cumulative(points);
  const total = cum[cum.length - 1];
  if (total < STEP_M * 2) return 0;
  const seen = new Map<string, number>(); // vakje -> afstand van het eerste monster
  let repeated = 0;
  let samples = 0;
  let seg = 1;
  const lonCell = CELL_DEG / Math.max(0.2, Math.cos(points[0].lat * RAD));
  for (let d = 0; d <= total; d += STEP_M) {
    while (seg < points.length - 1 && cum[seg] < d) seg++;
    const span = cum[seg] - cum[seg - 1];
    const t = span > 0 ? (d - cum[seg - 1]) / span : 0;
    const lat = points[seg - 1].lat + (points[seg].lat - points[seg - 1].lat) * t;
    const lon = points[seg - 1].lon + (points[seg].lon - points[seg - 1].lon) * t;
    const cy = Math.floor(lat / CELL_DEG);
    const cx = Math.floor(lon / lonCell);
    let hit = false;
    for (let dy = -1; dy <= 1 && !hit; dy++) {
      for (let dx = -1; dx <= 1 && !hit; dx++) {
        const at = seen.get(`${cy + dy},${cx + dx}`);
        if (at !== undefined && d - at > RECENT_M) hit = true;
      }
    }
    if (hit) repeated++;
    const key = `${cy},${cx}`;
    if (!seen.has(key)) seen.set(key, d);
    samples++;
  }
  return samples === 0 ? 0 : repeated / samples;
}

// ---------- Doodlopende stukken ----------
// Een doodlopend stuk is een tak die je in en weer uit loopt: de lijn keert om en loopt hetzelfde pad
// terug, en geen ander deel van de route gaat voorbij dat keerpunt. Een heen-en-terug heeft er één, een
// Y met twee takken twee, een echte lus geen. Dezelfde top zes keer is één stuk. Pure meetkunde op de
// punten, zonder kaart (docs/beslissingen/2026-11-14-routes-vorm.md).

// Om de zoveel meter bemonsterd: een keerpunt ligt dan hoogstens een halve stap naast een monster.
const SPUR_STEP_M = 5;
// Een tak korter dan dit telt niet: de routeplanner maakt soms een paar meter heen en terug naar een pad.
export const SPUR_MIN_M = 80;
// Binnen deze afstand liggen heen en terug op hetzelfde pad (de lijn van de routeplanner, op een stap na).
const SPUR_SAME_M = 12;
// Rond een keerpunt: wat binnen deze straal ligt hoort bij het keerpunt.
const SPUR_NEAR_M = 25;
// Twee keerpunten dichter bij elkaar dan dit zijn hetzelfde (dezelfde top, steeds weer).
const SPUR_SAME_TIP_M = 40;

function resample(points: readonly RoutePoint[], stepM: number): { at: number[]; pts: RoutePoint[] } {
  const cum = cumulative(points as RoutePoint[]);
  const total = cum[cum.length - 1] ?? 0;
  const at: number[] = [];
  const pts: RoutePoint[] = [];
  let seg = 1;
  for (let d = 0; d <= total; d += stepM) {
    while (seg < points.length - 1 && cum[seg] < d) seg++;
    const span = cum[seg] - cum[seg - 1];
    const t = span > 0 ? (d - cum[seg - 1]) / span : 0;
    const a = points[seg - 1];
    const b = points[seg];
    at.push(d);
    pts.push({ lat: a.lat + (b.lat - a.lat) * t, lon: a.lon + (b.lon - a.lon) * t });
  }
  return { at, pts };
}

export interface DeadEnd {
  // Het keerpunt.
  tip: RoutePoint;
  // Waar langs de lijn (meters vanaf het begin) en hoe lang de tak is, bij de eerste keer dat je erin loopt.
  atM: number;
  lengthM: number;
}

// De doodlopende stukken van een lijn. Een keerpunt telt alleen als elke keer dat de lijn erlangs komt
// een keer omkeren is: een voet van een helling waar je ook langs naar huis loopt is geen tak.
// Het begin en het eind van de lijn zijn nooit een tak (daar sta je).
export function deadEnds(points: readonly RoutePoint[]): DeadEnd[] {
  if (points.length < 3) return [];
  const { at, pts } = resample(points, SPUR_STEP_M);
  const n = pts.length;
  const k = Math.ceil(SPUR_MIN_M / SPUR_STEP_M);
  const same = (i: number, j: number) => j >= 0 && j < n && metersBetween(pts[i], pts[j]) <= SPUR_SAME_M;
  // Hoe ver de lijn rond monster i over zichzelf terugloopt (in stappen).
  const foldAt = (i: number): number => {
    let s = 0;
    while (i - s - 1 >= 0 && i + s + 1 < n && (same(i - s - 1, i + s + 1) || same(i - s - 1, i + s + 2) || same(i - s - 1, i + s))) s++;
    return s;
  };
  // Kandidaten: monsters waar de lijn minstens SPUR_MIN_M terugloopt; een rij naast elkaar is één keerpunt.
  const folds: { i: number; s: number }[] = [];
  for (let i = k; i + k < n; i++) {
    if (!same(i - k, i + k) && !same(i - k, i + k + 1) && !same(i - k, i + k - 1)) continue;
    const s = foldAt(i);
    if (s < k) continue;
    const last = folds[folds.length - 1];
    if (last && i - last.i <= 2) {
      if (s > last.s) folds[folds.length - 1] = { i, s };
      else if (s === last.s) last.i = i; // midden van de rij: schuift mee
      continue;
    }
    folds.push({ i, s });
  }
  const tips: DeadEnd[] = [];
  for (const f of folds) {
    const tip = pts[f.i];
    if (tips.some((t) => metersBetween(t.tip, tip) <= SPUR_SAME_TIP_M)) continue;
    if (!onlyTurnsAt(pts, tip)) continue;
    // De telling loopt door de speling van een stap twee stappen te ver: die gaan eraf.
    tips.push({ tip, atM: at[f.i], lengthM: Math.max(0, f.s - 2) * SPUR_STEP_M });
  }
  return tips;
}

// Elke keer dat de lijn bij `tip` komt keert hij om: wat ervoor en erna komt ligt op hetzelfde pad. Een
// keer erdoorheen, of het begin of eind van de lijn bij het punt: geen doodlopend stuk.
function onlyTurnsAt(pts: RoutePoint[], tip: RoutePoint): boolean {
  const n = pts.length;
  let i = 0;
  while (i < n) {
    if (metersBetween(pts[i], tip) > SPUR_NEAR_M) {
      i++;
      continue;
    }
    const a = i;
    while (i < n && metersBetween(pts[i], tip) <= SPUR_NEAR_M) i++;
    const b = i - 1;
    if (a === 0 || b === n - 1) return false;
    if (metersBetween(pts[a - 1], pts[b + 1]) > 2 * SPUR_STEP_M) return false;
  }
  return true;
}

// Een lijn zonder de doodlopende stukken: het stuk heen en terug valt weg, de rest sluit aan. Voor een
// aanloop naar een helling, waar een tak alleen omweg is.
export function withoutDeadEnds(points: RoutePoint[]): RoutePoint[] {
  const ends = deadEnds(points);
  if (ends.length === 0) return points;
  const cum = cumulative(points);
  const cuts = ends.map((e) => [e.atM - e.lengthM, e.atM + e.lengthM] as const);
  const kept = points.filter((_, i) => !cuts.some(([from, to]) => cum[i] > from && cum[i] < to));
  return kept.length >= 2 ? kept : points;
}

// De aanloop van een lus: het stuk vanaf het startpunt dat de lus aan het eind weer terugloopt (het pad uit
// een afgesloten terrein, een steeg naar de eerste kruising). Dat stuk twee keer lopen is onvermijdelijk, geen
// keuze van de lus. Gemeten op de lijn zonder takken, in meters vanaf het begin.
export function approachLength(points: RoutePoint[]): number {
  const clean = withoutDeadEnds(points);
  if (clean.length < 4) return 0;
  const { at, pts } = resample(clean, SPUR_STEP_M);
  const half = Math.floor(pts.length / 2);
  let reach = 0;
  for (let i = 0; i < half; i++) {
    let near = false;
    for (let j = half; j < pts.length && !near; j++) near = metersBetween(pts[i], pts[j]) <= SPUR_SAME_M;
    if (!near) break;
    reach = at[i];
  }
  return reach;
}

// De doodlopende stukken van een lus zelf: een tak in de aanloop (vanaf het startpunt tot de eerste kruising
// en terug, en bij het eind van de lijn hetzelfde) telt niet mee (besluit 2026-11-16-wandelroute-vraag.md).
export function loopDeadEnds(points: readonly RoutePoint[]): DeadEnd[] {
  const ends = deadEnds(points);
  if (ends.length === 0) return ends;
  const approach = approachLength(points as RoutePoint[]);
  if (approach <= 0) return ends;
  const total = lineLength(points as RoutePoint[]);
  return ends.filter((e) => e.atM - e.lengthM > approach + SPUR_NEAR_M && total - (e.atM + e.lengthM) > approach + SPUR_NEAR_M);
}

// ---------- Grote wegen ----------

// Meters over een grote weg: een stap telt als beide punten op een grote weg liggen (`bigRoad`). Zo telt
// een omgekeerde lijn (de terugweg van heen en terug) hetzelfde als de heenweg.
export function bigRoadMeters(points: readonly RoutePoint[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) if (points[i].bigRoad && points[i - 1].bigRoad) total += metersBetween(points[i - 1], points[i]);
  return total;
}

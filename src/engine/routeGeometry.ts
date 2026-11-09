// ASCEND: meetkunde voor een voorgestelde lus: lengte, opgetelde hoogtemeters met een dode band en
// welk deel van een lus je twee keer loopt. Pure: geen React, geen IndexedDB, geen netwerk.
// Zie docs/beslissingen/2026-11-09-routeplanner.md en docs/onderzoek/Routeplanner voor een training.md.

import type { RoutePoint } from '../models/route';

// Onder deze stap telt een stijging niet mee: de hoogte uit een hoogtemodel zit er in bos een paar
// meter naast, en die ruis telt anders op tot hoogtemeters die er niet zijn. Vijf meter volgt het
// verslag (docs/onderzoek/Routeplanner voor een training.md).
export const ASCENT_DEAD_BAND_M = 5;

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

// Opgetelde stijging in meters. Een stijging telt pas als hij boven de dode band uitkomt, gemeten
// vanaf het laatste dal; punten zonder hoogte doen niet mee.
export function ascentOf(points: RoutePoint[], deadBandM = ASCENT_DEAD_BAND_M): number {
  let total = 0;
  let anchor: number | undefined;
  for (const p of points) {
    if (p.ele === undefined) continue;
    if (anchor === undefined) {
      anchor = p.ele;
    } else if (p.ele >= anchor + deadBandM) {
      total += p.ele - anchor;
      anchor = p.ele;
    } else if (p.ele <= anchor - deadBandM) {
      anchor = p.ele;
    }
  }
  return total;
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

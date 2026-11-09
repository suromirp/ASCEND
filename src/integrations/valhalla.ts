// ASCEND: Valhalla-adapter (de openbare dienst van FOSSGIS), de tweede bron van de routeplanner als
// BRouter niet antwoordt. Zonder sleutel en zonder account. Met `elevation_interval` staat de hoogte
// om de dertig meter langs de lijn in hetzelfde antwoord.
//   GET https://valhalla1.openstreetmap.de/route?json={"locations":[...],"costing":"pedestrian","directions_type":"none","elevation_interval":30}
// Alleen punten gaan de deur uit, nooit een naam. Gooit nooit. Kaartgegevens van OpenStreetMap (ODbL).

import type { RouteAnswer, RouteFn, RoutePoint } from '../models/route';
import { ROUTE_TIMEOUT_MS, parseJson, requestText } from './routing';

export const VALHALLA_URL = 'https://valhalla1.openstreetmap.de/route';
export const ELEVATION_INTERVAL_M = 30;

const c5 = (v: number) => Math.round(v * 100_000) / 100_000;
const RAD = Math.PI / 180;

export function valhallaUrl(waypoints: RoutePoint[]): string {
  const body = { locations: waypoints.map((p) => ({ lat: c5(p.lat), lon: c5(p.lon) })), costing: 'pedestrian', directions_type: 'none', elevation_interval: ELEVATION_INTERVAL_M };
  return `${VALHALLA_URL}?json=${encodeURIComponent(JSON.stringify(body))}`;
}

// Een gecodeerde lijn (polyline met zes decimalen) naar punten.
export function decodePolyline6(encoded: string): RoutePoint[] {
  const points: RoutePoint[] = [];
  let i = 0;
  let lat = 0;
  let lon = 0;
  const next = (): number | undefined => {
    let result = 0;
    let shift = 0;
    for (;;) {
      if (i >= encoded.length) return undefined;
      const b = encoded.charCodeAt(i++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
      if (b < 0x20) break;
    }
    return result & 1 ? ~(result >> 1) : result >> 1;
  };
  while (i < encoded.length) {
    const dLat = next();
    const dLon = next();
    if (dLat === undefined || dLon === undefined) break;
    lat += dLat;
    lon += dLon;
    points.push({ lat: lat / 1e6, lon: lon / 1e6 });
  }
  return points;
}

function meters(a: RoutePoint, b: RoutePoint): number {
  const x = (b.lon - a.lon) * RAD * Math.cos(((a.lat + b.lat) / 2) * RAD);
  const y = (b.lat - a.lat) * RAD;
  return Math.sqrt(x * x + y * y) * 6_371_000;
}

// De hoogtes staan om de `interval` meter langs de lijn; elk punt krijgt de hoogte op zijn afstand,
// met een rechte lijn tussen twee metingen.
export function spreadElevation(points: RoutePoint[], heights: number[], interval = ELEVATION_INTERVAL_M): RoutePoint[] {
  if (heights.length === 0) return points;
  let along = 0;
  return points.map((p, i) => {
    if (i > 0) along += meters(points[i - 1], p);
    const at = Math.min(heights.length - 1, along / interval);
    const lo = Math.floor(at);
    const hi = Math.min(heights.length - 1, lo + 1);
    return { ...p, ele: heights[lo] + (heights[hi] - heights[lo]) * (at - lo) };
  });
}

// De punten van alle stukken achter elkaar, met hoogte als het antwoord die gaf; undefined als de vorm niet klopt.
export function mapValhalla(raw: unknown): RoutePoint[] | undefined {
  const legs = (raw as { trip?: { legs?: unknown } } | null)?.trip?.legs;
  if (!Array.isArray(legs) || legs.length === 0) return undefined;
  const points: RoutePoint[] = [];
  for (const leg of legs as { shape?: unknown; elevation?: unknown }[]) {
    if (typeof leg?.shape !== 'string') return undefined;
    const heights = Array.isArray(leg.elevation) && leg.elevation.every((v) => typeof v === 'number' && Number.isFinite(v)) ? (leg.elevation as number[]) : [];
    const part = spreadElevation(decodePolyline6(leg.shape), heights);
    points.push(...(points.length > 0 ? part.slice(1) : part));
  }
  return points.length >= 2 ? points : undefined;
}

export function valhallaRoute(options: { fetchImpl?: typeof fetch; timeoutMs?: number } = {}): RouteFn {
  return async (waypoints): Promise<RouteAnswer> => {
    if (waypoints.length < 2) return { ok: false, reason: 'error' };
    const answer = await requestText(valhallaUrl(waypoints), options.timeoutMs ?? ROUTE_TIMEOUT_MS, options.fetchImpl ?? fetch, { headers: { Accept: 'application/json' } });
    if (typeof answer === 'string') return { ok: false, reason: answer };
    const raw = parseJson(answer.text);
    if (answer.status !== 200) {
      // 171: geen pad in de buurt van een punt.
      return { ok: false, reason: (raw as { error_code?: unknown } | undefined)?.error_code === 171 ? 'unmapped' : 'error' };
    }
    const points = mapValhalla(raw);
    return points ? { ok: true, line: { source: 'valhalla', points } } : { ok: false, reason: 'error' };
  };
}

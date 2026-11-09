// ASCEND: BRouter-adapter, de eerste bron van de routeplanner. Openbaar, zonder sleutel en zonder
// account, rechtstreeks vanaf de telefoon; het antwoord heeft de hoogte per punt.
//   GET https://brouter.de/brouter?lonlats=lon,lat|lon,lat&profile=hiking-mountain&alternativeidx=0&format=geojson
// Alleen punten gaan de deur uit (het startpunt is al afgerond door de aanroeper), nooit een naam.
// Gooit nooit. Kaartgegevens van OpenStreetMap (ODbL).

import type { RouteAnswer, RouteFn, RoutePoint } from '../models/route';
import { ROUTE_TIMEOUT_MS, parseJson, requestText } from './routing';

export const BROUTER_URL = 'https://brouter.de/brouter';
// Het wandelprofiel dat paden en onverhard verkiest boven de weg.
export const BROUTER_PROFILE = 'hiking-mountain';

const c5 = (v: number) => (Math.round(v * 100_000) / 100_000).toString();

export function brouterUrl(waypoints: RoutePoint[], profile = BROUTER_PROFILE): string {
  const lonlats = waypoints.map((p) => `${c5(p.lon)},${c5(p.lat)}`).join('|');
  return `${BROUTER_URL}?lonlats=${lonlats}&profile=${profile}&alternativeidx=0&format=geojson`;
}

const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);

// De punten uit het GeoJSON-antwoord; undefined als de vorm niet klopt.
export function mapBrouter(raw: unknown): RoutePoint[] | undefined {
  const features = (raw as { features?: unknown } | null)?.features;
  const coords = Array.isArray(features) ? (features[0] as { geometry?: { coordinates?: unknown } } | undefined)?.geometry?.coordinates : undefined;
  if (!Array.isArray(coords)) return undefined;
  const points: RoutePoint[] = [];
  for (const c of coords as unknown[]) {
    if (!Array.isArray(c)) return undefined;
    const lon = num(c[0]);
    const lat = num(c[1]);
    if (lon === undefined || lat === undefined) return undefined;
    const ele = num(c[2]);
    points.push(ele === undefined ? { lat, lon } : { lat, lon, ele });
  }
  return points.length >= 2 ? points : undefined;
}

// "via2-position not mapped in existing datafile": bij dat punt ligt geen pad in de buurt.
export function unmappedWaypoint(text: string, count: number): number | undefined {
  const m = /(from|to|via(\d+))-position not mapped/.exec(text);
  if (!m) return undefined;
  if (m[1] === 'from') return 0;
  if (m[1] === 'to') return count - 1;
  return Number(m[2]);
}

export function brouterRoute(options: { fetchImpl?: typeof fetch; timeoutMs?: number } = {}): RouteFn {
  return async (waypoints): Promise<RouteAnswer> => {
    if (waypoints.length < 2) return { ok: false, reason: 'error' };
    const answer = await requestText(brouterUrl(waypoints), options.timeoutMs ?? ROUTE_TIMEOUT_MS, options.fetchImpl ?? fetch, { headers: { Accept: 'application/json' } });
    if (typeof answer === 'string') return { ok: false, reason: answer };
    if (answer.status !== 200) {
      if (/not mapped/.test(answer.text)) return { ok: false, reason: 'unmapped', waypoint: unmappedWaypoint(answer.text, waypoints.length) };
      return { ok: false, reason: 'error' };
    }
    const points = mapBrouter(parseJson(answer.text));
    return points ? { ok: true, line: { source: 'brouter', points } } : { ok: false, reason: 'error' };
  };
}

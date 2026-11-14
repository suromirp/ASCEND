// ASCEND: BRouter-adapter, de eerste bron van de routeplanner. Openbaar, zonder sleutel en zonder
// account, rechtstreeks vanaf de telefoon; het antwoord heeft de hoogte per punt.
//   GET https://brouter.de/brouter?lonlats=lon,lat|lon,lat&profile=hiking-mountain&alternativeidx=0&format=geojson
// Alleen punten gaan de deur uit (het startpunt is al afgerond door de aanroeper), nooit een naam.
// Gooit nooit. Kaartgegevens van OpenStreetMap (ODbL).

import type { AvoidArea, RouteAnswer, RouteFn, RoutePoint } from '../models/route';
import { ROUTE_TIMEOUT_MS, parseJson, requestText } from './routing';

export const BROUTER_URL = 'https://brouter.de/brouter';
// Het wandelprofiel dat paden en onverhard verkiest boven de weg.
export const BROUTER_PROFILE = 'hiking-mountain';
// Bij lopen weg van grote wegen en knooppunten van snelwegen: het profiel kent `consider_noise`, dat
// een weg duurder maakt naarmate hij dichter bij verkeerslawaai ligt (eigenaar 14 november).
export const BROUTER_PROFILE_PARAMS = '&profile:consider_noise=1';
// Wat ASCEND een grote weg noemt in de regel bij een lus (de snelweg is voor lopen al verboden).
const BIG_ROAD = /(^|\s)highway=(motorway|motorway_link|trunk|trunk_link|primary|primary_link|secondary|secondary_link)(\s|$)/;

const c5 = (v: number) => (Math.round(v * 100_000) / 100_000).toString();

// Een stuk vermijden: BRouter kent `nogos` als lon,lat,straal in meters, gescheiden door |.
export function brouterUrl(waypoints: RoutePoint[], profile = BROUTER_PROFILE, avoid: AvoidArea[] = []): string {
  const lonlats = waypoints.map((p) => `${c5(p.lon)},${c5(p.lat)}`).join('|');
  const nogos = avoid.length > 0 ? `&nogos=${avoid.map((a) => `${c5(a.lon)},${c5(a.lat)},${Math.round(a.radiusM)}`).join('|')}` : '';
  return `${BROUTER_URL}?lonlats=${lonlats}${nogos}&profile=${profile}${BROUTER_PROFILE_PARAMS}&alternativeidx=0&format=geojson`;
}

// Hemelsbreed in meters (plat gerekend; op de stukjes van een routeplanner klopt dat op een meter).
function metersApart(a: RoutePoint, b: RoutePoint): number {
  const k = Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot((b.lat - a.lat) * 111_195, (b.lon - a.lon) * 111_195 * k);
}

const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);

// De punten uit het GeoJSON-antwoord; undefined als de vorm niet klopt. De tabel `messages` zegt per
// stuk over welke weg het gaat (WayTags) en waar het stuk eindigt: een punt op een grote weg krijgt `bigRoad`.
export function mapBrouter(raw: unknown): RoutePoint[] | undefined {
  const features = (raw as { features?: unknown } | null)?.features;
  const feature = Array.isArray(features) ? (features[0] as { geometry?: { coordinates?: unknown }; properties?: { messages?: unknown } } | undefined) : undefined;
  const coords = feature?.geometry?.coordinates;
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
  if (points.length < 2) return undefined;
  markBigRoads(points, feature?.properties?.messages);
  return points;
}

// De rijen van `messages` (na de kop): lengtegraad en breedtegraad maal een miljoen waar het stuk eindigt,
// en de wegsoort. Elk punt tot en met dat eind hoort bij die rij. Vindt een eind geen punt, dan geen
// markering: liever niets zeggen dan iets verkeerds.
function markBigRoads(points: RoutePoint[], messages: unknown): void {
  if (!Array.isArray(messages) || messages.length < 2 || !Array.isArray(messages[0])) return;
  const head = messages[0] as unknown[];
  const lonAt = head.indexOf('Longitude');
  const latAt = head.indexOf('Latitude');
  const tagsAt = head.indexOf('WayTags');
  const distAt = head.indexOf('Distance');
  if (lonAt < 0 || latAt < 0 || tagsAt < 0) return;
  const step = (i: number) => metersApart(points[i - 1], points[i]);
  const key = (lon: number, lat: number) => `${Math.round(lon * 1e6)},${Math.round(lat * 1e6)}`;
  const flags: boolean[] = new Array(points.length).fill(false);
  let from = 1;
  for (const row of messages.slice(1)) {
    if (!Array.isArray(row)) return;
    const lon = Number(row[lonAt]);
    const lat = Number(row[latAt]);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return;
    const end = `${Math.round(lon)},${Math.round(lat)}`;
    // Het eind van de rij: het punt met die plek waar ook de lengte van de rij klopt (een lijn die zichzelf
    // kruist raakt dezelfde plek eerder). Zonder lengte in de rij: de eerste treffer.
    const want = distAt >= 0 ? Number(row[distAt]) : NaN;
    let to = from;
    let walked = step(from);
    for (;;) {
      if (to >= points.length) return;
      if (key(points[to].lon, points[to].lat) === end && (!Number.isFinite(want) || Math.abs(walked - want) <= Math.max(10, want * 0.05))) break;
      to++;
      if (to < points.length) walked += step(to);
    }
    const big = typeof row[tagsAt] === 'string' && BIG_ROAD.test(row[tagsAt] as string);
    for (let i = from; i <= to; i++) flags[i] = big;
    from = to + 1;
  }
  flags.forEach((big, i) => {
    if (big) points[i].bigRoad = true;
  });
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
  return async (waypoints, routeOptions): Promise<RouteAnswer> => {
    if (waypoints.length < 2) return { ok: false, reason: 'error' };
    const answer = await requestText(brouterUrl(waypoints, BROUTER_PROFILE, routeOptions?.avoid), options.timeoutMs ?? ROUTE_TIMEOUT_MS, options.fetchImpl ?? fetch, { headers: { Accept: 'application/json' } });
    if (typeof answer === 'string') return { ok: false, reason: answer };
    if (answer.status !== 200) {
      if (/not mapped/.test(answer.text)) return { ok: false, reason: 'unmapped', waypoint: unmappedWaypoint(answer.text, waypoints.length) };
      return { ok: false, reason: 'error' };
    }
    const points = mapBrouter(parseJson(answer.text));
    return points ? { ok: true, line: { source: 'brouter', points } } : { ok: false, reason: 'error' };
  };
}

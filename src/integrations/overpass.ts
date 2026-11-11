// ASCEND: Overpass-adapter (OpenStreetMap). Zoekt rond een plek heuvels, trappen, onverharde paden,
// sportvelden en een atletiekbaan, en vraagt de hoogte bij Open-Meteo om het hoogteverschil te
// kennen. Zonder sleutel, zonder account, rechtstreeks vanaf de telefoon.
//
// Standaard gaat alleen een plek afgerond op twee decimalen (ongeveer een kilometer) de deur uit.
// Met `exact` (het eigen startpunt van een lus, besluit 2026-11-11-route-verfijnen.md) gaat het punt
// op vier decimalen: dan liggen het zoekgebied en de hoogte waarmee heuvels vergeleken worden om
// het startpunt zelf. Nooit een naam van de gebruiker. De adapter gooit nooit: zonder netwerk, bij een
// fout of na de tijdgrens geeft hij `undefined` en is er gewoon geen regel.
//   POST https://overpass-api.de/api/interpreter   (body: data=<query>)
//   GET  https://api.open-meteo.com/v1/elevation?latitude=a,b&longitude=c,d
// Kaartgegevens van OpenStreetMap, licentie ODbL (https://www.openstreetmap.org/copyright).

import type { NearbyTerrain, TerrainFeature, TerrainKind } from '../models/nearbyTerrain';
import type { WeatherPlace } from '../models/weather';
import { roundCoordinate } from './openMeteo';

export const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
export const ELEVATION_URL = 'https://api.open-meteo.com/v1/elevation';
export const OSM_COPYRIGHT = 'https://www.openstreetmap.org/copyright';
export const DEFAULT_RADIUS_M = 3000;
export const OVERPASS_TIMEOUT_MS = 12_000;
export const ELEVATION_TIMEOUT_MS = 8_000;
// Zoveel heuvels krijgen een hoogte; de dichtstbijzijnde eerst.
export const MAX_HILLS_WITH_HEIGHT = 12;
const MAX_PER_KIND = 8;
const UNPAVED = '^(dirt|ground|earth|grass|gravel|fine_gravel|compacted|unpaved|sand)$';

export interface OverpassOptions {
  fetchImpl?: typeof fetch;
  radiusM?: number;
  now?: Date;
  // Zoek om het punt zelf (vier decimalen) in plaats van om de afgeronde plek.
  exact?: boolean;
}

const r4 = (v: number) => Math.round(v * 10_000) / 10_000;
const centre = (value: number, exact?: boolean) => (exact ? r4(value) : roundCoordinate(value));

export function overpassQuery(place: WeatherPlace, radiusM = DEFAULT_RADIUS_M, exact = false): string {
  const at = `(around:${Math.round(radiusM)},${centre(place.lat, exact)},${centre(place.lon, exact)})`;
  return [
    '[out:json][timeout:15];(',
    `nwr["natural"~"^(hill|peak)$"]${at};`,
    `way["highway"]["incline"]${at};`,
    `way["highway"="steps"]${at};`,
    `way["highway"~"^(path|track|footway)$"]["surface"~"${UNPAVED}"]${at};`,
    `nwr["leisure"="track"]["sport"~"athletics|running"]${at};`,
    `nwr["leisure"~"^(pitch|sports_ground)$"]${at};`,
    ');out center tags 300;',
  ].join('');
}

const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);

// Hemelsbreed, in meters (haversine).
export function distanceMeters(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const rad = Math.PI / 180;
  const dLat = (bLat - aLat) * rad;
  const dLon = (bLon - aLon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * 6_371_000 * Math.asin(Math.min(1, Math.sqrt(h))));
}

function kindOf(tags: Record<string, unknown>): TerrainKind | undefined {
  const t = (k: string) => (typeof tags[k] === 'string' ? (tags[k] as string) : '');
  if (t('natural') === 'hill' || t('natural') === 'peak') return 'hill';
  if (t('leisure') === 'track' && /athletics|running/.test(t('sport'))) return 'track';
  if (t('highway') === 'steps') return 'steps';
  if (t('highway') && t('incline')) return 'hill';
  if (t('leisure') === 'pitch' || t('leisure') === 'sports_ground') return 'sports_ground';
  if (t('highway') && new RegExp(UNPAVED).test(t('surface'))) return 'dirt_path';
  return undefined;
}

// Zet een Overpass-antwoord om in dingen met een afstand. Elementen zonder positie of soort
// vallen weg; per soort blijven de dichtstbijzijnde over. Gooit bij een antwoord zonder lijst.
export function mapOverpass(raw: unknown, place: WeatherPlace, radiusM = DEFAULT_RADIUS_M, exact = false): TerrainFeature[] {
  const elements = (raw as { elements?: unknown } | null)?.elements;
  if (!Array.isArray(elements)) throw new Error('response');
  const lat0 = centre(place.lat, exact);
  const lon0 = centre(place.lon, exact);
  const out: TerrainFeature[] = [];
  for (const el of elements as Record<string, unknown>[]) {
    const tags = (el?.tags ?? {}) as Record<string, unknown>;
    const kind = kindOf(tags);
    const center = (el?.center ?? {}) as Record<string, unknown>;
    const lat = num(el?.lat) ?? num(center.lat);
    const lon = num(el?.lon) ?? num(center.lon);
    if (!kind || lat === undefined || lon === undefined) continue;
    const distanceM = distanceMeters(lat0, lon0, lat, lon);
    if (distanceM > radiusM * 1.1) continue;
    out.push({ kind, lat: r4(lat), lon: r4(lon), distanceM });
  }
  out.sort((a, b) => a.distanceM - b.distanceM);
  const count: Partial<Record<TerrainKind, number>> = {};
  return out.filter((f) => {
    count[f.kind] = (count[f.kind] ?? 0) + 1;
    return count[f.kind]! <= (f.kind === 'hill' ? MAX_HILLS_WITH_HEIGHT : MAX_PER_KIND);
  });
}

export function elevationUrl(points: { lat: number; lon: number }[]): string {
  const lat = points.map((p) => p.lat).join(',');
  const lon = points.map((p) => p.lon).join(',');
  return `${ELEVATION_URL}?latitude=${lat}&longitude=${lon}`;
}

// Hoogtes in meters, in de volgorde van de punten; undefined als het antwoord niet klopt.
export function mapElevation(raw: unknown, expected: number): number[] | undefined {
  const e = (raw as { elevation?: unknown } | null)?.elevation;
  if (!Array.isArray(e) || e.length !== expected || !e.every((v) => num(v) !== undefined)) return undefined;
  return e as number[];
}

async function request(url: string, init: RequestInit, timeoutMs: number, doFetch: typeof fetch): Promise<unknown | undefined> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  // De tijdgrens loopt ook door tot de body binnen is: een trage verbinding hangt niet eeuwig.
  try {
    const response = await doFetch(url, { ...init, signal: controller.signal });
    if (!response.ok) return undefined;
    return await response.json();
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

// Het hoogteverschil van de heuvels met de plek, met de hoogte-aanroep van Open-Meteo. Lukt die
// niet, dan blijven de heuvels zonder hoogte staan.
async function addHeights(place: WeatherPlace, features: TerrainFeature[], doFetch: typeof fetch, exact = false): Promise<TerrainFeature[]> {
  const hills = features.filter((f) => f.kind === 'hill');
  if (hills.length === 0) return features;
  const points = [{ lat: centre(place.lat, exact), lon: centre(place.lon, exact) }, ...hills.map((h) => ({ lat: h.lat, lon: h.lon }))];
  const raw = await request(elevationUrl(points), { method: 'GET', headers: { Accept: 'application/json' } }, ELEVATION_TIMEOUT_MS, doFetch);
  const heights = mapElevation(raw, points.length);
  if (!heights) return features;
  const base = heights[0];
  return features.map((f) => {
    const i = hills.indexOf(f);
    return i < 0 ? f : { ...f, heightM: Math.round(heights[i + 1] - base) };
  });
}

// Wat er rond de plek ligt, of undefined zonder antwoord. Een lege lijst is een echt antwoord:
// er ligt niets in de buurt.
export async function fetchNearbyTerrain(place: WeatherPlace, options: OverpassOptions = {}): Promise<NearbyTerrain | undefined> {
  const doFetch = options.fetchImpl ?? fetch;
  const radiusM = options.radiusM ?? DEFAULT_RADIUS_M;
  const exact = options.exact === true;
  const rounded: WeatherPlace = { name: '', lat: centre(place.lat, exact), lon: centre(place.lon, exact) };
  const raw = await request(
    OVERPASS_URL,
    { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' }, body: `data=${encodeURIComponent(overpassQuery(rounded, radiusM, exact))}` },
    OVERPASS_TIMEOUT_MS,
    doFetch,
  );
  if (raw === undefined) return undefined;
  let features: TerrainFeature[];
  try {
    features = mapOverpass(raw, rounded, radiusM, exact);
  } catch {
    return undefined;
  }
  features = await addHeights(rounded, features, doFetch, exact);
  // De naam van de plek wordt niet in het resultaat bewaard, alleen de positie.
  return { source: 'osm', fetchedAt: (options.now ?? new Date()).toISOString(), place: rounded, radiusM, features };
}

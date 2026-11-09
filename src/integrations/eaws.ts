// ASCEND: het lawinebulletin in het open formaat van de EAWS (engine/avalanche.ts,
// docs/beslissingen/2026-11-09-gr5-waarschuwingen.md).
//
//   GET https://regions.avalanches.org/micro-regions/FR_micro-regions.geojson.json
//       de waarschuwingsgebieden van één dienst, als GeoJSON (ongeveer 20 tot 600 kB)
//   GET https://static.avalanche.report/eaws_bulletins/2026-02-01/2026-02-01.ratings.json
//       de hoogste gevarenklasse per gebied voor die dag (ongeveer 25 kB), voor heel Europa
//
// Beide zonder sleutel en met `access-control-allow-origin: *` (gecontroleerd op 9 november 2026),
// dus de telefoon mag ze zelf vragen. Alleen een datum en een bestandsnaam gaan naar buiten, nooit
// een plek: welk gebied bij je tocht hoort rekent ASCEND op het toestel uit. Dit bestand is het
// enige dat de vorm van die bestanden kent.

export const EAWS_REGIONS_URL = 'https://regions.avalanches.org/micro-regions';
export const EAWS_RATINGS_URL = 'https://static.avalanche.report/eaws_bulletins';
export const EAWS_SITE = 'https://www.avalanches.org/';

const TIMEOUT_MS = 10_000;

export interface FetchOptions {
  fetchImpl?: typeof fetch;
}

// Een waarschuwingsgebied: id (zoals FR-74), geldig van tot (optioneel) en de ringen.
export interface AvalancheRegion {
  id: string;
  startDate?: string;
  endDate?: string;
  // Polygonen, elk een lijst ringen, elke ring punten [lon, lat]; de eerste ring is de buitenrand.
  polygons: number[][][][];
}

async function getJson(url: string, options: FetchOptions): Promise<unknown> {
  const doFetch = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await doFetch(url, { method: 'GET', headers: { Accept: 'application/json' }, signal: controller.signal });
    if (!response.ok) throw new Error(`EAWS ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

export const regionsUrl = (file: string) => `${EAWS_REGIONS_URL}/${encodeURIComponent(file)}_micro-regions.geojson.json`;
export const ratingsUrl = (date: string) => `${EAWS_RATINGS_URL}/${date}/${date}.ratings.json`;

const isPoint = (p: unknown): p is number[] => Array.isArray(p) && p.length >= 2 && typeof p[0] === 'number' && typeof p[1] === 'number';
const isRing = (r: unknown): r is number[][] => Array.isArray(r) && r.length >= 4 && r.every(isPoint);
const isPolygon = (p: unknown): p is number[][][] => Array.isArray(p) && p.length > 0 && p.every(isRing);
const dateOf = (v: unknown): string | undefined => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : undefined);

export function mapRegions(raw: unknown): AvalancheRegion[] {
  const features = (raw as { features?: unknown } | null)?.features;
  if (!Array.isArray(features)) return [];
  const out: AvalancheRegion[] = [];
  for (const f of features as { properties?: Record<string, unknown>; geometry?: { type?: unknown; coordinates?: unknown } }[]) {
    const id = f?.properties?.id;
    const g = f?.geometry;
    if (typeof id !== 'string' || !g || !Array.isArray(g.coordinates)) continue;
    const polygons = g.type === 'MultiPolygon' ? (g.coordinates as unknown[]).filter(isPolygon) : g.type === 'Polygon' && isPolygon(g.coordinates) ? [g.coordinates] : [];
    if (polygons.length === 0) continue;
    const start = dateOf(f.properties?.start_date);
    const end = dateOf(f.properties?.end_date);
    out.push({ id, polygons, ...(start ? { startDate: start } : {}), ...(end ? { endDate: end } : {}) });
  }
  return out;
}

// De hoogste klasse per gebied (1 tot 5); 0 of iets anders betekent geen bulletin en valt weg.
// Alleen de gewone sleutels, niet de delen van de dag of de hoogte (zoals FR-74:pm).
export function mapRatings(raw: unknown): Record<string, number> {
  const r = (raw as { maxDangerRatings?: unknown } | null)?.maxDangerRatings;
  if (!r || typeof r !== 'object') return {};
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(r as Record<string, unknown>)) {
    if (key.includes(':')) continue;
    if (typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5) out[key] = value;
  }
  return out;
}

export async function fetchRegions(file: string, options: FetchOptions = {}): Promise<AvalancheRegion[]> {
  return mapRegions(await getJson(regionsUrl(file), options));
}

export async function fetchRatings(date: string, options: FetchOptions = {}): Promise<Record<string, number>> {
  return mapRatings(await getJson(ratingsUrl(date), options));
}

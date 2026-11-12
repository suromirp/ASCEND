// ASCEND: Photon, de tweede zoekdienst van Andere plek (docs/beslissingen/2026-11-12-andere-plek-photon.md).
// Photon van Komoot zoekt in OpenStreetMap en kent ook een top, een heuvel en een natuurgebied; de
// zoekdienst van Open-Meteo kent bijna alleen plaatsen. Hier staat alleen de aanvraag en de vertaling
// naar FoundPlace; wanneer hij gevraagd wordt staat in placeSearchSession.ts. Geen sleutel, geen plek van
// jou: alleen het zoekwoord gaat mee. Geen eigen grens in tijd: de vraag stopt met het signaal van de sessie.

import { roundExact } from '../engine/routeStart';
import { PLACE_SEARCH_MAX, type FoundPlace, type PlaceKind } from '../engine/placeSearch';

export const PHOTON_URL = 'https://photon.komoot.io/api/';

// Geen `lang`: Photon kent geen Nederlands en weigert een taal die het niet kent. Namen komen zoals ze
// ter plaatse heten.
export function photonUrl(term: string, limit: number = PLACE_SEARCH_MAX): string {
  return `${PHOTON_URL}?${new URLSearchParams({ q: term.trim(), limit: String(limit) }).toString()}`;
}

const PEAKS = new Set(['peak', 'hill', 'volcano', 'ridge', 'saddle']);
const NATURE_KEYS: Record<string, ReadonlySet<string>> = {
  leisure: new Set(['nature_reserve', 'park']),
  boundary: new Set(['national_park', 'protected_area']),
  landuse: new Set(['forest']),
};

// De soort van een treffer uit zijn OpenStreetMap-label; undefined is iets wat hier niet hoort
// (een winkel, een straat, een huis).
export function photonKind(key: unknown, value: unknown): PlaceKind | undefined {
  if (typeof key !== 'string' || typeof value !== 'string') return undefined;
  if (key === 'natural') return PEAKS.has(value) ? 'peak' : 'nature';
  if (NATURE_KEYS[key]?.has(value)) return 'nature';
  if (key === 'place' && value !== 'house') return 'place';
  return undefined;
}

const text = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
const coord = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);

// Het antwoord van Photon (GeoJSON) als treffers. Alleen een top, natuur of plaats met een naam en een
// plek op aarde; een vreemd antwoord gooit, een vreemde rij valt weg.
export function mapPhoton(raw: unknown): FoundPlace[] {
  const features = (raw as { features?: unknown } | null)?.features;
  if (!Array.isArray(features)) throw new Error('photon: onleesbaar antwoord');
  const out: FoundPlace[] = [];
  for (const f of features as { geometry?: { coordinates?: unknown }; properties?: Record<string, unknown> }[]) {
    const p = f?.properties;
    const c = f?.geometry?.coordinates;
    const name = text(p?.name);
    const kind = photonKind(p?.osm_key, p?.osm_value);
    const lon = Array.isArray(c) ? coord(c[0]) : undefined;
    const lat = Array.isArray(c) ? coord(c[1]) : undefined;
    if (!name || !kind || lat === undefined || lon === undefined) continue;
    if (!(Math.abs(lat) <= 90) || !(Math.abs(lon) <= 180)) continue;
    const region = [text(p?.state), text(p?.county), text(p?.city)].find((x) => x && x !== name);
    out.push({ name, ...roundExact({ lat, lon }), kind, region, country: text(p?.country) });
  }
  return out;
}

export async function searchPhoton(term: string, options: { signal?: AbortSignal; fetchImpl?: typeof fetch } = {}): Promise<FoundPlace[]> {
  const response = await (options.fetchImpl ?? fetch)(photonUrl(term), { method: 'GET', headers: { Accept: 'application/json' }, signal: options.signal });
  if (!response.ok) throw new Error(`photon: ${response.status}`);
  return mapPhoton(await response.json());
}

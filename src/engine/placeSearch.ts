// ASCEND: Andere plek, het pure deel (docs/beslissingen/2026-11-12-andere-plek.md; ontwerp Plekken en
// routes, "Nieuwe plek, ook vooraf"). Wat er bij een zoekwoord gebeurt, welke regel er staat, hoe een
// treffer heet en wanneer een treffer al een bewaarde plek is. Zonder React, opslag of netwerk; de
// aanroep zelf staat in integrations/placeSearchSession.ts. Niets hier verandert de planning.

import { metersBetween } from './routeGeometry';
import { roundExact } from './routeStart';
import { PLACE_NAME_MAX, type Place } from '../models/place';
import type { RoutePoint } from '../models/route';

// Zoeken na een korte pauze in het typen, nooit per letter.
export const PLACE_SEARCH_PAUSE_MS = 400;
// De grens in tijd van één zoekvraag (ontwerp: 8 seconden).
export const PLACE_SEARCH_LIMIT_MS = 8000;
// Hoogstens zoveel treffers als rijen.
export const PLACE_SEARCH_MAX = 8;
// Binnen deze afstand is een treffer dezelfde plek als een bewaarde.
export const SAME_PLACE_M = 100;

// Twee treffers binnen deze afstand zijn dezelfde plek: hij staat één keer in de lijst.
export const SAME_FOUND_M = 300;

// De soort van een treffer, als de zoekdienst die kent (Photon; Open-Meteo zegt het niet).
export type PlaceKind = 'peak' | 'nature' | 'place';
export const PLACE_KIND_LABEL: Record<PlaceKind, string> = { peak: 'Top', nature: 'Natuurgebied', place: 'Plaats' };

// Een treffer van de zoekdienst: naam, plek, en waar hij ligt. `kind` wordt nooit bewaard.
export interface FoundPlace {
  name: string;
  lat: number;
  lon: number;
  kind?: PlaceKind;
  region?: string;
  country?: string;
}

export type PlaceQuery = 'empty' | 'short' | 'ok';

// Wat er naar de zoekdienst gaat: bij een adres met komma's alleen het deel voor de eerste komma
// ("Verzonnen Kop, Bergweg 1, 1234 AB" zoekt op Verzonnen Kop). Straat en postcode gaan de deur niet uit.
export function searchTerm(raw: string): string {
  const at = raw.indexOf(',');
  return (at < 0 ? raw : raw.slice(0, at)).trim();
}

// Leeg of één letter: geen aanroep. De zoekdienst wil minstens twee letters.
export function placeQuery(raw: string): PlaceQuery {
  const q = searchTerm(raw);
  if (q.length === 0) return 'empty';
  return q.length < 2 ? 'short' : 'ok';
}

export type PlaceSearchView =
  | { kind: 'idle' }
  | { kind: 'short' }
  | { kind: 'busy'; query: string }
  | { kind: 'results'; query: string; results: FoundPlace[] }
  | { kind: 'none'; query: string }
  | { kind: 'offline' }
  | { kind: 'timeout' }
  | { kind: 'error'; message: string };

export const PLACE_SHORT_LINE = 'Typ minstens twee letters van de plaats.';
export const PLACE_NONE_LINE = 'Geen plaats gevonden met die naam. Probeer een grotere plaats in de buurt.';
export const PLACE_OFFLINE_LINE = 'Geen verbinding met Open-Meteo. Controleer je internet en probeer het later opnieuw.';
export const PLACE_TIMEOUT_LINE = 'Zoeken duurde te lang. Probeer het zo nog eens.';
// De privacyzin: wie je zoekwoord krijgt. Eerst Open-Meteo; vindt die niets, dan ook Photon van Komoot,
// dat in OpenStreetMap zoekt (integrations/photon.ts). Van een adres gaat alleen het deel voor de komma mee.
export const PLACE_PRIVACY_LINE = 'Open-Meteo krijgt je zoekwoord. Vindt die niets, dan ook Photon van Komoot, dat in OpenStreetMap zoekt.';

// De regel onder het zoekveld; leeg bij niets getypt en bij treffers.
export function placeSearchLine(view: PlaceSearchView): string {
  switch (view.kind) {
    case 'idle':
    case 'results':
      return '';
    case 'short':
      return PLACE_SHORT_LINE;
    case 'busy':
      return `Zoeken naar ${view.query}`;
    case 'none':
      return PLACE_NONE_LINE;
    case 'offline':
      return PLACE_OFFLINE_LINE;
    case 'timeout':
      return PLACE_TIMEOUT_LINE;
    case 'error':
      return view.message;
  }
}

// De tweede regel van een treffer: de soort, de regio en het land, wat er is.
export const placeWhere = (p: Pick<FoundPlace, 'kind' | 'region' | 'country'>): string =>
  [p.kind && PLACE_KIND_LABEL[p.kind], p.region, p.country].filter((x): x is string => !!x).join(', ');

// Treffers van twee bronnen als één lijst, de eerste bron voorop en ongemoeid. Een treffer van de tweede
// bron die binnen 300 m van een eerdere ligt is dezelfde plek en valt weg, ook als de tweede bron hem zelf
// twee keer geeft.
export function mergeFound(first: readonly FoundPlace[], second: readonly FoundPlace[]): FoundPlace[] {
  const out = [...first];
  for (const f of second) {
    if (!out.some((o) => metersBetween(o, f) <= SAME_FOUND_M)) out.push(f);
  }
  return out;
}

const sameName = (a: string, b: string) => a.trim().toLocaleLowerCase('nl') === b.trim().toLocaleLowerCase('nl');
// Een te lange naam: afgekapt op een woordgrens met een beletselteken, zodat je ziet dat er meer was
// (besluit 2026-11-12-route-blok.md). Nooit langer dan `max`.
export function clipName(name: string, max: number = PLACE_NAME_MAX): string {
  const plain = name.trim().replace(/\s+/g, ' ');
  if (plain.length <= max) return plain;
  const room = plain.slice(0, max - 1);
  const atWord = room.lastIndexOf(' ');
  return `${(atWord >= max / 2 ? room.slice(0, atWord) : room).replace(/[\s,.;:]+$/, '')}…`;
}
const clip = (name: string) => clipName(name);

// De bewaarde plek op dezelfde plek als een treffer (binnen 100 m), Thuis meegeteld; anders geen.
export function savedAt(point: RoutePoint, places: readonly Place[]): Place | undefined {
  let best: { place: Place; d: number } | undefined;
  for (const p of places) {
    const d = metersBetween(point, p);
    if (d <= SAME_PLACE_M && (!best || d < best.d)) best = { place: p, d };
  }
  return best?.place;
}

// De naam van een treffer op een chip en bij bewaren. Heet een andere bewaarde plek al zo, dan komt de
// regio erbij ("Heuvelrug, Gelderland"), en anders een nummer: twee chips met dezelfde naam zeggen niets.
export function placeLabel(found: FoundPlace, places: readonly Pick<Place, 'name'>[]): string {
  const taken = (name: string) => places.some((p) => sameName(p.name, name));
  const plain = clip(found.name);
  if (!taken(plain)) return plain;
  const where = found.region ?? found.country;
  const withWhere = where ? clip(`${found.name}, ${where}`) : plain;
  if (!taken(withWhere)) return withWhere;
  for (let n = 2; ; n++) {
    const numbered = `${clipName(withWhere, PLACE_NAME_MAX - String(n).length - 1)} ${n}`;
    if (!taken(numbered)) return numbered;
  }
}

// Wat Bewaar als plek doet met een treffer: ligt er al een plek, dan is dat hem (niets dubbel);
// anders een nieuwe plek met de naam van de chip. `id` komt van buiten, zodat dit puur blijft.
export function placeToSave(found: FoundPlace, places: readonly Place[], today: string, id: string): { kind: 'same'; place: Place } | { kind: 'new'; place: Place } {
  const existing = savedAt(found, places);
  if (existing) return { kind: 'same', place: existing };
  const { lat, lon } = roundExact(found);
  return { kind: 'new', place: { id, name: placeLabel(found, places), lat, lon, source: 'search', createdAt: today } };
}

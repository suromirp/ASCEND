// Opschonen van Plekken en bewaarde routes bij het inlezen (een back-up, en de opslag van het toestel zelf).
// Docs: docs/visie/Ontwerp Plekken en routes.md, docs/beslissingen/2026-11-11-plekken-opslag.md.
//
// `places` en `savedRoutes` zijn nieuw, optioneel en aanvullend: een back-up van daarvoor heeft ze niet en
// leest gelijk (dan houdt het toestel zijn eigen plekken). Daarom geen hogere schemaversie, net als
// `skillGoals` en `missedTraining`. Wat wel kan: een kapotte waarde. Die valt weg en telt mee in wat er is
// overgeslagen, nooit de hele back-up en nooit een fout:
// - een plek zonder id, zonder naam, zonder bruikbaar punt of zonder echte dag valt weg, een tweede plek met
//   hetzelfde id ook. Een te lange naam wordt ingekort, een onbekend kenmerk valt uit de lijst, een onbekende
//   herkomst wordt 'import', en van twee keer Thuis blijft de eerste Thuis: daarvoor valt geen plek weg.
// - een route zonder id, plek, naam, afstand, hoogtemeters of echte dag valt weg, en ook een route met minder
//   dan twee punten, meer dan 800 punten of één kapot punt (een lijn met een gat is geen route). Een kapotte
//   hoogte valt van het punt, een kapotte keuze (`chosenFor`) uit de lijst.
// - een route van een plek die er niet is valt weg (`routesOfPlaces`): een route hoort altijd bij één plek.

import { validStartPoint, roundExact } from '../engine/routeStart';
import { PLACE_FEATURES, PLACE_NAME_MAX, PLACE_SOURCES, ROUTE_MAX_POINTS, ROUTE_NAME_MAX, SAVED_ROUTE_SOURCES, type Place, type PlaceFeature, type PlaceSource, type SavedRoute, type SavedRouteChoice, type SavedRouteSource } from '../models/place';
import type { RoutePoint } from '../models/route';
import { fin, isObj, ISO_DAY } from './migrationsShared';

const isId = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= 200;
const isDay = (v: unknown): v is string => typeof v === 'string' && ISO_DAY.test(v);

// Een naam: zonder witruimte aan de randen, hoogstens `max` tekens. Leeg is geen naam.
function readName(raw: unknown, max: number): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const name = raw.trim().slice(0, max).trim();
  return name.length > 0 ? name : undefined;
}

export function readPlace(raw: unknown): Place | undefined {
  if (!isObj(raw)) return undefined;
  const name = readName(raw.name, PLACE_NAME_MAX);
  const point = validStartPoint(raw);
  if (!isId(raw.id) || !name || !point || !isDay(raw.createdAt)) return undefined;
  const { lat, lon } = roundExact(point);
  const features = Array.isArray(raw.features)
    ? PLACE_FEATURES.filter((f) => (raw.features as unknown[]).includes(f))
    : [];
  const source: PlaceSource = PLACE_SOURCES.includes(raw.source as PlaceSource) ? (raw.source as PlaceSource) : 'import';
  return {
    id: raw.id,
    name,
    lat,
    lon,
    ...(features.length > 0 ? { features: features as PlaceFeature[] } : {}),
    ...(raw.home === true ? { home: true as const } : {}),
    source,
    createdAt: raw.createdAt,
  };
}

function readPoint(raw: unknown): RoutePoint | undefined {
  const point = validStartPoint(raw);
  if (!point) return undefined;
  const ele = (raw as { ele?: unknown }).ele;
  return { ...roundExact(point), ...(fin(ele) ? { ele: Math.round(ele * 10) / 10 } : {}) };
}

function readChoices(raw: unknown): SavedRouteChoice[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: SavedRouteChoice[] = [];
  for (const c of raw) {
    if (!isObj(c) || !isDay(c.date) || !isId(c.plannedSessionId) || seen.has(c.plannedSessionId)) continue;
    seen.add(c.plannedSessionId);
    out.push({ date: c.date, plannedSessionId: c.plannedSessionId });
  }
  return out;
}

export function readSavedRoute(raw: unknown): SavedRoute | undefined {
  if (!isObj(raw)) return undefined;
  const name = readName(raw.name, ROUTE_NAME_MAX);
  if (!isId(raw.id) || !isId(raw.placeId) || !name || !isDay(raw.createdAt)) return undefined;
  if (!fin(raw.distanceM) || raw.distanceM <= 0 || !fin(raw.ascentM) || raw.ascentM < 0) return undefined;
  if (!Array.isArray(raw.points) || raw.points.length < 2 || raw.points.length > ROUTE_MAX_POINTS) return undefined;
  const points: RoutePoint[] = [];
  for (const p of raw.points) {
    const point = readPoint(p);
    if (!point) return undefined;
    points.push(point);
  }
  const source: SavedRouteSource = SAVED_ROUTE_SOURCES.includes(raw.source as SavedRouteSource) ? (raw.source as SavedRouteSource) : 'import';
  const chosenFor = readChoices(raw.chosenFor);
  return {
    id: raw.id,
    placeId: raw.placeId,
    name,
    source,
    ...(raw.style === 'simple' || raw.style === 'adventure' ? { style: raw.style } : {}),
    distanceM: Math.round(raw.distanceM),
    ascentM: Math.round(raw.ascentM),
    points,
    createdAt: raw.createdAt,
    ...(chosenFor.length > 0 ? { chosenFor } : {}),
  };
}

export interface PlacesRead {
  // Undefined: er stond niets (een oudere back-up); het toestel houdt dan het zijne.
  list: Place[] | undefined;
  skipped: number;
}

export function migratePlaces(raw: unknown): PlacesRead {
  if (raw === undefined || raw === null) return { list: undefined, skipped: 0 };
  if (!Array.isArray(raw)) return { list: undefined, skipped: 1 };
  let skipped = 0;
  const list: Place[] = [];
  const ids = new Set<string>();
  let hasHome = false;
  for (const item of raw) {
    const read = readPlace(item);
    if (!read || ids.has(read.id)) { skipped++; continue; }
    ids.add(read.id);
    if (read.home && hasHome) {
      // Hoogstens één Thuis: de tweede blijft een gewone plek.
      const plain: Place = { ...read };
      delete plain.home;
      list.push(plain);
      continue;
    }
    if (read.home) hasHome = true;
    list.push(read);
  }
  return { list, skipped };
}

export interface SavedRoutesRead {
  list: SavedRoute[] | undefined;
  skipped: number;
}

export function migrateSavedRoutes(raw: unknown): SavedRoutesRead {
  if (raw === undefined || raw === null) return { list: undefined, skipped: 0 };
  if (!Array.isArray(raw)) return { list: undefined, skipped: 1 };
  let skipped = 0;
  const list: SavedRoute[] = [];
  const ids = new Set<string>();
  for (const item of raw) {
    const read = readSavedRoute(item);
    if (!read || ids.has(read.id)) { skipped++; continue; }
    ids.add(read.id);
    list.push(read);
  }
  return { list, skipped };
}

// Alleen de routes van een plek die er is.
export function routesOfPlaces(routes: readonly SavedRoute[], places: readonly Place[]): SavedRoute[] {
  const ids = new Set(places.map((p) => p.id));
  return routes.filter((r) => ids.has(r.placeId));
}

// Het toestel zelf: altijd een lijst, ook als er nog niets of iets kapots staat.
export const readPlaceList = (raw: unknown): Place[] => migratePlaces(raw).list ?? [];
export const readSavedRouteList = (raw: unknown): SavedRoute[] => migrateSavedRoutes(raw).list ?? [];

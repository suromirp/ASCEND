// ASCEND: Plekken en bewaarde routes, het pure deel (docs/visie/Ontwerp Plekken en routes.md, hoofdstuk 3).
// Zonder React, IndexedDB of netwerk; twee keer dezelfde invoer geeft twee keer hetzelfde. Dit bestand
// begint met wat de opslag nodig heeft (spoor 1); de rest van hoofdstuk 3 komt in spoor 2.

import { metersBetween } from './routeGeometry';
import { roundExact, validStartPoint } from './routeStart';
import type { Place, PlaceSource, SavedRoute } from '../models/place';
import type { RoutePoint } from '../models/route';

// Het vaste id en de naam van de plek Thuis. Eén vast id: twee keer migreren of twee keer hetzelfde
// punt zetten kan zo nooit twee keer Thuis geven.
export const HOME_PLACE_ID = 'place_home';
export const HOME_NAME = 'Thuis';

// Een route is een lus als het eindpunt binnen deze afstand van het begin ligt.
export const LOOP_WITHIN_M = 150;

// De plek Thuis, of geen. Er is er hoogstens één; staan er door een fout twee, dan telt de eerste.
export function homeOf(places: readonly Place[]): Place | undefined {
  return places.find((p) => p.home === true);
}

// De plek Thuis uit een punt: uit een oud Vast punt (de migratie), of uit je plek van nu of een tik op
// de kaart zolang Startpunt van je lus dat punt nog zet. Geen bruikbaar punt: geen plek.
export function homeFromStartPoint(point: unknown, today: string, source: PlaceSource = 'fixed-point'): Place | undefined {
  const valid = validStartPoint(point);
  if (!valid) return undefined;
  const { lat, lon } = roundExact(valid);
  return { id: HOME_PLACE_ID, name: HOME_NAME, lat, lon, home: true, source, createdAt: today };
}

// Thuis op een nieuw punt: naam, kenmerken, herkomst en dag blijven. Zonder Thuis komt er een nieuwe.
export function withHomePoint(places: readonly Place[], point: RoutePoint, today: string, source: PlaceSource): Place[] | undefined {
  const fresh = homeFromStartPoint(point, today, source);
  if (!fresh) return undefined;
  const home = homeOf(places);
  if (!home) return [fresh, ...places.filter((p) => p.id !== fresh.id)];
  return places.map((p) => (p === home ? { ...p, lat: fresh.lat, lon: fresh.lon } : p));
}

// Het punt van een plek, voor Startpunt van je lus.
export const placePoint = (place: Place): RoutePoint => ({ lat: place.lat, lon: place.lon });

// Of een bewaarde route een lus is. Een route van A naar B mag, en zegt dat in zijn regel.
export function isLoopRoute(route: Pick<SavedRoute, 'points'>): boolean {
  const { points } = route;
  if (points.length < 2) return false;
  return metersBetween(points[0], points[points.length - 1]) <= LOOP_WITHIN_M;
}

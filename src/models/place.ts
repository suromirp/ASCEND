// ASCEND: Plekken en bewaarde routes (docs/visie/Ontwerp Plekken en routes.md, hoofdstuk 1;
// docs/beslissingen/2026-11-11-plekken-en-routes.md, docs/beslissingen/2026-11-11-plekken-opslag.md).
//
// Een Plek is een punt waar een lus kan beginnen, met een naam die jij kent. Een pin is een plek zonder
// routes; er is geen apart ding dat pin heet. Een bewaarde Route hoort altijd bij één plek.
// Provider-neutraal: waar iets vandaan komt staat in `source`, geen veld draagt de naam van een
// leverancier. Beide gaan mee in de back-up, als twee optionele velden (`places`, `savedRoutes`).

import type { RoutePoint, RouteStyle } from './route';

// De korte vaste lijst kenmerken om uit te tikken: Heuvel, Trap, Bos of zacht pad, Vlak, Parkeren.
export type PlaceFeature = 'hill' | 'stairs' | 'forest' | 'flat' | 'parking';
export const PLACE_FEATURES: readonly PlaceFeature[] = ['hill', 'stairs', 'forest', 'flat', 'parking'];

// Waar een plek vandaan komt: het oude Vast punt, een tik op de kaart, zoeken op plaatsnaam, je plek
// van nu, de gids Trainingsplekken, een loop van je horloge, of een back-up waarin het niet stond.
export type PlaceSource = 'fixed-point' | 'map' | 'search' | 'here' | 'guide' | 'watch' | 'import';
export const PLACE_SOURCES: readonly PlaceSource[] = ['fixed-point', 'map', 'search', 'here', 'guide', 'watch', 'import'];

export interface Place {
  id: string;
  // Hoogstens PLACE_NAME_MAX tekens.
  name: string;
  // Breedte en lengte op vijf decimalen, ongeveer een meter.
  lat: number;
  lon: number;
  // Alleen als ze er zijn.
  features?: PlaceFeature[];
  // Er is hoogstens één Thuis. Hernoem je hem, dan blijft hij Thuis voor Startpunt van je lus.
  home?: true;
  source: PlaceSource;
  // De dag waarop hij is aangemaakt (JJJJ-MM-DD).
  createdAt: string;
}

// Waar een bewaarde route vandaan komt: een voorstel van de Briefing, een loop van je horloge, of een
// back-up waarin het niet stond.
export type SavedRouteSource = 'proposal' | 'watch' | 'import';
export const SAVED_ROUTE_SOURCES: readonly SavedRouteSource[] = ['proposal', 'watch', 'import'];

// Bij welke geplande training een route gekozen werd. Wanneer hij gelopen is wordt niet bewaard: dat
// volgt uit een SessionLog bij die geplande training, net als de status van een sessie.
export interface SavedRouteChoice {
  date: string;
  plannedSessionId: string;
}

export interface SavedRoute {
  id: string;
  placeId: string;
  // Vanzelf "Avontuurlijk 8,2 km", aan te passen. Hoogstens ROUTE_NAME_MAX tekens.
  name: string;
  source: SavedRouteSource;
  // Alleen bij een voorstel.
  style?: RouteStyle;
  distanceM: number;
  ascentM: number;
  // Hoogstens ROUTE_MAX_POINTS punten, met hoogte waar die er is. Of het een lus is wordt niet bewaard:
  // dat volgt uit het eerste en het laatste punt (engine/places.ts#isLoopRoute).
  points: RoutePoint[];
  // De dag waarop hij is bewaard (JJJJ-MM-DD).
  createdAt: string;
  chosenFor?: SavedRouteChoice[];
}

export const PLACE_NAME_MAX = 40;
export const ROUTE_NAME_MAX = 60;
export const ROUTE_MAX_POINTS = 800;

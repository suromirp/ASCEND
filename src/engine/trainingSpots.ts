import { formatNumberNL } from '../utils/number';
// ASCEND — distance and how to get there, for the training spots
// (data/trainingSpots.ts). Pure and local: the home location never leaves
// the device; distances are straight-line with a route factor, so they are
// estimates and the page says so.

import type { SpotUse, TrainingSpot } from '../data/trainingSpots';

export interface HomeLocation {
  name: string;
  lat: number;
  lon: number;
}

export function straightKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// ASCEND_HEURISTIC(ROUTE-FACTOR): roads and bike paths are ~20-40% longer
// than a straight line (Trainingsplekken research); 1.3 in between.
const ROUTE_FACTOR = 1.3;
const BIKE_KMH = 22; // relaxed road-bike pace, including stops
const CAR_KMH = 65; // mixed roads, door to door
export const MAX_BIKE_KM = 35; // one way; further than this, take the car or train

export interface TravelAdvice {
  routeKm: number;
  mode: 'lopen' | 'fiets' | 'auto';
  minutes: number;
  text: string;
}

export function travelAdvice(home: HomeLocation, spot: TrainingSpot): TravelAdvice {
  const routeKm = Math.round(straightKm(home, spot) * ROUTE_FACTOR);
  if (routeKm <= 3) {
    return { routeKm, mode: 'lopen', minutes: Math.round(routeKm * 12), text: `±${formatNumberNL(routeKm, 1)} km: lopend of hardlopend te bereiken, dat is meteen je warming-up.` };
  }
  if (routeKm <= MAX_BIKE_KM) {
    const minutes = Math.round((routeKm / BIKE_KMH) * 60);
    return { routeKm, mode: 'fiets', minutes, text: `±${formatNumberNL(routeKm, 1)} km, ±${minutes} min fietsen. Heen en terug telt als een rustige fietstraining.` };
  }
  const minutes = Math.round((routeKm / CAR_KMH) * 60);
  const train = spot.station ? ` Of met de trein naar ${spot.station.name}, dan ±${formatNumberNL(Math.round(spot.station.km * ROUTE_FACTOR * 10) / 10, 1)} km lopen.` : '';
  return { routeKm, mode: 'auto', minutes, text: `±${formatNumberNL(routeKm, 1)} km, ±${minutes} min met de auto.${train}` };
}

export function spotsByDistance(spots: TrainingSpot[], home: HomeLocation | undefined, use?: SpotUse): TrainingSpot[] {
  const filtered = use ? spots.filter((s) => s.uses.includes(use)) : spots;
  if (!home) return [...filtered].sort((a, b) => (a.region === b.region ? a.name.localeCompare(b.name, 'nl') : a.region === 'utrecht' ? -1 : 1));
  return [...filtered].sort((a, b) => straightKm(home, a) - straightKm(home, b));
}

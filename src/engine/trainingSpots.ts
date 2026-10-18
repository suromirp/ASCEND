import { formatNumberNL } from '../utils/number';
// ASCEND — distance and how to get there, for the training spots
// (data/trainingSpots.ts). Pure and local: the home location never leaves
// the device; distances are straight-line with a route factor, so they are
// estimates and the page says so.

import type { SpotSession, SpotUse, TrainingSpot } from '../data/trainingSpots';

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

// Which catalogue trainings fit a spot. Spots researched in detail list
// them with a concrete "how"; the others derive them from what the spot
// offers.
const USE_TRAININGS: Record<SpotUse, string[]> = {
  bergop: ['tpl_bergconditie', 'tpl_mountain_hike'],
  bergaf: ['tpl_hills_descent'],
  trap: ['tpl_bergconditie', 'tpl_hills_descent'],
  rugzak: ['tpl_ruck_walk', 'tpl_mountain_hike'],
  heuvelintervallen: ['tpl_hill_intervals'],
  'lange tocht': ['tpl_mountain_hike', 'tpl_long_run'],
  vlak: ['tpl_tempo_run', 'tpl_intervals', 'tpl_test_run'],
  duurloop: ['tpl_easy_run', 'tpl_long_run'],
};

export function spotTrainings(spot: TrainingSpot): string[] {
  if (spot.sessions) return spot.sessions.map((s) => s.templateId);
  return [...new Set(spot.uses.flatMap((u) => USE_TRAININGS[u]))];
}

export function spotSession(spot: TrainingSpot, templateIds: string[]): SpotSession | undefined {
  return spot.sessions?.find((s) => templateIds.includes(s.templateId));
}

// The filters on the Trainingsplekken page, by training.
export interface TrainingFilter {
  label: string;
  templateIds: string[];
}

export const TRAINING_FILTERS: TrainingFilter[] = [
  { label: 'Heuvelintervallen', templateIds: ['tpl_hill_intervals'] },
  { label: 'Heuvels op en af', templateIds: ['tpl_hills_descent'] },
  { label: 'Bergop en trap', templateIds: ['tpl_bergconditie'] },
  { label: 'Rugzak', templateIds: ['tpl_ruck_walk'] },
  { label: 'Bergtocht', templateIds: ['tpl_mountain_hike', 'tpl_hike_day_one'] },
  { label: 'Duurloop', templateIds: ['tpl_long_run', 'tpl_easy_run', 'tpl_recovery_run', 'tpl_strides_run', 'tpl_fartlek', 'tpl_progression_run'] },
  { label: 'Tempo en intervallen', templateIds: ['tpl_tempo_run', 'tpl_intervals'] },
  { label: 'Testloop', templateIds: ['tpl_test_run', 'tpl_race'] },
];

export function filterForTraining(templateId: string | undefined): TrainingFilter | undefined {
  return templateId ? TRAINING_FILTERS.find((f) => f.templateIds.includes(templateId)) : undefined;
}

// Spots for a training, nearest first; a spot where it only fits in a
// limited way comes after the ones that suit it well.
export function spotsForTraining(spots: TrainingSpot[], home: HomeLocation | undefined, filter?: TrainingFilter): TrainingSpot[] {
  const sorted = spotsByDistance(spots, home);
  if (!filter) return sorted;
  const fits = sorted.filter((s) => spotTrainings(s).some((id) => filter.templateIds.includes(id)));
  const limited = (s: TrainingSpot) => (spotSession(s, filter.templateIds)?.limited ? 1 : 0);
  return [...fits].sort((a, b) => limited(a) - limited(b));
}

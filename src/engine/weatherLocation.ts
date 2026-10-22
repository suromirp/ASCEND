// ASCEND: "Weer volgt je locatie". Pure beslissingen, geen browser.
//
// Heb je ooit "Gebruik mijn locatie" gekozen, dan heet je plaats "Mijn locatie".
// Staat de instelling aan, dan werkt ASCEND die plek bij als je de app opent,
// zodat het weer klopt op vakantie of tijdens een tocht. Drie vangrails:
//   1. Alleen een plaats die "Mijn locatie" heet. Een plaats die je zelf
//      zocht blijft zoals je haar koos.
//   2. Alleen als de toestemming al gegeven is: er komt nooit ongevraagd een
//      venster.
//   3. Hoogstens eens per uur.

import type { WeatherPlace } from '../models/weather';

export const MY_LOCATION_NAME = 'Mijn locatie';
export const LOCATION_CHECK_MINUTES = 60;

export type LocationPermission = 'granted' | 'denied' | 'prompt' | 'unknown';

export function isMyLocation(place: Pick<WeatherPlace, 'name'> | undefined): boolean {
  return place?.name === MY_LOCATION_NAME;
}

export interface FollowInput {
  // De instelling "Weer volgt je locatie" (standaard aan).
  enabled: boolean;
  place: Pick<WeatherPlace, 'name'> | undefined;
  permission: LocationPermission;
  lastCheckedAt: string | undefined;
  now: Date;
}

export type FollowSkip = 'uit' | 'eigen-plaats' | 'geen-toestemming' | 'te-vroeg';

// Waarom ASCEND de plek nu niet bijwerkt, of undefined als het wel mag.
export function followSkipReason(input: FollowInput): FollowSkip | undefined {
  if (!input.enabled) return 'uit';
  if (!isMyLocation(input.place)) return 'eigen-plaats';
  if (input.permission !== 'granted') return 'geen-toestemming';
  const last = input.lastCheckedAt ? Date.parse(input.lastCheckedAt) : NaN;
  if (Number.isFinite(last) && input.now.getTime() - last < LOCATION_CHECK_MINUTES * 60_000) return 'te-vroeg';
  return undefined;
}

export function myLocation(lat: number, lon: number): WeatherPlace {
  return { name: MY_LOCATION_NAME, lat, lon };
}

// Dezelfde plek op een kilometer na telt als niet verplaatst.
export function movedTo(current: Pick<WeatherPlace, 'lat' | 'lon'> | undefined, found: Pick<WeatherPlace, 'lat' | 'lon'>): boolean {
  if (!current) return true;
  return Math.abs(current.lat - found.lat) >= 0.005 || Math.abs(current.lon - found.lon) >= 0.005;
}

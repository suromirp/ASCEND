// ASCEND: de luchtkwaliteit van de komende dagen, op dit toestel bewaard
// (engine/airQuality.ts). Eén record onder een eigen sleutel, een cache van Open-Meteo: het gaat
// nooit mee in de back-up. Opgehaald hoogstens eens per drie uur voor dezelfde plek, en alleen
// als het scherm erom vraagt (een harde training buiten). Gooit nooit: zonder antwoord is er
// gewoon geen regel.

import { MetaRepo } from './database';
import { fetchAirQuality, roundCoordinate, type AirQualityForecast, type FetchOptions } from '../integrations/openMeteo';
import type { WeatherPlace } from '../models/weather';

const KEY = 'airQuality';
export const AIR_FETCH_MINUTES = 180;

const samePlace = (a: WeatherPlace, b: WeatherPlace) => roundCoordinate(a.lat) === roundCoordinate(b.lat) && roundCoordinate(a.lon) === roundCoordinate(b.lon);

export async function getAirQuality(): Promise<AirQualityForecast | undefined> {
  try {
    const f = await MetaRepo.get<AirQualityForecast>(KEY);
    return f && typeof f.fetchedAt === 'string' && Array.isArray(f.hours) && typeof f.place?.lat === 'number' ? f : undefined;
  } catch {
    return undefined;
  }
}

let inFlight: Promise<AirQualityForecast | undefined> | undefined;

// De bewaarde voorspelling als die vers genoeg is, anders een nieuwe. Bij een fout blijft de oude
// van dezelfde plek staan.
export function refreshAirQuality(place: WeatherPlace, options: FetchOptions & { now?: Date } = {}): Promise<AirQualityForecast | undefined> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const now = options.now ?? new Date();
    const have = await getAirQuality();
    const fresh = have && samePlace(have.place, place) && now.getTime() - Date.parse(have.fetchedAt) < AIR_FETCH_MINUTES * 60_000;
    if (fresh) return have;
    try {
      const next = await fetchAirQuality(place, { fetchImpl: options.fetchImpl, now });
      await MetaRepo.set(KEY, next);
      return next;
    } catch {
      return have && samePlace(have.place, place) ? have : undefined;
    }
  })().finally(() => {
    inFlight = undefined;
  });
  return inFlight;
}

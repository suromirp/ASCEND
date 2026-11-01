// ASCEND: het bergweer op de hoogte van je tocht, op dit toestel bewaard (engine/mountainWeather.ts).
// Eén record onder een eigen sleutel, een cache van Open-Meteo: het gaat nooit mee in de back-up.
// Opgehaald hoogstens eens per uur voor dezelfde plek en hoogte, zoals het gewone weer
// (storage/weather.ts#MIN_FETCH_INTERVAL_MINUTES), en alleen als Vandaag erom vraagt: een tochtdag
// in de bergen of de sneeuw. Gooit nooit: zonder antwoord blijft de vorige van dezelfde plek staan,
// of is er gewoon geen regel.

import { MetaRepo } from './database';
import { fetchMountainForecast, roundCoordinate, type FetchOptions, type MountainForecast } from '../integrations/openMeteo';
import type { WeatherPlace } from '../models/weather';
import { MIN_FETCH_INTERVAL_MINUTES } from './weather';

const KEY = 'mountainWeather';

const same = (f: MountainForecast, place: WeatherPlace, elevationM: number) =>
  roundCoordinate(f.place.lat) === roundCoordinate(place.lat) && roundCoordinate(f.place.lon) === roundCoordinate(place.lon) && f.elevationM === Math.round(elevationM);

export async function getMountainWeather(): Promise<MountainForecast | undefined> {
  try {
    const f = await MetaRepo.get<MountainForecast>(KEY);
    return f && typeof f.fetchedAt === 'string' && Array.isArray(f.hours) && typeof f.place?.lat === 'number' && typeof f.elevationM === 'number' ? f : undefined;
  } catch {
    return undefined;
  }
}

let inFlight: Promise<MountainForecast | undefined> | undefined;

export function refreshMountainWeather(place: WeatherPlace, elevationM: number, options: FetchOptions & { now?: Date } = {}): Promise<MountainForecast | undefined> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const now = options.now ?? new Date();
    const have = await getMountainWeather();
    const fresh = have && same(have, place, elevationM) && now.getTime() - Date.parse(have.fetchedAt) < MIN_FETCH_INTERVAL_MINUTES * 60_000;
    if (fresh) return have;
    try {
      const next = await fetchMountainForecast(place, elevationM, { fetchImpl: options.fetchImpl, now });
      await MetaRepo.set(KEY, next);
      return next;
    } catch {
      return have && same(have, place, elevationM) ? have : undefined;
    }
  })().finally(() => {
    inFlight = undefined;
  });
  return inFlight;
}

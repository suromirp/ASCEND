// ASCEND: de regen van het komende uur per kwartier (engine/rainSoon.ts). Alleen in het geheugen
// bewaard en hoogstens eens per tien minuten opgehaald voor dezelfde plek: kwartierdata is na een
// half uur oud en hoort nooit in een back-up of op schijf. Met een grens van tien seconden en
// zonder fout naar buiten: zonder antwoord is er gewoon geen regel.

import { fetchRainSoon, roundCoordinate, type FetchOptions, type RainSoonForecast } from '../integrations/openMeteo';
import type { WeatherPlace } from '../models/weather';

export const RAIN_FETCH_MINUTES = 10;
export const RAIN_FETCH_LIMIT_MS = 10_000;

let cached: RainSoonForecast | undefined;
// Per plek (afgeronde positie), zodat een tweede plek niet het antwoord van de eerste krijgt.
const inFlight = new Map<string, Promise<RainSoonForecast | undefined>>();

const placeKey = (place: WeatherPlace) => `${roundCoordinate(place.lat)},${roundCoordinate(place.lon)}`;

const samePlace = (a: WeatherPlace, b: WeatherPlace) => roundCoordinate(a.lat) === roundCoordinate(b.lat) && roundCoordinate(a.lon) === roundCoordinate(b.lon);

export function clearRainSoonCache(): void {
  cached = undefined;
  inFlight.clear();
}

export function refreshRainSoon(place: WeatherPlace, options: FetchOptions & { now?: Date; limitMs?: number } = {}): Promise<RainSoonForecast | undefined> {
  const now = options.now ?? new Date();
  if (cached && samePlace(cached.place, place) && now.getTime() - Date.parse(cached.fetchedAt) < RAIN_FETCH_MINUTES * 60_000) return Promise.resolve(cached);
  const key = placeKey(place);
  const running = inFlight.get(key);
  if (running) return running;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const limit = new Promise<undefined>((resolve) => { timer = setTimeout(() => resolve(undefined), options.limitMs ?? RAIN_FETCH_LIMIT_MS); });
  const fetching = (async () => {
    try {
      const next = await fetchRainSoon(place, { fetchImpl: options.fetchImpl, now });
      cached = next;
      return next;
    } catch {
      return undefined;
    }
  })();
  const pending: Promise<RainSoonForecast | undefined> = Promise.race([fetching, limit]).finally(() => {
    clearTimeout(timer);
    if (inFlight.get(key) === pending) inFlight.delete(key);
  });
  inFlight.set(key, pending);
  return pending;
}

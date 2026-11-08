// ASCEND: de regen van het komende uur per kwartier (engine/rainSoon.ts). Alleen in het geheugen
// bewaard en hoogstens eens per tien minuten opgehaald voor dezelfde plek: kwartierdata is na een
// half uur oud en hoort nooit in een back-up of op schijf. Met een grens van tien seconden en
// zonder fout naar buiten: zonder antwoord is er gewoon geen regel.

import { fetchRainSoon, roundCoordinate, type FetchOptions, type RainSoonForecast } from '../integrations/openMeteo';
import type { WeatherPlace } from '../models/weather';

export const RAIN_FETCH_MINUTES = 10;
export const RAIN_FETCH_LIMIT_MS = 10_000;

let cached: RainSoonForecast | undefined;
let inFlight: Promise<RainSoonForecast | undefined> | undefined;

const samePlace = (a: WeatherPlace, b: WeatherPlace) => roundCoordinate(a.lat) === roundCoordinate(b.lat) && roundCoordinate(a.lon) === roundCoordinate(b.lon);

export function clearRainSoonCache(): void {
  cached = undefined;
  inFlight = undefined;
}

export function refreshRainSoon(place: WeatherPlace, options: FetchOptions & { now?: Date; limitMs?: number } = {}): Promise<RainSoonForecast | undefined> {
  const now = options.now ?? new Date();
  if (cached && samePlace(cached.place, place) && now.getTime() - Date.parse(cached.fetchedAt) < RAIN_FETCH_MINUTES * 60_000) return Promise.resolve(cached);
  if (inFlight) return inFlight;
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
  inFlight = Promise.race([fetching, limit]).finally(() => {
    clearTimeout(timer);
    inFlight = undefined;
  });
  return inFlight;
}

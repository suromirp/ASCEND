// ASCEND: het weer voor de waarschuwingen, per plek op dit toestel bewaard (engine/weatherWarnings.ts).
// Een cache van Open-Meteo onder een eigen sleutel: het gaat nooit mee in de back-up. Per plek
// (afgerond op twee decimalen) hoogstens eens per uur opgehaald, met een grens van tien seconden.
// Gooit nooit: zonder antwoord blijft de vorige van dezelfde plek staan, of is er gewoon geen regel.

import { MetaRepo } from './database';
import { roundCoordinate, type FetchOptions } from '../integrations/openMeteo';
import { fetchWarningForecast, type WarningForecast } from '../integrations/openMeteoWarnings';
import type { WeatherPlace } from '../models/weather';

const KEY = 'weatherWarnings';
export const WARNING_FETCH_MINUTES = 60;
export const WARNING_FETCH_LIMIT_MS = 10_000;
// Hoogstens zoveel plekken bewaard: thuis, de tocht en een reserve.
const MAX_PLACES = 4;

const placeKey = (p: WeatherPlace) => `${roundCoordinate(p.lat)},${roundCoordinate(p.lon)}`;

const valid = (f: unknown): f is WarningForecast => {
  const x = f as WarningForecast | null;
  return !!x && typeof x.fetchedAt === 'string' && Array.isArray(x.hours) && typeof x.place?.lat === 'number' && typeof x.place?.lon === 'number' && typeof x.utcOffsetSec === 'number';
};

async function readAll(): Promise<WarningForecast[]> {
  try {
    const all = await MetaRepo.get<unknown>(KEY);
    return Array.isArray(all) ? all.filter(valid) : [];
  } catch {
    return [];
  }
}

export async function getWarningForecast(place: WeatherPlace): Promise<WarningForecast | undefined> {
  return (await readAll()).find((f) => placeKey(f.place) === placeKey(place));
}

const inFlight = new Map<string, Promise<WarningForecast | undefined>>();

export function refreshWarningForecast(place: WeatherPlace, options: FetchOptions & { now?: Date; limitMs?: number } = {}): Promise<WarningForecast | undefined> {
  const key = placeKey(place);
  const running = inFlight.get(key);
  if (running) return running;
  const now = options.now ?? new Date();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const work = (async () => {
    const all = await readAll();
    const have = all.find((f) => placeKey(f.place) === key);
    if (have && now.getTime() - Date.parse(have.fetchedAt) < WARNING_FETCH_MINUTES * 60_000) return have;
    const limit = new Promise<undefined>((resolve) => { timer = setTimeout(() => resolve(undefined), options.limitMs ?? WARNING_FETCH_LIMIT_MS); });
    const fetching = fetchWarningForecast(place, { fetchImpl: options.fetchImpl, now }).catch(() => undefined);
    const next = await Promise.race([fetching, limit]);
    if (!next) return have;
    try {
      const rest = all.filter((f) => placeKey(f.place) !== key);
      await MetaRepo.set(KEY, [next, ...rest].slice(0, MAX_PLACES));
    } catch {
      // Niet bewaard: de regel van nu klopt toch, de volgende keer wordt opnieuw gevraagd.
    }
    return next;
  })().catch(() => undefined).finally(() => {
    clearTimeout(timer);
    inFlight.delete(key);
  });
  inFlight.set(key, work);
  return work;
}

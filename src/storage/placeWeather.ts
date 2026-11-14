// ASCEND: de voorspelling voor de gekozen plek in de Briefing, op dit toestel
// (besluit docs/beslissingen/2026-11-12-weer-op-de-plek.md).
//
// Eén eigen meta-sleutel naast het weer van huis (storage/weather.ts), met dezelfde regels: hoogstens
// eens per uur voor dezelfde plek, dezelfde grens in tijd (integrations/openMeteo.ts, 15 seconden), en
// twee vragers tegelijk delen één aanroep. Het is een cache van andermans data: niet in de export en
// niet in een back-up. Het weer van huis blijft onaangeroerd, dus Vandaag verandert niet; de pagina Weer
// leest deze voorspelling alleen als je uit de Briefing komt (engine/weatherPageLink.ts). Gooit nooit: een fout is een uitkomst, en dan toont het vak het weer van huis.

import { MetaRepo } from './database';
import { isFetchDue } from './weather';
import { fetchForecast, roundCoordinate, type FetchOptions } from '../integrations/openMeteo';
import type { WeatherForecast, WeatherPlace } from '../models/weather';

export const PLACE_WEATHER_KEY = 'placeWeatherForecast';

export type PlaceWeatherResult = { status: 'ok'; forecast: WeatherForecast } | { status: 'failed' };

const keyOf = (p: WeatherPlace) => `${roundCoordinate(p.lat)},${roundCoordinate(p.lon)}`;

function valid(raw: unknown): WeatherForecast | undefined {
  const f = (raw as { forecast?: Partial<WeatherForecast> } | null | undefined)?.forecast;
  const ok = !!f && typeof f.fetchedAt === 'string' && Array.isArray(f.hours) && Array.isArray(f.days) && typeof f.place?.lat === 'number' && typeof f.place?.lon === 'number';
  return ok ? (f as WeatherForecast) : undefined;
}

const inFlight = new Map<string, Promise<PlaceWeatherResult>>();

// De voorspelling voor deze plek: de bewaarde als die van dezelfde plek en jonger dan een uur is
// (geen aanroep), anders een nieuwe. Mislukt lezen, ophalen of het antwoord: 'failed'.
export function loadPlaceWeather(place: WeatherPlace, options: FetchOptions & { now?: Date } = {}): Promise<PlaceWeatherResult> {
  const key = keyOf(place);
  const busy = inFlight.get(key);
  if (busy) return busy;
  const promise = run(place, options).finally(() => {
    inFlight.delete(key);
  });
  inFlight.set(key, promise);
  return promise;
}

async function run(place: WeatherPlace, options: FetchOptions & { now?: Date }): Promise<PlaceWeatherResult> {
  const now = options.now ?? new Date();
  try {
    const stored = valid(await MetaRepo.get<unknown>(PLACE_WEATHER_KEY));
    if (stored && !isFetchDue({ forecast: stored }, place, now)) return { status: 'ok', forecast: stored };
  } catch {
    // Opslag die niet leest: dan gewoon ophalen; bewaren mag daarna ook mislukken.
  }
  try {
    const forecast = await fetchForecast(place, { fetchImpl: options.fetchImpl, signal: options.signal, now });
    try {
      await MetaRepo.set(PLACE_WEATHER_KEY, { forecast });
    } catch {
      // Niet bewaard: de voorspelling is er nu wel; de volgende keer vraagt hij opnieuw.
    }
    return { status: 'ok', forecast };
  } catch {
    return { status: 'failed' };
  }
}

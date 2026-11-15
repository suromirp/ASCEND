// ASCEND: de voorspelling voor de gekozen plek in de Briefing, op dit toestel
// (besluit docs/beslissingen/2026-11-12-weer-op-de-plek.md).
//
// Eén eigen meta-sleutel naast het weer van huis (storage/weather.ts), met een voorspelling per plek
// (hoogstens zes, de nieuwste blijven; I-37): wisselen tussen twee verre plekken haalt binnen het uur
// niets opnieuw op. Dezelfde regels als het weer van huis: hoogstens eens per uur voor dezelfde plek, dezelfde grens in tijd (integrations/openMeteo.ts, 15 seconden), en
// twee vragers tegelijk delen één aanroep. Het is een cache van andermans data: niet in de export en
// niet in een back-up. Het weer van huis blijft onaangeroerd, dus Vandaag verandert niet; de pagina Weer
// leest deze voorspelling alleen als je uit de Briefing komt (engine/weatherPageLink.ts). Gooit nooit: een fout is een uitkomst, en dan toont het vak het weer van huis.

import { MetaRepo } from './database';
import { isFetchDue } from './weather';
import { fetchForecast, roundCoordinate, type FetchOptions } from '../integrations/openMeteo';
import type { WeatherForecast, WeatherPlace } from '../models/weather';

export const PLACE_WEATHER_KEY = 'placeWeatherForecast';

export type PlaceWeatherResult = { status: 'ok'; forecast: WeatherForecast } | { status: 'failed' };

// Hoeveel plekken de cache onthoudt. Meer verre plekken in een paar uur is zeldzaam; de oudste valt af.
export const MAX_CACHED_PLACES = 6;

const keyOf = (p: { lat: number; lon: number }) => `${roundCoordinate(p.lat)},${roundCoordinate(p.lon)}`;

function validForecast(raw: unknown): WeatherForecast | undefined {
  const f = raw as Partial<WeatherForecast> | null | undefined;
  const ok = !!f && typeof f === 'object' && typeof f.fetchedAt === 'string' && Array.isArray(f.hours) && Array.isArray(f.days) && typeof f.place?.lat === 'number' && typeof f.place?.lon === 'number';
  return ok ? (f as WeatherForecast) : undefined;
}

// De bewaarde voorspellingen per plek. De oude vorm (één `forecast`, tot I-37) telt als één plek: een
// cache, dus geen migratie nodig; de volgende keer bewaren schrijft de nieuwe vorm.
export function readPlaceCache(raw: unknown): Record<string, WeatherForecast> {
  const out: Record<string, WeatherForecast> = {};
  if (!raw || typeof raw !== 'object') return out;
  const old = validForecast((raw as { forecast?: unknown }).forecast);
  if (old) out[keyOf(old.place)] = old;
  const places = (raw as { places?: unknown }).places;
  if (places && typeof places === 'object' && !Array.isArray(places)) {
    for (const value of Object.values(places as Record<string, unknown>)) {
      const f = validForecast(value);
      if (f) out[keyOf(f.place)] = f;
    }
  }
  return out;
}

// Een nieuwe voorspelling erbij; de nieuwste MAX_CACHED_PLACES blijven.
export function withForecast(cache: Record<string, WeatherForecast>, forecast: WeatherForecast): { places: Record<string, WeatherForecast> } {
  const kept = Object.values({ ...cache, [keyOf(forecast.place)]: forecast })
    .sort((a, b) => b.fetchedAt.localeCompare(a.fetchedAt))
    .slice(0, MAX_CACHED_PLACES);
  return { places: Object.fromEntries(kept.map((f) => [keyOf(f.place), f])) };
}

const inFlight = new Map<string, Promise<PlaceWeatherResult>>();

// De voorspelling voor deze plek: de bewaarde als die van dezelfde plek en jonger dan een uur is
// (geen aanroep), anders een nieuwe. Mislukt lezen, ophalen of het antwoord: 'failed'.
// `force`: altijd ophalen (Nu verversen op de pagina Weer); de grens in tijd blijft.
export function loadPlaceWeather(place: WeatherPlace, options: FetchOptions & { now?: Date; force?: boolean } = {}): Promise<PlaceWeatherResult> {
  const key = keyOf(place);
  const busy = inFlight.get(key);
  if (busy) return busy;
  const promise = run(place, options).finally(() => {
    inFlight.delete(key);
  });
  inFlight.set(key, promise);
  return promise;
}

async function run(place: WeatherPlace, options: FetchOptions & { now?: Date; force?: boolean }): Promise<PlaceWeatherResult> {
  const now = options.now ?? new Date();
  if (!options.force) {
    try {
      const stored = readPlaceCache(await MetaRepo.get<unknown>(PLACE_WEATHER_KEY))[keyOf(place)];
      if (stored && !isFetchDue({ forecast: stored }, place, now)) return { status: 'ok', forecast: stored };
    } catch {
      // Opslag die niet leest: dan gewoon ophalen; bewaren mag daarna ook mislukken.
    }
  }
  try {
    const forecast = await fetchForecast(place, { fetchImpl: options.fetchImpl, signal: options.signal, now });
    try {
      // Opnieuw lezen vlak voor het schrijven: een andere plek die intussen binnenkwam blijft staan.
      const current = readPlaceCache(await MetaRepo.get<unknown>(PLACE_WEATHER_KEY).catch(() => undefined));
      await MetaRepo.set(PLACE_WEATHER_KEY, withForecast(current, forecast));
    } catch {
      // Niet bewaard: de voorspelling is er nu wel; de volgende keer vraagt hij opnieuw.
    }
    return { status: 'ok', forecast };
  } catch {
    return { status: 'failed' };
  }
}

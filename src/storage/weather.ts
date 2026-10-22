// ASCEND: the last weather forecast, kept on this device.
//
// One record under its own meta key: the forecast of the last successful
// fetch (so Today still shows the weather offline, with "bijgewerkt om ...")
// and what the last attempt said when it failed. It is a cache of someone
// else's data, so none of it is part of the export; buildBackupEnvelope
// (storage/backup.ts) names what it exports one by one and never reads this
// key (tested in weather.test.ts). The place itself is AppSettings.homeLocation,
// the same one Trainingsplekken uses, and follows the existing rules for that.

import { MetaRepo } from './database';
import { fetchForecast, openMeteoErrorMessage, roundCoordinate, type FetchOptions } from '../integrations/openMeteo';
import type { WeatherForecast, WeatherPlace } from '../models/weather';

const STATE_KEY = 'weatherForecast';

// At most once an hour for the same place.
export const MIN_FETCH_INTERVAL_MINUTES = 60;

export interface WeatherState {
  forecast?: WeatherForecast;
  // What the last attempt said when it failed; cleared by the next success.
  lastError?: string;
}

export async function getWeatherState(): Promise<WeatherState> {
  const stored = await MetaRepo.get<Partial<WeatherState>>(STATE_KEY);
  const f = stored?.forecast;
  const valid = !!f && typeof f.fetchedAt === 'string' && Array.isArray(f.hours) && Array.isArray(f.days) && typeof f.place?.lat === 'number' && typeof f.place?.lon === 'number';
  return { forecast: valid ? f : undefined, lastError: typeof stored?.lastError === 'string' ? stored.lastError : undefined };
}

async function putWeatherState(state: WeatherState): Promise<void> {
  await MetaRepo.set(STATE_KEY, state);
  notifyWeatherChange();
}

// Without a place there is nothing to show: the forecast goes too.
export async function clearWeather(): Promise<void> {
  await MetaRepo.set(STATE_KEY, {});
  notifyWeatherChange();
}

// Simple change signal: the fetch runs in the background and the line on
// Today has to notice when it has finished.
const listeners = new Set<() => void>();
export function onWeatherChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function notifyWeatherChange(): void {
  listeners.forEach((l) => l());
}

const samePlace = (a: WeatherPlace, b: WeatherPlace) => roundCoordinate(a.lat) === roundCoordinate(b.lat) && roundCoordinate(a.lon) === roundCoordinate(b.lon);

// Due when there is no forecast yet, when it is of another place, or when the
// last one is an hour old.
export function isFetchDue(state: WeatherState, place: WeatherPlace, now: Date, minMinutes = MIN_FETCH_INTERVAL_MINUTES): boolean {
  const f = state.forecast;
  if (!f || !samePlace(f.place, place)) return true;
  const last = Date.parse(f.fetchedAt);
  if (!Number.isFinite(last)) return true;
  return now.getTime() - last >= minMinutes * 60_000;
}

export type WeatherSyncResult =
  | { status: 'no-place' }
  | { status: 'too-soon' }
  | { status: 'ok' }
  | { status: 'error'; message: string };

export interface WeatherSyncOptions extends FetchOptions {
  // Skip the hour's pause (the user pressed "Nu verversen").
  force?: boolean;
  now?: Date;
}

let inFlight: { place: WeatherPlace; promise: Promise<WeatherSyncResult> } | undefined;

// Reads the forecast for the place and keeps it. Never throws: a failure
// becomes a message, the last forecast stays, and the app carries on. Two
// callers at once share one request.
export function syncWeather(place: WeatherPlace | undefined, options: WeatherSyncOptions = {}): Promise<WeatherSyncResult> {
  if (!place) return Promise.resolve({ status: 'no-place' });
  if (inFlight) {
    // The same place: share the request. Another place: after it, with its own.
    return samePlace(inFlight.place, place) ? inFlight.promise : inFlight.promise.then(() => syncWeather(place, options));
  }
  const promise = run(place, options).finally(() => {
    inFlight = undefined;
  });
  inFlight = { place, promise };
  return promise;
}

async function run(place: WeatherPlace, options: WeatherSyncOptions): Promise<WeatherSyncResult> {
  const now = options.now ?? new Date();
  let state: WeatherState;
  try {
    state = await getWeatherState();
    if (!options.force && !isFetchDue(state, place, now)) return { status: 'too-soon' };
  } catch {
    return { status: 'error', message: 'ASCEND kan het opgeslagen weer niet lezen.' };
  }
  try {
    const forecast = await fetchForecast(place, { fetchImpl: options.fetchImpl, now });
    await putWeatherState({ forecast, lastError: undefined });
    return { status: 'ok' };
  } catch (err) {
    const message = openMeteoErrorMessage(err);
    try {
      // The old forecast of the same place stays: better stale than nothing.
      // One of another place would be wrong, so that one goes.
      const keep = state.forecast && samePlace(state.forecast.place, place) ? state.forecast : undefined;
      await putWeatherState({ forecast: keep, lastError: message });
    } catch {
      // Storage trouble on top of a fetch problem: the message still reaches the caller.
    }
    return { status: 'error', message };
  }
}

// ASCEND: the weather forecast for your place, read from the stored copy and
// kept fresh in the background (storage/weather.ts: at most once an hour, and
// the last forecast stays when the phone is offline).
//
// Used once, by AppDataProvider, so Today, the training explanation, the Weer
// page and the advice (rule WEATHER-SWAP) all read the same forecast.

import { useCallback, useEffect, useState } from 'react';
import type { WeatherForecast, WeatherPlace } from '../models/weather';
import { getWeatherState, onWeatherChange, syncWeather, type WeatherState, type WeatherSyncResult } from '../storage/weather';
import { roundCoordinate } from '../integrations/openMeteo';

export interface WeatherView {
  // The place the forecast is for; absent until one is chosen.
  place?: WeatherPlace;
  // Only ever a forecast of that place: one of an earlier place is not shown.
  forecast?: WeatherForecast;
  lastError?: string;
  loaded: boolean;
  // Fetch now, whatever the hour's pause says (the Weer page).
  refresh: () => Promise<WeatherSyncResult>;
}

const same = (a: WeatherPlace, b: WeatherPlace) => roundCoordinate(a.lat) === roundCoordinate(b.lat) && roundCoordinate(a.lon) === roundCoordinate(b.lon);

export function useWeatherForecast(place: WeatherPlace | undefined, enabled: boolean): WeatherView {
  const [state, setState] = useState<WeatherState | null>(null);
  const lat = place?.lat;
  const lon = place?.lon;
  const name = place?.name;

  useEffect(() => {
    let alive = true;
    const load = () => void getWeatherState().then((s) => alive && setState(s)).catch(() => alive && setState({}));
    load();
    const stop = onWeatherChange(load);
    return () => {
      alive = false;
      stop();
    };
  }, []);

  // At the start, when the place changes, and when the app comes back to the
  // front or the phone gets its connection back. The hour's pause lives in
  // syncWeather, so asking often costs nothing.
  useEffect(() => {
    if (!enabled || lat === undefined || lon === undefined) return;
    const here = { name: name ?? '', lat, lon };
    const sync = () => void syncWeather(here).catch(() => undefined);
    sync();
    const onVisible = () => { if (document.visibilityState === 'visible') sync(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', sync);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', sync);
    };
  }, [enabled, lat, lon, name]);

  const refresh = useCallback(
    () => syncWeather(lat !== undefined && lon !== undefined ? { name: name ?? '', lat, lon } : undefined, { force: true }),
    [lat, lon, name],
  );

  const forecast = state?.forecast && place && same(state.forecast.place, place) ? state.forecast : undefined;
  return { place, forecast, lastError: state?.lastError, loaded: state !== null, refresh };
}

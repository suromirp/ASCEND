// ASCEND: haalt de voorspelling voor de gekozen plek op (storage/placeWeather.ts) voor de Briefing.
// Welke plek en wat het vak toont beslist engine/placeWeather.ts; dit rekent niets zelf.

import { useEffect, useState } from 'react';
import type { WeatherPlace } from '../models/weather';
import type { PlaceWeatherState } from '../engine/placeWeather';
import { loadPlaceWeather } from '../storage/placeWeather';

export function usePlaceWeather(target: WeatherPlace | undefined): PlaceWeatherState | undefined {
  const lat = target?.lat;
  const lon = target?.lon;
  const key = lat === undefined || lon === undefined ? undefined : `${lat},${lon}`;
  const [found, setFound] = useState<{ key: string; state: PlaceWeatherState } | undefined>();

  useEffect(() => {
    if (key === undefined || lat === undefined || lon === undefined) return;
    let alive = true;
    void loadPlaceWeather({ name: '', lat, lon }).then(
      (result) => alive && setFound({ key, state: result.status === 'ok' ? { status: 'ok', forecast: result.forecast } : { status: 'failed' } }),
      () => alive && setFound({ key, state: { status: 'failed' } }),
    );
    return () => {
      alive = false;
    };
  }, [key, lat, lon]);

  if (key === undefined) return undefined;
  return found?.key === key ? found.state : { status: 'loading' };
}

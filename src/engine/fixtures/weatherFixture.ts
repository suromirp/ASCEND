// Made-up forecasts for the weather tests. Nothing here is a real place.

import type { WeatherDay, WeatherForecast, WeatherHour } from '../../models/weather';
import { addDays } from '../../utils/dates';

const pad = (n: number) => String(n).padStart(2, '0');

export const MILD: Omit<WeatherHour, 'time'> = { tempC: 14, feelsC: 14, precipMm: 0, precipProb: 5, windKmh: 12, gustKmh: 20, code: 3 };

// Seven mild days from `start`; `tweak` changes single hours.
export function makeForecast(
  start: string,
  tweak: (date: string, hour: number) => Partial<WeatherHour> | undefined = () => undefined,
  options: { sunrise?: string; sunset?: string; fetchedAt?: string; days?: number } = {},
): WeatherForecast {
  const hours: WeatherHour[] = [];
  const days: WeatherDay[] = [];
  for (let d = 0; d < (options.days ?? 7); d++) {
    const date = addDays(start, d);
    days.push({ date, sunrise: `${date}T${options.sunrise ?? '08:05'}`, sunset: `${date}T${options.sunset ?? '18:12'}` });
    for (let h = 0; h < 24; h++) hours.push({ ...MILD, ...tweak(date, h), time: `${date}T${pad(h)}:00` });
  }
  return { fetchedAt: options.fetchedAt ?? `${start}T06:00:00.000Z`, place: { name: 'Teststad', lat: 50, lon: 4 }, hours, days };
}

// What Open-Meteo answers, in its own shape, for the adapter tests.
export function rawOpenMeteo(date = '2026-10-22') {
  const time = Array.from({ length: 48 }, (_, i) => `${i < 24 ? date : '2026-10-23'}T${pad(i % 24)}:00`);
  const fill = (v: number) => time.map(() => v);
  return {
    latitude: 50.0,
    longitude: 4.0,
    timezone: 'Europe/Amsterdam',
    hourly: {
      time,
      temperature_2m: fill(9.3),
      apparent_temperature: fill(5.6),
      precipitation: fill(0),
      precipitation_probability: fill(15),
      wind_speed_10m: fill(20.9),
      wind_gusts_10m: fill(42.8),
      weather_code: fill(3),
    },
    daily: {
      time: [date, '2026-10-23'],
      sunrise: [`${date}T08:15`, '2026-10-23T08:17'],
      sunset: [`${date}T18:29`, '2026-10-23T18:27'],
    },
  };
}

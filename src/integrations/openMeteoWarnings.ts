// ASCEND: het weer voor de waarschuwingen bij een tocht of een lange training buiten
// (engine/weatherWarnings.ts, docs/beslissingen/2026-11-09-gr5-waarschuwingen.md).
//
//   GET https://api.open-meteo.com/v1/forecast?latitude=..&longitude=..
//       &hourly=temperature_2m,wind_gusts_10m,weather_code&timezone=auto&forecast_days=2&wind_speed_unit=kmh
//
// Hetzelfde adres en dezelfde afgeronde plek als het gewone weer (integrations/openMeteo.ts), met
// `access-control-allow-origin: *` (gecontroleerd op 9 november 2026). Meteoalarm stuurt die kop niet
// mee, dus een webapp kan de officiële waarschuwingen niet lezen; daarom drempels op dit model.
// Twee dagen: vandaag en morgen. Dit bestand is het enige dat de veldnamen kent.

import type { WeatherPlace } from '../models/weather';
import { OPEN_METEO_FORECAST_URL, OpenMeteoError, getJson, roundCoordinate, type FetchOptions } from './openMeteo';

export const WARNING_DAYS = 2;

export interface WarningHour {
  time: string; // 'YYYY-MM-DDTHH:00', klok van de plek
  tempC?: number;
  gustKmh?: number;
  code?: number; // WMO-weercode
}

export interface WarningForecast {
  fetchedAt: string;
  place: WeatherPlace;
  // Verschil tussen de klok van de plek en UTC, om "nu" op de plek te lezen.
  utcOffsetSec: number;
  hours: WarningHour[];
}

export function warningForecastUrl(place: WeatherPlace): string {
  const query = new URLSearchParams({
    latitude: String(roundCoordinate(place.lat)),
    longitude: String(roundCoordinate(place.lon)),
    hourly: 'temperature_2m,wind_gusts_10m,weather_code',
    timezone: 'auto',
    forecast_days: String(WARNING_DAYS),
    wind_speed_unit: 'kmh',
  });
  return `${OPEN_METEO_FORECAST_URL}?${query.toString().replace(/%2C/g, ',')}`;
}

const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
const isLocalTime = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v);

export function mapWarningForecast(raw: unknown, place: WeatherPlace, fetchedAt: string): WarningForecast {
  const body = raw as { hourly?: Record<string, unknown>; utc_offset_seconds?: unknown } | null;
  const h = body?.hourly;
  if (!h || !Array.isArray(h.time)) throw new OpenMeteoError('response', 'Open-Meteo gaf een antwoord dat ASCEND niet begrijpt.');
  const col = (key: string): unknown[] => (Array.isArray(h[key]) ? (h[key] as unknown[]) : []);
  const temp = col('temperature_2m');
  const gust = col('wind_gusts_10m');
  const code = col('weather_code');
  const hours: WarningHour[] = [];
  (h.time as unknown[]).forEach((time, i) => {
    if (!isLocalTime(time)) return;
    const hour: WarningHour = { time };
    const t = num(temp[i]);
    const g = num(gust[i]);
    const w = num(code[i]);
    if (t !== undefined) hour.tempC = t;
    if (g !== undefined && g >= 0) hour.gustKmh = g;
    if (w !== undefined) hour.code = w;
    if (t !== undefined || g !== undefined || w !== undefined) hours.push(hour);
  });
  if (hours.length === 0) throw new OpenMeteoError('response', 'Open-Meteo gaf een antwoord dat ASCEND niet begrijpt.');
  const offset = num(body?.utc_offset_seconds) ?? 0;
  return { fetchedAt, place: { name: place.name, lat: roundCoordinate(place.lat), lon: roundCoordinate(place.lon) }, utcOffsetSec: offset, hours };
}

export async function fetchWarningForecast(place: WeatherPlace, options: FetchOptions & { now?: Date } = {}): Promise<WarningForecast> {
  const body = await getJson(warningForecastUrl(place), options);
  return mapWarningForecast(body, place, (options.now ?? new Date()).toISOString());
}

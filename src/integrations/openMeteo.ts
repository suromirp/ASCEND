// ASCEND: Open-Meteo adapter. A forecast per hour for the coming 7 days
// (temperature, felt temperature, precipitation and its chance, wind and
// gusts, weather code) plus sunrise and sunset, and a place search.
//
// No key, no account, straight from the phone. Only a place and its
// coordinates, rounded to two decimals (about a kilometre), go out; never a
// name of the user or an exact position. Checked against the live API:
//   GET https://geocoding-api.open-meteo.com/v1/search?name=...&language=nl
//   GET https://api.open-meteo.com/v1/forecast?latitude=..&longitude=..
//       &hourly=...&daily=sunrise,sunset&timezone=auto&forecast_days=7
// Both answer with `access-control-allow-origin: *`, so a browser may ask.
//
// Weather data by Open-Meteo.com (https://open-meteo.com/), licence CC BY 4.0;
// free for non-commercial use. The credit is shown on the Weer page.
//
// The mapping from Open-Meteo's arrays to WeatherForecast is the only place
// that knows its field names.

import type { WeatherDay, WeatherForecast, WeatherHour, WeatherPlace } from '../models/weather';

export const OPEN_METEO_FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
export const OPEN_METEO_GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
export const OPEN_METEO_SITE = 'https://open-meteo.com/';
export const FORECAST_DAYS = 7;

export type OpenMeteoErrorKind = 'input' | 'rate' | 'server' | 'network' | 'response';

// An error whose message is already something to show the user.
export class OpenMeteoError extends Error {
  kind: OpenMeteoErrorKind;
  constructor(kind: OpenMeteoErrorKind, message: string) {
    super(message);
    this.name = 'OpenMeteoError';
    this.kind = kind;
  }
}

const MESSAGES: Record<Exclude<OpenMeteoErrorKind, 'input'>, string> = {
  rate: 'Open-Meteo vraagt even te wachten met opnieuw proberen. Probeer het over een kwartier nog eens.',
  server: 'Open-Meteo heeft op dit moment een storing. Probeer het later nog eens; je eigen gegevens in ASCEND zijn niet geraakt.',
  network: 'Geen verbinding met Open-Meteo. Controleer je internet en probeer het later opnieuw.',
  response: 'Open-Meteo gaf een antwoord dat ASCEND niet begrijpt. Probeer het later nog eens.',
};

// Two decimals is about a kilometre: enough for the weather, not an address.
export function roundCoordinate(value: number): number {
  return Math.round(value * 100) / 100;
}

export function roundedPlace(place: WeatherPlace): WeatherPlace {
  return { name: place.name, lat: roundCoordinate(place.lat), lon: roundCoordinate(place.lon) };
}

export function forecastUrl(place: WeatherPlace): string {
  const query = new URLSearchParams({
    latitude: String(roundCoordinate(place.lat)),
    longitude: String(roundCoordinate(place.lon)),
    hourly: 'temperature_2m,apparent_temperature,precipitation,precipitation_probability,wind_speed_10m,wind_gusts_10m,weather_code,uv_index',
    daily: 'sunrise,sunset',
    timezone: 'auto',
    forecast_days: String(FORECAST_DAYS),
    wind_speed_unit: 'kmh',
  });
  // Commas stay readable in the address; URLSearchParams escapes them.
  return `${OPEN_METEO_FORECAST_URL}?${query.toString().replace(/%2C/g, ',')}`;
}

export function geocodingUrl(name: string, count = 8): string {
  const query = new URLSearchParams({ name: name.trim(), count: String(count), language: 'nl', format: 'json' });
  return `${OPEN_METEO_GEOCODING_URL}?${query.toString()}`;
}

// --- mapping: Open-Meteo -> WeatherForecast -----------------------------------

const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
const isLocalTime = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v);

export function mapForecast(raw: unknown, place: WeatherPlace, fetchedAt: string): WeatherForecast {
  const body = raw as { hourly?: Record<string, unknown>; daily?: Record<string, unknown> } | null;
  const h = body?.hourly;
  const d = body?.daily;
  if (!h || !d || !Array.isArray(h.time) || !Array.isArray(d.time)) throw new OpenMeteoError('response', MESSAGES.response);
  const col = (key: string): unknown[] => (Array.isArray(h[key]) ? (h[key] as unknown[]) : []);
  const temp = col('temperature_2m');
  const feels = col('apparent_temperature');
  const precip = col('precipitation');
  const prob = col('precipitation_probability');
  const wind = col('wind_speed_10m');
  const gust = col('wind_gusts_10m');
  const code = col('weather_code');
  const uv = col('uv_index');

  const hours: WeatherHour[] = [];
  const seen = new Set<string>();
  (h.time as unknown[]).forEach((time, i) => {
    // An hour without its basic values is left out rather than guessed. On
    // the night the clocks go back the same local hour comes twice: the
    // first one stays.
    const tempC = num(temp[i]);
    const windKmh = num(wind[i]);
    if (!isLocalTime(time) || tempC === undefined || windKmh === undefined || seen.has(time)) return;
    seen.add(time);
    hours.push({
      time,
      tempC,
      feelsC: num(feels[i]) ?? tempC,
      precipMm: Math.max(0, num(precip[i]) ?? 0),
      precipProb: num(prob[i]),
      windKmh,
      gustKmh: num(gust[i]) ?? windKmh,
      code: num(code[i]) ?? 0,
      uvIndex: (() => { const u = num(uv[i]); return u === undefined ? undefined : Math.max(0, u); })(),
    });
  });
  if (hours.length === 0) throw new OpenMeteoError('response', MESSAGES.response);

  const sunrise = Array.isArray(d.sunrise) ? d.sunrise : [];
  const sunset = Array.isArray(d.sunset) ? d.sunset : [];
  const days: WeatherDay[] = [];
  (d.time as unknown[]).forEach((date, i) => {
    if (typeof date !== 'string' || !isLocalTime(sunrise[i]) || !isLocalTime(sunset[i])) return;
    days.push({ date, sunrise: sunrise[i] as string, sunset: sunset[i] as string });
  });

  return { fetchedAt, place: roundedPlace(place), hours, days };
}

// --- the requests --------------------------------------------------------------

const TIMEOUT_MS = 15_000;

export interface FetchOptions {
  fetchImpl?: typeof fetch;
}

async function getJson(url: string, options: FetchOptions): Promise<unknown> {
  const doFetch = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  // The timer runs until the body is read too: on a weak mobile connection the
  // headers can arrive and the body stall, which would leave "Bezig…" forever.
  try {
    let response: Response;
    try {
      response = await doFetch(url, { method: 'GET', headers: { Accept: 'application/json' }, signal: controller.signal });
    } catch {
      // Offline, blocked, timed out: all the same to the user.
      throw new OpenMeteoError('network', MESSAGES.network);
    }
    if (response.status === 429) throw new OpenMeteoError('rate', MESSAGES.rate);
    if (response.status >= 500) throw new OpenMeteoError('server', MESSAGES.server);
    if (!response.ok) throw new OpenMeteoError('response', MESSAGES.response);
    try {
      return await response.json();
    } catch {
      throw new OpenMeteoError(controller.signal.aborted ? 'network' : 'response', controller.signal.aborted ? MESSAGES.network : MESSAGES.response);
    }
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchForecast(place: WeatherPlace, options: FetchOptions & { now?: Date } = {}): Promise<WeatherForecast> {
  const body = await getJson(forecastUrl(place), options);
  return mapForecast(body, place, (options.now ?? new Date()).toISOString());
}

// A place found by name, with enough to tell two of the same name apart.
export interface PlaceResult extends WeatherPlace {
  region?: string; // province or state
  country?: string;
}

export function mapPlaces(raw: unknown): PlaceResult[] {
  const results = (raw as { results?: unknown } | null)?.results;
  // Nothing found comes back without a `results` key at all.
  if (results === undefined) return [];
  if (!Array.isArray(results)) throw new OpenMeteoError('response', MESSAGES.response);
  const out: PlaceResult[] = [];
  for (const r of results as Record<string, unknown>[]) {
    const lat = num(r?.latitude);
    const lon = num(r?.longitude);
    if (typeof r?.name !== 'string' || !r.name || lat === undefined || lon === undefined) continue;
    out.push({
      name: r.name,
      lat: roundCoordinate(lat),
      lon: roundCoordinate(lon),
      region: typeof r.admin1 === 'string' && r.admin1 !== r.name ? r.admin1 : undefined,
      country: typeof r.country === 'string' ? r.country : undefined,
    });
  }
  return out;
}

export async function searchPlaces(name: string, options: FetchOptions = {}): Promise<PlaceResult[]> {
  const query = name.trim();
  if (query.length < 2) throw new OpenMeteoError('input', 'Typ minstens twee letters van de plaats.');
  return mapPlaces(await getJson(geocodingUrl(query), options));
}

export function openMeteoErrorMessage(err: unknown): string {
  return err instanceof OpenMeteoError ? err.message : MESSAGES.network;
}

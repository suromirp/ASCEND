import { describe, it, expect, vi } from 'vitest';
import {
  OpenMeteoError,
  fetchForecast,
  forecastUrl,
  geocodingUrl,
  mapForecast,
  mapPlaces,
  openMeteoErrorMessage,
  roundCoordinate,
  searchPlaces,
} from './openMeteo';
import { rawOpenMeteo } from '../engine/fixtures/weatherFixture';

// Verzonnen plek: de coördinaten wijzen nergens heen.
const PLACE = { name: 'Teststad', lat: 50.01234, lon: 4.00678 };

function okFetch(body: unknown, status = 200) {
  return vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));
}

describe('requests', () => {
  it('rounds coordinates to two decimals and asks for the hourly fields, sunrise and sunset', () => {
    expect(roundCoordinate(50.01234)).toBe(50.01);
    expect(roundCoordinate(4.00978)).toBe(4.01);
    const url = new URL(forecastUrl(PLACE));
    expect(url.origin + url.pathname).toBe('https://api.open-meteo.com/v1/forecast');
    expect(url.searchParams.get('latitude')).toBe('50.01');
    expect(url.searchParams.get('longitude')).toBe('4.01');
    expect(url.searchParams.get('hourly')).toBe('temperature_2m,apparent_temperature,precipitation,precipitation_probability,wind_speed_10m,wind_gusts_10m,weather_code,uv_index');
    expect(url.searchParams.get('daily')).toBe('sunrise,sunset');
    expect(url.searchParams.get('forecast_days')).toBe('7');
    expect(url.searchParams.get('timezone')).toBe('auto');
    expect(url.searchParams.get('wind_speed_unit')).toBe('kmh');
    // The exact position never leaves the phone.
    expect(forecastUrl(PLACE)).not.toContain('50.012');
    expect(forecastUrl(PLACE)).not.toContain('Teststad');
  });

  it('asks the geocoding API for Dutch names', () => {
    const url = new URL(geocodingUrl(' Den Haag '));
    expect(url.origin + url.pathname).toBe('https://geocoding-api.open-meteo.com/v1/search');
    expect(url.searchParams.get('name')).toBe('Den Haag');
    expect(url.searchParams.get('language')).toBe('nl');
  });

  it('sends a plain GET with no credentials', async () => {
    const f = okFetch(rawOpenMeteo());
    await fetchForecast(PLACE, { fetchImpl: f as unknown as typeof fetch });
    const [, init] = f.mock.calls[0];
    expect(init?.method).toBe('GET');
    expect(JSON.stringify(init?.headers)).not.toMatch(/authorization/i);
  });
});

describe('mapping a forecast', () => {
  it('turns the arrays into hours and days, with the place rounded', async () => {
    const forecast = await fetchForecast(PLACE, { fetchImpl: okFetch(rawOpenMeteo()) as unknown as typeof fetch, now: new Date('2026-10-22T10:00:00Z') });
    expect(forecast.fetchedAt).toBe('2026-10-22T10:00:00.000Z');
    expect(forecast.place).toEqual({ name: 'Teststad', lat: 50.01, lon: 4.01 });
    expect(forecast.hours).toHaveLength(48);
    expect(forecast.hours[0]).toEqual({ time: '2026-10-22T00:00', tempC: 9.3, feelsC: 5.6, precipMm: 0, precipProb: 15, windKmh: 20.9, gustKmh: 42.8, code: 3 });
    expect(forecast.days[0]).toEqual({ date: '2026-10-22', sunrise: '2026-10-22T08:15', sunset: '2026-10-22T18:29' });
  });

  it('leaves out an hour without a temperature or wind, and keeps the first of a doubled hour', () => {
    const raw = rawOpenMeteo();
    raw.hourly.temperature_2m[3] = null as unknown as number;
    raw.hourly.time[5] = raw.hourly.time[4];
    raw.hourly.temperature_2m[4] = 7;
    raw.hourly.temperature_2m[5] = 99;
    const forecast = mapForecast(raw, PLACE, '2026-10-22T10:00:00.000Z');
    expect(forecast.hours.find((h) => h.time === '2026-10-22T03:00')).toBeUndefined();
    expect(forecast.hours.filter((h) => h.time === '2026-10-22T04:00')).toEqual([expect.objectContaining({ tempC: 7 })]);
  });

  it('fills a missing chance, gust and felt temperature from what is there', () => {
    const raw = rawOpenMeteo();
    delete (raw.hourly as Record<string, unknown>).precipitation_probability;
    delete (raw.hourly as Record<string, unknown>).wind_gusts_10m;
    delete (raw.hourly as Record<string, unknown>).apparent_temperature;
    const h = mapForecast(raw, PLACE, 'x').hours[0];
    expect(h.precipProb).toBeUndefined();
    expect(h.gustKmh).toBe(h.windKmh);
    expect(h.feelsC).toBe(h.tempC);
  });

  it('refuses an answer in another shape', () => {
    expect(() => mapForecast({ hourly: {}, daily: {} }, PLACE, 'x')).toThrow(OpenMeteoError);
    expect(() => mapForecast(null, PLACE, 'x')).toThrow(OpenMeteoError);
    expect(() => mapForecast({ hourly: { time: [] }, daily: { time: [] } }, PLACE, 'x')).toThrow(OpenMeteoError);
  });
});

describe('errors read as something to tell the user', () => {
  const run = (f: unknown) => fetchForecast(PLACE, { fetchImpl: f as typeof fetch });

  it('offline or blocked', async () => {
    const err = await run(vi.fn(async () => { throw new TypeError('Failed to fetch'); })).catch((e) => e);
    expect(err).toBeInstanceOf(OpenMeteoError);
    expect(err.kind).toBe('network');
    expect(openMeteoErrorMessage(err)).toMatch(/Geen verbinding/);
  });

  it('too many requests and a broken server', async () => {
    expect(await run(okFetch({}, 429)).catch((e) => e.kind)).toBe('rate');
    expect(await run(okFetch({}, 503)).catch((e) => e.kind)).toBe('server');
    expect(await run(okFetch({}, 400)).catch((e) => e.kind)).toBe('response');
  });

  it('an answer that is not JSON', async () => {
    const f = vi.fn(async () => new Response('<html>', { status: 200 }));
    expect(await run(f).catch((e) => e.kind)).toBe('response');
  });

  it('a body that stalls after the headers ends as a connection problem, not forever', async () => {
    vi.useFakeTimers();
    try {
      const f = vi.fn(async (_url: string, init?: RequestInit) => ({
        status: 200,
        ok: true,
        json: () => new Promise((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))),
      }));
      const pending = run(f).catch((e) => e.kind);
      await vi.advanceTimersByTimeAsync(16_000);
      expect(await pending).toBe('network');
    } finally {
      vi.useRealTimers();
    }
  });

  it('anything unknown reads as a connection problem', () => {
    expect(openMeteoErrorMessage(new Error('boom'))).toMatch(/Geen verbinding/);
  });
});

describe('searching a place', () => {
  const RESPONSE = {
    results: [
      { id: 1, name: 'Amersfoort', latitude: 50.1549, longitude: 4.3875, country: 'Nederland', admin1: 'Utrecht' },
      { id: 2, name: 'Amersfoort', latitude: -27.00941, longitude: 29.86643, country: 'Zuid-Afrika', admin1: 'Mpumalanga' },
      { id: 3, name: 'Zonder coordinaten' },
      { id: 4, name: 'Utrecht', latitude: 50.09, longitude: 4.12, country: 'Nederland', admin1: 'Utrecht' },
    ],
  };

  it('keeps the places with coordinates, rounded, with province and country to tell them apart', async () => {
    const found = await searchPlaces('Amersfoort', { fetchImpl: okFetch(RESPONSE) as unknown as typeof fetch });
    expect(found).toEqual([
      { name: 'Amersfoort', lat: 50.15, lon: 4.39, region: 'Utrecht', country: 'Nederland' },
      { name: 'Amersfoort', lat: -27.01, lon: 29.87, region: 'Mpumalanga', country: 'Zuid-Afrika' },
      // The province of a city with the same name adds nothing.
      { name: 'Utrecht', lat: 50.09, lon: 4.12, region: undefined, country: 'Nederland' },
    ]);
  });

  it('finds nothing without an error when the API sends no results key', async () => {
    expect(await searchPlaces('Xyzzyx', { fetchImpl: okFetch({ generationtime_ms: 0.2 }) as unknown as typeof fetch })).toEqual([]);
    expect(mapPlaces(null)).toEqual([]);
  });

  it('asks for at least two letters before it goes out', async () => {
    const f = okFetch(RESPONSE);
    await expect(searchPlaces(' a ', { fetchImpl: f as unknown as typeof fetch })).rejects.toThrow(/twee letters/);
    expect(f).not.toHaveBeenCalled();
  });
});

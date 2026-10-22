import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SettingsRepo, wipeAllData } from './database';
import { clearWeather, getWeatherState, isFetchDue, onWeatherChange, syncWeather } from './weather';
import { buildBackupEnvelope } from './backup';
import { rawOpenMeteo } from '../engine/fixtures/weatherFixture';

const PLACE = { name: 'Teststad', lat: 52.16, lon: 5.39 };
const OTHER = { name: 'Andersdorp', lat: 51.44, lon: 5.48 };
const T0 = new Date('2026-10-22T10:00:00Z');
const minutesLater = (n: number) => new Date(T0.getTime() + n * 60_000);

function okFetch() {
  return vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify(rawOpenMeteo()), { status: 200 }));
}
const asFetch = (f: unknown) => f as typeof fetch;

describe('syncWeather', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  it('does nothing without a place', async () => {
    const f = okFetch();
    expect(await syncWeather(undefined, { fetchImpl: asFetch(f), now: T0 })).toEqual({ status: 'no-place' });
    expect(f).not.toHaveBeenCalled();
    expect((await getWeatherState()).forecast).toBeUndefined();
  });

  it('fetches, keeps the forecast for offline use and tells listeners', async () => {
    const f = okFetch();
    const heard = vi.fn();
    const stop = onWeatherChange(heard);
    expect(await syncWeather(PLACE, { fetchImpl: asFetch(f), now: T0 })).toEqual({ status: 'ok' });
    stop();
    expect(f).toHaveBeenCalledTimes(1);
    expect(heard).toHaveBeenCalled();
    const state = await getWeatherState();
    expect(state.forecast?.fetchedAt).toBe(T0.toISOString());
    expect(state.forecast?.hours).toHaveLength(48);
    expect(state.forecast?.place).toEqual(PLACE);
    expect(state.lastError).toBeUndefined();
  });

  it('asks at most once an hour for the same place', async () => {
    const f = okFetch();
    await syncWeather(PLACE, { fetchImpl: asFetch(f), now: T0 });
    expect(await syncWeather(PLACE, { fetchImpl: asFetch(f), now: minutesLater(59) })).toEqual({ status: 'too-soon' });
    expect(f).toHaveBeenCalledTimes(1);
    expect(await syncWeather(PLACE, { fetchImpl: asFetch(f), now: minutesLater(60) })).toEqual({ status: 'ok' });
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('asks at once for another place, and when told to', async () => {
    const f = okFetch();
    await syncWeather(PLACE, { fetchImpl: asFetch(f), now: T0 });
    await syncWeather(OTHER, { fetchImpl: asFetch(f), now: minutesLater(1) });
    expect(f).toHaveBeenCalledTimes(2);
    expect(String(f.mock.calls[1][0])).toContain('latitude=51.44');
    await syncWeather(OTHER, { fetchImpl: asFetch(f), now: minutesLater(2), force: true });
    expect(f).toHaveBeenCalledTimes(3);
  });

  it('shares one request between two callers at once', async () => {
    const f = okFetch();
    const [a, b] = await Promise.all([
      syncWeather(PLACE, { fetchImpl: asFetch(f), now: T0 }),
      syncWeather(PLACE, { fetchImpl: asFetch(f), now: T0 }),
    ]);
    expect(a).toEqual({ status: 'ok' });
    expect(b).toEqual({ status: 'ok' });
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('keeps the last forecast and says why when the phone is offline', async () => {
    await syncWeather(PLACE, { fetchImpl: asFetch(okFetch()), now: T0 });
    const offline = vi.fn(async () => { throw new TypeError('Failed to fetch'); });
    const result = await syncWeather(PLACE, { fetchImpl: asFetch(offline), now: minutesLater(90) });
    expect(result).toMatchObject({ status: 'error', message: expect.stringContaining('Geen verbinding') });
    const state = await getWeatherState();
    expect(state.forecast?.fetchedAt).toBe(T0.toISOString());
    expect(state.lastError).toMatch(/Geen verbinding/);
    // The next success clears the message.
    await syncWeather(PLACE, { fetchImpl: asFetch(okFetch()), now: minutesLater(180) });
    expect((await getWeatherState()).lastError).toBeUndefined();
  });

  it('drops the forecast of another place when the new one cannot be fetched', async () => {
    await syncWeather(PLACE, { fetchImpl: asFetch(okFetch()), now: T0 });
    const offline = vi.fn(async () => { throw new TypeError('Failed to fetch'); });
    await syncWeather(OTHER, { fetchImpl: asFetch(offline), now: minutesLater(5) });
    const state = await getWeatherState();
    expect(state.forecast).toBeUndefined();
    expect(state.lastError).toBeDefined();
  });

  it('survives an answer it does not understand', async () => {
    const f = vi.fn(async () => new Response('{"hourly":{}}', { status: 200 }));
    const result = await syncWeather(PLACE, { fetchImpl: asFetch(f), now: T0 });
    expect(result).toMatchObject({ status: 'error' });
    expect((await getWeatherState()).forecast).toBeUndefined();
  });

  it('can be cleared', async () => {
    await syncWeather(PLACE, { fetchImpl: asFetch(okFetch()), now: T0 });
    await clearWeather();
    expect(await getWeatherState()).toEqual({ forecast: undefined, lastError: undefined });
  });

  it('reads a damaged record as empty', async () => {
    const { MetaRepo } = await import('./database');
    await MetaRepo.set('weatherForecast', { forecast: { fetchedAt: 5 } });
    expect((await getWeatherState()).forecast).toBeUndefined();
  });
});

describe('isFetchDue', () => {
  it('is due without a forecast, for another place, and after an hour', () => {
    expect(isFetchDue({}, PLACE, T0)).toBe(true);
    const state = { forecast: { fetchedAt: T0.toISOString(), place: PLACE, hours: [], days: [] } };
    expect(isFetchDue(state, PLACE, minutesLater(30))).toBe(false);
    expect(isFetchDue(state, { ...PLACE, lat: 52.1604 }, minutesLater(30))).toBe(false); // same place after rounding
    expect(isFetchDue(state, OTHER, minutesLater(30))).toBe(true);
    expect(isFetchDue(state, PLACE, minutesLater(61))).toBe(true);
    expect(isFetchDue({ forecast: { ...state.forecast, fetchedAt: 'nonsense' } }, PLACE, T0)).toBe(true);
  });
});

describe('the weather in an export', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  it('leaves the cached forecast out; the place goes with the settings like the home location always did', async () => {
    await SettingsRepo.set({ homeLocation: PLACE });
    await syncWeather(PLACE, { fetchImpl: asFetch(okFetch()), now: T0 });
    const text = JSON.stringify(await buildBackupEnvelope());
    // The cache of someone else's data is not exported.
    expect(text).not.toContain('weatherForecast');
    expect(text).not.toContain('wind_speed');
    expect(text).not.toContain('"sunrise"');
    expect(text).not.toContain('precipMm');
    // The place is the existing setting, so it follows that setting's rules.
    expect(text).toContain('"homeLocation"');
    expect((await getWeatherState()).forecast).toBeDefined();
  });
});

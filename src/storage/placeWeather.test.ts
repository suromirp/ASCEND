import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MetaRepo, wipeAllData } from './database';
import { PLACE_WEATHER_KEY, loadPlaceWeather } from './placeWeather';
import { getWeatherState, syncWeather } from './weather';
import { buildBackupEnvelope } from './backupExport';
import { rawOpenMeteo } from '../engine/fixtures/weatherFixture';

// Verzonnen plaatsen: de coördinaten wijzen nergens heen.
const HOME = { name: 'Teststad', lat: 50.01, lon: 4.01 };
const AWAY = { name: 'Verwegdal', lat: 50.72, lon: 4.01 };
const OTHER = { name: 'Andersdorp', lat: 51.52, lon: 5.03 };
const T0 = new Date('2026-10-22T10:00:00Z');
const minutesLater = (n: number) => new Date(T0.getTime() + n * 60_000);

const okFetch = () => vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify(rawOpenMeteo()), { status: 200 }));
const asFetch = (f: unknown) => f as typeof fetch;

describe('loadPlaceWeather', () => {
  beforeEach(async () => {
    await wipeAllData();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('haalt de voorspelling van de plek op, afgerond op twee decimalen', async () => {
    const f = okFetch();
    const result = await loadPlaceWeather(AWAY, { fetchImpl: asFetch(f), now: T0 });
    expect(result.status).toBe('ok');
    expect(f).toHaveBeenCalledTimes(1);
    expect(String(f.mock.calls[0][0])).toContain('latitude=50.72');
    expect(String(f.mock.calls[0][0])).toContain('longitude=4.01');
  });

  it('vraagt hoogstens eens per uur voor dezelfde plek: opnieuw openen is geen aanroep', async () => {
    const f = okFetch();
    await loadPlaceWeather(AWAY, { fetchImpl: asFetch(f), now: T0 });
    const again = await loadPlaceWeather(AWAY, { fetchImpl: asFetch(f), now: minutesLater(59) });
    expect(again.status).toBe('ok');
    expect(f).toHaveBeenCalledTimes(1);
    await loadPlaceWeather(AWAY, { fetchImpl: asFetch(f), now: minutesLater(61) });
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('een andere plek vraagt meteen opnieuw', async () => {
    const f = okFetch();
    await loadPlaceWeather(AWAY, { fetchImpl: asFetch(f), now: T0 });
    await loadPlaceWeather(OTHER, { fetchImpl: asFetch(f), now: minutesLater(5) });
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('twee vragers tegelijk delen één aanroep', async () => {
    const f = okFetch();
    const [a, b] = await Promise.all([loadPlaceWeather(AWAY, { fetchImpl: asFetch(f), now: T0 }), loadPlaceWeather(AWAY, { fetchImpl: asFetch(f), now: T0 })]);
    expect(a.status).toBe('ok');
    expect(b.status).toBe('ok');
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('een netwerkfout is een uitkomst, geen worp', async () => {
    const f = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    expect(await loadPlaceWeather(AWAY, { fetchImpl: asFetch(f), now: T0 })).toEqual({ status: 'failed' });
  });

  it('een antwoord dat niet te lezen is of een storing bij de bron: mislukt', async () => {
    const broken = vi.fn(async () => new Response('geen json', { status: 200 }));
    expect(await loadPlaceWeather(AWAY, { fetchImpl: asFetch(broken), now: T0 })).toEqual({ status: 'failed' });
    const down = vi.fn(async () => new Response('', { status: 503 }));
    expect(await loadPlaceWeather(AWAY, { fetchImpl: asFetch(down), now: T0 })).toEqual({ status: 'failed' });
  });

  it('een bron die niet antwoordt stopt na de grens in tijd van het weer (15 seconden)', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const hanging = vi.fn((_url: string, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    }));
    const pending = loadPlaceWeather(AWAY, { fetchImpl: asFetch(hanging), now: T0 });
    let settled = false;
    void pending.then(() => { settled = true; });
    await vi.advanceTimersByTimeAsync(14_000);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1_500);
    expect(await pending).toEqual({ status: 'failed' });
  });

  it('na een mislukte poging blijft de volgende gewoon werken', async () => {
    const bad = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    await loadPlaceWeather(AWAY, { fetchImpl: asFetch(bad), now: T0 });
    const f = okFetch();
    expect((await loadPlaceWeather(AWAY, { fetchImpl: asFetch(f), now: minutesLater(1) })).status).toBe('ok');
  });

  it('een beschadigde bewaarde voorspelling telt als geen', async () => {
    await MetaRepo.set(PLACE_WEATHER_KEY, { forecast: { fetchedAt: 5 } });
    const f = okFetch();
    expect((await loadPlaceWeather(AWAY, { fetchImpl: asFetch(f), now: T0 })).status).toBe('ok');
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('laat het weer van huis met rust', async () => {
    await syncWeather(HOME, { fetchImpl: asFetch(okFetch()), now: T0 });
    const before = await getWeatherState();
    await loadPlaceWeather(AWAY, { fetchImpl: asFetch(okFetch()), now: minutesLater(5) });
    expect(await getWeatherState()).toEqual(before);
    expect(before.forecast?.place.name).toBe('Teststad');
  });

  it('staat niet in de export', async () => {
    await loadPlaceWeather(AWAY, { fetchImpl: asFetch(okFetch()), now: T0 });
    const text = JSON.stringify(await buildBackupEnvelope());
    expect(text).not.toContain(PLACE_WEATHER_KEY);
    expect(text).not.toContain('Verwegdal');
    expect(text).not.toContain('precipMm');
  });
});

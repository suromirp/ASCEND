import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MetaRepo, wipeAllData } from './database';
import { MAX_CACHED_PLACES, PLACE_WEATHER_KEY, loadPlaceWeather } from './placeWeather';
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

  it('een cache per plek: terug naar de eerste plek binnen het uur is geen aanroep (I-37)', async () => {
    const f = okFetch();
    await loadPlaceWeather(AWAY, { fetchImpl: asFetch(f), now: T0 });
    await loadPlaceWeather(OTHER, { fetchImpl: asFetch(f), now: minutesLater(5) });
    const back = await loadPlaceWeather(AWAY, { fetchImpl: asFetch(f), now: minutesLater(10) });
    expect(back.status).toBe('ok');
    expect(back.status === 'ok' && back.forecast.place.lat).toBe(50.72);
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('onthoudt hoogstens zes plekken; de oudste valt af', async () => {
    const f = okFetch();
    for (let i = 0; i <= MAX_CACHED_PLACES; i++) await loadPlaceWeather({ name: '', lat: 40 + i, lon: 4 }, { fetchImpl: asFetch(f), now: minutesLater(i) });
    const stored = await MetaRepo.get<{ places: Record<string, unknown> }>(PLACE_WEATHER_KEY);
    expect(Object.keys(stored!.places)).toHaveLength(MAX_CACHED_PLACES);
    expect(Object.keys(stored!.places)).not.toContain('40,4');
    await loadPlaceWeather({ name: '', lat: 40, lon: 4 }, { fetchImpl: asFetch(f), now: minutesLater(10) });
    expect(f).toHaveBeenCalledTimes(MAX_CACHED_PLACES + 2);
  });

  it('de oude vorm (één voorspelling) telt nog als bewaarde plek', async () => {
    const f = okFetch();
    const first = await loadPlaceWeather(AWAY, { fetchImpl: asFetch(f), now: T0 });
    await MetaRepo.set(PLACE_WEATHER_KEY, { forecast: first.status === 'ok' ? first.forecast : undefined });
    expect((await loadPlaceWeather(AWAY, { fetchImpl: asFetch(f), now: minutesLater(5) })).status).toBe('ok');
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('twee plekken tegelijk: allebei bewaard, de een schrijft de ander niet weg (Warden)', async () => {
    const f = okFetch();
    await Promise.all([loadPlaceWeather(AWAY, { fetchImpl: asFetch(f), now: T0 }), loadPlaceWeather(OTHER, { fetchImpl: asFetch(f), now: T0 })]);
    const stored = await MetaRepo.get<{ places: Record<string, unknown> }>(PLACE_WEATHER_KEY);
    expect(Object.keys(stored!.places).sort()).toEqual(['50.72,4.01', '51.52,5.03']);
  });

  it('force deelt geen gewone aanroep die al loopt: er gaat echt een nieuwe uit (Warden)', async () => {
    const f = okFetch();
    await Promise.all([
      loadPlaceWeather(AWAY, { fetchImpl: asFetch(f), now: T0 }),
      loadPlaceWeather(AWAY, { fetchImpl: asFetch(f), now: T0, force: true }),
    ]);
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('force haalt op, ook binnen het uur (Nu verversen)', async () => {
    const f = okFetch();
    await loadPlaceWeather(AWAY, { fetchImpl: asFetch(f), now: T0 });
    expect((await loadPlaceWeather(AWAY, { fetchImpl: asFetch(f), now: minutesLater(5), force: true })).status).toBe('ok');
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

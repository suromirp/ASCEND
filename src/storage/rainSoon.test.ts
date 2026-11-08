import { describe, it, expect, beforeEach, vi } from 'vitest';
import { clearRainSoonCache, refreshRainSoon } from './rainSoon';

const place = { name: 'Teststad', lat: 52.1, lon: 5.3 };
const body = { utc_offset_seconds: 3600, minutely_15: { time: ['2026-11-08T17:45'], precipitation: [0.4] } };
const ok = () => Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));

beforeEach(() => clearRainSoonCache());

describe('refreshRainSoon', () => {
  it('haalt op en gebruikt binnen tien minuten het geheugen', async () => {
    const fetchImpl = vi.fn(ok) as unknown as typeof fetch;
    const now = new Date('2026-11-08T16:40:00Z');
    expect((await refreshRainSoon(place, { fetchImpl, now }))?.slots).toHaveLength(1);
    await refreshRainSoon(place, { fetchImpl, now: new Date(now.getTime() + 5 * 60_000) });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    await refreshRainSoon(place, { fetchImpl, now: new Date(now.getTime() + 11 * 60_000) });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('geen netwerk geeft niets en gooit niet', async () => {
    const fetchImpl = (() => Promise.reject(new Error('offline'))) as unknown as typeof fetch;
    expect(await refreshRainSoon(place, { fetchImpl })).toBeUndefined();
  });

  it('een server die niet antwoordt wordt na de grens losgelaten', async () => {
    const fetchImpl = (() => new Promise(() => {})) as unknown as typeof fetch;
    expect(await refreshRainSoon(place, { fetchImpl, limitMs: 20 })).toBeUndefined();
  });

  it('een antwoord zonder kwartieren geeft niets', async () => {
    const fetchImpl = (() => Promise.resolve(new Response(JSON.stringify({ utc_offset_seconds: 0, minutely_15: { time: [], precipitation: [] } })))) as unknown as typeof fetch;
    expect(await refreshRainSoon(place, { fetchImpl })).toBeUndefined();
  });
});

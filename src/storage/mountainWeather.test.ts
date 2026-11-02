import { beforeEach, describe, expect, it, vi } from 'vitest';
import { wipeAllData } from './database';
import { getMountainWeather, refreshMountainWeather } from './mountainWeather';
import { buildBackupEnvelope } from './backup';

// Nagemaakte plek en antwoorden: geen netwerk.
const place = { name: 'Bergdorp', lat: 45.1, lon: 6.9 };
const answer = { hourly: { time: ['2027-07-02T14:00'], temperature_2m: [4], wind_gusts_10m: [40], cape: [300], freezing_level_height: [3100], weather_code: [3] } };
const ok = () => vi.fn(async () => new Response(JSON.stringify(answer), { status: 200 }));

beforeEach(async () => {
  await wipeAllData();
});

describe('bergweer in de opslag', () => {
  it('haalt op, bewaart, en vraagt binnen het uur niet opnieuw voor dezelfde plek en hoogte', async () => {
    const f = ok();
    const fetchImpl = f as unknown as typeof fetch;
    expect((await refreshMountainWeather(place, 2500, { fetchImpl, now: new Date('2027-07-01T18:00:00.000Z') }))?.elevationM).toBe(2500);
    await refreshMountainWeather(place, 2500, { fetchImpl, now: new Date('2027-07-01T18:30:00.000Z') });
    expect(f).toHaveBeenCalledTimes(1);
    // Een andere hoogte is een nieuwe vraag.
    await refreshMountainWeather(place, 1800, { fetchImpl, now: new Date('2027-07-01T18:31:00.000Z') });
    expect(f).toHaveBeenCalledTimes(2);
    await refreshMountainWeather(place, 1800, { fetchImpl, now: new Date('2027-07-01T19:40:00.000Z') });
    expect(f).toHaveBeenCalledTimes(3);
  });

  it('houdt de vorige bij een fout of zonder verbinding, en gaat nooit mee in de back-up', async () => {
    await refreshMountainWeather(place, 2500, { fetchImpl: ok() as unknown as typeof fetch, now: new Date('2027-07-01T18:00:00.000Z') });
    const fail = vi.fn(async () => new Response('', { status: 500 }));
    expect(await refreshMountainWeather(place, 2500, { fetchImpl: fail as unknown as typeof fetch, now: new Date('2027-07-01T21:00:00.000Z') })).toBeDefined();
    const offline = vi.fn(async () => { throw new TypeError('offline'); });
    expect(await refreshMountainWeather(place, 2500, { fetchImpl: offline as unknown as typeof fetch, now: new Date('2027-07-01T23:00:00.000Z') })).toBeDefined();
    // Een andere plek krijgt de oude niet.
    expect(await refreshMountainWeather({ name: 'Elders', lat: 46, lon: 7 }, 2500, { fetchImpl: fail as unknown as typeof fetch, now: new Date('2027-07-01T23:00:00.000Z') })).toBeUndefined();
    expect(await getMountainWeather()).toBeDefined();
    const backup = JSON.stringify(await buildBackupEnvelope());
    expect(backup).not.toContain('freezing');
    expect(backup).not.toContain('Bergdorp');
  });

  it('deelt een lopende vraag alleen voor dezelfde plek en hoogte', async () => {
    const f = ok();
    const fetchImpl = f as unknown as typeof fetch;
    const now = new Date('2027-07-01T18:00:00.000Z');
    const [a, b, c] = await Promise.all([
      refreshMountainWeather(place, 2500, { fetchImpl, now }),
      refreshMountainWeather(place, 2500, { fetchImpl, now }),
      refreshMountainWeather(place, 1800, { fetchImpl, now }),
    ]);
    expect(a?.elevationM).toBe(2500);
    expect(b?.elevationM).toBe(2500);
    expect(c?.elevationM).toBe(1800);
    expect(f).toHaveBeenCalledTimes(2);
  });
});

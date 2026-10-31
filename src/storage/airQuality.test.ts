import { beforeEach, describe, expect, it, vi } from 'vitest';
import { wipeAllData } from './database';
import { getAirQuality, refreshAirQuality } from './airQuality';
import { buildBackupEnvelope } from './backup';

// Nagemaakte plek en antwoorden: geen netwerk.
const place = { name: 'Ergens', lat: 52.1, lon: 5.1 };
const answer = { hourly: { time: ['2026-07-10T15:00'], european_aqi: [72], ozone: [160], pm2_5: [8] } };
const ok = () => vi.fn(async () => new Response(JSON.stringify(answer), { status: 200 }));

beforeEach(async () => {
  await wipeAllData();
});

describe('luchtkwaliteit in de opslag', () => {
  it('haalt op, bewaart, en vraagt binnen drie uur niet opnieuw', async () => {
    const f = ok();
    const now = new Date('2026-07-10T08:00:00.000Z');
    expect((await refreshAirQuality(place, { fetchImpl: f as unknown as typeof fetch, now }))?.hours).toHaveLength(1);
    await refreshAirQuality(place, { fetchImpl: f as unknown as typeof fetch, now: new Date('2026-07-10T10:00:00.000Z') });
    expect(f).toHaveBeenCalledTimes(1);
    await refreshAirQuality(place, { fetchImpl: f as unknown as typeof fetch, now: new Date('2026-07-10T11:30:00.000Z') });
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('houdt de oude bij een fout, en gaat nooit mee in de back-up', async () => {
    await refreshAirQuality(place, { fetchImpl: ok() as unknown as typeof fetch, now: new Date('2026-07-10T08:00:00.000Z') });
    const fail = vi.fn(async () => new Response('', { status: 500 }));
    expect(await refreshAirQuality(place, { fetchImpl: fail as unknown as typeof fetch, now: new Date('2026-07-10T20:00:00.000Z') })).toBeDefined();
    expect(await getAirQuality()).toBeDefined();
    expect(JSON.stringify(await buildBackupEnvelope())).not.toContain('european');
    expect(JSON.stringify(await buildBackupEnvelope())).not.toContain('ozone');
  });
});

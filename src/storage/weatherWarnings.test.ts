import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsRepo, wipeAllData } from './database';
import { normalizeBackupToCurrentModel } from './backupNormalize';
import { getWarningForecast, refreshWarningForecast } from './weatherWarnings';
import { refreshAvalancheLevel } from './avalanche';
import { buildBackupEnvelope } from './backupExport';

// Nagemaakte plekken en antwoorden: geen netwerk.
const place = { name: 'Bergdorp', lat: 45.1, lon: 6.9 };
const answer = { utc_offset_seconds: 7200, hourly: { time: ['2027-07-02T14:00'], temperature_2m: [31], wind_gusts_10m: [40], weather_code: [95] } };
const ok = () => vi.fn(async () => new Response(JSON.stringify(answer), { status: 200 }));
const asFetch = (f: unknown) => f as typeof fetch;

beforeEach(async () => {
  await wipeAllData();
});

describe('weerwaarschuwingen in de opslag', () => {
  it('haalt op, bewaart per plek, en vraagt binnen het uur niet opnieuw', async () => {
    const f = ok();
    const first = await refreshWarningForecast(place, { fetchImpl: asFetch(f), now: new Date('2027-07-01T18:00:00Z') });
    expect(first?.utcOffsetSec).toBe(7200);
    expect(first?.hours[0]).toEqual({ time: '2027-07-02T14:00', tempC: 31, gustKmh: 40, code: 95 });
    await refreshWarningForecast(place, { fetchImpl: asFetch(f), now: new Date('2027-07-01T18:30:00Z') });
    expect(f).toHaveBeenCalledTimes(1);
    // Een tweede plek krijgt een eigen vraag en de eerste blijft bewaard.
    await refreshWarningForecast({ name: 'Elders', lat: 46, lon: 7 }, { fetchImpl: asFetch(f), now: new Date('2027-07-01T18:31:00Z') });
    expect(f).toHaveBeenCalledTimes(2);
    expect(await getWarningForecast(place)).toBeDefined();
  });

  it('houdt de vorige bij een fout, geeft niets voor een nieuwe plek, en gaat nooit mee in de back-up', async () => {
    await refreshWarningForecast(place, { fetchImpl: asFetch(ok()), now: new Date('2027-07-01T18:00:00Z') });
    const fail = vi.fn(async () => new Response('', { status: 500 }));
    expect(await refreshWarningForecast(place, { fetchImpl: asFetch(fail), now: new Date('2027-07-01T21:00:00Z') })).toBeDefined();
    expect(await refreshWarningForecast({ name: 'Elders', lat: 46, lon: 7 }, { fetchImpl: asFetch(fail), now: new Date('2027-07-01T21:00:00Z') })).toBeUndefined();
    const backup = JSON.stringify(await buildBackupEnvelope());
    expect(backup).not.toContain('Bergdorp');
    expect(backup).not.toContain('weatherWarnings');
  });

  it('stopt na de grens in tijd zonder fout', async () => {
    const never = vi.fn(() => new Promise<Response>(() => {}));
    expect(await refreshWarningForecast(place, { fetchImpl: asFetch(never), limitMs: 20, now: new Date('2027-07-01T18:00:00Z') })).toBeUndefined();
  });
});

describe('de instellingen in een back-up', () => {
  it('gaan mee, en een kapotte waarde valt weg en betekent het advies', async () => {
    await SettingsRepo.set({ weatherWarnings: false, avalancheBulletin: false });
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    expect(normalizeBackupToCurrentModel(envelope).settings).toMatchObject({ weatherWarnings: false, avalancheBulletin: false });
    envelope.payload.settings = { ...envelope.payload.settings, weatherWarnings: 'ja', avalancheBulletin: 1 };
    const s = normalizeBackupToCurrentModel(envelope).settings ?? {};
    expect('weatherWarnings' in s).toBe(false);
    expect('avalancheBulletin' in s).toBe(false);
  });
});

// Een vierkant gebied rond de plek, en een bulletin met klasse 3 daarvoor.
const square = [[6.5, 44.5], [7.5, 44.5], [7.5, 45.5], [6.5, 45.5], [6.5, 44.5]];
const regions = { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { id: 'XX-01' }, geometry: { type: 'Polygon', coordinates: [square] } }] };
const ratings = { maxDangerRatings: { 'XX-01': 3, 'XX-01:pm': 4, 'XX-02': 0 } };
const eaws = () => vi.fn(async (url: string) => new Response(JSON.stringify(url.includes('micro-regions') ? regions : ratings), { status: 200 }));

describe('lawinegevaar in de opslag', () => {
  it('vindt het gebied op het toestel, haalt de klasse en onthoudt beide', async () => {
    const f = eaws();
    expect(await refreshAvalancheLevel(place, '2027-02-10', { fetchImpl: asFetch(f), now: new Date('2027-02-09T18:00:00Z') })).toBe(3);
    // De plek zelf gaat nooit naar buiten: alleen een bestandsnaam en een datum.
    for (const [url] of f.mock.calls) expect(String(url)).not.toContain('45.1');
    const calls = f.mock.calls.length;
    expect(await refreshAvalancheLevel(place, '2027-02-10', { fetchImpl: asFetch(f), now: new Date('2027-02-09T19:00:00Z') })).toBe(3);
    expect(f.mock.calls.length).toBe(calls);
    const backup = JSON.stringify(await buildBackupEnvelope());
    expect(backup).not.toContain('XX-01');
  });

  it('zonder bulletin, buiten de bekende gebieden of zonder netwerk: niets, zonder fout', async () => {
    const none = vi.fn(async (url: string) => new Response(JSON.stringify(url.includes('micro-regions') ? regions : { maxDangerRatings: { 'XX-01': 0 } }), { status: 200 }));
    expect(await refreshAvalancheLevel(place, '2027-02-10', { fetchImpl: asFetch(none), now: new Date('2027-02-09T18:00:00Z') })).toBeUndefined();
    const f = eaws();
    expect(await refreshAvalancheLevel({ name: 'Polder', lat: 52.1, lon: 5.1 }, '2027-02-10', { fetchImpl: asFetch(f) })).toBeUndefined();
    expect(f).not.toHaveBeenCalled();
    const offline = vi.fn(async () => { throw new TypeError('offline'); });
    expect(await refreshAvalancheLevel({ name: 'Ander dorp', lat: 45.3, lon: 6.8 }, '2027-02-10', { fetchImpl: asFetch(offline) })).toBeUndefined();
  });
});

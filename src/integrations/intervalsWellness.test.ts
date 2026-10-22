import { describe, it, expect, vi } from 'vitest';
import {
  IntervalsError,
  createIntervalsIcuAdapter,
  fetchIntervalsWellness,
  mapIntervalsWellness,
  mapIntervalsWellnessRecord,
  wellnessUrl,
} from './intervalsIcu';

// A made-up wellness answer in the shape of the intervals.icu API (field names
// from its OpenAPI description: id is the day, sleepSecs, sleepScore, restingHR,
// hrv). Nothing here belongs to a real person.
const WELLNESS = [
  { id: '2026-10-21', restingHR: 51, hrv: 52.4, sleepSecs: 26100, sleepScore: 81, weight: 80 },
  { id: '2026-10-22', restingHR: 55, hrv: 44.26, sleepSecs: 20400, sleepScore: 72.4, avgSleepingHR: 49, updated: '2026-10-22T06:40:00Z' },
  { id: '2026-10-20' },
  { id: 'i77', restingHR: 50 },
  { id: '2026-10-19', restingHR: 0, hrv: -3, sleepSecs: 20, sleepScore: 400 },
];

const CONNECTION = { athleteId: 'i12345', apiKey: 'geheime-sleutel-0123' };
const range = { from: '2026-09-24', to: '2026-10-22' };

function okFetch(body: unknown, status = 200) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));
}

describe('wellness: sleep, resting heart rate and HRV', () => {
  it('asks the wellness endpoint with oldest and newest and the same Basic auth', async () => {
    const fetchImpl = okFetch(WELLNESS);
    await fetchIntervalsWellness(CONNECTION, range, { fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://intervals.icu/api/v1/athlete/i12345/wellness.json?oldest=2026-09-24&newest=2026-10-22');
    expect(wellnessUrl('i1', range)).toContain('/api/v1/athlete/i1/wellness.json?');
    expect(init.method).toBe('GET');
    expect((init.headers as Record<string, string>).Authorization).toBe(`Basic ${btoa('API_KEY:geheime-sleutel-0123')}`);
  });

  it('maps a day to the generic RecoveryMetric, without vendor fields', async () => {
    const metrics = await fetchIntervalsWellness(CONNECTION, range, { fetchImpl: okFetch(WELLNESS) as unknown as typeof fetch });
    expect(metrics.map((m) => m.date)).toEqual(['2026-10-21', '2026-10-22']);
    expect(metrics[1]).toEqual({
      id: 'intervals.icu:2026-10-22',
      date: '2026-10-22',
      source: 'import',
      restingHeartRate: 55,
      hrv: 44.3,
      sleepScore: 72,
      sleepMinutes: 340,
    });
    expect(Object.keys(metrics[1]).join()).not.toMatch(/garmin|HR$|Secs/);
  });

  it('drops a record without a date or without any usable value, and a value no body has', () => {
    expect(mapIntervalsWellnessRecord({ id: '2026-10-20' })).toBeUndefined();
    expect(mapIntervalsWellnessRecord({ id: 'i77', restingHR: 50 })).toBeUndefined();
    expect(mapIntervalsWellnessRecord({ id: '2026-10-19', restingHR: 0, hrv: -3, sleepSecs: 20, sleepScore: 400 })).toBeUndefined();
    // One implausible value goes, the rest of the day stays.
    const partial = mapIntervalsWellnessRecord({ id: '2026-10-19', restingHR: 0, hrv: 48 })!;
    expect(partial.hrv).toBe(48);
    expect('restingHeartRate' in partial).toBe(false);
  });

  it('keeps one record per day', () => {
    expect(mapIntervalsWellness([{ id: '2026-10-22', restingHR: 50 }, { id: '2026-10-22', restingHR: 52 }])).toHaveLength(1);
  });

  it('turns the same problems into the same messages as the activities', async () => {
    const failure = async (fetchImpl: unknown) => {
      try {
        await fetchIntervalsWellness(CONNECTION, range, { fetchImpl: fetchImpl as typeof fetch });
      } catch (err) {
        return err as IntervalsError;
      }
      throw new Error('expected a failure');
    };
    expect((await failure(okFetch({}, 401))).kind).toBe('auth');
    expect((await failure(okFetch({}, 404))).kind).toBe('athlete');
    expect((await failure(okFetch({ not: 'a list' }))).kind).toBe('response');
    expect((await failure(vi.fn(async () => { throw new TypeError('Failed to fetch'); }))).kind).toBe('network');
  });

  it('is part of the adapter, and empty without a connection', async () => {
    expect(await createIntervalsIcuAdapter(null).fetchRecoveryMetrics!(range)).toEqual([]);
    const adapter = createIntervalsIcuAdapter(CONNECTION, { fetchImpl: okFetch(WELLNESS) as unknown as typeof fetch });
    expect((await adapter.fetchRecoveryMetrics!(range)).length).toBe(2);
  });
});

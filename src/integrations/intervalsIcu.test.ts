import { describe, it, expect, vi } from 'vitest';
import {
  IntervalsError,
  activitiesUrl,
  basicAuthHeader,
  cadenceOf,
  createIntervalsIcuAdapter,
  feelOf,
  fetchIntervalsActivities,
  intervalsErrorMessage,
  kindOf,
  mapIntervalsActivity,
  normalizeConnection,
} from './intervalsIcu';

// A made-up response in the shape of the intervals.icu API (field names from
// its OpenAPI description). Nothing here belongs to a real person.
const RESPONSE = [
  {
    id: 'i1001',
    start_date_local: '2026-10-18T08:12:03',
    type: 'Run',
    name: 'Ochtendloop',
    source: 'GARMIN_CONNECT',
    device_name: 'Garmin Forerunner 265',
    moving_time: 3320,
    elapsed_time: 3400,
    distance: 6912.4,
    total_elevation_gain: 40.2,
    total_elevation_loss: 38.7,
    average_heartrate: 148,
    max_heartrate: 171,
    icu_rpe: 4,
    feel: 2,
    trainer: false,
  },
  {
    id: 'i1002',
    start_date_local: '2026-10-17T10:00:00',
    type: 'Hike',
    source: 'GARMIN_CONNECT',
    moving_time: 7200,
    distance: 11800,
    total_elevation_gain: 610,
    total_elevation_loss: 598,
  },
  { id: 'i1003', start_date_local: '2026-10-16T19:00:00', type: 'VirtualRun', source: 'UPLOAD', moving_time: 1800, distance: 5000, total_elevation_gain: 55, trainer: true },
  { id: 'i1004', start_date_local: '2026-10-15T07:00:00', type: 'Yoga', source: 'GARMIN_CONNECT', moving_time: 1800 },
  // Strava activities come back as empty stubs.
  { id: 's9' },
  {},
];

const CONNECTION = { athleteId: 'i12345', apiKey: 'geheime-sleutel-0123' };

function okFetch(body: unknown, status = 200) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));
}

describe('request', () => {
  it('asks the activities endpoint with oldest and newest and Basic auth as API_KEY', async () => {
    const fetchImpl = okFetch(RESPONSE);
    await fetchIntervalsActivities(CONNECTION, { from: '2026-10-14', to: '2026-10-22' }, { fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://intervals.icu/api/v1/athlete/i12345/activities?oldest=2026-10-14&newest=2026-10-22');
    expect(init.method).toBe('GET');
    const auth = (init.headers as Record<string, string>).Authorization;
    expect(auth).toBe(`Basic ${btoa('API_KEY:geheime-sleutel-0123')}`);
    expect(atob(auth.replace('Basic ', ''))).toBe('API_KEY:geheime-sleutel-0123');
  });

  it('builds the url and header in one place', () => {
    expect(activitiesUrl('i1', { from: '2026-01-01', to: '2026-01-08' })).toContain('/api/v1/athlete/i1/activities?');
    expect(basicAuthHeader('abc')).toBe(`Basic ${btoa('API_KEY:abc')}`);
  });
});

describe('mapping to the general shape', () => {
  it('maps a Garmin run with every field', async () => {
    const activities = await fetchIntervalsActivities(CONNECTION, { from: '2026-10-14', to: '2026-10-22' }, { fetchImpl: okFetch(RESPONSE) as unknown as typeof fetch });
    const run = activities.find((a) => a.externalId === 'intervals.icu:i1001');
    expect(run).toEqual({
      externalId: 'intervals.icu:i1001',
      source: 'garmin',
      start: '2026-10-18T08:12:03',
      kind: 'run',
      name: 'Ochtendloop',
      durationSec: 3320,
      distanceM: 6912.4,
      elevationGainM: 40.2,
      elevationLossM: 38.7,
      avgHeartRate: 148,
      maxHeartRate: 171,
      rpe: 4,
      feel: 'better',
      treadmill: false,
    });
  });

  it('drops Strava stubs, keeps other kinds as "other" and marks a virtual run as treadmill', async () => {
    const activities = await fetchIntervalsActivities(CONNECTION, { from: '2026-10-14', to: '2026-10-22' }, { fetchImpl: okFetch(RESPONSE) as unknown as typeof fetch });
    expect(activities.map((a) => a.externalId)).toEqual(['intervals.icu:i1001', 'intervals.icu:i1002', 'intervals.icu:i1003', 'intervals.icu:i1004']);
    expect(activities[1]).toMatchObject({ kind: 'hike', source: 'garmin', elevationGainM: 610, rpe: undefined, feel: undefined });
    expect(activities[2]).toMatchObject({ kind: 'run', source: 'import', treadmill: true });
    expect(activities[3].kind).toBe('other');
  });

  it('uses source import for something that did not come from Garmin, and Garmin by device name', () => {
    const base = { id: 'x', start_date_local: '2026-10-18T08:00:00', type: 'Run', moving_time: 600 };
    expect(mapIntervalsActivity({ ...base, source: 'UPLOAD' })?.source).toBe('import');
    expect(mapIntervalsActivity({ ...base, source: 'UPLOAD', device_name: 'Garmin fenix 7' })?.source).toBe('garmin');
    expect(mapIntervalsActivity({ ...base, source: 'GARMIN_CONNECT' })?.source).toBe('garmin');
  });

  it('accepts a negative descent, falls back to elapsed time and rejects an activity without a duration', () => {
    const base = { id: 'x', start_date_local: '2026-10-18T08:00:00', type: 'Run' };
    expect(mapIntervalsActivity({ ...base, elapsed_time: 900, total_elevation_loss: -120 })).toMatchObject({ durationSec: 900, elevationLossM: 120 });
    expect(mapIntervalsActivity(base)).toBeUndefined();
    expect(mapIntervalsActivity({ ...base, moving_time: 600, deleted: true })).toBeUndefined();
  });

  it('maps kinds and the 1 to 5 feel scale', () => {
    expect(kindOf('TrailRun')).toBe('run');
    expect(kindOf('Walk')).toBe('hike');
    expect(kindOf('GravelRide')).toBe('ride');
    expect(kindOf('WeightTraining')).toBe('strength');
    expect(kindOf('Swim')).toBe('other');
    expect(kindOf(undefined)).toBe('other');
    expect([1, 2, 3, 4, 5, 0, 9, undefined].map(feelOf)).toEqual(['better', 'better', 'normal', 'worse', 'worse', undefined, undefined, undefined]);
  });

  it('ignores an RPE outside 1 to 10', () => {
    const base = { id: 'x', start_date_local: '2026-10-18T08:00:00', type: 'Run', moving_time: 600 };
    expect(mapIntervalsActivity({ ...base, icu_rpe: 0 })?.rpe).toBeUndefined();
    expect(mapIntervalsActivity({ ...base, icu_rpe: 40 })?.rpe).toBeUndefined();
  });
});

describe('errors come back as clear Dutch messages, not crashes', () => {
  const range = { from: '2026-10-14', to: '2026-10-22' };
  async function failure(fetchImpl: unknown): Promise<IntervalsError> {
    try {
      await fetchIntervalsActivities(CONNECTION, range, { fetchImpl: fetchImpl as typeof fetch });
    } catch (err) {
      return err as IntervalsError;
    }
    throw new Error('expected a failure');
  }

  it('a wrong key (401)', async () => {
    const err = await failure(okFetch({ error: 'nope' }, 401));
    expect(err).toBeInstanceOf(IntervalsError);
    expect(err.kind).toBe('auth');
    expect(err.message).toMatch(/API-sleutel/);
  });

  it('a wrong athlete id (403 and 404)', async () => {
    for (const status of [403, 404]) {
      const err = await failure(okFetch({}, status));
      expect(err.kind).toBe('athlete');
      expect(err.message).toMatch(/athlete-id/);
    }
  });

  it('no network, a server error and too many requests', async () => {
    expect((await failure(vi.fn(async () => { throw new TypeError('Failed to fetch'); }))).kind).toBe('network');
    expect((await failure(okFetch({}, 503))).kind).toBe('server');
    expect((await failure(okFetch({}, 429))).kind).toBe('rate');
  });

  it('an answer that is not a list, or not JSON', async () => {
    expect((await failure(okFetch({ not: 'a list' }))).kind).toBe('response');
    expect((await failure(vi.fn(async () => new Response('<html>', { status: 200 })))).kind).toBe('response');
  });

  it('missing input is caught before any request', async () => {
    const fetchImpl = okFetch([]);
    await expect(fetchIntervalsActivities({ athleteId: '  ', apiKey: 'k' }, range, { fetchImpl: fetchImpl as unknown as typeof fetch })).rejects.toThrow(/athlete-id/);
    await expect(fetchIntervalsActivities({ athleteId: 'i1', apiKey: '' }, range, { fetchImpl: fetchImpl as unknown as typeof fetch })).rejects.toThrow(/API-sleutel/);
    expect(() => normalizeConnection({ athleteId: 'i1/../x', apiKey: 'k' })).toThrow(/letters en cijfers/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('never leaks the key into a message, and an unknown error reads as a connection problem', async () => {
    for (const status of [401, 403, 429, 500]) {
      expect((await failure(okFetch({}, status))).message).not.toContain(CONNECTION.apiKey);
    }
    expect(intervalsErrorMessage(new Error('boom'))).toMatch(/Geen verbinding/);
  });
});

describe('cadence', () => {
  it('keeps steps per minute and doubles a per-foot value, for runs only', () => {
    expect(cadenceOf('run', 171.4)).toBe(171);
    expect(cadenceOf('run', 85)).toBe(170);
    expect(cadenceOf('hike', 108)).toBe(108);
    expect(cadenceOf('ride', 88)).toBe(88);
    expect(cadenceOf('run', 0)).toBeUndefined();
    expect(cadenceOf('run', undefined)).toBeUndefined();
    expect(cadenceOf('run', 900)).toBeUndefined();
  });

  it('is part of the mapped activity', () => {
    const run = mapIntervalsActivity({ id: 1, start_date_local: '2026-10-18T08:12:03', type: 'Run', moving_time: 1800, average_cadence: 86 });
    expect(run?.avgCadence).toBe(172);
    expect(mapIntervalsActivity({ id: 2, start_date_local: '2026-10-18T08:12:03', type: 'Run', moving_time: 1800 })?.avgCadence).toBeUndefined();
    expect(mapIntervalsActivity({ id: 3, start_date_local: '2026-10-18T08:12:03', type: 'WeightTraining', moving_time: 1800, average_cadence: 60 })?.avgCadence).toBeUndefined();
  });
});

describe('adapter', () => {
  it('reports whether it is connected and returns nothing without a connection', async () => {
    expect(createIntervalsIcuAdapter(null).isConnected()).toBe(false);
    expect(await createIntervalsIcuAdapter(null).fetchExternalActivities!({ from: '2026-10-14', to: '2026-10-22' })).toEqual([]);
    const adapter = createIntervalsIcuAdapter(CONNECTION, { fetchImpl: okFetch(RESPONSE) as unknown as typeof fetch });
    expect(adapter.isConnected()).toBe(true);
    expect(adapter.id).toBe('intervals.icu');
    expect((await adapter.fetchExternalActivities!({ from: '2026-10-14', to: '2026-10-22' })).length).toBe(4);
  });
});

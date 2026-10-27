import { describe, expect, it, vi } from 'vitest';
import { fetchIntervalsLaps, intervalsUrl, mapIntervalsActivity, mapIntervalsLaps, otherStreamNames, streamKindsOf, STREAM_NAMES, WANTED_STREAMS } from './intervalsIcu';
import { mapPastWind, pastConditionsUrl } from './openMeteo';

// Made-up answers in the shape of the provider's API (the OpenAPI description of
// GET /api/v1/activity/{id}/intervals, read 27 October 2026). No key, no person.

const CONNECTION = { athleteId: 'i12345', apiKey: 'geheime-sleutel-0123' };
const asFetch = (f: unknown) => f as unknown as typeof fetch;

describe('the laps and intervals of an activity', () => {
  const answer = {
    id: 'i4711',
    analyzed: '2026-10-25T09:00:00',
    icu_intervals: [
      { id: 2, type: 'WORK', label: 'Test', group_id: 7, start_time: 395, end_time: 2120, start_index: 395, end_index: 2120, distance: 5000.04, moving_time: 1725, average_speed: 2.8985, gap: 2.9, average_heartrate: 171.26, max_heartrate: 184, average_cadence: 86.2, average_watts: 251, average_stride: 1.08, total_elevation_gain: 4.2, decoupling: 3.14, average_respiration: 41.5, average_temp: 24.6, zone: 4, intensity: 91, headwind_percent: 38.5, tailwind_percent: 12, average_wind_speed: 8.1, rommel: 1 },
      { id: 1, type: 'RECOVERY', label: '  Warming-up  ', start_time: 0, end_time: 395, distance: 1000 },
      { id: 3, type: 'OTHER', start_time: 2120, end_time: 2120 },
      { id: 4, type: 'WORK', start_time: 2200 },
      null,
      'x',
    ],
    icu_groups: [{ id: 'g', count: 2 }],
  };

  it('keeps the boundaries, the type, the label and what the source computed, in order', () => {
    const laps = mapIntervalsLaps(answer);
    expect(laps).toHaveLength(2);
    expect(laps[0]).toEqual({ startSec: 0, endSec: 395, kind: 'recovery', label: 'Warming-up', source: { distanceM: 1000 } });
    expect(laps[1]).toMatchObject({
      startSec: 395,
      endSec: 2120,
      kind: 'work',
      label: 'Test',
      groupId: '7',
      source: { distanceM: 5000, movingSec: 1725, avgSpeedMs: 2.899, avgHeartRate: 171.3, maxHeartRate: 184, avgCadence: 86.2, avgWatts: 251, avgStepLengthM: 1.08, gainM: 4.2, decouplingPct: 3.1, zone: 4, headwindPct: 38.5, tailwindPct: 12, avgWindMs: 8.1 },
    });
    // Fields it does not know are not kept.
    expect(JSON.stringify(laps)).not.toContain('rommel');
  });

  it('reads the indexes through the clock when the times are missing', () => {
    const laps = mapIntervalsLaps({ icu_intervals: [{ type: 'WORK', start_index: 2, end_index: 4 }] }, [10, 11, 20, 25, 31]);
    expect(laps).toEqual([{ startSec: 20, endSec: 31, kind: 'work' }]);
    expect(mapIntervalsLaps({ icu_intervals: [{ type: 'WORK', start_index: 2, end_index: 4 }] })).toEqual([]);
  });

  it('gives nothing for an answer that is not a list of intervals, and caps a long one', () => {
    expect(mapIntervalsLaps(null)).toEqual([]);
    expect(mapIntervalsLaps({ icu_intervals: 'x' })).toEqual([]);
    expect(mapIntervalsLaps([])).toEqual([]);
    const many = { icu_intervals: Array.from({ length: 500 }, (_, i) => ({ start_time: i * 10, end_time: i * 10 + 9 })) };
    expect(mapIntervalsLaps(many)).toHaveLength(200);
  });

  it('makes one GET with the key', async () => {
    const f = vi.fn(async () => new Response(JSON.stringify(answer), { status: 200 }));
    const laps = await fetchIntervalsLaps(CONNECTION, { externalId: 'intervals.icu:i4711' }, undefined, { fetchImpl: asFetch(f) });
    expect(laps).toHaveLength(2);
    expect(f).toHaveBeenCalledTimes(1);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(intervalsUrl('i4711'));
    expect(url).toBe('https://intervals.icu/api/v1/activity/i4711/intervals');
    expect((init.headers as Record<string, string>).Authorization).toMatch(/^Basic /);
    expect(await fetchIntervalsLaps(CONNECTION, { externalId: 'x:1' }, undefined, { fetchImpl: asFetch(f) })).toEqual([]);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('turns a failed request into a clear error', async () => {
    const f = vi.fn(async () => new Response('{}', { status: 401 }));
    await expect(fetchIntervalsLaps(CONNECTION, { externalId: 'intervals.icu:i1' }, undefined, { fetchImpl: asFetch(f) })).rejects.toMatchObject({ kind: 'auth' });
  });
});

describe('the other series the source lists', () => {
  it('knows respiration, temperature and vertical speed, and asks for power', () => {
    expect(STREAM_NAMES.respiration).toBe('respiration');
    expect(STREAM_NAMES.temperature).toBe('temp');
    expect(STREAM_NAMES.verticalSpeed).toBe('vertical_speed');
    expect(STREAM_NAMES.power).toBe('watts');
    for (const k of ['power', 'respiration', 'temperature', 'verticalSpeed'] as const) expect(WANTED_STREAMS).toContain(k);
    expect(streamKindsOf(['time', 'respiration', 'temp', 'vertical_speed', 'watts'])).toEqual(['time', 'respiration', 'temperature', 'verticalSpeed', 'power']);
  });

  it('notes the names, never the values, of series it does not know', () => {
    expect(otherStreamNames(['time', 'heartrate', 'smo2', 'thb', 'grade_smooth', 'moving', 'fixed_altitude', 5, 'a'.repeat(60)])).toEqual(['smo2', 'thb']);
    expect(otherStreamNames(['time'])).toBeUndefined();
    expect(otherStreamNames('x')).toBeUndefined();
    expect(otherStreamNames(Array.from({ length: 60 }, (_, i) => `custom_${i}`))).toHaveLength(30);
  });

  it('the activity carries them along', () => {
    const a = mapIntervalsActivity({ id: 'i1', start_date_local: '2026-10-25T08:12:03', type: 'Run', moving_time: 2400, distance: 6600, stream_types: ['time', 'distance', 'smo2', 'moving'] });
    expect(a?.otherStreams).toEqual(['smo2']);
    expect(a?.streamsAvailable).toEqual(['time', 'distance']);
    const none = mapIntervalsActivity({ id: 'i2', start_date_local: '2026-10-25T08:12:03', type: 'Run', moving_time: 2400, stream_types: ['time'] });
    expect(none && 'otherStreams' in none).toBe(false);
  });
});

describe('the wind of each hour around a run', () => {
  const raw = {
    hourly: {
      time: ['2026-10-25T05:00', '2026-10-25T07:00', '2026-10-25T08:00', '2026-10-25T09:00', '2026-10-25T10:00', '2026-10-25T13:00'],
      wind_speed_10m: [5, 12, 30, 28, 20, 5],
      wind_direction_10m: [200, 250, 270, 275, 280, 300],
    },
  };

  it('asks for the direction', () => {
    expect(pastConditionsUrl({ name: '', lat: 52, lon: 5 }, 2)).toContain('wind_direction_10m');
  });

  it('gives the hours around the run as seconds from its start, with the direction the wind comes from', () => {
    const wind = mapPastWind(raw, '2026-10-25T08:12:03', 2290);
    expect(wind.map((w) => w.speedKmh)).toEqual([12, 30, 28, 20]);
    expect(wind[1]).toEqual({ atSec: -720, speedKmh: 30, fromDeg: 270 });
    expect(wind[2].atSec).toBe(2880);
  });

  it('gives nothing without a direction, a clock or an hourly list', () => {
    expect(mapPastWind({ hourly: { time: raw.hourly.time, wind_speed_10m: raw.hourly.wind_speed_10m } }, '2026-10-25T08:12:03', 2290)).toEqual([]);
    expect(mapPastWind(raw, 'nee', 2290)).toEqual([]);
    expect(mapPastWind(null, '2026-10-25T08:12:03', 2290)).toEqual([]);
  });
});

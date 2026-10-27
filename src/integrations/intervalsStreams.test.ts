import { describe, it, expect, vi } from 'vitest';
import {
  STREAM_NAMES,
  fetchIntervalsStreams,
  intervalsActivityId,
  mapIntervalsStreams,
  streamKindsOf,
  streamsToRequest,
  streamsUrl,
  createIntervalsIcuAdapter,
} from './intervalsIcu';
import { asProviderAnswer, makeStreams } from '../engine/fixtures/runStreams';
import { mapPastConditions, pastConditionsUrl } from './openMeteo';

// Made-up answers in the shape of the provider's API. No real key, no person.
const CONNECTION = { athleteId: 'i12345', apiKey: 'geheime-sleutel-0123' };
const answerFetch = (body: unknown, status = 200) => vi.fn(async () => new Response(JSON.stringify(body), { status }));
const asFetch = (f: unknown) => f as unknown as typeof fetch;

describe('the request for the series', () => {
  it('names the activity, always lists the types and asks for power since the watch writes it', () => {
    expect(intervalsActivityId('intervals.icu:i4711')).toBe('i4711');
    expect(intervalsActivityId('other:i4711')).toBeUndefined();
    expect(intervalsActivityId('intervals.icu:')).toBeUndefined();
    const kinds = streamsToRequest(['time', 'heartRate', 'power', 'stanceTime']);
    expect(kinds).toEqual(['time', 'heartRate', 'power', 'stanceTime']);
    const url = streamsUrl('i4711', kinds);
    expect(url).toBe('https://intervals.icu/api/v1/activity/i4711/streams.json?types=time,heartrate,watts,stance_time');
    expect(streamsToRequest(undefined)).toEqual([]);
    expect(Object.keys(STREAM_NAMES)).toContain('power');
  });

  it('knows the series by ASCEND names and drops the rest', () => {
    expect(streamKindsOf(['time', 'watts', 'temp', 'moving', 'heartrate'])).toEqual(['time', 'power', 'temperature', 'heartRate']);
    expect(streamKindsOf('nope')).toBeUndefined();
  });

  it('makes one GET with the key and returns the series in ASCEND units', async () => {
    const set = makeStreams({ minutes: 30, pace: 360, hr: 145, cadence: 86, stanceTimeMs: 240, stepLengthM: 1.08, start: { lat: 52.37, lon: 4.9 } });
    const f = answerFetch(asProviderAnswer(set));
    const out = await fetchIntervalsStreams(
      CONNECTION,
      { externalId: 'intervals.icu:i4711', kind: 'run', streamsAvailable: ['time', 'distance', 'heartRate', 'speed', 'cadence', 'stanceTime', 'stepLength', 'position'] },
      { fetchImpl: asFetch(f) },
    );
    expect(f).toHaveBeenCalledTimes(1);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('/api/v1/activity/i4711/streams.json?types=time,distance,heartrate,velocity_smooth,cadence,latlng,stance_time,step_length');
    expect((init.headers as Record<string, string>).Authorization).toMatch(/^Basic /);
    expect(out!.timeSec).toHaveLength(set.timeSec.length);
    expect(out!.heartRate![100]).toBe(145);
    // A cadence per foot is doubled for a run, millimetres of a step are metres.
    expect(out!.cadence![100]).toBe(172);
    expect(out!.stepLengthM![100]).toBeCloseTo(1.08, 3);
    expect(out!.stanceTimeMs![100]).toBe(240);
    // Only the first position, rounded to two decimals.
    expect(out!.start).toEqual({ lat: 52.37, lon: 4.9 });
  });

  it('asks nothing when the activity has none of the series, or comes from elsewhere', async () => {
    const f = answerFetch([]);
    expect(await fetchIntervalsStreams(CONNECTION, { externalId: 'intervals.icu:i1', kind: 'run', streamsAvailable: [] }, { fetchImpl: asFetch(f) })).toBeUndefined();
    expect(await fetchIntervalsStreams(CONNECTION, { externalId: 'x:1', kind: 'run', streamsAvailable: ['time'] }, { fetchImpl: asFetch(f) })).toBeUndefined();
    expect(f).not.toHaveBeenCalled();
  });

  it('turns an answer that is not a list, and a failed request, into a clear error', async () => {
    const act = { externalId: 'intervals.icu:i1', kind: 'run' as const, streamsAvailable: ['time' as const, 'heartRate' as const] };
    await expect(fetchIntervalsStreams(CONNECTION, act, { fetchImpl: asFetch(answerFetch({ nope: 1 })) })).rejects.toMatchObject({ kind: 'response' });
    await expect(fetchIntervalsStreams(CONNECTION, act, { fetchImpl: asFetch(answerFetch({}, 401)) })).rejects.toMatchObject({ kind: 'auth' });
  });

  it('is part of the adapter', async () => {
    const adapter = createIntervalsIcuAdapter(null);
    expect(await adapter.fetchActivityStreams!({ externalId: 'intervals.icu:i1', kind: 'run', streamsAvailable: ['time'] })).toBeUndefined();
  });
});

describe('mapping the series', () => {
  it('keeps steps per minute as they are and ignores gaps and rubbish values', () => {
    const raw = [
      { type: 'time', data: [0, 1, 2, 3] },
      { type: 'cadence', data: [170, 172, null, 'x'] },
      { type: 'stance_time', data: [240, 9999, 238, null] },
      { type: 'heartrate', data: [140, 0, 142, null] },
    ];
    const set = mapIntervalsStreams(raw)!;
    expect(set.cadence).toEqual([170, 172, null, null]);
    expect(set.stanceTimeMs).toEqual([240, null, 238, null]);
    expect(set.heartRate).toEqual([140, null, 142, null]);
    expect(mapIntervalsStreams([])).toBeUndefined();
  });

  it('does not double a cadence of a hike', () => {
    const set = mapIntervalsStreams([{ type: 'time', data: [0, 1] }, { type: 'cadence', data: [58, 60] }], 'hike')!;
    expect(set.cadence).toEqual([58, 60]);
    expect(mapIntervalsStreams([{ type: 'time', data: [0, 1] }, { type: 'cadence', data: [58, 60] }], 'run')!.cadence).toEqual([116, 120]);
  });

  it('works without a time series by counting seconds', () => {
    const set = mapIntervalsStreams([{ type: 'heartrate', data: [140, 141, 142] }])!;
    expect(set.timeSec).toEqual([0, 1, 2]);
  });
});

describe('the weather of a training that is done', () => {
  const hourly = {
    time: ['2026-10-18T07:00', '2026-10-18T08:00', '2026-10-18T09:00', '2026-10-18T10:00'],
    temperature_2m: [9, 10, 12, 14],
    apparent_temperature: [7, 8, 11, 13],
    relative_humidity_2m: [90, 85, 80, 70],
    precipitation: [0, 0.2, 0.4, 0],
    wind_speed_10m: [10, 12, 14, 16],
    wind_gusts_10m: [20, 24, 30, 31],
  };

  it('asks the forecast endpoint for past days at a rounded place', () => {
    const url = pastConditionsUrl({ name: '', lat: 52.3712, lon: 4.8934 }, 3);
    expect(url).toContain('latitude=52.37');
    expect(url).toContain('longitude=4.89');
    expect(url).toContain('past_days=3');
    expect(url).toContain('forecast_days=1');
    expect(url).toContain('relative_humidity_2m');
    expect(pastConditionsUrl({ name: '', lat: 1, lon: 2 }, 400)).toContain('past_days=92');
  });

  it('averages the hours the training touched', () => {
    const c = mapPastConditions({ hourly }, '2026-10-18T08:12:03', 3320)!;
    // 08:12 to 09:07: the hours 08:00 and 09:00.
    expect(c).toMatchObject({ source: 'lookup', tempC: 11, feelsC: 9.5, humidityPct: 82.5, windKmh: 13, gustKmh: 30 });
    expect(c.rainMm).toBeCloseTo(0.6, 5);
  });

  it('has nothing for a training outside the hours of the answer, and rejects a strange answer', () => {
    expect(mapPastConditions({ hourly }, '2026-10-12T08:12:03', 3000)).toBeUndefined();
    expect(() => mapPastConditions({}, '2026-10-18T08:12:03', 3000)).toThrow();
  });
});

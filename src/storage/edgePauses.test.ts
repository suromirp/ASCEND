import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ActivityStreamsRepo, wipeAllData } from './database';
import { edgePausesFor } from './activityDetail';
import { segmentRun } from '../engine/fixtures/testRun';
import { buildRunDetail, edgePausesOfStreams } from '../engine/runDetail';
import { deserializeStreams, packStreams, serializeStreams, unpackStreams } from '../engine/streamPack';
import type { StreamSet } from '../models/activityDetail';

// Made-up data only: a 5 km test with 1,13 km warm-up (a stop of 69 s after 669 m), 540 m cooling
// down, and one hole of 558 s in the series after the last metre, the way a watch that ran on
// after the finish writes it. Every few seconds a reading, like smart recording.
function testRunWithTail(): StreamSet {
  const set = segmentRun(
    [
      { m: 1130, pace: 400, hr: 140 },
      ...[307, 313, 320, 329, 314].map((pace) => ({ m: 1000, pace, hr: 183 })),
      { m: 545, pace: 420, hr: 160 },
    ],
    { pauses: [{ atM: 669, seconds: 69 }] },
  );
  // Keep about one reading in 1,2 seconds, and the first and last.
  const keep = set.timeSec.map((_, i) => i === 0 || i === set.timeSec.length - 1 || i % 6 !== 5);
  const thin = <T,>(xs: T[] | undefined) => xs?.filter((_, i) => keep[i]);
  const out: StreamSet = { ...set };
  for (const key of Object.keys(set) as (keyof StreamSet)[]) {
    const v = set[key];
    if (Array.isArray(v)) (out as unknown as Record<string, unknown>)[key] = thin(v as unknown[]);
  }
  // The hole: one reading 558 seconds later at the same distance.
  const last = out.timeSec.length - 1;
  out.timeSec.push(Math.round((out.timeSec[last] as number) + 558));
  out.distanceM!.push(out.distanceM![last]);
  out.speedMs!.push(0);
  out.altitudeM!.push(out.altitudeM![last]);
  for (const key of ['heartRate', 'cadence', 'stepLengthM', 'powerW', 'respirationRpm', 'temperatureC'] as const) out[key]?.push(null);
  // Whole seconds, as the source gives them.
  out.timeSec = out.timeSec.map((t) => Math.round(t as number));
  return out;
}

const KM = 6.68;
const MINUTES = 41;

function storedRecord(set: StreamSet) {
  const packed = packStreams(set, { logId: 'log_tail', externalId: 'bron:1', fetchedAt: '2026-11-01T10:00:00.000Z', wholeKm: KM, wholeMinutes: MINUTES, headwindKmh: [2, 3, null], laps: [{ startSec: 0, endSec: 600 }, { startSec: 600, endSec: 3000 }], unknownKinds: ['iets'] })!;
  // Through the backup file and back: base64, `missing` as a number (null for a float).
  const serialized = JSON.parse(JSON.stringify(serializeStreams(packed)));
  return { packed, serialized };
}

describe('standing still at the edges from the kept series', () => {
  beforeEach(async () => {
    await wipeAllData();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reads the tail of a record in the form of the backup file once it is read back', () => {
    const { serialized } = storedRecord(testRunWithTail());
    expect(serialized.version).toBe(1);
    expect(serialized.series.time.missing).toBe(4294967295);
    expect(typeof serialized.series.time.data).toBe('string');
    // The base64 form is not the stored form: unpacking it directly gives no clock.
    expect(edgePausesOfStreams(unpackStreams(serialized) ?? { timeSec: [] })).toBeUndefined();
    const back = deserializeStreams(serialized)!;
    const edge = edgePausesOfStreams(unpackStreams(back)!)!;
    expect(edge.headSec).toBe(0);
    expect(Math.abs(edge.tailSec - 558)).toBeLessThanOrEqual(2);
  });

  it('gives the edges for a log on the screen from the store', async () => {
    const set = testRunWithTail();
    const { packed } = storedRecord(set);
    await ActivityStreamsRepo.put(packed);
    const runDetail = buildRunDetail(set, { logKm: KM, logMinutes: MINUTES, builtAt: '2026-11-01T10:00:00.000Z' })!;
    expect(runDetail.pauseSec).toBeGreaterThan(600);
    const log = { id: 'log_tail', runDetail };
    const edge = (await edgePausesFor(log))!;
    expect(edge.headSec).toBe(0);
    expect(Math.abs(edge.tailSec - 558)).toBeLessThanOrEqual(2);
  });

  it('gives nothing for a cut log, a missing series, another total or no detail', async () => {
    const set = testRunWithTail();
    await ActivityStreamsRepo.put(storedRecord(set).packed);
    const runDetail = buildRunDetail(set, { logKm: KM, logMinutes: MINUTES, builtAt: '2026-11-01T10:00:00.000Z' })!;
    const log = { id: 'log_tail', runDetail };
    expect(await edgePausesFor({ ...log, trim: { startSec: 0, endSec: 100 } })).toBeUndefined();
    expect(await edgePausesFor({ ...log, id: 'log_zonder_reeks' })).toBeUndefined();
    expect(await edgePausesFor({ ...log, runDetail: { ...runDetail, wholeKm: 7 } })).toBeUndefined();
    expect(await edgePausesFor({ ...log, runDetail: { ...runDetail, wholeMinutes: 45 } })).toBeUndefined();
    expect(await edgePausesFor({ id: 'log_tail', runDetail: undefined })).toBeUndefined();
  });

  it('gives up within its limit when the store does not answer', async () => {
    vi.spyOn(ActivityStreamsRepo, 'get').mockReturnValue(new Promise(() => {}));
    const set = testRunWithTail();
    const runDetail = buildRunDetail(set, { logKm: KM, logMinutes: MINUTES, builtAt: '2026-11-01T10:00:00.000Z' })!;
    const started = Date.now();
    expect(await edgePausesFor({ id: 'log_tail', runDetail }, 50)).toBeUndefined();
    expect(Date.now() - started).toBeLessThan(1000);
  });
});

import { describe, expect, it } from 'vitest';
import { fastStartTest, segmentRun } from './fixtures/testRun';
import { PACK_SPECS, deserializeStreams, formatBytes, packStreams, serializeStreams, streamsBytes, unpackStreams } from './streamPack';
import type { StreamSet } from '../models/activityDetail';

const META = { logId: 'log_1', externalId: 'intervals.icu:i1', fetchedAt: '2026-10-27T10:00:00.000Z', wholeKm: 6.6, wholeMinutes: 38 };

describe('packing the series', () => {
  const set = fastStartTest({ position: true });
  const packed = packStreams(set, { ...META, headwindKmh: [0, 1.5, null], unknownKinds: ['smo2'] })!;

  it('keeps every series that has readings, at the moments the watch wrote them', () => {
    expect(Object.keys(packed.series).sort()).toEqual(
      ['altitude', 'cadence', 'distance', 'heartRate', 'power', 'respiration', 'speed', 'stepLength', 'temperature', 'time'].sort(),
    );
    expect(packed.sampleCount).toBe(set.timeSec.length);
    expect(packed.version).toBe(1);
    expect(packed.headwindKmh).toEqual([0, 1.5, null]);
    expect(packed.unknownKinds).toEqual(['smo2']);
  });

  it('refuses a set with a gap in the clock instead of turning it into a 0', () => {
    const gappy = { ...set, timeSec: set.timeSec.map((t, i) => (i === 3 ? (null as unknown as number) : t)) };
    expect(packStreams(gappy, META)).toBeUndefined();
    const nan = { ...set, timeSec: set.timeSec.map((t, i) => (i === 3 ? Number.NaN : t)) };
    expect(packStreams(nan, META)).toBeUndefined();
  });

  it('keeps no position, whatever the set held', () => {
    const text = JSON.stringify(packed);
    expect(text).not.toContain('position');
    expect(text).not.toContain('latlng');
    expect(Object.keys(packed.series)).not.toContain('position');
    expect(PACK_SPECS.map((s) => s.kind)).not.toContain('position' as never);
    expect(unpackStreams(packed)!.position).toBeUndefined();
    expect(unpackStreams(packed)!.start).toBeUndefined();
  });

  it('is compact: one to four bytes per reading per series', () => {
    const n = set.timeSec.length;
    // time 4, distance 4, hr 1, speed 2, altitude 4, cadence 1, power 2, step 2, respiration 2, temperature 2.
    expect(streamsBytes(packed)).toBe(n * 24);
    expect(packed.series.heartRate!.type).toBe('u8');
    expect(packed.series.heartRate!.data.byteLength).toBe(n);
  });

  it('comes back as the same numbers, within the resolution of the packing', () => {
    const back = unpackStreams(packed)!;
    expect(back.timeSec).toHaveLength(set.timeSec.length);
    for (const i of [0, 100, 777, set.timeSec.length - 1]) {
      expect(back.timeSec[i]).toBeCloseTo(set.timeSec[i], 0);
      expect(back.distanceM![i]).toBeCloseTo(set.distanceM![i]!, 1);
      expect(back.heartRate![i]).toBe(set.heartRate![i]);
      expect(back.speedMs![i]).toBeCloseTo(set.speedMs![i]!, 3);
      expect(back.altitudeM![i]).toBeCloseTo(set.altitudeM![i]!, 1);
      expect(back.cadence![i]).toBe(set.cadence![i]);
      expect(back.powerW![i]).toBe(set.powerW![i]);
      expect(back.stepLengthM![i]).toBeCloseTo(set.stepLengthM![i]!, 3);
      expect(back.respirationRpm![i]).toBe(40);
      expect(back.temperatureC![i]).toBe(24.5);
    }
  });

  it('marks a gap and gives it back as a gap', () => {
    const s: StreamSet = { timeSec: [0, 1, 2, 3], distanceM: [0, 3, 6, 9], heartRate: [140, null, 143, 300], powerW: [200, 210, null, 220] };
    const p = packStreams(s, META)!;
    const back = unpackStreams(p)!;
    // 300 beats a minute does not fit a byte below the gap marker and is a gap too.
    expect(back.heartRate).toEqual([140, null, 143, null]);
    expect(back.powerW).toEqual([200, 210, null, 220]);
  });

  it('keeps negative temperatures and a descent', () => {
    const s: StreamSet = { timeSec: [0, 1, 2], distanceM: [0, 1, 2], temperatureC: [-7.5, -7.4, null], verticalSpeedMs: [-1.25, 0.5, null] };
    const back = unpackStreams(packStreams(s, META)!)!;
    expect(back.temperatureC).toEqual([-7.5, -7.4, null]);
    expect(back.verticalSpeedMs).toEqual([-1.25, 0.5, null]);
  });

  it('keeps an altitude above 3.276 metres, where a small integer would not', () => {
    const s: StreamSet = { timeSec: [0, 1, 2], distanceM: [0, 1, 2], altitudeM: [2840.4, 2841.2, 4808.7] };
    expect(unpackStreams(packStreams(s, META)!)!.altitudeM).toEqual([2840.4, 2841.2, 4808.7]);
  });

  it('keeps a series with irregular moments (smart recording) as it is', () => {
    const s: StreamSet = { timeSec: [0, 1, 4, 5, 11, 12], distanceM: [0, 3, 12, 15, 33, 36], heartRate: [140, 141, 143, 144, 150, 151] };
    expect(unpackStreams(packStreams(s, META)!)!.timeSec).toEqual([0, 1, 4, 5, 11, 12]);
  });

  it('gives nothing for a set without a clock or without any reading beside it', () => {
    expect(packStreams({ timeSec: [0] }, META)).toBeUndefined();
    expect(packStreams({ timeSec: [0, 1, 2] }, META)).toBeUndefined();
    expect(packStreams({ timeSec: [0, 1, 2], heartRate: [null, null, null] }, META)).toBeUndefined();
  });

  it('a tocht of seven hours stays under a megabyte', () => {
    const tocht = segmentRun([{ m: 25_000, pace: 1000, climb: 900 }]);
    const p = packStreams(tocht, META)!;
    expect(tocht.timeSec.length).toBeGreaterThan(24_000);
    expect(streamsBytes(p)).toBeLessThan(1_000_000);
  });
});

describe('the series in a backup file', () => {
  const set = fastStartTest();
  const packed = packStreams(set, { ...META, laps: [{ startSec: 0, endSec: 395, label: 'Warming-up', kind: 'recovery' }] })!;

  it('goes through JSON as base64 and comes back identical', () => {
    const file = JSON.parse(JSON.stringify(serializeStreams(packed)));
    expect(typeof file.series.heartRate.data).toBe('string');
    expect(file.series.altitude.type).toBe('f32');
    const back = deserializeStreams(file)!;
    expect(back.logId).toBe('log_1');
    expect(back.wholeKm).toBe(6.6);
    expect(back.laps).toEqual(packed.laps);
    expect(unpackStreams(back)).toEqual(unpackStreams(packed));
    expect(streamsBytes(back)).toBe(streamsBytes(packed));
  });

  it('is a third bigger as text than as bytes', () => {
    const text = JSON.stringify(serializeStreams(packed));
    expect(text.length / streamsBytes(packed)).toBeGreaterThan(1.3);
    expect(text.length / streamsBytes(packed)).toBeLessThan(1.5);
  });

  it('refuses what is damaged and keeps what is whole', () => {
    const file = JSON.parse(JSON.stringify(serializeStreams(packed)));
    expect(deserializeStreams(null)).toBeUndefined();
    expect(deserializeStreams({ ...file, logId: '' })).toBeUndefined();
    expect(deserializeStreams({ ...file, version: 2 })).toBeUndefined();
    expect(deserializeStreams({ ...file, wholeKm: 'veel' })).toBeUndefined();
    expect(deserializeStreams({ ...file, series: {} })).toBeUndefined();
    // No clock: the others have nothing to be aligned to.
    expect(deserializeStreams({ ...file, series: { ...file.series, time: undefined } })).toBeUndefined();
    // One series that is not base64 or of another type is dropped alone.
    const damaged = deserializeStreams({ ...file, series: { ...file.series, heartRate: { ...file.series.heartRate, data: '***' }, speed: { ...file.series.speed, type: 'f32' } } })!;
    expect(damaged.series.heartRate).toBeUndefined();
    expect(damaged.series.speed).toBeUndefined();
    expect(damaged.series.distance).toBeDefined();
    // A series of another length than the clock is dropped too.
    const short = deserializeStreams({ ...file, series: { ...file.series, power: { ...file.series.power, data: file.series.power.data.slice(0, 40) } } })!;
    expect(short.series.power).toBeUndefined();
  });

  it('cleans the laps of a file like the laps from the source', () => {
    const file = JSON.parse(JSON.stringify(serializeStreams(packed)));
    const long = Array.from({ length: 260 }, (_, i) => ({ startSec: i * 10, endSec: i * 10 + 9 }));
    const many = deserializeStreams({ ...file, laps: long })!;
    expect(many.laps).toHaveLength(200);
    const odd = deserializeStreams({
      ...file,
      laps: [
        { startSec: 50, endSec: 90, label: `  ${'x'.repeat(80)}  `, kind: 'sprint', groupId: 'g'.repeat(60), source: { avgHeartRate: 150, zone: 'hoog', distanceM: Number.NaN, onzin: 4 } },
        { startSec: 0, endSec: 40, kind: 'work', source: { onzin: 4 } },
      ],
    })!;
    expect(odd.laps![0]).toEqual({ startSec: 0, endSec: 40, kind: 'work' });
    const second = odd.laps![1];
    expect(second.label).toHaveLength(60);
    expect(second.kind).toBeUndefined();
    expect(second.groupId).toHaveLength(40);
    expect(second.source).toEqual({ avgHeartRate: 150 });
  });

  it('limits the wind list', () => {
    const file = JSON.parse(JSON.stringify(serializeStreams(packed)));
    expect(deserializeStreams({ ...file, headwindKmh: [1, 999] })!.headwindKmh).toBeUndefined();
    expect(deserializeStreams({ ...file, headwindKmh: new Array(1001).fill(1) })!.headwindKmh).toBeUndefined();
    expect(deserializeStreams({ ...file, headwindKmh: [1, null, -3.5] })!.headwindKmh).toEqual([1, null, -3.5]);
  });

  it('refuses a file with a gap in the clock', () => {
    const file = JSON.parse(JSON.stringify(serializeStreams(packed)));
    const bytes = Uint8Array.from(atob(file.series.time.data), (c) => c.charCodeAt(0));
    bytes.set([255, 255, 255, 255], 4);
    file.series.time.data = btoa(String.fromCharCode(...bytes));
    expect(deserializeStreams(file)).toBeUndefined();
  });

  it('drops a bad lap, a bad wind list and silly names without losing the set', () => {
    const file = JSON.parse(JSON.stringify(serializeStreams(packed)));
    const back = deserializeStreams({ ...file, laps: [{ startSec: 5, endSec: 2 }, { startSec: 0, endSec: 9 }], headwindKmh: ['x'], unknownKinds: [3, 'a'.repeat(50), 'smo2'] })!;
    expect(back.laps).toEqual([{ startSec: 0, endSec: 9 }]);
    expect(back.headwindKmh).toBeUndefined();
    expect(back.unknownKinds).toEqual(['smo2']);
  });
});

describe('sizes as a person reads them', () => {
  it('B, KB and MB', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(120_000)).toBe('120 KB');
    expect(formatBytes(4_200_000)).toBe('4,2 MB');
    expect(formatBytes(42_000_000)).toBe('42 MB');
  });
});

import { describe, it, expect } from 'vitest';
import { buildActivityDetail, deadBand, fillGaps, turningPoints, SLICE_COUNT } from './activityDetail';
import { makeStreams } from './fixtures/runStreams';

// Made-up series only (src/engine/fixtures/runStreams.ts).
const opts = { source: 'garmin' as const };

describe('the helpers', () => {
  it('fills a hole of at most 5 seconds and leaves a longer one', () => {
    const t = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
    const v: (number | null)[] = [100, null, null, 106, 107, 108, 109, 110, 111, null, null, null, null, null, null, null, 120, 121, 122, 123];
    const out = fillGaps(v, t, 5)!;
    expect(out.slice(0, 4)).toEqual([100, 102, 104, 106]);
    expect(out.slice(9, 16).every((x) => x === null)).toBe(true);
    expect(fillGaps(undefined, t, 5)).toBeUndefined();
  });

  it('lets the dead band swallow noise smaller than the band and follow real movement', () => {
    expect(deadBand([100, 102, 99, 103, 98, 101], 5)).toEqual([100, 100, 100, 100, 100, 100]);
    const climb = deadBand([100, 110, 120, 130], 5);
    expect(climb[3]).toBe(125);
  });

  it('finds turning points only for reversals of at least the threshold', () => {
    const y = [0, 20, 15, 40, 20, 5, 30];
    expect(turningPoints(y, 10)).toEqual([0, 3, 5, 6]);
    expect(turningPoints([0, 3, 1, 4, 2, 5], 10)).toEqual([]);
  });
});

describe('a flat easy run', () => {
  const streams = makeStreams({
    minutes: 60,
    pace: 360,
    hr: (m) => 140 + m * 0.1,
    cadence: 172,
    stanceTimeMs: 240,
    stanceBalance: 50.4,
    stepLengthM: 1.05,
    hrNoise: 1,
    baroNoise: 1,
  });
  const detail = buildActivityDetail(streams, { ...opts, reportedGainM: 5 })!;

  it('makes 48 pieces of the same moving time that add up to the run', () => {
    expect(detail.sliceCount).toBe(SLICE_COUNT);
    expect(detail.slices).toHaveLength(48);
    expect(detail.movingSec).toBeGreaterThan(3590);
    expect(detail.movingSec).toBeLessThanOrEqual(3600);
    const secs = detail.slices.map((s) => s.sec);
    expect(Math.max(...secs) - Math.min(...secs)).toBeLessThan(3);
    const km = detail.slices.reduce((s, x) => s + x.distanceM, 0) / 1000;
    expect(km).toBeGreaterThan(9.9);
    expect(km).toBeLessThan(10.1);
  });

  it('keeps the heart rate rising, the cadence and the running dynamics per piece', () => {
    expect(detail.slices[47].heartRate!).toBeGreaterThan(detail.slices[0].heartRate! + 4);
    expect(detail.slices[10].cadence).toBeCloseTo(172, 0);
    expect(detail.slices[10].dynamics).toMatchObject({ stanceTimeMs: 240, stanceBalanceLeftPct: 50.4, stepLengthM: 1.05 });
    expect(detail.quality.heartRateCoveragePct).toBe(100);
    expect(detail.quality.chestStrapSeen).toBe(true);
  });

  it('finds no climbs in barometer noise and adds almost no climbing', () => {
    expect(detail.stretches).toEqual([]);
    const gain = detail.slices.reduce((s, x) => s + x.gainM, 0);
    expect(gain).toBeLessThan(20);
  });

  it('stays small', () => {
    expect(JSON.stringify(detail).length).toBeLessThan(14_000);
  });
});

describe('pauses and gaps', () => {
  it('does not count standing still, nor a jump in time, as moving time', () => {
    const streams = makeStreams({ minutes: 40, pace: 360, hr: 145, pauses: [{ atMinute: 20, seconds: 120 }] });
    const detail = buildActivityDetail(streams, opts)!;
    expect(detail.movingSec).toBeGreaterThan(2395);
    expect(detail.movingSec).toBeLessThanOrEqual(2400);

    // A jump of two minutes in the clock itself (the watch was paused).
    const jumped = { ...streams, timeSec: streams.timeSec.map((t, i) => (i > 1200 ? t + 120 : t)) };
    const d2 = buildActivityDetail(jumped, opts)!;
    expect(d2.movingSec).toBeGreaterThan(2395);
    expect(d2.movingSec).toBeLessThanOrEqual(2400);
  });

  it('fills a heart rate dropout of 3 seconds and reports a longer one as missing coverage', () => {
    const short = buildActivityDetail(makeStreams({ minutes: 30, pace: 360, hr: 145, hrGaps: [{ atMinute: 10, seconds: 3 }] }), opts)!;
    expect(short.quality.heartRateCoveragePct).toBe(100);
    const long = buildActivityDetail(makeStreams({ minutes: 30, pace: 360, hr: 145, hrGaps: [{ atMinute: 10, seconds: 300 }] }), opts)!;
    expect(long.quality.heartRateCoveragePct).toBeGreaterThan(80);
    expect(long.quality.heartRateCoveragePct).toBeLessThan(90);
    expect(long.slices.some((s) => s.heartRate === undefined)).toBe(true);
  });

  it('has no heart rate at all without the stream', () => {
    const detail = buildActivityDetail(makeStreams({ minutes: 30, pace: 360, hr: null }), opts)!;
    expect(detail.quality.heartRateCoveragePct).toBe(0);
    expect(detail.slices.every((s) => s.heartRate === undefined)).toBe(true);
  });

  it('says nothing about something too short or without speed and distance', () => {
    expect(buildActivityDetail(makeStreams({ minutes: 3, pace: 360, hr: 140 }), opts)).toBeUndefined();
    const { speedMs: _s, distanceM: _d, ...bare } = makeStreams({ minutes: 30, pace: 360, hr: 140 });
    void _s;
    void _d;
    expect(buildActivityDetail(bare, opts)).toBeUndefined();
  });
});

describe('a tocht with a climb and a descent', () => {
  // 20 min flat, 30 min up at 12 percent, 10 min flat, 25 min down at 10 percent, 15 min flat.
  const grade = (m: number) => (m < 20 ? 0 : m < 50 ? 0.12 : m < 60 ? 0 : m < 85 ? -0.1 : 0);
  const streams = makeStreams({
    minutes: 100,
    pace: (m) => (m >= 20 && m < 50 ? 780 : 560),
    grade,
    hr: (m) => (m >= 20 && m < 50 ? 150 + (m - 20) * 0.3 : 110),
    cadence: (m) => (m >= 60 && m < 85 ? 112 - (m - 60) * 0.4 : 100),
    baroNoise: 1.5,
    startAltitude: 100,
  });
  const detail = buildActivityDetail(streams, { ...opts, reportedGainM: 275 })!;

  it('finds the climb and the descent with their numbers', () => {
    const climbs = detail.stretches.filter((s) => s.kind === 'climb');
    const descents = detail.stretches.filter((s) => s.kind === 'descent');
    expect(climbs).toHaveLength(1);
    expect(descents).toHaveLength(1);
    expect(climbs[0].metres).toBeGreaterThan(240);
    expect(climbs[0].metres).toBeLessThan(300);
    expect(climbs[0].sec).toBeGreaterThan(1700);
    expect(climbs[0].sec).toBeLessThan(1850);
    expect(climbs[0].gradientPct).toBeGreaterThan(11);
    expect(climbs[0].gradientPct).toBeLessThan(13);
    expect(climbs[0].startSec).toBeGreaterThan(1180);
    expect(climbs[0].startSec).toBeLessThan(1250);
    expect(descents[0].metres).toBeGreaterThan(230);
    expect(descents[0].sec).toBeLessThan(1600);
    expect(descents[0].cadence).toBeGreaterThan(100);
  });

  it('cuts each stretch in thirds with the heart rate rising up the climb', () => {
    const climb = detail.stretches.find((s) => s.kind === 'climb')!;
    expect(climb.thirds).toHaveLength(3);
    expect(climb.thirds![2].heartRate!).toBeGreaterThan(climb.thirds![0].heartRate!);
    const descent = detail.stretches.find((s) => s.kind === 'descent')!;
    expect(descent.thirds![2].cadence!).toBeLessThan(descent.thirds![0].cadence!);
  });

  it('puts its own climb against the reported one', () => {
    expect(detail.quality.gainAgreementPct).toBeGreaterThan(90);
    expect(detail.quality.gainAgreementPct).toBeLessThan(110);
  });

  it('finds no stretches on a treadmill, where the altitude is an estimate', () => {
    expect(buildActivityDetail(streams, { ...opts, treadmill: true })!.stretches).toEqual([]);
  });

  it('keeps a small counter movement inside one climb', () => {
    // Up, a small dip, up again: one climb.
    const wavy = makeStreams({ minutes: 40, pace: 600, grade: (m) => (m < 12 ? 0.09 : m < 13 ? -0.07 : m < 25 ? 0.09 : 0), hr: 140 });
    const d = buildActivityDetail(wavy, opts)!;
    expect(d.stretches.filter((s) => s.kind === 'climb')).toHaveLength(1);
  });
});

describe('conditions', () => {
  it('are carried along when given', () => {
    const detail = buildActivityDetail(makeStreams({ minutes: 30, pace: 360, hr: 140 }), { ...opts, conditions: { tempC: 12, source: 'lookup' } })!;
    expect(detail.conditions).toEqual({ tempC: 12, source: 'lookup' });
    expect(buildActivityDetail(makeStreams({ minutes: 30, pace: 360, hr: 140 }), opts)!.conditions).toBeUndefined();
  });
});

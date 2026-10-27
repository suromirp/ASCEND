import { describe, expect, it } from 'vitest';
import { asFullAnswer, fastStartTest, segmentRun, TEST_PACES } from './fixtures/testRun';
import {
  alignedPoints,
  bearing,
  buildRunDetail,
  headwindComponent,
  isStaleRunDetail,
  isUsableRunDetail,
  minettiCost,
  runDetailFingerprint,
  windAgainstFn,
  windFromStored,
  windPerKm,
  type HourlyWind,
} from './runDetail';
import { mapIntervalsStreams } from '../integrations/intervalsIcu';
import type { StoredLap } from '../models/activityStreams';

// Made-up series only (engine/fixtures/testRun.ts): a 5 km test with a fast start between a
// kilometre of warm-up and 0.6 km of cooling down.

const OPTS = { logKm: 6.6, logMinutes: 38, builtAt: '2026-10-27T10:00:00.000Z' };

describe('kilometres from the distance series (RD-1)', () => {
  const rd = buildRunDetail(fastStartTest(), OPTS)!;

  it('reads every full kilometre and the shorter piece at the end', () => {
    expect(rd.kms).toHaveLength(7);
    expect(rd.kms[6]).toMatchObject({ partial: true });
    expect(rd.kms[6].distanceM).toBeCloseTo(600, 0);
    expect(rd.totalM).toBeCloseTo(6600, 0);
  });

  it('interpolates on the kilometre mark: each kilometre is as long as it was run, to a second', () => {
    const expected = [395, ...TEST_PACES, 400 * 0.6];
    rd.kms.forEach((km, i) => expect(Math.abs(km.sec - expected[i])).toBeLessThanOrEqual(1));
    expect(rd.kms[2].paceSecKm).toBeCloseTo(338, 0);
    // The sum of the pieces is the time of the run.
    expect(rd.kms.reduce((n, k) => n + k.sec, 0)).toBeCloseTo(rd.movingSec, 0);
  });

  it('carries the heart rate, cadence, step length and power per kilometre', () => {
    const km3 = rd.kms[2];
    expect(km3.hrAvg).toBeGreaterThan(150);
    expect(km3.hrMax).toBeGreaterThanOrEqual(km3.hrAvg!);
    expect(km3.cadence).toBe(172);
    expect(km3.stepLengthM).toBeGreaterThan(0.9);
    expect(km3.powerW).toBe(250);
    expect(km3.respirationRpm).toBe(40);
    // A made-up flat road: no climb, no GAP.
    expect(km3.gainM).toBe(0);
    expect(km3.gapSecKm).toBeUndefined();
  });

  it('keeps the heart rate off a run that has none', () => {
    const none = buildRunDetail(fastStartTest({ noHr: true }), OPTS)!;
    expect(none.kms[1].hrAvg).toBeUndefined();
    expect(none.line.hr.every((v) => v === null)).toBe(true);
  });

  it('gives nothing for a run under a kilometre or without distance and speed', () => {
    expect(buildRunDetail(segmentRun([{ m: 800, pace: 360 }]), OPTS)).toBeUndefined();
    expect(buildRunDetail({ timeSec: [0, 1, 2, 3, 4] }, OPTS)).toBeUndefined();
  });

  it('works from the speed alone, and from a series that starts late', () => {
    const base = segmentRun([{ m: 3000, pace: 360 }], { startSec: 1000 });
    const speedOnly = { ...base, distanceM: undefined };
    const a = buildRunDetail(base, OPTS)!;
    const b = buildRunDetail(speedOnly, OPTS)!;
    expect(b.kms).toHaveLength(3);
    expect(Math.abs(b.kms[1].sec - a.kms[1].sec)).toBeLessThanOrEqual(1.5);
    expect(alignedPoints(base)[0].t).toBe(1000);
  });

  it('is not moved by GPS noise of 3 percent in the distance: kilometres stay within the noise', () => {
    const clean = fastStartTest();
    // A deterministic wobble of up to 3 metres in the distance, which is 0.3 percent per kilometre.
    const noisy = { ...clean, distanceM: clean.distanceM!.map((d, i) => (d ?? 0) + Math.sin(i * 1.7) * 3) };
    const a = buildRunDetail(clean, OPTS)!;
    const b = buildRunDetail(noisy, OPTS)!;
    a.kms.forEach((k, i) => expect(Math.abs(b.kms[i].paceSecKm - k.paceSecKm) / k.paceSecKm).toBeLessThan(0.03));
  });
});

describe('a pause of more than 20 seconds does not count (the limit of bestEffort)', () => {
  it('takes the pause out of the kilometre and says how long it was', () => {
    const rd = buildRunDetail(segmentRun([{ m: 3000, pace: 360 }], { pauses: [{ atM: 1500, seconds: 45 }] }), OPTS)!;
    expect(rd.kms[1].pauseSec).toBeCloseTo(45, 0);
    expect(rd.kms[1].sec).toBeCloseTo(360, 0);
    expect(rd.kms[1].paceSecKm).toBeCloseTo(360, 0);
    expect(rd.pauseSec).toBeCloseTo(45, 0);
    expect(rd.movingSec).toBeCloseTo(1080, 0);
  });

  it('a short stop of 15 seconds counts as time', () => {
    const rd = buildRunDetail(segmentRun([{ m: 3000, pace: 360 }], { pauses: [{ atM: 1500, seconds: 15 }] }), OPTS)!;
    expect(rd.kms[1].pauseSec).toBeUndefined();
    expect(rd.kms[1].sec).toBeCloseTo(375, 0);
  });
});

describe('the piece that counts for a test (RD-3)', () => {
  const rd = buildRunDetail(fastStartTest(), OPTS)!;

  it('finds the best 5 km after the warm-up, with its own five kilometres', () => {
    expect(rd.bestFive).toBeDefined();
    expect(rd.bestFive!.startM).toBeCloseTo(1000, -1);
    expect(rd.bestFive!.endM).toBeCloseTo(6000, -1);
    expect(rd.bestFive!.sec).toBeCloseTo(TEST_PACES.reduce((a, b) => a + b, 0), 0);
    expect(rd.bestFive!.kms.map((k) => Math.round(k.paceSecKm))).toEqual(TEST_PACES);
    expect(rd.bestFive!.startSec).toBeCloseTo(395, 0);
  });

  it('a tocht does not look for it', () => {
    expect(buildRunDetail(fastStartTest(), { ...OPTS, bestKm: null })!.bestFive).toBeUndefined();
  });
});

describe('the laps of the watch are only boundaries and a label (RD-2)', () => {
  const laps: StoredLap[] = [
    { startSec: 0, endSec: 395, label: 'Warming-up' },
    { startSec: 395, endSec: 395 + 322 + 338 + 358 + 362 + 345, label: 'Test', kind: 'work' },
    { startSec: 395 + 1725, endSec: 395 + 1725 + 240, label: 'Cooling-down', kind: 'recovery' },
  ];
  const rd = buildRunDetail(fastStartTest(), { ...OPTS, laps })!;

  it('works the numbers out again from the series, one truth', () => {
    expect(rd.laps).toHaveLength(3);
    const test = rd.laps![1];
    expect(test.label).toBe('Test');
    expect(test.kind).toBe('work');
    expect(test.distanceM).toBeCloseTo(5000, -1);
    expect(test.paceSecKm).toBeCloseTo(345, 0);
    expect(test.hrAvg).toBeGreaterThan(150);
  });

  it('one lap that is the whole run is no lap', () => {
    expect(buildRunDetail(fastStartTest(), { ...OPTS, laps: [{ startSec: 0, endSec: 99999 }] })!.laps).toBeUndefined();
  });

  it('reads the fall of the heart rate in the first minute of a recovery', () => {
    const set = segmentRun([
      { m: 1000, pace: 300, hr: 175 },
      { m: 100 / 3, pace: 600, hr: 170 },
      { m: 500 / 3, pace: 600, hr: 145 },
      { m: 1000, pace: 300, hr: 176 },
    ]);
    const lapsRec: StoredLap[] = [
      { startSec: 0, endSec: 300, kind: 'work' },
      { startSec: 300, endSec: 420, kind: 'recovery' },
      { startSec: 420, endSec: 720, kind: 'work' },
    ];
    const r = buildRunDetail(set, { ...OPTS, laps: lapsRec, bestKm: null })!;
    expect(r.laps![1].hrDropFirstMinute).toBeGreaterThanOrEqual(24);
    expect(r.laps![1].hrDropFirstMinute).toBeLessThanOrEqual(27);
  });
});

describe('GAP (Minetti) only where the slope is real', () => {
  it('the cost of a slope: flat is 3.6, uphill costs more and a gentle downhill less', () => {
    expect(minettiCost(0)).toBeCloseTo(3.6, 5);
    expect(minettiCost(0.1)).toBeGreaterThan(minettiCost(0));
    expect(minettiCost(-0.1)).toBeLessThan(minettiCost(0));
  });

  it('a kilometre with 40 metres of climb gets a faster GAP; a flat one gets none', () => {
    const rd = buildRunDetail(segmentRun([{ m: 1000, pace: 360 }, { m: 1000, pace: 420, climb: 40 }, { m: 1000, pace: 360 }]), OPTS)!;
    expect(rd.kms[0].gapSecKm).toBeUndefined();
    expect(rd.kms[1].gainM).toBeGreaterThan(30);
    expect(rd.kms[1].gapSecKm).toBeLessThan(rd.kms[1].paceSecKm);
    expect(rd.kms[1].gapSecKm).toBeGreaterThan(330);
  });
});

describe('the reduced line for the charts', () => {
  it('has about 150 points, equal lengths and a few KB', () => {
    const rd = buildRunDetail(fastStartTest(), OPTS)!;
    const line = rd.line;
    expect(line.n).toBeLessThanOrEqual(150);
    expect(line.n).toBeGreaterThan(100);
    for (const key of ['distM', 'timeSec', 'paceSecKm', 'hr', 'altitudeM', 'cadence', 'stepLengthM', 'powerW'] as const) expect(line[key]).toHaveLength(line.n);
    expect(line.distM[0]).toBe(0);
    expect(line.distM[line.n - 1]).toBeCloseTo(6600, 0);
    // The pace of the line follows the run: fast in the first test kilometre, slower after it.
    const at = (m: number) => line.paceSecKm[line.distM.findIndex((d) => d >= m)]!;
    expect(at(1500)).toBeLessThan(at(4500));
    expect(JSON.stringify(rd).length).toBeLessThan(25_000);
  });
});

describe('the wind against you per kilometre (RD-8)', () => {
  const route = fastStartTest({ position: true });
  // 30 km/h from the west, as the weather lookup gives it, hour marks around the run.
  const wind: HourlyWind[] = [
    { atSec: -1800, speedKmh: 30, fromDeg: 270 },
    { atSec: 1800, speedKmh: 30, fromDeg: 270 },
  ];

  it('the part of the wind against you: west into a west wind, nothing across, a tailwind going east', () => {
    expect(headwindComponent(30, 270, 270)).toBeCloseTo(19.5, 5);
    expect(headwindComponent(30, 270, 0)).toBeCloseTo(0, 5);
    expect(headwindComponent(30, 270, 90)).toBeCloseTo(-19.5, 5);
    expect(bearing(52, 5, 52.01, 5)).toBeCloseTo(0, 1);
    expect(bearing(52, 5, 52, 4.99)).toBeCloseTo(270, 0);
  });

  it('puts the headwind on the kilometres that went west, and keeps no track on the result', () => {
    const fn = windAgainstFn(route, wind)!;
    const rd = buildRunDetail(route, { ...OPTS, wind: fn })!;
    expect(rd.windKnown).toBe(true);
    // Warm-up and the first two test kilometres go north: across the wind.
    expect(Math.abs(rd.kms[0].headwindKmh!)).toBeLessThan(1);
    expect(Math.abs(rd.kms[2].headwindKmh!)).toBeLessThan(1);
    // Km 4, 5 and 6 of the run (test km 3 to 5) go west into it.
    expect(rd.kms[3].headwindKmh).toBeCloseTo(19.5, 0);
    expect(rd.kms[4].headwindKmh).toBeCloseTo(19.5, 0);
    expect(rd.bestFive!.kms[2].headwindKmh).toBeCloseTo(19.5, 0);
    const text = JSON.stringify(rd);
    expect(text).not.toContain('52.0');
    expect(text).not.toContain('lat');
  });

  it('the per-kilometre numbers come back as a function once the track is gone', () => {
    const perKm = windPerKm(route, windAgainstFn(route, wind))!;
    expect(perKm).toHaveLength(7);
    const again = windFromStored(perKm)!;
    const rd = buildRunDetail({ ...route, position: undefined }, { ...OPTS, wind: again })!;
    expect(rd.kms[4].headwindKmh).toBeCloseTo(19.5, 0);
    // A piece that is not a kilometre of the run has no known wind.
    expect(again(1500, 2500)).toBeNull();
  });

  it('without a track or without weather there is no wind, and nothing is made up', () => {
    expect(windAgainstFn({ ...route, position: undefined }, wind)).toBeUndefined();
    expect(windAgainstFn(route, [])).toBeUndefined();
    const rd = buildRunDetail(route, OPTS)!;
    expect(rd.windKnown).toBeUndefined();
    expect(rd.kms.every((k) => k.headwindKmh === undefined)).toBe(true);
  });

  it('a piece too short to have a heading says nothing', () => {
    const still = segmentRun([{ m: 3000, pace: 360 }], { position: true });
    const fn = windAgainstFn(still, wind)!;
    expect(fn(0, 50)).toBeNull();
  });

  it('the provider track maps to a position that is only in memory', () => {
    const answer = asFullAnswer(route);
    const set = mapIntervalsStreams(answer, 'run')!;
    expect(set.position?.lat).toHaveLength(set.timeSec.length);
    expect(set.start).toEqual({ lat: 52, lon: 5 });
    expect(set.powerW![200]).toBe(250);
    expect(set.respirationRpm![200]).toBe(40);
    expect(set.temperatureC![200]).toBe(24.5);
  });
});

describe('fingerprint and shape', () => {
  const rd = buildRunDetail(fastStartTest(), OPTS)!;

  it('is stale after a correction of the totals at the source, and not before', () => {
    expect(isStaleRunDetail(rd, 6.6, 38)).toBe(false);
    expect(isStaleRunDetail(rd, 6.62, 38)).toBe(true);
    expect(isStaleRunDetail(rd, 6.6, 38.5)).toBe(true);
    expect(runDetailFingerprint(6.6, 38)).toBe('6.60|38.00');
  });

  it('knows a whole one and refuses a damaged one', () => {
    expect(isUsableRunDetail(rd)).toBe(true);
    expect(isUsableRunDetail(JSON.parse(JSON.stringify(rd)))).toBe(true);
    expect(isUsableRunDetail(null)).toBe(false);
    expect(isUsableRunDetail({ ...rd, kms: [] })).toBe(false);
    expect(isUsableRunDetail({ ...rd, version: 2 })).toBe(false);
    expect(isUsableRunDetail({ ...rd, kms: [{ index: 1 }] })).toBe(false);
    expect(isUsableRunDetail({ ...rd, line: { ...rd.line, hr: [1, 2] } })).toBe(false);
    expect(isUsableRunDetail({ ...rd, bestFive: { startM: 0 } })).toBe(false);
    expect(isUsableRunDetail({ ...rd, wholeKm: Number.NaN })).toBe(false);
  });
});

import { describe, it, expect } from 'vitest';
import { buildActivityDetail } from './activityDetail';
import { makeStreams, type RunSpec } from './fixtures/runStreams';
import {
  DRIFT_BLOCK,
  EFFICIENCY_BLOCK,
  climbsOf,
  descentsOf,
  driftOf,
  efficiencyOf,
  formOf,
  isUnavailable,
  steadyBlock,
} from './runMetrics';

// Made-up series only. The profile is built the way the app builds it, so the
// metrics are tested on what really comes out of it.
const detailOf = (spec: RunSpec, treadmill = false) => buildActivityDetail(makeStreams(spec), { source: 'garmin', treadmill })!;
const ZONE: [number, number] = [136, 151];

describe('the steady block', () => {
  it('starts after the warm start, lasts at least 15 minutes and covers the flat steady part', () => {
    const d = detailOf({ minutes: 50, pace: 360, hr: 142, hrNoise: 0.5, baroNoise: 0.8 });
    const b = steadyBlock(d, EFFICIENCY_BLOCK)!;
    expect(b.startSec).toBeGreaterThanOrEqual(599);
    expect(b.sec).toBeGreaterThanOrEqual(900);
    // The longest block there is: from the first 10 minutes to the end.
    expect(b.sec).toBeGreaterThan(2300);
    expect(b.paceSec).toBeCloseTo(360, 0);
    expect(b.heartRate).toBeCloseTo(142, 0);
  });

  it('is not found in a hilly run, in a run with a changing pace, or without a heart rate', () => {
    expect(steadyBlock(detailOf({ minutes: 50, pace: 360, hr: 142, grade: (m) => 0.05 * Math.sin(m / 3) }), EFFICIENCY_BLOCK)).toBeUndefined();
    // Intervals: the pace jumps every 3 minutes.
    expect(steadyBlock(detailOf({ minutes: 50, pace: (m) => (Math.floor(m / 3) % 2 ? 300 : 420), hr: 150 }), EFFICIENCY_BLOCK)).toBeUndefined();
    expect(steadyBlock(detailOf({ minutes: 50, pace: 360, hr: null }), EFFICIENCY_BLOCK)).toBeUndefined();
  });

  it('leaves out a short run: nothing of 15 minutes after the first 10', () => {
    expect(steadyBlock(detailOf({ minutes: 22, pace: 360, hr: 142 }), EFFICIENCY_BLOCK)).toBeUndefined();
  });
});

describe('efficiency, the pace at one heart rate', () => {
  const ref = 144;
  it('converts the pace of the block to the reference heart rate by proportion', () => {
    const r = efficiencyOf(detailOf({ minutes: 40, pace: 360, hr: 152 }), ref, [136, 160]);
    expect(isUnavailable(r)).toBe(false);
    if (!isUnavailable(r)) expect(r.paceAtRefSec).toBeCloseTo(360 * (152 / 144), 0);
    const same = efficiencyOf(detailOf({ minutes: 40, pace: 360, hr: 144 }), ref, ZONE);
    if (!isUnavailable(same)) expect(same.paceAtRefSec).toBeCloseTo(360, 0);
  });

  it('says why it cannot: outside the zone, no detail, no heart rate, no block', () => {
    expect(efficiencyOf(detailOf({ minutes: 40, pace: 330, hr: 168 }), ref, ZONE)).toEqual({ unavailable: 'outsideZone' });
    // A little under zone 2 still counts, far under does not.
    expect(isUnavailable(efficiencyOf(detailOf({ minutes: 40, pace: 400, hr: 126 }), ref, ZONE))).toBe(false);
    expect(efficiencyOf(detailOf({ minutes: 40, pace: 400, hr: 110 }), ref, ZONE)).toEqual({ unavailable: 'outsideZone' });
    expect(efficiencyOf(undefined, ref, ZONE)).toEqual({ unavailable: 'noDetail' });
    expect(efficiencyOf(detailOf({ minutes: 40, pace: 360, hr: null }), ref, ZONE)).toEqual({ unavailable: 'noHeartRate' });
    expect(efficiencyOf(detailOf({ minutes: 22, pace: 360, hr: 142 }), ref, ZONE)).toEqual({ unavailable: 'noSteadyBlock' });
  });

  it('is little moved by noise inside the spread of the measure', () => {
    const values = [1, 2, 3, 4, 5].map((seed) => {
      const r = efficiencyOf(detailOf({ minutes: 40, pace: 360, hr: 142, hrNoise: 2, baroNoise: 1, seed }), ref, ZONE);
      return isUnavailable(r) ? NaN : r.paceAtRefSec;
    });
    expect(Math.max(...values) - Math.min(...values)).toBeLessThan(360 * 0.01);
  });
});

describe('drift on a long run', () => {
  it('is the fall of speed per heartbeat from the first to the second half of the block', () => {
    // Steady pace, heart rate 140 in the first half and about 3 percent higher in the second.
    const d = detailOf({ minutes: 90, pace: 360, hr: (m) => (m < 50 ? 140 : 144.2) });
    const r = driftOf(d);
    expect(isUnavailable(r)).toBe(false);
    if (!isUnavailable(r)) {
      expect(r.percent).toBeGreaterThan(2);
      expect(r.percent).toBeLessThan(4);
      expect(r.blockMinutes).toBeGreaterThan(60);
      expect(r.secondHeartRate).toBeGreaterThan(r.firstHeartRate);
    }
  });

  it('is about zero when nothing drifts', () => {
    const r = driftOf(detailOf({ minutes: 90, pace: 360, hr: 140, hrNoise: 0.5 }));
    if (isUnavailable(r)) throw new Error('should be available');
    expect(Math.abs(r.percent)).toBeLessThan(0.7);
  });

  it('counts a slower pace at the same heart rate as drift too', () => {
    const r = driftOf(detailOf({ minutes: 90, pace: (m) => 360 + m * 0.2, hr: 140 }));
    if (isUnavailable(r)) throw new Error('should be available');
    expect(r.percent).toBeGreaterThan(1.5);
  });

  it('says why not: too short, no heart rate, hills', () => {
    expect(driftOf(detailOf({ minutes: 40, pace: 360, hr: 140 }))).toEqual({ unavailable: 'tooShort' });
    expect(driftOf(detailOf({ minutes: 90, pace: 360, hr: null }))).toEqual({ unavailable: 'noHeartRate' });
    expect(driftOf(detailOf({ minutes: 90, pace: 360, hr: 140, grade: (m) => 0.08 * Math.sin(m / 2) }))).toEqual({ unavailable: 'noSteadyBlock' });
    expect(driftOf(undefined)).toEqual({ unavailable: 'noDetail' });
    expect(DRIFT_BLOCK.minSec).toBe(2700);
  });
});

describe('climbs and descents', () => {
  const grade = (m: number) => (m < 10 ? 0 : m < 40 ? 0.12 : m < 50 ? 0 : m < 70 ? -0.1 : 0);
  const spec: RunSpec = {
    minutes: 80,
    pace: (m) => (m >= 10 && m < 40 ? 780 : 560),
    grade,
    hr: (m) => (m >= 10 && m < 40 ? 150 : 110),
    cadence: (m) => (m >= 50 && m < 70 ? 112 - (m - 50) * 0.6 : 100),
    baroNoise: 1,
  };

  it('describes the climb with its speed, gradient class and heart rate', () => {
    const r = climbsOf(detailOf(spec));
    if (isUnavailable(r)) throw new Error('should be available');
    expect(r).toHaveLength(1);
    expect(r[0].klass).toBe('klim');
    expect(r[0].metresPerHour).toBeGreaterThan(480);
    expect(r[0].metresPerHour).toBeLessThan(580);
    expect(r[0].gradeFrom).toBe(12);
    expect(r[0].heartRate).toBeCloseTo(150, 0);
  });

  it('calls a smaller one a hill', () => {
    const small = detailOf({ minutes: 40, pace: 600, grade: (m) => (m < 10 ? 0 : m < 20 ? 0.06 : 0), hr: 140 });
    const r = climbsOf(small);
    if (isUnavailable(r)) throw new Error('should be available');
    expect(r).toHaveLength(1);
    expect(r[0].klass).toBe('heuvel');
    // Too gentle for a hill: 3 percent.
    const gentle = climbsOf(detailOf({ minutes: 40, pace: 600, grade: (m) => (m < 10 ? 0 : m < 30 ? 0.03 : 0), hr: 140 }));
    expect(gentle).toEqual([]);
  });

  it('gives a descent as facts with the last third against the first, and no verdict', () => {
    const r = descentsOf(detailOf({ ...spec, pace: (m) => (m >= 10 && m < 40 ? 780 : m >= 50 && m < 70 ? 560 + (m - 50) * 8 : 560) }));
    if (isUnavailable(r)) throw new Error('should be available');
    expect(r).toHaveLength(1);
    const fact = r[0];
    expect(fact.metres).toBeGreaterThan(150);
    expect(fact.cadenceChange).toBeLessThan(-5);
    // The descent slows down, so its speed falls.
    expect(fact.speedChangePct).toBeLessThan(-10);
    expect(Object.keys(fact)).not.toContain('verdict');
  });

  it('does not trust an altitude that is far from what the source reports', () => {
    const d = buildActivityDetail(makeStreams(spec), { source: 'garmin', reportedGainM: 900 })!;
    expect(climbsOf(d)).toEqual({ unavailable: 'altitudeDisagrees' });
    expect(descentsOf(d)).toEqual({ unavailable: 'altitudeDisagrees' });
    expect(climbsOf(undefined)).toEqual({ unavailable: 'noDetail' });
  });

  it('has nothing on a treadmill', () => {
    expect(climbsOf(detailOf(spec, true))).toEqual([]);
  });
});

describe('form, the first third against the last', () => {
  const base: RunSpec = { minutes: 60, pace: 360, hr: 145, cadence: 172, stanceTimeMs: 240, stepLengthM: 1.1, hrNoise: 0.3 };

  it('sees the contact time grow and the step shorten inside one run', () => {
    const r = formOf(detailOf({ ...base, stanceTimeMs: (m) => 238 + m * 0.4, stepLengthM: (m) => 1.12 - m * 0.0012, cadence: (m) => 173 - m * 0.1 }));
    if (isUnavailable(r)) throw new Error('should be available');
    expect(r.stanceChangePct).toBeGreaterThan(5);
    expect(r.stepChangePct).toBeLessThan(-3);
    expect(r.cadenceChange).toBeLessThan(-2);
    expect(Math.abs(r.paceChangePct)).toBeLessThan(1);
  });

  it('says nothing when the form holds', () => {
    const r = formOf(detailOf(base));
    if (isUnavailable(r)) throw new Error('should be available');
    expect(Math.abs(r.stanceChangePct ?? 0)).toBeLessThan(1);
  });

  it('is not read when the pace changed more than 6 percent, on hills, or without dynamics', () => {
    expect(formOf(detailOf({ ...base, pace: (m) => 360 + m * 1.2 }))).toEqual({ unavailable: 'paceChanged' });
    expect(formOf(detailOf({ ...base, grade: (m) => 0.08 * Math.sin(m / 2) }))).toEqual({ unavailable: 'hilly' });
    expect(formOf(detailOf({ minutes: 60, pace: 360, hr: 145 }))).toEqual({ unavailable: 'noDynamics' });
    expect(formOf(detailOf({ ...base, minutes: 12 }))).toEqual({ unavailable: 'tooShort' });
    expect(formOf(undefined)).toEqual({ unavailable: 'noDetail' });
  });
});

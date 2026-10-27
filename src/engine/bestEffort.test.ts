import { describe, expect, it } from 'vitest';
import type { StreamSet } from '../models/activityDetail';
import { bestEffortFromStream, distancePoints, fastestWindow, isUsableBestEffort, manyStops, stopsNote, stopsPhrase } from './bestEffort';

// A run at a speed per phase: [seconds, metres per second]; one reading per second.
function run(phases: [number, number][], opts: { skip?: (t: number) => boolean } = {}): StreamSet {
  const timeSec: number[] = [];
  const distanceM: (number | null)[] = [];
  let d = 0;
  let t = 0;
  for (const [sec, v] of phases) {
    for (let s = 0; s < sec; s++) {
      timeSec.push(t);
      distanceM.push(opts.skip?.(t) ? null : d);
      d += v;
      t++;
    }
  }
  timeSec.push(t);
  distanceM.push(d);
  return { timeSec, distanceM };
}

describe('fastestWindow', () => {
  it('finds the fast 5 km inside a slow warm-up and cool-down', () => {
    // 1 km warm-up at 2.5 m/s, 5 km at 3.0 m/s, then 1 km slow.
    const s = run([[400, 2.5], [1667, 3], [400, 2.5]]);
    const w = fastestWindow(s, 5000)!;
    expect(w.seconds).toBeGreaterThan(1660);
    expect(w.seconds).toBeLessThan(1675);
    expect(w.startM).toBeGreaterThan(990);
    expect(w.startM).toBeLessThan(1010);
  });

  it('is undefined when the run is shorter than the distance', () => {
    expect(fastestWindow(run([[600, 3]]), 5000)).toBeUndefined();
  });

  it('measures exactly a run of the test distance', () => {
    expect(fastestWindow(run([[1000, 5]]), 5000)!.seconds).toBeCloseTo(1000, 0);
  });

  it('does not use a stretch with a hole in the series', () => {
    // A 40 second hole: no window may cross it, even though the part after it is fast.
    const s = run([[1200, 3], [1900, 4]], { skip: (t) => t >= 1500 && t < 1540 });
    const w = fastestWindow(s, 5000)!;
    expect(w).toBeDefined();
    const holeStart = 1200 * 3 + 300 * 4; // 4800 m
    const holeEnd = holeStart + 40 * 4;
    expect(w.startM < holeEnd && w.endM > holeStart).toBe(false);
  });

  it('is undefined when every stretch has a hole', () => {
    const s = run([[1100, 5]], { skip: (t) => t >= 500 && t < 560 });
    expect(fastestWindow(s, 5000)).toBeUndefined();
  });

  it('bridges a short hole', () => {
    const s = run([[1000, 5]], { skip: (t) => t >= 400 && t < 410 });
    expect(fastestWindow(s, 5000)!.seconds).toBeCloseTo(1000, -1);
  });

  it('adds up the speed when there is no distance', () => {
    const s: StreamSet = { timeSec: Array.from({ length: 1001 }, (_, i) => i), speedMs: Array.from({ length: 1001 }, () => 5) };
    expect(fastestWindow(s, 5000)!.seconds).toBeCloseTo(1000, -1);
  });

  it('is undefined without distance or speed', () => {
    expect(distancePoints({ timeSec: [0, 1, 2] })).toEqual([]);
    expect(fastestWindow({ timeSec: [0, 1, 2] }, 100)).toBeUndefined();
  });
});

describe('bestEffortFromStream', () => {
  it('gives the 5 km in minutes', () => {
    const s = run([[300, 2.5], [1500, 3.3333], [300, 2.5]]);
    const e = bestEffortFromStream(s, 5, 6.0)!;
    expect(e.km).toBe(5);
    expect(e.minutes).toBeCloseTo(25, 0);
  });

  it('does not trust a series that does not match the log', () => {
    expect(bestEffortFromStream(run([[1800, 3]]), 5, 9)).toBeUndefined();
  });
});

describe('isUsableBestEffort', () => {
  it('accepts a real effort and refuses nonsense', () => {
    expect(isUsableBestEffort({ km: 5, minutes: 27.5 })).toBe(true);
    expect(isUsableBestEffort({ km: 5, minutes: 0 })).toBe(false);
    expect(isUsableBestEffort({ km: 5, minutes: 'x' })).toBe(false);
    expect(isUsableBestEffort({ km: 5, minutes: 3 })).toBe(false);
    expect(isUsableBestEffort(null)).toBe(false);
  });
});

describe('stops in the fastest stretch', () => {
  // 3 m/s all the way, 5 km takes 1667 s without stops.
  const steady = (stopsAt: number[], stopSec: number, auto: boolean): StreamSet => {
    const timeSec: number[] = [];
    const distanceM: number[] = [];
    let t = 0;
    let d = 0;
    for (let s = 0; s < 1900; s++) {
      timeSec.push(t);
      distanceM.push(d);
      d += 3;
      t++;
      if (stopsAt.includes(s)) {
        if (auto) {
          // The watch paused by itself: no readings, then a jump in time at the same place.
          t += stopSec;
        } else {
          for (let q = 0; q < stopSec; q++) {
            timeSec.push(t);
            distanceM.push(d);
            t++;
          }
        }
      }
    }
    return { timeSec, distanceM };
  };

  it('leaves the stops out when the watch keeps running, and counts them', () => {
    const w = fastestWindow(steady([300, 700, 1100], 40, false), 5000)!;
    expect(w.seconds).toBeGreaterThan(1660);
    expect(w.seconds).toBeLessThan(1675);
    expect(w.stops).toBe(3);
    expect(w.stoppedSec).toBeGreaterThanOrEqual(110);
    expect(w.stoppedSec).toBeLessThanOrEqual(122);
  });

  it('counts the clock as it ran with mode count', () => {
    const w = fastestWindow(steady([300, 700, 1100], 40, false), 5000, 'count')!;
    expect(w.seconds).toBeGreaterThan(1770);
    expect(w.stops).toBeUndefined();
  });

  it('reads an automatic pause without a jump in distance as a stop, not a hole', () => {
    const s = steady([300, 700, 1100], 40, true);
    const w = fastestWindow(s, 5000)!;
    expect(w).toBeDefined();
    expect(w.seconds).toBeLessThan(1675);
    expect(w.stops).toBe(3);
    expect(w.stoppedSec).toBe(123);
    // As before, the clock mode finds no whole stretch: every one has a gap.
    expect(fastestWindow(s, 5000, 'count')).toBeUndefined();
  });

  it('keeps a gap where the distance jumps a hole', () => {
    const s = steady([], 0, false);
    const timeSec = s.timeSec.slice();
    // A 60 second hole with the distance moving on (lost signal).
    const distanceM = s.distanceM!.map(Number);
    for (let k = 800; k < timeSec.length; k++) {
      timeSec[k] += 60;
      distanceM[k] += 200;
    }
    const jumped = { timeSec, distanceM };
    // No 5 km stretch is whole; a 2 km one lies on one side of the hole.
    expect(fastestWindow(jumped, 5000)).toBeUndefined();
    const w = fastestWindow(jumped, 2000)!;
    expect(w.startM >= 2600 || w.endM <= 2400).toBe(true);
    expect(w.stops).toBe(0);
  });

  it('does not take a short slow patch for a stop', () => {
    const s = run([[300, 3], [2, 0.5], [1700, 3]]);
    expect(fastestWindow(s, 5000)!.stops).toBe(0);
  });

  it('gives the same time as before when there are no stops', () => {
    const s = run([[400, 2.5], [1667, 3], [400, 2.5]]);
    const w = fastestWindow(s, 5000)!;
    expect(w.seconds).toBeCloseTo(fastestWindow(s, 5000, 'count')!.seconds, 6);
    expect(w.stops).toBe(0);
    expect(w.stoppedSec).toBe(0);
  });

  it('stores the stops on the best effort and says them honestly', () => {
    const e = bestEffortFromStream(steady([300, 700, 1100], 40, false), 5, 5.9, 32)!;
    expect(e.v).toBe(2);
    expect(e.stops).toBe(3);
    expect(stopsPhrase(e)).toMatch(/^zonder 3 keer stilstaan, samen \d:\d\d$/);
    expect(manyStops(e)).toBe(true);
    expect(stopsNote(e)).toContain('iets te gunstig');
    expect(stopsPhrase({ stops: 1, stoppedSec: 20 })).toBe('zonder 1 keer stilstaan, samen 0:20');
    expect(manyStops({ stops: 2, stoppedSec: 50 })).toBe(false);
    expect(stopsNote({ stops: 2, stoppedSec: 50 })).toBe('zonder 2 keer stilstaan, samen 0:50');
    expect(stopsNote({})).toBe('');
    expect(bestEffortFromStream(steady([300], 40, false), 5, 5.9, 32, 'count')!.stops).toBeUndefined();
  });
});

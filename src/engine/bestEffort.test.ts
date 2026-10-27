import { describe, expect, it } from 'vitest';
import type { StreamSet } from '../models/activityDetail';
import { bestEffortFromStream, distancePoints, fastestWindow, isUsableBestEffort, manyStops, stopsNote, stopsPhrase, stopsSentence, stopsShort, MAX_GAP_SEC } from './bestEffort';

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
    expect(stopsPhrase(e)).toMatch(/^3 keer stilstaan, samen \d:\d\d$/);
    expect(stopsSentence(e)).toMatch(/^Je stond 3 keer stil, samen \d:\d\d; die tijd telt niet mee\.$/);
    expect(manyStops(e)).toBe(true);
    expect(stopsNote(e)).toContain('iets te gunstig');
    expect(stopsPhrase({ stops: 1, stoppedSec: 20 })).toBe('1 keer stilstaan, samen 0:20');
    expect(stopsSentence({ stops: 1, stoppedSec: 20 })).toBe('Je stond 1 keer stil, samen 0:20; die tijd telt niet mee.');
    expect(stopsShort({ stops: 3, stoppedSec: 100 })).toBe('zonder 1:40 stilstaan');
    expect(stopsShort({ stops: 0, stoppedSec: 0 })).toBeUndefined();
    expect(manyStops({ stops: 2, stoppedSec: 50 })).toBe(false);
    expect(stopsNote({ stops: 2, stoppedSec: 50 })).toBe('2 keer stilstaan, samen 0:50');
    expect(stopsNote({})).toBe('');
    expect(bestEffortFromStream(steady([300], 40, false), 5, 5.9, 32, 'count')!.stops).toBeUndefined();
  });

  // The fastest a series could possibly be over a distance: no faster than its fastest reading.
  const maxSpeed = (s: StreamSet) => {
    let top = 0;
    const t = s.timeSec;
    const d = s.distanceM as number[];
    for (let k = 1; k < t.length; k++) {
      const dt = t[k] - t[k - 1];
      if (dt > 0 && dt <= MAX_GAP_SEC) top = Math.max(top, (d[k] - d[k - 1]) / dt);
    }
    return top;
  };

  it('does not make a slow crowd faster than the run was: a stop costs nothing and gives nothing', () => {
    // 120 seconds at 0,9 m/s in the middle of a run at 3 m/s.
    const s = run([[600, 3], [120, 0.9], [1400, 3]]);
    const w = fastestWindow(s, 5000)!;
    expect(w.seconds).toBeGreaterThanOrEqual(5000 / 3 - 0.01);
    expect(w.stops).toBeLessThanOrEqual(1);
  });

  it('reads a GPS stutter with a catch-up jump as a hole, not as a stop and not as time won', () => {
    // 12 seconds on the same spot, then the distance of those seconds in one go.
    const timeSec: number[] = [];
    const distanceM: number[] = [];
    let d = 0;
    for (let t = 0; t <= 3600; t++) {
      timeSec.push(t);
      if (t >= 1000 && t < 1012) distanceM.push(d);
      else {
        if (t === 1012) d += 36;
        d += 3;
        distanceM.push(d);
      }
    }
    const w = fastestWindow({ timeSec, distanceM }, 5000)!;
    expect(w.seconds).toBeGreaterThanOrEqual(5000 / 3 - 0.01);
    expect(w.stops).toBe(0);
    expect(w.startM >= 3064 || w.endM <= 3010).toBe(true);
  });

  it('counts the drift around one stop as one stop', () => {
    const drift: [number, number][] = [];
    for (let k = 0; k < 15; k++) drift.push([4, 0.3], [4, 1.2]);
    // Just over 5 km in all, so the one stretch has the drift in it.
    const w = fastestWindow(run([[600, 3], ...drift, [1100, 3]]), 5000)!;
    expect(w.stops).toBe(1);
  });

  it('counts slow walking above the stop limit as time, not as a stop', () => {
    const s = run([[600, 3], [120, 1.5], [1400, 3.2]]);
    const w = fastestWindow(s, 5000)!;
    expect(w.stops).toBe(0);
    expect(w.stoppedSec).toBe(0);
    expect(w.seconds).toBeCloseTo(fastestWindow(s, 5000, 'count')!.seconds, 6);
  });

  it('keeps stoppedSec honest at the edges of the stretch', () => {
    // A stop at the very start and at the very end of the run is outside every stretch.
    const s = run([[60, 0], [1700, 3], [60, 0]]);
    const w = fastestWindow(s, 5000)!;
    expect(w.stops).toBe(0);
    expect(w.stoppedSec).toBe(0);
    expect(w.seconds).toBeCloseTo(5000 / 3, 0);
  });

  it('is never faster than the fastest possible time of the series (made-up runs with stops and stutters)', () => {
    let seed = 11;
    const rnd = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 0xffffffff;
    };
    let found = 0;
    for (let round = 0; round < 25; round++) {
      const timeSec: number[] = [];
      const distanceM: number[] = [];
      let t = 0;
      let d = 0;
      while (d < 40000) {
        const kind = rnd();
        const len = 3 + Math.floor(rnd() * 25);
        const v = 2.8 + rnd() * 0.6;
        for (let q = 0; q < len; q++) {
          timeSec.push(t);
          distanceM.push(d);
          if (kind < 0.05) {
            // standing still, the clock running
          } else if (kind < 0.08) {
            d += 0.2 + rnd() * 0.9;
          } else if (kind < 0.085) {
            // a stutter: still, then the distance in one go
            if (q === len - 1) d += v * len * 1.2;
          } else if (kind < 0.11) {
            t += 20 + Math.floor(rnd() * 40);
          } else {
            d += v;
          }
          t++;
        }
      }
      timeSec.push(t);
      distanceM.push(d);
      const s = { timeSec, distanceM };
      const w = fastestWindow(s, 5000);
      if (!w) continue;
      found++;
      expect(w.seconds).toBeGreaterThanOrEqual(5000 / maxSpeed(s) - 1e-6);
    }
    expect(found).toBeGreaterThan(10);
  });

  it('reads a city test with an automatic pause, creeps and a hard start as a plausible stretch', () => {
    // Made up: a hard start at 3,1 m/s, one pause of 23 s with 1,3 m of distance (no readings in it),
    // creeps of 72, 34 and 7 seconds, and a total of about 6 km in 36 minutes.
    const timeSec: number[] = [];
    const distanceM: number[] = [];
    let t = 0;
    let d = 0;
    const push = () => {
      timeSec.push(t);
      distanceM.push(d);
    };
    const move = (sec: number, v: number) => {
      for (let q = 0; q < sec; q++) {
        push();
        d += v;
        t++;
      }
    };
    move(780, 3.1);
    push();
    t += 23;
    d += 1.3;
    move(240, 3.0);
    move(72, 0.2);
    move(380, 2.9);
    move(7, 0.4);
    move(145, 3.0);
    move(34, 0.3);
    move(430, 3.0);
    move(150, 2.8);
    push();
    const s = { timeSec, distanceM };
    // The old reading had no whole stretch.
    expect(fastestWindow(s, 5000, 'count')).toBeUndefined();
    const w = fastestWindow(s, 5000)!;
    expect(w).toBeDefined();
    expect(w.stops).toBeGreaterThanOrEqual(3);
    expect(w.stoppedSec).toBeGreaterThan(100);
    expect(w.seconds).toBeGreaterThanOrEqual(5000 / maxSpeed(s) - 1e-6);
    expect(w.seconds).toBeGreaterThan(1500);
    expect(w.seconds).toBeLessThan(1800);
  });
});

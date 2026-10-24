import { describe, it, expect } from 'vitest';
import {
  FAST_KMH,
  FAST_MIN_SEC,
  chartSeries,
  sliceStreams,
  suggestTrim,
  trimActivity,
  trimmedNumbers,
  zeroBased,
} from './activityTrim';
import { joinStreams, makeDrive, makeStreams } from './fixtures/runStreams';

// Made-up series only (src/engine/fixtures/runStreams.ts): a run of an hour at
// 6:00 per kilometre (10 km) that climbs for 20 minutes, is level for 20 and
// goes down for 20, with a drive recorded after it or before it.
const run = () =>
  makeStreams({ minutes: 60, pace: 360, hr: 150, grade: (m) => (m < 20 ? 0.04 : m < 40 ? 0 : -0.04), startAltitude: 20 });

describe('what the series say of a stretch', () => {
  const streams = run();
  const last = streams.timeSec[streams.timeSec.length - 1];

  it('measures the whole hour: time, distance, climb, descent, heart rate', () => {
    const all = trimActivity(streams, 0, last + 1)!;
    expect(all.durationMinutes).toBe(60);
    expect(all.distanceKm).toBeCloseTo(10, 1);
    // The dead band of 5 metres holds back a little of the 133 metres climbed.
    expect(all.elevationGainM).toBeGreaterThan(115);
    expect(all.elevationGainM).toBeLessThan(135);
    expect(all.elevationLossM).toBeGreaterThan(115);
    expect(all.elevationLossM).toBeLessThan(135);
    expect(all.avgHeartRate).toBe(150);
    expect(all.maxHeartRate).toBe(150);
  });

  it('measures only the stretch asked for', () => {
    const firstTwenty = trimActivity(streams, 0, 1200)!;
    expect(firstTwenty.durationMinutes).toBe(20);
    expect(firstTwenty.distanceKm).toBeCloseTo(3.33, 1);
    expect(firstTwenty.elevationGainM).toBeGreaterThan(115);
    expect(firstTwenty.elevationLossM).toBe(0);
    const middle = trimActivity(streams, 1200, 2400)!;
    expect(middle.durationMinutes).toBe(20);
    expect(middle.elevationGainM).toBe(0);
    expect(middle.elevationLossM).toBe(0);
    const lastTwenty = trimActivity(streams, 2400, last + 1)!;
    expect(lastTwenty.elevationLossM).toBeGreaterThan(115);
  });

  it('adds up: the pieces of a cut are the whole, to the second', () => {
    const a = trimActivity(streams, 0, 1700)!;
    const b = trimActivity(streams, 1700, last + 1)!;
    const all = trimActivity(streams, 0, last + 1)!;
    expect(a.durationMinutes + b.durationMinutes).toBe(all.durationMinutes);
    expect((a.distanceKm ?? 0) + (b.distanceKm ?? 0)).toBeCloseTo(all.distanceKm ?? 0, 1);
    expect((a.elevationGainM ?? 0) + (b.elevationGainM ?? 0)).toBeCloseTo(all.elevationGainM ?? 0, -1);
  });

  it('does not count a pause as moving time', () => {
    const paused = makeStreams({ minutes: 60, pace: 360, hr: 150, pauses: [{ atMinute: 30, seconds: 120 }] });
    expect(paused.timeSec[paused.timeSec.length - 1]).toBe(3720);
    expect(trimActivity(paused, 0, 4000)!.durationMinutes).toBe(60);
  });

  it('leaves out what the series cannot say', () => {
    const noHeart = makeStreams({ minutes: 20, pace: 360, hr: null });
    const out = trimActivity(noHeart, 0, 600)!;
    expect(out.avgHeartRate).toBeUndefined();
    expect(out.maxHeartRate).toBeUndefined();
    const onlyTime = { timeSec: Array.from({ length: 600 }, (_, i) => i), heartRate: Array.from({ length: 600 }, () => 140) };
    const bare = trimActivity(onlyTime, 0, 300)!;
    expect(bare.distanceKm).toBeUndefined();
    expect(bare.elevationGainM).toBeUndefined();
    expect(bare.durationMinutes).toBe(5);
    expect(bare.avgHeartRate).toBe(140);
  });

  it('gives nothing for a stretch without movement, a backwards stretch or bad series', () => {
    expect(trimActivity(streams, 5000, 6000)).toBeUndefined();
    expect(trimActivity(streams, 600, 600)).toBeUndefined();
    expect(trimActivity(streams, 900, 600)).toBeUndefined();
    expect(trimActivity({ timeSec: [] }, 0, 100)).toBeUndefined();
    expect(trimActivity({ timeSec: [0] }, 0, 100)).toBeUndefined();
    expect(trimActivity({ timeSec: [0, Number.NaN, 2] }, 0, 100)).toBeUndefined();
  });
});

describe('the numbers of a log after a cut', () => {
  const withDrive = joinStreams(run(), makeDrive({ minutes: 14, kmh: 50, walkSec: 60, standSec: 30, hr: 85 }));
  const total = withDrive.timeSec[withDrive.timeSec.length - 1];
  // What the watch says of the whole thing: the length and the distance the series
  // give too, and its own idea of the climb (a little more than the dead band lets through).
  const own = trimActivity(withDrive, 0, total + 1)!;
  const watch = { durationMinutes: own.durationMinutes, distanceKm: own.distanceKm!, elevationGainM: 140, elevationLossM: 138, avgHeartRate: 128, maxHeartRate: 171 };

  it('takes off what lies in the piece that is cut, and keeps the watch for the rest', () => {
    const out = trimmedNumbers(withDrive, 0, 3600, watch)!;
    expect(out.durationMinutes).toBe(60);
    expect(out.distanceKm).toBeCloseTo(10, 0);
    // The drive was level: the watch's own 140 and 138 hardly change.
    expect(out.elevationGainM).toBeGreaterThanOrEqual(139);
    expect(out.elevationGainM).toBeLessThanOrEqual(140);
    expect(out.elevationLossM).toBeGreaterThanOrEqual(137);
    expect(out.elevationLossM).toBeLessThanOrEqual(138);
    // The heart rate is that of what is kept.
    expect(out.avgHeartRate).toBe(150);
    expect(out.maxHeartRate).toBe(150);
  });

  it('takes the climb with it when the climbing piece is cut', () => {
    const out = trimmedNumbers(withDrive, 1200, total + 1, watch)!;
    expect(out.durationMinutes).toBe(watch.durationMinutes - 20);
    expect(out.elevationGainM).toBeLessThan(20);
    expect(out.elevationLossM).toBeGreaterThanOrEqual(137);
  });

  it('changes nothing when nothing is cut', () => {
    expect(trimmedNumbers(withDrive, 0, total, watch)).toBeUndefined();
    expect(trimmedNumbers(withDrive, -50, total + 100, watch)).toBeUndefined();
  });

  it('only returns what the log has, and never adds a number', () => {
    const out = trimmedNumbers(withDrive, 0, 3600, { durationMinutes: watch.durationMinutes, distanceKm: watch.distanceKm })!;
    expect(Object.keys(out).sort()).toEqual(['distanceKm', 'durationMinutes']);
  });

  it('leaves out what the series cannot judge', () => {
    const noAltitude = { ...withDrive, altitudeM: undefined };
    const out = trimmedNumbers(noAltitude, 0, 3600, watch)!;
    expect(out.elevationGainM).toBeUndefined();
    expect(out.elevationLossM).toBeUndefined();
    expect(out.distanceKm).toBeDefined();
  });

  it('is undefined when what is kept does not move, or the series are no use', () => {
    expect(trimmedNumbers(withDrive, total + 10, total + 20, watch)).toBeUndefined();
    expect(trimmedNumbers({ timeSec: [0, 1] }, 0, 1, watch)).toBeUndefined();
  });

  it('never makes a number larger than the log had', () => {
    const out = trimmedNumbers(withDrive, 0, 3600, { durationMinutes: 40, distanceKm: 3, elevationGainM: 10, avgHeartRate: 100, maxHeartRate: 120 })!;
    expect(out.durationMinutes).toBeLessThanOrEqual(40);
    expect(out.distanceKm).toBeLessThanOrEqual(3);
    expect(out.elevationGainM).toBeLessThanOrEqual(10);
    expect(out.maxHeartRate).toBeLessThanOrEqual(120);
  });
});

describe('where a stretch is too fast for the sport', () => {
  it('finds a drive at the end and proposes to keep up to where it began', () => {
    const streams = joinStreams(run(), makeDrive({ minutes: 14, kmh: 50, walkSec: 60, standSec: 30, hr: 85 }));
    const s = suggestTrim(streams, 'running')!;
    expect(s.startSec).toBe(0);
    // The drive starts at 3691 s, after a minute of walking and half a minute of standing.
    expect(s.endSec).toBeGreaterThanOrEqual(3600);
    expect(s.endSec).toBeLessThanOrEqual(3700);
    expect(s.atEnd?.fromSec).toBe(s.endSec);
    expect(s.atEnd!.kmh).toBeGreaterThanOrEqual(45);
    expect(s.atEnd!.kmh).toBeLessThanOrEqual(51);
    expect(s.atStart).toBeUndefined();
  });

  it('finds a drive at the beginning', () => {
    const streams = joinStreams(makeDrive({ minutes: 6, kmh: 40, hr: 85 }), run());
    const s = suggestTrim(streams, 'running')!;
    expect(s.atStart).toBeDefined();
    expect(s.atEnd).toBeUndefined();
    expect(s.atStart!.kmh).toBeGreaterThanOrEqual(35);
    expect(s.atStart!.kmh).toBeLessThanOrEqual(41);
    expect(s.startSec).toBe(s.atStart!.toSec);
    // The drive is over 6.5 minutes in; the run is still all there.
    expect(s.startSec).toBeGreaterThan(6 * 60);
    expect(s.startSec).toBeLessThan(7.5 * 60);
    expect(s.endSec).toBe(streams.timeSec[streams.timeSec.length - 1]);
  });

  it('finds both', () => {
    const streams = joinStreams(joinStreams(makeDrive({ minutes: 5, kmh: 45, hr: 85 }), run()), makeDrive({ minutes: 10, kmh: 60, walkSec: 40, standSec: 20, hr: 85 }));
    const s = suggestTrim(streams, 'running')!;
    expect(s.atStart).toBeDefined();
    expect(s.atEnd).toBeDefined();
    expect(s.startSec).toBeLessThan(s.endSec);
    const kept = trimActivity(streams, s.startSec, s.endSec)!;
    // The hour of running is what is kept, plus the walk to the car.
    expect(kept.durationMinutes).toBeGreaterThanOrEqual(60);
    expect(kept.durationMinutes).toBeLessThanOrEqual(62);
  });

  it('counts a drive with a traffic light as one drive', () => {
    const streams = joinStreams(run(), makeDrive({ minutes: 14, kmh: 50, walkSec: 30, standSec: 20, stops: [{ atMinute: 5, seconds: 70 }], hr: 85 }));
    const s = suggestTrim(streams, 'running')!;
    expect(s.endSec).toBeLessThanOrEqual(3600 + 60);
  });

  it('only cuts the last part of a drive with a long stop in between', () => {
    const streams = joinStreams(run(), makeDrive({ minutes: 14, kmh: 50, walkSec: 30, standSec: 20, stops: [{ atMinute: 5, seconds: 240 }], hr: 85 }));
    const s = suggestTrim(streams, 'running')!;
    expect(s.endSec).toBeGreaterThan(3600 + 5 * 60);
  });

  it('finds nothing in a plain run, a run with a short sprint or a run with a pause', () => {
    expect(suggestTrim(run(), 'running')).toBeUndefined();
    const sprint = makeStreams({ minutes: 60, pace: (m) => (m > 59.25 ? 144 : 360), hr: 150 });
    expect(suggestTrim(sprint, 'running')).toBeUndefined();
    const paused = makeStreams({ minutes: 60, pace: 360, hr: 150, pauses: [{ atMinute: 30, seconds: 300 }] });
    expect(suggestTrim(paused, 'running')).toBeUndefined();
  });

  it('flags a fast minute and a half at the end', () => {
    const fast = makeStreams({ minutes: 60, pace: (m) => (m > 58.5 ? 144 : 360), hr: 150 });
    expect(suggestTrim(fast, 'running')?.atEnd).toBeDefined();
  });

  it('leaves a fast stretch in the middle alone: a trim only cuts the edges', () => {
    const streams = joinStreams(joinStreams(makeStreams({ minutes: 20, pace: 360, hr: 150 }), makeDrive({ minutes: 10, kmh: 50, hr: 85 })), makeStreams({ minutes: 20, pace: 360, hr: 150 }));
    expect(suggestTrim(streams, 'running')).toBeUndefined();
  });

  it('finds nothing in a drive on its own, or when less than five minutes would be left', () => {
    expect(suggestTrim(makeDrive({ minutes: 10, kmh: 50, walkSec: 20, standSec: 20 }), 'running')).toBeUndefined();
    const short = joinStreams(makeStreams({ minutes: 3, pace: 360, hr: 150 }), makeDrive({ minutes: 14, kmh: 50, walkSec: 30, standSec: 20 }));
    expect(suggestTrim(short, 'running')).toBeUndefined();
  });

  it('holds a hike to a lower speed than a run, and a ride to a higher one', () => {
    expect(FAST_KMH.hiking).toBeLessThan(FAST_KMH.running);
    expect(FAST_KMH.cycling).toBeGreaterThan(FAST_KMH.running);
    expect(FAST_MIN_SEC.cycling).toBeGreaterThanOrEqual(FAST_MIN_SEC.running);
    // 17 km/h at the end of a walk: not walking, but also not a run that is too fast.
    const hike = joinStreams(makeStreams({ minutes: 90, pace: 720, hr: 120 }), makeDrive({ minutes: 6, kmh: 17, walkSec: 30, standSec: 10 }));
    expect(suggestTrim(hike, 'hiking')?.atEnd).toBeDefined();
    expect(suggestTrim(hike, 'running')).toBeUndefined();
  });

  it('lets a rider descend fast in the middle, and flags a drive after a ride', () => {
    const ride = makeStreams({ minutes: 90, pace: (m) => (m > 40 && m < 43.5 ? 51 : 120), hr: 140 });
    expect(suggestTrim(ride, 'cycling')).toBeUndefined();
    const home = joinStreams(ride, makeDrive({ minutes: 12, kmh: 95, walkSec: 30, standSec: 20 }));
    expect(suggestTrim(home, 'cycling')?.atEnd).toBeDefined();
  });

  it('gives nothing for empty, short or speedless series', () => {
    expect(suggestTrim({ timeSec: [] }, 'running')).toBeUndefined();
    expect(suggestTrim({ timeSec: [0] }, 'running')).toBeUndefined();
    expect(suggestTrim({ timeSec: Array.from({ length: 10 }, (_, i) => i), speedMs: Array.from({ length: 10 }, () => 14) }, 'running')).toBeUndefined();
    expect(suggestTrim({ timeSec: Array.from({ length: 100 }, (_, i) => i), heartRate: Array.from({ length: 100 }, () => 140) }, 'running')).toBeUndefined();
  });

  it('also reads the speed from the distance when there is no speed series', () => {
    const streams = joinStreams(run(), makeDrive({ minutes: 14, kmh: 50, walkSec: 30, standSec: 20 }));
    const { speedMs: _drop, ...noSpeed } = streams;
    void _drop;
    expect(suggestTrim(noSpeed, 'running')?.atEnd).toBeDefined();
  });
});

describe('the helpers', () => {
  it('starts the clock at 0 and leaves a clock that does so alone', () => {
    const shifted = { timeSec: [100, 101, 102], speedMs: [1, 2, 3] };
    expect(zeroBased(shifted).timeSec).toEqual([0, 1, 2]);
    const plain = run();
    expect(zeroBased(plain)).toBe(plain);
  });

  it('cuts every series to the stretch and starts the clock at 0', () => {
    const streams = makeStreams({ minutes: 10, pace: 360, hr: 150, cadence: 170, start: { lat: 52.1, lon: 5.1 } });
    const part = sliceStreams(streams, 120, 300);
    expect(part.timeSec[0]).toBe(0);
    expect(part.timeSec[part.timeSec.length - 1]).toBe(180);
    expect(part.distanceM).toHaveLength(part.timeSec.length);
    expect(part.heartRate).toHaveLength(part.timeSec.length);
    expect(part.cadence).toHaveLength(part.timeSec.length);
    expect(part.start).toEqual({ lat: 52.1, lon: 5.1 });
  });

  it('boils the series down to a picture: speed over time, the drive stands out', () => {
    const streams = joinStreams(run(), makeDrive({ minutes: 14, kmh: 50, walkSec: 60, standSec: 30, hr: 85 }));
    const chart = chartSeries(streams, 60)!;
    expect(chart.kmh).toHaveLength(60);
    expect(chart.totalSec).toBe(streams.timeSec[streams.timeSec.length - 1]);
    expect(chart.kmh[5]).toBeCloseTo(10, 0);
    expect(chart.kmh[55] as number).toBeGreaterThan(40);
    expect(chart.altitudeM).toHaveLength(60);
    expect(chart.heartRate).toHaveLength(60);
    expect(chartSeries({ timeSec: [] })).toBeUndefined();
    expect(chartSeries({ timeSec: [0, 1, 2] })).toBeUndefined();
  });
});

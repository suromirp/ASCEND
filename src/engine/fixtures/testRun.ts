// Made-up series for the tests of "Run in detail": a run built from stretches, each with its own
// pace, so a test with a fast start, a pause or a slope can be written down in a few lines.
// One reading per second, nothing that belongs to a real person, place or account.

import type { StreamSet } from '../../models/activityDetail';

export type Heading = 'north' | 'west' | 'east' | 'south';

export interface Seg {
  // Metres of this stretch.
  m: number;
  // Seconds per kilometre.
  pace: number;
  // Metres of altitude gained (negative: lost) over the stretch.
  climb?: number;
  heading?: Heading;
  // Heart rate; by default it rises a little with the distance.
  hr?: number;
}

export interface SegOptions {
  // Stand still for some seconds when this many metres are covered (the watch keeps writing).
  pauses?: { atM: number; seconds: number }[];
  // Also write a track, from a made-up place on a made-up grid.
  position?: boolean;
  // Leave out the heart rate.
  noHr?: boolean;
  // A clock that starts later than 0.
  startSec?: number;
}

const LAT0 = 52.0;
const LON0 = 5.0;
const DEG_PER_M = 1 / 111_320;

export function segmentRun(segs: Seg[], opts: SegOptions = {}): StreamSet {
  const timeSec: number[] = [];
  const distanceM: number[] = [];
  const speedMs: number[] = [];
  const altitudeM: number[] = [];
  const heartRate: (number | null)[] = [];
  const cadence: (number | null)[] = [];
  const stepLengthM: (number | null)[] = [];
  const powerW: (number | null)[] = [];
  const respirationRpm: (number | null)[] = [];
  const temperatureC: (number | null)[] = [];
  const lat: (number | null)[] = [];
  const lon: (number | null)[] = [];

  let clock = opts.startSec ?? 0;
  let dist = 0;
  let alt = 20;
  let la = LAT0;
  let lo = LON0;
  const pauses = [...(opts.pauses ?? [])].sort((a, b) => a.atM - b.atM);
  let nextPause = 0;

  const push = (v: number, seg: Seg) => {
    timeSec.push(clock);
    distanceM.push(Math.round(dist * 100) / 100);
    speedMs.push(Math.round(v * 1000) / 1000);
    altitudeM.push(Math.round(alt * 10) / 10);
    heartRate.push(opts.noHr ? null : (seg.hr ?? Math.round(150 + 3 * (dist / 1000))));
    cadence.push(v > 0 ? 172 : null);
    stepLengthM.push(v > 0 ? Math.round((v / (172 / 60)) * 1000) / 1000 : null);
    powerW.push(v > 0 ? 250 : null);
    respirationRpm.push(40);
    temperatureC.push(24.5);
    lat.push(la);
    lon.push(lo);
  };

  push(0, segs[0]);
  for (const seg of segs) {
    const v = 1000 / seg.pace;
    const climbPerM = (seg.climb ?? 0) / seg.m;
    let covered = 0;
    while (covered < seg.m - 1e-9) {
      const step = Math.min(v, seg.m - covered);
      covered += step;
      dist += step;
      alt += climbPerM * step;
      const h = seg.heading ?? 'north';
      if (h === 'north') la += step * DEG_PER_M;
      else if (h === 'south') la -= step * DEG_PER_M;
      else if (h === 'west') lo -= (step * DEG_PER_M) / Math.cos((la * Math.PI) / 180);
      else lo += (step * DEG_PER_M) / Math.cos((la * Math.PI) / 180);
      clock += step / v;
      push(v, seg);
      while (nextPause < pauses.length && pauses[nextPause].atM <= dist) {
        const p = pauses[nextPause++];
        for (let k = 0; k < p.seconds; k++) {
          clock += 1;
          push(0, seg);
        }
      }
    }
  }

  const set: StreamSet = { timeSec: timeSec.map((t) => Math.round(t * 1000) / 1000), distanceM, speedMs, altitudeM };
  if (!opts.noHr) set.heartRate = heartRate;
  set.cadence = cadence;
  set.stepLengthM = stepLengthM;
  set.powerW = powerW;
  set.respirationRpm = respirationRpm;
  set.temperatureC = temperatureC;
  if (opts.position) set.position = { lat, lon };
  return set;
}

// A 5 km test with a fast start, after one kilometre of easy warm-up and before 0.6 km of
// cooling down. The test kilometres are 5:22, 5:38, 5:58, 6:02 and 5:45. The first two test
// kilometres go north, the other three west (so a wind from the west is a headwind on them).
export const TEST_PACES = [322, 338, 358, 362, 345];
export function fastStartTest(opts: SegOptions = {}): StreamSet {
  return segmentRun(
    [
      { m: 1000, pace: 395, hr: 128, heading: 'north' },
      { m: 1000, pace: TEST_PACES[0], heading: 'north' },
      { m: 1000, pace: TEST_PACES[1], heading: 'north' },
      { m: 1000, pace: TEST_PACES[2], heading: 'west' },
      { m: 1000, pace: TEST_PACES[3], heading: 'west' },
      { m: 1000, pace: TEST_PACES[4], heading: 'west' },
      { m: 600, pace: 400, hr: 140, heading: 'west' },
    ],
    opts,
  );
}

// The same series the way the provider answers a streams request, with every kind of series.
export function asFullAnswer(set: StreamSet): unknown[] {
  const out: unknown[] = [{ type: 'time', data: set.timeSec }];
  const add = (type: string, data: (number | null)[] | undefined) => {
    if (data) out.push({ type, data });
  };
  add('distance', set.distanceM);
  add('heartrate', set.heartRate);
  add('velocity_smooth', set.speedMs);
  add('altitude', set.altitudeM);
  add('cadence', set.cadence);
  add('watts', set.powerW);
  add('step_length', set.stepLengthM?.map((v) => (v === null ? null : v * 1000)));
  add('respiration', set.respirationRpm);
  add('temp', set.temperatureC);
  if (set.position) out.push({ type: 'latlng', data: set.position.lat, data2: set.position.lon });
  return out;
}

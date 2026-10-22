// Made-up series of a run or tocht for the tests of the loopinzicht: one
// reading per second, deterministic noise, nothing that belongs to a real
// person or a real account.

import type { StreamSet } from '../../models/activityDetail';

export interface RunSpec {
  // Moving minutes.
  minutes: number;
  // Seconds per kilometre, or a function of the minute.
  pace: number | ((minute: number) => number);
  // Heart rate, or a function of the minute.
  hr?: number | ((minute: number) => number) | null;
  // Gradient as a fraction (0.05 is 5 percent), or a function of the minute.
  grade?: number | ((minute: number) => number);
  cadence?: number | ((minute: number) => number);
  // Running dynamics as a function of the minute; absent means not measured.
  stanceTimeMs?: number | ((minute: number) => number);
  stanceBalance?: number;
  stepLengthM?: number | ((minute: number) => number);
  // Pauses: stand still for some seconds after a number of moving minutes.
  pauses?: { atMinute: number; seconds: number }[];
  // Heart rate dropouts: no reading from this minute for this many seconds.
  hrGaps?: { atMinute: number; seconds: number }[];
  startAltitude?: number;
  // Noise of the heart rate in beats, of the barometer in metres.
  hrNoise?: number;
  baroNoise?: number;
  seed?: number;
  start?: { lat: number; lon: number };
}

const at = (v: number | ((m: number) => number) | undefined | null, minute: number): number | undefined =>
  v === undefined || v === null ? undefined : typeof v === 'function' ? v(minute) : v;

// A small deterministic noise in [-1, 1].
function noise(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return (s / 0xffffffff) * 2 - 1;
  };
}

export function makeStreams(spec: RunSpec): StreamSet {
  const rand = noise(spec.seed ?? 7);
  const timeSec: number[] = [];
  const distanceM: number[] = [];
  const speedMs: number[] = [];
  const altitudeM: number[] = [];
  const heartRate: (number | null)[] = [];
  const cadence: (number | null)[] = [];
  const stance: (number | null)[] = [];
  const balance: (number | null)[] = [];
  const step: (number | null)[] = [];

  let clock = 0;
  let dist = 0;
  let alt = spec.startAltitude ?? 20;
  const pauses = [...(spec.pauses ?? [])].sort((a, b) => a.atMinute - b.atMinute);
  let nextPause = 0;
  const movingTotal = Math.round(spec.minutes * 60);
  const push = (moving: boolean, minute: number) => {
    const pace = at(spec.pace, minute) ?? 360;
    const v = moving ? 1000 / pace : 0;
    if (moving) {
      dist += v;
      alt += (at(spec.grade, minute) ?? 0) * v;
    }
    timeSec.push(clock);
    distanceM.push(Math.round(dist * 10) / 10);
    speedMs.push(Math.round(v * 100) / 100);
    altitudeM.push(Math.round((alt + (spec.baroNoise ?? 0) * rand()) * 10) / 10);
    const base = at(spec.hr, minute);
    const gap = (spec.hrGaps ?? []).some((g) => minute >= g.atMinute && minute < g.atMinute + g.seconds / 60);
    heartRate.push(base === undefined || gap ? null : Math.round((base + (spec.hrNoise ?? 0) * rand()) * 10) / 10);
    cadence.push(moving ? (at(spec.cadence, minute) ?? null) : null);
    stance.push(moving ? (at(spec.stanceTimeMs, minute) ?? null) : null);
    balance.push(moving && spec.stanceBalance !== undefined ? spec.stanceBalance : null);
    step.push(moving ? (at(spec.stepLengthM, minute) ?? null) : null);
  };

  push(true, 0);
  for (let movedSec = 1; movedSec <= movingTotal; movedSec++) {
    clock += 1;
    push(true, movedSec / 60);
    while (nextPause < pauses.length && pauses[nextPause].atMinute * 60 <= movedSec) {
      const p = pauses[nextPause++];
      // The watch keeps writing a line a second while you stand still.
      for (let k = 0; k < p.seconds; k++) {
        clock += 1;
        push(false, movedSec / 60);
      }
    }
  }

  const set: StreamSet = { timeSec, distanceM, speedMs, altitudeM };
  if (spec.hr !== null && spec.hr !== undefined) set.heartRate = heartRate;
  if (spec.cadence !== undefined) set.cadence = cadence;
  if (spec.stanceTimeMs !== undefined) set.stanceTimeMs = stance;
  if (spec.stanceBalance !== undefined) set.stanceBalanceLeftPct = balance;
  if (spec.stepLengthM !== undefined) set.stepLengthM = step;
  if (spec.start) set.start = spec.start;
  return set;
}

// The same series the way the provider answers a streams request (a list of
// { type, data }), so the adapter and the storage can be tested end to end.
export function asProviderAnswer(set: StreamSet): unknown[] {
  const out: unknown[] = [{ type: 'time', data: set.timeSec }];
  const add = (type: string, data: (number | null)[] | undefined) => {
    if (data) out.push({ type, data });
  };
  add('distance', set.distanceM);
  add('heartrate', set.heartRate);
  add('velocity_smooth', set.speedMs);
  add('altitude', set.altitudeM);
  add('cadence', set.cadence);
  add('stance_time', set.stanceTimeMs);
  add('stance_time_balance', set.stanceBalanceLeftPct);
  add('vertical_oscillation', set.verticalOscillationMm);
  add('vertical_ratio', set.verticalRatioPct);
  // Millimetres at the provider.
  add('step_length', set.stepLengthM?.map((v) => (v === null ? null : v * 1000)));
  if (set.start) {
    const { lat, lon } = set.start;
    out.push({ type: 'latlng', data: set.timeSec.map(() => lat + 0.004), data2: set.timeSec.map(() => lon + 0.004) });
  }
  return out;
}

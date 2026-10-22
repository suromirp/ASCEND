// ASCEND: from the series of one activity to a compact profile.
//
// Pure and provider-free (docs/onderzoek/Loopgegevens en vooruitgang.md,
// hoofdstuk 4): an adapter turns whatever its provider sends into a StreamSet,
// and this file makes the profile that is kept on the log: 48 pieces of equal
// moving time and the climbs and descents it found. The raw series are never
// stored, and the track not at all.
//
// What it does, in order:
// - pauses go: a jump in time over 10 seconds, or standing still, is not
//   moving time and counts for nothing;
// - a gap in the heart rate up to 5 seconds is filled, a longer one stays a
//   gap and lowers the coverage the profile reports;
// - the altitude is smoothed with a dead band of 5 metres (a reading only
//   counts when it moves more than that from the line), so the barometer's
//   noise does not become climbing;
// - climbs and descents are found in the smoothed altitude: a rise or fall of
//   at least 50 metres and 4 minutes, which may be interrupted by no more than
//   10 metres against the direction;
// - the own climb is laid against the climb the source reports, as a check.

import type { ActivityDetail, DetailConditions, DetailSlice, RunDynamics, StreamSet, TerrainStretch } from '../models/activityDetail';
import type { MetricSource } from '../models/training';

export const SLICE_COUNT = 48;
export const PAUSE_JUMP_SEC = 10;
export const STILL_SPEED_MS = 0.4;
export const HEART_RATE_GAP_SEC = 5;
export const ALTITUDE_DEAD_BAND_M = 10 / 2;
export const STRETCH_REVERSAL_M = 10;
export const STRETCH_MIN_M = 50;
const TRIM_TOLERANCE_M = 1;
export const STRETCH_MIN_SEC = 240;
// Shorter than this there is nothing to say about.
export const MIN_MOVING_SEC = 300;

export interface BuildOptions {
  source: MetricSource;
  // On a treadmill the altitude is an estimate: no climbs or descents.
  treadmill?: boolean;
  // The climb the source reports for the whole activity, metres.
  reportedGainM?: number;
  conditions?: DetailConditions;
}

type Series = (number | null)[] | undefined;

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const round = (n: number, decimals = 0) => {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
};

// Fills the holes of a series that last at most `maxGapSec` by a straight line
// between the readings on both sides; a longer hole stays null. A hole at the
// start or end is never filled.
export function fillGaps(values: Series, times: number[], maxGapSec: number): (number | null)[] | undefined {
  if (!values) return undefined;
  const out: (number | null)[] = values.map((v) => (isNum(v) ? v : null));
  let prev = -1;
  for (let i = 0; i < out.length; i++) {
    if (out[i] === null) continue;
    if (prev >= 0 && i - prev > 1 && times[i] - times[prev] <= maxGapSec) {
      const a = out[prev] as number;
      const b = out[i] as number;
      for (let j = prev + 1; j < i; j++) out[j] = a + ((b - a) * (times[j] - times[prev])) / (times[i] - times[prev]);
    }
    prev = i;
  }
  return out;
}

// The dead band: the line follows a reading only once it is more than `band`
// away from it, and then stays `band` behind. Gaps are carried forward.
export function deadBand(values: (number | null)[], band: number): number[] {
  const out: number[] = new Array(values.length).fill(0);
  let y: number | undefined;
  for (let i = 0; i < values.length; i++) {
    const x = values[i];
    if (isNum(x)) {
      if (y === undefined) y = x;
      else if (x > y + band) y = x - band;
      else if (x < y - band) y = x + band;
    }
    out[i] = y ?? 0;
  }
  return out;
}

// The turning points of a line: a leg counts only when it reverses by at
// least `threshold` against the leg before it.
export function turningPoints(y: number[], threshold: number): number[] {
  if (y.length < 2) return [];
  const turning: number[] = [];
  let dir: 0 | 1 | -1 = 0;
  let minI = 0;
  let maxI = 0;
  let ext = 0;
  for (let k = 1; k < y.length; k++) {
    if (dir === 0) {
      if (y[k] < y[minI]) minI = k;
      if (y[k] > y[maxI]) maxI = k;
      if (y[k] - y[minI] >= threshold) {
        dir = 1;
        turning.push(minI);
        ext = k;
      } else if (y[maxI] - y[k] >= threshold) {
        dir = -1;
        turning.push(maxI);
        ext = k;
      }
    } else if (dir === 1) {
      if (y[k] > y[ext]) ext = k;
      else if (y[ext] - y[k] >= threshold) {
        turning.push(ext);
        dir = -1;
        ext = k;
      }
    } else {
      if (y[k] < y[ext]) ext = k;
      else if (y[k] - y[ext] >= threshold) {
        turning.push(ext);
        dir = 1;
        ext = k;
      }
    }
  }
  if (dir !== 0) turning.push(ext);
  return turning;
}

interface Moving {
  // Index in the stream of the sample that closes this interval.
  i: number;
  dt: number;
  dist: number;
  // Moving seconds before and after this interval.
  from: number;
  to: number;
}

const DYNAMIC_KEYS: [keyof RunDynamics, keyof StreamSet, number][] = [
  ['stanceTimeMs', 'stanceTimeMs', 1],
  ['stanceBalanceLeftPct', 'stanceBalanceLeftPct', 1],
  ['verticalOscillationMm', 'verticalOscillationMm', 1],
  ['verticalRatioPct', 'verticalRatioPct', 2],
  ['stepLengthM', 'stepLengthM', 3],
];

// Time-weighted mean of a series over some moving intervals; undefined when
// less than half of that time has a value (a profile does not guess).
function meanOver(values: Series, intervals: Moving[], from = 0, to = intervals.length): number | undefined {
  if (!values) return undefined;
  let sum = 0;
  let covered = 0;
  let total = 0;
  for (let k = from; k < to; k++) {
    const m = intervals[k];
    total += m.dt;
    const v = values[m.i];
    if (isNum(v)) {
      sum += v * m.dt;
      covered += m.dt;
    }
  }
  return total > 0 && covered >= total / 2 ? sum / covered : undefined;
}

export function buildActivityDetail(streams: StreamSet, opts: BuildOptions): ActivityDetail | undefined {
  const t = streams.timeSec;
  const n = t.length;
  if (n < 30 || !t.every(isNum)) return undefined;
  if (!streams.speedMs && !streams.distanceM) return undefined;

  const heart = fillGaps(streams.heartRate?.map((v) => (isNum(v) && v >= 30 && v <= 230 ? v : null)), t, HEART_RATE_GAP_SEC);
  const altitudeFilled = fillGaps(streams.altitudeM, t, 30);
  const altitude = altitudeFilled && altitudeFilled.some(isNum) ? deadBand(altitudeFilled, ALTITUDE_DEAD_BAND_M) : undefined;

  // The moving intervals.
  const moving: Moving[] = [];
  let clock = 0;
  for (let i = 1; i < n; i++) {
    const dt = t[i] - t[i - 1];
    if (dt <= 0 || dt > PAUSE_JUMP_SEC) continue;
    const distDelta = streams.distanceM && isNum(streams.distanceM[i]) && isNum(streams.distanceM[i - 1]) ? Math.max(0, (streams.distanceM[i] as number) - (streams.distanceM[i - 1] as number)) : undefined;
    const v = streams.speedMs && isNum(streams.speedMs[i]) ? (streams.speedMs[i] as number) : distDelta !== undefined ? distDelta / dt : undefined;
    if (v !== undefined && v < STILL_SPEED_MS) continue;
    const dist = distDelta ?? (v !== undefined ? v * dt : 0);
    moving.push({ i, dt, dist, from: clock, to: clock + dt });
    clock += dt;
  }
  const movingSec = clock;
  if (movingSec < MIN_MOVING_SEC) return undefined;

  // Climb and descent per interval, from the smoothed altitude.
  const gain = new Array<number>(moving.length).fill(0);
  const loss = new Array<number>(moving.length).fill(0);
  if (altitude) {
    moving.forEach((m, k) => {
      const d = altitude[m.i] - altitude[m.i - 1];
      if (d > 0) gain[k] = d;
      else loss[k] = -d;
    });
  }

  // The 48 pieces.
  const sliceLen = movingSec / SLICE_COUNT;
  const bucket: number[][] = Array.from({ length: SLICE_COUNT }, () => []);
  moving.forEach((m, k) => bucket[Math.min(SLICE_COUNT - 1, Math.floor((m.from + m.dt / 2) / sliceLen))].push(k));
  const hasDynamics = DYNAMIC_KEYS.some(([, key]) => !!streams[key]);
  const slices: DetailSlice[] = bucket.map((ks) => {
    const part = ks.map((k) => moving[k]);
    const sec = part.reduce((s, m) => s + m.dt, 0);
    const slice: DetailSlice = {
      sec: round(sec, 1),
      distanceM: round(part.reduce((s, m) => s + m.dist, 0)),
      gainM: round(ks.reduce((s, k) => s + gain[k], 0), 1),
      lossM: round(ks.reduce((s, k) => s + loss[k], 0), 1),
    };
    const hr = meanOver(heart, part);
    if (hr !== undefined) slice.heartRate = round(hr, 1);
    const cad = meanOver(streams.cadence, part);
    if (cad !== undefined) slice.cadence = round(cad, 1);
    if (hasDynamics) {
      const dynamics: RunDynamics = {};
      for (const [field, key, decimals] of DYNAMIC_KEYS) {
        const v = meanOver(streams[key] as Series, part);
        if (v !== undefined) dynamics[field] = round(v, decimals);
      }
      if (Object.keys(dynamics).length > 0) slice.dynamics = dynamics;
    }
    return slice;
  });

  // Climbs and descents.
  const stretches: TerrainStretch[] = [];
  if (altitude && !opts.treadmill) {
    // The line at the end of every moving interval, with the clock and distance there.
    const line = moving.map((m) => altitude[m.i]);
    const cumDist: number[] = [];
    let d = 0;
    for (const m of moving) cumDist.push((d += m.dist));
    const turning = turningPoints(line, STRETCH_REVERSAL_M);
    for (let q = 1; q < turning.length; q++) {
      let a = turning[q - 1];
      let b = turning[q];
      // A leg starts where the line leaves the level it was on, and ends where
      // it arrives at the level it stays on: a flat piece before or after is not
      // part of the climb or the descent.
      const startLevel = line[a];
      const endLevel = line[b];
      while (a < b - 1 && Math.abs(line[a + 1] - startLevel) <= TRIM_TOLERANCE_M) a++;
      while (b > a + 1 && Math.abs(line[b - 1] - endLevel) <= TRIM_TOLERANCE_M) b--;
      const metres = Math.abs(line[b] - line[a]);
      const sec = moving[b].to - moving[a].to;
      if (metres < STRETCH_MIN_M || sec < STRETCH_MIN_SEC) continue;
      const distanceM = cumDist[b] - cumDist[a];
      const part = moving.slice(a + 1, b + 1);
      const stretch: TerrainStretch = {
        kind: line[b] > line[a] ? 'climb' : 'descent',
        startSec: round(moving[a].to),
        sec: round(sec),
        distanceM: round(distanceM),
        metres: round(metres),
        gradientPct: distanceM > 0 ? round(Math.min(100, (metres / distanceM) * 100), 1) : 0,
      };
      const hr = meanOver(heart, part);
      if (hr !== undefined) stretch.heartRate = round(hr, 1);
      const cad = meanOver(streams.cadence, part);
      if (cad !== undefined) stretch.cadence = round(cad, 1);
      // Thirds of the stretch by moving time.
      const thirds: NonNullable<TerrainStretch['thirds']> = [];
      for (let third = 0; third < 3; third++) {
        const lo = moving[a].to + (sec * third) / 3;
        const hi = moving[a].to + (sec * (third + 1)) / 3;
        const piece = part.filter((m) => m.from + m.dt / 2 >= lo && m.from + m.dt / 2 < hi);
        if (piece.length === 0) break;
        const first = moving.indexOf(piece[0]);
        const last = moving.indexOf(piece[piece.length - 1]);
        const pieceSec = piece.reduce((s, m) => s + m.dt, 0);
        const rise = Math.abs(line[last] - (first > 0 ? line[first - 1] : line[first]));
        const entry: { metresPerHour: number; heartRate?: number; cadence?: number } = { metresPerHour: round((rise / pieceSec) * 3600) };
        const h = meanOver(heart, piece);
        if (h !== undefined) entry.heartRate = round(h, 1);
        const c = meanOver(streams.cadence, piece);
        if (c !== undefined) entry.cadence = round(c, 1);
        thirds.push(entry);
      }
      if (thirds.length === 3) stretch.thirds = thirds;
      stretches.push(stretch);
    }
  }

  const heartCovered = heart ? moving.reduce((s, m) => s + (isNum(heart[m.i]) ? m.dt : 0), 0) : 0;
  const quality: ActivityDetail['quality'] = { heartRateCoveragePct: round((heartCovered / movingSec) * 100) };
  const ownGain = gain.reduce((s, g) => s + g, 0);
  if (altitude && isNum(opts.reportedGainM) && opts.reportedGainM > 0) quality.gainAgreementPct = round((ownGain / opts.reportedGainM) * 100);
  const balance = streams.stanceBalanceLeftPct;
  if (balance && balance.filter(isNum).length >= n * 0.1) quality.chestStrapSeen = true;

  return {
    version: 1,
    source: opts.source,
    sliceCount: SLICE_COUNT,
    slices,
    stretches,
    ...(opts.conditions ? { conditions: opts.conditions } : {}),
    movingSec: round(movingSec),
    quality,
  };
}

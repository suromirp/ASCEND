// ASCEND: "Inkorten", the stream part: what is left of an activity when a piece
// at the beginning and/or the end is cut away, and where a piece is probably
// not yours (docs/beslissingen/2026-10-24-activiteit-inkorten.md).
//
// Pure and provider-free: it reads a StreamSet (models/activityDetail.ts, the
// series of one activity in ASCEND's units) and nothing else. The log side, what
// is written to a SessionLog and how it is put back, is engine/trimLog.ts.
//
// Two rules keep the numbers honest:
// - The pieces use the same definitions as the profile of a run
//   (engine/activityDetail.ts): a jump in time over 10 seconds or standing still
//   is no moving time, and the altitude goes through the same dead band of 5
//   metres, so the barometer's noise does not become climbing.
// - The numbers of a log come from the watch, and the series never add up to
//   them exactly. So a log is not recalculated from the series: what is cut away
//   is measured in the series and taken off the numbers the log already has
//   (`trimmedNumbers`). Cutting nothing changes nothing, and the climb of a log
//   that says 410 m does not become 380 m because the series say so.

import type { StreamSet } from '../models/activityDetail';
import type { TrimField } from '../models/training';
import { ALTITUDE_DEAD_BAND_M, HEART_RATE_GAP_SEC, PAUSE_JUMP_SEC, STILL_SPEED_MS, deadBand, fillGaps } from './activityDetail';
import type { Sport } from './sports';
import { isNum } from '../utils/guards';
import { round } from '../utils/round';

export type TrimSport = Sport;


// --- thresholds of the suggestion (a number to adjust in one place) ----------------

// Faster than this, sustained, is not you on your feet: 20 km/h is a 3:00 per
// kilometre run, 15 km/h is a jog on a mountain path. A ride is held to a much
// higher speed: a descent on a bike is fast too.
export const FAST_KMH: Record<TrimSport, number> = { running: 20, hiking: 15, cycling: 60 };
// For at least this long above that speed (together, not in one go).
export const FAST_MIN_SEC: Record<TrimSport, number> = { running: 60, hiking: 60, cycling: 120 };
// Two fast stretches closer than this are one drive (a traffic light is not the end of it).
export const FAST_MERGE_GAP_SEC = 120;
// The fast stretch has to lie against the beginning or the end: at most this long
// from the edge (stopping the watch, parking). A fast piece in the middle is not
// something to cut from the edges.
export const FAST_EDGE_SEC = 300;
// Below this you stand still or walk: where the drive starts or stops.
export const SLOW_KMH = 5;
export const SLOW_LOOK_SEC = 120;
// What is left must be at least this much moving time, or there is nothing to suggest.
export const KEEP_MIN_SEC = 300;

// --- the series, prepared once ----------------------------------------------------------

interface Prepared {
  t: number[];
  n: number;
  // Per interval i (the one that closes at sample i, 1 to n-1).
  dt: number[];
  mid: number[];
  // Metres per second; undefined when the series say nothing.
  v: (number | undefined)[];
  moving: boolean[];
  // Cumulative distance per sample, metres.
  cum?: number[];
  // The altitude after the dead band.
  alt?: number[];
  heart?: (number | null)[];
}

function prepare(streams: StreamSet): Prepared | undefined {
  const t = streams.timeSec;
  const n = t.length;
  if (n < 2 || !t.every(isNum)) return undefined;

  const dt: number[] = [0];
  const mid: number[] = [t[0]];
  const v: (number | undefined)[] = [undefined];
  const moving: boolean[] = [false];
  const dist = streams.distanceM;
  for (let i = 1; i < n; i++) {
    const d = t[i] - t[i - 1];
    dt.push(d);
    mid.push((t[i] + t[i - 1]) / 2);
    const delta = dist && isNum(dist[i]) && isNum(dist[i - 1]) ? Math.max(0, (dist[i] as number) - (dist[i - 1] as number)) : undefined;
    const speed = streams.speedMs && isNum(streams.speedMs[i]) ? (streams.speedMs[i] as number) : delta !== undefined && d > 0 ? delta / d : undefined;
    v.push(speed);
    moving.push(d > 0 && d <= PAUSE_JUMP_SEC && !(speed !== undefined && speed < STILL_SPEED_MS));
  }

  let cum: number[] | undefined;
  if (dist && dist.some(isNum)) {
    cum = [];
    let last = 0;
    for (let i = 0; i < n; i++) {
      const x = dist[i];
      if (isNum(x) && x > last) last = x;
      cum.push(last);
    }
  } else if (streams.speedMs) {
    cum = [0];
    for (let i = 1; i < n; i++) cum.push(cum[i - 1] + (dt[i] > 0 && dt[i] <= PAUSE_JUMP_SEC && v[i] !== undefined ? (v[i] as number) * dt[i] : 0));
  }

  const filled = fillGaps(streams.altitudeM, t, 30);
  const alt = filled && filled.some(isNum) ? deadBand(filled, ALTITUDE_DEAD_BAND_M) : undefined;
  const heart = fillGaps(streams.heartRate?.map((x) => (isNum(x) && x >= 30 && x <= 230 ? x : null)), t, HEART_RATE_GAP_SEC);
  return { t, n, dt, mid, v, moving, cum, alt, heart };
}

// --- one stretch, measured ----------------------------------------------------------------

interface Raw {
  movingSec: number;
  distanceM?: number;
  gainM?: number;
  lossM?: number;
  hrAvg?: number;
  hrMax?: number;
}

// An interval belongs to the stretch its middle lies in, so a cut, the piece
// before it and the piece after it add up to the whole, to the second.
function measure(p: Prepared, lo: number, hi: number): Raw {
  let movingSec = 0;
  let distance = 0;
  let gain = 0;
  let loss = 0;
  let hrSum = 0;
  let hrSec = 0;
  let hrMax: number | undefined;
  for (let i = 1; i < p.n; i++) {
    if (p.mid[i] < lo || p.mid[i] >= hi) continue;
    if (p.cum && p.dt[i] > 0) distance += p.cum[i] - p.cum[i - 1];
    const h = p.heart?.[i];
    if (isNum(h) && (hrMax === undefined || h > hrMax)) hrMax = h;
    if (!p.moving[i]) continue;
    movingSec += p.dt[i];
    if (p.alt) {
      const d = p.alt[i] - p.alt[i - 1];
      if (d > 0) gain += d;
      else loss -= d;
    }
    if (isNum(h)) {
      hrSum += h * p.dt[i];
      hrSec += p.dt[i];
    }
  }
  return {
    movingSec,
    ...(p.cum ? { distanceM: distance } : {}),
    ...(p.alt ? { gainM: gain, lossM: loss } : {}),
    ...(movingSec > 0 && hrSec >= movingSec / 2 ? { hrAvg: hrSum / hrSec } : {}),
    ...(hrMax !== undefined ? { hrMax } : {}),
  };
}

// The edges of a stretch on the clock; a stretch that reaches the first or last
// sample reaches beyond it, so that the very first and last interval are in.
function bounds(p: Prepared, startSec: number, endSec: number): [number, number] {
  return [startSec <= p.t[0] ? -Infinity : startSec, endSec >= p.t[p.n - 1] ? Infinity : endSec];
}

export interface TrimNumbers {
  durationMinutes: number;
  distanceKm?: number;
  elevationGainM?: number;
  elevationLossM?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
}

// What the series alone say of the stretch from `startSec` to `endSec` on the
// clock of the activity: the moving time in minutes, the distance, the climb and
// the descent after the dead band, the mean heart rate over the moving time
// (only when at least half of it has a reading) and the highest. A number the
// series cannot give is absent. Undefined for a stretch with no moving time, or
// a series that is empty, too short or has no clock.
export function trimActivity(streams: StreamSet, startSec: number, endSec: number): TrimNumbers | undefined {
  const p = prepare(streams);
  if (!p || !(endSec > startSec)) return undefined;
  const [lo, hi] = bounds(p, startSec, endSec);
  const raw = measure(p, lo, hi);
  if (raw.movingSec <= 0) return undefined;
  return {
    durationMinutes: Math.max(1, Math.round(raw.movingSec / 60)),
    ...(raw.distanceM !== undefined ? { distanceKm: round(raw.distanceM / 1000, 2) } : {}),
    ...(raw.gainM !== undefined ? { elevationGainM: Math.round(raw.gainM), elevationLossM: Math.round(raw.lossM ?? 0) } : {}),
    ...(raw.hrAvg !== undefined ? { avgHeartRate: Math.round(raw.hrAvg) } : {}),
    ...(raw.hrMax !== undefined ? { maxHeartRate: Math.round(raw.hrMax) } : {}),
  };
}

// The numbers a log has now (the duration always, the others only when the log
// has them).
export type TrimCurrent = { durationMinutes: number } & Partial<Record<TrimField, number>>;

// The numbers of the log after the cut: what the log has now, minus what the
// series say lies in the pieces cut away. Only the fields that are in `current`
// come back, so a trim never adds a number the log did not have, and a field the
// series cannot judge (no altitude, no heart rate) stays as it was and is left
// out. The heart rate is the series' own mean and highest of what is kept.
// Undefined when nothing is cut, when what is kept has no moving time, or when
// the series are no use.
export function trimmedNumbers(streams: StreamSet, startSec: number, endSec: number, current: TrimCurrent): TrimCurrent | undefined {
  const p = prepare(streams);
  if (!p || !(endSec > startSec)) return undefined;
  if (startSec <= p.t[0] && endSec >= p.t[p.n - 1]) return undefined;
  const [lo, hi] = bounds(p, startSec, endSec);
  const kept = measure(p, lo, hi);
  if (kept.movingSec <= 0) return undefined;
  const whole = measure(p, -Infinity, Infinity);

  const out: TrimCurrent = {
    durationMinutes: Math.min(current.durationMinutes, Math.max(1, Math.round(current.durationMinutes - (whole.movingSec - kept.movingSec) / 60))),
  };
  const taken = (field: TrimField, value: number | undefined) => {
    if (current[field] !== undefined && value !== undefined) out[field] = value;
  };
  if (whole.distanceM !== undefined && kept.distanceM !== undefined && current.distanceKm !== undefined) {
    taken('distanceKm', Math.min(current.distanceKm, round(Math.max(0, current.distanceKm - (whole.distanceM - kept.distanceM) / 1000), 2)));
  }
  if (whole.gainM !== undefined && kept.gainM !== undefined) {
    if (current.elevationGainM !== undefined) taken('elevationGainM', Math.min(current.elevationGainM, Math.round(Math.max(0, current.elevationGainM - (whole.gainM - kept.gainM)))));
    if (current.elevationLossM !== undefined && whole.lossM !== undefined && kept.lossM !== undefined) {
      taken('elevationLossM', Math.min(current.elevationLossM, Math.round(Math.max(0, current.elevationLossM - (whole.lossM - kept.lossM)))));
    }
  }
  if (kept.hrAvg !== undefined) taken('avgHeartRate', Math.round(kept.hrAvg));
  if (kept.hrMax !== undefined && current.maxHeartRate !== undefined) taken('maxHeartRate', Math.min(current.maxHeartRate, Math.round(kept.hrMax)));
  return out;
}

// The same series with the clock starting at 0, so that every second in the
// trim, in the sheet and in the log is a second since the start of the activity.
export function zeroBased(streams: StreamSet): StreamSet {
  const first = streams.timeSec[0];
  return isNum(first) && first !== 0 ? { ...streams, timeSec: streams.timeSec.map((x) => x - first) } : streams;
}

// The series of the stretch alone, with the clock starting at 0 again, for the
// profile that is made again from what is kept.
export function sliceStreams(streams: StreamSet, startSec: number, endSec: number): StreamSet {
  const t = streams.timeSec;
  const keep: number[] = [];
  for (let i = 0; i < t.length; i++) if (t[i] >= startSec && t[i] <= endSec) keep.push(i);
  const origin = keep.length > 0 ? t[keep[0]] : 0;
  const out: StreamSet = { timeSec: keep.map((i) => t[i] - origin) };
  for (const [key, value] of Object.entries(streams)) {
    if (key === 'timeSec') continue;
    if (Array.isArray(value)) (out as unknown as Record<string, unknown>)[key] = keep.map((i) => (value as unknown[])[i]);
    else if (value !== undefined) (out as unknown as Record<string, unknown>)[key] = value;
  }
  return out;
}

// --- a stretch that is probably not yours --------------------------------------------------

export interface TrimSuggestion {
  // What to keep, on the clock of the activity, in seconds.
  startSec: number;
  endSec: number;
  // The fast stretch cut at the end: where it starts, and its mean speed.
  atEnd?: { fromSec: number; kmh: number };
  // The fast stretch cut at the beginning: where it stops, and its mean speed.
  atStart?: { toSec: number; kmh: number };
}

interface Block {
  firstI: number;
  lastI: number;
  from: number;
  to: number;
  fastSec: number;
  speedSum: number;
}

// Looks for a stretch at the beginning or the end of the activity that is too
// fast for the sport (FAST_KMH for FAST_MIN_SEC, drives with a stop in between
// count as one) and proposes to cut it, from the moment you were last standing
// or walking. Fast stretches in the middle are left alone: a trim only cuts the
// edges. Undefined when there is nothing to cut, when the series have no speed,
// when the whole activity is fast, or when less than KEEP_MIN_SEC is left.
export function suggestTrim(streams: StreamSet, sport: TrimSport): TrimSuggestion | undefined {
  const p = prepare(streams);
  if (!p) return undefined;
  const limit = FAST_KMH[sport] / 3.6;

  const blocks: Block[] = [];
  let cur: Block | undefined;
  for (let i = 1; i < p.n; i++) {
    const speed = p.v[i];
    if (speed === undefined || speed <= limit || p.dt[i] <= 0 || p.dt[i] > PAUSE_JUMP_SEC) continue;
    if (cur && p.t[i - 1] - cur.to <= FAST_MERGE_GAP_SEC) {
      cur.lastI = i;
      cur.to = p.t[i];
      cur.fastSec += p.dt[i];
      cur.speedSum += speed * p.dt[i];
    } else {
      if (cur) blocks.push(cur);
      cur = { firstI: i, lastI: i, from: p.t[i - 1], to: p.t[i], fastSec: p.dt[i], speedSum: speed * p.dt[i] };
    }
  }
  if (cur) blocks.push(cur);
  const real = blocks.filter((b) => b.fastSec >= FAST_MIN_SEC[sport]);
  if (real.length === 0) return undefined;

  const first = real[0];
  const last = real[real.length - 1];
  const first0 = p.t[0];
  const lastT = p.t[p.n - 1];
  const atEdgeEnd = lastT - last.to <= FAST_EDGE_SEC;
  const atEdgeStart = first.from - first0 <= FAST_EDGE_SEC;
  // One block that touches both edges is the whole activity.
  if (atEdgeEnd && atEdgeStart && first === last) return undefined;

  let startSec = first0;
  let endSec = lastT;
  const suggestion: TrimSuggestion = { startSec, endSec };
  const slow = (i: number) => p.v[i] !== undefined && (p.v[i] as number) * 3.6 < SLOW_KMH;

  if (atEdgeEnd) {
    // Back from where it gets fast to the last moment you stood or walked.
    endSec = last.from;
    for (let k = last.firstI - 1; k >= 1 && last.from - p.t[k] <= SLOW_LOOK_SEC; k--) {
      if (slow(k)) {
        endSec = p.t[k];
        break;
      }
    }
    suggestion.atEnd = { fromSec: endSec, kmh: Math.round((last.speedSum / last.fastSec) * 3.6) };
  }
  if (atEdgeStart) {
    startSec = first.to;
    for (let k = first.lastI + 1; k < p.n && p.t[k - 1] - first.to <= SLOW_LOOK_SEC; k++) {
      if (slow(k)) {
        startSec = p.t[k - 1];
        break;
      }
    }
    suggestion.atStart = { toSec: startSec, kmh: Math.round((first.speedSum / first.fastSec) * 3.6) };
  }
  if (!suggestion.atEnd && !suggestion.atStart) return undefined;
  if (!(endSec > startSec)) return undefined;

  const [lo, hi] = bounds(p, startSec, endSec);
  if (measure(p, lo, hi).movingSec < KEEP_MIN_SEC) return undefined;
  return { ...suggestion, startSec, endSec };
}

// --- the picture --------------------------------------------------------------------------

export interface TrimChart {
  // The length of the clock, seconds, and how many equal pieces it is cut into.
  totalSec: number;
  // Per piece: the mean speed in km/h (0 when it stood still, null when the
  // series say nothing), the mean altitude and the mean heart rate.
  kmh: (number | null)[];
  altitudeM?: (number | null)[];
  heartRate?: (number | null)[];
}

// The series boiled down to `count` pieces of equal clock time, enough for a
// small picture of the speed over the time (and the altitude behind it).
export function chartSeries(streams: StreamSet, count = 96): TrimChart | undefined {
  const p = prepare(streams);
  if (!p) return undefined;
  const total = p.t[p.n - 1] - p.t[0];
  if (!(total > 0) || count < 2) return undefined;
  const bucketOf = (sec: number) => Math.min(count - 1, Math.max(0, Math.floor(((sec - p.t[0]) / total) * count)));
  const mean = (sum: number[], num: number[]) => sum.map((s, b) => (num[b] > 0 ? s / num[b] : null));
  const speedSum = new Array<number>(count).fill(0);
  const speedWeight = new Array<number>(count).fill(0);
  const altSum = new Array<number>(count).fill(0);
  const altN = new Array<number>(count).fill(0);
  const hrSum = new Array<number>(count).fill(0);
  const hrN = new Array<number>(count).fill(0);
  const rawAlt = fillGaps(streams.altitudeM, p.t, 30);
  for (let i = 1; i < p.n; i++) {
    const b = bucketOf(p.mid[i]);
    if (p.dt[i] > 0 && p.v[i] !== undefined) {
      // A jump in time is a stop: it counts as standing still, not as a speed.
      const w = Math.min(p.dt[i], PAUSE_JUMP_SEC);
      speedSum[b] += (p.dt[i] > PAUSE_JUMP_SEC ? 0 : (p.v[i] as number) * 3.6) * w;
      speedWeight[b] += w;
    }
    const a = rawAlt?.[i];
    if (isNum(a)) {
      altSum[b] += a;
      altN[b]++;
    }
    const h = p.heart?.[i];
    if (isNum(h)) {
      hrSum[b] += h;
      hrN[b]++;
    }
  }
  const kmh = mean(speedSum, speedWeight);
  if (kmh.every((x) => x === null)) return undefined;
  return {
    totalSec: total,
    kmh,
    ...(altN.some((x) => x > 0) ? { altitudeM: mean(altSum, altN) } : {}),
    ...(hrN.some((x) => x > 0) ? { heartRate: mean(hrSum, hrN) } : {}),
  };
}

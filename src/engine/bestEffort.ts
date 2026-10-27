// ASCEND: the fastest stretch of a run, read from the series of the watch.
//
// A test run is more than its test: a warm-up, a cool-down or a ride before it
// sit in the totals of the activity. When the series are there (distance per
// second), the fastest unbroken stretch of the test distance is the honest
// result; without them the whole log counts, as it always did
// (docs/beslissingen/2026-10-27-testloop-lezen.md).
//
// Pure and provider-free: it reads a StreamSet, nothing else.

import type { StreamSet } from '../models/activityDetail';
import type { BestEffort } from '../models/training';

// A hole in the series longer than this (seconds between two readings) cannot be
// bridged: a window that contains one says nothing about the pace.
export const MAX_GAP_SEC = 20;
// The distance of the series may differ this much from the distance of the log
// before it is not trusted (a treadmill, a wrong calibration).
export const DISTANCE_AGREEMENT = 0.1;

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

interface Point {
  t: number;
  d: number;
}

// Time and distance as points, cumulative distance that never goes back. Without a
// distance series the speed is added up; readings with a hole are left out, which the
// gap check then notices.
export function distancePoints(stream: StreamSet): Point[] {
  const out: Point[] = [];
  const hasDistance = !!stream.distanceM && stream.distanceM.some(isNum);
  let run = 0;
  let prevT: number | undefined;
  for (let i = 0; i < stream.timeSec.length; i++) {
    const t = stream.timeSec[i];
    if (!isNum(t)) continue;
    if (hasDistance) {
      const d = stream.distanceM![i];
      if (!isNum(d)) continue;
      run = Math.max(run, d);
      out.push({ t, d: run });
    } else if (stream.speedMs) {
      const v = stream.speedMs[i];
      if (!isNum(v)) {
        prevT = undefined;
        continue;
      }
      if (prevT !== undefined && t > prevT) run += v * (t - prevT);
      prevT = t;
      out.push({ t, d: run });
    }
  }
  return out.filter((p, i) => i === 0 || p.t > out[i - 1].t);
}

// A stop is not a hole: standing at a traffic light or a crossing. Two readings far apart
// in time whose distance hardly moved (a watch that paused by itself), or a run of readings
// that creep forward slower than STOP_SPEED_MS, are a stop. A gap where the distance does
// jump stays a hole (the watch lost the run), and says nothing about the pace.
export const STOP_GAP_MAX_M = 15;
export const STOP_SPEED_MS = 1;
// A creep shorter than this is noise, not a stop.
export const STOP_MIN_SEC = 3;
// The version of how a best effort is read. 2: stops are told apart (docs/beslissingen/2026-10-27-stilstaan-bij-de-testloop.md).
export const EFFORT_VERSION = 2;
// Many stops make the test a little too friendly: standing still is rest.
export const MANY_STOPPED_SEC = 60;
export const MANY_STOPS = 3;

export type StopMode = 'skip' | 'count';

// "Stilstaan bij een testloop" (AppSettings.testStops): absent or unknown = skip, the advice.
export const resolveTestStops = (v: unknown): StopMode => (v === 'count' ? 'count' : 'skip');

export interface BestWindow {
  // Seconds the fastest stretch took (moving time when stops are skipped, clock time otherwise).
  seconds: number;
  startM: number;
  endM: number;
  // The stops inside the stretch, only when stops are skipped.
  stops?: number;
  stoppedSec?: number;
}

// The fastest unbroken stretch of `distanceM` metres. Undefined when the series is
// shorter than that or every stretch has a hole in it. With mode 'skip' (the default) the
// time of a stop does not count in the stretch and the stops are counted; with 'count' the
// clock runs on, as it did before.
export function fastestWindow(stream: StreamSet, distanceM: number, mode: StopMode = 'skip'): BestWindow | undefined {
  const p = distancePoints(stream);
  const n = p.length;
  if (n < 2 || p[n - 1].d - p[0].d < distanceM) return undefined;
  const skip = mode === 'skip';
  // stop[k]: the pair (k-1, k) is a stop.
  const stop: boolean[] = new Array(n).fill(false);
  if (skip) {
    let k = 1;
    while (k < n) {
      const dt = p[k].t - p[k - 1].t;
      const dd = p[k].d - p[k - 1].d;
      if (dt > MAX_GAP_SEC) {
        if (dd < STOP_GAP_MAX_M) stop[k] = true;
        k++;
        continue;
      }
      if (dd / dt >= STOP_SPEED_MS) {
        k++;
        continue;
      }
      // A creep: take the whole run of slow pairs, and keep it when it lasts long enough.
      let e = k;
      while (e + 1 < n && p[e + 1].t - p[e].t <= MAX_GAP_SEC && (p[e + 1].d - p[e].d) / (p[e + 1].t - p[e].t) < STOP_SPEED_MS) e++;
      if (p[e].t - p[k - 1].t >= STOP_MIN_SEC) for (let q = k; q <= e; q++) stop[q] = true;
      k = e + 1;
    }
  }
  // bad[k]: how many pairs up to and including (k-1, k) are holes. m[k]: moving seconds up
  // to point k. stopSec[k] and starts[k]: seconds stood still and stops begun up to pair k.
  const bad: number[] = new Array(n).fill(0);
  const m: number[] = new Array(n).fill(0);
  const stopSec: number[] = new Array(n).fill(0);
  const starts: number[] = new Array(n).fill(0);
  for (let k = 1; k < n; k++) {
    const dt = p[k].t - p[k - 1].t;
    bad[k] = bad[k - 1] + (dt > MAX_GAP_SEC && !stop[k] ? 1 : 0);
    m[k] = m[k - 1] + (stop[k] ? 0 : dt);
    stopSec[k] = stopSec[k - 1] + (stop[k] ? dt : 0);
    starts[k] = starts[k - 1] + (stop[k] && !stop[k - 1] ? 1 : 0);
  }
  let best: BestWindow | undefined;
  let i = 0;
  for (let j = 1; j < n; j++) {
    const from = p[j].d - distanceM;
    if (from < p[0].d) continue;
    while (i + 1 < j && p[i + 1].d <= from) i++;
    // The pairs from i to j must all be whole.
    if (bad[j] - bad[i] > 0) continue;
    const span = p[i + 1].d - p[i].d;
    const frac = span > 0 ? (from - p[i].d) / span : 0;
    const startT = m[i] + frac * (m[i + 1] - m[i]);
    const seconds = m[j] - startT;
    if (seconds > 0 && (!best || seconds < best.seconds)) {
      best = { seconds, startM: from - p[0].d, endM: p[j].d - p[0].d };
      if (skip) {
        best.stops = starts[j] - starts[i] + (i >= 1 && stop[i] && stop[i + 1] ? 1 : 0);
        best.stoppedSec = Math.round(stopSec[j] - stopSec[i]);
      }
    }
  }
  return best;
}

// The best effort of a test log: the fastest `targetKm` of the series, or nothing when
// the series cannot give it (too short, holes, a distance that does not match the log).
export function bestEffortFromStream(stream: StreamSet, targetKm: number, logKm?: number, logMinutes?: number, mode: StopMode = 'skip'): BestEffort | undefined {
  const p = distancePoints(stream);
  if (p.length < 2) return undefined;
  const totalKm = (p[p.length - 1].d - p[0].d) / 1000;
  if (logKm && logKm > 0 && Math.abs(totalKm - logKm) / logKm > DISTANCE_AGREEMENT) return undefined;
  const w = fastestWindow(stream, targetKm * 1000, mode);
  if (!w) return undefined;
  const out: BestEffort = { km: targetKm, minutes: Math.round((w.seconds / 60) * 1000) / 1000, v: EFFORT_VERSION };
  if (mode === 'skip') {
    out.stops = w.stops ?? 0;
    out.stoppedSec = w.stoppedSec ?? 0;
  }
  if (isNum(logKm) && isNum(logMinutes)) {
    out.wholeKm = logKm;
    out.wholeMinutes = logMinutes;
  }
  return out;
}

// "zonder 3 keer stilstaan, samen 1:40", or undefined when there were no stops.
export function stopsPhrase(b: Pick<BestEffort, 'stops' | 'stoppedSec'>): string | undefined {
  const stops = b.stops ?? 0;
  const sec = Math.round(b.stoppedSec ?? 0);
  if (stops <= 0 || sec <= 0) return undefined;
  const time = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
  return `zonder ${stops === 1 ? '1 keer' : `${stops} keer`} stilstaan, samen ${time}`;
}

// Standing still is rest, so a test with a lot of it is a bit too friendly.
export function manyStops(b: Pick<BestEffort, 'stops' | 'stoppedSec'>): boolean {
  return (b.stoppedSec ?? 0) > MANY_STOPPED_SEC || (b.stops ?? 0) > MANY_STOPS;
}

export const MANY_STOPS_SENTENCE = 'Stilstaan geeft wat rust, dus deze test is iets te gunstig.';

// The line after the time: the stops and, when there are many, the honest remark. Empty without stops.
export function stopsNote(b: Pick<BestEffort, 'stops' | 'stoppedSec'>): string {
  const phrase = stopsPhrase(b);
  if (!phrase) return '';
  return manyStops(b) ? `${phrase}. ${MANY_STOPS_SENTENCE}` : phrase;
}

// The fingerprint of the totals a best effort was read for.
export function effortFingerprint(km: number, minutes: number): string {
  return `${km.toFixed(2)}|${minutes.toFixed(2)}`;
}

// A best effort that was read for other totals than the log has now (a correction at the
// source, a cut): it says nothing about this log any more. One without a fingerprint
// (read before it existed) cannot be checked against the distance and is not trusted.
export function isStaleEffort(b: BestEffort, km: number, minutes: number): boolean {
  if (!isNum(b.wholeKm) || !isNum(b.wholeMinutes)) return true;
  return Math.abs(b.wholeKm - km) > 0.005 || Math.abs(b.wholeMinutes - minutes) > 0.05;
}

// A best effort as it may be believed: a finite distance and time that make a running pace.
export function isUsableBestEffort(raw: unknown): raw is BestEffort {
  if (typeof raw !== 'object' || raw === null) return false;
  const b = raw as Record<string, unknown>;
  return isNum(b.km) && isNum(b.minutes) && b.km >= 3 && b.km <= 50 && b.minutes > 0 && b.minutes / b.km >= 2 && b.minutes / b.km <= 20;
}

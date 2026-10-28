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
// Stops closer together than this (seconds or metres of movement between them) are one stop.
export const MERGE_STOP_SEC = 10;
export const MERGE_STOP_M = 20;
// After a stop, this many seconds are looked at for a catch-up jump: more than this factor times
// the median pace of the CATCH_UP_BEFORE_SEC before the stop (or of the whole run when that is higher), or more than CATCH_UP_MAX_MS, is a hole.
export const CATCH_UP_SEC = 10;
export const CATCH_UP_BEFORE_SEC = 60;
export const CATCH_UP_FACTOR = 1.5;
export const CATCH_UP_MAX_MS = 6.5;
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
  // stop[k]: the pair (k-1, k) is a stop. hole[k]: the pair says nothing about the pace.
  const stop: boolean[] = new Array(n).fill(false);
  const hole: boolean[] = new Array(n).fill(false);
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
    // A catch-up jump after a stop (a watch that stood still and then made up the distance) is a
    // hole, not a stop: the 10 seconds after it cover more than 1.5 times the pace just before
    // the stop (the median of the 60 seconds before it when that is above the median of the whole run, so
    // a warm-up and cool-down do not weigh in), or more than CATCH_UP_MAX_MS, which no runner reaches.
    const speeds: number[] = [];
    for (let k = 1; k < n; k++) {
      const dt = p[k].t - p[k - 1].t;
      if (!stop[k] && dt > 0 && dt <= MAX_GAP_SEC) speeds.push((p[k].d - p[k - 1].d) / dt);
    }
    const medianOf = (v: number[]) => {
      v.sort((x, y) => x - y);
      return v.length ? v[Math.floor(v.length / 2)] : 0;
    };
    const wholeMedian = medianOf(speeds);
    for (let k = 1; k < n; k++) {
      if (!stop[k] || (k + 1 < n && stop[k + 1]) || k + 1 >= n) continue;
      const before: number[] = [];
      for (let r = k - 1; r >= 1 && p[k - 1].t - p[r - 1].t <= CATCH_UP_BEFORE_SEC; r--) {
        const dt = p[r].t - p[r - 1].t;
        if (!stop[r] && dt > 0 && dt <= MAX_GAP_SEC) before.push((p[r].d - p[r - 1].d) / dt);
      }
      const reference = Math.max(wholeMedian, medianOf(before));
      let q = k + 1;
      let sec = 0;
      let dist = 0;
      while (q < n && !stop[q] && sec < CATCH_UP_SEC) {
        sec += p[q].t - p[q - 1].t;
        dist += p[q].d - p[q - 1].d;
        q++;
      }
      if (sec > 0 && (dist > CATCH_UP_FACTOR * reference * sec || dist > CATCH_UP_MAX_MS * sec)) for (let r = k + 1; r < q; r++) hole[r] = true;
    }
  }
  // bad[k]: holes up to pair k. m[k] and md[k]: moving seconds and moving metres up to point k;
  // a stop adds neither time nor distance. stopSec[k]: seconds stood still. gid[k]: the number
  // of the stop (stops with less than 10 s or 20 m of movement between them are one stop).
  const bad: number[] = new Array(n).fill(0);
  const m: number[] = new Array(n).fill(0);
  const md: number[] = new Array(n).fill(0);
  const stopSec: number[] = new Array(n).fill(0);
  const gid: number[] = new Array(n).fill(0);
  let groups = 0;
  let lastStop = -1;
  for (let k = 1; k < n; k++) {
    const dt = p[k].t - p[k - 1].t;
    const dd = p[k].d - p[k - 1].d;
    bad[k] = bad[k - 1] + (hole[k] || (dt > MAX_GAP_SEC && !stop[k]) ? 1 : 0);
    m[k] = m[k - 1] + (stop[k] ? 0 : dt);
    md[k] = md[k - 1] + (stop[k] ? 0 : dd);
    stopSec[k] = stopSec[k - 1] + (stop[k] ? dt : 0);
    if (stop[k]) {
      if (lastStop < 0 || m[k] - m[lastStop] >= MERGE_STOP_SEC && md[k] - md[lastStop] >= MERGE_STOP_M) groups++;
      gid[k] = groups;
      lastStop = k;
    }
  }
  if (md[n - 1] < distanceM) return undefined;
  let best: BestWindow | undefined;
  let i = 0;
  for (let j = 1; j < n; j++) {
    if (stop[j]) continue;
    const from = md[j] - distanceM;
    if (from < 0) continue;
    while (i + 1 < j && md[i + 1] <= from) i++;
    // The pairs from i to j must all be whole.
    if (bad[j] - bad[i] > 0) continue;
    const span = md[i + 1] - md[i];
    const frac = span > 0 ? (from - md[i]) / span : 0;
    const startT = m[i] + frac * (m[i + 1] - m[i]);
    const seconds = m[j] - startT;
    if (seconds > 0 && (!best || seconds < best.seconds)) {
      best = { seconds, startM: from, endM: md[j] };
      if (skip) {
        let first = 0;
        let last = 0;
        for (let k = i + 1; k <= j; k++) {
          if (!stop[k]) continue;
          if (!first) first = gid[k];
          last = gid[k];
        }
        best.stops = first ? last - first + 1 : 0;
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

// "3 keer stilstaan, samen 1:40" (see stopsSentence for the sentence), or undefined when there were no stops.
export function stopsPhrase(b: Pick<BestEffort, 'stops' | 'stoppedSec'>): string | undefined {
  const stops = b.stops ?? 0;
  const sec = Math.round(b.stoppedSec ?? 0);
  if (stops <= 0 || sec <= 0) return undefined;
  const time = stopsTime(sec);
  return `${stops === 1 ? '1 keer' : `${stops} keer`} stilstaan, samen ${time}`;
}

// The same in one sentence: "Je stond 3 keer stil, samen 1:40; die tijd telt niet mee."
export function stopsSentence(b: Pick<BestEffort, 'stops' | 'stoppedSec'>): string | undefined {
  const stops = b.stops ?? 0;
  const sec = Math.round(b.stoppedSec ?? 0);
  if (stops <= 0 || sec <= 0) return undefined;
  return `Je stond ${stops === 1 ? '1 keer' : `${stops} keer`} stil, samen ${stopsTime(sec)}; die tijd telt niet mee.`;
}

// "zonder 1:40 stilstaan", the short form for between brackets.
export function stopsShort(b: Pick<BestEffort, 'stops' | 'stoppedSec'>): string | undefined {
  const stops = b.stops ?? 0;
  const sec = Math.round(b.stoppedSec ?? 0);
  if (stops <= 0 || sec <= 0) return undefined;
  return `zonder ${stopsTime(sec)} stilstaan`;
}

const stopsTime = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

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

// What `bestEffortTried` holds: the totals plus the reading version, so a mark made by an older reading
// (a pause test where every window had a hole) is read once more.
export function effortTried(km: number, minutes: number): string {
  return `${effortFingerprint(km, minutes)}|v${EFFORT_VERSION}`;
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

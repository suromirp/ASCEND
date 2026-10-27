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

export interface BestWindow {
  // Seconds the fastest stretch took.
  seconds: number;
  startM: number;
  endM: number;
}

// The fastest unbroken stretch of `distanceM` metres. Undefined when the series is
// shorter than that or every stretch has a hole in it.
export function fastestWindow(stream: StreamSet, distanceM: number): BestWindow | undefined {
  const p = distancePoints(stream);
  const n = p.length;
  if (n < 2 || p[n - 1].d - p[0].d < distanceM) return undefined;
  // bad[k]: how many pairs up to and including (k-1, k) are holes.
  const bad: number[] = new Array(n).fill(0);
  for (let k = 1; k < n; k++) bad[k] = bad[k - 1] + (p[k].t - p[k - 1].t > MAX_GAP_SEC ? 1 : 0);
  let best: BestWindow | undefined;
  let i = 0;
  for (let j = 1; j < n; j++) {
    const from = p[j].d - distanceM;
    if (from < p[0].d) continue;
    while (i + 1 < j && p[i + 1].d <= from) i++;
    // The pairs from i to j must all be whole.
    if (bad[j] - bad[i] > 0) continue;
    const span = p[i + 1].d - p[i].d;
    const startT = span > 0 ? p[i].t + ((from - p[i].d) / span) * (p[i + 1].t - p[i].t) : p[i].t;
    const seconds = p[j].t - startT;
    if (seconds > 0 && (!best || seconds < best.seconds)) best = { seconds, startM: from - p[0].d, endM: p[j].d - p[0].d };
  }
  return best;
}

// The best effort of a test log: the fastest `targetKm` of the series, or nothing when
// the series cannot give it (too short, holes, a distance that does not match the log).
export function bestEffortFromStream(stream: StreamSet, targetKm: number, logKm?: number): BestEffort | undefined {
  const p = distancePoints(stream);
  if (p.length < 2) return undefined;
  const totalKm = (p[p.length - 1].d - p[0].d) / 1000;
  if (logKm && logKm > 0 && Math.abs(totalKm - logKm) / logKm > DISTANCE_AGREEMENT) return undefined;
  const w = fastestWindow(stream, targetKm * 1000);
  if (!w) return undefined;
  return { km: targetKm, minutes: Math.round((w.seconds / 60) * 1000) / 1000 };
}

// A best effort as it may be believed: a finite distance and time that make a running pace.
export function isUsableBestEffort(raw: unknown): raw is BestEffort {
  if (typeof raw !== 'object' || raw === null) return false;
  const b = raw as Record<string, unknown>;
  return isNum(b.km) && isNum(b.minutes) && b.km >= 3 && b.km <= 50 && b.minutes > 0 && b.minutes / b.km >= 2 && b.minutes / b.km <= 20;
}

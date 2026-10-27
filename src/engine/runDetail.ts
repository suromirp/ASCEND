// ASCEND: the kilometres and laps of a run, worked out from its full series.
//
// Rules RD-1 (kilometre times), RD-2 (laps), RD-3 (the piece that counts for a test) and
// RD-8 (the wind against you per kilometre) of docs/onderzoek/Run in detail.md. The
// judgement lives in engine/runDetailRules.ts; this file only measures.
//
// - A kilometre is read from the distance series with a straight line between the two
//   readings around the kilometre mark. The laps of the watch only give boundaries and a
//   label; their numbers are worked out again from the series, so there is one truth.
// - A pause of more than 20 seconds (the limit of engine/bestEffort.ts) does not count in
//   a kilometre time.
// - The track is never kept. `windAgainstFn` reads the heading per kilometre from it while
//   the run is processed; what is kept is the number per kilometre.
//
// Pure: no React, no IndexedDB.

import type { StreamSet } from '../models/activityDetail';
import type { StoredLap } from '../models/activityStreams';
import type { RunDetail, RunKm, RunLap, RunLine } from '../models/runDetail';
import { deadBand, fillGaps, ALTITUDE_DEAD_BAND_M } from './activityDetail';
import { MAX_GAP_SEC, effortFingerprint, fastestWindow } from './bestEffort';

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const round = (n: number, decimals: number): number => {
  const f = 10 ** decimals;
  // + 0 turns a minus zero into a zero (it would not survive a file anyway).
  return Math.round(n * f) / f + 0;
};

// A run shorter than this says nothing per kilometre.
export const MIN_RUN_M = 1000;
// A last piece shorter than this is left out; between this and 1 km it is shown as partial.
export const MIN_PIECE_M = 100;
// Below this speed a reading counts as standing still.
export const STILL_MS = 0.5;
// The wind at 10 metres against the wind at the chest of a runner (docs/onderzoek, RD-8).
export const CHEST_WIND_FACTOR = 0.65;
// GAP is shown for a kilometre with at least this much climb or descent (own assumption).
export const GAP_MIN_CHANGE_M = 10;
export const LINE_POINTS = 150;
// A reading counts for at most this long (smart recording writes a point every few seconds).
const MAX_WEIGHT_SEC = 10;

// --- aligned points ---------------------------------------------------------------------

interface Pt {
  // Seconds since the start, as the series have it.
  t: number;
  // Metres from the first reading; never goes back.
  d: number;
  // Index in the series.
  i: number;
}

// Time and distance as points that keep their index in the series, so every other series
// can be read at the same place. Without a distance series the speed is added up.
export function alignedPoints(set: StreamSet): Pt[] {
  const out: Pt[] = [];
  const hasDistance = !!set.distanceM && set.distanceM.some(isNum);
  let run = 0;
  let prevT: number | undefined;
  let d0: number | undefined;
  for (let i = 0; i < set.timeSec.length; i++) {
    const t = set.timeSec[i];
    if (!isNum(t)) continue;
    if (out.length > 0 && t <= out[out.length - 1].t) continue;
    if (hasDistance) {
      const d = set.distanceM![i];
      if (!isNum(d)) continue;
      d0 ??= d;
      run = Math.max(run, d - d0);
      out.push({ t, d: run, i });
    } else if (set.speedMs) {
      const v = set.speedMs[i];
      if (!isNum(v)) {
        prevT = undefined;
        continue;
      }
      if (prevT !== undefined && t > prevT) run += v * (t - prevT);
      prevT = t;
      out.push({ t, d: run, i });
    }
  }
  return out;
}

// Seconds of each segment (point k to k+1) that are a pause: standing still for more than
// MAX_GAP_SEC in a row, or a hole in the series of that length without distance covered.
function pausePerSegment(p: Pt[]): number[] {
  const out: number[] = new Array(Math.max(0, p.length - 1)).fill(0);
  let k = 0;
  while (k < out.length) {
    const still = (j: number) => {
      const dt = p[j + 1].t - p[j].t;
      return dt > 0 && (p[j + 1].d - p[j].d) / dt < STILL_MS;
    };
    if (!still(k)) {
      k++;
      continue;
    }
    let j = k;
    let sec = 0;
    while (j < out.length && still(j)) {
      sec += p[j + 1].t - p[j].t;
      j++;
    }
    if (sec > MAX_GAP_SEC) for (let m = k; m < j; m++) out[m] = p[m + 1].t - p[m].t;
    k = j;
  }
  return out;
}

// --- geometry of the series ---------------------------------------------------------------

interface Track {
  p: Pt[];
  pause: number[];
  // Moving seconds up to each point.
  moving: number[];
  // The altitude after the dead band, per point; undefined without altitude.
  alt?: number[];
  set: StreamSet;
  total: number;
}

function trackOf(set: StreamSet): Track | undefined {
  const p = alignedPoints(set);
  if (p.length < 3) return undefined;
  const total = p[p.length - 1].d;
  if (total < MIN_RUN_M) return undefined;
  const pause = pausePerSegment(p);
  const moving: number[] = [0];
  for (let k = 0; k < pause.length; k++) moving.push(moving[k] + (p[k + 1].t - p[k].t) - pause[k]);
  let alt: number[] | undefined;
  if (set.altitudeM && set.altitudeM.some(isNum)) {
    const times = p.map((q) => q.t);
    const raw = p.map((q) => set.altitudeM![q.i]);
    const filled = fillGaps(raw, times, 30);
    if (filled && filled.some(isNum)) alt = deadBand(filled, ALTITUDE_DEAD_BAND_M);
  }
  return { p, pause, moving, alt, set, total };
}

// The first point with at least `m` metres covered.
function indexAtDistance(p: Pt[], m: number): number {
  let lo = 0;
  let hi = p.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (p[mid].d >= m) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}

// A value at a distance, by a straight line between the two readings around it.
function atDistance(tr: Track, m: number, values: (k: number) => number): number {
  if (m <= tr.p[0].d) return values(0);
  const last = tr.p.length - 1;
  if (m >= tr.p[last].d) return values(last);
  const j = indexAtDistance(tr.p, m);
  if (tr.p[j].d === m || j === 0) return values(j);
  const a = j - 1;
  const span = tr.p[j].d - tr.p[a].d;
  const f = span > 0 ? (m - tr.p[a].d) / span : 0;
  return values(a) + (values(j) - values(a)) * f;
}

// The clock time and moving time at a distance.
const clockAt = (tr: Track, m: number) => atDistance(tr, m, (k) => tr.p[k].t);
const movingAt = (tr: Track, m: number) => atDistance(tr, m, (k) => tr.moving[k]);

function atTime(tr: Track, t: number, values: (k: number) => number): number {
  const last = tr.p.length - 1;
  if (t <= tr.p[0].t) return values(0);
  if (t >= tr.p[last].t) return values(last);
  let lo = 0;
  let hi = last;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (tr.p[mid].t >= t) hi = mid;
    else lo = mid + 1;
  }
  if (tr.p[lo].t === t) return values(lo);
  const a = lo - 1;
  const f = (t - tr.p[a].t) / (tr.p[lo].t - tr.p[a].t);
  return values(a) + (values(lo) - values(a)) * f;
}

// --- averages of a series over a stretch ------------------------------------------------------

type Series = readonly (number | null | undefined)[] | undefined;

interface Stretch {
  // Points k from..to (inclusive of from, exclusive of to) lie in it.
  from: number;
  to: number;
}

function stretchByDistance(tr: Track, a: number, b: number): Stretch {
  return { from: indexAtDistance(tr.p, a), to: b >= tr.total ? tr.p.length : indexAtDistance(tr.p, b) };
}

function stretchByTime(tr: Track, a: number, b: number): Stretch {
  let from = 0;
  while (from < tr.p.length && tr.p[from].t < a) from++;
  let to = from;
  while (to < tr.p.length && tr.p[to].t < b) to++;
  return { from, to };
}

// Time-weighted mean over a stretch; undefined when under half of the moving time has a
// reading (a profile does not guess).
function meanOver(tr: Track, values: Series, s: Stretch): number | undefined {
  if (!values) return undefined;
  let sum = 0;
  let covered = 0;
  let total = 0;
  for (let k = s.from; k < s.to && k < tr.p.length - 1; k++) {
    if (tr.pause[k] > 0) continue;
    const w = Math.min(tr.p[k + 1].t - tr.p[k].t, MAX_WEIGHT_SEC);
    total += w;
    const v = values[tr.p[k].i];
    if (isNum(v)) {
      sum += v * w;
      covered += w;
    }
  }
  return total > 0 && covered / total >= 0.5 ? sum / covered : undefined;
}

function maxOver(tr: Track, values: Series, s: Stretch): number | undefined {
  if (!values) return undefined;
  let best: number | undefined;
  for (let k = s.from; k < s.to && k < tr.p.length; k++) {
    const v = values[tr.p[k].i];
    if (isNum(v) && (best === undefined || v > best)) best = v;
  }
  return best;
}

function climbOver(tr: Track, s: Stretch): { gain: number; loss: number } | undefined {
  if (!tr.alt) return undefined;
  let gain = 0;
  let loss = 0;
  const to = Math.min(s.to, tr.p.length - 1);
  for (let k = s.from; k < to; k++) {
    const dy = tr.alt[k + 1] - tr.alt[k];
    if (dy > 0) gain += dy;
    else loss -= dy;
  }
  return { gain, loss };
}

// --- GAP ----------------------------------------------------------------------------------------

// The energy a runner spends per kilogram and metre on a slope of `grade` (a fraction),
// joules (Minetti e.a. 2002, a polynomial that holds from -0.45 to 0.45).
export function minettiCost(grade: number): number {
  const i = Math.max(-0.45, Math.min(0.45, grade));
  return 155.4 * i ** 5 - 30.4 * i ** 4 - 43.3 * i ** 3 + 46.3 * i ** 2 + 19.5 * i + 3.6;
}

// Seconds per kilometre on the flat that cost the same as this stretch. The slope is read
// from the smoothed altitude in steps of at least 25 metres.
function gapPace(tr: Track, s: Stretch, movingSec: number): number | undefined {
  if (!tr.alt || movingSec <= 0) return undefined;
  const flat = minettiCost(0);
  let equivalent = 0;
  let k = s.from;
  const end = Math.min(s.to, tr.p.length) - 1;
  while (k < end) {
    let j = k + 1;
    while (j < end && tr.p[j].d - tr.p[k].d < 25) j++;
    const dd = tr.p[j].d - tr.p[k].d;
    if (dd > 0) equivalent += dd * (minettiCost((tr.alt[j] - tr.alt[k]) / dd) / flat);
    k = j;
  }
  return equivalent > 50 ? (movingSec / equivalent) * 1000 : undefined;
}

// --- a piece of the run -------------------------------------------------------------------------

export interface WindAgainst {
  // Called with the metres a piece starts and ends at; km/h against you at chest height,
  // negative for a tailwind, null when it is not known.
  (startM: number, endM: number): number | null;
}

interface Measures {
  hr: Series;
  cadence: Series;
  step: Series;
  osc: Series;
  ratio: Series;
  stance: Series;
  balance: Series;
  power: Series;
  resp: Series;
}

function measuresOf(set: StreamSet): Measures {
  return {
    hr: set.heartRate,
    cadence: set.cadence,
    step: set.stepLengthM,
    osc: set.verticalOscillationMm,
    ratio: set.verticalRatioPct,
    stance: set.stanceTimeMs,
    balance: set.stanceBalanceLeftPct,
    power: set.powerW,
    resp: set.respirationRpm,
  };
}

function pauseWithin(tr: Track, a: number, b: number): number {
  let sec = 0;
  for (let k = 0; k < tr.pause.length; k++) {
    if (tr.pause[k] <= 0) continue;
    const da = tr.p[k].d;
    const db = tr.p[k + 1].d;
    if (db > da) {
      const overlap = Math.min(b, db) - Math.max(a, da);
      if (overlap > 0) sec += tr.pause[k] * (overlap / (db - da));
    } else if (da >= a && (da < b || (b >= tr.total && da <= b))) {
      sec += tr.pause[k];
    }
  }
  return sec;
}

function kmOf(tr: Track, m: Measures, index: number, a: number, b: number, wind: WindAgainst | undefined): RunKm {
  const distanceM = b - a;
  const elapsed = clockAt(tr, b) - clockAt(tr, a);
  const pauseSec = pauseWithin(tr, a, b);
  const sec = Math.max(1, elapsed - pauseSec);
  const s = stretchByDistance(tr, a, b);
  const climb = climbOver(tr, s);
  const km: RunKm = {
    index,
    startM: round(a, 1),
    endM: round(b, 1),
    distanceM: round(distanceM, 1),
    sec: round(sec, 1),
    paceSecKm: round((sec / distanceM) * 1000, 1),
  };
  if (pauseSec > 0.5) km.pauseSec = round(pauseSec, 1);
  if (climb) {
    km.gainM = round(climb.gain, 1);
    km.lossM = round(climb.loss, 1);
    if (Math.max(climb.gain, climb.loss) >= GAP_MIN_CHANGE_M) {
      const gap = gapPace(tr, s, sec);
      if (gap !== undefined) km.gapSecKm = round(gap, 1);
    }
  }
  const put = (key: 'hrAvg' | 'cadence' | 'stepLengthM' | 'oscillationMm' | 'verticalRatioPct' | 'stanceTimeMs' | 'stanceBalanceLeftPct' | 'powerW' | 'respirationRpm', series: Series, decimals: number) => {
    const v = meanOver(tr, series, s);
    if (v !== undefined) km[key] = round(v, decimals);
  };
  put('hrAvg', m.hr, 1);
  const hrMax = maxOver(tr, m.hr, s);
  if (hrMax !== undefined) km.hrMax = Math.round(hrMax);
  put('cadence', m.cadence, 1);
  put('stepLengthM', m.step, 3);
  put('oscillationMm', m.osc, 1);
  put('verticalRatioPct', m.ratio, 2);
  put('stanceTimeMs', m.stance, 0);
  put('stanceBalanceLeftPct', m.balance, 1);
  put('powerW', m.power, 0);
  put('respirationRpm', m.resp, 1);
  const against = wind?.(a, b);
  if (isNum(against)) km.headwindKmh = round(against, 1);
  if (distanceM < 1000 - 1e-6 && b >= tr.total - 1e-6) km.partial = true;
  return km;
}

// The kilometres of a stretch of the run, from `from` on, in pieces of 1000 metres. The
// last piece is kept when it is at least MIN_PIECE_M long.
function piecesOf(tr: Track, m: Measures, from: number, to: number, wind: WindAgainst | undefined): RunKm[] {
  const out: RunKm[] = [];
  for (let a = from, index = 1; a < to - 1e-6; a += 1000, index++) {
    const b = Math.min(a + 1000, to);
    if (b - a < MIN_PIECE_M) break;
    out.push(kmOf(tr, m, index, a, b, wind));
  }
  return out;
}

// --- laps ----------------------------------------------------------------------------------------

function lapsOf(tr: Track, m: Measures, stored: StoredLap[]): RunLap[] {
  const firstT = tr.p[0].t;
  const lastT = tr.p[tr.p.length - 1].t;
  const valid = stored
    .filter((l) => isNum(l.startSec) && isNum(l.endSec) && l.endSec > l.startSec + 1 && l.endSec > firstT && l.startSec < lastT)
    .sort((a, b) => a.startSec - b.startSec);
  const out: RunLap[] = [];
  valid.forEach((l, n) => {
    const startSec = Math.max(l.startSec, firstT);
    const endSec = Math.min(l.endSec, lastT);
    const s = stretchByTime(tr, startSec, endSec);
    const startM = atTime(tr, startSec, (k) => tr.p[k].d);
    const endM = atTime(tr, endSec, (k) => tr.p[k].d);
    const movingStart = atTime(tr, startSec, (k) => tr.moving[k]);
    const movingEnd = atTime(tr, endSec, (k) => tr.moving[k]);
    const sec = Math.max(1, movingEnd - movingStart);
    const distanceM = endM - startM;
    const lap: RunLap = {
      index: n + 1,
      startSec: round(startSec, 1),
      endSec: round(endSec, 1),
      startM: round(startM, 1),
      endM: round(endM, 1),
      distanceM: round(distanceM, 1),
      sec: round(sec, 1),
    };
    if (l.kind) lap.kind = l.kind;
    if (l.label) lap.label = l.label;
    if (distanceM >= 20) lap.paceSecKm = round((sec / distanceM) * 1000, 1);
    const climb = climbOver(tr, s);
    if (climb) {
      lap.gainM = round(climb.gain, 1);
      lap.lossM = round(climb.loss, 1);
      if (distanceM >= 200 && Math.max(climb.gain, climb.loss) >= GAP_MIN_CHANGE_M) {
        const gap = gapPace(tr, s, sec);
        if (gap !== undefined) lap.gapSecKm = round(gap, 1);
      }
    }
    const hr = meanOver(tr, m.hr, s);
    if (hr !== undefined) lap.hrAvg = round(hr, 1);
    const hrMax = maxOver(tr, m.hr, s);
    if (hrMax !== undefined) lap.hrMax = Math.round(hrMax);
    const cadence = meanOver(tr, m.cadence, s);
    if (cadence !== undefined) lap.cadence = round(cadence, 1);
    const step = meanOver(tr, m.step, s);
    if (step !== undefined) lap.stepLengthM = round(step, 3);
    const power = meanOver(tr, m.power, s);
    if (power !== undefined) lap.powerW = round(power, 0);
    // The fall of the heart rate in the first minute of a recovery.
    if (l.kind === 'recovery' && endSec - startSec >= 65 && m.hr) {
      const head = meanOver(tr, m.hr, stretchByTime(tr, startSec, startSec + 5));
      const later = meanOver(tr, m.hr, stretchByTime(tr, startSec + 55, startSec + 65));
      if (head !== undefined && later !== undefined) lap.hrDropFirstMinute = Math.round(head - later);
    }
    out.push(lap);
  });
  // One lap that is the whole run says nothing.
  return out.length >= 2 ? out : [];
}

// --- the reduced line --------------------------------------------------------------------------

function lineOf(tr: Track, m: Measures): RunLine {
  const n = Math.min(LINE_POINTS, Math.max(2, tr.p.length));
  const step = tr.total / (n - 1);
  const half = Math.max(step / 2, 25);
  const t0 = tr.p[0].t;
  const line: RunLine = { n, distM: [], timeSec: [], paceSecKm: [], hr: [], altitudeM: [] };
  const has = (s: Series) => !!s && s.some(isNum);
  const extra: [keyof RunLine, Series, number][] = [
    ['cadence', m.cadence, 0],
    ['stepLengthM', m.step, 2],
    ['stanceTimeMs', m.stance, 0],
    ['oscillationMm', m.osc, 0],
    ['powerW', m.power, 0],
  ];
  for (const [key, series] of extra) if (has(series)) (line as unknown as Record<string, unknown>)[key] = [];
  for (let j = 0; j < n; j++) {
    const d = j * step;
    const a = Math.max(0, d - half);
    const b = Math.min(tr.total, d + half);
    line.distM.push(round(d, 0));
    line.timeSec.push(round(clockAt(tr, d) - t0, 0));
    const dm = movingAt(tr, b) - movingAt(tr, a);
    line.paceSecKm.push(b - a > 0 && dm > 0 ? round(((dm / (b - a)) * 1000), 0) : null);
    const s = stretchByDistance(tr, a, b);
    const hr = meanOver(tr, m.hr, s);
    line.hr.push(hr === undefined ? null : Math.round(hr));
    const altitude = tr.set.altitudeM ? atDistance(tr, d, (k) => tr.set.altitudeM![tr.p[k].i] ?? Number.NaN) : Number.NaN;
    line.altitudeM.push(Number.isFinite(altitude) ? round(altitude, 1) : null);
    for (const [key, series, decimals] of extra) {
      const arr = (line as unknown as Record<string, (number | null)[] | undefined>)[key];
      if (!arr) continue;
      const v = meanOver(tr, series, s);
      arr.push(v === undefined ? null : round(v, decimals));
    }
  }
  return line;
}

// --- the whole -------------------------------------------------------------------------------------

export interface BuildRunDetailOptions {
  // The totals of the log, written on the result so a correction at the source makes it stale.
  logKm: number;
  logMinutes: number;
  builtAt: string;
  laps?: StoredLap[];
  wind?: WindAgainst;
  // Look for the best stretch of this length; 5 km by default. Null: do not look.
  bestKm?: number | null;
}

// Undefined when the series cannot give kilometres (under 1 km, no distance or speed).
export function buildRunDetail(set: StreamSet, opts: BuildRunDetailOptions): RunDetail | undefined {
  const tr = trackOf(set);
  if (!tr) return undefined;
  const m = measuresOf(set);
  const kms = piecesOf(tr, m, 0, tr.total, opts.wind);
  if (kms.length === 0) return undefined;
  const pauseSec = tr.p[tr.p.length - 1].t - tr.p[0].t - tr.moving[tr.moving.length - 1];
  const out: RunDetail = {
    version: 1,
    wholeKm: opts.logKm,
    wholeMinutes: opts.logMinutes,
    builtAt: opts.builtAt,
    totalM: round(tr.total, 0),
    movingSec: round(tr.moving[tr.moving.length - 1], 0),
    pauseSec: round(Math.max(0, pauseSec), 0),
    kms,
    line: lineOf(tr, m),
  };
  if (opts.wind) out.windKnown = kms.some((k) => k.headwindKmh !== undefined);
  const laps = opts.laps ? lapsOf(tr, m, opts.laps) : [];
  if (laps.length > 0) out.laps = laps;
  const bestKm = opts.bestKm === undefined ? 5 : opts.bestKm;
  if (bestKm && tr.total >= bestKm * 1000) {
    const w = fastestWindow(set, bestKm * 1000);
    if (w) {
      out.bestFive = {
        startM: round(w.startM, 0),
        endM: round(w.endM, 0),
        startSec: round(clockAt(tr, w.startM) - tr.p[0].t, 0),
        sec: round(w.seconds, 1),
        kms: piecesOf(tr, m, w.startM, w.endM, opts.wind),
      };
    }
  }
  return out;
}

// --- the wind against you -------------------------------------------------------------------------

export interface HourlyWind {
  // Seconds since the start of the run to the hour mark (negative for the hour it began in).
  atSec: number;
  speedKmh: number;
  // The direction the wind comes from, degrees clockwise from north.
  fromDeg: number;
}

const rad = (deg: number) => (deg * Math.PI) / 180;

// The compass bearing from one point to another, degrees clockwise from north.
export function bearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const y = Math.sin(rad(lon2 - lon1)) * Math.cos(rad(lat2));
  const x = Math.cos(rad(lat1)) * Math.sin(rad(lat2)) - Math.sin(rad(lat1)) * Math.cos(rad(lat2)) * Math.cos(rad(lon2 - lon1));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// The part of the wind that blows against you: running towards the point the wind comes
// from is a headwind (positive). At chest height, 0.65 of the wind at 10 metres.
export function headwindComponent(speedKmh: number, fromDeg: number, headingDeg: number): number {
  return CHEST_WIND_FACTOR * speedKmh * Math.cos(rad(headingDeg - fromDeg));
}

// A function that tells the wind against you for a piece of the run, from the track and the
// wind of each hour. The track is read here and not kept. Null when the piece is too short
// to have a heading (under 100 metres of ground covered) or there is no wind for it.
export function windAgainstFn(set: StreamSet, wind: HourlyWind[]): WindAgainst | undefined {
  const pos = set.position;
  if (!pos || wind.length === 0) return undefined;
  const tr = trackOf(set);
  if (!tr) return undefined;
  const t0 = tr.p[0].t;
  const at = (k: number) => {
    const lat = pos.lat[tr.p[k].i];
    const lon = pos.lon[tr.p[k].i];
    return isNum(lat) && isNum(lon) ? { lat, lon } : undefined;
  };
  return (a, b) => {
    const s = stretchByDistance(tr, a, b);
    let first: { lat: number; lon: number } | undefined;
    let last: { lat: number; lon: number } | undefined;
    for (let k = s.from; k < Math.min(s.to, tr.p.length); k++) {
      const q = at(k);
      if (!q) continue;
      first ??= q;
      last = q;
    }
    if (!first || !last) return null;
    // The ground between the first and the last reading, in metres (flat-earth is enough here).
    const dy = (last.lat - first.lat) * 111_320;
    const dx = (last.lon - first.lon) * 111_320 * Math.cos(rad((last.lat + first.lat) / 2));
    if (Math.hypot(dx, dy) < MIN_PIECE_M) return null;
    const heading = bearing(first.lat, first.lon, last.lat, last.lon);
    const mid = (clockAt(tr, a) + clockAt(tr, b)) / 2 - t0;
    const hour = wind.reduce((best, w) => (Math.abs(w.atSec - mid) < Math.abs(best.atSec - mid) ? w : best), wind[0]);
    return round(headwindComponent(hour.speedKmh, hour.fromDeg, heading), 1);
  };
}

// The same wind per kilometre of the run, as it is stored beside the series.
export function windPerKm(set: StreamSet, wind: WindAgainst | undefined): (number | null)[] | undefined {
  if (!wind) return undefined;
  const tr = trackOf(set);
  if (!tr) return undefined;
  const out: (number | null)[] = [];
  for (let a = 0; a < tr.total - 1e-6; a += 1000) {
    const b = Math.min(a + 1000, tr.total);
    if (b - a < MIN_PIECE_M) break;
    out.push(wind(a, b));
  }
  return out.some((v) => v !== null) ? out : undefined;
}

// What was stored per kilometre, as a wind function again (for the kilometres of the run
// itself; any other piece has no known wind once the track is gone).
export function windFromStored(perKm: readonly (number | null)[] | undefined): WindAgainst | undefined {
  if (!perKm || perKm.length === 0) return undefined;
  return (a, b) => {
    const k = Math.round(a / 1000);
    return Math.abs(a - k * 1000) < 1e-3 && b - a <= 1000 + 1e-3 ? (perKm[k] ?? null) : null;
  };
}

// --- fingerprint --------------------------------------------------------------------------------------

export const runDetailFingerprint = effortFingerprint;

export function isStaleRunDetail(rd: Pick<RunDetail, 'wholeKm' | 'wholeMinutes'>, km: number, minutes: number): boolean {
  return Math.abs(rd.wholeKm - km) > 0.005 || Math.abs(rd.wholeMinutes - minutes) > 0.05;
}

// A run detail as it may be believed (the shape the screen relies on).
export function isUsableRunDetail(raw: unknown): raw is RunDetail {
  if (typeof raw !== 'object' || raw === null) return false;
  const r = raw as Partial<RunDetail>;
  if (r.version !== 1 || !isNum(r.wholeKm) || !isNum(r.wholeMinutes) || !isNum(r.totalM) || !isNum(r.movingSec) || !isNum(r.pauseSec)) return false;
  if (!Array.isArray(r.kms) || r.kms.length === 0 || r.kms.length > 400) return false;
  const kmOk = (k: unknown) => typeof k === 'object' && k !== null && isNum((k as RunKm).index) && isNum((k as RunKm).sec) && isNum((k as RunKm).paceSecKm) && isNum((k as RunKm).distanceM) && isNum((k as RunKm).startM) && isNum((k as RunKm).endM);
  if (!r.kms.every(kmOk)) return false;
  const l = r.line;
  if (!l || !isNum(l.n) || l.n < 2 || ![l.distM, l.timeSec, l.paceSecKm, l.hr, l.altitudeM].every((a) => Array.isArray(a) && a.length === l.n)) return false;
  if (r.laps !== undefined && (!Array.isArray(r.laps) || !r.laps.every((x) => typeof x === 'object' && x !== null && isNum(x.startSec) && isNum(x.endSec) && isNum(x.sec)))) return false;
  if (r.bestFive !== undefined) {
    const b = r.bestFive;
    if (typeof b !== 'object' || b === null || !isNum(b.startM) || !isNum(b.endM) || !isNum(b.sec) || !isNum(b.startSec) || !Array.isArray(b.kms) || !b.kms.every(kmOk)) return false;
  }
  return true;
}

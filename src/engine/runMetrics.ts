// ASCEND — what one run or tocht says, from its compact profile.
//
// Per training, no comparison (that is engine/runComparison.ts): a steady
// block and the pace at one reference heart rate, the drift over a long run,
// the climbs and descents, and how the form held from the first to the last
// third. Everything works on `ActivityDetail` (models/activityDetail.ts) and
// nothing here knows a provider or a brand. When a number cannot be made, the
// answer says why (`unavailable`) instead of guessing.
//
// Thresholds come from docs/onderzoek/Loopgegevens en vooruitgang.md,
// hoofdstuk 2 and 3. The ones marked "own assumption" there are marked so here:
// they are to be tuned on the owner's own data after a few weeks.
//
// Pure: no React, no IndexedDB.

import type { ActivityDetail, DetailSlice, RunDynamics, TerrainStretch } from '../models/activityDetail';

export type Unavailable =
  | 'noDetail'
  | 'noHeartRate'
  | 'noSteadyBlock'
  | 'outsideZone'
  | 'tooShort'
  | 'hilly'
  | 'noDynamics'
  | 'paceChanged'
  | 'noStretch'
  | 'altitudeDisagrees';

export interface NotAvailable {
  unavailable: Unavailable;
}

export const isUnavailable = (v: unknown): v is NotAvailable => typeof v === 'object' && v !== null && 'unavailable' in v;

// The noise of each measure on a single run, in the unit of the measure
// (docs/onderzoek, hoofdstuk 3). A difference counts for a line only from 1.5
// times this.
export const NOISE = {
  // Percent of the pace at the reference heart rate: day to day about 3 percent
  // (Buchheit 2014), a single run against the middle of a few about 3,5.
  efficiencyPct: 3.5,
  // Percentage points of drift (own assumption).
  driftPoints: 3,
  // Percent of the climbing speed (own assumption).
  climbPct: 8,
  // Percent of the descending speed (own assumption).
  descentPct: 15,
  // Percent of the ground contact time: about 2 percent day to day with a pod on
  // the hip, so 4 with a margin (own assumption).
  stancePct: 4,
  stepLengthPct: 3,
  cadenceSpm: 3,
} as const;

export const STRENGTH_FOR_A_LINE = 1.5;

// --- the steady block ---------------------------------------------------------------------

export interface BlockOptions {
  // At least this many moving seconds in a row.
  minSec: number;
  // Not before this many moving seconds: the warm start is left out.
  afterSec: number;
  // Not after this many (a window), when set.
  untilSec?: number;
  // Every piece within plus or minus this gradient, percent.
  maxGradePct: number;
  // The pace of the pieces varies at most this much, percent of the mean.
  maxPaceSpreadPct: number;
}

// Own assumptions: 15 minutes, after the first 10, 2 percent, 8 percent
// (Nuuttila 2022 measured minute 5 to 10 of a flat warm-up to keep drift out).
export const EFFICIENCY_BLOCK: BlockOptions = { minSec: 15 * 60, afterSec: 10 * 60, maxGradePct: 2, maxPaceSpreadPct: 8 };
// For drift: 45 minutes in a row after the warm start, 3 percent.
export const DRIFT_BLOCK: BlockOptions = { minSec: 45 * 60, afterSec: 10 * 60, maxGradePct: 3, maxPaceSpreadPct: 8 };
// The efficiency of a long run is read on its first 40 minutes when those were flat.
export const LONG_RUN_EFFICIENCY_WINDOW_SEC = 40 * 60;

export interface SteadyBlock {
  // Slice indexes, from inclusive, to exclusive.
  from: number;
  to: number;
  startSec: number;
  sec: number;
  distanceM: number;
  // Seconds per kilometre over the block, and the time-weighted heart rate.
  paceSec: number;
  heartRate: number;
}

const slicePace = (s: DetailSlice): number | undefined => (s.distanceM > 0 && s.sec > 0 ? (s.sec / s.distanceM) * 1000 : undefined);

function startsOf(slices: DetailSlice[]): number[] {
  const starts: number[] = [];
  let t = 0;
  for (const s of slices) {
    starts.push(t);
    t += s.sec;
  }
  return starts;
}

export function steadyBlock(detail: ActivityDetail, opts: BlockOptions): SteadyBlock | undefined {
  const slices = detail.slices;
  const starts = startsOf(slices);
  const eligible = slices.map((s, i) => {
    const pace = slicePace(s);
    if (pace === undefined || s.heartRate === undefined) return false;
    if (starts[i] < opts.afterSec - 1) return false;
    if (opts.untilSec !== undefined && starts[i] + s.sec > opts.untilSec + 1) return false;
    return (Math.abs(s.gainM - s.lossM) / s.distanceM) * 100 <= opts.maxGradePct;
  });
  let best: { from: number; to: number; sec: number } | undefined;
  for (let i = 0; i < slices.length; i++) {
    if (!eligible[i]) continue;
    let lo = Infinity;
    let hi = -Infinity;
    let sumPace = 0;
    let sec = 0;
    for (let j = i; j < slices.length && eligible[j]; j++) {
      const pace = slicePace(slices[j]) as number;
      const nlo = Math.min(lo, pace);
      const nhi = Math.max(hi, pace);
      const n = j - i + 1;
      const mean = (sumPace + pace) / n;
      if (((nhi - nlo) / mean) * 100 > opts.maxPaceSpreadPct) break;
      lo = nlo;
      hi = nhi;
      sumPace += pace;
      sec += slices[j].sec;
      if (sec >= opts.minSec && (!best || sec > best.sec)) best = { from: i, to: j + 1, sec };
    }
  }
  if (!best) return undefined;
  return blockOf(detail, best.from, best.to);
}

function blockOf(detail: ActivityDetail, from: number, to: number): SteadyBlock {
  const part = detail.slices.slice(from, to);
  const sec = part.reduce((n, s) => n + s.sec, 0);
  const distanceM = part.reduce((n, s) => n + s.distanceM, 0);
  const hr = part.reduce((n, s) => n + (s.heartRate ?? 0) * s.sec, 0) / sec;
  return { from, to, startSec: startsOf(detail.slices)[from], sec, distanceM, paceSec: (sec / distanceM) * 1000, heartRate: hr };
}

// --- efficiency: pace at one heart rate ------------------------------------------------------

export interface Efficiency {
  // Seconds per kilometre, converted to the reference heart rate by simple
  // proportion, like engine/aerobicTrend.ts does: good for a comparison, not
  // for a single number.
  paceAtRefSec: number;
  blockMinutes: number;
  blockPaceSec: number;
  blockHeartRate: number;
}

const BELOW_ZONE_BPM = 15;

// `zone` is the band of zone 2 in beats per minute when the owner's own heart
// rate values are known; the block must lie in it, or up to 15 beats under it
// (the same as aerobicTrend), because well above it is no easy run any more.
export function efficiencyOf(detail: ActivityDetail | undefined, referenceHr: number, zone?: [number, number], options: BlockOptions = EFFICIENCY_BLOCK): Efficiency | NotAvailable {
  if (!detail) return { unavailable: 'noDetail' };
  if (detail.quality.heartRateCoveragePct < 80) return { unavailable: 'noHeartRate' };
  const block = steadyBlock(detail, options);
  if (!block) return { unavailable: 'noSteadyBlock' };
  if (zone && (block.heartRate < zone[0] - BELOW_ZONE_BPM || block.heartRate > zone[1])) return { unavailable: 'outsideZone' };
  if (referenceHr <= 0) return { unavailable: 'noHeartRate' };
  return {
    paceAtRefSec: block.paceSec * (block.heartRate / referenceHr),
    blockMinutes: Math.round(block.sec / 60),
    blockPaceSec: block.paceSec,
    blockHeartRate: block.heartRate,
  };
}

// --- drift on a long run ------------------------------------------------------------------------

export interface Drift {
  // Aerobic decoupling: the fall of speed per heartbeat from the first to the
  // second half of the steady block, percent. A coach's guideline puts under 5
  // percent as good; it is no measured limit (docs/onderzoek, hoofdstuk 3).
  percent: number;
  blockMinutes: number;
  firstHeartRate: number;
  secondHeartRate: number;
}

// A run counts as long from this many moving seconds.
export const LONG_RUN_SEC = 60 * 60;

export function driftOf(detail: ActivityDetail | undefined): Drift | NotAvailable {
  if (!detail) return { unavailable: 'noDetail' };
  if (detail.movingSec < LONG_RUN_SEC) return { unavailable: 'tooShort' };
  if (detail.quality.heartRateCoveragePct < 80) return { unavailable: 'noHeartRate' };
  const block = steadyBlock(detail, DRIFT_BLOCK);
  if (!block) return { unavailable: 'noSteadyBlock' };
  const part = detail.slices.slice(block.from, block.to);
  const half = block.sec / 2;
  let t = 0;
  const first: DetailSlice[] = [];
  const second: DetailSlice[] = [];
  for (const s of part) {
    (t + s.sec / 2 < half ? first : second).push(s);
    t += s.sec;
  }
  const ef = (xs: DetailSlice[]) => {
    const sec = xs.reduce((n, s) => n + s.sec, 0);
    const dist = xs.reduce((n, s) => n + s.distanceM, 0);
    const hr = xs.reduce((n, s) => n + (s.heartRate ?? 0) * s.sec, 0) / sec;
    return { ef: dist / sec / hr, hr };
  };
  const a = ef(first);
  const b = ef(second);
  return {
    percent: ((a.ef - b.ef) / a.ef) * 100,
    blockMinutes: Math.round(block.sec / 60),
    firstHeartRate: a.hr,
    secondHeartRate: b.hr,
  };
}

// --- climbs and descents ---------------------------------------------------------------------------

export type HillClass = 'heuvel' | 'klim';

export interface ClimbFact {
  klass: HillClass;
  metres: number;
  sec: number;
  metresPerHour: number;
  gradientPct: number;
  // The gradient class, four percent wide: 4 means 4 to 8 percent.
  gradeFrom: number;
  heartRate?: number;
  cadence?: number;
}

export interface DescentFact {
  metres: number;
  sec: number;
  metresPerHour: number;
  gradientPct: number;
  heartRate?: number;
  cadence?: number;
  // The last third against the first, inside this one descent. Only facts:
  // there is no validated measure for a controlled descent (docs/onderzoek).
  speedChangePct?: number;
  cadenceChange?: number;
  heartRateChange?: number;
}

// A hill: at least 50 m, 4 minutes and 4 percent on average. A climb: at least
// 150 m and 8 minutes. The hill class is the more sensitive to the noise of a
// barometer (own assumption).
export const HILL_MIN = { metres: 50, sec: 240, gradientPct: 4 };
export const CLIMB_MIN = { metres: 150, sec: 480 };
export const GRADE_CLASS_WIDTH = 4;
// Our own climb against the climb the source reports: further apart than this
// and the altitude of this training is not trusted (a corrected altitude at the
// source can differ legitimately, so the margin is wide).
export const GAIN_AGREEMENT_RANGE: [number, number] = [60, 140];

const altitudeTrusted = (d: ActivityDetail) => d.quality.gainAgreementPct === undefined || (d.quality.gainAgreementPct >= GAIN_AGREEMENT_RANGE[0] && d.quality.gainAgreementPct <= GAIN_AGREEMENT_RANGE[1]);

export function climbsOf(detail: ActivityDetail | undefined): ClimbFact[] | NotAvailable {
  if (!detail) return { unavailable: 'noDetail' };
  if (!altitudeTrusted(detail)) return { unavailable: 'altitudeDisagrees' };
  const out: ClimbFact[] = [];
  for (const s of detail.stretches) {
    if (s.kind !== 'climb' || s.metres < HILL_MIN.metres || s.sec < HILL_MIN.sec || s.gradientPct < HILL_MIN.gradientPct) continue;
    out.push({
      klass: s.metres >= CLIMB_MIN.metres && s.sec >= CLIMB_MIN.sec ? 'klim' : 'heuvel',
      metres: s.metres,
      sec: s.sec,
      metresPerHour: (s.metres / s.sec) * 3600,
      gradientPct: s.gradientPct,
      gradeFrom: Math.floor(s.gradientPct / GRADE_CLASS_WIDTH) * GRADE_CLASS_WIDTH,
      ...(s.heartRate !== undefined ? { heartRate: s.heartRate } : {}),
      ...(s.cadence !== undefined ? { cadence: s.cadence } : {}),
    });
  }
  return out;
}

function descentFact(s: TerrainStretch): DescentFact {
  const fact: DescentFact = {
    metres: s.metres,
    sec: s.sec,
    metresPerHour: (s.metres / s.sec) * 3600,
    gradientPct: s.gradientPct,
    ...(s.heartRate !== undefined ? { heartRate: s.heartRate } : {}),
    ...(s.cadence !== undefined ? { cadence: s.cadence } : {}),
  };
  const t = s.thirds;
  if (t && t.length === 3 && t[0].metresPerHour > 0) {
    fact.speedChangePct = ((t[2].metresPerHour - t[0].metresPerHour) / t[0].metresPerHour) * 100;
    if (t[0].cadence !== undefined && t[2].cadence !== undefined) fact.cadenceChange = t[2].cadence - t[0].cadence;
    if (t[0].heartRate !== undefined && t[2].heartRate !== undefined) fact.heartRateChange = t[2].heartRate - t[0].heartRate;
  }
  return fact;
}

export function descentsOf(detail: ActivityDetail | undefined): DescentFact[] | NotAvailable {
  if (!detail) return { unavailable: 'noDetail' };
  if (!altitudeTrusted(detail)) return { unavailable: 'altitudeDisagrees' };
  return detail.stretches.filter((s) => s.kind === 'descent' && s.metres >= HILL_MIN.metres && s.sec >= HILL_MIN.sec).map(descentFact);
}

// --- form: the first third against the last ----------------------------------------------------------

export type FormSample = RunDynamics & { cadence?: number; paceSec: number };

export interface Form {
  first: FormSample;
  last: FormSample;
  // The last third's pace against the first, percent; positive = slower.
  paceChangePct: number;
  stanceChangePct?: number;
  stepChangePct?: number;
  cadenceChange?: number;
}

// Form is read within one run, so that day-to-day noise and differences between
// people drop out (Zandbergen 2023): only when the pace of the last third is
// within 6 percent of the first, and on terrain that is not hilly.
export const FORM_MAX_PACE_CHANGE_PCT = 6;
export const FORM_MAX_CLIMB_PER_KM = 15;
export const FORM_MIN_SEC = 20 * 60;

function third(slices: DetailSlice[]): FormSample | undefined {
  const sec = slices.reduce((n, s) => n + s.sec, 0);
  const dist = slices.reduce((n, s) => n + s.distanceM, 0);
  if (sec <= 0 || dist <= 0) return undefined;
  const mean = (pick: (s: DetailSlice) => number | undefined): number | undefined => {
    let sum = 0;
    let covered = 0;
    for (const s of slices) {
      const v = pick(s);
      if (v !== undefined) {
        sum += v * s.sec;
        covered += s.sec;
      }
    }
    return covered >= sec / 2 ? sum / covered : undefined;
  };
  const sample: FormSample = { paceSec: (sec / dist) * 1000 };
  const put = <K extends keyof FormSample>(key: K, value: FormSample[K] | undefined) => {
    if (value !== undefined) sample[key] = value;
  };
  put('stanceTimeMs', mean((s) => s.dynamics?.stanceTimeMs));
  put('stepLengthM', mean((s) => s.dynamics?.stepLengthM));
  put('cadence', mean((s) => s.cadence));
  put('verticalOscillationMm', mean((s) => s.dynamics?.verticalOscillationMm));
  put('verticalRatioPct', mean((s) => s.dynamics?.verticalRatioPct));
  put('stanceBalanceLeftPct', mean((s) => s.dynamics?.stanceBalanceLeftPct));
  return sample;
}

export function formOf(detail: ActivityDetail | undefined): Form | NotAvailable {
  if (!detail) return { unavailable: 'noDetail' };
  if (detail.movingSec < FORM_MIN_SEC) return { unavailable: 'tooShort' };
  const slices = detail.slices;
  const km = slices.reduce((n, s) => n + s.distanceM, 0) / 1000;
  const gain = slices.reduce((n, s) => n + s.gainM, 0);
  if (km <= 0 || gain / km > FORM_MAX_CLIMB_PER_KM) return { unavailable: 'hilly' };
  const k = Math.floor(slices.length / 3);
  const first = third(slices.slice(0, k));
  const last = third(slices.slice(slices.length - k));
  if (!first || !last) return { unavailable: 'noDynamics' };
  const hasForm = (x: FormSample) => x.stanceTimeMs !== undefined || x.stepLengthM !== undefined || x.cadence !== undefined;
  if (!hasForm(first) || !hasForm(last)) return { unavailable: 'noDynamics' };
  const paceChangePct = ((last.paceSec - first.paceSec) / first.paceSec) * 100;
  if (Math.abs(paceChangePct) > FORM_MAX_PACE_CHANGE_PCT) return { unavailable: 'paceChanged' };
  const rel = (a?: number, b?: number) => (a !== undefined && b !== undefined && a > 0 ? ((b - a) / a) * 100 : undefined);
  const out: Form = { first, last, paceChangePct };
  const stance = rel(first.stanceTimeMs, last.stanceTimeMs);
  const step = rel(first.stepLengthM, last.stepLengthM);
  if (stance !== undefined) out.stanceChangePct = stance;
  if (step !== undefined) out.stepChangePct = step;
  if (first.cadence !== undefined && last.cadence !== undefined) out.cadenceChange = last.cadence - first.cadence;
  return out;
}

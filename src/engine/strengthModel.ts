// ASCEND: the strength model, rules KR-1 to KR-8 of
// docs/onderzoek/Kracht loggen en progressie.md. Pure; no React, no storage.
//
// In short. Every working set with a known "reps in reserve" (RIR) says how
// strong you were that day (KR-1). One number per training (KR-2), smoothed over
// trainings so a bad day costs little and a good day counts (KR-3). From that
// number the weight for next time follows (KR-4), limited to a sensible step
// (KR-5) and rounded to the weights the gym has (KR-6), with warm-up sets
// (KR-7). Every advice comes with one plain sentence why (KR-8 and the rest).
//
// The word for the user is "geschatte kracht", never "je max". A strength
// estimate from one set is not a true maximum; it is a coin to compare sets of
// the same exercise with each other. So: only sets of at most 12 reps to
// failure, never converted from one exercise to another.
//
// All numbers below are starting values from the report, not research results.
// Where this file made its own choice, it says so.

import type { Exercise } from '../models/exercise';
import type { SetLog } from '../models/training';
import { daysBetween } from '../utils/dates';
import { formatNumberNL } from '../utils/number';
import { isWorkSet } from './workSets';
import type { ResolvedStrengthSettings } from './strengthSettings';
import { candidatesFor, externalFromLoad, loadFromExternal, nearestIndex, stepAt, type Candidate } from './strengthWeights';

// --- constants -------------------------------------------------------------------------

// Epley: one rep is about 1/30 of the estimated strength.
export const EPLEY_DIVISOR = 30;
// Above this many reps to failure the conversion is too uncertain (Nuzzo, Halperin).
export const MAX_REPS_TO_FAILURE = 12;
// From this many reps in reserve a set counts half; from this many it does not count.
export const HALF_WEIGHT_FROM_RIR = 4;
export const NO_ESTIMATE_FROM_RIR = 6;

// KR-3, the share of the way the smoothed number moves to today's.
export const K_UP = 0.5;
export const K_DOWN = 0.25;
export const K_DOWN_TWICE = 0.5;
export const K_DOWN_TIRED_LEGS = 0.1;
export const K_AFTER_BREAK = 0.7;
export const BREAK_DAYS = 21;
// A day counts as "bad" when it is more than 1% under the smoothed number.
export const BAD_DAY_MARGIN = 0.99;

// KR-5.
export const MAX_RAISE_PER_TRAINING = 0.05;
export const MAX_RAISE_PER_WEEK = 0.1;
export const MAX_DROP_PER_TRAINING = 0.1;
// Two trainings in a row clearly under what was expected: this much lighter.
export const UNDER_EXPECTATION_REPS = 2;
export const UNDER_EXPECTATION_DROP = 0.05;

// Fatigue within a training. CHOICE OF THIS FILE (the report has no rule for
// it): every earlier working set costs the next one this share of the strength.
// With 3% the model gives 47,5, 45, 42,5 and 42,5 kg for four sets of 11 to 13
// reps with 2 in reserve, the series the owner's other app showed. That is one
// example, so the 3% is uncertain; it can be changed here and nowhere else.
export const FATIGUE_PER_SET = 0.03;

// The rep ranges, as three reps wide bands around these centres (the owner's
// other app uses 7 to 9, 9 to 11, 11 to 13, 14 to 16). The range is not stored
// anywhere yet, so it is derived from what was done: the middle of the first
// training, snapped to the nearest band (halfway goes up: 11 reps is the bottom
// of 11 to 13), and moved only after two trainings in a row outside it.
export const RANGE_CENTRES = [4, 6, 8, 10, 12, 15, 18];
export const DEFAULT_RIR = 2;

// --- KR-1 ------------------------------------------------------------------------------

export interface LoadContext {
  exercise?: Exercise;
  bodyKg?: number;
  // Up to how many reps to failure a set counts (the setting; 12 by default).
  maxToFailure?: number;
}

// What moves in total with this set. Undefined when it cannot be known.
export function setLoad(set: SetLog, ctx: LoadContext): number | undefined {
  return loadFromExternal(ctx.exercise, set.weightKg ?? 0, ctx.bodyKg);
}

export interface SetEstimate {
  strengthKg: number;
  // 1, or 0.5 for a set far from failure.
  weight: number;
}

export function estimateSet(set: SetLog, ctx: LoadContext): SetEstimate | undefined {
  if (!isWorkSet(set) || set.rir === undefined || set.reps <= 0) return undefined;
  if (set.rir >= NO_ESTIMATE_FROM_RIR || set.rir < 0) return undefined;
  const toFailure = set.reps + set.rir;
  if (toFailure > (ctx.maxToFailure ?? MAX_REPS_TO_FAILURE)) return undefined;
  const load = setLoad(set, ctx);
  if (load === undefined) return undefined;
  return { strengthKg: load * (1 + toFailure / EPLEY_DIVISOR), weight: set.rir >= HALF_WEIGHT_FROM_RIR ? 0.5 : 1 };
}

// Reps you can still do at a load with a given strength, rounded down.
export function expectedReps(strengthKg: number, loadKg: number, rir: number): number {
  return Math.max(0, Math.floor(EPLEY_DIVISOR * (strengthKg / loadKg - 1) - rir + 1e-9));
}

// The load at which `reps` reps with `rir` left are what you can do.
export function loadForReps(strengthKg: number, reps: number, rir: number): number {
  return strengthKg / (1 + (reps + rir) / EPLEY_DIVISOR);
}

// --- KR-2 ------------------------------------------------------------------------------

// The average of the two highest estimates of the training (weighted), or the
// one there is. Not only the highest (one lucky set), not all (later sets are
// lower because of tiredness, not because you got weaker).
export function sessionStrength(sets: SetLog[], ctx: LoadContext): number | undefined {
  const estimates = sets.map((s) => estimateSet(s, ctx)).filter((e): e is SetEstimate => !!e);
  if (estimates.length === 0) return undefined;
  const top = estimates.sort((a, b) => b.strengthKg - a.strengthKg).slice(0, 2);
  const weight = top.reduce((n, e) => n + e.weight, 0);
  return top.reduce((n, e) => n + e.strengthKg * e.weight, 0) / weight;
}

// --- KR-3 ------------------------------------------------------------------------------

export interface SessionInput {
  date: string;
  sets: SetLog[];
  // The legs were tired from a mountain hike, a long or hard run, or the leg
  // index said so (engine/strengthHistory.ts decides).
  legsTired?: boolean;
}

export type SmoothNote = 'none' | 'start' | 'up' | 'down' | 'down_twice' | 'legs' | 'restart';

export interface TopSet {
  weightKg: number;
  reps: number;
  rir?: number;
  loadKg: number;
}

export interface SessionPoint {
  date: string;
  // KR-2, this training.
  value?: number;
  // KR-3, after this training. Absent until there is a first estimate.
  smoothed?: number;
  k?: number;
  note: SmoothNote;
  legsTired: boolean;
  // The heaviest working set (most load, then most reps).
  top?: TopSet;
  workSets: SetLog[];
  // Reps to failure that were expected from the smoothed number before this
  // training minus what the top set showed. Positive is under expectation.
  shortfall?: number;
}

export function topSetOf(sets: SetLog[], ctx: LoadContext): TopSet | undefined {
  let best: TopSet | undefined;
  for (const s of sets) {
    if (!isWorkSet(s) || s.reps <= 0) continue;
    const loadKg = setLoad(s, ctx);
    if (loadKg === undefined) continue;
    if (!best || loadKg > best.loadKg || (loadKg === best.loadKg && s.reps > best.reps)) {
      best = { weightKg: s.weightKg ?? 0, reps: s.reps, ...(s.rir !== undefined ? { rir: s.rir } : {}), loadKg };
    }
  }
  return best;
}

export function analyseSessions(sessions: SessionInput[], ctx: LoadContext): SessionPoint[] {
  const loadsLegs = !!ctx.exercise?.loadsLegs;
  const sorted = [...sessions].sort((a, b) => a.date.localeCompare(b.date));
  const points: SessionPoint[] = [];
  let smoothed: number | undefined;
  let badInARow = 0;
  let previousDate: string | undefined;
  for (const s of sorted) {
    const workSets = s.sets.filter(isWorkSet);
    const value = sessionStrength(s.sets, ctx);
    const top = topSetOf(s.sets, ctx);
    const legsTired = !!s.legsTired && loadsLegs;
    const point: SessionPoint = { date: s.date, note: 'none', legsTired, workSets, ...(value !== undefined ? { value } : {}), ...(top ? { top } : {}) };
    if (smoothed !== undefined && top?.rir !== undefined) {
      point.shortfall = EPLEY_DIVISOR * (smoothed / top.loadKg - 1) - (top.reps + top.rir);
    }
    const afterBreak = previousDate !== undefined && daysBetween(previousDate, s.date) > BREAK_DAYS;
    if (value !== undefined) {
      if (smoothed === undefined) {
        smoothed = value;
        point.note = 'start';
        point.k = 1;
      } else {
        let k: number;
        if (afterBreak) {
          k = K_AFTER_BREAK;
          point.note = 'restart';
          badInARow = 0;
        } else if (value >= smoothed) {
          k = K_UP;
          point.note = 'up';
          badInARow = 0;
        } else if (value < smoothed * BAD_DAY_MARGIN && legsTired) {
          // Tired legs explain a bad day: it hardly counts, and it is not a bad day in a row.
          k = K_DOWN_TIRED_LEGS;
          point.note = 'legs';
        } else if (value < smoothed * BAD_DAY_MARGIN) {
          badInARow++;
          k = badInARow >= 2 ? K_DOWN_TWICE : K_DOWN;
          point.note = badInARow >= 2 ? 'down_twice' : 'down';
        } else {
          k = K_DOWN;
          point.note = 'down';
        }
        point.k = k;
        smoothed = smoothed + k * (value - smoothed);
      }
    }
    if (smoothed !== undefined) point.smoothed = smoothed;
    points.push(point);
    previousDate = s.date;
  }
  return points;
}

// --- rep range and RIR, derived ------------------------------------------------------------

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export interface RepRange {
  low: number;
  high: number;
  rir: number;
}

function snapToBand(reps: number): number {
  return RANGE_CENTRES.reduce((best, c) => (Math.abs(c - reps) <= Math.abs(best - reps) ? c : best), RANGE_CENTRES[0]);
}

// The band is sticky: it is set by the first training and moves only when the
// middle of two trainings in a row lies outside it, on the same side. One
// training with more reps does not move it; the weight goes up instead.
export function deriveRange(points: SessionPoint[]): RepRange {
  const medians = points.map((p) => p.workSets.map((s) => s.reps).filter((r) => r > 0)).filter((r) => r.length > 0).map(median);
  let centre = medians.length > 0 ? snapToBand(medians[0]) : 10;
  for (let i = 1; i < medians.length; i++) {
    const side = (m: number) => (m < centre - 1 ? -1 : m > centre + 1 ? 1 : 0);
    if (side(medians[i]) !== 0 && side(medians[i]) === side(medians[i - 1])) centre = snapToBand(medians[i]);
  }
  const rirs = points.slice(-2).flatMap((p) => p.workSets).map((s) => s.rir).filter((r): r is number => r !== undefined);
  const rir = rirs.length > 0 ? Math.min(3, Math.max(1, Math.round(median(rirs)))) : DEFAULT_RIR;
  return { low: centre - 1, high: centre + 1, rir };
}

// The weight (as logged) you can handle for the middle of the range with the
// reps in reserve of the range: "nu ongeveer 50 kg voor 10 herhalingen met 2
// over". This is what the chart on the Kracht page shows, not the estimate.
export function referenceWeight(strengthKg: number, range: RepRange, ctx: LoadContext, assistSign = -1): { weightKg: number; reps: number } | undefined {
  const reps = Math.round((range.low + range.high) / 2);
  const load = loadForReps(strengthKg, reps, range.rir);
  const external = externalFromLoad(ctx.exercise, load, ctx.bodyKg, assistSign);
  if (external === undefined) return undefined;
  return { weightKg: Math.round(external * 2) / 2, reps };
}

// --- KR-4 to KR-6, KR-8 ---------------------------------------------------------------------

export interface PlannedSet {
  // As it is logged (help on an assisted machine is negative).
  weightKg: number;
  repsLow: number;
  repsHigh: number;
  rir: number;
}

export interface WarmupSet {
  weightKg: number;
  reps: number;
}

export type PrescriptionKind = 'tired' | 'two_under' | 'widened' | 'capped' | 'pause' | 'up' | 'down' | 'same';

export interface Prescription {
  sets: PlannedSet[];
  warmups: WarmupSet[];
  kind: PrescriptionKind;
  // One short sentence, plain words.
  reason: string;
  widened: boolean;
  // The smoothed strength this is based on.
  strengthKg: number;
  // The range before any widening, and the reps in reserve.
  range: RepRange;
  // The reps the first set aims for when the weight stays the same: last time plus one.
  targetReps: number;
  // One step of the weights at the first set, to say "hooguit één stap verschil".
  stepKg: number;
  // The weight of the last training that this one was compared to.
  lastWeightKg: number;
}

export interface PrescribeInput {
  exercise?: Exercise;
  sessions: SessionInput[];
  // The day the training is meant for (the week limit looks back from here).
  date: string;
  bodyKg?: number;
  settings: ResolvedStrengthSettings;
  // The legs are tired right now; the sentence says from what ("een bergtocht gisteren").
  tired?: { because: string };
  // An earlier exercise of the same movement pattern is in the same training:
  // then one feel set is enough (KR-7).
  patternSeen?: boolean;
}

const nl = (n: number) => formatNumberNL(n, 2);

export function formatWeight(exercise: Exercise | undefined, weightKg: number): string {
  if (exercise?.resistance === 'assisted_bodyweight') return weightKg === 0 ? 'geen hulp' : `hulp ${nl(Math.abs(weightKg))} kg`;
  if (weightKg === 0 && (exercise?.resistance === 'bodyweight' || exercise?.resistance === 'pack_or_vest')) return 'eigen gewicht';
  return `${nl(weightKg)} kg`;
}

export function describePlannedSet(exercise: Exercise | undefined, set: PlannedSet): string {
  const reps = set.repsLow === set.repsHigh ? `${set.repsLow}` : `${set.repsLow} tot ${set.repsHigh}`;
  return `${formatWeight(exercise, set.weightKg)} x ${reps}, ${set.rir === 0 ? 'tot het uiterste' : `${set.rir} over`}`;
}

const NO_WARMUP_PATTERNS = new Set(['isolation_arm', 'isolation_shoulder', 'calf', 'shin', 'core', 'hip']);

// KR-7. Nothing for a light weight (the empty bar plus 10 kg, or 10 kg without
// a bar) or an isolation exercise, and nothing for a load made of body weight.
export function warmupSets(
  settings: ResolvedStrengthSettings,
  exercise: Exercise | undefined,
  candidates: Candidate[],
  firstWeightKg: number,
  strengthKg: number,
  patternSeen = false,
): WarmupSet[] {
  if (settings.warmup === 'off' || !exercise) return [];
  if (exercise.bodyweightFraction !== undefined || NO_WARMUP_PATTERNS.has(exercise.pattern)) return [];
  if (exercise.resistance === 'bodyweight' || exercise.resistance === 'assisted_bodyweight') return [];
  const bars = settings.profile.barsKg;
  const bar = exercise.resistance === 'barbell' ? Math.min(...candidates.map((c) => c.externalKg)) : 0;
  const light = exercise.resistance === 'barbell' ? firstWeightKg <= bar + 10 : firstWeightKg <= 10;
  if (light) return [];
  const heavy = exercise.resistance === 'barbell' && firstWeightKg > 3 * Math.max(...bars);
  let plan: { weight: number; reps: number }[];
  if (patternSeen) {
    plan = [{ weight: firstWeightKg * 0.65, reps: 5 }];
  } else if (settings.warmup === 'scheme') {
    // Percentages of the first working weight: 40, 60 and 80% for 5, 5 and 3.
    plan = [{ weight: firstWeightKg * 0.4, reps: 5 }, { weight: firstWeightKg * 0.6, reps: 5 }, { weight: firstWeightKg * 0.8, reps: 3 }];
  } else {
    // Smart: percentages of the estimated strength, so a heavier day (more
    // strength) gets heavier warm-up sets; only what lies under the working weight stays.
    plan = [{ weight: strengthKg * 0.4, reps: 8 }, { weight: strengthKg * 0.58, reps: 4 }];
    if (heavy) plan.unshift({ weight: strengthKg * 0.27, reps: 6 });
  }
  const out: WarmupSet[] = [];
  for (const p of plan) {
    const rounded = candidates[nearestIndex(candidates, p.weight)].externalKg;
    if (rounded >= firstWeightKg * 0.92) continue;
    if (out.length > 0 && rounded <= out[out.length - 1].weightKg) continue;
    out.push({ weightKg: rounded, reps: p.reps });
  }
  return out;
}

function lastIndexBelow(candidates: Candidate[], maxLoad: number, from: number): number {
  let i = from;
  for (let j = 0; j < candidates.length; j++) if (candidates[j].loadKg <= maxLoad + 1e-9) i = Math.max(i, j);
  return i;
}

// The heaviest candidate (up to maxIndex) at which at least `minReps` reps are
// still expected; the lightest when none is.
function heaviestWith(candidates: Candidate[], strengthKg: number, rir: number, minReps: number, maxIndex: number): number {
  for (let i = Math.min(maxIndex, candidates.length - 1); i >= 0; i--) {
    if (expectedReps(strengthKg, candidates[i].loadKg, rir) >= minReps) return i;
  }
  return 0;
}

export function prescribe(input: PrescribeInput): Prescription | undefined {
  const { exercise, settings } = input;
  const ctx: LoadContext = { exercise, bodyKg: input.bodyKg, maxToFailure: settings.estimateUpTo };
  const points = analyseSessions(input.sessions.filter((s) => s.date < input.date), ctx);
  const last = points.filter((p) => p.top).at(-1);
  const strengthKg = [...points].reverse().find((p) => p.smoothed !== undefined)?.smoothed;
  if (!last?.top || strengthKg === undefined) return undefined;
  const candidates = candidatesFor(exercise, settings.profile, { bodyKg: input.bodyKg, lastExternalKg: last.top.weightKg });
  if (!candidates) return undefined;

  const range = deriveRange(points);
  const { low, high, rir } = range;
  const legsTired = !!input.tired && !!exercise?.loadsLegs;
  const lastIdx = nearestIndex(candidates, last.top.weightKg);
  const lastLoad = last.top.loadKg;

  // KR-5: how far the weight may move in one training and in one week.
  const nextUp = candidates[lastIdx + 1];
  const nextDown = candidates[lastIdx - 1];
  let capLoad = lastLoad + Math.max(nextUp ? nextUp.loadKg - lastLoad : 0, MAX_RAISE_PER_TRAINING * lastLoad);
  const windowStart = points.find((p) => p.top && daysBetween(p.date, input.date) < 7 && daysBetween(p.date, input.date) > 0);
  const weekBase = windowStart?.top?.loadKg ?? lastLoad;
  capLoad = Math.min(capLoad, Math.max((1 + MAX_RAISE_PER_WEEK) * weekBase, nextUp ? nextUp.loadKg : 0));
  const maxIdx = lastIndexBelow(candidates, capLoad, lastIdx);
  const floorLoad = Math.min((1 - MAX_DROP_PER_TRAINING) * lastLoad, nextDown ? nextDown.loadKg : lastLoad);
  let minIdx = lastIdx;
  for (let j = lastIdx; j >= 0; j--) if (candidates[j].loadKg >= floorLoad - 1e-9) minIdx = j;

  // Two trainings in a row clearly under what was expected, without tired legs.
  const lastTwo = points.filter((p) => p.shortfall !== undefined).slice(-2);
  const twoUnder = lastTwo.length === 2 && lastTwo.every((p) => (p.shortfall ?? 0) >= UNDER_EXPECTATION_REPS && !p.legsTired);

  // KR-4: the weight for the first set.
  let idx: number;
  const lastExpected = expectedReps(strengthKg, candidates[lastIdx].loadKg, rir);
  if (legsTired) {
    idx = lastIdx;
  } else if (settings.progression === 'reps_first' && lastExpected >= low && lastExpected < high && last.top.reps < high) {
    idx = lastIdx;
  } else {
    idx = heaviestWith(candidates, strengthKg, rir, low, candidates.length - 1);
    // CHOICE OF THIS FILE: the smoothing lags behind a good day (half the way
    // up), so right after a better training the plain rule could ask for LESS
    // weight than you just did. If last time you reached the bottom of the range
    // with at least the reps in reserve asked, the weight does not go down.
    // A training on tired legs (a bad day that is explained) does not lower it either.
    const held = (last.top.rir !== undefined && last.top.rir >= rir && last.top.reps >= low) || last.legsTired;
    if (idx < lastIdx && held && !twoUnder) idx = lastIdx;
    // Double progression: with "eerst herhalingen" the top of the range, reached
    // with the reps in reserve asked, is the sign for one step heavier.
    if (settings.progression === 'reps_first' && held && last.top.reps >= high && idx <= lastIdx) idx = lastIdx + 1;
  }
  let cappedUp = false;
  let cappedDown = false;
  if (!legsTired) {
    if (idx > maxIdx) {
      idx = maxIdx;
      cappedUp = true;
    }
    if (idx < minIdx) {
      idx = minIdx;
      cappedDown = true;
    }
  }
  if (twoUnder && !legsTired) {
    let j = idx;
    while (j > minIdx && candidates[j].loadKg > (1 - UNDER_EXPECTATION_DROP) * lastLoad + 1e-9) j--;
    idx = Math.min(idx, j);
  }

  const first = candidates[idx];
  const expectedFirst = expectedReps(strengthKg, first.loadKg, rir);
  const shift = legsTired ? 1 : 0;
  const lo = Math.max(1, low - shift);
  let hi = Math.max(lo, high - shift);
  let widened = false;
  let shownRir = rir;
  if (!legsTired && !cappedUp && expectedFirst > hi) {
    if (settings.widenRange) {
      // The step is too coarse to stay inside the range: the range grows for this training.
      hi = expectedFirst;
      widened = true;
    } else {
      shownRir = rir + (expectedFirst - hi);
    }
  }
  const sameWeight = idx === lastIdx;
  const targetReps = Math.min(hi, Math.max(lo, sameWeight ? Math.min(last.top.reps + 1, expectedFirst) : expectedFirst));

  // The sets: each earlier working set costs the next a share of the strength.
  const setCount = Math.min(6, Math.max(1, last.workSets.length || 3));
  const sets: PlannedSet[] = [{ weightKg: first.externalKg, repsLow: lo, repsHigh: hi, rir: shownRir }];
  let prevIdx = idx;
  for (let n = 1; n < setCount; n++) {
    if (settings.workSets === 'equal') {
      sets.push({ ...sets[0] });
      continue;
    }
    const tiredStrength = strengthKg * (1 - FATIGUE_PER_SET) ** n;
    const j = heaviestWith(candidates, tiredStrength, rir, lo, prevIdx);
    const e = expectedReps(tiredStrength, candidates[j].loadKg, rir);
    const wide = settings.widenRange && !cappedUp && e > hi ? e : hi;
    sets.push({ weightKg: candidates[j].externalKg, repsLow: lo, repsHigh: wide, rir: shownRir });
    prevIdx = j;
  }

  const pauseDays = daysBetween(last.date, input.date);
  let kind: PrescriptionKind;
  let reason: string;
  if (legsTired) {
    kind = 'tired';
    reason = `Je benen zijn nog moe van ${input.tired!.because}, dus het gewicht blijft gelijk en één herhaling minder is normaal.`;
  } else if (twoUnder) {
    kind = 'two_under';
    reason = 'Twee keer achter elkaar haalde je minder dan verwacht, dus nu 5% lichter om weer op dreef te komen.';
  } else if (widened) {
    kind = 'widened';
    const step = stepAt(candidates, idx);
    reason = `Een stap van ${nl(step)} kg is hier te grof voor ${low} tot ${high} herhalingen, daarom is het bereik nu tijdelijk verbreed.`;
  } else if (cappedUp) {
    kind = 'capped';
    reason = 'Je geschatte kracht is gestegen, maar per training gaat het gewicht hooguit één stap of 5% omhoog.';
  } else if (cappedDown) {
    kind = 'capped';
    reason = 'Je geschatte kracht is gedaald, maar per training gaat het gewicht hooguit 10% omlaag.';
  } else if (pauseDays > BREAK_DAYS) {
    kind = 'pause';
    reason = 'Je deed dit een tijd niet, dus we beginnen op je laatste niveau en kijken na deze training opnieuw.';
  } else if (idx > lastIdx) {
    kind = 'up';
    reason = 'Je geschatte kracht is gestegen, dus een stap zwaarder.';
  } else if (idx < lastIdx) {
    kind = 'down';
    reason = 'Je geschatte kracht is wat lager dan eerder, dus iets lichter.';
  } else {
    kind = 'same';
    reason = settings.progression === 'reps_first' ? `Eerst herhalingen: zelfde gewicht, tot je ${high} haalt.` : 'Zelfde gewicht als vorige keer, probeer er één herhaling meer te halen.';
  }

  return {
    sets,
    warmups: warmupSets(settings, exercise, candidates, first.externalKg, strengthKg, input.patternSeen),
    kind,
    reason,
    widened,
    strengthKg,
    range,
    targetReps,
    stepKg: stepAt(candidates, idx),
    lastWeightKg: last.top.weightKg,
  };
}

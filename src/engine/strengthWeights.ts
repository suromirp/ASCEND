// ASCEND: which weights you can actually put on (KR-6, "afronden op wat je echt
// hebt"). Pure.
//
// The model counts in LOAD: what really moves. For a barbell that is the
// weight on the bar; for a pull-up it is the body weight times the share that
// moves, plus the extra weight (minus the help on a machine that assists). The
// gym profile says which weights exist; this file turns that into one sorted
// list of candidates, each with the weight as it is written down (`externalKg`)
// and the load it makes (`loadKg`). Everything after this works on that list.

import type { Exercise } from '../models/exercise';
import { dumbbellWeights } from './gymProfileEdit';
import { ownWeightsFor } from './machineWeights';
import type { DumbbellLog, DumbbellRack, GymProfile, StackWeights } from './strengthSettings';

export interface Candidate {
  // The weight as it is logged: on the bar, in the hand, on the stack, the help
  // on an assisted machine (stored with `assistSign`).
  externalKg: number;
  // What moves in total, in kg.
  loadKg: number;
}

export interface WeightContext {
  bodyKg?: number;
  // The weight you logged last time, to choose the bar and the sign of help.
  lastExternalKg?: number;
  // The weights really used on this exercise (work and warm-up sets). Only a
  // cable or a machine with a stack learns from them (`learnedStack`).
  usedKg?: number[];
  // How the used weights are turned into candidates on a cable or a stack:
  // 'used_only' offers exactly those (and nothing before they exist). Anything
  // else learns (`learnedStack`).
  stackWeights?: StackWeights;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

// --- the sums of plates -------------------------------------------------------------

const platesCache = new Map<string, number[]>();

// Every weight you can make with the plates on ONE side (as many of each as
// you like), up to maxKg, ascending, without 0. Counted in hundredths of a kg
// so 1,25 + 2,5 never drifts.
export function plateSums(platesKg: number[], maxKg = 150): number[] {
  const key = `${platesKg.join(',')}|${maxKg}`;
  const cached = platesCache.get(key);
  if (cached) return cached;
  const plates = platesKg.map((p) => Math.round(p * 100)).filter((p) => p > 0);
  const max = Math.round(maxKg * 100);
  const reach = new Uint8Array(max + 1);
  reach[0] = 1;
  for (let t = 1; t <= max; t++) {
    for (const p of plates) {
      if (t >= p && reach[t - p]) {
        reach[t] = 1;
        break;
      }
    }
  }
  const sums: number[] = [];
  for (let t = 1; t <= max; t++) if (reach[t]) sums.push(t / 100);
  platesCache.set(key, sums);
  return sums;
}

// --- the external weights of an exercise -----------------------------------------------

function multiples(step: number, from: number, to: number): number[] {
  const out: number[] = [];
  for (let k = Math.ceil(from / step - 1e-9); k * step <= to + 1e-9; k++) out.push(r2(k * step));
  return out;
}

export function stepFor(exercise: Exercise | undefined, profile: GymProfile): number {
  return (exercise && profile.exerciseStepKg?.[exercise.id]) || profile.stackStepKg;
}

// The bar for this exercise: the heaviest one that is not heavier than what was
// lifted last time, else the heaviest. Never lighter than a bar you own.
export function barFor(profile: GymProfile, lastExternalKg?: number): number {
  const bars = [...profile.barsKg].sort((a, b) => b - a);
  if (lastExternalKg === undefined) return bars[0];
  return bars.find((b) => b <= lastExternalKg + 1e-9) ?? bars[bars.length - 1];
}

// A learned stack offers weights up to the same ceiling as the plain steps.
const LEARNED_CEILING_KG = 400;
const KG_PER_POUND = 0.45359237;

const r1 = (n: number) => Math.round(n * 10) / 10;
const hasOneDecimalAtMost = (n: number) => Math.abs(n * 10 - Math.round(n * 10)) < 1e-6;

// A weight that looks like pounds converted to kilos (90 lb is 40,82 kg): it is
// not on a kilo grid (a multiple of a quarter kilo is) and sits on a whole pound.
// Such a weight is a trace of another app, not a weight of the machine, so it is
// never learned: no own weight and no step.
export function looksLikePounds(kg: number): boolean {
  if (Math.abs(kg * 4 - Math.round(kg * 4)) < 1e-6) return false;
  const pounds = kg / KG_PER_POUND;
  return Math.abs(Math.round(pounds) * KG_PER_POUND - kg) <= 0.03 && Math.round(pounds) > 0;
}

// The weights of a stack as learned from what was used on it. Inside the used
// range exactly those weights, and a gap of more than twice the profile step
// filled with steps (a proposal of 70 between 40 and 80 is 70, not 80). Beyond
// the range steps up to the ceiling. The step is the smallest gap between used
// weights that occurs at least twice and is not under half the profile step;
// otherwise the profile step. Weights that look like converted pounds and weights
// with more than one decimal are left out. Undefined when nothing usable was used.
export function learnedStack(usedKg: number[], profileStepKg: number): number[] | undefined {
  const used = [...new Set(usedKg.filter((w) => Number.isFinite(w) && w > 0).map(r2))]
    .filter((w) => hasOneDecimalAtMost(w) && !looksLikePounds(w))
    .sort((a, b) => a - b);
  if (used.length === 0) return undefined;
  const gaps = new Map<number, number>();
  for (let i = 1; i < used.length; i++) {
    const gap = r2(used[i] - used[i - 1]);
    if (gap >= profileStepKg / 2 - 1e-9 && gap <= 2 * profileStepKg + 1e-9) gaps.set(gap, (gaps.get(gap) ?? 0) + 1);
  }
  const repeated = [...gaps].filter(([, n]) => n >= 2).map(([g]) => g);
  const step = repeated.length > 0 ? Math.min(...repeated) : profileStepKg;
  const inside: number[] = [];
  for (let i = 0; i < used.length; i++) {
    inside.push(used[i]);
    if (i + 1 < used.length && used[i + 1] - used[i] > 2 * profileStepKg + 1e-9) {
      for (let w = r1(used[i] + step); w < used[i + 1] - 1e-9; w = r1(w + step)) inside.push(w);
    }
  }
  const below: number[] = [];
  for (let k = 1; ; k++) {
    const w = r1(used[0] - k * step);
    if (w < step - 1e-9) break;
    below.unshift(w);
  }
  const above: number[] = [];
  for (let k = 1; ; k++) {
    const w = r1(used[used.length - 1] + k * step);
    if (w > LEARNED_CEILING_KG + 1e-9) break;
    above.push(w);
  }
  return [...below, ...inside, ...above];
}

// The weights you really used, cleaned the same way as for a learned stack
// (one decimal at most, no converted pounds), ascending. Undefined when none.
export function usedOnlyWeights(usedKg: number[] | undefined): number[] | undefined {
  const used = [...new Set((usedKg ?? []).filter((w) => Number.isFinite(w) && w > 0).map(r2))]
    .filter((w) => hasOneDecimalAtMost(w) && !looksLikePounds(w))
    .sort((a, b) => a - b);
  return used.length > 0 ? used : undefined;
}

// --- dumbbells as a total ----------------------------------------------------------------

// The rack of two dumbbells together: every weight doubled, so the weights are
// the sums of two equal dumbbells from the rack (steps of twice the step).
export function totalRack(d: DumbbellRack): DumbbellRack {
  return { startKg: r2(2 * d.startKg), stepKg: r2(2 * d.stepKg), upToKg: r2(2 * d.upToKg), thenStepKg: r2(2 * d.thenStepKg), maxKg: r2(2 * d.maxKg) };
}

// The gym profile as it counts for an exercise logged as the total of two
// dumbbells. The load for the estimate stays what was logged.
export function profileFor(profile: GymProfile, dumbbellTotal: boolean | undefined): GymProfile {
  return dumbbellTotal ? { ...profile, dumbbells: totalRack(profile.dumbbells) } : profile;
}

// Is this exercise logged as the total of two dumbbells? Never for an exercise
// with one dumbbell (`oneDumbbell`). "Vanzelf herkennen": only when the log holds
// a weight heavier than the heaviest dumbbell of the rack and not more than twice
// that, which one dumbbell cannot be. A weight the rack just lacks (12 or 16 kg on
// a rack in steps of 2,5) stays a weight per dumbbell: gyms have more dumbbells
// than a profile lists. For lighter exercises logged as a total the choice
// "Totaal van twee" is there.
export function dumbbellsAsTotal(exercise: Exercise | undefined, mode: DumbbellLog, profile: GymProfile, loggedKg: number[] | undefined): boolean {
  if (exercise?.resistance !== 'dumbbell' || exercise.oneDumbbell) return false;
  if (mode === 'each') return false;
  if (mode === 'total') return true;
  const max = profile.dumbbells.maxKg;
  return (loggedKg ?? []).some((w) => w > max + 0.1 && w <= 2 * max + 0.1);
}

// The weights a set list really used, for `usedKg`.
export function usedWeights(sets: { weightKg?: number }[]): number[] {
  return sets.map((s) => s.weightKg ?? 0).filter((w) => w > 0);
}

function externalWeights(exercise: Exercise | undefined, profile: GymProfile, ctx: WeightContext): number[] {
  const res = exercise?.resistance;
  // Weights you typed in for this machine in this gym go before everything else, in
  // every choice of "Gewichten van toestellen" (engine/machineWeights.ts).
  const own = ownWeightsFor(profile, exercise);
  if (own) return own;
  switch (res) {
    case 'barbell': {
      const bar = barFor(profile, ctx.lastExternalKg);
      return [bar, ...plateSums(profile.platesKg).map((s) => r2(bar + 2 * s))];
    }
    case 'machine_plates':
      return plateSums(profile.platesKg).map((s) => r2(2 * s));
    case 'dumbbell': {
      return dumbbellWeights(profile.dumbbells);
    }
    case 'pack_or_vest':
      return multiples(1, 0, 60);
    case 'bodyweight':
      // Extra weight on a belt or vest: in steps of the smallest plate pair.
      return [0, ...multiples(Math.min(...profile.platesKg) * 2, Math.min(...profile.platesKg) * 2, 100)];
    case 'assisted_bodyweight':
      return multiples(stepFor(exercise, profile), 0, 200);
    default:
      // A cable or a stack that was used before: the weights it really has.
      if ((res === 'cable' || res === 'machine_stack') && ctx.stackWeights === 'used_only') {
        const only = usedOnlyWeights(ctx.usedKg);
        if (only) return only;
      } else if ((res === 'cable' || res === 'machine_stack') && ctx.stackWeights !== 'profile' && ctx.usedKg && ctx.usedKg.length > 0) {
        const learned = learnedStack(ctx.usedKg, stepFor(exercise, profile));
        if (learned) return learned;
      }
      // Cable, machine with a stack, and an exercise the list does not know.
      return multiples(stepFor(exercise, profile), stepFor(exercise, profile), 400);
  }
}

// The load of a weight that is written down. Undefined when the load cannot be
// known (a share of the body weight without a body weight) or is not positive.
export function loadFromExternal(exercise: Exercise | undefined, externalKg: number, bodyKg: number | undefined): number | undefined {
  const f = exercise?.bodyweightFraction;
  let load: number;
  if (f === undefined) {
    if (exercise?.resistance === 'bodyweight' || exercise?.resistance === 'assisted_bodyweight') return undefined;
    load = externalKg;
  } else {
    if (bodyKg === undefined) return undefined;
    load = exercise?.resistance === 'assisted_bodyweight' ? f * bodyKg - Math.abs(externalKg) : f * bodyKg + externalKg;
  }
  return load > 0 ? load : undefined;
}

// The weight to write down for a load. The reverse of loadFromExternal.
export function externalFromLoad(exercise: Exercise | undefined, loadKg: number, bodyKg: number | undefined, assistSign = -1): number | undefined {
  const f = exercise?.bodyweightFraction;
  if (f === undefined) return loadKg;
  if (bodyKg === undefined) return undefined;
  if (exercise?.resistance === 'assisted_bodyweight') return assistSign * Math.max(0, f * bodyKg - loadKg);
  return loadKg - f * bodyKg;
}

// All the weights that can be put on, ascending by load. Undefined when the
// loads cannot be known.
export function candidatesFor(exercise: Exercise | undefined, profile: GymProfile, ctx: WeightContext): Candidate[] | undefined {
  const assistSign = ctx.lastExternalKg !== undefined && ctx.lastExternalKg > 0 ? 1 : -1;
  const list: Candidate[] = [];
  for (const w of externalWeights(exercise, profile, ctx)) {
    const external = exercise?.resistance === 'assisted_bodyweight' ? assistSign * w : w;
    const load = loadFromExternal(exercise, external, ctx.bodyKg);
    if (load !== undefined) list.push({ externalKg: external, loadKg: load });
  }
  list.sort((a, b) => a.loadKg - b.loadKg);
  return list.length > 0 ? list : undefined;
}

// The candidate closest to a weight that was logged.
export function nearestIndex(candidates: Candidate[], externalKg: number): number {
  let best = 0;
  for (let i = 1; i < candidates.length; i++) {
    if (Math.abs(candidates[i].externalKg - externalKg) < Math.abs(candidates[best].externalKg - externalKg)) best = i;
  }
  return best;
}

// The gap to the neighbours of a candidate: what "one step" means there.
export function stepAt(candidates: Candidate[], index: number): number {
  const up = candidates[index + 1] ? Math.abs(candidates[index + 1].externalKg - candidates[index].externalKg) : 0;
  const down = candidates[index - 1] ? Math.abs(candidates[index].externalKg - candidates[index - 1].externalKg) : 0;
  return Math.max(up, down);
}

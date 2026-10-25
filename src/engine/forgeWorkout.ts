// ASCEND: the workout screen of Forge, the rules behind it. Pure; no React, no
// storage. The screen (components/forge/ForgeWorkout.tsx) calls these functions
// and renders the result.
//
// The layout follows the way the owner trains in MacroFactor Workouts: per
// exercise a table that is always open, warm-up rows (W) and working sets,
// the prescription per set, kg and reps already filled in, a box to tick and a
// bubble with the reps in reserve. Decision:
// docs/beslissingen/2026-10-22-forge-workoutscherm.md.
//
// What this file decides:
// - the rows of an exercise: from the Forge prescription (engine/strengthModel.ts)
//   when there is history, else from the template ("4 x 6-8");
// - when the rest timer starts (after a working set and after the LAST warm-up
//   set, not after the other warm-up sets) and for how long;
// - which plates go on each side of the bar, and what changes from the set before;
// - which exercises can stand in for another one (same muscles, same gym);
// - what is stored: only ticked rows, as SetLog with kind, kg, reps and RIR.

import { EXERCISES, exerciseById } from '../data/exercises';
import type { Exercise, MovementPattern } from '../models/exercise';
import type { Program } from '../models/program';
import type { ExercisePrescription, ExerciseSetLog, SessionLog, SessionTemplate, SetKind, SetLog, SetTarget } from '../models/training';
import { formatNumberNL } from '../utils/number';
import { fatigueEvents, fatigueWord, legFatigueOn } from './legFatigue';
import { cleanExerciseName } from './exerciseMatch';
import { exerciseHistories, exerciseKey, legsTiredAt, type ExerciseHistory, type LegsTired } from './strengthHistory';
import { DEFAULT_RIR, dumbbellTotalFor, expectedReps, FATIGUE_PER_SET, formatWeight, lastDateBefore, prescribe, usedBefore, warmupSets, warmupShapes, type Prescription, type WarmupSet } from './strengthModel';
import { COMPOUND_PATTERNS, isCompound, newWarmState, noteWorked, warmupKind, type WarmKind, type WarmState } from './warmup';
import { setsText } from './macrofactorProgram';
import type { GymProfile, ResolvedStrengthSettings } from './strengthSettings';
import { barFor, candidatesFor, loadFromExternal, profileFor } from './strengthWeights';
import { isWorkSet } from './workSets';

// --- the shapes ---------------------------------------------------------------------------

export interface RowTarget {
  weightKg?: number;
  repsLow: number;
  repsHigh: number;
  rir?: number;
  // A hold or a plank: seconds instead of reps.
  timedSec?: number;
  // A set to failure from repsLow ("9+").
  failure?: boolean;
}

export interface WorkoutRow {
  id: string;
  kind: SetKind;
  target: RowTarget;
  // What you fill in. Prefilled from the target, so ticking is enough.
  weightKg?: number;
  reps?: number;
  rir?: number;
  // The RIR is the aim of the plan, not what you felt: you ticked the set without
  // touching the field (or the setting "Met het doel" filled it in). Stored on the
  // SetLog as rirAssumed. Typing or choosing a RIR yourself clears it.
  rirAssumed?: boolean;
  done: boolean;
  // You changed kg or reps yourself, or took the prescription: a weight you
  // change on an earlier set no longer carries over to this one. Lives in the
  // draft only; it is never part of the log.
  edited?: boolean;
  // A warm-up row: its weight as a share of the first working weight. While you
  // do not touch the row, it follows that weight (and an empty row fills in as
  // soon as set 1 gets a weight). Lives in the draft only.
  share?: number;
}

export interface WorkoutExercise {
  // The slot in the template (its exercise id): stable through a swap.
  slot: string;
  // The id in our own list, or the slot when the list does not know the name.
  exerciseId: string;
  name: string;
  known: boolean;
  rows: WorkoutRow[];
  // The weights really used on this exercise before today (cables and stacks), so
  // a proposal in the training rounds to weights the machine has (engine/forgeAdjust.ts).
  usedKg?: number[];
  // The Forge sentence why ("Zelfde gewicht als vorige keer...").
  reason?: string;
  // The sets of the last time, warm-up and work, in order.
  previous?: SetLog[];
  restSec: number;
  // The name of the exercise this one replaced, for this training only.
  swappedFrom?: string;
  timed: boolean;
  // Dumbbells are logged as the total of two (the weights are sums of two from the rack).
  dumbbellTotal?: boolean;
}

// --- rep ranges ------------------------------------------------------------------------------

// "6-8" -> 6 to 8, "10 per been" -> 10, "8-10 per been" -> 8 to 10, "45s" -> 45 seconds.
export function parseReps(text: string): RowTarget | undefined {
  const t = text.toLowerCase();
  const timed = t.match(/(\d+)\s*(s|sec|seconden|seconds)\b/);
  if (timed) {
    const n = Number(timed[1]);
    return { repsLow: n, repsHigh: n, timedSec: n };
  }
  const range = t.match(/(\d+)\s*(?:-|\u2013|tot|to)\s*(\d+)/);
  if (range) {
    const a = Number(range[1]);
    const b = Number(range[2]);
    return { repsLow: Math.min(a, b), repsHigh: Math.max(a, b) };
  }
  const one = t.match(/(\d+)/);
  return one ? { repsLow: Number(one[1]), repsHigh: Number(one[1]) } : undefined;
}

const midReps = (t: RowTarget) => Math.round((t.repsLow + t.repsHigh) / 2);

// --- rest ------------------------------------------------------------------------------------

const COMPOUND = COMPOUND_PATTERNS;
const SMALL: Set<MovementPattern> = new Set(['calf', 'shin', 'core', 'hip']);

// The rest after a set, in seconds. Heavier and compound longer: a barbell
// squat, deadlift, press or row 3 minutes; another compound exercise 2 minutes,
// 2,5 with low reps; an isolation exercise 1,5 minutes; calves, shins, hips and
// core 1 minute. Starting values (the research report, chapter 3: longer rest
// keeps more reps on compound lifts); your own value per exercise wins.
export const REST_BARBELL_COMPOUND = 180;
export const REST_COMPOUND = 120;
export const REST_COMPOUND_LOW_REPS = 150;
export const REST_ISOLATION = 90;
export const REST_SMALL = 60;

export function estimatedRest(exercise: Exercise | undefined, repsHigh?: number): number {
  if (!exercise) return repsHigh !== undefined && repsHigh <= 8 ? REST_COMPOUND : REST_ISOLATION;
  if (SMALL.has(exercise.pattern)) return REST_SMALL;
  if (!COMPOUND.has(exercise.pattern)) return REST_ISOLATION;
  if (exercise.resistance === 'barbell') return REST_BARBELL_COMPOUND;
  return repsHigh !== undefined && repsHigh <= 6 ? REST_COMPOUND_LOW_REPS : REST_COMPOUND;
}

// After the last warm-up set the rest is short, not the full rest of a working
// set: 60 seconds after a single ramp or feel set, 90 after a build-up (the
// research: 60 to 90 seconds after the set at 80%).
export const REST_AFTER_WARMUP = 90;
export const REST_AFTER_RAMP = 60;

export function restFor(exerciseId: string, exercise: Exercise | undefined, repsHigh: number | undefined, own: Record<string, number>): number {
  return own[exerciseId] ?? estimatedRest(exercise, repsHigh);
}

// "2:30", "1:00", "45 s".
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// --- planning the rows -------------------------------------------------------------------------

export interface PlanContext {
  logs: SessionLog[];
  templates: SessionTemplate[];
  program?: Program | null;
  bodyKg?: number;
  settings: ResolvedStrengthSettings;
  // The day of the training.
  date: string;
  // Forge counts along (the setting "Kracht meerekenen"). Off: the template only.
  modelOn: boolean;
}

export interface PlanState {
  histories: Map<string, ExerciseHistory>;
  tiredNow?: LegsTired;
  // What is warm in this training so far (engine/warmup.ts).
  warm: WarmState;
}

export function planState(ctx: PlanContext): PlanState {
  const strengthLogs = ctx.logs.filter((l) => l.strengthData && l.strengthData.length > 0);
  const deps = { logs: ctx.logs, templates: ctx.templates, program: ctx.program, bodyKg: ctx.bodyKg };
  const histories = new Map(exerciseHistories(strengthLogs, ctx.templates, deps).map((h) => [h.key, h]));
  return { histories, tiredNow: legsTiredAt(ctx.date, undefined, deps), warm: newWarmState() };
}

// The state for one exercise that is swapped: what is warm is what the exercises
// before its place in the training have worked.
export function planStateBefore(ctx: PlanContext, workout: WorkoutExercise[], slot: string): PlanState {
  const state = planState(ctx);
  for (const ex of workout) {
    if (ex.slot === slot) break;
    if (!ex.timed) noteWorked(state.warm, exerciseOf(ex), ex.rows.some((r) => r.kind === 'warmup'));
  }
  return state;
}

function lastSession(history: ExerciseHistory | undefined, date: string) {
  return history?.sessions.filter((s) => s.date < date).sort((a, b) => a.date.localeCompare(b.date)).at(-1);
}

// One exercise of the training. `swapTo` puts another exercise in the slot.
export function planExercise(slot: ExercisePrescription, ctx: PlanContext, state: PlanState, swapTo?: Exercise): WorkoutExercise {
  const found = swapTo ? { key: swapTo.id, exercise: swapTo } : exerciseKey(slot.id, slot.exerciseName);
  const exercise = found.exercise;
  const exerciseId = exercise?.id ?? slot.id;
  const name = exercise?.name ?? cleanExerciseName(slot.exerciseName);
  const parsed = parseReps(slot.reps);
  const base = parsed ?? { repsLow: 8, repsHigh: 10 };
  // A program from MacroFactor gives every set its own range and RIR.
  const targets = slot.setTargets && slot.setTargets.length > 0 ? slot.setTargets.slice(0, 10) : undefined;
  const setCount = targets ? targets.length : Math.max(1, Math.min(10, slot.sets || 1));
  const history = state.histories.get(found.key);
  const last = lastSession(history, ctx.date);
  const baseRir = slot.rpe !== undefined ? Math.max(0, Math.min(5, 10 - slot.rpe)) : DEFAULT_RIR;

  if (base.timedSec !== undefined) {
    const rows: WorkoutRow[] = Array.from({ length: setCount }, (_, i) => ({ id: `${slot.id}:s${i}`, kind: 'work', target: base, done: false }));
    return { slot: slot.id, exerciseId, name, known: !!exercise, rows, restSec: restFor(exerciseId, exercise, undefined, ctx.settings.restSeconds), timed: true, ...(swapTo ? { swappedFrom: cleanExerciseName(slot.exerciseName) } : {}) };
  }

  // What warm-up this exercise needs, from what the exercises before it warmed.
  // "Per oefening" (setting): every compound exercise gets the full build-up.
  const warmKind: WarmKind = ctx.settings.warmupScope === 'exercise' && exercise && isCompound(exercise) ? 'full' : warmupKind(exercise, state.warm);
  const tired = !!(exercise?.loadsLegs && state.tiredNow);
  // The plan (template or program) gives the range and the reps in reserve; the
  // history is only the fallback (decision 2026-10-23-bereik-uit-het-plan.md).
  const firstTarget = targets?.find((t) => !t.failure);
  const fromSlot = targets ? (firstTarget ? { low: firstTarget.repsLow, high: firstTarget.repsHigh, rir: firstTarget.rir } : undefined) : parsed ? { low: parsed.repsLow, high: parsed.repsHigh, ...(slot.rpe !== undefined ? { rir: baseRir } : {}) } : undefined;
  // A swapped exercise is another exercise: the range of the template is not its
  // own (squat 5 to 8 is not leg extension 5 to 8). The reps in reserve stay.
  const plan = swapTo ? (fromSlot?.rir !== undefined ? { rir: fromSlot.rir } : undefined) : fromSlot;
  const learned = usedBefore({ sessions: history?.sessions ?? [], date: ctx.date, settings: ctx.settings });
  let rx: Prescription | undefined;
  if (ctx.modelOn && history && history.sessions.length > 0) {
    const lastStrengthDate = lastDateBefore([...state.histories.values()].flatMap((h) => h.sessions.map((s) => s.date)), ctx.date);
    rx = prescribe({
      exercise,
      sessions: history.sessions,
      date: ctx.date,
      ...(lastStrengthDate ? { lastStrengthDate } : {}),
      bodyKg: ctx.bodyKg,
      settings: ctx.settings,
      ...(tired && state.tiredNow ? { tired: state.tiredNow } : {}),
      warm: warmKind,
      ...(plan ? { plan } : {}),
      nearestOnMismatch: true,
    });
  }

  // Dumbbells logged as the total of two: the weights are sums of two from the rack.
  const dumbbellTotal = rx?.dumbbellTotal ?? dumbbellTotalFor({ exercise, sessions: history?.sessions ?? [], date: ctx.date, settings: ctx.settings });
  const lastTop = last?.sets.filter(isWorkSet).filter((s) => s.reps > 0).sort((a, b) => (b.weightKg ?? 0) - (a.weightKg ?? 0))[0];
  const fromProgram = rx && targets ? programWeights(rx, targets, exercise, ctx, lastTop?.weightKg, tired, warmKind, learned, dumbbellTotal) : undefined;
  const workWeights: (number | undefined)[] = [];
  for (let i = 0; i < setCount; i++) {
    const t = targets?.[i];
    workWeights.push(t ? (fromProgram?.weights[i] ?? (rx ? rx.sets[Math.min(i, rx.sets.length - 1)].weightKg : (slot.targetWeightKg ?? lastTop?.weightKg))) : rx ? rx.sets[Math.min(i, rx.sets.length - 1)].weightKg : (slot.targetWeightKg ?? lastTop?.weightKg));
  }
  // Warm-up: from the prescription; with no prescription (no history, or none
  // with reps in reserve) from the working weight there is, else empty rows that
  // fill in when set 1 gets a weight.
  let warmups: WarmupSet[] = fromProgram?.warmups ?? rx?.warmups ?? [];
  let emptyWarmups: { share: number; reps: number }[] = [];
  if (!rx && ctx.modelOn && exercise) {
    const w0 = workWeights[0];
    if (w0 !== undefined) {
      const candidates = candidatesFor(exercise, profileFor(ctx.settings.profile, dumbbellTotal), { bodyKg: ctx.bodyKg, lastExternalKg: w0, usedKg: learned, stackWeights: ctx.settings.stackWeights });
      if (candidates) warmups = warmupSets(ctx.settings, exercise, candidates, w0, undefined, warmKind, ctx.bodyKg, dumbbellTotal);
    } else {
      emptyWarmups = warmupShapes(ctx.settings, exercise, warmKind);
    }
  }
  const rows: WorkoutRow[] = [];
  const firstWeight = workWeights[0];
  for (const [i, w] of warmups.entries()) {
    const target: RowTarget = { weightKg: w.weightKg, repsLow: w.reps, repsHigh: w.reps };
    rows.push({ id: `${slot.id}:w${i}`, kind: 'warmup', target, weightKg: w.weightKg, reps: w.reps, done: false, ...(firstWeight ? { share: w.weightKg / firstWeight } : {}) });
  }
  for (const [i, w] of emptyWarmups.entries()) {
    rows.push({ id: `${slot.id}:w${i}`, kind: 'warmup', target: { repsLow: w.reps, repsHigh: w.reps }, reps: w.reps, done: false, share: w.share });
  }
  // The body part counts as warm only after an exercise that got warm-up sets.
  noteWorked(state.warm, exercise, rows.length > 0 && rows.some((r) => r.kind === 'warmup'));
  for (let i = 0; i < setCount; i++) {
    let target: RowTarget;
    const t = targets?.[i];
    const weightKg = workWeights[i];
    if (t) {
      target = { ...(weightKg !== undefined ? { weightKg } : {}), repsLow: t.repsLow, repsHigh: t.repsHigh, rir: t.rir, ...(t.failure ? { failure: true } : {}) };
    } else if (rx) {
      const s = rx.sets[Math.min(i, rx.sets.length - 1)];
      target = { weightKg: s.weightKg, repsLow: s.repsLow, repsHigh: s.repsHigh, rir: s.rir };
    } else {
      target = { weightKg, repsLow: base.repsLow, repsHigh: base.repsHigh, rir: baseRir };
    }
    let reps = target.failure ? target.repsLow : i === 0 && rx && !targets ? rx.targetReps : midReps(target);
    // With a program the row starts at what the model expects at this weight, never
    // above it (and not outside the range): ticking is then honest.
    if (t && rx && !t.failure && target.weightKg !== undefined) {
      const load = loadFromExternal(exercise, target.weightKg, ctx.bodyKg);
      if (load !== undefined) {
        const strength = ctx.settings.workSets === 'equal' ? rx.strengthKg : rx.strengthKg * (1 - FATIGUE_PER_SET) ** i;
        reps = Math.min(reps, Math.max(t.repsLow, expectedReps(strength, load, t.rir)));
      }
    }
    rows.push({ id: `${slot.id}:s${i}`, kind: 'work', target, ...(target.weightKg !== undefined ? { weightKg: target.weightKg } : {}), reps, ...(target.rir !== undefined && ctx.settings.rirPrefill === 'target' ? { rir: target.rir, rirAssumed: true } : {}), done: false });
  }
  const repsHigh = rows.find((r) => r.kind === 'work')?.target.repsHigh;
  const programRest = targets?.find((x) => x.restSec !== undefined)?.restSec;
  const why = rx ? (fromProgram?.differs ? `Je programma vraagt nu ${setsText(targets!)}; het gewicht volgt uit je geschatte kracht.` : rx.reason) : undefined;
  const reason = why && rx?.notice ? `${rx.notice} ${why}` : why;
  return {
    slot: slot.id,
    exerciseId,
    name,
    known: !!exercise,
    rows,
    ...(learned && learned.length > 0 ? { usedKg: [...new Set(learned)] } : {}),
    ...(reason ? { reason } : {}),
    ...(last ? { previous: last.sets } : {}),
    restSec: ctx.settings.restSeconds[exerciseId] ?? programRest ?? restFor(exerciseId, exercise, repsHigh, ctx.settings.restSeconds),
    timed: false,
    ...(dumbbellTotal ? { dumbbellTotal } : {}),
    ...(swapTo ? { swappedFrom: cleanExerciseName(slot.exerciseName) } : {}),
  };
}

// The weight per set when a program asks for its own range and RIR per set:
// the heaviest weight at which the estimated strength (tired a little per
// earlier set, unless the sets are equal) still gives the bottom of the
// range with the asked reps left. A set whose range and RIR are Forge's own
// keeps Forge's weight, with its limits per training (KR-5).
function programWeights(rx: Prescription, targets: SetTarget[], exercise: Exercise | undefined, ctx: PlanContext, lastWeightKg: number | undefined, tired: boolean, warm: WarmKind, usedKg?: number[], dumbbellTotal?: boolean): { weights: number[]; warmups: WarmupSet[]; differs: boolean } | undefined {
  const candidates = candidatesFor(exercise, profileFor(ctx.settings.profile, dumbbellTotal), { bodyKg: ctx.bodyKg, lastExternalKg: lastWeightKg, usedKg, stackWeights: ctx.settings.stackWeights });
  if (!candidates) return undefined;
  let differs = false;
  const weights = targets.map((t, i) => {
    if (t.repsLow === rx.range.low && t.repsHigh === rx.range.high && t.rir === rx.range.rir && !t.failure) return rx.sets[Math.min(i, rx.sets.length - 1)].weightKg;
    differs = true;
    const strength = ctx.settings.workSets === 'equal' ? rx.strengthKg : rx.strengthKg * (1 - FATIGUE_PER_SET) ** i;
    const need = Math.max(1, t.repsLow - (tired ? 1 : 0));
    let idx = 0;
    for (let j = candidates.length - 1; j >= 0; j--) {
      if (expectedReps(strength, candidates[j].loadKg, t.rir) >= need) {
        idx = j;
        break;
      }
    }
    return candidates[idx].externalKg;
  });
  const warmups = differs ? warmupSets(ctx.settings, exercise, candidates, weights[0], rx.strengthKg, warm, ctx.bodyKg, dumbbellTotal) : rx.warmups;
  return { weights, warmups, differs };
}

export function planWorkout(slots: ExercisePrescription[], ctx: PlanContext): WorkoutExercise[] {
  const state = planState(ctx);
  return slots.map((slot) => planExercise(slot, ctx, state));
}

// --- what you do on the screen -------------------------------------------------------------------

export const exerciseOf = (ex: Pick<WorkoutExercise, 'exerciseId' | 'known'>): Exercise | undefined => (ex.known ? exerciseById(ex.exerciseId) : undefined);

// The most a row can hold: a typo like 2000 kg becomes 500.
export const MAX_ROW_KG = 500;
export const MAX_ROW_REPS = 100;

export function updateRow(ex: WorkoutExercise, rowId: string, patch: Partial<Pick<WorkoutRow, 'weightKg' | 'reps' | 'rir'>>): WorkoutExercise {
  const clean = { ...patch };
  // Negative is the help of an assisted machine; the screen keeps other exercises at 0 or more.
  if (clean.weightKg !== undefined) clean.weightKg = Math.min(MAX_ROW_KG, Math.max(-MAX_ROW_KG, clean.weightKg));
  if (clean.reps !== undefined) clean.reps = Math.min(MAX_ROW_REPS, Math.max(0, Math.round(clean.reps)));
  // A RIR you give yourself is measured; one you clear is empty again.
  const mine = 'rir' in clean;
  return { ...ex, rows: ex.rows.map((r) => (r.id === rowId ? { ...r, ...clean, ...(mine ? { rirAssumed: false } : {}) } : r)) };
}

export interface TickResult {
  workout: WorkoutExercise[];
  // Start the rest timer for this many seconds.
  restSec?: number;
}

// Tick or untick a row. Ticking fills what is still empty from the target. The
// rest timer starts after a working set and after the last warm-up set of an
// exercise, not after the other warm-up sets, and not after the very last set
// of the training.
// A ticked row with what is still empty filled in from its target.
// A working set ticked with no weight takes the weight of the set before it
// (`carryKg`): a set of 7 reps with no weight would count for nothing.
function fillTicked(row: WorkoutRow, carryKg?: number): WorkoutRow {
  return {
    ...row,
    done: true,
    ...(row.weightKg === undefined && row.target.weightKg !== undefined ? { weightKg: row.target.weightKg } : row.weightKg === undefined && row.kind === 'work' && carryKg !== undefined ? { weightKg: carryKg } : {}),
    ...(row.reps === undefined ? { reps: row.target.timedSec ?? midReps(row.target) } : {}),
    // A RIR left empty is filled with the aim and marked as not measured.
    ...(row.rir === undefined && row.kind === 'work' && row.target.rir !== undefined ? { rir: row.target.rir, rirAssumed: true } : {}),
  };
}

// The box above the column: every set of the exercise ticked at once, or all
// unticked again when every set already was. Rest follows as after one set.
export function tickAllRows(workout: WorkoutExercise[], slot: string): TickResult {
  const ex = workout.find((e) => e.slot === slot);
  if (!ex || ex.rows.length === 0) return { workout };
  const untick = ex.rows.every((r) => r.done);
  let carry: number | undefined;
  const next = workout.map((e) =>
    e.slot === slot
      ? {
          ...e,
          rows: e.rows.map((r) => {
            const out = untick ? { ...r, done: false } : r.done ? r : fillTicked(r, carry);
            if (r.kind === 'work' && out.weightKg !== undefined) carry = out.weightKg;
            return out;
          }),
        }
      : e,
  );
  if (untick) return { workout: next };
  const allDone = next.every((e) => e.rows.every((r) => r.done));
  return allDone ? { workout: next } : { workout: next, restSec: ex.restSec };
}

export function tickRow(workout: WorkoutExercise[], slot: string, rowId: string): TickResult {
  const ex = workout.find((e) => e.slot === slot);
  const row = ex?.rows.find((r) => r.id === rowId);
  if (!ex || !row) return { workout };
  const done = !row.done;
  const index = ex.rows.indexOf(row);
  const before = ex.rows.slice(0, index).reverse().find((r) => r.kind === 'work' && r.weightKg !== undefined)?.weightKg;
  const filled: WorkoutRow = done ? fillTicked(row, before) : { ...row, done };
  const next = workout.map((e) => (e.slot === slot ? { ...e, rows: e.rows.map((r) => (r.id === rowId ? filled : r)) } : e));
  if (!done) return { workout: next };
  const lastWarmup = row.kind === 'warmup' && !ex.rows.slice(index + 1).some((r) => r.kind === 'warmup');
  const allDone = next.every((e) => e.rows.every((r) => r.done));
  const rest = (row.kind === 'work' || lastWarmup) && !allDone;
  if (!rest) return { workout: next };
  if (row.kind === 'work') return { workout: next, restSec: ex.restSec };
  const single = ex.rows.filter((r) => r.kind === 'warmup').length === 1;
  return { workout: next, restSec: Math.min(ex.restSec, single ? REST_AFTER_RAMP : REST_AFTER_WARMUP) };
}

// One more working set (a copy of the last one, not ticked) or warm-up set (in
// front of the working sets).
export function addRow(ex: WorkoutExercise, kind: SetKind): WorkoutExercise {
  const n = ex.rows.length;
  const id = `${ex.slot}:a${Date.now().toString(36)}${n}`;
  if (kind === 'work') {
    const lastWork = [...ex.rows].reverse().find((r) => r.kind === 'work');
    const target = lastWork?.target ?? { repsLow: 8, repsHigh: 10, rir: DEFAULT_RIR };
    const row: WorkoutRow = { id, kind, target, ...(lastWork?.weightKg !== undefined ? { weightKg: lastWork.weightKg } : {}), reps: lastWork?.reps ?? midReps(target), done: false };
    return { ...ex, rows: [...ex.rows, row] };
  }
  const firstWork = ex.rows.find((r) => r.kind === 'work');
  const weight = firstWork?.weightKg !== undefined ? Math.round(firstWork.weightKg * 0.5 / 2.5) * 2.5 : undefined;
  const row: WorkoutRow = { id, kind, target: { ...(weight !== undefined ? { weightKg: weight } : {}), repsLow: 8, repsHigh: 8 }, ...(weight !== undefined ? { weightKg: weight } : {}), reps: 8, done: false };
  const at = ex.rows.findIndex((r) => r.kind === 'work');
  const rows = at < 0 ? [...ex.rows, row] : [...ex.rows.slice(0, at), row, ...ex.rows.slice(at)];
  return { ...ex, rows };
}

// The last row that is not ticked yet goes; a ticked row stays (you did it).
export function removeLastRow(ex: WorkoutExercise): WorkoutExercise {
  const index = ex.rows.map((r) => !r.done).lastIndexOf(true);
  if (index < 0 || ex.rows.length <= 1) return ex;
  return { ...ex, rows: ex.rows.filter((_, i) => i !== index) };
}

export function progress(workout: WorkoutExercise[]): { done: number; total: number } {
  const work = workout.flatMap((e) => e.rows.filter((r) => r.kind === 'work'));
  return { done: work.filter((r) => r.done).length, total: work.length };
}

// --- storing ---------------------------------------------------------------------------------

// Only ticked rows with reps go into the log; a hold is not a set with reps.
export function toStrengthData(workout: WorkoutExercise[]): ExerciseSetLog[] | undefined {
  const out: ExerciseSetLog[] = [];
  for (const ex of workout) {
    if (ex.timed) continue;
    const sets: SetLog[] = ex.rows
      .filter((r) => r.done && (r.reps ?? 0) > 0)
      .map((r) => ({
        reps: r.reps!,
        ...(r.weightKg !== undefined ? { weightKg: r.weightKg } : {}),
        ...(r.kind === 'work' && r.rir !== undefined ? { rir: r.rir } : {}),
        kind: r.kind,
        ...(r.kind === 'work' && r.rir !== undefined && r.rirAssumed ? { rirAssumed: true } : {}),
      }));
    if (sets.length > 0) out.push({ exerciseId: ex.exerciseId, exerciseName: ex.name, sets });
  }
  return out.length > 0 ? out : undefined;
}

// The reps in reserve of the hardest working set on the legs, for the leg index.
export function hardestLegRir(workout: WorkoutExercise[]): number | undefined {
  const rirs = workout
    .filter((ex) => exerciseOf(ex)?.loadsLegs)
    .flatMap((ex) => ex.rows.filter((r) => r.done && r.kind === 'work' && r.rir !== undefined).map((r) => r.rir!));
  return rirs.length > 0 ? Math.min(4, Math.min(...rirs)) : undefined;
}

// --- words for the table ------------------------------------------------------------------------

const kgText = (n: number) => formatNumberNL(n, 2);

// "11-13", "8", or "9+" for a set to failure.
export function repsText(t: RowTarget): string {
  return t.failure ? `${t.repsLow}+` : t.repsLow === t.repsHigh ? `${t.repsLow}` : `${t.repsLow}-${t.repsHigh}`;
}

// "47,5 kg x 11-13" in the prescription column. A hold: "45 sec".
// With help on an assisted machine: "hulp 30 kg × 9-11", not "-30 kg".
export function targetText(row: WorkoutRow, exercise?: Exercise): string {
  const t = row.target;
  if (t.timedSec !== undefined) return `${t.timedSec} sec`;
  const reps = repsText(t);
  return t.weightKg !== undefined ? `${weightText(t.weightKg, exercise)} × ${reps}` : `${reps} herh.`;
}

const weightText = (kg: number, exercise?: Exercise): string => (exercise?.resistance === 'assisted_bodyweight' ? formatWeight(exercise, kg) : `${kgText(kg)} kg`);

// The set of last time at the same place: the n-th warm-up for a warm-up row,
// the n-th working set for a working row.
export function previousFor(ex: WorkoutExercise, row: WorkoutRow): SetLog | undefined {
  if (!ex.previous) return undefined;
  const sameKind = ex.rows.filter((r) => r.kind === row.kind);
  const n = sameKind.indexOf(row);
  const prev = ex.previous.filter((s) => (row.kind === 'warmup' ? !isWorkSet(s) : isWorkSet(s)));
  return prev[n];
}

export function previousText(set: SetLog | undefined, exercise?: Exercise): string | undefined {
  if (!set) return undefined;
  return set.weightKg !== undefined ? `${weightText(set.weightKg, exercise)} × ${set.reps}` : `${set.reps} herh.`;
}

// --- plates ----------------------------------------------------------------------------------

export interface PlateLoad {
  barKg: number;
  // Per side, from the inside out (heaviest first).
  perSide: number[];
  // What could not be made with the plates, per side (0 when it fits).
  shortKg: number;
}

export interface PlateStep extends PlateLoad {
  // Per side, compared with the set before: what goes on and what comes off.
  add: number[];
  remove: number[];
}

const cents = (kg: number) => Math.round(kg * 100);

// No side is ever loaded beyond this; a typo like 2000 kg stops here instead of
// making the calculator count for seconds.
const MAX_SIDE_KG = 500;

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

// Fewest plates for every amount up to `targetKg`, in steps of the greatest
// common divisor of the plates, so the table stays small (a few thousand cells).
function plateTable(targetKg: number, plates: number[], cap: number) {
  const usable = plates.filter((p) => p <= cap + 1e-9).map(cents).filter((p) => p > 0);
  const unit = usable.reduce((g, p) => gcd(g, p), 0) || 1;
  const steps = usable.map((p) => p / unit).sort((a, b) => b - a);
  const top = Math.floor(cents(Math.min(targetKg, MAX_SIDE_KG)) / unit);
  const best = new Array<number>(top + 1).fill(Infinity);
  const pick = new Array<number>(top + 1).fill(0);
  best[0] = 0;
  for (let t = 1; t <= top; t++) {
    for (const p of steps) {
      if (p <= t && best[t - p] + 1 < best[t]) {
        best[t] = best[t - p] + 1;
        pick[t] = p;
      }
    }
  }
  const read = (t: number) => {
    const out: number[] = [];
    for (let i = t; i > 0; i -= pick[i]) out.push((pick[i] * unit) / 100);
    return out.sort((x, y) => y - x);
  };
  return { unit, top, best, read };
}

// The fewest plates (of the ones not heavier than `cap`) that make `amount`
// exactly, heaviest first. Undefined when it cannot be made.
function fewestPlates(amountKg: number, plates: number[], cap = Infinity): number[] | undefined {
  const target = cents(amountKg);
  if (target < 0 || amountKg > MAX_SIDE_KG) return undefined;
  if (target === 0) return [];
  const table = plateTable(amountKg, plates, cap);
  if (target % table.unit !== 0 || !Number.isFinite(table.best[table.top])) return undefined;
  return table.read(table.top);
}

// The heaviest amount not above `amountKg` the plates can make, with the fewest plates.
function closestPlates(amountKg: number, plates: number[]): { plates: number[]; madeKg: number } {
  const table = plateTable(amountKg, plates, Infinity);
  for (let t = table.top; t > 0; t--) {
    if (Number.isFinite(table.best[t])) return { plates: table.read(t), madeKg: (t * table.unit) / 100 };
  }
  return { plates: [], madeKg: 0 };
}

export function usesPlates(exercise: Exercise | undefined): boolean {
  return exercise?.resistance === 'barbell' || exercise?.resistance === 'machine_plates';
}

// The plates per side for one weight, from scratch.
export function plateLoad(totalKg: number, exercise: Exercise | undefined, profile: GymProfile, barKg?: number): PlateLoad | undefined {
  if (!usesPlates(exercise) || !(totalKg > 0)) return undefined;
  const bar = exercise?.resistance === 'barbell' ? (barKg ?? barFor(profile, totalKg)) : 0;
  const side = (totalKg - bar) / 2;
  if (side < -1e-9) return { barKg: bar, perSide: [], shortKg: 0 };
  // The heaviest weight not above the side that the plates can make.
  const made = closestPlates(side, profile.platesKg);
  return { barKg: bar, perSide: made.plates, shortKg: Math.max(0, cents(side) - cents(made.madeKg)) / 100 };
}

function diff(from: number[], to: number[]): { add: number[]; remove: number[] } {
  const left = [...from];
  const add: number[] = [];
  for (const p of to) {
    const i = left.findIndex((q) => Math.abs(q - p) < 1e-9);
    if (i >= 0) left.splice(i, 1);
    else add.push(p);
  }
  return { add, remove: left.sort((a, b) => b - a) };
}

// From the plates that are on the bar to a new weight with the fewest moves:
// plates come off from the outside, new ones go on the outside, and a stack
// stays heaviest inside. 47,5 to 45 kg is one 1,25 off; 45 to 42,5 is the 2,5
// off and a 1,25 on, not the whole side again.
export function nextLoad(previous: PlateLoad | undefined, totalKg: number, exercise: Exercise | undefined, profile: GymProfile): PlateStep | undefined {
  const fresh = plateLoad(totalKg, exercise, profile, previous?.barKg);
  if (!fresh) return undefined;
  if (!previous || fresh.shortKg > 0) return { ...fresh, add: fresh.perSide, remove: previous ? previous.perSide : [] };
  const side = (totalKg - fresh.barKg) / 2;
  let best: { keep: number; add: number[]; moves: number; count: number } | undefined;
  for (let keep = previous.perSide.length; keep >= 0; keep--) {
    const kept = previous.perSide.slice(0, keep);
    const rest = side - kept.reduce((n, p) => n + p, 0);
    const cap = kept.length > 0 ? kept[kept.length - 1] : Infinity;
    const add = fewestPlates(rest, profile.platesKg, cap);
    if (!add) continue;
    const moves = previous.perSide.length - keep + add.length;
    const count = keep + add.length;
    if (!best || moves < best.moves || (moves === best.moves && count < best.count)) best = { keep, add, moves, count };
  }
  if (!best) return { ...fresh, ...diff(previous.perSide, fresh.perSide) };
  return {
    barKg: fresh.barKg,
    perSide: [...previous.perSide.slice(0, best.keep), ...best.add],
    shortKg: 0,
    add: best.add,
    remove: previous.perSide.slice(best.keep).reverse(),
  };
}

// The loading of every row of an exercise in order, each from the one before
// (the bar of the first working set for all of them).
export function plateSteps(ex: WorkoutExercise, profile: GymProfile): (PlateStep | undefined)[] {
  const exercise = exerciseOf(ex);
  if (!usesPlates(exercise)) return ex.rows.map(() => undefined);
  const firstWork = ex.rows.find((r) => r.kind === 'work' && r.weightKg !== undefined)?.weightKg;
  const bar = exercise?.resistance === 'barbell' ? barFor(profile, firstWork ?? ex.rows.find((r) => r.weightKg !== undefined)?.weightKg) : 0;
  let previous: PlateLoad | undefined = { barKg: bar, perSide: [], shortKg: 0 };
  return ex.rows.map((r) => {
    if (r.weightKg === undefined || r.weightKg <= 0) return undefined;
    // As you would load a bar: the fewest plates, heaviest inside. Fewer moves only
    // when that gives as few plates (47,5 to 45 is one 1,25 off, not a new stack).
    const fresh = plateLoad(r.weightKg, exercise, profile, previous?.barKg);
    const moved = nextLoad(previous, r.weightKg, exercise, profile);
    if (!fresh) return moved;
    const step: PlateStep = moved && moved.perSide.length <= fresh.perSide.length ? moved : { ...fresh, ...diff(previous?.perSide ?? [], fresh.perSide) };
    previous = step;
    return step;
  });
}

// "1 x 10, 1 x 2,5" (counted per weight, heaviest first).
export function plateList(plates: number[]): string {
  const counts = new Map<number, number>();
  for (const p of [...plates].sort((a, b) => b - a)) counts.set(p, (counts.get(p) ?? 0) + 1);
  return [...counts].map(([p, n]) => `${n} × ${kgText(p)}`).join(', ');
}

// --- swapping -------------------------------------------------------------------------------

// Exercises that can take the place of this one: the same main muscles (at
// least one in common), in the gym you have (a barbell needs a bar), the same
// movement first. Never the exercise itself or one that is already in the training.
export function swapOptions(current: Exercise | undefined, profile: GymProfile, inTraining: string[] = [], limit = 8): Exercise[] {
  if (!current) return [];
  const taken = new Set([current.id, ...inTraining]);
  const scored: { e: Exercise; score: number }[] = [];
  for (const e of EXERCISES) {
    if (taken.has(e.id)) continue;
    if (e.resistance === 'barbell' && profile.barsKg.length === 0) continue;
    const primary = e.primary.filter((m) => current.primary.includes(m)).length;
    if (primary === 0) continue;
    const secondary = e.secondary.filter((m) => current.secondary.includes(m) || current.primary.includes(m)).length;
    const score = primary * 3 + secondary + (e.pattern === current.pattern ? 4 : 0) + (e.loadsLegs === current.loadsLegs ? 1 : 0);
    scored.push({ e, score });
  }
  return scored.sort((a, b) => b.score - a.score || a.e.name.localeCompare(b.e.name)).slice(0, limit).map((s) => s.e);
}

// --- the legs ---------------------------------------------------------------------------------

// One short line on a leg day: why the legs may be tired, or the leg index.
export function legDayLine(date: string, deps: { logs: SessionLog[]; templates: SessionTemplate[]; program?: Program | null; bodyKg?: number }): string {
  const tired = legsTiredAt(date, undefined, deps);
  if (tired) return `Je benen zijn nog moe van ${tired.because}. Zelfde gewicht, een herhaling minder is normaal.`;
  const inputs = { logs: deps.logs, plannedSessions: [], templates: deps.templates, today: date, bodyKg: deps.bodyKg, program: deps.program };
  const index = legFatigueOn(date, inputs, fatigueEvents(inputs)).index;
  return `Beenindex ${formatNumberNL(index, 0)}, ${fatigueWord(index).word.toLowerCase()}.`;
}

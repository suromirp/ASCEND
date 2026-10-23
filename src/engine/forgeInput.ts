// ASCEND: the rules behind the input panel of the Forge workout screen. Pure; no
// React. The panel (components/forge/InputDock.tsx) calls these functions and
// renders the result. Decision: docs/beslissingen/2026-10-23-forge-soepel.md.
//
// What this file decides:
// - the step of the minus and plus keys (your gym profile for a weight, 1 for reps);
// - what a key of the number pad does to the text;
// - which field comes next, and which set is the active one;
// - what a weight you change on one set does to the sets after it;
// - taking the prescription, copying and removing a set;
// - how the plates are drawn and told (colour, height, legend, the sentence).

import type { Exercise } from '../models/exercise';
import { formatNumberNL, parseNumberNL } from '../utils/number';
import {
  exerciseOf,
  MAX_ROW_KG,
  MAX_ROW_REPS,
  updateRow,
  type PlateStep,
  type RowTarget,
  type WorkoutExercise,
  type WorkoutRow,
} from './forgeWorkout';
import type { GymProfile } from './strengthSettings';
import { candidatesFor, nearestIndex, stepFor } from './strengthWeights';

const r2 = (n: number) => Math.round(n * 100) / 100;

// --- steps ---------------------------------------------------------------------------------

// The step of the plus and minus keys for a weight: your own step for the
// exercise first; a bar and a machine with plates go by the smallest pair of
// plates; dumbbells by your rack; a vest by 1 kg; the rest by the step of the stack.
export function weightStepFor(exercise: Exercise | undefined, profile: GymProfile, currentKg?: number): number {
  const own = exercise && profile.exerciseStepKg?.[exercise.id];
  if (own) return own;
  switch (exercise?.resistance) {
    case 'barbell':
    case 'machine_plates':
    case 'bodyweight':
      return r2(Math.min(...profile.platesKg) * 2);
    case 'dumbbell': {
      const rack = profile.dumbbells;
      return Math.abs(currentKg ?? 0) >= rack.upToKg ? rack.thenStepKg : rack.stepKg;
    }
    case 'pack_or_vest':
      return 1;
    default:
      return stepFor(exercise, profile);
  }
}

export const REPS_STEP = 1;

// A weight rounded to what your gym can make: the nearest bar plus plates, the
// nearest dumbbell, the nearest step of the stack. What you type yourself is
// never rounded; a weight that is passed on to the next sets always is, the
// same as the prescription. Built once per change (the list of weights is long).
export function makeSnap(exercise: Exercise | undefined, profile: GymProfile, bodyKg?: number, around?: number): (kg: number) => number {
  const candidates = candidatesFor(exercise, profile, { bodyKg, lastExternalKg: around });
  const step = weightStepFor(exercise, profile, around) || 1;
  return (kg) => (candidates ? candidates[nearestIndex(candidates, kg)].externalKg : r2(Math.round(kg / step) * step));
}

// One step up (1) or down (-1), kept between min and max.
export function stepNumber(value: number | undefined, direction: 1 | -1, step: number, min: number, max: number): number {
  const next = r2((value ?? 0) + direction * step);
  return Math.min(max, Math.max(min, next));
}

export const weightBounds = (exercise: Exercise | undefined) => ({ min: exercise?.resistance === 'assisted_bodyweight' ? -MAX_ROW_KG : 0, max: MAX_ROW_KG });
export const repsBounds = { min: 0, max: MAX_ROW_REPS };

// --- the number pad ------------------------------------------------------------------------

export type PadKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | ',' | 'back';

// The text after a key. `fresh`: the number is still "selected", so a digit
// replaces it (and a back key clears it), as when you tap a field in a table.
export function pressKey(text: string, key: PadKey, opts: { decimals: number; fresh: boolean }): string {
  const base = opts.fresh ? '' : text;
  if (key === 'back') return opts.fresh ? '' : text.slice(0, -1);
  if (key === ',') {
    if (opts.decimals === 0) return base;
    if (base.includes(',')) return base;
    return `${base === '' ? '0' : base},`;
  }
  const [whole, dec] = base.split(',');
  if (dec !== undefined) return dec.length >= opts.decimals ? base : `${base}${key}`;
  if (whole.length >= 3) return base;
  return whole === '0' ? key : `${whole}${key}`;
}

export function textToNumber(text: string, decimals: number): number | undefined {
  return parseNumberNL(text, decimals).value;
}

export const numberToText = (value: number | undefined, decimals: number): string => (value === undefined ? '' : formatNumberNL(value, decimals));

// --- which field is next ------------------------------------------------------------------

export type FieldName = 'weightKg' | 'reps';
export interface FieldRef {
  slot: string;
  rowId: string;
  field: FieldName;
}

// Kg, then reps of the same set, then kg of the next set that is not ticked
// yet (in the next exercise when this one is finished). Holds have no fields.
// Undefined at the end of the training.
export function nextField(workout: WorkoutExercise[], at: FieldRef): FieldRef | undefined {
  if (at.field === 'weightKg') {
    const row = workout.find((e) => e.slot === at.slot)?.rows.find((r) => r.id === at.rowId);
    if (row && !row.done) return { ...at, field: 'reps' };
  }
  const exIndex = workout.findIndex((e) => e.slot === at.slot);
  if (exIndex < 0) return undefined;
  const rowIndex = workout[exIndex].rows.findIndex((r) => r.id === at.rowId);
  for (let i = exIndex; i < workout.length; i++) {
    const ex = workout[i];
    if (ex.timed) continue;
    const from = i === exIndex ? rowIndex + 1 : 0;
    const row = ex.rows.slice(from).find((r) => !r.done);
    if (row) return { slot: ex.slot, rowId: row.id, field: 'weightKg' };
  }
  return undefined;
}

export interface RowRef {
  slot: string;
  rowId: string;
}

// The set to do now: the first one not ticked after the given one, else the
// first one not ticked at all. Holds count too (you tick them as well).
export function activeRow(workout: WorkoutExercise[], after?: RowRef): RowRef | undefined {
  const flat = workout.flatMap((e) => e.rows.map((r) => ({ slot: e.slot, rowId: r.id, done: r.done })));
  const at = after ? flat.findIndex((r) => r.slot === after.slot && r.rowId === after.rowId) : -1;
  const next = flat.slice(at + 1).find((r) => !r.done) ?? flat.find((r) => !r.done);
  return next ? { slot: next.slot, rowId: next.rowId } : undefined;
}

export const exerciseComplete = (ex: WorkoutExercise): boolean => ex.rows.length > 0 && ex.rows.every((r) => r.done);

// --- what you change ----------------------------------------------------------------------

// A new weight for one set. With `carry` the sets after it that are still
// untouched (not ticked, not changed by you) and of the same kind move by the
// same difference. The sets are read from `base`, the exercise as it was
// before you started changing this field, so typing 4 and then 45 gives the
// same as typing 45 at once and nothing sticks at zero on the way.
export function applyWeight(base: WorkoutExercise, rowId: string, weightKg: number | undefined, carry: boolean, snap?: (kg: number) => number): WorkoutExercise {
  const index = base.rows.findIndex((r) => r.id === rowId);
  if (index < 0) return base;
  const row = base.rows[index];
  const changed = updateRow(base, rowId, { weightKg });
  const rows = changed.rows.map((r) => (r.id === rowId ? { ...r, edited: true } : r));
  const delta = weightKg !== undefined && row.weightKg !== undefined ? r2(weightKg - row.weightKg) : 0;
  if (!carry || delta === 0 || row.kind !== 'work') return { ...changed, rows };
  return {
    ...changed,
    rows: rows.map((r, i) => (i > index && r.kind === 'work' && !r.done && !r.edited && r.weightKg !== undefined ? { ...r, weightKg: Math.min(MAX_ROW_KG, Math.max(0, snap ? snap(r2(r.weightKg + delta)) : r2(r.weightKg + delta))) } : r)),
  };
}

export function applyReps(ex: WorkoutExercise, rowId: string, reps: number | undefined): WorkoutExercise {
  const changed = updateRow(ex, rowId, { reps });
  return { ...changed, rows: changed.rows.map((r) => (r.id === rowId ? { ...r, edited: true } : r)) };
}

// The reps the prescription asks for: the middle of the range, the bottom for "9+".
export function targetReps(t: RowTarget): number {
  return t.timedSec ?? (t.failure ? t.repsLow : Math.round((t.repsLow + t.repsHigh) / 2));
}

// A tap on the prescription: kg and reps (and RIR) as the prescription says.
export function takeTarget(ex: WorkoutExercise, rowId: string): WorkoutExercise {
  return {
    ...ex,
    rows: ex.rows.map((r) =>
      r.id !== rowId || r.done
        ? r
        : {
            ...r,
            ...(r.target.weightKg !== undefined ? { weightKg: r.target.weightKg } : {}),
            reps: targetReps(r.target),
            ...(r.kind === 'work' && r.target.rir !== undefined ? { rir: r.target.rir } : {}),
            edited: true,
          },
    ),
  };
}

// A copy of a set right under it, not ticked.
export function copyRow(ex: WorkoutExercise, rowId: string): WorkoutExercise {
  const index = ex.rows.findIndex((r) => r.id === rowId);
  if (index < 0) return ex;
  const source = ex.rows[index];
  const copy: WorkoutRow = { ...source, id: `${ex.slot}:c${Date.now().toString(36)}${ex.rows.length}`, done: false, edited: true };
  return { ...ex, rows: [...ex.rows.slice(0, index + 1), copy, ...ex.rows.slice(index + 1)] };
}

// One set weg, but only one that is not ticked (you did that one) and never the last one.
export function removeRow(ex: WorkoutExercise, rowId: string): WorkoutExercise {
  const row = ex.rows.find((r) => r.id === rowId);
  if (!row || row.done || ex.rows.length <= 1) return ex;
  return { ...ex, rows: ex.rows.filter((r) => r.id !== rowId) };
}

// --- the folded exercise ------------------------------------------------------------------

// "4 sets, zwaarste 47,5 kg × 12" for a finished exercise.
export function exerciseSummary(ex: WorkoutExercise): string {
  const work = ex.rows.filter((r) => r.kind === 'work' && r.done);
  const count = work.length;
  if (count === 0) return 'Klaar';
  const sets = count === 1 ? '1 set' : `${count} sets`;
  if (ex.timed) return sets;
  const top = [...work].sort((a, b) => (b.weightKg ?? 0) - (a.weightKg ?? 0))[0];
  if (top.weightKg !== undefined && top.weightKg !== 0) return `${sets}, zwaarste ${formatNumberNL(top.weightKg, 2)} kg × ${top.reps ?? 0}`;
  return `${sets}, ${top.reps ?? 0} herhalingen`;
}

// --- the plates, drawn and told -------------------------------------------------------------

export interface PlateGroup {
  kg: number;
  count: number;
}

// "1 × 5, 1 × 2,5": per weight, heaviest first.
export function plateGroups(perSide: number[]): PlateGroup[] {
  const counts = new Map<number, number>();
  for (const p of [...perSide].sort((a, b) => b - a)) counts.set(p, (counts.get(p) ?? 0) + 1);
  return [...counts].map(([kg, count]) => ({ kg, count }));
}

// One calm colour per plate, from the tokens in index.css.
const PLATE_TOKENS: [number, string][] = [
  [1.25, 'var(--color-plate-1)'],
  [2.5, 'var(--color-plate-2)'],
  [5, 'var(--color-plate-3)'],
  [10, 'var(--color-plate-4)'],
  [15, 'var(--color-plate-5)'],
  [20, 'var(--color-plate-6)'],
  [25, 'var(--color-plate-7)'],
];
export function plateTone(kg: number): string {
  return PLATE_TOKENS.find(([w]) => Math.abs(w - kg) < 1e-9)?.[1] ?? 'var(--color-plate-other)';
}

// How tall a plate is drawn, as a share of the tallest (0.48 to 1): a heavier
// plate is bigger, but not in proportion.
export function plateHeight(kg: number): number {
  return r2(0.3 + 0.7 * Math.sqrt(Math.min(Math.max(kg, 0), 20) / 20));
}

// The weight the plates can make that is nearest below the wish.
export const plateClosest = (step: Pick<PlateStep, 'perSide' | 'barKg'>): number => r2(step.barKg + 2 * step.perSide.reduce((n, p) => n + p, 0));

// "kan niet precies, dichtstbij 45" for a weight the plates cannot make.
export const plateShortText = (step: Pick<PlateStep, 'perSide' | 'barKg'>): string => `kan niet precies, dichtstbij ${formatNumberNL(plateClosest(step), 2)}`;

// "15 + 2,5", or that there is only the bar.
export function plateSideText(step: Pick<PlateStep, 'perSide'>): string {
  return step.perSide.length > 0 ? step.perSide.map((p) => formatNumberNL(p, 2)).join(' + ') : 'alleen de stang';
}

// "7,5 kg per kant + stang 20 kg = 35 kg".
export function plateSentence(step: Pick<PlateStep, 'perSide' | 'barKg'>): string {
  const side = r2(step.perSide.reduce((n, p) => n + p, 0));
  const total = r2(step.barKg + 2 * side);
  const sideText = `${formatNumberNL(side, 2)} kg per kant`;
  return step.barKg > 0 ? `${sideText} + stang ${formatNumberNL(step.barKg, 2)} kg = ${formatNumberNL(total, 2)} kg` : `${sideText} = ${formatNumberNL(total, 2)} kg`;
}

// What changes from the set before: "Erbij 1 × 2,5, eraf 1 × 1,25." Undefined when nothing does.
export function plateChange(step: Pick<PlateStep, 'add' | 'remove'>): string | undefined {
  const list = (plates: number[]) => plateGroups(plates).map((g) => `${g.count} × ${formatNumberNL(g.kg, 2)}`).join(', ');
  const parts = [step.add.length > 0 ? `Erbij ${list(step.add)}` : '', step.remove.length > 0 ? `eraf ${list(step.remove)}` : ''].filter(Boolean);
  return parts.length === 0 ? undefined : `${parts.join(', ')}.`;
}

export const hasPlates = (ex: WorkoutExercise): boolean => {
  const e = exerciseOf(ex);
  return e?.resistance === 'barbell' || e?.resistance === 'machine_plates';
};

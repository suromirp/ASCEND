// ASCEND: the editing rules of "Je sportschool" (Instellingen, Training).
//
// The screen shows chips and steppers; this file turns a tap into the stored
// shape of `GymProfile` (unchanged, so no migration) and back. No React here.
// The limits are the ones `normalizeProfile` keeps, so what the screen allows is
// always what gets stored.

import type { DumbbellRack } from './strengthSettings';

const r2 = (n: number) => Math.round(n * 100) / 100;

export const COMMON_BARS_KG = [20, 15, 10, 7.5];
export const COMMON_PLATES_KG = [0.5, 1.25, 2.5, 5, 10, 15, 20, 25];
export const COMMON_STACK_STEPS_KG = [1.25, 2.5, 5];

export const BAR_LIMITS = { min: 1, max: 40, count: 6 };
export const PLATE_LIMITS = { min: 0.25, max: 50, count: 12 };
export const STEP_LIMITS = { min: 0.25, max: 50 };
export const RACK_LIMITS = { startMin: 0.5, startMax: 20, upToMax: 100, maxMax: 200 };

// ---- Bars and plates ------------------------------------------------------

export type WeightKind = 'bars' | 'plates';

const limitsOf = (kind: WeightKind) => (kind === 'bars' ? BAR_LIMITS : PLATE_LIMITS);

// Bars are stored heaviest first, plates lightest first.
function sortWeights(kind: WeightKind, list: number[]): number[] {
  const unique = [...new Set(list.map(r2))];
  return unique.sort((a, b) => (kind === 'bars' ? b - a : a - b));
}

// The chips to show: the usual values, then the ones you added yourself.
export function chipValues(kind: WeightKind, selected: number[]): { value: number; custom: boolean }[] {
  const common = kind === 'bars' ? COMMON_BARS_KG : COMMON_PLATES_KG;
  const extra = selected.filter((n) => !common.includes(n));
  const all = [...common.map((value) => ({ value, custom: false })), ...extra.map((value) => ({ value, custom: true }))];
  return all.sort((a, b) => (kind === 'bars' ? b.value - a.value : a.value - b.value));
}

export type ToggleResult = { list: number[]; refused?: string };

// Switch a value on or off. The last one cannot go off (a gym without a bar or
// plates gives no weights at all), and the list has a size limit.
export function toggleWeight(kind: WeightKind, list: number[], value: number): ToggleResult {
  const v = r2(value);
  const word = kind === 'bars' ? 'stang' : 'schijf';
  if (list.includes(v)) {
    if (list.length <= 1) return { list, refused: `Houd minstens één ${word} aan.` };
    return { list: list.filter((n) => n !== v) };
  }
  if (list.length >= limitsOf(kind).count) return { list, refused: `Meer dan ${limitsOf(kind).count} kan niet.` };
  return { list: sortWeights(kind, [...list, v]) };
}

// A weight of your own: valid, in range, not there yet. The message is for the screen.
export function checkCustomWeight(kind: WeightKind, list: number[], value: number | undefined): string | undefined {
  const { min, max, count } = limitsOf(kind);
  if (value === undefined || value <= 0) return 'Vul een gewicht in.';
  if (value < min || value > max) return `Kies een gewicht van ${String(min).replace('.', ',')} tot ${max} kg.`;
  if (list.includes(r2(value))) return 'Dit gewicht heb je al.';
  if (list.length >= count) return `Meer dan ${count} kan niet.`;
  return undefined;
}

// The smallest jump on a barbell: a pair of the lightest plates.
export const smallestBarJump = (platesKg: number[]): number => r2(2 * Math.min(...platesKg));

// ---- Dumbbells ------------------------------------------------------------

// The series you can pick up: from the lightest in `stepKg` up to `upToKg`, then
// in `thenStepKg` up to the heaviest. This is the one place that computes it; the
// weight candidates of the Forge model read it too.
export function dumbbellWeights(d: DumbbellRack): number[] {
  const light: number[] = [];
  for (let w = d.startKg; w <= d.upToKg + 1e-9; w += d.stepKg) light.push(r2(w));
  const heavy: number[] = [];
  for (let w = light[light.length - 1] + d.thenStepKg; w <= d.maxKg + 1e-9; w += d.thenStepKg) heavy.push(r2(w));
  return [...light, ...heavy];
}

export type DumbbellPresetId = 'per1' | 'per2' | 'per2_5' | 'mixed';

export interface DumbbellPreset {
  id: DumbbellPresetId;
  label: string;
  stepKg: number;
  thenStepKg: number;
  // Mixed series change step at this weight; the others have one step throughout.
  upToKg?: number;
}

export const DUMBBELL_PRESETS: DumbbellPreset[] = [
  { id: 'per1', label: 'Per 1 kg', stepKg: 1, thenStepKg: 1 },
  { id: 'per2', label: 'Per 2 kg', stepKg: 2, thenStepKg: 2 },
  { id: 'per2_5', label: 'Per 2,5 kg', stepKg: 2.5, thenStepKg: 2.5 },
  { id: 'mixed', label: '2 kg tot 10, daarna 2,5', stepKg: 2, thenStepKg: 2.5, upToKg: 10 },
];

// Which preset the rack is, or undefined when it is something of your own.
export function detectDumbbellPreset(d: DumbbellRack): DumbbellPresetId | undefined {
  return DUMBBELL_PRESETS.find((p) => p.stepKg === d.stepKg && p.thenStepKg === d.thenStepKg && (p.upToKg === undefined || p.upToKg === d.upToKg))?.id;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

// A rack that `normalizeProfile` keeps as it is.
export function fitRack(d: DumbbellRack): DumbbellRack {
  const startKg = clamp(d.startKg, RACK_LIMITS.startMin, RACK_LIMITS.startMax);
  const maxKg = clamp(d.maxKg, startKg, RACK_LIMITS.maxMax);
  const upToKg = clamp(d.upToKg, startKg, Math.min(maxKg, RACK_LIMITS.upToMax));
  return { startKg, stepKg: d.stepKg, upToKg, thenStepKg: d.thenStepKg, maxKg };
}

// Choosing a series keeps your lightest and heaviest. When the lightest does not
// fall on the grid of the step (2 with steps of 2,5), it moves to the first step.
export function applyDumbbellPreset(d: DumbbellRack, id: DumbbellPresetId): DumbbellRack {
  const p = DUMBBELL_PRESETS.find((x) => x.id === id) ?? DUMBBELL_PRESETS[1];
  const onGrid = Math.abs(d.startKg / p.stepKg - Math.round(d.startKg / p.stepKg)) < 1e-9;
  const startKg = onGrid ? d.startKg : p.stepKg;
  const upToKg = p.upToKg ?? Math.max(d.maxKg, startKg);
  return fitRack({ ...d, startKg, stepKg: p.stepKg, thenStepKg: p.thenStepKg, upToKg });
}

// Move the lightest or the heaviest dumbbell, keeping the rack valid.
export function setRackBound(d: DumbbellRack, which: 'startKg' | 'maxKg', value: number): DumbbellRack {
  const next = { ...d, [which]: r2(value) };
  if (which === 'startKg') {
    if (next.upToKg < next.startKg) next.upToKg = next.startKg;
    if (next.maxKg < next.startKg) next.maxKg = next.startKg;
  } else if (next.stepKg === next.thenStepKg) {
    // One step throughout: where the step changes does not matter, so it follows the heaviest.
    next.upToKg = next.maxKg;
  } else if (next.upToKg > next.maxKg) {
    next.upToKg = next.maxKg;
  }
  return fitRack(next);
}

// The line under the series: the first weights, the last two and how many there are.
export function summarizeSeries(list: number[], head = 8, tail = 2): { head: number[]; tail: number[]; total: number; gap: boolean } {
  if (list.length <= head + tail) return { head: list, tail: [], total: list.length, gap: false };
  return { head: list.slice(0, head), tail: list.slice(-tail), total: list.length, gap: true };
}

// ---- Cables and machines --------------------------------------------------

export const isCommonStackStep = (n: number): boolean => COMMON_STACK_STEPS_KG.includes(n);

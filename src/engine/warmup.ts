// ASCEND: which muscles are warm in this training, and so what kind of warm-up
// an exercise needs. Pure; no React, no storage. Decision:
// docs/beslissingen/2026-10-23-opwarmen-per-spiergroep.md (KR-7 of
// docs/onderzoek/Kracht loggen en progressie.md).
//
// In short. The warm-up protects the first heavy set of a body part, so the full
// build-up (two or three sets) belongs to the first heavy exercise of the legs
// and to the first heavy exercise of the upper body, whatever it trains. After
// that the muscles are warm: one set is enough (a ramp set on the same
// movement, a feel set on a new one), and an isolation exercise on warm
// muscles gets nothing. Cold muscles get one light set before an isolation
// exercise.

import type { Exercise, MovementPattern, MuscleGroup } from '../models/exercise';

// Movements that load several joints; the rest is isolation, calves and core.
export const COMPOUND_PATTERNS: ReadonlySet<MovementPattern> = new Set(['squat', 'hinge', 'lunge_step', 'push_horizontal', 'push_vertical', 'pull_horizontal', 'pull_vertical']);

export type WarmKind =
  // The whole build-up: 2 or 3 sets (the first heavy exercise of a body part).
  | 'full'
  // One set of about 70% x 4 on the same movement as an exercise before it.
  | 'ramp'
  // One set of 65% x 5 on a new movement, with muscles that are already warm.
  | 'feel'
  // One light set of 50% x 8 before an isolation exercise on cold muscles.
  | 'light'
  | 'none';

export type Region = 'lower' | 'upper';

export interface WarmState {
  // A compound exercise of this body part has been done in this training.
  regions: Set<Region>;
  // How warm a muscle is: 1 worked as a main muscle, 0.5 as a helper.
  muscles: Map<MuscleGroup, number>;
  // The compound movements done so far.
  patterns: Set<MovementPattern>;
}

export const newWarmState = (): WarmState => ({ regions: new Set(), muscles: new Map(), patterns: new Set() });

export const isCompound = (exercise: Pick<Exercise, 'pattern'>): boolean => COMPOUND_PATTERNS.has(exercise.pattern);

export const regionOf = (exercise: Pick<Exercise, 'loadsLegs'>): Region => (exercise.loadsLegs ? 'lower' : 'upper');

// The average warmth of the main muscles of an exercise, 0 to 1.
export function warmthOf(exercise: Pick<Exercise, 'primary'>, state: WarmState): number {
  if (exercise.primary.length === 0) return 0;
  return exercise.primary.reduce((n, m) => n + (state.muscles.get(m) ?? 0), 0) / exercise.primary.length;
}

// What warm-up this exercise needs, given what was done before it.
export function warmupKind(exercise: Exercise | undefined, state: WarmState): WarmKind {
  if (!exercise) return 'full';
  if (isCompound(exercise)) {
    if (!state.regions.has(regionOf(exercise))) return 'full';
    return state.patterns.has(exercise.pattern) ? 'ramp' : 'feel';
  }
  return warmthOf(exercise, state) >= 0.5 ? 'none' : 'light';
}

// The exercise is planned or done: its muscles are warm for the next one.
// `warmed` says the exercise itself could get warm-up sets (not mostly body
// weight, not a light weight). A compound exercise that could not does not make
// the body part count as warm: a heavy squat after a glute bridge still gets
// its build-up.
export function noteWorked(state: WarmState, exercise: Exercise | undefined, warmed = true): void {
  if (!exercise) return;
  for (const m of exercise.primary) state.muscles.set(m, 1);
  if (isCompound(exercise) && warmed) {
    for (const m of exercise.secondary) state.muscles.set(m, Math.max(state.muscles.get(m) ?? 0, 0.5));
    state.regions.add(regionOf(exercise));
    state.patterns.add(exercise.pattern);
  }
}

// Nagemaakte cijfers: de eerste opwarmset van de squat gelogd als 10 kg x 10, met een stang van 20 kg.
import { describe, expect, it } from 'vitest';
import { barNote, underBar } from './barCheck';
import { strengthFor, type ReckonContext } from './forgeReckon';
import type { WorkoutExercise, WorkoutRow } from './forgeWorkout';
import { DEFAULT_PROFILE } from './strengthSettings';

const warm = (kg: number | undefined): WorkoutRow => ({ id: 'w0', kind: 'warmup', target: { weightKg: 20, repsLow: 10, repsHigh: 10 }, ...(kg !== undefined ? { weightKg: kg } : {}), reps: 10, done: false });
const work = (id: string, kg: number, over: Partial<WorkoutRow> = {}): WorkoutRow => ({ id, kind: 'work', target: { weightKg: 82.5, repsLow: 5, repsHigh: 7, rir: 1 }, weightKg: kg, reps: 5, forgeReps: 5, done: false, ...over });
const squat = (rows: WorkoutRow[], exerciseId = 'back-squat'): WorkoutExercise => ({ slot: 'sq', exerciseId, name: 'Squat', known: true, rows, restSec: 180, timed: false, strengthKg: 99, fatiguePerSet: 0.03 });

describe('een gewicht onder de lege stang', () => {
  it('10 kg bij de back-squat met een stang van 20 krijgt een zachte regel', () => {
    const ex = squat([warm(10), work('s0', 82.5)]);
    expect(underBar(ex, 'w0', DEFAULT_PROFILE)).toBe(20);
    expect(barNote(ex, 'w0', DEFAULT_PROFILE)).toBe('Lege stang is 20 kg. Klopt 10?');
  });

  it('de stang zelf, een zwaarder gewicht, een leeg vak of 0 kg geven niets', () => {
    for (const kg of [20, 22.5, undefined, 0]) expect(barNote(squat([warm(kg), work('s0', 82.5)]), 'w0', DEFAULT_PROFILE)).toBeUndefined();
  });

  it('alleen bij een oefening met een stang', () => {
    const press = squat([warm(10), work('s0', 100)], 'leg-press');
    expect(barNote(press, 'w0', DEFAULT_PROFILE)).toBeUndefined();
  });

  it('een werkset onder de stang telt niet stil mee als je kracht van vandaag', () => {
    const ctx: ReckonContext = { profile: DEFAULT_PROFILE, workSets: 'descending', bodyKg: 80, maxToFailure: 20, on: true };
    const ex = squat([work('s0', 10, { reps: 12, done: true, rir: 1, rirAssumed: false }), work('s1', 72.5, { target: { weightKg: 72.5, repsLow: 7, repsHigh: 9, rir: 2 } })]);
    // Zonder de set onder de stang rekent Forge met de kracht van het voorschrift.
    expect(strengthFor(ex, 's1', ctx)).toBeCloseTo(99 * (1 - 0.03 - 0.06), 6);
  });
});

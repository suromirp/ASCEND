import { describe, expect, it } from 'vitest';
import { exerciseById } from '../data/exercises';
import type { ExercisePrescription } from '../models/training';
import { DEFAULT_PROFILE, resolveStrengthSettings } from './strengthSettings';
import { spotterApplies, spotterSlot } from './spotter';

const slot = (extra: Partial<ExercisePrescription> = {}): ExercisePrescription => ({ id: 'bench', exerciseName: 'Bench Press', sets: 3, reps: '6-8', priority: 'core', ...extra });

describe('welke oefeningen een spotter vragen', () => {
  it('stang op borst of schouders wel, toestel, kabel en dumbbell niet', () => {
    for (const id of ['bench-press', 'incline-bench-press', 'back-squat', 'front-squat', 'close-grip-bench-press']) expect(exerciseById(id)?.failureRisk, id).toBe(true);
    for (const id of ['deadlift', 'barbell-row', 'lat-pulldown', 'dumbbell-shoulder-press', 'leg-press']) expect(exerciseById(id)?.failureRisk, id).toBeUndefined();
  });
});

describe('spotterApplies', () => {
  const on = resolveStrengthSettings(undefined);
  it('staat standaard aan voor een stangoefening met risico', () => {
    expect(spotterApplies(exerciseById('bench-press'), on)).toBe(true);
    expect(spotterApplies(exerciseById('lat-pulldown'), on)).toBe(false);
    expect(spotterApplies(undefined, on)).toBe(false);
  });
  it('vervalt met veiligheidsarmen in de sportschool', () => {
    const safe = { ...on, profile: { ...DEFAULT_PROFILE, spotterRack: true } };
    expect(spotterApplies(exerciseById('bench-press'), safe)).toBe(false);
  });
  it('vervalt met de instelling uit', () => {
    expect(spotterApplies(exerciseById('bench-press'), { ...on, noSpotter: false })).toBe(false);
  });
});

describe('spotterSlot', () => {
  it('verhoogt 0 over naar 1 en maakt van "tot het uiterste" een open set met reserve', () => {
    const out = spotterSlot(slot({ setTargets: [{ repsLow: 7, repsHigh: 9, rir: 2 }, { repsLow: 11, repsHigh: 11, rir: 0, failure: true }] }));
    expect(out?.raised).toEqual([false, true]);
    expect(out?.slot.setTargets?.[0]).toEqual({ repsLow: 7, repsHigh: 9, rir: 2 });
    expect(out?.slot.setTargets?.[1]).toEqual({ repsLow: 11, repsHigh: 11, rir: 1, open: true });
  });
  it('zet een RPE van 10 op 9', () => {
    const out = spotterSlot(slot({ rpe: 10 }));
    expect(out?.slot.rpe).toBe(9);
    expect(out?.raised).toEqual([true, true, true]);
  });
  it('laat een voorschrift met 1 of meer over ongemoeid', () => {
    expect(spotterSlot(slot({ rpe: 9 }))).toBeUndefined();
    expect(spotterSlot(slot({ rpe: 8 }))).toBeUndefined();
    expect(spotterSlot(slot())).toBeUndefined();
    expect(spotterSlot(slot({ setTargets: [{ repsLow: 7, repsHigh: 9, rir: 1 }] }))).toBeUndefined();
  });
});

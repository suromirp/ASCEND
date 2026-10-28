import { describe, expect, it } from 'vitest';
import { matchExercise } from './exerciseMatch';
import { exerciseById } from '../data/exercises';

// De naam zoals MacroFactor hem schrijft moet bij een oefening met falenrisico uitkomen, anders
// geldt "Zonder spotter" niet (docs/beslissingen/2026-10-28-zonder-spotter.md).
describe('zonder spotter herkent de namen van MacroFactor', () => {
  it.each(['Barbell Bench Press', 'Bench Press (Barbell)', 'Barbell Back Squat', 'Incline Barbell Bench Press'])('%s', (name) => {
    const id = matchExercise(name);
    expect(id, name).toBeDefined();
    expect(exerciseById(id!)?.failureRisk, name).toBe(true);
  });
});

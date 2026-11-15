import { describe, expect, it } from 'vitest';
import src from './useHorizonChange.tsx?raw';
import { NO_PLAN_CHANGE } from '../engine/horizonChange';
import { SHELTER_OPTIONS } from '../data/shelterOptions';

// Lookout (15 november): het voorstelblad zei "Je planning hoeft niet te veranderen." en eronder "Je planning
// verandert hier niet door.". Zegt de kop het al, dan geen tweede zin.
describe('het voorstelblad van een planningsronde', () => {
  it('zet de zin over geen verandering alleen als de kop hem nog niet zegt', () => {
    expect(NO_PLAN_CHANGE).toBe('Je planning hoeft niet te veranderen.');
    expect(src).toMatch(/emptyText=\{pending\.plan\.proposal\.consequences === NO_PLAN_CHANGE \? undefined : /);
  });
});

// Het advies staat als badge bij de keuze, niet nog eens in de tekst eronder (zoals bij elke andere keuze).
describe('de keuzes voor slapen onderweg', () => {
  it('geen "Advies" in de tekst onder een keuze', () => {
    for (const o of SHELTER_OPTIONS) expect(o.note).not.toMatch(/advies/i);
  });
});

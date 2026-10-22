import { describe, expect, it } from 'vitest';
import { durationNeedsCheck, entryMinutes, heartRateProblem, LONG_SESSION_MIN, longDurationText } from './inputLimits';

describe('duur', () => {
  it('leeg, 0 en negatief betekenen geen duur', () => {
    expect(entryMinutes('')).toBe(0);
    expect(entryMinutes(undefined)).toBe(0);
    expect(entryMinutes(0)).toBe(0);
    expect(entryMinutes(-5)).toBe(0);
    expect(entryMinutes(Number.NaN)).toBe(0);
  });
  it('een gewone duur blijft staan', () => {
    expect(entryMinutes(45)).toBe(45);
    expect(entryMinutes(44.6)).toBe(45);
  });
  it('boven de grens vraagt "Klopt dit?"', () => {
    expect(durationNeedsCheck(LONG_SESSION_MIN)).toBe(false);
    expect(durationNeedsCheck(LONG_SESSION_MIN + 1)).toBe(true);
    expect(durationNeedsCheck(999)).toBe(true);
  });
  it('zegt in uren wat er staat', () => {
    expect(longDurationText(999)).toBe('999 min is 16 uur en 39 min');
    expect(longDurationText(720)).toBe('720 min is 12 uur');
  });
});

describe('hartslag', () => {
  it('weigert onzin met een melding', () => {
    expect(heartRateProblem('lthr', 0, {})).toMatch(/tussen 100 en 220/);
    expect(heartRateProblem('maxHr', 300, {})).toMatch(/tussen 120 en 230/);
    expect(heartRateProblem('restingHr', 250, {})).toMatch(/tussen 30 en 110/);
  });
  it('laat gewone waarden en leegmaken toe', () => {
    expect(heartRateProblem('lthr', 168, { maxHr: 190, restingHr: 52 })).toBeUndefined();
    expect(heartRateProblem('lthr', undefined, { maxHr: 190 })).toBeUndefined();
  });
  it('rust hoort onder het maximum en de drempel', () => {
    expect(heartRateProblem('restingHr', 105, { lthr: 100 })).toMatch(/lager/);
    expect(heartRateProblem('lthr', 100, { restingHr: 105 })).toMatch(/lager/);
    expect(heartRateProblem('restingHr', 60, { lthr: 100, maxHr: 130 })).toBeUndefined();
  });
  it('de drempel kan niet boven het maximum liggen', () => {
    expect(heartRateProblem('lthr', 200, { maxHr: 190 })).toMatch(/niet hoger/);
  });
});

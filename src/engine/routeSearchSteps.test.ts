import { describe, expect, it } from 'vitest';
import { searchBarTransition, searchLimitLine, searchStepShare, searchSteps, searchStepText } from './routeSearchSteps';

describe('Lussen zoeken: de stappen', () => {
  it('bij Waar je nu bent komt je plek eerst', () => {
    expect(searchSteps(true)).toEqual(['locate', 'terrain', 'routes']);
    expect(searchSteps(false)).toEqual(['terrain', 'routes']);
    expect(searchStepText('locate')).toBe('Je plek bepalen');
  });

  it('de balk loopt per stap verder en is nooit vol zolang er gezocht wordt', () => {
    const steps = searchSteps(true);
    const shares = steps.map((s) => searchStepShare(steps, s));
    expect(shares).toEqual([...shares].sort((a, b) => a - b));
    expect(Math.max(...shares)).toBeLessThan(1);
    expect(shares[0]).toBeGreaterThan(0);
  });

  it('beweging alleen in Vol, binnen 150 tot 400 ms; Rustig en Uit staan meteen goed', () => {
    expect(searchBarTransition('full')).toMatch(/\b300ms\b/);
    expect(searchBarTransition('calm')).toBe('none');
    expect(searchBarTransition('off')).toBe('none');
  });

  it('de grens in tijd komt uit de constanten', () => {
    expect(searchLimitLine(undefined, 30_000)).toBe('Dat duurt hoogstens 30 seconden.');
    expect(searchLimitLine(15_000, 30_000)).toBe('Je plek duurt hoogstens 15 seconden, het zoeken daarna hoogstens 30.');
  });
});

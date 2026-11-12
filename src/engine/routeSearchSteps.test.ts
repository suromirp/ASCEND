import { describe, expect, it } from 'vitest';
import { SEARCH_BAR_CAP, searchBarShare, searchBarTimeShare, searchLimitLine, searchStepFloor, searchStepShare, searchSteps, searchStepText } from './routeSearchSteps';

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

  it('de grens in tijd komt uit de constanten', () => {
    expect(searchLimitLine(undefined, 30_000)).toBe('Dat duurt hoogstens 30 seconden.');
    expect(searchLimitLine(15_000, 30_000)).toBe('Je plek duurt hoogstens 15 seconden, het zoeken daarna hoogstens 30.');
  });
});

describe('de balk op tijd (route-start, eis 9)', () => {
  const T = 45_000;
  const none = { from: 0, to: 0, sinceStepMs: 0 };
  it('begint bij 0 en loopt doorlopend en vertragend naar ongeveer 90 procent', () => {
    expect(searchBarShare(0, T, none)).toBe(0);
    const at = [0.1, 0.25, 0.5, 0.75, 1].map((f) => searchBarShare(f * T, T, none));
    for (let i = 1; i < at.length; i++) expect(at[i]).toBeGreaterThan(at[i - 1]);
    // Vertragend: het eerste kwart wint meer dan het laatste.
    expect(at[1] - 0).toBeGreaterThan(at[4] - at[3]);
    expect(at[4]).toBeGreaterThan(0.8);
  });
  it('nooit vol voor hij klaar is, ook ver na de grens', () => {
    expect(searchBarShare(10 * T, T, none)).toBeLessThanOrEqual(SEARCH_BAR_CAP);
    expect(searchBarShare(10 * T, T, { from: 0.6, to: 0.6, sinceStepMs: 1e6 })).toBeLessThanOrEqual(SEARCH_BAR_CAP);
  });
  it('een nieuwe stap schuift in 300 ms naar zijn vloer en loopt daarna door', () => {
    const steps = searchSteps(true);
    const floor = searchStepFloor(steps, 'routes');
    expect(floor).toBeCloseTo(0.6);
    const before = searchBarShare(3000, T, { from: 0.3, to: floor, sinceStepMs: 0 });
    const half = searchBarShare(3150, T, { from: 0.3, to: floor, sinceStepMs: 150 });
    const after = searchBarShare(3300, T, { from: 0.3, to: floor, sinceStepMs: 300 });
    expect(before).toBeLessThan(half);
    expect(half).toBeLessThan(after);
    expect(after).toBeGreaterThanOrEqual(floor);
    expect(searchBarShare(9000, T, { from: 0.3, to: floor, sinceStepMs: 6000 })).toBeGreaterThan(after);
  });
  it('Rustig en Uit: geen overgang, de balk staat op het aandeel van de stap', () => {
    expect(searchStepShare(searchSteps(false), 'routes')).toBe(0.75);
  });
  it('een grens die geen getal is geeft 0, nooit NaN', () => {
    expect(searchBarTimeShare(1000, Number.NaN)).toBe(0);
    expect(searchBarTimeShare(Number.NaN, T)).toBe(0);
  });
});

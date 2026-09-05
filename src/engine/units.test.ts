import { describe, it, expect } from 'vitest';
import { isDemandMet } from './units';

describe('isDemandMet', () => {
  it('higher_is_more units: current must meet or exceed the demand', () => {
    expect(isDemandMet({ amount: 15, unit: 'km' }, { amount: 15, unit: 'km' })).toBe(true);
    expect(isDemandMet({ amount: 15, unit: 'km' }, { amount: 20, unit: 'km' })).toBe(true);
    expect(isDemandMet({ amount: 15, unit: 'km' }, { amount: 10, unit: 'km' })).toBe(false);
  });

  it('lower_is_more units (pace): current must be at or below the demand', () => {
    // A demanded pace of 5:30/km is met by anything at or faster than that.
    expect(isDemandMet({ amount: 5.5, unit: 'min_per_km' }, { amount: 5.5, unit: 'min_per_km' })).toBe(true);
    expect(isDemandMet({ amount: 5.5, unit: 'min_per_km' }, { amount: 5.0, unit: 'min_per_km' })).toBe(true);
    expect(isDemandMet({ amount: 5.5, unit: 'min_per_km' }, { amount: 6.0, unit: 'min_per_km' })).toBe(false);
  });

  it('throws on a unit mismatch rather than silently comparing the wrong quantities', () => {
    expect(() => isDemandMet({ amount: 15, unit: 'km' }, { amount: 15, unit: 'min' })).toThrow(/Unit mismatch/);
  });
});

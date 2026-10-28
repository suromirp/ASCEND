import { describe, it, expect } from 'vitest';
import { GOAL_GROWTH, LIMIT_MARGINS, STRENGTH_GROWTH, growthPer, resolveGrowthChoice, resolveLimitMargin } from './goalGrowth';

describe('de groeigetallen en de keuzes erover', () => {
  it('elk getal ligt in zijn band, en voorzichtig is de onderkant', () => {
    for (const rate of [...Object.values(GOAL_GROWTH), ...Object.values(STRENGTH_GROWTH)]) {
      expect(rate.low).toBeGreaterThan(0);
      expect(rate.low).toBeLessThan(rate.weekly);
      expect(rate.weekly).toBeLessThan(rate.high);
      expect(growthPer(rate, 'careful')).toBe(rate.low);
      expect(growthPer(rate, 'average')).toBe(rate.weekly);
      expect(growthPer(rate)).toBe(rate.weekly);
    }
  });

  it('hardlopen is het midden van 0,3 tot 0,8% en de bron zegt dat eerlijk', () => {
    expect(GOAL_GROWTH.run.weekly).toBeCloseTo((0.003 + 0.008) / 2, 6);
    expect(GOAL_GROWTH.run.source).toContain('niet uit één studie');
  });

  it('een onbekende waarde valt terug op het advies', () => {
    expect(resolveGrowthChoice(undefined)).toBe('average');
    expect(resolveGrowthChoice('wild')).toBe('average');
    expect(resolveGrowthChoice('careful')).toBe('careful');
    expect(resolveLimitMargin(undefined)).toBe('ten');
    expect(resolveLimitMargin(7)).toBe('ten');
    expect(resolveLimitMargin('five')).toBe('five');
    expect(resolveLimitMargin('none')).toBe('none');
    expect(LIMIT_MARGINS).toEqual({ ten: 0.1, five: 0.05, none: 0 });
  });
});

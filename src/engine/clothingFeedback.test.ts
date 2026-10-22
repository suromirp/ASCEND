import { describe, expect, it } from 'vitest';
import { adjustFor, applyClothingFeedback, cleanClothingAdjust, clothingAdjustSummary, hasClothingAdjust, MAX_ADJUST_C } from './clothingFeedback';

describe('een tik schuift je opslag een halve graad', () => {
  it('te warm geeft meer opslag, te koud minder, goed laat het zoals het is', () => {
    expect(applyClothingFeedback(undefined, 'running', 'too_warm')).toEqual({ running: 0.5 });
    expect(applyClothingFeedback(undefined, 'running', 'too_cold')).toEqual({ running: -0.5 });
    expect(applyClothingFeedback({ running: 1 }, 'running', 'good')).toEqual({ running: 1 });
  });

  it('houdt elke sport apart', () => {
    const a = applyClothingFeedback({ running: 1 }, 'cycling', 'too_cold');
    expect(a).toEqual({ running: 1, cycling: -0.5 });
    expect(adjustFor(a, 'hiking')).toBe(0);
    expect(adjustFor(a, undefined)).toBe(0);
  });

  it('stopt bij plus en min vier graden', () => {
    let a = {};
    for (let i = 0; i < 20; i++) a = applyClothingFeedback(a, 'hiking', 'too_warm');
    expect(adjustFor(a, 'hiking')).toBe(MAX_ADJUST_C);
    for (let i = 0; i < 40; i++) a = applyClothingFeedback(a, 'hiking', 'too_cold');
    expect(adjustFor(a, 'hiking')).toBe(-MAX_ADJUST_C);
  });

  it('bewaart geen nul en laat het oude object ongemoeid', () => {
    const before = { running: 0.5 };
    const after = applyClothingFeedback(before, 'running', 'too_cold');
    expect(after).toEqual({});
    expect(before).toEqual({ running: 0.5 });
    expect(hasClothingAdjust(after)).toBe(false);
  });
});

describe('rommel wordt geweigerd', () => {
  it('neemt alleen eindige getallen voor een bekende sport over', () => {
    const { value, skipped } = cleanClothingAdjust({ running: 'warm', hiking: Number.NaN, cycling: 1, skiing: 2, extra: {} });
    expect(value).toEqual({ cycling: 1 });
    expect(skipped).toBe(4);
  });

  it('begrenst en rondt af op halve graden', () => {
    expect(cleanClothingAdjust({ running: 99, hiking: -99, cycling: 1.3 }).value).toEqual({ running: 4, hiking: -4, cycling: 1.5 });
  });

  it('geeft bij geen object een lege bijstelling', () => {
    for (const raw of ['uit', 5, null, [1, 2], true]) expect(cleanClothingAdjust(raw).value).toEqual({});
    expect(cleanClothingAdjust(undefined)).toEqual({ value: {}, skipped: 0 });
    expect(adjustFor('rommel', 'running')).toBe(0);
  });
});

describe('de zin in de instellingen', () => {
  it('zegt standaard als er niets is en anders wat er is bijgesteld', () => {
    expect(clothingAdjustSummary(undefined)).toBe('Nu: de standaard.');
    expect(clothingAdjustSummary({ running: 1.5, cycling: -0.5 })).toBe('Nu: Hardlopen 1,5 graden lichter, fietsen 0,5 graden zwaarder.');
    expect(clothingAdjustSummary({ hiking: 1 })).toBe('Nu: Wandelen 1 graad lichter.');
  });
});

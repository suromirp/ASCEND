import { describe, expect, it } from 'vitest';
import { adjustFor, feedbackSentence, applyClothingFeedback, cleanClothingAdjust, clothingAdjustSummary, hasClothingAdjust, MAX_ADJUST_C } from './clothingFeedback';

describe('een tik schuift je opslag: de eerste een graad, daarna een halve', () => {
  it('te warm geeft meer opslag, te koud minder, goed laat het zoals het is', () => {
    expect(applyClothingFeedback(undefined, 'running', 'too_warm')).toEqual({ running: 1 });
    expect(applyClothingFeedback(undefined, 'running', 'too_cold')).toEqual({ running: -1 });
    expect(applyClothingFeedback({ running: 1 }, 'running', 'too_warm')).toEqual({ running: 1.5 });
    expect(applyClothingFeedback({ running: 1 }, 'running', 'good')).toEqual({ running: 1 });
  });

  it('houdt elke sport apart', () => {
    const a = applyClothingFeedback({ running: 1 }, 'cycling', 'too_cold');
    expect(a).toEqual({ running: 1, cycling: -1 });
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

  it('weigert waarden buiten plus of min 4 en rondt de rest af op halve graden', () => {
    expect(cleanClothingAdjust({ running: 99, hiking: -99, cycling: 1.3 }).value).toEqual({ cycling: 1.5 });
    expect(cleanClothingAdjust({ running: 4, hiking: -4 }).value).toEqual({ running: 4, hiking: -4 });
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
    expect(clothingAdjustSummary({ running: 1.5, cycling: -0.5 })).toBe('Nu: Hardlopen 1,5 graden lichter, fietsen 0,5 graden warmer.');
    expect(clothingAdjustSummary({ hiking: 1 })).toBe('Nu: Wandelen 1 graad lichter.');
  });
});

describe('een oude waarde en de zin na een tik', () => {
  it('een bewaarde min een uit een oude back-up blijft geldig en schuift daarna een halve', () => {
    expect(cleanClothingAdjust({ running: -1 })).toEqual({ value: { running: -1 }, skipped: 0 });
    expect(applyClothingFeedback({ running: -1 }, 'running', 'too_cold')).toEqual({ running: -1.5 });
    expect(applyClothingFeedback({ running: -1 }, 'running', 'too_warm')).toEqual({ running: -0.5 });
  });

  it('vanaf plus 3,5 stopt de eerste stap ook bij het maximum', () => {
    expect(applyClothingFeedback({ hiking: MAX_ADJUST_C - 0.5 }, 'hiking', 'too_warm')).toEqual({ hiking: MAX_ADJUST_C });
    expect(applyClothingFeedback({ hiking: MAX_ADJUST_C }, 'hiking', 'too_warm')).toEqual({ hiking: MAX_ADJUST_C });
  });

  it('zegt wat er de volgende keer anders wordt', () => {
    expect(feedbackSentence(undefined, 'running', 'too_cold')).toContain('Een volgende keer warmer: nu 1 graad warmer.');
    expect(feedbackSentence({ running: -1 }, 'running', 'too_cold')).toContain('nu 1,5 graden warmer');
    expect(feedbackSentence({ running: 0.5 }, 'running', 'too_cold')).toBe('Genoteerd. Je zit weer op de standaard.');
    expect(feedbackSentence({ running: -3.5 }, 'running', 'too_cold')).toContain('Verder dan 4 graden schuift het niet.');
    expect(feedbackSentence(undefined, 'running', 'good')).toBe('Fijn, dan blijft het zo.');
  });
});

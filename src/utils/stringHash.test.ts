import { describe, it, expect } from 'vitest';
import { stringHash, stringHashKey } from './stringHash';

// The four copies as they were: the shared function must give exactly their numbers,
// because some are stored (the id of an advice, the fingerprint of a watch workout).
const oldSimpleHash = (text: string) => {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
};
const oldDjb2 = (text: string) => {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
};
const oldQuote = (text: string) => Array.from(text).reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 0);
const oldPlan = (lines: string[]) => {
  let h = 0;
  for (const line of lines) for (let i = 0; i < line.length; i++) h = (Math.imul(h, 31) + line.charCodeAt(i)) | 0;
  return h;
};

const samples = ['', 'a', '2026-11-15', 'Krachttraining bovenlichaam', 'ëäïö ß 漢字', 'x'.repeat(5000), JSON.stringify([1, 'Wandelen', { a: null }])];

describe('stringHash', () => {
  it('geeft dezelfde uitkomst als de oude kopieën', () => {
    for (const s of samples) {
      expect(stringHashKey(s)).toBe(oldSimpleHash(s));
      expect(stringHashKey(s, { multiplier: 33, seed: 5381 })).toBe(oldDjb2(s));
      expect(stringHash(s)).toBe(oldQuote(s));
      expect(stringHash(s)).toBe(oldPlan([s]) >>> 0);
    }
    expect(stringHash(samples.join(''))).toBe(oldPlan(samples) >>> 0);
  });

  it('is altijd zonder teken en binnen 32 bits', () => {
    for (const s of samples) {
      const h = stringHash(s);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThan(2 ** 32);
    }
  });
});

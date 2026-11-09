import { describe, expect, it } from 'vitest';
import { joinNL } from './joinNL';
import { mean, median, stdev } from './stats';

describe('stats', () => {
  it('rekent gemiddelde, afwijking en midden', () => {
    expect(mean([2, 4, 6])).toBe(4);
    expect(stdev([2, 4, 4, 4, 5, 5, 7, 9])).toBe(2);
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });
  it('geeft bij een lege lijst NaN, zoals de losse versies deden', () => {
    expect(mean([])).toBeNaN();
    expect(stdev([])).toBeNaN();
    expect(median([])).toBeNaN();
  });
});

describe('joinNL', () => {
  it('voegt samen met komma en "en"', () => {
    expect(joinNL([])).toBe('');
    expect(joinNL(['a'])).toBe('a');
    expect(joinNL(['a', 'b'])).toBe('a en b');
    expect(joinNL(['a', 'b', 'c'])).toBe('a, b en c');
  });
});

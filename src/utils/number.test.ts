import { describe, it, expect } from 'vitest';
import { parseNumberNL, formatWhileTypingNL, formatNumberNL } from './number';

describe('parseNumberNL', () => {
  it('reads a dot as a thousands separator (production bug: 30.000 became 30)', () => {
    expect(parseNumberNL('30.000').value).toBe(30000);
    expect(parseNumberNL('300.000').value).toBe(300000);
    expect(parseNumberNL('1.200.000').value).toBe(1200000);
    expect(parseNumberNL('600').value).toBe(600);
  });

  it('reads a comma as the decimal separator', () => {
    expect(parseNumberNL('12,5', 1).value).toBe(12.5);
    expect(parseNumberNL('1.234,5', 1).value).toBe(1234.5);
  });

  it('warns on an English decimal point in a decimal field instead of guessing silently', () => {
    const r = parseNumberNL('1.5', 1);
    expect(r.value).toBe(1.5);
    expect(r.warning).toContain('1,5');
  });

  it('rounds decimals away in a whole-number field, with a warning', () => {
    expect(parseNumberNL('12,5', 0)).toEqual({ value: 13, warning: 'Dit veld rekent in hele getallen.' });
  });

  it('returns undefined for empty or unreadable text', () => {
    expect(parseNumberNL('').value).toBeUndefined();
    expect(parseNumberNL('abc').value).toBeUndefined();
  });
});

describe('formatWhileTypingNL', () => {
  it('groups thousands as the user types', () => {
    expect(formatWhileTypingNL('30000')).toBe('30.000');
    // typing on after an automatic grouping: "3.000" + "0"
    expect(formatWhileTypingNL('3.0000')).toBe('30.000');
    expect(formatWhileTypingNL('3.0000', 1)).toBe('30.000');
    expect(formatWhileTypingNL('3000,5', 1)).toBe('3.000,5');
  });

  it('never rewrites a half-typed decimal point', () => {
    expect(formatWhileTypingNL('1.5', 1)).toBe('1.5');
  });
});

describe('formatNumberNL', () => {
  it('formats with Dutch separators, always grouping from 1.000', () => {
    expect(formatNumberNL(30000, 0)).toBe('30.000');
    expect(formatNumberNL(1500, 0)).toBe('1.500');
    expect(formatNumberNL(12.5, 1)).toBe('12,5');
    expect(formatNumberNL(17.14, 1)).toBe('17,1');
  });
});

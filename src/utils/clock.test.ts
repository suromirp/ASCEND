import { describe, expect, it } from 'vitest';
import { formatClock } from './clock';

describe('formatClock', () => {
  it('schrijft 24 uur met een dubbele punt en twee cijfers', () => {
    expect(formatClock(new Date(2026, 10, 2, 13, 5))).toBe('13:05');
    expect(formatClock(new Date(2026, 10, 2, 6, 11))).toBe('06:11');
    expect(formatClock(new Date(2026, 10, 2, 0, 0))).toBe('00:00');
    expect(formatClock(new Date(2026, 10, 2, 23, 59))).toBe('23:59');
  });
  it('leest een getal en een tekst met een datum, in de tijd van het toestel', () => {
    const d = new Date(2026, 10, 2, 9, 7);
    expect(formatClock(d.getTime())).toBe('09:07');
    expect(formatClock(d.toISOString())).toBe('09:07');
  });
  it('geeft niets terug voor een tijd die niet te lezen is', () => {
    expect(formatClock('geen tijd')).toBe('');
    expect(formatClock(Number.NaN)).toBe('');
  });
  it('gebruikt nergens een punt tussen uren en minuten', () => {
    for (let h = 0; h < 24; h++) expect(formatClock(new Date(2026, 10, 2, h, 5))).toMatch(/^\d{2}:\d{2}$/);
  });
});

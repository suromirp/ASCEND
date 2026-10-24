import { describe, expect, it } from 'vitest';
import { hoursMinutes } from './hoursMinutes';

describe('hoursMinutes', () => {
  it('toont uren en twee cijfers minuten', () => {
    expect(hoursMinutes(0)).toBe('0:00');
    expect(hoursMinutes(5)).toBe('0:05');
    expect(hoursMinutes(60)).toBe('1:00');
    expect(hoursMinutes(141)).toBe('2:21');
  });

  it('rondt eerst af op hele minuten, dan pas uren en minuten', () => {
    expect(hoursMinutes(119.6)).toBe('2:00');
    expect(hoursMinutes(59.5)).toBe('1:00');
    expect(hoursMinutes(59.4)).toBe('0:59');
    expect(hoursMinutes(179.9)).toBe('3:00');
  });

  it('houdt negatieve en ongeldige waarden op nul', () => {
    expect(hoursMinutes(-3)).toBe('0:00');
    expect(hoursMinutes(Number.NaN)).toBe('0:00');
  });
});

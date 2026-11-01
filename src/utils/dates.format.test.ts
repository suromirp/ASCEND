import { describe, it, expect, afterEach, vi } from 'vitest';
import { formatDateNL, formatHoursMinutesNL, formatShortDayNL } from './dates';

// Lookout punt 6: overal dezelfde regel voor het jaartal, alleen als het niet
// dit jaar is.
describe('datum met of zonder jaartal', () => {
  afterEach(() => vi.useRealTimers());

  it('noemt het jaartal alleen buiten het huidige jaar, lang en kort', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-23T08:00:00'));
    expect(formatDateNL('2026-12-14')).toBe('14 december');
    expect(formatDateNL('2027-02-08')).toBe('8 februari 2027');
    expect(formatShortDayNL('2026-12-14')).toBe('ma 14 dec');
    expect(formatShortDayNL('2027-02-08')).toBe('ma 8 feb 2027');
  });
});

describe('formatHoursMinutesNL', () => {
  it('toont minuten, hele uren en uren met minuten', () => {
    expect(formatHoursMinutesNL(45)).toBe('45 min');
    expect(formatHoursMinutesNL(60)).toBe('1 uur');
    expect(formatHoursMinutesNL(68)).toBe('1 uur 8 min');
    expect(formatHoursMinutesNL(385)).toBe('6 uur 25 min');
  });
  it('rondt af op hele minuten en laat niets onder nul komen', () => {
    expect(formatHoursMinutesNL(119.6)).toBe('2 uur');
    expect(formatHoursMinutesNL(0)).toBe('0 min');
    expect(formatHoursMinutesNL(-5)).toBe('0 min');
  });
});

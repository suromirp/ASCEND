import { describe, it, expect, afterEach, vi } from 'vitest';
import { formatDateNL, formatShortDayNL } from './dates';

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

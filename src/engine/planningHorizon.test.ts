import { describe, it, expect } from 'vitest';
import { resolveHorizonZone, committedWeekStartDates, isDateInCommittedRange, isDateInForecastRange } from './planningHorizon';

// A fixed Monday for deterministic tests.
const THIS_MONDAY = '2026-09-07';
const LAST_MONDAY = '2026-08-31';
const NEXT_MONDAY = '2026-09-14';
const WEEK_AFTER_MONDAY = '2026-09-21';
const ASOF = '2026-09-09'; // a Wednesday within THIS_MONDAY's week

describe('resolveHorizonZone', () => {
  it('reads a past week as locked', () => {
    expect(resolveHorizonZone(LAST_MONDAY, ASOF)).toBe('locked');
  });

  it('reads the current week as committed', () => {
    expect(resolveHorizonZone(THIS_MONDAY, ASOF)).toBe('committed');
  });

  it('reads next week as committed too', () => {
    expect(resolveHorizonZone(NEXT_MONDAY, ASOF)).toBe('committed');
  });

  it('reads week +2 onward as forecast', () => {
    expect(resolveHorizonZone(WEEK_AFTER_MONDAY, ASOF)).toBe('forecast');
  });
});

describe('committedWeekStartDates', () => {
  it('returns exactly the current and next Monday', () => {
    expect(committedWeekStartDates(ASOF)).toEqual([THIS_MONDAY, NEXT_MONDAY]);
  });
});

describe('isDateInCommittedRange', () => {
  it('accepts a date inside next week', () => {
    expect(isDateInCommittedRange('2026-09-16', ASOF)).toBe(true);
  });

  it('rejects a date two weeks out', () => {
    expect(isDateInCommittedRange('2026-09-22', ASOF)).toBe(false);
  });

  it('rejects a date already in the past', () => {
    expect(isDateInCommittedRange('2026-08-15', ASOF)).toBe(false);
  });
});

describe('isDateInForecastRange', () => {
  it('rejects a date inside the committed range', () => {
    expect(isDateInForecastRange('2026-09-16', ASOF)).toBe(false);
  });

  it('accepts a date two weeks out — the only range the Adaptive Replanner may touch', () => {
    expect(isDateInForecastRange('2026-09-22', ASOF)).toBe(true);
  });

  it('rejects a date already in the past', () => {
    expect(isDateInForecastRange('2026-08-15', ASOF)).toBe(false);
  });
});

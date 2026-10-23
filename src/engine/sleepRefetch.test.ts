import { describe, it, expect } from 'vitest';
import { shouldRefetchSleep } from './sleepRefetch';

const base = { now: new Date(2026, 9, 22, 8, 30), linked: true, sleepOn: true, hasSleepToday: false, fetchedAt: new Date(2026, 9, 22, 7, 50).toISOString(), busy: false };

describe('shouldRefetchSleep', () => {
  it('haalt opnieuw op in de ochtend als slaap ontbreekt en de laatste ronde langer dan 15 minuten geleden is', () => {
    expect(shouldRefetchSleep(base)).toBe(true);
    expect(shouldRefetchSleep({ ...base, fetchedAt: undefined })).toBe(true);
  });

  it('wacht binnen 15 minuten na de vorige ronde', () => {
    expect(shouldRefetchSleep({ ...base, fetchedAt: new Date(2026, 9, 22, 8, 20).toISOString() })).toBe(false);
  });

  it('doet niets als de slaap er is, er geen horloge is, slaap uit staat of er al iets loopt', () => {
    expect(shouldRefetchSleep({ ...base, hasSleepToday: true })).toBe(false);
    expect(shouldRefetchSleep({ ...base, linked: false })).toBe(false);
    expect(shouldRefetchSleep({ ...base, sleepOn: false })).toBe(false);
    expect(shouldRefetchSleep({ ...base, busy: true })).toBe(false);
  });

  it('doet niets vanaf de middag', () => {
    expect(shouldRefetchSleep({ ...base, now: new Date(2026, 9, 22, 12, 0) })).toBe(false);
  });
});

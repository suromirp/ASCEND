import { describe, it, expect } from 'vitest';
import { DEFAULT_WATCH_USE, filterRecovery, normalizeWatchUse, nothingWanted, wellnessWanted } from './watchUse';
import { todayWellness } from './wellnessCheck';
import type { RecoveryMetric } from '../models/metrics';

const night = (date: string, extra: Partial<RecoveryMetric> = {}): RecoveryMetric => ({
  id: `intervals.icu:${date}`, date, source: 'import', restingHeartRate: 55, hrv: 44, sleepMinutes: 420, sleepScore: 72, ...extra,
});

describe('which watch data is used', () => {
  it('is all on by default, and a damaged record switches nothing off', () => {
    expect(normalizeWatchUse(undefined)).toEqual(DEFAULT_WATCH_USE);
    expect(normalizeWatchUse('rommel')).toEqual(DEFAULT_WATCH_USE);
    expect(normalizeWatchUse({ sleep: 0, hrv: null })).toEqual(DEFAULT_WATCH_USE);
    expect(normalizeWatchUse({ hrv: false })).toEqual({ ...DEFAULT_WATCH_USE, hrv: false });
  });

  it('asks for wellness only while at least one of the three is on', () => {
    expect(wellnessWanted(DEFAULT_WATCH_USE)).toBe(true);
    expect(wellnessWanted({ activities: true, sleep: false, restingHeartRate: false, hrv: false })).toBe(false);
    expect(nothingWanted({ activities: false, sleep: false, restingHeartRate: false, hrv: false })).toBe(true);
    expect(nothingWanted({ activities: false, sleep: false, restingHeartRate: true, hrv: false })).toBe(false);
  });

  it('leaves out the fields that are switched off, and a record with nothing left', () => {
    const metrics = [night('2026-10-20'), night('2026-10-21', { restingHeartRate: undefined, hrv: undefined, sleepScore: undefined })];
    expect(filterRecovery(metrics, DEFAULT_WATCH_USE)).toBe(metrics);
    const noSleep = filterRecovery(metrics, { ...DEFAULT_WATCH_USE, sleep: false });
    expect(noSleep).toHaveLength(1);
    expect(noSleep[0]).toEqual({ id: 'intervals.icu:2026-10-20', date: '2026-10-20', source: 'import', restingHeartRate: 55, hrv: 44 });
    const onlyHrv = filterRecovery(metrics, { ...DEFAULT_WATCH_USE, sleep: false, restingHeartRate: false });
    expect(onlyHrv).toEqual([{ id: 'intervals.icu:2026-10-20', date: '2026-10-20', source: 'import', hrv: 44 }]);
    // The originals are not changed.
    expect(metrics[0].sleepMinutes).toBe(420);
  });
});

describe('the morning check-in with a kind switched off', () => {
  const metrics = Array.from({ length: 10 }, (_, i) => night(`2026-10-${String(10 + i).padStart(2, '0')}`));
  const today = '2026-10-20';
  const keys = (use: Parameters<typeof filterRecovery>[1]) => todayWellness(today, filterRecovery([...metrics, night(today)], use))?.lines.map((l) => l.key);

  it('shows sleep, resting heart rate and HRV when all are on', () => {
    expect(keys(DEFAULT_WATCH_USE)).toEqual(['sleep', 'restingHeartRate', 'hrv']);
  });

  it('drops exactly the line that is switched off, and suggests no sleep answer without sleep', () => {
    expect(keys({ ...DEFAULT_WATCH_USE, hrv: false })).toEqual(['sleep', 'restingHeartRate']);
    expect(keys({ ...DEFAULT_WATCH_USE, restingHeartRate: false })).toEqual(['sleep', 'hrv']);
    expect(keys({ ...DEFAULT_WATCH_USE, sleep: false })).toEqual(['restingHeartRate', 'hrv']);
    expect(todayWellness(today, filterRecovery([...metrics, night(today)], { ...DEFAULT_WATCH_USE, sleep: false }))?.suggestedSleep).toBeUndefined();
  });

  it('shows nothing at all when all three are off', () => {
    expect(todayWellness(today, filterRecovery([...metrics, night(today)], { activities: true, sleep: false, restingHeartRate: false, hrv: false }))).toBeUndefined();
  });
});

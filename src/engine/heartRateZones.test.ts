import { describe, it, expect } from 'vitest';
import { zoneBpm, zoneText } from './heartRateZones';

describe('heart rate zones', () => {
  it('uses LTHR first (Garmin Standaard %LDHS zones)', () => {
    expect(zoneBpm(2, { lthr: 179, maxHr: 204 })).toEqual([145, 159]);
    expect(zoneText(2, 'zone 2', { lthr: 179 })).toBe('zone 2, 145 tot 159 bpm');
  });
  it('matches the watch (Garmin Standaard %LDHS, threshold 178)', () => {
    expect([1, 2, 3, 4].map((i) => zoneBpm(i as 1 | 2 | 3 | 4, { lthr: 178 }))).toEqual([[117, 144], [144, 158], [158, 171], [171, 180]]);
  });
  it('falls back to max HR, and to the zone number alone', () => {
    expect(zoneBpm(2, { maxHr: 200 })).toEqual([120, 140]);
    expect(zoneText(2, 'zone 2', {})).toBe('zone 2');
    expect(zoneText(2, 'zone 2', undefined)).toBe('zone 2');
  });
  it('ignores numbers that cannot be a heart rate', () => {
    expect(zoneBpm(2, { lthr: 17 })).toBeUndefined();
  });
});

import { describe, it, expect } from 'vitest';
import { zoneBpm, zoneText } from './heartRateZones';

describe('heart rate zones', () => {
  it('uses LTHR first (Garmin %LTHR zones)', () => {
    expect(zoneBpm(2, { lthr: 179, maxHr: 204 })).toEqual([143, 159]);
    expect(zoneText(2, 'zone 2', { lthr: 179 })).toBe('zone 2, 143 tot 159 bpm');
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

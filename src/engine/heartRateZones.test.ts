import { describe, it, expect } from 'vitest';
import { zoneBpm, zoneText } from './heartRateZones';

describe('heart rate zones', () => {
  it('uses LTHR first (Friel running zones)', () => {
    expect(zoneBpm(2, { lthr: 178, maxHr: 204 })).toEqual([151, 158]);
    expect(zoneText(2, 'zone 2', { lthr: 178 })).toBe('zone 2, 151 tot 158 bpm');
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

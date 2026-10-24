import { describe, expect, it } from 'vitest';
import { FALLBACK_PLACE, isNightAt, sunDay, sunPlace, sunTimes } from './sun';

// Amsterdam, as a well-known reference point (published tables, within minutes).
const AMS = { lat: 52.37, lon: 4.9 };
const clock = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
const near = (min: number, hhmm: string, tolerance = 6) => {
  const [h, m] = hhmm.split(':').map(Number);
  expect(Math.abs(min - (h * 60 + m)), `${clock(min)} tegen ${hhmm}`).toBeLessThanOrEqual(tolerance);
};

describe('zonsopkomst en zonsondergang', () => {
  it('langste dag: vroeg op, laat onder (zomertijd)', () => {
    const t = sunTimes('2026-06-21', AMS.lat, AMS.lon, 120)!;
    near(t.sunrise, '05:18');
    near(t.sunset, '22:06');
  });

  it('kortste dag: laat op, vroeg onder (wintertijd)', () => {
    const t = sunTimes('2026-12-21', AMS.lat, AMS.lon, 60)!;
    near(t.sunrise, '08:48');
    near(t.sunset, '16:29');
  });

  it('eind oktober, nog zomertijd', () => {
    const t = sunTimes('2026-10-24', AMS.lat, AMS.lon, 120)!;
    near(t.sunrise, '08:22');
    near(t.sunset, '18:28');
  });

  it('geen zonsondergang ver in het noorden in de zomer', () => {
    expect(sunTimes('2026-06-21', 78.2, 15.6, 120)).toBeUndefined();
    expect(sunDay('2026-06-21', 78.2, 15.6, 120)).toBe('always-day');
    expect(sunDay('2026-12-21', 78.2, 15.6, 60)).toBe('always-night');
    expect(isNightAt('always-day', 0)).toBe(false);
    expect(isNightAt('always-night', 12 * 60)).toBe(true);
  });

  it('een zonsondergang na middernacht: alleen dat korte stuk is nacht (noord-IJsland in juni)', () => {
    const day = sunDay('2026-06-10', 65.68, -18.09, 0);
    expect(typeof day).toBe('object');
    const t = day as { sunrise: number; sunset: number };
    expect(t.sunset).toBeLessThan(t.sunrise);
    expect(isNightAt(t, 12 * 60)).toBe(false);
    expect(isNightAt(t, 23 * 60)).toBe(false);
    expect(isNightAt(t, t.sunset + 5)).toBe(true);
    expect(isNightAt(t, t.sunrise + 5)).toBe(false);
  });

  it('zonder plaats het midden van Nederland, met plaats de plaats', () => {
    expect(sunPlace(undefined)).toEqual(FALLBACK_PLACE);
    expect(sunPlace({ name: 'X', lat: 51.5, lon: 4 })).toEqual({ lat: 51.5, lon: 4 });
    expect(sunPlace({ lat: 'x' })).toEqual(FALLBACK_PLACE);
  });
});

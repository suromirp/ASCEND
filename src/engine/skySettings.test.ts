import { describe, expect, it } from 'vitest';
import { resolveSky, skyModeAt, sunToday } from './skySettings';
import type { SunTimes } from './sun';

const at = (h: number, m = 0) => new Date(2026, 9, 24, h, m);

describe('resolveSky', () => {
  it('zonder keuze: op tijd, met de zon', () => {
    expect(resolveSky(undefined)).toEqual({ sky: 'auto', nightFrom: 'zon' });
  });

  it('negeert onzin', () => {
    expect(resolveSky({ sky: 'zon', skyNightFrom: '23:30' })).toEqual({ sky: 'auto', nightFrom: 'zon' });
    expect(resolveSky({ sky: 'night', skyNightFrom: '21:00' })).toEqual({ sky: 'night', nightFrom: '21:00' });
  });
});

describe('skyModeAt', () => {
  it('een vast uur: licht overdag, donker vanaf de begintijd tot 07:00', () => {
    const fixed = { skyNightFrom: '20:00' };
    expect(skyModeAt(fixed, at(7, 0))).toBe('day');
    expect(skyModeAt(fixed, at(12, 30))).toBe('day');
    expect(skyModeAt(fixed, at(19, 59))).toBe('day');
    expect(skyModeAt(fixed, at(20, 0))).toBe('night');
    expect(skyModeAt(fixed, at(23, 59))).toBe('night');
    expect(skyModeAt(fixed, at(0, 0))).toBe('night');
    expect(skyModeAt(fixed, at(6, 59))).toBe('night');
  });

  it('met de zon (het advies): donker na zonsondergang, licht na zonsopkomst op je plek', () => {
    // Midday is day and midnight is night in every time zone the tests run in.
    expect(skyModeAt({}, at(12, 0))).toBe('day');
    expect(skyModeAt({}, at(0, 30))).toBe('night');
    const sun = sunToday(undefined, at(12, 0)) as SunTimes;
    const before = new Date(2026, 9, 24, 0, sun.sunset - 1);
    const after = new Date(2026, 9, 24, 0, sun.sunset + 1);
    expect(skyModeAt({}, before)).toBe('day');
    expect(skyModeAt({}, after)).toBe('night');
    expect(skyModeAt({}, new Date(2026, 9, 24, 0, sun.sunrise - 1))).toBe('night');
    expect(skyModeAt({}, new Date(2026, 9, 24, 0, sun.sunrise + 1))).toBe('day');
  });

  it('met de zon volgt de gekozen plaats', () => {
    // Far to the west the sun sets later on the same clock.
    const west = sunToday({ lat: 52, lon: -10 }, at(12)) as SunTimes;
    const home = sunToday({ lat: 52, lon: 5 }, at(12)) as SunTimes;
    expect(west.sunset).toBeGreaterThan(home.sunset);
  });

  it('volgt de gekozen begintijd', () => {
    expect(skyModeAt({ skyNightFrom: '22:00' }, at(21, 30))).toBe('day');
    expect(skyModeAt({ skyNightFrom: '22:00' }, at(22, 0))).toBe('night');
    expect(skyModeAt({ skyNightFrom: '19:00' }, at(19, 0))).toBe('night');
  });

  it('altijd licht en altijd donker negeren de klok', () => {
    expect(skyModeAt({ sky: 'day' }, at(2))).toBe('day');
    expect(skyModeAt({ sky: 'night' }, at(12))).toBe('night');
  });
});

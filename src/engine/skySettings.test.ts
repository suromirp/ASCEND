import { describe, expect, it } from 'vitest';
import { resolveSky, skyModeAt } from './skySettings';

const at = (h: number, m = 0) => new Date(2026, 9, 24, h, m);

describe('resolveSky', () => {
  it('zonder keuze: op tijd, donker vanaf 20:00', () => {
    expect(resolveSky(undefined)).toEqual({ sky: 'auto', nightFrom: '20:00' });
  });

  it('negeert onzin', () => {
    expect(resolveSky({ sky: 'zon', skyNightFrom: '23:30' })).toEqual({ sky: 'auto', nightFrom: '20:00' });
    expect(resolveSky({ sky: 'night', skyNightFrom: '21:00' })).toEqual({ sky: 'night', nightFrom: '21:00' });
  });
});

describe('skyModeAt', () => {
  it('op tijd: licht overdag, donker vanaf de begintijd tot 07:00', () => {
    expect(skyModeAt({}, at(7, 0))).toBe('day');
    expect(skyModeAt({}, at(12, 30))).toBe('day');
    expect(skyModeAt({}, at(19, 59))).toBe('day');
    expect(skyModeAt({}, at(20, 0))).toBe('night');
    expect(skyModeAt({}, at(23, 59))).toBe('night');
    expect(skyModeAt({}, at(0, 0))).toBe('night');
    expect(skyModeAt({}, at(6, 59))).toBe('night');
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

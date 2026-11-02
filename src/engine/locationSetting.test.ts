import { describe, expect, it } from 'vitest';
import { locationEnabled, locationFailureText, locationKeepsSearchedPlace, locationSummary } from './locationSetting';

describe('Je locatie', () => {
  it('staat standaard uit', () => {
    expect(locationEnabled({})).toBe(false);
    expect(locationEnabled({ locationOn: false })).toBe(false);
    expect(locationEnabled({ locationOn: true })).toBe(true);
  });

  it('blijft aan voor wie het weer al liet volgen via Mijn locatie', () => {
    expect(locationEnabled({ homeLocation: { name: 'Mijn locatie' } })).toBe(true);
    expect(locationEnabled({ homeLocation: { name: 'Mijn locatie' }, locationOn: false })).toBe(false);
    expect(locationEnabled({ homeLocation: { name: 'Utrecht' } })).toBe(false);
  });

  it('geeft bij elke mislukking een zin die zegt wat je kunt doen', () => {
    for (const reason of ['unsupported', 'denied', 'unavailable', 'timeout'] as const) {
      const text = locationFailureText(reason);
      expect(text.length).toBeGreaterThan(20);
      expect(text).toContain('blijft uit');
      expect(text).not.toMatch(/[–—]/);
    }
  });

  it('laat een zelf gezochte plaats van het weer staan', () => {
    expect(locationKeepsSearchedPlace({ name: 'Utrecht' })).toBe('Utrecht');
    expect(locationKeepsSearchedPlace({ name: 'Mijn locatie' })).toBeUndefined();
    expect(locationKeepsSearchedPlace(undefined)).toBeUndefined();
  });

  it('vat samen', () => {
    expect(locationSummary({})).toEqual({ checked: false });
    expect(locationSummary({ locationOn: true })).toEqual({ checked: true });
  });
});

import { describe, expect, it } from 'vitest';
import { autoLocateAllowed, weatherFollowsLocation, weatherLocateText, locationEnabled, locationFailureText, locationKeepsSearchedPlace, locationSummary } from './locationSetting';

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

describe('wat Je locatie bepaalt', () => {
  it('het weer volgt je plek alleen met Je locatie aan', () => {
    const mine = { name: 'Mijn locatie' };
    expect(weatherFollowsLocation({ locationOn: false, homeLocation: mine })).toBe(false);
    expect(weatherFollowsLocation({ locationOn: true })).toBe(true);
    expect(weatherFollowsLocation({ locationOn: true, overviews: { weatherFollowsLocation: false } })).toBe(false);
  });
  it('vraagt uit zichzelf alleen met een toestemming die er al is', () => {
    expect(autoLocateAllowed('granted')).toBe(true);
    for (const p of ['prompt', 'denied', 'unknown'] as const) expect(autoLocateAllowed(p)).toBe(false);
  });
  it('Gebruik mijn locatie zegt dat Je locatie aanging', () => {
    expect(weatherLocateText(false)).toContain('staat nu aan');
    expect(weatherLocateText(true)).not.toContain('staat nu aan');
  });
});

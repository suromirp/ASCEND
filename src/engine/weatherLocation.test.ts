import { describe, it, expect } from 'vitest';
import { followSkipReason, isMyLocation, movedTo, myLocation, MY_LOCATION_NAME, type FollowInput } from './weatherLocation';
import { DEFAULT_OVERVIEWS, followsLocation, resolveOverviews } from './overviewSettings';
import { WEATHER_RULES, weatherRuleRows } from './weather';

const NOW = new Date('2026-10-22T12:00:00Z');
const base: FollowInput = { enabled: true, place: { name: MY_LOCATION_NAME }, permission: 'granted', lastCheckedAt: undefined, now: NOW };
const minutesAgo = (n: number) => new Date(NOW.getTime() - n * 60_000).toISOString();

describe('followSkipReason', () => {
  it('follows when it is on, the place is Mijn locatie and the permission is already given', () => {
    expect(followSkipReason(base)).toBeUndefined();
  });

  it('does nothing when the setting is off', () => {
    expect(followSkipReason({ ...base, enabled: false })).toBe('uit');
  });

  it('leaves a place you searched yourself alone, and so also no place at all', () => {
    expect(followSkipReason({ ...base, place: { name: 'Teststad' } })).toBe('eigen-plaats');
    expect(followSkipReason({ ...base, place: undefined })).toBe('eigen-plaats');
  });

  it('never asks: without a given permission nothing happens', () => {
    for (const permission of ['prompt', 'denied', 'unknown'] as const) {
      expect(followSkipReason({ ...base, permission })).toBe('geen-toestemming');
    }
  });

  it('at most once an hour', () => {
    expect(followSkipReason({ ...base, lastCheckedAt: minutesAgo(59) })).toBe('te-vroeg');
    expect(followSkipReason({ ...base, lastCheckedAt: minutesAgo(60) })).toBeUndefined();
    expect(followSkipReason({ ...base, lastCheckedAt: 'rommel' })).toBeUndefined();
  });
});

describe('places', () => {
  it('knows Mijn locatie by name', () => {
    expect(isMyLocation(myLocation(52.1, 5.3))).toBe(true);
    expect(isMyLocation({ name: 'Teststad' })).toBe(false);
  });

  it('a move under a kilometre is not a move', () => {
    const here = { lat: 52.1, lon: 5.3 };
    expect(movedTo(here, { lat: 52.1, lon: 5.3 })).toBe(false);
    expect(movedTo(here, { lat: 52.11, lon: 5.3 })).toBe(true);
    expect(movedTo(here, { lat: 52.1, lon: 5.31 })).toBe(true);
    expect(movedTo(undefined, here)).toBe(true);
  });
});

describe('the setting', () => {
  it('is on unless you turned it off, and reads rubbish as the default', () => {
    expect(DEFAULT_OVERVIEWS.weatherFollowsLocation).toBe(true);
    expect(followsLocation(undefined)).toBe(true);
    expect(followsLocation({ weatherFollowsLocation: false })).toBe(false);
    expect(resolveOverviews({ weatherFollowsLocation: 'nee' } as never).weatherFollowsLocation).toBe(true);
  });
});

describe('weatherRuleRows', () => {
  it('writes the engine thresholds, so the page cannot say anything else', () => {
    const { watch, bad } = weatherRuleRows();
    const text = (rows: { label: string; text: string }[], label: string) => rows.find((r) => r.label === label)?.text ?? '';
    expect(text(watch, 'Warm')).toBe(`voelt als ${WEATHER_RULES.heatWatch}° of meer`);
    expect(text(watch, 'Wind')).toBe(`gemiddeld ${WEATHER_RULES.windWatch} km/u of vlagen ${WEATHER_RULES.gustWatch}`);
    expect(text(watch, 'Koud')).toContain(`${WEATHER_RULES.coldWatch}°`);
    expect(text(watch, 'Regen')).toContain('0,5 mm');
    expect(text(bad, 'Storm')).toBe(`gemiddeld ${WEATHER_RULES.windBad} km/u of vlagen ${WEATHER_RULES.gustBad}`);
    expect(text(bad, 'Zware regen')).toContain(`${WEATHER_RULES.rainBadTotal} mm`);
    expect(text(bad, 'Extreme hitte')).toContain(`${WEATHER_RULES.heatBad}°`);
    expect(text(bad, 'Strenge kou')).toContain(`${WEATHER_RULES.coldBad}°`);
  });
});

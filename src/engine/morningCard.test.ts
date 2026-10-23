import { describe, it, expect } from 'vitest';
import type { MorningCheckIn } from '../models/checkIn';
import { MORNING_CARD_UNTIL_HOUR, morningPrefill, showMorningCard, suggestLegs } from './morningCard';

const TODAY = '2026-10-22';
const fresh = { index: 2, painRecent: false, contributions: [{ id: 'a' }] } as Parameters<typeof suggestLegs>[0] & object;

describe('showMorningCard', () => {
  const base = { enabled: true, hour: 8, fromHour: 5, checkIn: undefined as MorningCheckIn | undefined, trainedToday: false };

  it('shows in the morning while today is not filled in', () => {
    expect(showMorningCard(base)).toBe(true);
    expect(showMorningCard({ ...base, hour: MORNING_CARD_UNTIL_HOUR - 1 })).toBe(true);
  });

  it('is gone from noon, after a training of today is logged, once filled in, or when switched off', () => {
    expect(showMorningCard({ ...base, hour: MORNING_CARD_UNTIL_HOUR })).toBe(false);
    expect(showMorningCard({ ...base, trainedToday: true })).toBe(false);
    expect(showMorningCard({ ...base, checkIn: { date: TODAY, allNormal: true } })).toBe(false);
    expect(showMorningCard({ ...base, enabled: false })).toBe(false);
  });

  it('is not there yet after midnight, only from the chosen hour', () => {
    expect(showMorningCard({ ...base, hour: 0 })).toBe(false);
    expect(showMorningCard({ ...base, hour: 4 })).toBe(false);
    expect(showMorningCard({ ...base, hour: 5 })).toBe(true);
    expect(showMorningCard({ ...base, hour: 4, fromHour: 4 })).toBe(true);
  });
});

describe('suggestLegs', () => {
  it('knows nothing without a leg index or without anything that still counts', () => {
    expect(suggestLegs(undefined)).toBeUndefined();
    expect(suggestLegs({ ...fresh, index: 0, contributions: [] })).toBeUndefined();
  });

  it('follows the words of the leg index: fris, wat vermoeid, vermoeid', () => {
    expect(suggestLegs(fresh)).toBe('fris');
    expect(suggestLegs({ ...fresh, index: 10 })).toBe('stijf');
    expect(suggestLegs({ ...fresh, index: 15 })).toBe('spierpijn');
  });

  it('never suggests flinke spierpijn, and never fris with leg pain in the last days', () => {
    expect(suggestLegs({ ...fresh, index: 40 })).toBe('spierpijn');
    expect(suggestLegs({ ...fresh, painRecent: true })).toBe('stijf');
  });
});

describe('morningPrefill', () => {
  it('gives every value its source', () => {
    const p = morningPrefill({ legIndex: fresh, reading: { date: TODAY, lines: [], suggestedSleep: 'goed', suggestedEnergy: 'moe' } });
    expect(p).toEqual({
      legs: { value: 'fris', from: 'beenindex' },
      sleep: { value: 'goed', from: 'horloge' },
      energy: { value: 'moe', from: 'horloge' },
    });
  });

  it('leaves out what it does not know', () => {
    expect(morningPrefill({ legIndex: undefined, reading: undefined })).toEqual({});
  });
});

import { describe, expect, it } from 'vitest';
import { DEFAULT_RESUME_MINUTES, DEFAULT_TAB_BACK, resolveNavigation, resumeLabel } from './navigationSettings';

describe('resolveNavigation', () => {
  it('zonder instelling geldt het advies', () => {
    expect(resolveNavigation(undefined)).toEqual({ tabBack: DEFAULT_TAB_BACK, resumeMinutes: DEFAULT_RESUME_MINUTES });
    expect(resolveNavigation({})).toEqual({ tabBack: 'today', resumeMinutes: 120 });
  });

  it('een gekozen waarde blijft, ook 0 (uit)', () => {
    expect(resolveNavigation({ tabBack: 'previous', resumeMinutes: 0 })).toEqual({ tabBack: 'previous', resumeMinutes: 0 });
    expect(resolveNavigation({ resumeMinutes: 480 }).resumeMinutes).toBe(480);
  });

  it('rommel valt terug op het advies', () => {
    expect(resolveNavigation({ tabBack: 'x', resumeMinutes: 7 })).toEqual({ tabBack: 'today', resumeMinutes: 120 });
    expect(resolveNavigation({ resumeMinutes: Number.NaN }).resumeMinutes).toBe(120);
  });
});

describe('resumeLabel', () => {
  it('schrijft uit, minuten en uren', () => {
    expect(resumeLabel(0)).toBe('Uit');
    expect(resumeLabel(30)).toBe('30 minuten');
    expect(resumeLabel(60)).toBe('1 uur');
    expect(resumeLabel(120)).toBe('2 uur');
    expect(resumeLabel(480)).toBe('8 uur');
  });
});

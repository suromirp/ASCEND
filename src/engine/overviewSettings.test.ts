import { describe, expect, it } from 'vitest';
import type { SessionLog } from '../models/training';
import { DEFAULT_OVERVIEWS, morningCheckInMode, needsWeather, resolveOverviews, showMorningCheckInCard, reviewWeekToShow, showCompletionQuote, showMorningCheckIn, showMorningCardSetting, showWeatherLine, showWeatherSwap, showWeeklyQuestion } from './overviewSettings';
import { reviewWeekFor } from './weekReview';

describe('resolveOverviews', () => {
  it('zonder opgeslagen waarden geldt het gedrag van altijd', () => {
    expect(resolveOverviews(undefined)).toEqual(DEFAULT_OVERVIEWS);
    expect(resolveOverviews({})).toEqual(DEFAULT_OVERVIEWS);
    expect(Object.values(DEFAULT_OVERVIEWS).every((v) => v === true || v === 'both')).toBe(true);
  });

  it('een deels ingevulde instelling vult de rest met de standaard aan', () => {
    const r = resolveOverviews({ weeklyQuestion: false });
    expect(r.weeklyQuestion).toBe(false);
    expect(r.weekReview).toBe(true);
    expect(r.morningCheckIn).toBe(true);
  });

  it('onzin uit een oude of beschadigde back-up valt terug op de standaard', () => {
    const r = resolveOverviews({ weekReview: 'nee', weekReviewDay: 'woensdag', weatherLine: 0 } as never);
    expect(r).toEqual(DEFAULT_OVERVIEWS);
  });
});

describe('reviewWeekToShow', () => {
  // 2026-10-11 is een zondag, 2026-10-12 een maandag, 2026-10-14 een woensdag.
  it('standaard hetzelfde als reviewWeekFor', () => {
    for (const [d, wd] of [['2026-10-11', 7], ['2026-10-12', 1], ['2026-10-14', 3]] as const) {
      expect(reviewWeekToShow(d, wd, undefined)).toBe(reviewWeekFor(d, wd));
    }
  });
  it('uit: nooit', () => {
    expect(reviewWeekToShow('2026-10-11', 7, { weekReview: false })).toBeUndefined();
    expect(reviewWeekToShow('2026-10-12', 1, { weekReview: false })).toBeUndefined();
  });
  it('alleen zondag', () => {
    expect(reviewWeekToShow('2026-10-11', 7, { weekReviewDay: 'sunday' })).toBe('2026-10-05');
    expect(reviewWeekToShow('2026-10-12', 1, { weekReviewDay: 'sunday' })).toBeUndefined();
  });
  it('alleen maandag', () => {
    expect(reviewWeekToShow('2026-10-11', 7, { weekReviewDay: 'monday' })).toBeUndefined();
    expect(reviewWeekToShow('2026-10-12', 1, { weekReviewDay: 'monday' })).toBe('2026-10-05');
  });
});

describe('de losse schakelaars', () => {
  it('staan standaard aan en gaan uit als je dat kiest', () => {
    const fns = [
      ['weeklyQuestion', showWeeklyQuestion],
      ['morningCheckIn', showMorningCheckIn],
      ['weatherLine', showWeatherLine],
      ['weatherSwap', showWeatherSwap],
      ['completionMoment', showCompletionQuote],
    ] as const;
    for (const [key, fn] of fns) {
      expect(fn(undefined)).toBe(true);
      expect(fn({ [key]: false })).toBe(false);
      expect(fn({ [key]: true })).toBe(true);
    }
  });
});

const painLog = (date: string, score: number): SessionLog => ({ id: `l-${date}`, templateId: 'tpl_easy_run', type: 'cardio', completedDate: date, completedAt: `${date}T10:00:00Z`, variant: 'full', durationMinutes: 40, source: 'manual', painReports: [{ area: 'Knie', score }] });

describe('de ochtendcheck en een pijnplek', () => {
  it('aan: altijd te zien', () => {
    expect(showMorningCheckInCard(undefined, '2026-11-03', [])).toBe(true);
  });
  it('uit zonder pijnplek: weg', () => {
    expect(showMorningCheckInCard({ morningCheckIn: false }, '2026-11-03', [])).toBe(false);
  });
  it('uit, maar een pijnplek van de laatste 14 dagen blijft gevolgd', () => {
    expect(showMorningCheckInCard({ morningCheckIn: false }, '2026-11-03', [painLog('2026-11-02', 3)])).toBe(true);
    expect(showMorningCheckInCard({ morningCheckIn: false }, '2026-11-14', [painLog('2026-11-01', 3)])).toBe(true);
  });
  it('uit, en de pijn is ouder dan 14 dagen: weg', () => {
    expect(showMorningCheckInCard({ morningCheckIn: false }, '2026-11-20', [painLog('2026-11-01', 3)])).toBe(false);
  });
});

describe('de ochtendcheck: de hele check of alleen de pijnplek', () => {
  it('aan: de hele check, ook met een pijnplek', () => {
    expect(morningCheckInMode(undefined, '2026-11-03', [])).toBe('full');
    expect(morningCheckInMode({ morningCheckIn: true }, '2026-11-03', [painLog('2026-11-02', 3)])).toBe('full');
  });
  it('uit met een pijnplek van de laatste 14 dagen: alleen het opvolgen van die plek', () => {
    expect(morningCheckInMode({ morningCheckIn: false }, '2026-11-03', [painLog('2026-11-02', 3)])).toBe('pain_only');
  });
  it('uit zonder pijnplek, of met een oude: niets', () => {
    expect(morningCheckInMode({ morningCheckIn: false }, '2026-11-03', [])).toBe('none');
    expect(morningCheckInMode({ morningCheckIn: false }, '2026-11-20', [painLog('2026-11-01', 3)])).toBe('none');
  });
});

describe('het citaat na een training', () => {
  it('uit haalt alleen het citaat weg, behalve bij een mijlpaal', () => {
    expect(showCompletionQuote({ completionMoment: false })).toBe(false);
    expect(showCompletionQuote({ completionMoment: false }, true)).toBe(true);
    expect(showCompletionQuote(undefined)).toBe(true);
  });
});

describe('het weer ophalen', () => {
  it('alleen als de weerregel of de ruilvoorstellen aan staan', () => {
    expect(needsWeather(undefined)).toBe(true);
    expect(needsWeather({ weatherLine: false })).toBe(true);
    expect(needsWeather({ weatherSwap: false })).toBe(true);
    expect(needsWeather({ weatherLine: false, weatherSwap: false })).toBe(true);
    expect(needsWeather({ weatherLine: false, weatherSwap: false, clothingAdvice: false })).toBe(false);
    expect(needsWeather({ clothingAdvice: false })).toBe(true);
  });
});

describe('de ochtendkaart', () => {
  it('staat standaard aan en hoort bij de ochtendcheck', () => {
    expect(DEFAULT_OVERVIEWS.morningCard).toBe(true);
    expect(showMorningCardSetting(undefined)).toBe(true);
    expect(showMorningCardSetting({ morningCard: false })).toBe(false);
    expect(showMorningCardSetting({ morningCheckIn: false })).toBe(false);
  });
});

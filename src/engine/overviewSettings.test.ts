import { describe, expect, it } from 'vitest';
import { DEFAULT_OVERVIEWS, resolveOverviews, reviewWeekToShow, showCompletionMoment, showMorningCheckIn, showWeatherLine, showWeatherSwap, showWeeklyQuestion } from './overviewSettings';
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
      ['completionMoment', showCompletionMoment],
    ] as const;
    for (const [key, fn] of fns) {
      expect(fn(undefined)).toBe(true);
      expect(fn({ [key]: false })).toBe(false);
      expect(fn({ [key]: true })).toBe(true);
    }
  });
});

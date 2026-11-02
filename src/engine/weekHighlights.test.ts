import { describe, it, expect } from 'vitest';
import { weekHighlights, weekSummaryLine, joinNames } from './weekHighlights';
import type { WeekReview } from './weekReview';

const base: WeekReview = {
  weekStart: '2026-10-26', title: 'Week 1 van 4, basisfase', done: 2, planned: 5, minutes: 116, perSport: ['Hardlopen: 8,6 km'], missed: [], missedTemplateIds: [],
  keyPlanned: 1, keyDone: 1, heavier: 0, pain: [], lighter: 0, effort: { easy: 80, hard: 36, uncounted: 0 }, running: false, todayLeft: 0, changes: [], advice: [],
};

describe('joinNames', () => {
  it('zet en tussen de laatste twee', () => {
    expect(joinNames(['A', 'B', 'C'])).toBe('A, B en C');
    expect(joinNames(['A'])).toBe('A');
  });
});

describe('weekHighlights', () => {
  it('zet pijn eerst en hoogstens twee regels', () => {
    const h = weekHighlights({ ...base, pain: ['knie 2 keer'], missed: ['Benen A'], missedTemplateIds: ['x'], heavier: 2, advice: ['x'] });
    expect(h).toHaveLength(2);
    expect(h[0].tone).toBe('warning');
    expect(h[0].text).toContain('knie 2 keer');
    expect(h[1].text).toContain('Benen A');
  });

  it('noemt een sleuteltraining die bleef liggen met naam', () => {
    const h = weekHighlights({ ...base, missed: ['Lange duurloop'], keyMissedName: 'Lange duurloop' });
    expect(h[0].text).toContain('De lange duurloop is de belangrijkste');
  });

  it('zegt het advies als er niets anders is, en niets zonder advies', () => {
    expect(weekHighlights({ ...base, advice: ['Alles gedaan wat gepland stond. Zo bouw je op.'] })[0].text).toContain('Alles gedaan');
    expect(weekHighlights(base)).toEqual([]);
  });

  it('noemt niets blijven liggen als er niets voor vandaag blijft liggen', () => {
    const h = weekHighlights({ ...base, running: true, todayLeft: 2 });
    expect(h.some((x) => /liggen/.test(x.text))).toBe(false);
  });
});

describe('weekSummaryLine', () => {
  it('geeft de telling, tijd en afstand van een afgesloten week', () => {
    expect(weekSummaryLine(base)).toBe('2 van 5 gedaan · 1:56 uur · hardlopen 8,6 km');
  });
  it('zegt op zondag wat vandaag nog staat', () => {
    expect(weekSummaryLine({ ...base, running: true, todayLeft: 2 })).toBe('2 gedaan, vandaag staan er nog 2 · 1:56 uur · hardlopen 8,6 km');
    expect(weekSummaryLine({ ...base, running: true, todayLeft: 1, minutes: 0, perSport: [] })).toBe('2 gedaan, vandaag staat er nog 1');
  });
  it('is vriendelijk bij een week zonder training', () => {
    expect(weekSummaryLine({ ...base, done: 0, minutes: 0, perSport: [] })).toBe('Deze week kwam het er niet van. Volgende week begint gewoon volgens plan.');
  });
});

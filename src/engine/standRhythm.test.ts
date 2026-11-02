import { describe, it, expect } from 'vitest';
import { buildRhythm, loadVerdict, standSentence } from './standRhythm';
import { adherenceSummary, type Adherence } from './onCourse';
import type { WeekReview } from './weekReview';
import type { WeekLoad } from './standing';

const review = (weekStart: string, done: number, planned: number, over: Partial<WeekReview> = {}): WeekReview => ({
  weekStart, title: '', done, planned, minutes: 0, perSport: [], missed: [], missedTemplateIds: [], keyPlanned: 1, keyDone: 1, heavier: 0, pain: [], lighter: 0,
  effort: { easy: 0, hard: 0, uncounted: 0 }, running: false, todayLeft: 0, changes: [], advice: [], ...over,
});
const adherenceOf = (reviews: WeekReview[]): Adherence => ({
  reviews, weeks: reviews.length, done: reviews.reduce((n, r) => n + r.done, 0), planned: reviews.reduce((n, r) => n + r.planned, 0),
  keyDone: reviews.reduce((n, r) => n + r.keyDone, 0), keyPlanned: reviews.reduce((n, r) => n + r.keyPlanned, 0), enough: reviews.length >= 2,
});

describe('buildRhythm', () => {
  const four = [review('2026-10-19', 5, 6), review('2026-10-12', 4, 6), review('2026-10-05', 6, 6), review('2026-09-28', 3, 5)];

  it('geeft de weken oud naar nieuw en dezelfde telling als de coach', () => {
    const a = adherenceOf(four);
    const r = buildRhythm({ adherence: a, thisWeek: null, streak: 0 });
    expect(r.weeks.map((w) => w.weekStart)).toEqual(['2026-09-28', '2026-10-05', '2026-10-12', '2026-10-19']);
    expect(r.sentence).toBe('Laatste 4 weken: 18 van 23 gedaan.');
    // Het getal is dat van de coach: adherenceSummary zegt hetzelfde "18 van 23".
    expect(adherenceSummary(a)).toContain(r.fact);
    expect(r.verdict).toBe('Bijna op koers');
  });

  it('zet deze week erbij met open rondjes voor wat nog komt, zonder het getal te raken', () => {
    const r = buildRhythm({ adherence: adherenceOf(four), thisWeek: review('2026-10-26', 2, 5, { missed: ['x'], running: true }), streak: 0 });
    const w = r.weeks[r.weeks.length - 1];
    expect(w).toMatchObject({ current: true, done: 2, missed: 1, open: 2 });
    expect(r.fact).toBe('18 van 23');
  });

  it('zegt niets over op rij onder de drie, en een gewone zin vanaf drie', () => {
    expect(buildRhythm({ adherence: adherenceOf(four), thisWeek: null, streak: 2 }).streakLine).toBeUndefined();
    expect(buildRhythm({ adherence: adherenceOf(four), thisWeek: null, streak: 0 }).streakLine).toBeUndefined();
    expect(buildRhythm({ adherence: adherenceOf(four), thisWeek: null, streak: 5 }).streakLine).toBe('Nu 5 trainingsdagen op rij alles gedaan.');
  });

  it('is eerlijk als er nog te weinig weken zijn', () => {
    const r = buildRhythm({ adherence: adherenceOf([review('2026-10-19', 3, 4)]), thisWeek: null, streak: 0 });
    expect(r.enough).toBe(false);
    expect(r.verdict).toBeUndefined();
    expect(r.fact).toBe('nog niets');
  });
});

const load = (i: number, done: number, planned: number, over: Partial<WeekLoad> = {}): WeekLoad => ({
  weekStart: `2026-09-${String(10 + i * 7).padStart(2, '0')}`, items: [], done: { lopen: 0, kracht: 0, wandelen: 0, overig: 0 }, planned: { lopen: 0, kracht: 0, wandelen: 0, overig: 0 },
  doneTotal: done, plannedTotal: planned, estimated: 0, isRestWeek: false, isCurrent: false, ...over,
});

describe('loadVerdict', () => {
  const before = [load(0, 500, 0), load(1, 520, 0), load(2, 540, 0), load(3, 540, 0)];
  it('zegt in lijn, zwaar of rustig met dezelfde grens als de weekbalken', () => {
    expect(loadVerdict([...before, load(4, 300, 200, { isCurrent: true })])?.word).toBe('In lijn');
    expect(loadVerdict([...before, load(4, 300, 400, { isCurrent: true })])?.word).toBe('Zwaar');
    expect(loadVerdict([...before, load(4, 100, 100, { isCurrent: true })])?.word).toBe('Rustig');
  });
  it('zwijgt zonder vergelijking', () => {
    expect(loadVerdict([load(0, 100, 0, { isCurrent: true })])).toBeUndefined();
  });
});

describe('standSentence', () => {
  it('maakt één zin uit de oordelen', () => {
    const rhythm = buildRhythm({ adherence: adherenceOf([review('a', 5, 6), review('b', 5, 6)]), thisWeek: null, streak: 0 });
    expect(standSentence({ legLevel: 0, load: { word: 'Rustig', level: 'rustig', fact: '' }, rhythm, restWeek: false })).toBe('Je benen zijn fris, je week is rustig en je houdt je ritme vast.');
    expect(standSentence({ legLevel: 0, rhythm, restWeek: true })).toContain('Deze week is een rustweek');
  });
  it('blijft leeg zonder oordelen', () => {
    const rhythm = buildRhythm({ adherence: adherenceOf([]), thisWeek: null, streak: 0 });
    expect(standSentence({ legLevel: undefined, rhythm, restWeek: false })).toBe('');
  });
});

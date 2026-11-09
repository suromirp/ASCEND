import { describe, expect, it } from 'vitest';
import type { LeavePeriod } from '../models/leave';
import { leaveWeek, leavePeriodLine, describeBandRange } from './leaveWeek';
import { weekDates } from '../utils/dates';
import { noGymLine } from './noGymDetails';

// Een nagemaakte week: ma 2 t/m zo 8 november 2026 en de week erna.
const WEEK1 = weekDates('2026-11-02');
const WEEK2 = weekDates('2026-11-09');
const noGym = (startDate: string, endDate: string, extra: Partial<LeavePeriod> = {}): LeavePeriod => ({ id: 'ng', kind: 'no_gym', startDate, endDate, noGym: { amount: 'light', strength: 'bodyweight', hills: true }, ...extra });
const holiday = (startDate: string, endDate: string, id = 'hol'): LeavePeriod => ({ id, kind: 'no_training', startDate, endDate });

describe('leaveWeek', () => {
  it('geeft één band per periode, boven de eerste dag, met alle dagen eronder', () => {
    const w = leaveWeek(WEEK1, [noGym('2026-11-04', '2026-11-07', { note: 'Bij de familie' })]);
    expect(w.bands).toHaveLength(1);
    expect(w.bands[0]).toMatchObject({ title: 'Zonder sportschool', range: 'Wo 4 t/m za 7', line: 'Lopen, eigen gewicht, rustig heuvels op', note: 'Bij de familie' });
    expect(w.bands[0].extent).toBeUndefined();
    expect([...w.bandAbove.keys()]).toEqual(['2026-11-04']);
    expect([...w.inBand]).toEqual(['2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07']);
  });
  it('een dag zonder training hoort bij de band (inBand), een dag buiten de periode niet', () => {
    const w = leaveWeek(WEEK1, [holiday('2026-11-05', '2026-11-05')]);
    expect(w.bands[0]).toMatchObject({ title: 'Vakantie', range: 'Do 5', line: 'Geen training' });
    expect(w.inBand.has('2026-11-04')).toBe(false);
    expect(w.inBand.has('2026-11-05')).toBe(true);
  });
  it('een periode over de weekgrens: in elke week één band met de dagen van die week', () => {
    const p = noGym('2026-11-07', '2026-11-11');
    const a = leaveWeek(WEEK1, [p]);
    const b = leaveWeek(WEEK2, [p]);
    expect(a.bands).toHaveLength(1);
    expect(a.bands[0]).toMatchObject({ range: 'Za 7 t/m zo 8', extent: 'loopt door tot wo 11 nov' });
    expect(b.bands).toHaveLength(1);
    expect(b.bands[0]).toMatchObject({ range: 'Ma 9 t/m wo 11', extent: 'sinds za 7 nov' });
    expect(b.bandAbove.get('2026-11-09')).toBe(b.bands[0]);
  });
  it('een periode dwars door een week heeft sinds én loopt door', () => {
    const w = leaveWeek(WEEK2, [holiday('2026-11-05', '2026-11-20')]);
    expect(w.bands[0].extent).toBe('sinds do 5 nov · loopt door tot vr 20 nov');
    expect(w.bands[0].dates).toEqual(WEEK2);
  });
  it('een week zonder periode heeft niets, ook niet voor de lichte dagen bij een tocht', () => {
    expect(leaveWeek(WEEK1, undefined).bands).toEqual([]);
    const trek: LeavePeriod = { id: 't', kind: 'trek', startDate: '2026-11-10', endDate: '2026-11-12', trek: { name: 'Weekend Ardennen', terrain: 'mountain', tent: false, importance: 'training' } };
    expect(leaveWeek(WEEK1, [trek]).inBand.size).toBe(0);
    const w = leaveWeek(WEEK2, [trek]);
    expect(w.quietWord.get('2026-11-10')).toBe('tochtdag');
    expect(leaveWeek(WEEK1, [holiday('2026-11-05', '2026-11-05')]).quietWord.get('2026-11-05')).toBe('vakantie');
    expect(leaveWeek(WEEK1, [noGym('2026-11-05', '2026-11-05')]).quietWord.get('2026-11-05')).toBe('vrij');
    expect(w.bands[0]).toMatchObject({ title: 'Weekend Ardennen', line: 'Wandelen met je rugzak', range: 'Di 10 t/m do 12' });
  });
  it('twee periodes naast elkaar krijgen elk een band; bij overlap telt de strengste en valt de andere in stukken', () => {
    const two = leaveWeek(WEEK1, [noGym('2026-11-02', '2026-11-03'), holiday('2026-11-05', '2026-11-06')]);
    expect(two.bands.map((b) => b.title)).toEqual(['Zonder sportschool', 'Vakantie']);
    const over = leaveWeek(WEEK1, [noGym('2026-11-02', '2026-11-08'), holiday('2026-11-04', '2026-11-05')]);
    expect(over.bands.map((b) => `${b.title} ${b.range}`)).toEqual(['Zonder sportschool Ma 2 t/m di 3', 'Vakantie Wo 4 t/m do 5', 'Zonder sportschool Vr 6 t/m zo 8']);
    expect(over.bands[2].extent).toBe('sinds ma 2 nov');
  });
  it('de regels per soort', () => {
    expect(leavePeriodLine({ id: 'f', kind: 'free_days', startDate: '2026-11-02', endDate: '2026-11-02' })).toBe('Extra tijd');
    expect(noGymLine({ noGym: { amount: 'normal', strength: 'drop', hills: false } })).toBe('Alleen lopen');
    expect(noGymLine({ noGym: { amount: 'normal', strength: 'drop', hills: true } })).toBe('Lopen, rustig heuvels op');
    expect(noGymLine({ noGym: { amount: 'normal', strength: 'bodyweight', hills: false } })).toBe('Lopen, eigen gewicht');
    expect(describeBandRange(['2026-11-02'])).toBe('Ma 2');
  });
});

describe('periodSpan', () => {
  it('zegt de dagen van de hele periode kort', async () => {
    const { periodSpan } = await import('./leaveWeek');
    expect(periodSpan('2026-11-14', '2026-11-18')).toBe('14 t/m 18 nov');
    expect(periodSpan('2026-11-28', '2026-12-02')).toBe('28 nov t/m 2 dec');
    expect(periodSpan('2026-11-14', '2026-11-14')).toBe('14 nov');
  });
});

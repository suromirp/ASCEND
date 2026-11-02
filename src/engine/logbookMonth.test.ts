import { describe, it, expect } from 'vitest';
import { monthCompare, groupByWeek, mondayKey } from './logbookMonth';
import type { SessionLog } from '../models/training';

const log = (id: string, date: string, minutes: number, type: SessionLog['type'] = 'cardio'): SessionLog => ({
  id, plannedSessionId: id, templateId: 'tpl_easy_run', type, completedDate: date, completedAt: `${date}T10:00:00Z`, variant: 'full', durationMinutes: minutes, source: 'manual',
});
const none = new Map();

describe('monthCompare', () => {
  const october = [log('a', '2026-10-02', 60), log('b', '2026-10-05', 60), log('c', '2026-10-09', 60), log('d', '2026-10-20', 120)];

  it('zegt in de eerste dagen van de maand "nog niets" en vergelijkt niet', () => {
    const r = monthCompare({ anchor: '2026-11-02', today: '2026-11-02', logs: october, plannedById: none });
    expect(r.nothingYet).toBe(true);
    expect(r.vs).toBeUndefined();
    expect(r.totals).toEqual({ minutes: 0, count: 0 });
  });

  it('laat de getallen zien als er in een vroege maand al iets is, zonder vergelijking', () => {
    const r = monthCompare({ anchor: '2026-11-02', today: '2026-11-04', logs: [...october, log('n', '2026-11-03', 45)], plannedById: none });
    expect(r.nothingYet).toBe(false);
    expect(r.vs).toBeUndefined();
    expect(r.totals).toEqual({ minutes: 45, count: 1 });
  });

  it('vergelijkt vanaf de zevende dag met dezelfde dagen van vorige maand', () => {
    const r = monthCompare({ anchor: '2026-11-02', today: '2026-11-10', logs: [...october, log('n', '2026-11-03', 90), log('m', '2026-11-08', 60)], plannedById: none });
    expect(r.vs).toMatchObject({ from: '2026-10-01', to: '2026-10-10', whole: false, minutes: 180, count: 3, diffMinutes: -30, diffCount: -1 });
  });

  it('vergelijkt een afgesloten maand met de hele vorige maand', () => {
    const r = monthCompare({ anchor: '2026-10-15', today: '2026-11-10', logs: [...october, log('s', '2026-09-10', 100)], plannedById: none });
    expect(r.vs).toMatchObject({ whole: true, from: '2026-09-01', to: '2026-09-30', minutes: 100, count: 1, diffMinutes: 200, diffCount: 3 });
  });

  it('zwijgt als vorige maand leeg was of de maand nog komt', () => {
    expect(monthCompare({ anchor: '2026-10-15', today: '2026-11-10', logs: october, plannedById: none }).vs).toBeUndefined();
    expect(monthCompare({ anchor: '2027-01-01', today: '2026-11-10', logs: october, plannedById: none })).toMatchObject({ nothingYet: false });
  });

  it('telt een rustdag niet als training', () => {
    const r = monthCompare({ anchor: '2026-10-15', today: '2026-10-20', logs: [log('r', '2026-10-03', 20, 'recovery'), log('x', '2026-10-04', 30)], plannedById: none });
    expect(r.totals.count).toBe(1);
  });
});

describe('monthCompare: korte maanden en de jaargrens', () => {
  const sum = (anchor: string, today: string, logs: SessionLog[]) => monthCompare({ anchor, today, logs, plannedById: none }).vs;

  it('loopt op 31 maart tot en met 28 februari in een gewoon jaar', () => {
    const logs = [log('f1', '2027-02-27', 30), log('f2', '2027-02-28', 30), log('m', '2027-03-20', 60)];
    expect(sum('2027-03-15', '2027-03-31', logs)).toMatchObject({ from: '2027-02-01', to: '2027-02-28', minutes: 60, count: 2 });
  });

  it('loopt op 30 maart tot en met 29 februari in een schrikkeljaar', () => {
    const logs = [log('f1', '2028-02-29', 30), log('f2', '2028-02-10', 30)];
    expect(sum('2028-03-15', '2028-03-30', logs)).toMatchObject({ to: '2028-02-29', minutes: 60, count: 2 });
    // Op 29 maart ook: de 29e februari bestaat.
    expect(sum('2028-03-15', '2028-03-29', logs)).toMatchObject({ to: '2028-02-29' });
  });

  it('vergelijkt januari met december van het jaar ervoor', () => {
    const logs = [log('d1', '2026-12-05', 40), log('d2', '2026-12-20', 40), log('j', '2027-01-12', 50)];
    expect(sum('2027-01-10', '2027-01-15', logs)).toMatchObject({ from: '2026-12-01', to: '2026-12-15', minutes: 40, count: 1, diffMinutes: 10 });
  });

  it('vergelijkt een afgesloten januari met de hele december', () => {
    const logs = [log('d1', '2026-12-05', 40), log('d2', '2026-12-30', 40), log('j', '2027-01-12', 50)];
    expect(sum('2027-01-10', '2027-03-01', logs)).toMatchObject({ whole: true, from: '2026-12-01', to: '2026-12-31', minutes: 80, count: 2 });
  });
});

describe('groupByWeek', () => {
  it('zet de nieuwste week bovenaan en binnen de week de nieuwste training eerst', () => {
    const groups = groupByWeek([log('a', '2026-10-27', 30), log('b', '2026-10-21', 30), log('c', '2026-10-29', 30), log('d', '2026-11-01', 30)]);
    expect(groups.map((g) => g.weekStart)).toEqual(['2026-10-26', '2026-10-19']);
    expect(groups[0].logs.map((l) => l.id)).toEqual(['d', 'c', 'a']);
  });
  it('vindt de maandag, ook op zondag', () => {
    expect(mondayKey('2026-11-01')).toBe('2026-10-26');
    expect(mondayKey('2026-10-26')).toBe('2026-10-26');
  });
});

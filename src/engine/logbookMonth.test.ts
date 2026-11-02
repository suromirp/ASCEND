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

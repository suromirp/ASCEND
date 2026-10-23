import { describe, it, expect } from 'vitest';
import { suggestMoveDates, type MoveContext } from './moveSuggestions';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession } from '../models/training';
import type { DailyTimeBudget, Weekday } from '../models/goalEngineConfig';

describe('suggestMoveDates', () => {
  const { templates, program } = buildDefaultProgramData();
  const MON = '2026-09-28';
  const s = (id: string, templateId: string, date: string, weekStart = MON): PlannedSession => ({ id, templateId, scheduledDate: date, weekStartDate: weekStart, status: 'planned', order: 0 });
  const week = [
    s('herstel', 'tpl_herstel', MON),
    s('upperA', 'tpl_upper_a', '2026-09-29'),
    s('lowerA', 'tpl_lower_a', '2026-09-30'),
    s('easy', 'tpl_easy_run', '2026-10-01'),
    s('upperB', 'tpl_upper_b', '2026-10-02'),
    s('hills', 'tpl_hill_intervals', '2026-10-03'),
    s('long', 'tpl_long_run', '2026-10-04'),
  ];
  const day = (m: number): DailyTimeBudget => ({ preferredMinutes: m, softFlexMinutes: Math.max(15, Math.round(m * 0.15)) });
  const budget: Partial<Record<Weekday, DailyTimeBudget>> = { mon: day(75), tue: day(90), wed: day(75), thu: day(100), fri: day(120), sat: day(200), sun: day(200) };

  it('offers a few one-tap days that keep 48 hours between heavy upper days, never in the past', () => {
    const suggestions = suggestMoveDates(week, templates, 'upperB', [], program, budget, 'automatic', '2026-10-01');
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.length).toBeLessThanOrEqual(3);
    for (const x of suggestions) {
      expect(x.date >= '2026-10-01').toBe(true);
      expect(x.date).not.toBe('2026-09-30'); // past
      expect(x.date).not.toBe('2026-10-02'); // where it already is
      expect(x.proposal.resolved).toBe(true);
      expect(x.proposal.changes).toHaveLength(1); // nothing else has to move
    }
    // Wednesday 30 Sept would be one day after Upper A, and in the past anyway.
    expect(suggestions.map((x) => x.date)).not.toContain('2026-09-30');
  });

  it('says whether the day is free or shared', () => {
    const suggestions = suggestMoveDates(week, templates, 'upperB', [], program, budget, 'automatic', '2026-10-01');
    expect(suggestions.every((x) => (x.free && x.note === 'Vrije dag') || (!x.free && /^Met .*, samen \d+ min$/.test(x.note)))).toBe(true);
  });

  // Production feedback: two days that already held a long training were
  // offered before the free day after them.
  it('puts the free days first, then the days it can share', () => {
    const now = [
      s('herstel', 'tpl_herstel', MON),
      s('easy', 'tpl_easy_run', '2026-10-01'),
      s('upperB', 'tpl_upper_b', '2026-10-02'),
      s('long', 'tpl_long_run', '2026-10-04'),
    ];
    const suggestions = suggestMoveDates(now, templates, 'upperB', [], program, budget, 'automatic', '2026-10-01');
    const free = suggestions.map((x) => x.free);
    expect(free).toContain(true);
    expect(free).toContain(false);
    expect(free.lastIndexOf(true)).toBeLessThan(free.indexOf(false));
  });

  it('without time per day, sharing a day in the same week beats waiting a week', () => {
    const next = week.map((x) => s(`n-${x.id}`, x.templateId, new Date(Date.parse(x.scheduledDate) + 7 * 86400000).toISOString().slice(0, 10), '2026-10-05'));
    const suggestions = suggestMoveDates([...week, ...next.filter((x) => x.templateId !== 'tpl_easy_run')], templates, 'easy', [], program, {}, 'automatic', '2026-10-01');
    expect(suggestions[0].date).toBe('2026-10-02'); // shares Friday within 120 min before next week's empty Thursday
    expect(suggestions.every((x) => x.date < '2026-10-05')).toBe(true);
  });

  it('with no time set at all, a full 7-day week still gets suggestions that pair within 120 minutes', () => {
    const next = week.map((x) => s(`n-${x.id}`, x.templateId, new Date(Date.parse(x.scheduledDate) + 7 * 86400000).toISOString().slice(0, 10), '2026-10-05'));
    const suggestions = suggestMoveDates([...week, ...next], templates, 'upperB', [], program, {}, 'automatic', '2026-10-01');
    expect(suggestions.length).toBeGreaterThan(0);
    for (const x of suggestions) expect(x.note).toMatch(/^Met .*, samen \d+ min$/);
    expect(suggestMoveDates([...week, ...next], templates, 'upperB', [], program, {}, 'never', '2026-10-01')).toEqual([]);
  });

  // Production feedback: hill intervals were offered on Sunday next to the
  // long run and Upper B (160 min, two heavy leg sessions on one day), and
  // on Monday straight after the long run.
  it('never stacks the leg sessions on one day, never reverses the intended back-to-back, never a third session', () => {
    const now = [
      s('herstel', 'tpl_herstel', MON),
      s('lowerA', 'tpl_lower_a', '2026-09-30'),
      s('easy', 'tpl_easy_run', '2026-10-01'),
      s('hills', 'tpl_hill_intervals', '2026-10-03'),
      s('long', 'tpl_long_run', '2026-10-04'),
      s('upperB', 'tpl_upper_b', '2026-10-04'),
      s('n-herstel', 'tpl_herstel', '2026-10-05', '2026-10-05'),
    ];
    const dates = suggestMoveDates(now, templates, 'hills', [], program, budget, 'automatic', '2026-10-02').map((x) => x.date);
    expect(dates).toContain('2026-10-02');
    expect(dates).not.toContain('2026-10-04');
    expect(dates).not.toContain('2026-10-05');
  });

  // Warden Logica punt 6: the one-tap days knew no holiday, rest day, goal day or illness.
  describe('the days the planning keeps free', () => {
    const now = [
      s('herstel', 'tpl_herstel', MON),
      s('easy', 'tpl_easy_run', '2026-10-01'),
      s('upperB', 'tpl_upper_b', '2026-10-02'),
      s('long', 'tpl_long_run', '2026-10-04'),
    ];
    const dates = (context?: MoveContext) => suggestMoveDates(now, templates, 'upperB', [], program, budget, 'automatic', '2026-09-29', 7, context).map((x) => x.date);
    const free = dates();

    it('never a day of a holiday or a trek', () => {
      const day = free[0];
      const holiday = { id: 'v', kind: 'no_training' as const, startDate: day, endDate: day };
      expect(dates({ leave: [holiday] })).not.toContain(day);
      const trek = { id: 't', kind: 'trek' as const, startDate: free[1], endDate: free[1] };
      expect(dates({ leave: [trek] })).not.toContain(free[1]);
    });

    it('never the rest day', () => {
      const restDay = new Date(`${free[0]}T12:00:00Z`).getUTCDay() || 7;
      expect(dates({ restDay }).every((d) => (new Date(`${d}T12:00:00Z`).getUTCDay() || 7) !== restDay)).toBe(true);
    });

    it('never on or after the day of the main goal', () => {
      const goalDay = free[1];
      expect(dates({ goalDay }).every((d) => d < goalDay)).toBe(true);
    });

    it('not today or tomorrow while you are ill', () => {
      const ill = dates({ illness: [{ id: 'i', kind: 'below_neck' as const, startDate: '2026-09-28' }] });
      expect(ill).not.toContain('2026-09-29');
      expect(ill).not.toContain('2026-09-30');
    });
  });
});

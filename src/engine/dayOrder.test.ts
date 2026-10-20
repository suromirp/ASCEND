import { describe, it, expect } from 'vitest';
import { dayOrder, orderDay, roleOf } from './dayOrder';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession } from '../models/training';

const { templates } = buildDefaultProgramData();
const byId = new Map(templates.map((t) => [t.id, t]));
const ps = (id: string, templateId: string, date = '2026-11-04'): PlannedSession => ({ id, templateId, scheduledDate: date, weekStartDate: '2026-11-02', status: 'planned', order: 0 });
const order = (a: string, b: string, tomorrow: string[] = []) => dayOrder([ps('a', a), ps('b', b)], tomorrow.map((t, i) => ps(`t${i}`, t, '2026-11-05')), byId);

describe('roles', () => {
  it('reads the catalogue', () => {
    expect(roleOf(byId.get('tpl_test_run')!)).toBe('test');
    expect(roleOf(byId.get('tpl_tempo_run')!)).toBe('hardeLoop');
    expect(roleOf(byId.get('tpl_progression_run')!)).toBe('hardeLoop');
    expect(roleOf(byId.get('tpl_hills_descent')!)).toBe('heuvelsOpEnAf');
    expect(roleOf(byId.get('tpl_long_run')!)).toBe('langeLoop');
    expect(roleOf(byId.get('tpl_easy_run')!)).toBe('rustigeLoop');
    expect(roleOf(byId.get('tpl_lower_a')!)).toBe('benen');
    expect(roleOf(byId.get('tpl_upper_a')!)).toBe('bovenlichaam');
  });
});

describe('which one first', () => {
  it('hard run before legs, 6 hours between', () => {
    const a = order('tpl_lower_a', 'tpl_tempo_run')!;
    expect(a.order).toEqual(['b', 'a']);
    expect(a.gapHours).toBe(6);
  });
  it('the test first; legs at least 6 hours later', () => {
    expect(order('tpl_lower_a', 'tpl_test_run')!).toMatchObject({ order: ['b', 'a'], gapHours: 6 });
  });
  it('easy run and legs: legs first, unless tomorrow is hard', () => {
    expect(order('tpl_easy_run', 'tpl_lower_a')!.order).toEqual(['b', 'a']);
    expect(order('tpl_easy_run', 'tpl_lower_a', ['tpl_intervals'])!.order).toEqual(['a', 'b']);
  });
  it('the long run and legs, or hills up and down and legs: better not on one day', () => {
    expect(order('tpl_lower_a', 'tpl_long_run')!).toMatchObject({ avoid: true, order: ['b', 'a'] });
    expect(order('tpl_hills_descent', 'tpl_lower_a')!.avoid).toBe(true);
  });
  it('two hard runs: move one; a hard and an easy one: the hard one first', () => {
    expect(order('tpl_tempo_run', 'tpl_intervals')!.avoid).toBe(true);
    expect(order('tpl_easy_run', 'tpl_intervals')!).toMatchObject({ order: ['b', 'a'], gapHours: 5 });
  });
  it('an easy run and upper body: no tip', () => {
    expect(order('tpl_easy_run', 'tpl_upper_a')).toBeUndefined();
    expect(dayOrder([ps('a', 'tpl_easy_run')], [], byId)).toBeUndefined();
  });
  it('sorts the day in that order', () => {
    const day = [ps('a', 'tpl_lower_a'), ps('b', 'tpl_tempo_run')];
    expect(orderDay(day, dayOrder(day, [], byId)).map((s) => s.id)).toEqual(['b', 'a']);
  });
});

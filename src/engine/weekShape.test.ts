import { describe, expect, it } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { weeklyPatternTemplates } from './sports';
import { adviceDays, chooseWeekShape, isStrengthTemplateId, type WeekShapeInput } from './weekShape';

const templates = buildDefaultProgramData().templates;
const ALL = [1, 2, 3, 4, 5, 6, 7];
const base: WeekShapeInput = { goal: 'trek', daysPerWeek: 4, allowedDays: ALL, strength: true };

describe('weekly pattern with a week shape', () => {
  it('is the full default pattern without a shape', () => {
    const plain = weeklyPatternTemplates(templates, {});
    expect(plain.map((t) => t.id)).toEqual(templates.filter((t) => t.defaultDayOfWeek).map((t) => t.id));
    expect(weeklyPatternTemplates(templates, { weekShape: undefined })).toEqual(plain);
  });

  it('keeps only the templates in the shape, on the days of the shape', () => {
    const pattern = weeklyPatternTemplates(templates, { weekShape: { days: { tpl_long_run: 6, tpl_upper_a: 2 } } });
    expect(pattern.map((t) => [t.id, t.defaultDayOfWeek])).toEqual(expect.arrayContaining([['tpl_long_run', 6], ['tpl_upper_a', 2]]));
    expect(pattern).toHaveLength(2);
  });
});

describe('chooseWeekShape', () => {
  it('gives the asked number of trainings on distinct allowed days, with a free weekday for rest', () => {
    const r = chooseWeekShape(templates, base);
    expect(r.count).toBe(4);
    const days = r.kept.map((id) => r.shape.days[id]);
    expect(new Set(days).size).toBe(4);
    expect(days.every((d) => ALL.includes(d))).toBe(true);
    expect(days).not.toContain(r.restDay);
    expect(r.restDay).toBeGreaterThanOrEqual(1);
    expect(r.restDay).toBeLessThanOrEqual(5);
    expect(r.shape.days.tpl_herstel).toBe(r.restDay);
    expect(r.kept.some(isStrengthTemplateId)).toBe(true);
    expect(r.notes).toEqual([]);
  });

  it('puts the long training on the weekend when that is possible', () => {
    const r = chooseWeekShape(templates, base);
    expect(r.shape.days.tpl_long_run).toBeGreaterThanOrEqual(6);
  });

  it('only uses the days you can, and rests on a day you cannot', () => {
    const r = chooseWeekShape(templates, { ...base, allowedDays: [2, 4, 6, 7] });
    expect(r.kept.map((id) => r.shape.days[id]).sort()).toEqual([2, 4, 6, 7]);
    expect([1, 3, 5]).toContain(r.restDay);
  });

  it('is deterministic', () => {
    expect(chooseWeekShape(templates, base)).toEqual(chooseWeekShape(templates, base));
  });

  it('keeps heavy leg days apart', () => {
    for (const goal of ['trek', 'race', 'fit'] as const) {
      for (const daysPerWeek of [3, 4, 5, 6]) {
        const r = chooseWeekShape(templates, { ...base, goal, daysPerWeek });
        const legs = ['tpl_lower_a', 'tpl_long_run'].filter((id) => id in r.shape.days).map((id) => r.shape.days[id]);
        if (legs.length === 2) expect(Math.min(Math.abs(legs[0] - legs[1]), 7 - Math.abs(legs[0] - legs[1]))).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('says so when strength is off and fewer trainings fit', () => {
    const r = chooseWeekShape(templates, { ...base, daysPerWeek: 5, strength: false });
    expect(r.count).toBe(3);
    expect(r.kept.some(isStrengthTemplateId)).toBe(false);
    expect(r.notes.join(' ')).toContain('Zonder krachttraining');
  });

  it('keeps one weekday free when all five weekdays are chosen', () => {
    const r = chooseWeekShape(templates, { ...base, daysPerWeek: 5, allowedDays: [1, 2, 3, 4, 5] });
    expect(r.count).toBe(4);
    expect(r.notes.join(' ')).toContain('doordeweekse dag vrij');
  });

  it('uses fewer trainings when fewer days are chosen than asked', () => {
    const r = chooseWeekShape(templates, { ...base, daysPerWeek: 5, allowedDays: [6, 7] });
    expect(r.count).toBe(2);
    expect(r.notes.length).toBeGreaterThan(0);
  });

  it('has an advice per goal', () => {
    expect(adviceDays('trek').days).toBeGreaterThan(adviceDays('fit').days);
  });
});

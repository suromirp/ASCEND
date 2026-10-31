import { describe, expect, it } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { parseWeekShape, weeklyPatternTemplates } from './sports';
import { arrangeWeekForRestDay } from './restDay';
import { patternDays } from './planPass';
import { readWeekShape } from '../storage/migrations';
import { adviceDays, chooseWeekShape, isStrengthTemplateId, shapeSpacingConflicts, type WeekShapeInput } from './weekShape';

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
    // Rust op een dag waarop je niet kunt: geen rustwandeling in de week.
    expect(chooseWeekShape(templates, { ...base, allowedDays: [2, 4, 6, 7] }).shape.days.tpl_herstel).toBeUndefined();
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

  it('keeps heavy days apart over the whole week, also with the mountain variant', () => {
    for (const goal of ['trek', 'race', 'fit'] as const) {
      for (const daysPerWeek of [2, 3, 4, 5, 6]) {
        const r = chooseWeekShape(templates, { ...base, goal, daysPerWeek });
        expect(shapeSpacingConflicts(templates, r.shape.days), `${goal} ${daysPerWeek}`).toBe(0);
        expect(r.notes.join(' ')).not.toContain('dicht bij elkaar');
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

describe('a week shape read defensively', () => {
  it('lets only known templates on a day from 1 to 7 through', () => {
    expect(readWeekShape({ days: { tpl_long_run: 7, tpl_upper_a: 2, tpl_onbekend: 3, tpl_easy_run: 0, tpl_lower_a: 9, tpl_upper_b: 2.5 } })).toEqual({ days: { tpl_long_run: 7, tpl_upper_a: 2 } });
  });
  it('is nothing for {}, days null, a day 0 or 9, or no real training', () => {
    expect(readWeekShape({})).toBeUndefined();
    expect(readWeekShape({ days: null })).toBeUndefined();
    expect(readWeekShape({ days: { tpl_long_run: 0 } })).toBeUndefined();
    expect(readWeekShape({ days: { tpl_long_run: 9 } })).toBeUndefined();
    expect(readWeekShape({ days: { tpl_herstel: 1 } })).toBeUndefined();
    expect(readWeekShape(undefined)).toBeUndefined();
    expect(readWeekShape('x')).toBeUndefined();
    expect(readWeekShape([])).toBeUndefined();
  });
  it('the weekly pattern is the default one for a damaged shape', () => {
    const plain = weeklyPatternTemplates(templates, {});
    for (const bad of [{}, { days: null }, { days: { tpl_long_run: 9 } }]) {
      expect(weeklyPatternTemplates(templates, { weekShape: bad as never })).toEqual(plain);
    }
    expect(parseWeekShape({ days: { tpl_long_run: 6 }, allowed: [2, 9, 4, 4] })).toEqual({ days: { tpl_long_run: 6 }, allowed: [2, 4] });
  });
});

describe('another rest day after the first plan', () => {
  it('keeps the trainings on the days you chose (Tuesday, Thursday, Saturday, Sunday; rest then on Wednesday)', () => {
    const r = chooseWeekShape(templates, { ...base, daysPerWeek: 4, allowedDays: [2, 4, 6, 7] });
    const settings = { weekShape: r.shape };
    const pattern = arrangeWeekForRestDay(weeklyPatternTemplates(templates, settings), templates, 3, r.shape.allowed);
    const trainingDays = pattern.filter((t) => t.type !== 'recovery').map((t) => t.defaultDayOfWeek).sort();
    expect(trainingDays).toEqual([2, 4, 6, 7]);
    // Geen rustwandeling op een dag waarop je niet kunt: niets op de rustdag.
    expect(pattern.some((t) => t.defaultDayOfWeek === 3)).toBe(false);
    const days = patternDays(templates, settings, 3);
    expect([...new Set(days.values())].filter((d) => d !== 3).sort()).toEqual([2, 4, 6, 7]);
  });
  it('moves a training off the new rest day onto another day you can, not onto a day you cannot', () => {
    const r = chooseWeekShape(templates, { ...base, daysPerWeek: 3, allowedDays: [2, 3, 4, 6, 7] });
    for (const rest of [1, 2, 3, 4, 5] as const) {
      const pattern = arrangeWeekForRestDay(weeklyPatternTemplates(templates, { weekShape: r.shape }), templates, rest, r.shape.allowed);
      for (const t of pattern.filter((x) => x.type !== 'recovery')) {
        expect(t.defaultDayOfWeek).not.toBe(rest);
        if ((t.defaultDayOfWeek ?? 0) <= 5 && [2, 3, 4].filter((d) => d !== rest).length >= pattern.filter((x) => x.type !== 'recovery' && (x.defaultDayOfWeek ?? 0) <= 5).length) {
          expect([2, 3, 4]).toContain(t.defaultDayOfWeek);
        }
      }
    }
  });
});

describe('chooseWeekShape with a number of strength sessions (Sterker worden)', () => {
  it('plans the asked number of strength sessions, as far as there are templates and days', () => {
    const count = (n: number, days = 4) => chooseWeekShape(templates, { ...base, goal: 'fit', daysPerWeek: days, strengthSessions: n }).kept.filter(isStrengthTemplateId).length;
    expect(count(3)).toBe(3);
    expect(count(2)).toBe(2);
    // Three strength templates in the pattern: four asks for three.
    expect(count(4, 5)).toBe(3);
    // At least one endurance session stays.
    expect(count(3, 3)).toBe(2);
  });

  it('without it the number follows the days, as before', () => {
    expect(chooseWeekShape(templates, { ...base, goal: 'fit', daysPerWeek: 4 }).kept.filter(isStrengthTemplateId)).toHaveLength(2);
  });
});

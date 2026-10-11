import { describe, it, expect } from 'vitest';
import { arrangeWeekForRestDay } from './restDay';
import { buildDefaultProgramData } from '../data/defaultProgram';

const { templates } = buildDefaultProgramData();
const pattern = templates.filter((t) => t.defaultDayOfWeek);
const days = (restDay?: 1 | 2 | 3 | 4 | 5) => Object.fromEntries(arrangeWeekForRestDay(pattern, templates, restDay).map((t) => [t.id, t.defaultDayOfWeek]));

describe('arrangeWeekForRestDay', () => {
  it('leaves the usual week alone on Monday', () => {
    expect(days(1)).toEqual(days(undefined));
    expect(days(undefined).tpl_herstel).toBe(1);
  });

  it('puts the rest day where you want it and keeps the weekend', () => {
    for (const r of [2, 3, 4, 5] as const) {
      const d = days(r);
      expect(d.tpl_herstel).toBe(r);
      expect(d.tpl_hill_intervals).toBe(6);
      expect(d.tpl_long_run).toBe(7);
      // Every weekday is used once.
      expect(new Set(Object.values(d)).size).toBe(7);
    }
  });

  it('keeps heavy legs 72 hours after a Sunday hike and the two upper body days apart', () => {
    for (const r of [2, 3, 4, 5] as const) {
      const d = days(r);
      expect(d.tpl_lower_a).toBeGreaterThanOrEqual(3);
      expect(Math.abs(d.tpl_upper_a! - d.tpl_upper_b!)).toBeGreaterThanOrEqual(2);
    }
  });
});

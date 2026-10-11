import { describe, it, expect, afterEach } from 'vitest';
import { respectsHeavySpacing, setHardSameDayAllowed } from './scheduler';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession } from '../models/training';

const { templates } = buildDefaultProgramData();
const byId = new Map(templates.map((t) => [t.id, t]));
const t = (id: string) => byId.get(id)!;
const ps = (templateId: string, date: string): PlannedSession => ({ id: `p-${templateId}-${date}`, templateId, scheduledDate: date, weekStartDate: '2026-10-12', status: 'planned', order: 0 });
// 2026-10-12 is a Monday.
const fits = (templateId: string, date: string, others: PlannedSession[]) => respectsHeavySpacing(date, t(templateId), others, byId);

afterEach(() => setHardSameDayAllowed(false));

describe('wait time per pair of heavy leg sessions', () => {
  it('48 hours between leg strength and hill intervals, as before', () => {
    expect(fits('tpl_lower_a', '2026-10-13', [ps('tpl_hill_intervals', '2026-10-12')])).toBe(false);
    expect(fits('tpl_lower_a', '2026-10-14', [ps('tpl_hill_intervals', '2026-10-12')])).toBe(true);
  });

  it('24 hours between the easy long run and leg strength, in either order', () => {
    expect(fits('tpl_lower_a', '2026-10-13', [ps('tpl_long_run', '2026-10-12')])).toBe(true);
    expect(fits('tpl_long_run', '2026-10-13', [ps('tpl_lower_a', '2026-10-12')])).toBe(true);
    expect(fits('tpl_lower_a', '2026-10-12', [ps('tpl_long_run', '2026-10-12')])).toBe(false);
  });

  it('72 hours after a mountain hike before heavy legs, but not before it', () => {
    expect(fits('tpl_lower_a', '2026-10-14', [ps('tpl_mountain_hike', '2026-10-12')])).toBe(false);
    expect(fits('tpl_lower_a', '2026-10-15', [ps('tpl_mountain_hike', '2026-10-12')])).toBe(true);
    expect(fits('tpl_lower_a', '2026-10-15', [ps('tpl_mountain_hike', '2026-10-17')])).toBe(true);
  });
});

describe('heavy things on one day (setting)', () => {
  it('only when switched on, and only strength with a run', () => {
    expect(fits('tpl_lower_a', '2026-10-12', [ps('tpl_hill_intervals', '2026-10-12')])).toBe(false);
    setHardSameDayAllowed(true);
    expect(fits('tpl_lower_a', '2026-10-12', [ps('tpl_hill_intervals', '2026-10-12')])).toBe(true);
    expect(fits('tpl_lower_a', '2026-10-12', [ps('tpl_lower_b', '2026-10-12')])).toBe(false);
    expect(fits('tpl_lower_a', '2026-10-12', [ps('tpl_mountain_hike', '2026-10-12')])).toBe(false);
    // The days around still keep their distance.
    expect(fits('tpl_lower_a', '2026-10-13', [ps('tpl_hill_intervals', '2026-10-12')])).toBe(false);
  });
});

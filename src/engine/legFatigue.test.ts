import { describe, it, expect } from 'vitest';
import { damageLeft, fatigueStatus, intensityLeft, legFatigueOn, strengthLeft, type LegFatigueInputs } from './legFatigue';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { SessionLog } from '../models/training';
import { addDays } from '../utils/dates';

const { templates } = buildDefaultProgramData();
const type = (id: string) => templates.find((t) => t.id === id)!.type;
let n = 0;
const log = (templateId: string, date: string, minutes: number, extra: Partial<SessionLog> = {}): SessionLog => ({
  id: `l${n++}`, templateId, type: type(templateId), completedDate: date, completedAt: `${date}T10:00:00Z`, variant: 'full', durationMinutes: minutes, source: 'manual', ...extra,
});
const inputs = (logs: SessionLog[], over: Partial<LegFatigueInputs> = {}): LegFatigueInputs => ({ logs, plannedSessions: [], templates, today: '2026-12-31', ...over });
// Two earlier leg days in the 3 weeks before: "gewend".
const used = (date: string) => [log('tpl_lower_a', addDays(date, -14), 60, { rpe: 8 }), log('tpl_lower_a', addDays(date, -7), 60, { rpe: 8 })];

describe('the three buckets', () => {
  it('intensity halves every 12 h, strength every 24 h, damage stays a day then halves every 36 h', () => {
    expect(intensityLeft(1)).toBeCloseTo(0.25);
    expect(intensityLeft(2)).toBeCloseTo(0.0625);
    expect(strengthLeft(1)).toBeCloseTo(0.5);
    expect(strengthLeft(3)).toBeCloseTo(0.125);
    expect(damageLeft(1)).toBe(1);
    expect(damageLeft(2)).toBeCloseTo(0.63, 2);
    expect(damageLeft(4)).toBeCloseTo(0.25, 2);
    expect(damageLeft(0)).toBe(0);
  });
});

describe('the worked examples of the report', () => {
  const D = '2026-11-04';
  it('Lower A, used to it, 60 min at RPE 8: 13.4, 7.3, 4.2 after 1, 2, 3 days', () => {
    const logs = [...used(D), log('tpl_lower_a', D, 60, { rpe: 8 })];
    const after = (d: number) => legFatigueOn(addDays(D, d), inputs(logs)).contributions.find((c) => c.date === D)!.points;
    expect(after(1)).toBeCloseTo(13.4, 0);
    expect(after(2)).toBeCloseTo(7.3, 0);
    expect(after(3)).toBeCloseTo(4.2, 0);
  });

  it('the first Lower A after a long break counts more: 18.2 the day after', () => {
    expect(legFatigueOn(addDays(D, 1), inputs([log('tpl_lower_a', D, 60, { rpe: 8 })])).index).toBeCloseTo(18.2, 0);
  });

  it('short Lower A, 45 min at RPE 7: 8.7 the day after', () => {
    const logs = [...used(D), log('tpl_lower_a', D, 45, { rpe: 7 })];
    expect(legFatigueOn(addDays(D, 1), inputs(logs)).contributions.find((c) => c.date === D)!.points).toBeCloseTo(8.7, 0);
  });

  it('an easy run costs almost nothing: under 2 the day after', () => {
    expect(legFatigueOn(addDays(D, 1), inputs([log('tpl_easy_run', D, 40)])).index).toBeLessThan(2);
  });
});

describe('a test on Thursday in the normal week', () => {
  // Weekend before: hills Saturday 31 Oct, long run Sunday 1 Nov; test Thursday 5 Nov.
  const THU = '2026-11-05';
  const weekend = [log('tpl_hill_intervals', '2026-10-31', 45, { outdoorData: { durationMinutes: 45, elevationGainM: 150, elevationLossM: 150, source: 'manual' } }), log('tpl_long_run', '2026-11-01', 100, { outdoorData: { durationMinutes: 100, elevationGainM: 200, elevationLossM: 200, source: 'manual' } })];
  const at = (legsDate: string, minutes = 75, rpe = 8) => legFatigueOn(THU, inputs([...used(legsDate), ...weekend, log('tpl_lower_a', legsDate, minutes, { rpe })]));

  it('Lower A the day before: not fresh; two days before: doubt or worse; short on Tuesday or after the test: fresh', () => {
    expect(fatigueStatus(at('2026-11-04'), 'test')).toBe('niet fris');
    expect(fatigueStatus(at('2026-11-03'), 'test')).not.toBe('fris');
    expect(fatigueStatus(at('2026-11-03', 45, 7), 'test')).toBe('fris');
    expect(fatigueStatus(at('2026-11-02'), 'test')).toBe('fris');
    // After the test (that evening): it doesn't count for the test.
    expect(fatigueStatus(at(THU), 'test')).toBe('fris');
  });

  it('recent leg pain never reads as fresh, and reported soreness sets a floor', () => {
    const base = inputs([...weekend]);
    expect(fatigueStatus(legFatigueOn(THU, base), 'test')).toBe('fris');
    const pain = inputs([...weekend, log('tpl_easy_run', '2026-11-03', 30, { painAreas: ['Kuit'] })]);
    expect(fatigueStatus(legFatigueOn(THU, pain), 'test')).toBe('twijfel');
    const sore = inputs([...weekend], { soreness: [{ date: THU, level: 'flink' }] });
    expect(fatigueStatus(legFatigueOn(THU, sore), 'test')).toBe('niet fris');
  });

  it('a session that felt worse counts heavier', () => {
    const plain = legFatigueOn('2026-11-02', inputs([log('tpl_lower_a', '2026-11-01', 60, { rpe: 8 })])).index;
    const worse = legFatigueOn('2026-11-02', inputs([log('tpl_lower_a', '2026-11-01', 60, { rpe: 8, subjectiveFeel: 'worse' })])).index;
    expect(worse).toBeCloseTo(plain * 1.25, 0);
  });

  it('planned sessions ahead count as planned; past unlogged ones did not happen', () => {
    const planned = [{ id: 'p', templateId: 'tpl_lower_a', scheduledDate: '2026-11-04', weekStartDate: '2026-11-02', status: 'planned' as const, order: 0 }];
    expect(legFatigueOn(THU, inputs([], { plannedSessions: planned, today: '2026-11-03' })).index).toBeGreaterThan(10);
    expect(legFatigueOn(THU, inputs([], { plannedSessions: planned, today: THU })).index).toBe(0);
  });
});

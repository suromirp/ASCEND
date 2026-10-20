import { describe, it, expect } from 'vitest';
import { descentOf, freshnessCurve, intensityMix, legCalendar, loadVersusBefore, plannedEffort, routeDayRows, weeklyDescent, weeklyLoad } from './standing';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession, SessionLog } from '../models/training';
import type { GoalRequirement } from '../models/goals';

const { templates } = buildDefaultProgramData();
const tpl = (id: string) => templates.find((t) => t.id === id)!;
let n = 0;
const log = (templateId: string, date: string, minutes: number, extra: Partial<SessionLog> = {}): SessionLog => ({
  id: `l${n++}`, templateId, type: tpl(templateId).type, completedDate: date, completedAt: `${date}T10:00:00Z`, variant: 'full', durationMinutes: minutes, source: 'manual', ...extra,
});
const planned = (templateId: string, date: string, extra: Partial<PlannedSession> = {}): PlannedSession => ({
  id: `p${n++}`, templateId, scheduledDate: date, status: 'planned', ...extra,
} as PlannedSession);
const TODAY = '2026-10-21'; // a Wednesday

describe('weekly load', () => {
  it('counts minutes times the effort you logged, per sport', () => {
    const weeks = weeklyLoad({ logs: [log('tpl_easy_run', '2026-10-19', 40, { rpe: 3 }), log('tpl_lower_a', '2026-10-20', 60, { rpe: 8 })], plannedSessions: [], templates, today: TODAY }, 0, 0);
    expect(weeks).toHaveLength(1);
    expect(weeks[0].done.lopen).toBe(120);
    expect(weeks[0].done.kracht).toBe(480);
    expect(weeks[0].estimated).toBe(0);
  });

  it('estimates the effort from the plan when none was logged, and says so', () => {
    const weeks = weeklyLoad({ logs: [log('tpl_long_run', '2026-10-19', 60)], plannedSessions: [], templates, today: TODAY }, 0, 0);
    expect(weeks[0].doneTotal).toBe(60 * plannedEffort(tpl('tpl_long_run')));
    expect(weeks[0].estimated).toBe(weeks[0].doneTotal);
  });

  it('counts what is still planned this week, not what was planned in the past or logged', () => {
    const past = planned('tpl_easy_run', '2026-10-20');
    const done = planned('tpl_tempo_run', '2026-10-22');
    const ahead = planned('tpl_long_run', '2026-10-24', { plannedMinutes: 90 });
    const weeks = weeklyLoad({ logs: [log('tpl_tempo_run', '2026-10-21', 45, { rpe: 6, plannedSessionId: done.id })], plannedSessions: [past, done, ahead], templates, today: TODAY }, 0, 0);
    expect(weeks[0].plannedTotal).toBe(90 * plannedEffort(tpl('tpl_long_run')));
  });

  it('a jump against the four weeks before is reported as a ratio', () => {
    const logs = [log('tpl_easy_run', '2026-09-28', 60, { rpe: 5 }), log('tpl_easy_run', '2026-10-05', 60, { rpe: 5 }), log('tpl_easy_run', '2026-10-12', 60, { rpe: 5 }), log('tpl_easy_run', '2026-10-19', 60, { rpe: 5 })];
    const jump = loadVersusBefore(weeklyLoad({ logs, plannedSessions: [planned('tpl_easy_run', '2026-10-23', { plannedMinutes: 75 })], templates, today: TODAY }, 4, 0))!;
    expect(jump.doneRatio).toBeCloseTo(1);
    expect(jump.ratio).toBeCloseTo(1 + (75 * plannedEffort(tpl('tpl_easy_run'))) / 300);
  });

  it('no ratio with less than three earlier weeks', () => {
    expect(loadVersusBefore(weeklyLoad({ logs: [log('tpl_easy_run', '2026-10-05', 60, { rpe: 5 }), log('tpl_easy_run', '2026-10-12', 60, { rpe: 5 })], plannedSessions: [], templates, today: TODAY }, 4, 0))).toBeUndefined();
  });
});

describe('freshness and the leg calendar', () => {
  it('the curve rises after a leg day and falls again', () => {
    const curve = freshnessCurve({ logs: [log('tpl_lower_a', '2026-10-19', 60, { rpe: 9 })], plannedSessions: [], templates, today: TODAY }, 2, 3);
    const at = (d: string) => curve.find((p) => p.date === d)!.index;
    expect(at('2026-10-19')).toBe(0);
    expect(at('2026-10-20')).toBeGreaterThan(at('2026-10-23'));
    expect(curve.find((p) => p.date === '2026-10-19')!.sessions[0].mark).toBe('legs');
  });

  it('a test ahead is marked on its day', () => {
    const curve = freshnessCurve({ logs: [], plannedSessions: [planned('tpl_test_run', '2026-10-25')], templates, today: TODAY }, 0, 7);
    expect(curve.find((p) => p.date === '2026-10-25')!.sessions[0].mark).toBe('test');
  });

  it('a heavy leg day ranks above an easy run', () => {
    const days = legCalendar({ logs: [log('tpl_easy_run', '2026-10-19', 30, { rpe: 3 }), log('tpl_lower_a', '2026-10-20', 60, { rpe: 9 })], plannedSessions: [], templates, today: TODAY }, 0, 0);
    const day = (d: string) => days.find((x) => x.date === d)!;
    expect(day('2026-10-20').level).toBeGreaterThan(day('2026-10-19').level);
    expect(day('2026-10-21').level).toBe(0);
    expect(days).toHaveLength(7);
  });
});

describe('intensity mix', () => {
  it('splits endurance sessions by their goal and flags easy runs done too hard', () => {
    const logs = [
      log('tpl_easy_run', '2026-10-10', 40, { rpe: 3 }),
      log('tpl_easy_run', '2026-10-12', 40, { rpe: 7 }),
      log('tpl_long_run', '2026-10-14', 80, { cardioData: { durationMinutes: 80, avgHeartRate: 170, source: 'manual' } }),
      log('tpl_hill_intervals', '2026-10-17', 50, { rpe: 8 }),
      log('tpl_lower_a', '2026-10-18', 60, { rpe: 8 }),
    ];
    const mix = intensityMix(logs, templates, TODAY, { lthr: 179 });
    expect(mix.total).toBe(4);
    expect(mix.sessions.hard).toBe(1);
    expect(mix.easyTooHard.map((x) => x.why).sort()).toEqual(['hartslag', 'zwaarte']);
  });
});

describe('descent', () => {
  it('uses the logged descent, else a loop comes down as far as it went up, never a treadmill', () => {
    expect(descentOf(log('tpl_mountain_hike', TODAY, 200, { outdoorData: { durationMinutes: 200, elevationGainM: 500, elevationLossM: 700, source: 'manual' } }))).toBe(700);
    expect(descentOf(log('tpl_long_run', TODAY, 60, { cardioData: { durationMinutes: 60, elevationGainM: 120, environment: 'outdoor', source: 'manual' } }))).toBe(120);
    expect(descentOf(log('tpl_bergconditie', TODAY, 60, { cardioData: { durationMinutes: 60, elevationGainM: 600, environment: 'treadmill', source: 'manual' } }))).toBe(0);
  });

  it('sums per week with the biggest day', () => {
    const logs = [
      log('tpl_hills_descent', '2026-10-19', 60, { outdoorData: { durationMinutes: 60, elevationLossM: 200, source: 'manual' } }),
      log('tpl_long_run', '2026-10-20', 60, { outdoorData: { durationMinutes: 60, elevationLossM: 50, source: 'manual' } }),
    ];
    const weeks = weeklyDescent(logs, TODAY, 2);
    expect(weeks[1]).toEqual({ weekStart: '2026-10-19', metres: 250, biggestDay: 200 });
    expect(weeks[0].metres).toBe(0);
  });
});

describe('a route day next to your best', () => {
  const req = (kind: GoalRequirement['kind'], amount: number, unit: string, scope: GoalRequirement['scope'] = 'PER_DAY'): GoalRequirement => ({ id: kind, kind, scope, target: { amount, unit } as GoalRequirement['target'] });
  it('compares the typical day with your best of the last eight weeks', () => {
    const rows = routeDayRows(
      [req('elevationGain', 1000, 'm'), req('packWeight', 10, 'kg', 'SINGLE_EVENT'), req('consecutiveDays', 3, 'days', 'CONSECUTIVE_DAYS')],
      [
        log('tpl_mountain_hike', '2026-10-10', 180, { outdoorData: { durationMinutes: 180, elevationGainM: 400, backpackWeightKg: 8, source: 'manual' } }),
        log('tpl_mountain_hike', '2026-10-11', 120, { outdoorData: { durationMinutes: 120, elevationGainM: 200, source: 'manual' } }),
        log('tpl_mountain_hike', '2026-07-01', 300, { outdoorData: { durationMinutes: 300, elevationGainM: 1200, source: 'manual' } }),
      ],
      TODAY,
    );
    expect(rows.find((r) => r.key === 'stijgen')).toMatchObject({ need: 1000, best: 400, bestDate: '2026-10-10' });
    expect(rows.find((r) => r.key === 'rugzak')).toMatchObject({ need: 10, best: 8 });
    expect(rows.find((r) => r.key === 'dagen')).toMatchObject({ need: 3, best: 2 });
  });
});

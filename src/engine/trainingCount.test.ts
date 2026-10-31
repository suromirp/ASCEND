import { describe, it, expect } from 'vitest';
import { buildWeekReview } from './weekReview';
import { buildSeasonPlan } from './seasonPlan';
import { weekProgress } from './weekProfile';
import { leftOutOfCount } from './weekLogs';
import { layoutPhasesForGoal, PHASE_BASIS } from './programLayout';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { addDays } from '../utils/dates';
import type { PlannedSession, SessionLog } from '../models/training';

// "x van y gedaan" telt op Week, in het Jaaroverzicht en in de weekterugblik op dezelfde manier.
const { templates } = buildDefaultProgramData();
const byId = new Map(templates.map((t) => [t.id, t]));
const program = { id: 'p', name: 'P', startDate: '2026-09-28', phases: layoutPhasesForGoal('2026-09-28', '2027-08-01', { [PHASE_BASIS]: 4 })! };
const MONDAY = '2026-10-05';
const DAYS = ['tpl_herstel', 'tpl_upper_a', 'tpl_lower_a', 'tpl_easy_run', 'tpl_upper_b', 'tpl_hill_intervals', 'tpl_long_run'];
const sessions: PlannedSession[] = DAYS.map((templateId, d) => ({
  id: `s${d}`, templateId, scheduledDate: addDays(MONDAY, d), weekStartDate: MONDAY, status: d === 3 ? ('skipped' as const) : ('planned' as const), order: d,
}));
const logFor = (s: PlannedSession): SessionLog => ({
  id: `l-${s.id}`, plannedSessionId: s.id, templateId: s.templateId, type: byId.get(s.templateId)!.type, completedDate: s.scheduledDate,
  completedAt: `${s.scheduledDate}T10:00:00Z`, variant: 'full', durationMinutes: 40, source: 'manual',
});
const logs = [sessions[1], sessions[2]].map(logFor);
const TODAY = '2026-10-14';

describe('x van y gedaan', () => {
  it('is op Week, in het Jaaroverzicht en in de weekterugblik hetzelfde getal', () => {
    const leftOut = leftOutOfCount(sessions, [], undefined, TODAY);
    const week = weekProgress(sessions, logs, byId, leftOut);
    const review = buildWeekReview({ weekStart: MONDAY, plannedSessions: sessions, logs, templates, program, planChangeLog: [], asOf: TODAY })!;
    const season = buildSeasonPlan(program, sessions, logs, templates, TODAY, leftOut);
    const seasonWeek = season.flatMap((p) => p.weeks).find((w) => w.weekStart === MONDAY)!;
    expect(week).toEqual({ done: 2, total: 6 });
    expect({ done: review.done, total: review.planned }).toEqual(week);
    expect(seasonWeek.done).toEqual({ done: week.done, planned: week.total });
  });

  it('laat een gemiste training in het verleden niet als komend onder de fase staan', () => {
    const plan = buildSeasonPlan(program, sessions, logs, templates, TODAY);
    const labels = plan.flatMap((p) => p.weeks).find((w) => w.weekStart === MONDAY)!.items.map((i) => i.label);
    expect(labels.some((l) => l.startsWith('Lange duurloop'))).toBe(false);
  });
});

import { describe, it, expect } from 'vitest';
import { buildWeekReview, reviewWeekFor } from './weekReview';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession, SessionLog } from '../models/training';
import type { Program } from '../models/program';

const { templates } = buildDefaultProgramData();
const program: Program = { id: 'p', name: 'P', startDate: '2026-09-28', phases: [{ id: 'phase_1', name: 'BASISFASE', order: 1, weekCount: 4 }, { id: 'phase_2', name: 'OPBOUW', order: 2, weekCount: 4 }] };
const W = '2026-10-05';
const ps = (id: string, templateId: string, date: string): PlannedSession => ({ id, templateId, scheduledDate: date, weekStartDate: W, status: 'planned', order: 0 });
const log = (plannedSessionId: string, templateId: string, date: string, extra: Partial<SessionLog> = {}): SessionLog => ({
  id: `l-${plannedSessionId}`, plannedSessionId, templateId, type: templates.find((t) => t.id === templateId)!.type, completedDate: date, completedAt: `${date}T10:00:00Z`, variant: 'full', durationMinutes: 40, source: 'manual', ...extra,
});
const week = [
  ps('rest', 'tpl_herstel', '2026-10-05'), ps('ua', 'tpl_upper_a', '2026-10-06'), ps('la', 'tpl_lower_a', '2026-10-07'),
  ps('er', 'tpl_easy_run', '2026-10-08'), ps('ub', 'tpl_upper_b', '2026-10-09'), ps('hi', 'tpl_hill_intervals', '2026-10-10'), ps('lr', 'tpl_long_run', '2026-10-11'),
];

describe('buildWeekReview', () => {
  it('counts trainings without the rest day and bundles what was missed into one line', () => {
    const logs = [
      log('ua', 'tpl_upper_a', '2026-10-06'), log('la', 'tpl_lower_a', '2026-10-07'),
      log('er', 'tpl_easy_run', '2026-10-08', { cardioData: { durationMinutes: 30, distanceKm: 5.2, modality: 'run_outdoor', source: 'manual' } }),
      log('ub', 'tpl_upper_b', '2026-10-09'),
    ];
    const review = buildWeekReview({ weekStart: W, plannedSessions: week, logs, templates, program, planChangeLog: [], asOf: '2026-10-12' })!;
    expect(review.planned).toBe(6);
    expect(review.done).toBe(4);
    expect(review.missed).toEqual(['Heuvelintervallen', 'Lange duurloop']);
    expect(review.perSport).toEqual(['Hardlopen: 5,2 km']);
    expect(review.advice[0]).toContain('Heuvelintervallen en Lange duurloop schoten erbij in');
    expect(review.advice[0]).toContain('haalt ASCEND in');
    expect(review.title).toBe('Week 2 van 4, basisfase');
  });

  it('says so when everything was done, and flags trainings that felt much harder than planned', () => {
    const logs = week.filter((s) => s.templateId !== 'tpl_herstel').map((s) => log(s.id, s.templateId, s.scheduledDate, s.templateId === 'tpl_easy_run' || s.templateId === 'tpl_long_run' ? { rpe: 7 } : {}));
    const review = buildWeekReview({ weekStart: W, plannedSessions: week, logs, templates, program, planChangeLog: [], asOf: '2026-10-11' })!;
    expect(review.advice[0]).toBe('Alles gedaan wat gepland stond. Zo bouw je op.');
    expect(review.heavier).toBe(2);
    expect(review.advice.some((a) => a.includes('zwaarder dan gepland'))).toBe(true);
  });

  it('reviews no week before week 1', () => {
    expect(buildWeekReview({ weekStart: '2026-09-21', plannedSessions: [], logs: [], templates, program, planChangeLog: [], asOf: '2026-10-05' })).toBeNull();
  });

  it('shows this week on Sunday and last week on Monday', () => {
    expect(reviewWeekFor('2026-10-11', 7)).toBe('2026-10-05');
    expect(reviewWeekFor('2026-10-12', 1)).toBe('2026-10-05');
    expect(reviewWeekFor('2026-10-08', 4)).toBeUndefined();
  });
});

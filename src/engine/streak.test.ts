import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { computeCurrentStreak } from './streak';
import { leftOutOfCount } from './weekLogs';
import type { PlanChangeProposal } from '../models/planChange';
import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';

// Vandaag is donderdag 22 oktober 2026.
beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-22T12:00:00'));
});
afterAll(() => vi.useRealTimers());

const templateById = new Map<string, Pick<SessionTemplate, 'type'>>([
  ['run', { type: 'cardio' }],
  ['rest', { type: 'recovery' }],
]);
const ps = (id: string, templateId: string, date: string, extra: Partial<PlannedSession> = {}): PlannedSession => ({
  id, templateId, scheduledDate: date, weekStartDate: '2026-10-19', status: 'planned', order: 0, ...extra,
});
const log = (plannedSessionId: string, date: string): SessionLog => ({
  id: `l-${plannedSessionId}`, plannedSessionId, templateId: 'run', type: 'cardio', completedDate: date, completedAt: `${date}T10:00:00Z`,
  variant: 'full', durationMinutes: 40, source: 'manual',
});

describe('computeCurrentStreak', () => {
  it('telt dagen met een afgeronde training op rij', () => {
    const planned = [ps('a', 'run', '2026-10-20'), ps('b', 'run', '2026-10-21')];
    expect(computeCurrentStreak(planned, [log('a', '2026-10-20'), log('b', '2026-10-21')], { templateById })).toBe(2);
  });

  it('breekt niet op een rustdag zonder log', () => {
    const planned = [ps('a', 'run', '2026-10-19'), ps('r', 'rest', '2026-10-20'), ps('b', 'run', '2026-10-21')];
    const logs = [log('a', '2026-10-19'), log('b', '2026-10-21')];
    expect(computeCurrentStreak(planned, logs, { templateById })).toBe(2);
  });

  it('breekt wel op een gemiste training', () => {
    const planned = [ps('a', 'run', '2026-10-19'), ps('m', 'run', '2026-10-20'), ps('b', 'run', '2026-10-21')];
    expect(computeCurrentStreak(planned, [log('a', '2026-10-19'), log('b', '2026-10-21')], { templateById })).toBe(1);
  });

  it('slaat een ziektedag over', () => {
    const planned = [ps('a', 'run', '2026-10-19'), ps('z', 'run', '2026-10-20', { status: 'skipped' }), ps('b', 'run', '2026-10-21')];
    const illnessEpisodes = [{ id: 'i', kind: 'above_neck' as const, startDate: '2026-10-20', endDate: '2026-10-20' }];
    expect(computeCurrentStreak(planned, [log('a', '2026-10-19'), log('b', '2026-10-21')], { templateById, illnessEpisodes })).toBe(2);
  });

  it('slaat een sessie over die door een vakantie is vervallen', () => {
    const dropped = ps('v', 'run', '2026-10-20', { status: 'skipped', leave: { periodId: 'p', role: 'dropped' } });
    const planned = [ps('a', 'run', '2026-10-19'), dropped, ps('b', 'run', '2026-10-21')];
    expect(computeCurrentStreak(planned, [log('a', '2026-10-19'), log('b', '2026-10-21')], { templateById })).toBe(2);
  });

  it('breekt wel op een sessie die je zelf overgeslagen hebt', () => {
    const planned = [ps('a', 'run', '2026-10-19'), ps('s', 'run', '2026-10-20', { status: 'skipped' }), ps('b', 'run', '2026-10-21')];
    expect(computeCurrentStreak(planned, [log('a', '2026-10-19'), log('b', '2026-10-21')], { templateById })).toBe(1);
  });

  it('breekt niet op een sessie die ASCEND zelf weghaalde, net als op Week', () => {
    const removed = ps('x', 'run', '2026-10-20', { status: 'skipped' });
    const planned = [ps('a', 'run', '2026-10-19'), removed, ps('b', 'run', '2026-10-21')];
    const logs = [log('a', '2026-10-19'), log('b', '2026-10-21')];
    const proposal = (trigger: PlanChangeProposal['trigger']): PlanChangeProposal => ({
      id: `p-${trigger}`, trigger, issue: 'i', alternatives: [], consequences: '', explanation: '', createdAt: '', resolution: 'accepted',
      changes: [{ plannedSessionId: 'x', action: 'remove', fromDate: '2026-10-20', reason: 'r', generatedBy: [] }],
    });
    const byPlan = leftOutOfCount(planned, [proposal('plan_check')], undefined, '2026-10-22');
    expect(computeCurrentStreak(planned, logs, { templateById, leftOut: byPlan })).toBe(2);
    // Sloeg je hem zelf over, dan breekt hij de reeks wel.
    const byYou = leftOutOfCount(planned, [proposal('session_skipped')], undefined, '2026-10-22');
    expect(computeCurrentStreak(planned, logs, { templateById, leftOut: byYou })).toBe(1);
  });

  it('telt dagen voor de start van het programma niet', () => {
    const planned = [ps('old', 'run', '2026-10-19'), ps('b', 'run', '2026-10-21')];
    expect(computeCurrentStreak(planned, [log('b', '2026-10-21')], { templateById, programStart: '2026-10-20' })).toBe(1);
  });

  it('wacht met vandaag als de training van vandaag nog open staat', () => {
    const planned = [ps('b', 'run', '2026-10-21'), ps('t', 'run', '2026-10-22')];
    expect(computeCurrentStreak(planned, [log('b', '2026-10-21')], { templateById })).toBe(1);
  });
});

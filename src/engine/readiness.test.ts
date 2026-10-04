import { describe, it, expect } from 'vitest';
import { computeReadiness, computeReadinessTrend } from './readiness';
import type { PlannedSession, SessionLog } from '../models/training';

const ASOF = '2026-09-28';

function log(overrides: Partial<SessionLog> = {}): SessionLog {
  return {
    id: `l-${Math.random()}`,
    templateId: 'tpl_x',
    type: 'strength',
    completedDate: ASOF,
    completedAt: `${ASOF}T10:00:00.000Z`,
    variant: 'full',
    durationMinutes: 60,
    source: 'manual',
    ...overrides,
  };
}

function planned(id: string, scheduledDate: string): PlannedSession {
  return { id, templateId: 'tpl_x', scheduledDate, weekStartDate: '2026-09-21', status: 'planned', order: 0 };
}

describe('computeReadiness', () => {
  it('with no data, rest is fine, nothing is due and the overall leaves consistency out', () => {
    const result = computeReadiness([], [], 28, ASOF);
    // Every day without training is a rest day.
    expect(result.recovery).toBe(100);
    expect(result.consistency).toBe(0);
    expect(result.consistencyBasis).toBe(0);
    expect(result.overall).toBe(100);
    // No subjective data yet is never read as a bad signal.
    expect(result.subjectiveSignal).toBe(100);
  });

  it('an unlogged rest day is never a miss and counts as recovery (audit 2026-10)', () => {
    const rest = { id: 'r', templateId: 'tpl_recovery', scheduledDate: '2026-09-01', weekStartDate: '2026-08-31', status: 'planned' as const, order: 0 };
    const result = computeReadiness([], [rest], 28, ASOF, undefined, undefined, { isRest: (p) => p.templateId === 'tpl_recovery' });
    expect(result.consistencyBasis).toBe(0);
  });

  it('a session dropped after it was missed still counts as missed', () => {
    const s = { id: 'm', templateId: 'tpl_x', scheduledDate: '2026-09-01', weekStartDate: '2026-08-31', status: 'skipped' as const, order: 0 };
    const result = computeReadiness([], [s], 28, ASOF, undefined, undefined, { droppedAfterMissIds: new Set(['m']) });
    expect(result.consistencyBasis).toBe(1);
    expect(result.consistency).toBe(0);
  });

  it('reaches 100% recovery at 1 recovery session/week over a 28-day window', () => {
    const logs = Array.from({ length: 4 }, () => log({ type: 'recovery' }));
    expect(computeReadiness(logs, [], 28, ASOF).recovery).toBe(100);
  });

  it('consistency is the share of planned sessions in the window that have a log', () => {
    const plannedSessions = [planned('p1', '2026-09-27'), planned('p2', '2026-09-27')];
    const logs = [log({ plannedSessionId: 'p1' })];
    expect(computeReadiness(logs, plannedSessions, 28, ASOF).consistency).toBe(50);
  });

  // Production feedback: "30% consistentie terwijl ik letterlijk in mijn
  // eerste week zit".
  it('only counts sessions from week 1 on, skips taken-off sessions, and never counts today as missed', () => {
    const plannedSessions = [
      planned('before', '2026-09-21'), // old schedule, before the restart
      planned('mon', '2026-09-28'),
      { ...planned('skippedCopy', '2026-09-29'), status: 'skipped' as const },
      planned('wed', '2026-09-30'),
      planned('today', '2026-10-01'), // not done yet
    ];
    const logs = [log({ plannedSessionId: 'mon', completedDate: '2026-09-28' }), log({ plannedSessionId: 'wed', completedDate: '2026-09-30' })];
    const result = computeReadiness(logs, plannedSessions, 28, '2026-10-01', '2026-09-28');
    expect(result.consistency).toBe(100);
    expect(result.consistencyBasis).toBe(2);
    // Without the program start, the old schedule drags it down.
    expect(computeReadiness(logs, plannedSessions, 28, '2026-10-01').consistency).toBe(67);
  });

  it('has no basis yet on the first day of a fresh start', () => {
    expect(computeReadiness([], [planned('mon', '2026-09-28')], 28, '2026-09-28', '2026-09-28').consistencyBasis).toBe(0);
  });

  it('subjectiveSignal reflects the share of recent logs that were not "worse"', () => {
    const logs = [
      log({ subjectiveFeel: 'normal' }),
      log({ subjectiveFeel: 'worse' }),
      log({ subjectiveFeel: 'better' }),
      log({ subjectiveFeel: 'worse' }),
    ];
    expect(computeReadiness(logs, [], 28, ASOF).subjectiveSignal).toBe(50);
  });

  it('never lets a fitness/exposure signal (strength, cardio, D+, etc.) leak into readiness — that is engine/capacity.ts\'s job now', () => {
    const result = computeReadiness([], [], 28, ASOF);
    expect(result).not.toHaveProperty('strength');
    expect(result).not.toHaveProperty('cardio');
    expect(result).not.toHaveProperty('climbing');
    expect(result).not.toHaveProperty('endurance');
    expect(result).not.toHaveProperty('packCapability');
  });

  it('overall is the unweighted mean of recovery, consistency and subjectiveSignal', () => {
    const plannedSessions = [planned('p1', ASOF)];
    const logs = [log({ type: 'recovery', plannedSessionId: 'p1', subjectiveFeel: 'normal' })];
    const result = computeReadiness(logs, plannedSessions, 28, ASOF);
    expect(result.overall).toBe(Math.round((result.recovery + result.consistency + result.subjectiveSignal) / 3));
  });
});

describe('computeReadinessTrend', () => {
  it('returns one point per requested week, most recent last', () => {
    const points = computeReadinessTrend([], [], 4);
    expect(points).toHaveLength(4);
  });
});

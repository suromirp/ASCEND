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
  it('returns all zeros/neutral for no data at all', () => {
    const result = computeReadiness([], [], 28, ASOF);
    expect(result.recovery).toBe(0);
    expect(result.consistency).toBe(0);
    // No subjective data yet is never read as a bad signal.
    expect(result.subjectiveSignal).toBe(100);
  });

  it('reaches 100% recovery at 1 recovery session/week over a 28-day window', () => {
    const logs = Array.from({ length: 4 }, () => log({ type: 'recovery' }));
    expect(computeReadiness(logs, [], 28, ASOF).recovery).toBe(100);
  });

  it('consistency is the share of planned sessions in the window that have a log', () => {
    const plannedSessions = [planned('p1', ASOF), planned('p2', ASOF)];
    const logs = [log({ plannedSessionId: 'p1' })];
    expect(computeReadiness(logs, plannedSessions, 28, ASOF).consistency).toBe(50);
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

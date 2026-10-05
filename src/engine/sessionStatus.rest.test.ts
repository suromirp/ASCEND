import { describe, it, expect } from 'vitest';
import { deriveSessionStatus } from './sessionStatus';
import type { PlannedSession, SessionLog } from '../models/training';

const rest: PlannedSession = { id: 'r', templateId: 'tpl_herstel', scheduledDate: '2020-01-06', weekStartDate: '2020-01-06', status: 'planned', order: 0 };

describe('deriveSessionStatus on a rest day', () => {
  it('is never missed and never waits to be ticked off', () => {
    expect(deriveSessionStatus(rest, [], true).status).toBe('rest');
    expect(deriveSessionStatus(rest, [], false).status).toBe('missed');
  });

  it('a logged walk on it still shows as done', () => {
    const walk = { id: 'l', plannedSessionId: 'r', templateId: 'tpl_herstel', type: 'recovery', completedDate: '2020-01-06', completedAt: '', variant: 'full', durationMinutes: 30, source: 'manual' } as SessionLog;
    expect(deriveSessionStatus(rest, [walk], true).status).toBe('completed');
  });
});

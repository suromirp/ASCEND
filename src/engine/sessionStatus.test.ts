import { describe, it, expect } from 'vitest';
import { deriveSessionStatus } from './sessionStatus';
import { addDays, mondayOfWeek, todayISO } from '../utils/dates';
import type { PlannedSession, SessionLog } from '../models/training';

// Locks in the completion-derivation rule CLAUDE.md calls out explicitly:
// "completed" is never a stored flag, only ever derived from a matching
// SessionLog existing.

const today = todayISO();
const weekStart = mondayOfWeek(today);

function session(overrides: Partial<PlannedSession> = {}): PlannedSession {
  return { id: 's1', templateId: 'tpl_easy_run', scheduledDate: today, weekStartDate: weekStart, status: 'planned', order: 0, ...overrides };
}

function log(plannedSessionId: string): SessionLog {
  return {
    id: 'l1',
    plannedSessionId,
    templateId: 'tpl_easy_run',
    type: 'cardio',
    completedDate: today,
    completedAt: new Date().toISOString(),
    variant: 'full',
    durationMinutes: 30,
    source: 'manual',
  };
}

describe('deriveSessionStatus', () => {
  it('is completed the moment a matching SessionLog exists, regardless of status field', () => {
    const s = session({ status: 'skipped' }); // even a session marked skipped reads as completed if a log exists
    const result = deriveSessionStatus(s, [log('s1')]);
    expect(result.status).toBe('completed');
    expect(result.log?.id).toBe('l1');
  });

  it('is skipped when explicitly marked and no log exists', () => {
    const s = session({ status: 'skipped' });
    expect(deriveSessionStatus(s, []).status).toBe('skipped');
  });

  it('is today for an unresolved session scheduled today', () => {
    const s = session({ scheduledDate: today });
    expect(deriveSessionStatus(s, []).status).toBe('today');
  });

  it('is missed for a past, unlogged, non-skipped session', () => {
    const s = session({ scheduledDate: addDays(today, -3) });
    expect(deriveSessionStatus(s, []).status).toBe('missed');
  });

  it('is moved for a future session whose status is moved', () => {
    const s = session({ scheduledDate: addDays(today, 3), status: 'moved', movedFromDate: today });
    const result = deriveSessionStatus(s, []);
    expect(result.status).toBe('moved');
    expect(result.wasMoved).toBe(true);
  });

  it('is planned for a future session with no special status', () => {
    const s = session({ scheduledDate: addDays(today, 3) });
    expect(deriveSessionStatus(s, []).status).toBe('planned');
  });
});

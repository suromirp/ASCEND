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

  // Warden Planning punt 8: een verplaatsing door het systeem heet nergens
  // "verplaatst" alsof jij het deed; die van jou of van een aangenomen voorstel wel.
  it('only calls a session moved when you or a proposal you accepted moved it', () => {
    const yesterday = addDays(today, -1);
    expect(deriveSessionStatus(session({ movedFromDate: yesterday }), []).wasMoved).toBe(false);
    expect(deriveSessionStatus(session({ movedFromDate: yesterday }), [log('s1')]).wasMoved).toBe(false);
    expect(deriveSessionStatus(session({ movedFromDate: yesterday, status: 'moved' }), []).wasMoved).toBe(true);
    expect(deriveSessionStatus(session({ movedFromDate: yesterday, lock: { by: 'proposal', proposalId: 'p', at: '' } }), []).wasMoved).toBe(true);
  });

  it('does not call a swap of kind on the same day "verplaatst"', () => {
    const lock = { by: 'proposal' as const, proposalId: 'p', at: '' };
    expect(deriveSessionStatus(session({ movedFromDate: today, lock }), []).wasMoved).toBe(false);
    expect(deriveSessionStatus(session({ movedFromDate: today, lock }), [log('s1')]).wasMoved).toBe(false);
  });
});

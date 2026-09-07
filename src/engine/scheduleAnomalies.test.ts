import { describe, it, expect } from 'vitest';
import { detectConsecutiveRestDays, buildConsecutiveRestFixProposal } from './scheduleAnomalies';
import type { PlannedSession, SessionTemplate, SessionLog } from '../models/training';
import type { TrainingAvailability } from '../models/goalEngineConfig';

// asOf is a Wednesday — committed range is the Monday of that week
// (2026-09-07) and the following Monday (2026-09-14).
const ASOF = '2026-09-09';
const MONDAY_1 = '2026-09-07';

function availability(overrides: Partial<TrainingAvailability> = {}): TrainingAvailability {
  return { allowedDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], maxSessionDurationMin: {}, longSessionDays: ['sun'], temporaryExceptions: [], ...overrides };
}

function session(id: string, templateId: string, scheduledDate: string, weekStartDate: string, status: PlannedSession['status'] = 'planned'): PlannedSession {
  return { id, templateId, scheduledDate, weekStartDate, status, order: 0 };
}

const tplHerstel: SessionTemplate = { id: 'tpl_herstel', name: 'Herstel', type: 'recovery', durationVariants: { full: 45 } };
const tplEasyRun: SessionTemplate = { id: 'tpl_easy_run', name: 'Easy Run', type: 'cardio', durationVariants: { full: 30 }, baseStressProfile: { lowerBodyLoad: 'none', impact: 'light', eccentricLoad: 'none', intensity: 'moderate' } };
const tplLowerA: SessionTemplate = { id: 'tpl_lower_a', name: 'Lower A', type: 'strength', durationVariants: { full: 75 }, baseStressProfile: { lowerBodyLoad: 'heavy', impact: 'light', eccentricLoad: 'moderate', intensity: 'high' } };
const templateById = new Map([tplHerstel, tplEasyRun, tplLowerA].map((t) => [t.id, t]));

describe('detectConsecutiveRestDays', () => {
  it('does not flag a single isolated rest day', () => {
    const sessions = [
      session('s1', 'tpl_herstel', '2026-09-06', '2026-08-31'), // Sunday, previous week (not scanned)
      session('s2', 'tpl_herstel', MONDAY_1, MONDAY_1),
      session('s3', 'tpl_easy_run', '2026-09-08', MONDAY_1),
    ];
    const runs = detectConsecutiveRestDays(sessions, templateById, [], ASOF);
    expect(runs).toHaveLength(0); // only Monday is rest here — no run of 2+
  });

  it('flags a real 2-day rest run within the committed range', () => {
    const sessions = [
      session('s1', 'tpl_herstel', '2026-09-13', '2026-09-07'), // Sunday
      session('s2', 'tpl_herstel', '2026-09-14', '2026-09-14'), // Monday next week
      session('s3', 'tpl_easy_run', '2026-09-15', '2026-09-14'),
    ];
    const runs = detectConsecutiveRestDays(sessions, templateById, [], ASOF);
    expect(runs).toHaveLength(1);
    expect(runs[0].sessions.map((s) => s.scheduledDate)).toEqual(['2026-09-13', '2026-09-14']);
  });

  it('never flags a run where every session is already logged', () => {
    const sessions = [
      session('s1', 'tpl_herstel', '2026-09-13', '2026-09-07'),
      session('s2', 'tpl_herstel', '2026-09-14', '2026-09-14'),
    ];
    const logs: SessionLog[] = [
      { id: 'l1', plannedSessionId: 's1', templateId: 'tpl_herstel', type: 'recovery', completedDate: '2026-09-13', completedAt: '2026-09-13T10:00:00.000Z', variant: 'full', durationMinutes: 45, source: 'manual' },
      { id: 'l2', plannedSessionId: 's2', templateId: 'tpl_herstel', type: 'recovery', completedDate: '2026-09-14', completedAt: '2026-09-14T10:00:00.000Z', variant: 'full', durationMinutes: 45, source: 'manual' },
    ];
    const runs = detectConsecutiveRestDays(sessions, templateById, logs, ASOF);
    expect(runs).toHaveLength(0);
  });
});

describe('buildConsecutiveRestFixProposal', () => {
  // Reproduces the actual production scenario: a fully-packed week (every
  // day already has a session) where the run's own week has no genuinely
  // empty day at all — the fix must swap with a neighboring day, never
  // require an empty slot that structurally can't exist here.
  it('swaps the later rest day with the nearest non-rest day when the week has no empty slot', () => {
    const sessions = [
      session('s1', 'tpl_herstel', '2026-09-07', '2026-09-07'),
      session('s2', 'tpl_herstel', '2026-09-08', '2026-09-07'),
      session('s3', 'tpl_lower_a', '2026-09-09', '2026-09-07'),
      session('s4', 'tpl_easy_run', '2026-09-10', '2026-09-07'),
      session('s5', 'tpl_easy_run', '2026-09-11', '2026-09-07'),
      session('s6', 'tpl_easy_run', '2026-09-12', '2026-09-07'),
      session('s7', 'tpl_easy_run', '2026-09-13', '2026-09-07'),
    ];
    const runs = detectConsecutiveRestDays(sessions, templateById, [], ASOF);
    expect(runs).toHaveLength(1);

    const proposal = buildConsecutiveRestFixProposal(runs, sessions, templateById, availability(), []);
    expect(proposal).not.toBeNull();
    expect(proposal!.changes).toHaveLength(2);

    const restMove = proposal!.changes.find((c) => c.plannedSessionId === 's2');
    const partnerMove = proposal!.changes.find((c) => c.plannedSessionId !== 's2');
    expect(restMove?.action).toBe('swap');
    expect(restMove?.pairedWithSessionId).toBe(partnerMove?.plannedSessionId);
    expect(partnerMove?.pairedWithSessionId).toBe('s2');
    // The rest day moves off 09-08; its swap partner moves onto 09-08.
    expect(restMove?.toDate).not.toBe('2026-09-08');
    expect(partnerMove?.toDate).toBe('2026-09-08');
  });

  it('never swaps in a session that would create a new leg-heavy 48h conflict', () => {
    // moveable is 2026-09-09 (the run's later day). Its immediate neighbor
    // on both sides is either part of the run (never a candidate) or the
    // already-logged Lower A on 09-10 (excluded as a swap candidate, but
    // still real load for conflict-checking). The next candidate out,
    // 09-11's Lower A, would land on moveable's old date (09-09) — 1 day
    // from the logged Lower A on 09-10 — a genuine new 48h violation, so it
    // must be refused. Nothing else is in range, so no proposal at all.
    const sessions = [
      session('s1', 'tpl_herstel', '2026-09-08', '2026-09-07'),
      session('s2', 'tpl_herstel', '2026-09-09', '2026-09-07'),
      session('s3', 'tpl_lower_a', '2026-09-10', '2026-09-07'),
      session('s4', 'tpl_lower_a', '2026-09-11', '2026-09-07'),
    ];
    const logs: SessionLog[] = [
      { id: 'l3', plannedSessionId: 's3', templateId: 'tpl_lower_a', type: 'strength', completedDate: '2026-09-10', completedAt: '2026-09-10T10:00:00.000Z', variant: 'full', durationMinutes: 75, source: 'manual' },
    ];
    const runs = detectConsecutiveRestDays(sessions, templateById, logs, ASOF);
    const proposal = buildConsecutiveRestFixProposal(runs, sessions, templateById, availability(), logs);
    expect(proposal).toBeNull();
  });

  it('never moves an already-logged session, even if it is the later one in the run', () => {
    const sessions = [
      session('s1', 'tpl_herstel', '2026-09-13', '2026-09-07'),
      session('s2', 'tpl_herstel', '2026-09-14', '2026-09-14'),
      session('s3', 'tpl_easy_run', '2026-09-12', '2026-09-07'),
    ];
    const logs: SessionLog[] = [
      { id: 'l2', plannedSessionId: 's2', templateId: 'tpl_herstel', type: 'recovery', completedDate: '2026-09-14', completedAt: '2026-09-14T10:00:00.000Z', variant: 'full', durationMinutes: 45, source: 'manual' },
    ];
    const runs = detectConsecutiveRestDays(sessions, templateById, logs, ASOF);
    const proposal = buildConsecutiveRestFixProposal(runs, sessions, templateById, availability(), logs);
    expect(proposal).not.toBeNull();
    const restMove = proposal!.changes.find((c) => c.action === 'swap' && c.fromDate === '2026-09-13');
    expect(restMove?.plannedSessionId).toBe('s1'); // the earlier, unlogged one instead of s2
  });

  it('returns null when there is nothing to fix', () => {
    const proposal = buildConsecutiveRestFixProposal([], [], templateById, availability(), []);
    expect(proposal).toBeNull();
  });
});

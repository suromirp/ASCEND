import { describe, it, expect } from 'vitest';
import { wrapAsPlanChangeProposal, applyPlanChangeItems } from './proposalEngine';
import { lockLevel } from './weekValidator';
import type { ScheduleProposal } from './scheduler';
import type { PlannedSession } from '../models/training';
import type { PlanChangeItem } from '../models/planChange';

const ASOF = '2026-09-09'; // Wednesday of the 2026-09-07 week

function session(id: string, templateId: string, scheduledDate: string, weekStartDate: string, status: PlannedSession['status'] = 'planned'): PlannedSession {
  return { id, templateId, scheduledDate, weekStartDate, status, order: 0 };
}

describe('wrapAsPlanChangeProposal', () => {
  it('maps a same-date change to a remove action (a skip)', () => {
    const scheduleProposal: ScheduleProposal = {
      changes: [{ sessionId: 's1', templateId: 'tpl_x', templateName: 'X', fromDate: '2026-09-09', toDate: '2026-09-09' }],
      reason: 'Sessie wordt overgeslagen.',
      resolved: true,
    };
    const proposal = wrapAsPlanChangeProposal(scheduleProposal, 'session_skipped', 'committed', ASOF);
    expect(proposal.changes).toEqual([{ plannedSessionId: 's1', action: 'remove', fromDate: '2026-09-09', toDate: '2026-09-09' }]);
    expect(proposal.trigger).toBe('session_skipped');
  });

  it('maps a genuine date change to a move action', () => {
    const scheduleProposal: ScheduleProposal = {
      changes: [{ sessionId: 's1', templateId: 'tpl_x', templateName: 'X', fromDate: '2026-09-09', toDate: '2026-09-10' }],
      reason: 'Verplaatst.',
      resolved: true,
    };
    const proposal = wrapAsPlanChangeProposal(scheduleProposal, 'session_moved', 'committed', ASOF);
    expect(proposal.changes).toEqual([{ plannedSessionId: 's1', action: 'move', fromDate: '2026-09-09', toDate: '2026-09-10' }]);
  });

  it('throws when a committed-zone change targets a date outside the current+next week range', () => {
    const scheduleProposal: ScheduleProposal = {
      changes: [{ sessionId: 's1', templateId: 'tpl_x', templateName: 'X', fromDate: '2026-09-09', toDate: '2026-09-25' }],
      reason: 'test',
      resolved: true,
    };
    expect(() => wrapAsPlanChangeProposal(scheduleProposal, 'session_moved', 'committed', ASOF)).toThrow(/committed/);
  });

  it('accepts a forecast-zone change targeting week +2 onward, and rejects one that is not actually in the forecast', () => {
    const forecast: ScheduleProposal = {
      changes: [{ sessionId: 's1', templateId: 'tpl_x', templateName: 'X', fromDate: '2026-09-23', toDate: '2026-09-25' }],
      reason: 'test',
      resolved: true,
    };
    expect(() => wrapAsPlanChangeProposal(forecast, 'new_training_data', 'forecast', ASOF)).not.toThrow();

    const committedShapedChange: ScheduleProposal = {
      changes: [{ sessionId: 's1', templateId: 'tpl_x', templateName: 'X', fromDate: '2026-09-09', toDate: '2026-09-10' }],
      reason: 'test',
      resolved: true,
    };
    expect(() => wrapAsPlanChangeProposal(committedShapedChange, 'new_training_data', 'forecast', ASOF)).toThrow(/forecast/);
  });
});

describe('applyPlanChangeItems', () => {
  const sessions = [session('s1', 'tpl_x', '2026-09-09', '2026-09-07'), session('s2', 'tpl_y', '2026-09-10', '2026-09-07')];

  it('keep is a no-op', () => {
    const result = applyPlanChangeItems([{ plannedSessionId: 's1', action: 'keep' }], sessions);
    expect(result.sessions).toEqual(sessions);
    expect(result.prescriptionChanges).toEqual([]);
    expect(result.unsupported).toEqual([]);
  });

  it('an accepted proposal locks what it moves and what it keeps in view; the rest stays free', () => {
    const lock = { by: 'proposal' as const, proposalId: 'p1', at: '2026-09-09T08:00:00Z' };
    const items: PlanChangeItem[] = [
      { plannedSessionId: 's1', action: 'move', fromDate: '2026-09-09', toDate: '2026-09-11', plannedMinutes: 45 },
      { plannedSessionId: 's2', action: 'keep' },
    ];
    const result = applyPlanChangeItems(items, [...sessions, session('s3', 'tpl_z', '2026-09-12', '2026-09-07')], undefined, lock);
    expect(result.sessions.find((s) => s.id === 's1')).toMatchObject({ scheduledDate: '2026-09-11', plannedMinutes: 45, lock });
    expect(result.sessions.find((s) => s.id === 's2')).toEqual({ ...sessions[1], lock });
    expect(result.sessions.find((s) => s.id === 's3')?.lock).toBeUndefined();
  });

  it('a move keeps the short length it promised (korter, 45 minuten)', () => {
    const result = applyPlanChangeItems([{ plannedSessionId: 's1', action: 'move', fromDate: '2026-09-09', toDate: '2026-09-11', plannedMinutes: 45 }], sessions);
    expect(result.sessions.find((s) => s.id === 's1')?.plannedMinutes).toBe(45);
  });

  it('move updates scheduledDate/movedFromDate on the matched session only; the system moving it keeps it the system\'s (Warden Logica punt 4)', () => {
    const items: PlanChangeItem[] = [{ plannedSessionId: 's1', action: 'move', fromDate: '2026-09-09', toDate: '2026-09-11' }];
    const result = applyPlanChangeItems(items, sessions);
    expect(result.sessions.find((s) => s.id === 's1')).toEqual({ ...sessions[0], scheduledDate: '2026-09-11', status: 'planned', movedFromDate: '2026-09-09' });
    // Not "yours": the week check may still put it right.
    expect(lockLevel(result.sessions.find((s) => s.id === 's1')!, new Set(), ASOF)).toBe(3);
    expect(result.sessions.find((s) => s.id === 's2')).toEqual(sessions[1]);
    expect(result.unsupported).toEqual([]);
  });

  it('remove sets status to skipped without deleting the row', () => {
    const result = applyPlanChangeItems([{ plannedSessionId: 's1', action: 'remove' }], sessions);
    expect(result.sessions).toHaveLength(2);
    expect(result.sessions.find((s) => s.id === 's1')?.status).toBe('skipped');
  });

  it('add appends a brand-new session using the injected id generator', () => {
    const items: PlanChangeItem[] = [{ action: 'add', newSessionDraft: { templateId: 'tpl_z', scheduledDate: '2026-09-12', weekStartDate: '2026-09-07' } }];
    const result = applyPlanChangeItems(items, sessions, () => 'fixed-id');
    expect(result.sessions).toHaveLength(3);
    expect(result.sessions[2]).toEqual({ id: 'fixed-id', templateId: 'tpl_z', scheduledDate: '2026-09-12', weekStartDate: '2026-09-07', status: 'planned', order: 2 });
  });

  // Time-budget scheduling redesign (Fase 0): confirms PAIR needs no new
  // PlanChangeAction or model change — two ordinary 'add' items that
  // happen to share a scheduledDate apply exactly like any other two
  // 'add' items. Nothing in this switch (or PlannedSession's own shape)
  // assumes a date holds at most one session.
  it('applies two "add" items on the same date cleanly — PAIR is just two ordinary adds, no special-casing needed', () => {
    const items: PlanChangeItem[] = [
      { action: 'add', newSessionDraft: { templateId: 'tpl_easy_run', scheduledDate: '2026-09-12', weekStartDate: '2026-09-07' } },
      { action: 'add', newSessionDraft: { templateId: 'tpl_upper_a', scheduledDate: '2026-09-12', weekStartDate: '2026-09-07' } },
    ];
    let counter = 0;
    const result = applyPlanChangeItems(items, sessions, () => `paired-${counter++}`);
    expect(result.sessions).toHaveLength(4);
    const paired = result.sessions.filter((s) => s.scheduledDate === '2026-09-12');
    expect(paired.map((s) => s.templateId).sort()).toEqual(['tpl_easy_run', 'tpl_upper_a']);
    expect(result.unsupported).toEqual([]);
  });

  it('never touches PlannedSession for replace/reduce (one-directional prescription relationship) — but surfaces them for the caller to actually act on, never silently drops them', () => {
    const items: PlanChangeItem[] = [
      { plannedSessionId: 's1', action: 'replace', newPrescriptionId: 'presc1' },
      { plannedSessionId: 's1', action: 'reduce', newPrescriptionId: 'presc2' },
    ];
    const result = applyPlanChangeItems(items, sessions);
    expect(result.sessions).toEqual(sessions);
    expect(result.prescriptionChanges).toEqual(items);
    expect(result.unsupported).toEqual([]);
  });

  it('reports a bare swap (no pairedWithSessionId) as unsupported, never a silent no-op success', () => {
    const items: PlanChangeItem[] = [{ plannedSessionId: 's2', action: 'swap', toDate: '2026-09-11' }];
    const result = applyPlanChangeItems(items, sessions);
    expect(result.sessions).toEqual(sessions);
    expect(result.unsupported).toEqual(items);
  });

  it('reports one half of a swap as unsupported when its named partner is missing from the batch', () => {
    const items: PlanChangeItem[] = [{ plannedSessionId: 's1', action: 'swap', toDate: '2026-09-10', pairedWithSessionId: 's2' }];
    const result = applyPlanChangeItems(items, sessions);
    expect(result.sessions).toEqual(sessions);
    expect(result.unsupported).toEqual(items);
  });

  it('reports one half of a swap as unsupported when the named partner does not mirror it back', () => {
    const items: PlanChangeItem[] = [
      { plannedSessionId: 's1', action: 'swap', toDate: '2026-09-10', pairedWithSessionId: 's2' },
      { plannedSessionId: 's2', action: 'swap', toDate: '2026-09-09', pairedWithSessionId: 'someone-else' },
    ];
    const result = applyPlanChangeItems(items, sessions);
    expect(result.unsupported).toEqual(items);
  });

  it('applies a genuine, well-formed swap — both sessions exchange dates', () => {
    const items: PlanChangeItem[] = [
      { plannedSessionId: 's1', action: 'swap', fromDate: '2026-09-09', toDate: '2026-09-10', pairedWithSessionId: 's2' },
      { plannedSessionId: 's2', action: 'swap', fromDate: '2026-09-10', toDate: '2026-09-09', pairedWithSessionId: 's1' },
    ];
    const result = applyPlanChangeItems(items, sessions);
    expect(result.unsupported).toEqual([]);
    expect(result.sessions.find((s) => s.id === 's1')).toEqual({ ...sessions[0], scheduledDate: '2026-09-10', status: 'planned', movedFromDate: '2026-09-09' });
    expect(result.sessions.find((s) => s.id === 's2')).toEqual({ ...sessions[1], scheduledDate: '2026-09-09', status: 'planned', movedFromDate: '2026-09-10' });
  });

  it('an accepted proposal (a lock) makes a move yours: status moved, level 1', () => {
    const lock = { by: 'proposal' as const, at: '2026-09-09T08:00:00.000Z' };
    const result = applyPlanChangeItems([{ plannedSessionId: 's1', action: 'move', fromDate: '2026-09-09', toDate: '2026-09-11' }], sessions, undefined, lock);
    const moved = result.sessions.find((s) => s.id === 's1')!;
    expect(moved).toMatchObject({ status: 'moved', lock });
    expect(lockLevel(moved, new Set(), ASOF)).toBe(1);
  });

  it('a move with another template changes the training on that day (a long run that becomes a mountain hike)', () => {
    const result = applyPlanChangeItems([{ plannedSessionId: 's1', action: 'move', fromDate: '2026-09-09', toDate: '2026-09-09', templateId: 'tpl_y', restore: true }], sessions);
    expect(result.sessions.find((s) => s.id === 's1')).toMatchObject({ templateId: 'tpl_y', scheduledDate: '2026-09-09', status: 'planned' });
  });

  it('a restore add or remove (the system\'s own layout) sets no lock', () => {
    const lock = { by: 'proposal' as const, at: '2026-09-09T08:00:00.000Z' };
    const result = applyPlanChangeItems([
      { action: 'add', restore: true, newSessionDraft: { templateId: 'tpl_z', scheduledDate: '2026-09-12', weekStartDate: '2026-09-07' } },
      { plannedSessionId: 's2', action: 'remove', restore: true, fromDate: '2026-09-10' },
    ], sessions, () => 'new1', lock);
    expect(result.sessions.find((s) => s.id === 'new1')?.lock).toBeUndefined();
    expect(result.sessions.find((s) => s.id === 's2')).toMatchObject({ status: 'skipped' });
    expect(result.sessions.find((s) => s.id === 's2')?.lock).toBeUndefined();
  });

  it('reports a malformed move/remove/add item (missing required fields) as unsupported rather than silently ignoring it', () => {
    const malformed: PlanChangeItem[] = [
      { action: 'move' }, // no plannedSessionId/toDate
      { action: 'remove' }, // no plannedSessionId
      { action: 'add' }, // no newSessionDraft
    ];
    const result = applyPlanChangeItems(malformed, sessions);
    expect(result.sessions).toEqual(sessions);
    expect(result.unsupported).toEqual(malformed);
  });
});

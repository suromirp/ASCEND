import { describe, it, expect } from 'vitest';
import { wrapAsPlanChangeProposal, applyPlanChangeItems } from './proposalEngine';
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

  it('move updates scheduledDate/status/movedFromDate on the matched session only', () => {
    const items: PlanChangeItem[] = [{ plannedSessionId: 's1', action: 'move', fromDate: '2026-09-09', toDate: '2026-09-11' }];
    const result = applyPlanChangeItems(items, sessions);
    expect(result.sessions.find((s) => s.id === 's1')).toEqual({ ...sessions[0], scheduledDate: '2026-09-11', status: 'moved', movedFromDate: '2026-09-09' });
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
    expect(result.sessions.find((s) => s.id === 's1')).toEqual({ ...sessions[0], scheduledDate: '2026-09-10', status: 'moved', movedFromDate: '2026-09-09' });
    expect(result.sessions.find((s) => s.id === 's2')).toEqual({ ...sessions[1], scheduledDate: '2026-09-09', status: 'moved', movedFromDate: '2026-09-10' });
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

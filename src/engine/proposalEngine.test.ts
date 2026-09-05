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
    const proposal = wrapAsPlanChangeProposal(scheduleProposal, 'session_skipped', ASOF);
    expect(proposal.changes).toEqual([{ plannedSessionId: 's1', action: 'remove', fromDate: '2026-09-09', toDate: '2026-09-09' }]);
    expect(proposal.trigger).toBe('session_skipped');
  });

  it('maps a genuine date change to a move action', () => {
    const scheduleProposal: ScheduleProposal = {
      changes: [{ sessionId: 's1', templateId: 'tpl_x', templateName: 'X', fromDate: '2026-09-09', toDate: '2026-09-10' }],
      reason: 'Verplaatst.',
      resolved: true,
    };
    const proposal = wrapAsPlanChangeProposal(scheduleProposal, 'session_moved', ASOF);
    expect(proposal.changes).toEqual([{ plannedSessionId: 's1', action: 'move', fromDate: '2026-09-09', toDate: '2026-09-10' }]);
  });

  it('throws when a change targets a date outside the committed (current+next week) range', () => {
    const scheduleProposal: ScheduleProposal = {
      changes: [{ sessionId: 's1', templateId: 'tpl_x', templateName: 'X', fromDate: '2026-09-09', toDate: '2026-09-25' }],
      reason: 'test',
      resolved: true,
    };
    expect(() => wrapAsPlanChangeProposal(scheduleProposal, 'session_moved', ASOF)).toThrow(/committed/);
  });
});

describe('applyPlanChangeItems', () => {
  const sessions = [session('s1', 'tpl_x', '2026-09-09', '2026-09-07'), session('s2', 'tpl_y', '2026-09-10', '2026-09-07')];

  it('keep is a no-op', () => {
    const items: PlanChangeItem[] = [{ plannedSessionId: 's1', action: 'keep' }];
    expect(applyPlanChangeItems(items, sessions)).toEqual(sessions);
  });

  it('move updates scheduledDate/status/movedFromDate on the matched session only', () => {
    const items: PlanChangeItem[] = [{ plannedSessionId: 's1', action: 'move', fromDate: '2026-09-09', toDate: '2026-09-11' }];
    const result = applyPlanChangeItems(items, sessions);
    expect(result.find((s) => s.id === 's1')).toEqual({ ...sessions[0], scheduledDate: '2026-09-11', status: 'moved', movedFromDate: '2026-09-09' });
    expect(result.find((s) => s.id === 's2')).toEqual(sessions[1]);
  });

  it('remove sets status to skipped without deleting the row', () => {
    const items: PlanChangeItem[] = [{ plannedSessionId: 's1', action: 'remove' }];
    const result = applyPlanChangeItems(items, sessions);
    expect(result).toHaveLength(2);
    expect(result.find((s) => s.id === 's1')?.status).toBe('skipped');
  });

  it('add appends a brand-new session using the injected id generator', () => {
    const items: PlanChangeItem[] = [{ action: 'add', newSessionDraft: { templateId: 'tpl_z', scheduledDate: '2026-09-12', weekStartDate: '2026-09-07' } }];
    const result = applyPlanChangeItems(items, sessions, () => 'fixed-id');
    expect(result).toHaveLength(3);
    expect(result[2]).toEqual({ id: 'fixed-id', templateId: 'tpl_z', scheduledDate: '2026-09-12', weekStartDate: '2026-09-07', status: 'planned', order: 2 });
  });

  it('replace/swap/reduce never touch PlannedSession — they are prescription-level concerns with no writer yet', () => {
    const items: PlanChangeItem[] = [
      { plannedSessionId: 's1', action: 'replace', newPrescriptionId: 'presc1' },
      { plannedSessionId: 's2', action: 'swap' },
      { plannedSessionId: 's1', action: 'reduce' },
    ];
    expect(applyPlanChangeItems(items, sessions)).toEqual(sessions);
  });
});

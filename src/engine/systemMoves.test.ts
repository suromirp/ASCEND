import { describe, it, expect } from 'vitest';
import { systemMovedRows } from './systemMoves';
import type { PlannedSession } from '../models/training';
import type { PlanChangeProposal } from '../models/planChange';

// Warden Logica punt 4: een verplaatsing door het systeem kreeg de status
// 'moved' en telde daarna als "van jou". Oude rijen waarvan het wijzigingslog
// zegt dat het systeem ze verplaatste, worden weer van het systeem; bij twijfel
// blijft alles zoals het is.

const TODAY = '2026-10-21';
const row = (id: string, date: string, over: Partial<PlannedSession> = {}): PlannedSession => ({
  id, templateId: 'tpl_lower', scheduledDate: date, weekStartDate: '2026-10-19', status: 'moved', movedFromDate: '2026-10-21', order: 0, ...over,
});
const proposal = (trigger: PlanChangeProposal['trigger'], sessionId: string, toDate: string, over: Partial<PlanChangeProposal> = {}): PlanChangeProposal => ({
  id: `p-${trigger}-${sessionId}`, trigger, issue: '', alternatives: [], consequences: '', explanation: '', createdAt: '2026-10-20T08:00:00.000Z',
  resolvedAt: '2026-10-20T08:00:00.000Z', resolution: 'accepted',
  changes: [{ plannedSessionId: sessionId, action: 'move', fromDate: '2026-10-21', toDate }],
  ...over,
});

describe('systemMovedRows', () => {
  it('geeft een rij die de weekprescriptie of een krachtblok verplaatste terug aan het systeem', () => {
    const rows = [row('a', '2026-10-22'), row('b', '2026-10-23')];
    const out = systemMovedRows(rows, [proposal('weekly_prescription_computed', 'a', '2026-10-22'), proposal('strength_program_changed', 'b', '2026-10-23')], [], TODAY);
    expect(out.map((s) => s.id)).toEqual(['a', 'b']);
    for (const s of out) {
      expect(s.status).toBe('planned');
      expect(s.movedFromDate).toBe('2026-10-21');
    }
  });

  it('laat staan wat jij verplaatste, wat een slot heeft, wat voorbij of gelogd is, en waar het log niets over zegt', () => {
    const rows = [
      row('mine', '2026-10-22'),
      row('locked', '2026-10-22', { lock: { by: 'user', at: '' } }),
      row('past', '2026-10-20'),
      row('logged', '2026-10-24'),
      row('unknown', '2026-10-25'),
      row('later', '2026-10-26'),
    ];
    const proposals = [
      proposal('session_moved', 'mine', '2026-10-22'),
      proposal('weekly_prescription_computed', 'locked', '2026-10-22'),
      proposal('weekly_prescription_computed', 'past', '2026-10-20'),
      proposal('weekly_prescription_computed', 'logged', '2026-10-24'),
      // The system moved it once, but it stands somewhere else now: not this move.
      proposal('weekly_prescription_computed', 'later', '2026-10-25'),
    ];
    const logs = [{ id: 'l', plannedSessionId: 'logged' }] as never;
    expect(systemMovedRows(rows, proposals, logs, TODAY)).toEqual([]);
  });

  it('telt een ongedaan gemaakt voorstel niet mee', () => {
    const p = proposal('weekly_prescription_computed', 'a', '2026-10-22');
    const undo = { ...proposal('weekly_prescription_computed', 'x', '2026-10-22'), id: 'undo', changes: [], revertsProposalId: p.id };
    expect(systemMovedRows([row('a', '2026-10-22')], [p, undo], [], TODAY)).toEqual([]);
  });

  // Warden Planning punt 5: met Altijd eerst vragen nam je de weekprescriptie
  // zelf aan als coachpunt. Die rij is van jou en blijft van jou.
  it('laat staan wat je zelf aannam in Vraag eerst, en wat na nieuwe trainingsgegevens verplaatste', () => {
    const rows = [row('later-akkoord', '2026-10-22'), row('snel-akkoord', '2026-10-23'), row('data', '2026-10-24'), row('vanzelf', '2026-10-25')];
    const proposals = [
      // Worked out at the opening, accepted by you a few minutes later.
      proposal('weekly_prescription_computed', 'later-akkoord', '2026-10-22', { createdAt: '2026-10-20T08:00:00.000Z', resolvedAt: '2026-10-20T08:04:00.000Z' }),
      // Accepted by you within seconds: the coach item's answer says so.
      proposal('weekly_prescription_computed', 'snel-akkoord', '2026-10-23', { createdAt: '2026-10-20T09:00:00.000Z', resolvedAt: '2026-10-20T09:00:03.000Z' }),
      proposal('new_training_data', 'data', '2026-10-24'),
      // Applied by itself, stored at once, no answer of yours near it.
      proposal('weekly_prescription_computed', 'vanzelf', '2026-10-25', { createdAt: '2026-10-19T07:00:00.000Z', resolvedAt: '2026-10-19T07:00:00.500Z' }),
    ];
    const responses = { 'planner:abc': { response: 'accepted' as const, at: '2026-10-20T09:00:03.200Z', ruleId: 'WEEKLY-PRESCRIPTION' } };
    expect(systemMovedRows(rows, proposals, [], TODAY, responses).map((s) => s.id)).toEqual(['vanzelf']);
  });
});

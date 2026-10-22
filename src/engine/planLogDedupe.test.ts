import { describe, it, expect } from 'vitest';
import { findDuplicateWeeklyLines } from './planLogDedupe';
import type { PlanChangeProposal, PlanChangeItem } from '../models/planChange';

let n = 0;
function line(at: string, over: Partial<PlanChangeProposal> = {}, changes?: PlanChangeItem[]): PlanChangeProposal {
  n++;
  return {
    id: `pcp_${n}`,
    trigger: 'weekly_prescription_computed',
    issue: 'Weekprescriptie bijgewerkt',
    changes: changes ?? [
      { plannedSessionId: 's1', action: 'replace', newPrescriptionId: `fresh_${n}_a`, reason: 'Meer duur', generatedBy: ['x'] },
      { plannedSessionId: 's2', action: 'replace', newPrescriptionId: `fresh_${n}_b`, reason: 'Meer afstand', generatedBy: ['x'] },
    ],
    alternatives: [],
    consequences: 'Wordt toegepast op het forecast-bereik.',
    explanation: 'Gebaseerd op actieve doelen.',
    createdAt: at,
    resolvedAt: at,
    resolution: 'accepted',
    ...over,
  };
}

describe('findDuplicateWeeklyLines', () => {
  it('voegt een reeks identieke regels samen tot de eerste', () => {
    const rows = [line('2026-10-01T08:00:00Z'), line('2026-10-02T08:00:00Z'), line('2026-10-03T08:00:00Z'), line('2026-10-04T08:00:00Z')];
    const { removeIds, runs } = findDuplicateWeeklyLines(rows);
    expect(removeIds).toEqual([rows[1].id, rows[2].id, rows[3].id]);
    expect(runs).toBe(1);
  });

  it('let niet op de volgorde waarin de rijen binnenkomen', () => {
    const rows = [line('2026-10-03T08:00:00Z'), line('2026-10-01T08:00:00Z'), line('2026-10-02T08:00:00Z')];
    const { removeIds } = findDuplicateWeeklyLines(rows);
    expect(new Set(removeIds)).toEqual(new Set([rows[2].id, rows[0].id]));
  });

  it('houdt een regel met een andere inhoud en begint daarna opnieuw', () => {
    const other: PlanChangeItem[] = [{ plannedSessionId: 's9', action: 'replace', newPrescriptionId: 'x', reason: 'Iets anders' }];
    const rows = [line('2026-10-01T08:00:00Z'), line('2026-10-02T08:00:00Z'), line('2026-10-03T08:00:00Z', {}, other), line('2026-10-04T08:00:00Z'), line('2026-10-05T08:00:00Z')];
    const { removeIds, runs } = findDuplicateWeeklyLines(rows);
    expect(removeIds).toEqual([rows[1].id, rows[4].id]);
    expect(runs).toBe(2);
  });

  it('voegt niet samen over een regel van iets anders heen', () => {
    const move = line('2026-10-02T12:00:00Z', { trigger: 'session_moved', issue: 'Verplaatst' }, [{ plannedSessionId: 's1', action: 'move', toDate: '2026-10-05' }]);
    const rows = [line('2026-10-01T08:00:00Z'), move, line('2026-10-03T08:00:00Z')];
    expect(findDuplicateWeeklyLines(rows).removeIds).toEqual([]);
  });

  it('laat een afgewezen regel en andere stappen met rust', () => {
    const rejected = [line('2026-10-01T08:00:00Z', { resolution: 'rejected' }), line('2026-10-02T08:00:00Z', { resolution: 'rejected' })];
    const check = [line('2026-10-03T08:00:00Z', { trigger: 'plan_check' }), line('2026-10-04T08:00:00Z', { trigger: 'plan_check' })];
    expect(findDuplicateWeeklyLines([...rejected, ...check]).removeIds).toEqual([]);
  });

  it('raakt een regel niet aan waar een ongedaan-maken naar verwijst, of dat er zelf een is', () => {
    const a = line('2026-10-01T08:00:00Z');
    const b = line('2026-10-02T08:00:00Z');
    const c = line('2026-10-04T08:00:00Z');
    const undo = line('2026-10-03T08:00:00Z', { revertsProposalId: b.id, resolution: 'accepted' });
    const { removeIds } = findDuplicateWeeklyLines([a, b, undo, c]);
    // b is ongedaan gemaakt (blijft), undo is een ongedaan-maken (blijft), en c staat na die twee: begint opnieuw.
    expect(removeIds).toEqual([]);
  });

  it('is idempotent: na het weghalen is er niets meer dubbel', () => {
    const rows = [line('2026-10-01T08:00:00Z'), line('2026-10-02T08:00:00Z'), line('2026-10-03T08:00:00Z')];
    const { removeIds } = findDuplicateWeeklyLines(rows);
    const rest = rows.filter((r) => !removeIds.includes(r.id));
    expect(findDuplicateWeeklyLines(rest).removeIds).toEqual([]);
  });

  it('weet niets van meer dan honderd regels te breken', () => {
    const rows = Array.from({ length: 120 }, (_, i) => line(`2026-10-01T08:${String(i % 60).padStart(2, '0')}:00Z`.replace('2026-10-01', `2026-10-${String(1 + Math.floor(i / 60)).padStart(2, '0')}`)));
    const { removeIds } = findDuplicateWeeklyLines(rows);
    expect(removeIds).toHaveLength(119);
  });
});

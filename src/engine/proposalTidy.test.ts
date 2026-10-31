import { describe, expect, it } from 'vitest';
import type { PlanChangeProposal } from '../models/planChange';
import { monthsBefore, proposalsToSummarize, resolveProposalTidyMonths, summarizeProposal, type TidyContext } from './proposalTidy';
import { leftOutOfCount } from './weekLogs';
import { findDuplicateWeeklyLines } from './planLogDedupe';

const NOW = '2026-10-31T08:00:00.000Z';

function proposal(id: string, extra: Partial<PlanChangeProposal> = {}): PlanChangeProposal {
  return {
    id,
    trigger: 'weekly_prescription_computed',
    issue: 'Weekprescriptie bijgewerkt',
    changes: [
      { plannedSessionId: 'ps-oud', action: 'move', fromDate: '2026-05-04', toDate: '2026-05-05', reason: 'Meer tijd op dinsdag', generatedBy: ['engine/weeklyPrescriptionEngine'] },
      { plannedSessionId: 'ps-weg', action: 'remove', fromDate: '2026-05-06', generatedBy: ['engine/weeklyPrescriptionEngine'] },
    ],
    alternatives: [{ label: 'Laten staan', changes: [], consequences: 'Niets verandert' }],
    consequences: 'Twee trainingen anders',
    explanation: 'Een lange uitleg die na een paar maanden niemand meer leest.',
    createdAt: '2026-05-01T07:00:00.000Z',
    resolvedAt: '2026-05-01T07:00:02.000Z',
    resolution: 'accepted',
    ...extra,
  };
}

function ctx(extra: Partial<TidyContext> = {}): TidyContext {
  return {
    plannedSessions: [
      { id: 'ps-oud', scheduledDate: '2026-05-05' },
      { id: 'ps-weg', scheduledDate: '2026-05-06' },
    ],
    leavePeriodIds: [],
    today: '2026-10-31',
    months: 3,
    now: NOW,
    ...extra,
  };
}

describe('monthsBefore', () => {
  it('telt hele maanden terug, ook over een jaargrens en aan het eind van een maand', () => {
    expect(monthsBefore('2026-10-31', 3)).toBe('2026-07-31');
    expect(monthsBefore('2026-05-31', 3)).toBe('2026-02-28');
    expect(monthsBefore('2026-02-15', 3)).toBe('2025-11-15');
    expect(monthsBefore('2028-05-31', 3)).toBe('2028-02-29');
    expect(monthsBefore('2026-10-31', 12)).toBe('2025-10-31');
  });
});

describe('resolveProposalTidyMonths', () => {
  it('standaard 3 maanden, alleen bekende keuzes', () => {
    expect(resolveProposalTidyMonths(undefined)).toBe(3);
    expect(resolveProposalTidyMonths(0)).toBe(0);
    expect(resolveProposalTidyMonths(12)).toBe(12);
    expect(resolveProposalTidyMonths(5)).toBe(3);
    expect(resolveProposalTidyMonths('3')).toBe(3);
  });
});

describe('proposalsToSummarize', () => {
  it('vat een oud, beslist voorstel samen en houdt id, datum, uitslag en titel', () => {
    const [s] = proposalsToSummarize([proposal('a')], ctx());
    expect(s).toMatchObject({ id: 'a', issue: 'Weekprescriptie bijgewerkt', createdAt: '2026-05-01T07:00:00.000Z', resolvedAt: '2026-05-01T07:00:02.000Z', resolution: 'accepted', trigger: 'weekly_prescription_computed', summarizedAt: NOW, changeCount: 2 });
    expect(s.alternatives).toEqual([]);
    expect(s.explanation).toBe('');
    // Wat het uit de planning haalde blijft, zonder de rest.
    expect(s.changes).toEqual([{ action: 'remove', plannedSessionId: 'ps-weg' }]);
    expect(JSON.stringify(s).length).toBeLessThan(JSON.stringify(proposal('a')).length);
  });

  it('een afgewezen voorstel houdt geen wijzigingen', () => {
    const [s] = proposalsToSummarize([proposal('a', { resolution: 'rejected' })], ctx());
    expect(s.changes).toEqual([]);
    expect(s.resolution).toBe('rejected');
  });

  it('een open voorstel nooit', () => {
    expect(proposalsToSummarize([proposal('a', { resolution: undefined, resolvedAt: undefined })], ctx())).toEqual([]);
    expect(proposalsToSummarize([proposal('a', { resolvedAt: undefined })], ctx())).toEqual([]);
  });

  it('niets jonger dan de grens, en niets als het uit staat', () => {
    expect(proposalsToSummarize([proposal('a', { createdAt: '2026-08-15T07:00:00.000Z', resolvedAt: '2026-08-15T07:00:01.000Z' })], ctx())).toEqual([]);
    expect(proposalsToSummarize([proposal('a')], ctx({ months: 0 }))).toEqual([]);
    expect(proposalsToSummarize([proposal('a')], ctx({ months: 6 }))).toEqual([]);
    expect(proposalsToSummarize([proposal('a')], ctx({ months: 12 }))).toEqual([]);
  });

  it('niet als een geplande training ernaar verwijst', () => {
    const sessions = [{ id: 'ps-x', scheduledDate: '2026-05-05', lock: { by: 'proposal' as const, proposalId: 'a', at: NOW } }];
    expect(proposalsToSummarize([proposal('a')], ctx({ plannedSessions: sessions }))).toEqual([]);
  });

  it('niet wat bij een ongedaan maken hoort', () => {
    const undo = proposal('u', { revertsProposalId: 'a', changes: [], resolution: 'rejected' });
    expect(proposalsToSummarize([proposal('a'), undo], ctx())).toEqual([]);
  });

  it('niet als het een training raakte die na de grens ligt', () => {
    const later = proposal('a', { changes: [{ plannedSessionId: 'ps-later', action: 'remove' }] });
    expect(proposalsToSummarize([later], ctx({ plannedSessions: [{ id: 'ps-later', scheduledDate: '2027-03-01' }] }))).toEqual([]);
    const draft = proposal('b', { changes: [{ action: 'add', newSessionDraft: { templateId: 't', scheduledDate: '2026-09-01', weekStartDate: '2026-08-31' } }] });
    expect(proposalsToSummarize([draft], ctx())).toEqual([]);
  });

  it('niet als de vrije periode of tocht nog bestaat', () => {
    const leave = proposal('a', { trigger: 'leave_added', leavePeriodId: 'lp-1' });
    expect(proposalsToSummarize([leave], ctx({ leavePeriodIds: ['lp-1'] }))).toEqual([]);
    expect(proposalsToSummarize([leave], ctx())).toHaveLength(1);
  });

  it('twee keer draaien geeft hetzelfde', () => {
    const once = proposalsToSummarize([proposal('a')], ctx());
    expect(proposalsToSummarize(once, ctx())).toEqual([]);
  });

  it('een training die ASCEND zelf weghaalde telt na het samenvatten nog steeds niet als gemist', () => {
    const sessions = [{ id: 'ps-weg', scheduledDate: '2026-05-06', status: 'skipped' as const }];
    const before = leftOutOfCount(sessions, [proposal('a')], undefined, '2026-10-31');
    const after = leftOutOfCount(sessions, [summarizeProposal(proposal('a'), NOW)], undefined, '2026-10-31');
    expect(before('ps-weg')).toBe(true);
    expect(after('ps-weg')).toBe(true);
  });

  it('samengevatte regels worden niet als dubbel samengevoegd', () => {
    const a = summarizeProposal(proposal('a'), NOW);
    const b = summarizeProposal(proposal('b', { createdAt: '2026-05-02T07:00:00.000Z' }), NOW);
    expect(findDuplicateWeeklyLines([a, b]).removeIds).toEqual([]);
  });
});

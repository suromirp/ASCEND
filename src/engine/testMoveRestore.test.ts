import { describe, it, expect } from 'vitest';
import adviceComputeSource from './adviceCompute.ts?raw';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession } from '../models/training';
import type { PlanChangeProposal } from '../models/planChange';
import { FRESH_FOR_TEST_REASON, restoreSentence, restoresForTestMove } from './testMoveRestore';

// Nagemaakt: een testpoging op donderdag 5 november 2026 nam de plek van het tempo in en liet de rustige
// duurloop van vrijdag gaan. Vandaag is dinsdag 3 november.
const { templates } = buildDefaultProgramData();
const TODAY = '2026-11-03';
const s = (id: string, templateId: string, date: string, extra: Partial<PlannedSession> = {}): PlannedSession => ({ id, templateId, scheduledDate: date, weekStartDate: '2026-11-02', status: 'planned', order: 0, ...extra });
const lock = { by: 'proposal' as const, proposalId: 'retry1', at: '2026-11-02T08:00:00.000Z' };
const retry: PlanChangeProposal = {
  id: 'retry1', trigger: 'plan_update' as never, issue: 'Nieuwe testpoging', alternatives: [], consequences: '', explanation: '', createdAt: '2026-11-02T08:00:00.000Z', resolution: 'accepted',
  changes: [
    { plannedSessionId: 'easy', action: 'remove', reason: FRESH_FOR_TEST_REASON, generatedBy: ['engine/adviceEngine.ts', 'TEST-RETRY'] },
    { plannedSessionId: 'test', action: 'move', fromDate: '2026-11-05', toDate: '2026-11-05', templateId: 'tpl_test_run', generatedBy: ['engine/adviceEngine.ts', 'TEST-RETRY'] },
  ],
};
const sessions = () => [
  s('test', 'tpl_test_run', '2026-11-05', { lock }),
  s('easy', 'tpl_easy_run', '2026-11-06', { status: 'skipped', lock }),
  s('upper', 'tpl_upper_a', '2026-11-07'),
];
const input = (over: Partial<Parameters<typeof restoresForTestMove>[0]> = {}) => ({ testId: 'test', toDate: '2026-11-08', sessions: sessions(), proposals: [retry], logs: [], templates, today: TODAY, ...over });

describe('restoresForTestMove', () => {
  it('de training die alleen voor de test wegging komt terug als de test verhuist', () => {
    expect(restoresForTestMove(input())).toEqual([{ sessionId: 'easy', templateId: 'tpl_easy_run', templateName: expect.any(String), fromDate: '2026-11-06', toDate: '2026-11-06', restore: true }]);
  });

  it('niet als de test op zijn dag blijft of zijn dag na de nieuwe testdag valt', () => {
    expect(restoresForTestMove(input({ toDate: '2026-11-05' }))).toEqual([]);
    expect(restoresForTestMove(input({ toDate: '2026-11-06' }))).toEqual([]);
    // De dag erna blijft rustig: de test naar donderdag, de loop op vrijdag, dan niet.
    expect(restoresForTestMove(input({ sessions: sessions().map((x) => (x.id === 'test' ? { ...x, scheduledDate: '2026-11-04' } : x)), toDate: '2026-11-05' }))).toEqual([]);
  });

  it('niet wat je daarna zelf oversloeg, niet wat gelogd of voorbij is, niet na ongedaan maken', () => {
    const own = sessions().map((x) => (x.id === 'easy' ? { ...x, lock: { by: 'user' as const, at: '2026-11-02T09:00:00.000Z' } } : x));
    expect(restoresForTestMove(input({ sessions: own }))).toEqual([]);
    expect(restoresForTestMove(input({ logs: [{ id: 'l', plannedSessionId: 'easy' } as never] }))).toEqual([]);
    expect(restoresForTestMove(input({ today: '2026-11-07' }))).toEqual([]);
    const undone: PlanChangeProposal = { ...retry, id: 'u', changes: [], revertsProposalId: 'retry1', resolution: 'rejected' };
    expect(restoresForTestMove(input({ proposals: [retry, undone] }))).toEqual([]);
  });

  it('een test die niet van TEST-RETRY kwam brengt niets terug', () => {
    expect(restoresForTestMove(input({ proposals: [] }))).toEqual([]);
  });

  it('de reden is dezelfde tekst als in TEST-RETRY', () => {
    expect(adviceComputeSource).toContain(`'${FRESH_FOR_TEST_REASON}'`);
  });

  it('de zin in het voorstel', () => {
    expect(restoreSentence(restoresForTestMove(input()))).toMatch(/ging alleen weg voor de test en komt terug op zijn eigen dag\.$/);
  });
});

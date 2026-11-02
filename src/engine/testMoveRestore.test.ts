import { describe, it, expect } from 'vitest';
import adviceComputeSource from './adviceCompute.ts?raw';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession } from '../models/training';
import type { PlanChangeProposal } from '../models/planChange';
import { FRESH_FOR_TEST_REASON, restoredRow, restoreSentence, restoresForTestMove, withTestRestores } from './testMoveRestore';
import { decideMove } from './weekDrag';
import type { ScheduleProposal } from './scheduler';

// Nagemaakt: een testpoging op donderdag 5 november 2026 nam de plek van het tempo in en liet de rustige
// duurloop van vrijdag gaan. Vandaag is dinsdag 3 november.
const { templates, program } = buildDefaultProgramData();
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

// Nagemaakt, tweede geval: de testpoging liet benen A van zondag 8 november gaan en schoof de lange
// duurloop van vrijdag naar zaterdag 7 november. De test gaat naar donderdag 12 november.
const heavyRetry: PlanChangeProposal = {
  ...retry,
  changes: [
    { plannedSessionId: 'lower', action: 'remove', reason: FRESH_FOR_TEST_REASON, generatedBy: ['engine/adviceEngine.ts', 'TEST-RETRY'] },
    { plannedSessionId: 'long', action: 'move', fromDate: '2026-11-06', toDate: '2026-11-07', reason: 'De dag na een testloop blijft rustig.', generatedBy: ['engine/adviceEngine.ts', 'TEST-RETRY'] },
    { plannedSessionId: 'test', action: 'move', fromDate: '2026-11-05', toDate: '2026-11-05', templateId: 'tpl_test_run', generatedBy: ['engine/adviceEngine.ts', 'TEST-RETRY'] },
  ],
};
const heavySessions = (withLong = true) => [
  s('test', 'tpl_test_run', '2026-11-05', { lock }),
  ...(withLong ? [s('long', 'tpl_long_run', '2026-11-07', { status: 'moved', movedFromDate: '2026-11-06', lock })] : []),
  s('lower', 'tpl_lower_a', '2026-11-08', { status: 'skipped', lock }),
];
const check = { logs: [], templates, today: TODAY, restDay: 1, program };

describe('restoresForTestMove met de weekcontrole', () => {
  it('geen terugkeer als de rij 48 uur na een training staat die TEST-RETRY zelf verschoof', () => {
    const base = { testId: 'test', toDate: '2026-11-12', proposals: [heavyRetry], logs: [], templates, today: TODAY };
    // Zonder de controle zou hij terugkomen: twee dagen van de test, niet de dag erna.
    expect(restoresForTestMove({ ...base, sessions: heavySessions() }).map((c) => c.sessionId)).toEqual(['lower']);
    expect(restoresForTestMove({ ...base, sessions: heavySessions(), check })).toEqual([]);
    // Zonder die lange duurloop ernaast is er niets nieuws: dan wel.
    // (Met de test al op dinsdag 10 november zou de controle hem ook houden: dan zijn de benen niet fris.)
    expect(restoresForTestMove({ ...base, toDate: '2026-11-10', sessions: heavySessions(false), check })).toEqual([]);
    expect(restoresForTestMove({ ...base, sessions: heavySessions(false), check }).map((c) => c.sessionId)).toEqual(['lower']);
  });

  it('iets zwaars binnen twee dagen van de nieuwe testdag komt niet terug, iets rustigs wel', () => {
    const base = { testId: 'test', proposals: [heavyRetry], logs: [], templates, today: TODAY };
    // Benen A op zondag, de test naar maandag: een dag ervoor, zwaar.
    expect(restoresForTestMove({ ...base, toDate: '2026-11-09', sessions: heavySessions(false) })).toEqual([]);
    // De rustige duurloop van vrijdag met de test naar zaterdag: de dag ervoor, rustig, mag.
    expect(restoresForTestMove(input({ toDate: '2026-11-07' })).map((c) => c.sessionId)).toEqual(['easy']);
  });
});

describe('withTestRestores', () => {
  const move = (): ScheduleProposal => ({ changes: [{ sessionId: 'test', templateId: 'tpl_test_run', templateName: 'Testloop', fromDate: '2026-11-05', toDate: '2026-11-08' }], reason: 'Testloop naar zondag.', resolved: true });
  const rest = { sessions: sessions(), proposals: [retry], logs: [], templates, today: TODAY };

  it('voegt de rij toe, met de zin in de reden, en vraagt altijd Akkoord', () => {
    const out = withTestRestores(move(), 'test', rest);
    expect(out.changes.map((c) => [c.sessionId, c.restore ?? false])).toEqual([['test', false], ['easy', true]]);
    expect(out.reason).toBe(`Testloop naar zondag. ${restoreSentence(out.changes.slice(1))}`);
    expect(decideMove(out).action).toBe('ask');
  });

  it('geen dubbele rij als het voorstel hem al heeft, en niets bij een andere training', () => {
    const already = { ...move(), changes: [...move().changes, { sessionId: 'easy', templateId: 'tpl_easy_run', templateName: 'Rustige duurloop', fromDate: '2026-11-06', toDate: '2026-11-09' }] };
    expect(withTestRestores(already, 'test', rest)).toBe(already);
    expect(withTestRestores(move(), 'upper', rest)).toEqual(move());
  });
});

describe('restoredRow', () => {
  it('weer op de planning: gepland op zijn eigen dag, met jouw slot', () => {
    const userLock = { by: 'user' as const, at: '2026-11-03T09:00:00.000Z' };
    const row = s('easy', 'tpl_easy_run', '2026-11-06', { status: 'skipped', lock });
    expect(restoredRow(row, '2026-11-06', userLock)).toEqual({ ...row, status: 'planned', lock: userLock });
  });
});

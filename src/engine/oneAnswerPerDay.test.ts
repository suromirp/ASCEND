// Eén antwoord per dag (I-157): twee adviezen voor dezelfde dag of training worden er één, het andere wacht.
// Testdata is nagemaakt.
import { describe, expect, it } from 'vitest';
import type { Advice } from './adviceShared';
import { adviceBusyIds, catchUpWaiting } from './adviceShared';
import { adviceSessionIds } from './weekFixProposal';
import { adviceTouchedSessions, oneAnswerPerDay, touchedKeys, WAITING_LINE } from './oneAnswerPerDay';
import type { PlanChangeItem } from '../models/planChange';

const TODAY = '2026-11-26';
const proposalOf = (changes: PlanChangeItem[]) => ({ id: 'x', trigger: 'session_moved' as const, issue: '', changes, alternatives: [], consequences: '', explanation: '', createdAt: '' });
const move = (ruleId: string, id: string, sessionId: string, from: string, to: string, priority = 2): Advice => ({
  id, ruleId, trigger: 'plan_update', title: ruleId, effect: '', why: '', priority,
  proposal: proposalOf([{ plannedSessionId: sessionId, action: 'move', fromDate: from, toDate: to }]),
});

describe('één antwoord per dag', () => {
  it('twee adviezen op dezelfde dag: één blijft, het andere krijgt blockedBy en wacht', () => {
    const hard = move('HARD-THEN-SPACE', 'hard:p-2', 'p-2', TODAY, '2026-11-28', 2);
    const pull = move('REST-PULL', 'restpull:p-3', 'p-3', '2026-11-29', '2026-11-28', 1);
    const out = oneAnswerPerDay([pull, hard]);
    expect(out.map((a) => a.id)).toEqual(['hard:p-2']);
    expect(out[0].waiting?.map((a) => [a.id, a.blockedBy])).toEqual([['restpull:p-3', 'hard:p-2']]);
    expect(out[0].blockedBy).toBeUndefined();
  });

  it('dezelfde training: ook op een andere dag één', () => {
    const a = move('MISSED-CATCH-UP', 'missed:p-1', 'p-1', '2026-11-24', TODAY, 3);
    const b = move('WEATHER-SWAP', 'weather:p-1', 'p-1', '2026-11-24', '2026-11-30', 1);
    expect(oneAnswerPerDay([b, a]).map((x) => x.id)).toEqual(['missed:p-1']);
  });

  it('volgorde: eerst de klasse van het blad, dan prioriteit, dan id', () => {
    const reentry: Advice = { id: 'reentry:2026-11-24', ruleId: 'REENTRY', trigger: 'plan_update', title: '', effect: '', why: '', priority: 1, heldCatchUpIds: ['p-1'] };
    const missed = move('MISSED-CATCH-UP', 'missed:p-1', 'p-1', '2026-11-24', TODAY, 5);
    expect(oneAnswerPerDay([missed, reentry]).map((x) => x.id)).toEqual([reentry.id]);
    const x = move('REST-SWAP', 'b', 'p-5', TODAY, '2026-11-27', 2);
    const y = move('REST-SWAP', 'a', 'p-6', '2026-11-27', '2026-11-29', 2);
    expect(oneAnswerPerDay([x, y]).map((q) => q.id)).toEqual(['a']);
  });

  it('geen botsing: de lijst blijft precies zoals hij was', () => {
    const a = move('REST-SWAP', 'a', 'p-5', TODAY, '2026-11-27');
    const b = move('REST-PULL', 'b', 'p-6', '2026-11-29', '2026-11-30');
    const plain: Advice = { id: 'c', ruleId: 'STRENGTH-REGULARITY', trigger: 'strength_irregular', title: '', effect: '', why: '', priority: 1 };
    const list = [a, b, plain];
    expect(oneAnswerPerDay(list)).toEqual(list);
    expect(touchedKeys(plain).size).toBe(0);
  });

  it('wat wacht blijft bezet: geen vraag Niet gedaan? en geen tweede voorstel in Week voor die training', () => {
    const reentry: Advice = { id: 'reentry:2026-11-24', ruleId: 'REENTRY', trigger: 'plan_update', title: '', effect: '', why: '', priority: 3, reentryCatchUp: { sessionId: 'p-1', name: 'Rustige loop', fromDate: '2026-11-24', toDate: '2026-11-27' } };
    const missed = move('MISSED-CATCH-UP', 'missed:p-1', 'p-1', '2026-11-24', TODAY, 3);
    const out = oneAnswerPerDay([missed, reentry]);
    expect(adviceBusyIds(out).has('p-1')).toBe(true);
    expect(adviceSessionIds(out).has('p-1')).toBe(true);
    expect(catchUpWaiting(out)).toBe(true);
  });

  it('de regel onder het ene advies is een droog feit zonder gedachtestreepje', () => {
    expect(WAITING_LINE).toBe('Een ander advies voor dezelfde dag wacht tot dit is beantwoord.');
    expect(/[–—]/.test(WAITING_LINE)).toBe(false);
  });

  it('het voorstel na een zware sport wacht op de training van de eerste dag terug (I-155)', () => {
    const reentry: Advice = { id: 'reentry:2026-11-24', ruleId: 'REENTRY', trigger: 'plan_update', title: '', effect: '', why: '', priority: 3, reentryFirstDay: { date: TODAY, restId: 'p-8', restName: 'Rust', trainingId: 'p-9', trainingName: 'Benen', trainingDate: '2026-11-27' } };
    const ids = adviceTouchedSessions([reentry]);
    expect([...ids].sort()).toEqual(['p-8', 'p-9']);
  });
});

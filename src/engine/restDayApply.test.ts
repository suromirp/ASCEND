// De rustdag na Akkoord: eerst de nieuwe indeling, dan pas de rustdag zelf.
// Een indeling die niet opgeslagen kon worden laat geen rustdag zonder indeling
// achter. Alleen nagemaakte gegevens.
import { describe, it, expect } from 'vitest';
import { applyRestDayInOrder, type RestDayPlan } from './restDayProposal';
import type { PlanChangeProposal } from '../models/planChange';

function plan(changes: PlanChangeProposal['changes']): RestDayPlan {
  return {
    restDay: 3,
    near: 0,
    proposal: { id: 'p1', trigger: 'rest_day', issue: 'Rustdag', changes, alternatives: [], consequences: '', explanation: '', createdAt: '2026-10-22T08:00:00Z' } as unknown as PlanChangeProposal,
  };
}
const move = [{ action: 'move', plannedSessionId: 's1', toDate: '2026-10-23' }] as unknown as PlanChangeProposal['changes'];

describe('de rustdag opslaan na Akkoord', () => {
  it('eerst de indeling, dan de rustdag, dan pas de planningsronde', async () => {
    const order: string[] = [];
    const ok = await applyRestDayInOrder(plan(move), {
      commit: async (afterWrites) => {
        order.push('indeling');
        await afterWrites();
        order.push('planningsronde');
        return true;
      },
      storeRestDay: async (day) => void order.push(`rustdag ${day}`),
      showUnchanged: async () => void order.push('melding'),
    });
    expect(ok).toBe(true);
    expect(order).toEqual(['indeling', 'rustdag 3', 'planningsronde']);
  });

  it('een indeling die niet opgeslagen kon worden laat de rustdag staan', async () => {
    const stored: number[] = [];
    await expect(
      applyRestDayInOrder(plan(move), {
        commit: async () => Promise.reject(new DOMException('vol', 'QuotaExceededError')),
        storeRestDay: async (day) => void stored.push(day),
        showUnchanged: async () => undefined,
      }),
    ).rejects.toThrow();
    expect(stored).toEqual([]);
  });

  it('een indeling die geweigerd werd laat de rustdag ook staan, zonder melding dat er niets veranderde', async () => {
    const stored: number[] = [];
    let shown = false;
    const ok = await applyRestDayInOrder(plan(move), {
      commit: async () => false,
      storeRestDay: async (day) => void stored.push(day),
      showUnchanged: async () => void (shown = true),
    });
    expect(ok).toBe(false);
    expect(stored).toEqual([]);
    expect(shown).toBe(false);
  });

  it('niets te verschuiven: de rustdag gaat meteen op, met de melding', async () => {
    const order: string[] = [];
    const ok = await applyRestDayInOrder(plan([]), {
      commit: async () => {
        order.push('indeling');
        return false;
      },
      storeRestDay: async (day) => void order.push(`rustdag ${day}`),
      showUnchanged: async () => void order.push('melding'),
    });
    expect(ok).toBe(true);
    expect(order).toEqual(['rustdag 3', 'melding']);
  });
});

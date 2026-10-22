import { describe, expect, it } from 'vitest';
import { createSerialQueue, QueueTimeout } from './serialQueue';

describe('een wachtrij die nooit voor altijd blokkeert', () => {
  it('doet de taken na elkaar', async () => {
    const q = createSerialQueue({ timeoutMs: 1_000, name: 'test' });
    const order: string[] = [];
    const a = q.run(async () => {
      await new Promise((r) => setTimeout(r, 20));
      order.push('a');
      return 1;
    });
    const b = q.run(async () => {
      order.push('b');
      return 2;
    });
    expect(await Promise.all([a, b])).toEqual([1, 2]);
    expect(order).toEqual(['a', 'b']);
  });

  it('gaat door na een taak die nooit afloopt, en meldt dat', async () => {
    const problems: unknown[] = [];
    const q = createSerialQueue({ timeoutMs: 30, name: 'planning', onProblem: (e) => problems.push(e) });
    const stuck = q.run(() => new Promise<number>(() => undefined));
    const after = q.run(async () => 'verder');
    expect(await stuck).toBeUndefined();
    expect(await after).toBe('verder');
    expect(problems).toHaveLength(1);
    expect(problems[0]).toBeInstanceOf(QueueTimeout);
  });

  it('gaat door na een fout', async () => {
    const q = createSerialQueue({ timeoutMs: 1_000, name: 'test', onProblem: () => undefined });
    expect(await q.run(() => Promise.reject(new Error('kapot')))).toBeUndefined();
    expect(await q.run(async () => 3)).toBe(3);
  });
});

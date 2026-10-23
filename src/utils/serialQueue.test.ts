import { describe, expect, it } from 'vitest';
import { createSerialQueue } from './serialQueue';
import { TimeoutError } from './withTimeout';

describe('een wachtrij die zijn aanroeper nooit voor altijd laat wachten', () => {
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

  it('laat de aanroeper na de grens los en meldt dat', async () => {
    const problems: unknown[] = [];
    const q = createSerialQueue({ timeoutMs: 30, name: 'planning', onProblem: (e) => problems.push(e) });
    expect(await q.run(() => new Promise<number>(() => undefined))).toBeUndefined();
    expect(problems).toHaveLength(1);
    expect(problems[0]).toBeInstanceOf(TimeoutError);
  });

  it('een trage taak loopt nooit tegelijk met de volgende, ook niet na de grens', async () => {
    const q = createSerialQueue({ timeoutMs: 20, name: 'planning', onProblem: () => undefined });
    let running = 0;
    let most = 0;
    const job = (ms: number) => async () => {
      running++;
      most = Math.max(most, running);
      await new Promise((r) => setTimeout(r, ms));
      running--;
      return ms;
    };
    const slow = q.run(job(80));
    const next = q.run(job(5));
    expect(await slow).toBeUndefined();
    // The caller of the second job is let go too, but the job itself waits its turn.
    await next;
    await new Promise((r) => setTimeout(r, 120));
    expect(most).toBe(1);
    expect(await q.run(async () => 'verder')).toBe('verder');
  });

  it('gaat door na een fout', async () => {
    const q = createSerialQueue({ timeoutMs: 1_000, name: 'test', onProblem: () => undefined });
    expect(await q.run(() => Promise.reject(new Error('kapot')))).toBeUndefined();
    expect(await q.run(async () => 3)).toBe(3);
  });

  // Warden Planning punt 2: bij een timeout terwijl de taak doorloopt een
  // eerlijke "nog bezig", en de normale uitkomst zodra hij klaar is.
  it('runOrLate: zegt klaar, mislukt of nog bezig, en geeft een late uitkomst alsnog door', async () => {
    const q = createSerialQueue({ timeoutMs: 30, name: 'planning', onProblem: () => undefined });
    expect(await q.runOrLate(async () => 1, () => undefined)).toEqual({ status: 'done', value: 1 });
    expect(await q.runOrLate(() => Promise.reject(new Error('kapot')), () => undefined)).toEqual({ status: 'failed' });
    const late: number[] = [];
    const outcome = await q.runOrLate(() => new Promise<number>((r) => setTimeout(() => r(7), 80)), (v) => late.push(v));
    expect(outcome).toEqual({ status: 'late' });
    expect(late).toEqual([]);
    await new Promise((r) => setTimeout(r, 100));
    expect(late).toEqual([7]);
  });
  it('runOrLate: een late fout krijgt alsnog een uitkomst', async () => {
    const q = createSerialQueue({ timeoutMs: 20, name: 'test', onProblem: () => undefined });
    const errors: unknown[] = [];
    const outcome = await q.runOrLate(() => new Promise<number>((_, reject) => setTimeout(() => reject(new Error('kapot')), 60)), () => undefined, (e) => errors.push(e));
    expect(outcome).toEqual({ status: 'late' });
    await new Promise((r) => setTimeout(r, 80));
    expect(errors).toHaveLength(1);
  });
});

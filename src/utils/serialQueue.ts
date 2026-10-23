// ASCEND: jobs one after the other, where a job that never finishes can not
// keep its caller waiting for ever.
//
// Used for the planning sync (state/AppDataContext.tsx): every refresh waits
// for its turn in this queue. The next job starts only when the one before has
// really finished, so two syncs never run at once and can never add the same
// weeks twice. Only the caller is let go after the limit: it gets undefined and
// the console says so, while the slow job finishes in the queue. A job that
// truly hangs then holds back later syncs until the app is reloaded, never the
// screen.

import { withTimeout } from './withTimeout';

export interface SerialQueue {
  // Resolves with the job's result, or undefined when it failed or its caller
  // waited longer than the limit.
  run<T>(job: () => Promise<T>): Promise<T | undefined>;
  // Like run, but says which of the three it was: done, failed (the job threw),
  // or late (the caller was let go while the job goes on). A late job still
  // hands its result to `onLate` when it finishes, so the caller can say "nog
  // bezig" now and show the normal outcome later.
  runOrLate<T>(job: () => Promise<T>, onLate: (value: T) => void): Promise<QueueOutcome<T>>;
}

export type QueueOutcome<T> = { status: 'done'; value: T } | { status: 'failed' } | { status: 'late' };

export function createSerialQueue(options: { timeoutMs: number; name: string; onProblem?: (err: unknown) => void }): SerialQueue {
  let tail: Promise<unknown> = Promise.resolve();
  const report = options.onProblem ?? ((err: unknown) => console.error(`${options.name}:`, err));
  function run<T>(job: () => Promise<T>): Promise<T | undefined> {
    const started = tail.then(() => job());
    tail = started.catch(() => undefined);
    return withTimeout(started, options.timeoutMs, `${options.name} duurde langer dan ${Math.round(options.timeoutMs / 1000)} s`).catch((err) => {
      report(err);
      return undefined;
    });
  }
  function runOrLate<T>(job: () => Promise<T>, onLate: (value: T) => void): Promise<QueueOutcome<T>> {
    let state: 'running' | 'done' | 'threw' = 'running';
    let late = false;
    let value: T;
    // Checked and set in the same synchronous step on both sides, so a result
    // goes either to the caller or to onLate, never to both or to neither.
    return run(async () => {
      try {
        value = await job();
      } catch (err) {
        state = 'threw';
        throw err;
      }
      if (late) onLate(value);
      else state = 'done';
      return value;
    }).then((): QueueOutcome<T> => {
      if (state === 'done') return { status: 'done', value };
      if (state === 'threw') return { status: 'failed' };
      late = true;
      return { status: 'late' };
    });
  }
  return { run, runOrLate };
}

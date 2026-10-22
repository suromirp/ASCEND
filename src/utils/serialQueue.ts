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
}

export function createSerialQueue(options: { timeoutMs: number; name: string; onProblem?: (err: unknown) => void }): SerialQueue {
  let tail: Promise<unknown> = Promise.resolve();
  const report = options.onProblem ?? ((err: unknown) => console.error(`${options.name}:`, err));
  return {
    run<T>(job: () => Promise<T>): Promise<T | undefined> {
      const started = tail.then(() => job());
      tail = started.catch(() => undefined);
      return withTimeout(started, options.timeoutMs, `${options.name} duurde langer dan ${Math.round(options.timeoutMs / 1000)} s`).catch((err) => {
        report(err);
        return undefined;
      });
    },
  };
}

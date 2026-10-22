// ASCEND: jobs one after the other, where a job that never finishes can not
// block the ones after it for ever.
//
// Used for the planning sync (state/AppDataContext.tsx): every refresh waits
// for its turn in this queue. A job that takes longer than the limit is left
// to finish on its own; the queue goes on with the next one and says so in the
// console. The job itself decides what it records, so a run that timed out
// does not count as done.

export class QueueTimeout extends Error {
  constructor(name: string, ms: number) {
    super(`${name} duurde langer dan ${Math.round(ms / 1000)} s`);
    this.name = 'QueueTimeout';
  }
}

export function withTimeout<T>(promise: Promise<T>, ms: number, name = 'Taak'): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const limit = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new QueueTimeout(name, ms)), ms);
  });
  return Promise.race([promise, limit]).finally(() => clearTimeout(timer));
}

export interface SerialQueue {
  // Resolves with the job's result, or undefined when it failed or timed out.
  run<T>(job: () => Promise<T>): Promise<T | undefined>;
}

export function createSerialQueue(options: { timeoutMs: number; name: string; onProblem?: (err: unknown) => void }): SerialQueue {
  let tail: Promise<unknown> = Promise.resolve();
  const report = options.onProblem ?? ((err: unknown) => console.error(`${options.name}:`, err));
  return {
    run<T>(job: () => Promise<T>): Promise<T | undefined> {
      const next = tail.then(() =>
        withTimeout(Promise.resolve().then(job), options.timeoutMs, options.name).catch((err) => {
          report(err);
          return undefined;
        }),
      );
      tail = next;
      return next;
    },
  };
}

// ASCEND: the one queue for every step that replaces numbers of a log.
//
// A step runs after the one before it, never beside it: a second tap, the
// automatic route and a fetch of corrections cannot tie two logs to one activity
// or overwrite each other. Used by storage/watchAlign.ts (re-exported there),
// storage/macrofactorLead.ts, storage/trim.ts and storage/sourceCorrection.ts.

let queue: Promise<unknown> = Promise.resolve();

export function inTurn<T>(work: () => Promise<T>): Promise<T> {
  const run = queue.then(work, work);
  queue = run.catch(() => undefined);
  return run;
}

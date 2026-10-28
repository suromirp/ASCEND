// ASCEND: de opstartstappen onder het slot 'ascend-boot' (Web Locks).
//
// Het slot zorgt dat twee vensters de opstartstappen nooit tegelijk draaien.
// Drie afspraken, zodat een venster het slot nooit vasthoudt zonder te werken
// en nooit loslaat terwijl er nog geschreven wordt:
//
// - Eerst in beeld, dan het slot. Een ASCEND die verborgen opent (een tabblad
//   op de achtergrond, een herlading terwijl de app weg was) vraagt het slot
//   pas als hij in beeld is. Anders hield hij het vast terwijl getDB op
//   zichtbaarheid wacht (storage/lifecycle.ts), en kreeg een tweede venster na
//   tien seconden "nog bezig met opstarten".
// - Raakt de pagina tijdens de stappen uit beeld, dan pauzeert hij tussen twee
//   stappen: het slot gaat los en wordt opnieuw gevraagd zodra hij terug is.
//   Wat al gedaan is staat in meta, dus hij gaat verder waar hij was.
// - Een herstelstap die over zijn tijd gaat, laat het openen door (`ready`),
//   maar het slot blijft vast tot die stap echt klaar is (`settled`). Wie na de
//   stappen het plan schrijft (de planningssync) wacht op `settled`, zodat de
//   hangende stap en de sync nooit tegelijk in plannedSessions schrijven.

// Another window holds the lock for longer than BOOT_LOCK_WAIT_MS (often a tab
// Android paused in the background, which never lets go by itself). The screen
// says so, with Opnieuw proberen and Toch openen: the next load then takes the
// lock over (engine/bootWatch.ts#bootLockChoice,
// docs/beslissingen/2026-10-22-toch-openen.md).
class BootLockBusy extends Error {
  constructor() {
    super('boot lock busy');
    this.name = 'BootLockBusy';
  }
}

// This window held the lock and another one took it over (Toch openen there).
// It stops before its next step and says "ASCEND is in een ander venster
// geopend.", with Opnieuw proberen.
export class BootLockStolen extends Error {
  constructor() {
    super('boot lock stolen');
    this.name = 'BootLockStolen';
  }
}

export interface BootRunResult {
  skipped: string[];
  // Gestopt tussen twee stappen omdat de pagina uit beeld raakte.
  paused?: boolean;
  // Een herstelstap die over zijn tijd ging en nog loopt; lost op als hij klaar
  // is (gelukt of niet), nooit met een fout.
  pending?: Promise<void>;
  // Gestopt omdat een ander venster het slot overnam.
  cancelled?: boolean;
}

export interface LockManagerLike {
  request(name: string, options: { signal?: AbortSignal; steal?: boolean }, fn: () => Promise<unknown>): Promise<unknown>;
}

export const BOOT_LOCK_NAME = 'ascend-boot';
export const BOOT_LOCK_WAIT_MS = 10_000;

export function runBootUnderLock(deps: {
  locks?: LockManagerLike;
  // Draait de stappen; `shouldPause` zegt tussen twee stappen of hij moet
  // pauzeren, `isCancelled` of een ander venster het slot overnam.
  run: (shouldPause: () => boolean, isCancelled: () => boolean) => Promise<BootRunResult>;
  // Toch openen: de eerste keer het slot overnemen in plaats van wachten.
  steal?: boolean;
  whenOpen: () => Promise<void>;
  isOpen: () => boolean;
  waitMs?: number;
}): { ready: Promise<string[]>; settled: Promise<void> } {
  let resolveReady!: (skipped: string[]) => void;
  let rejectReady!: (err: unknown) => void;
  const ready = new Promise<string[]>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
  const shouldPause = () => !deps.isOpen();
  // Set when another window took the lock over: the run stops before its next
  // step, so two windows never go on writing side by side.
  let cancelled = false;
  const isCancelled = () => cancelled;
  let steal = !!deps.steal;
  const withLock = <T>(fn: () => Promise<T>): Promise<T> => {
    if (!deps.locks) return fn();
    let started = false;
    // An error of fn itself (a transaction broken off at freeze is an
    // AbortError too) goes through as it is; only the lock's own one counts.
    let fnError: unknown = undefined;
    const body = () => {
      started = true;
      return fn().catch((err: unknown) => {
        fnError = err;
        throw err;
      });
    };
    const lostLock = (err: unknown) => {
      // Web Locks: when another window steals the lock, the request of the
      // holder ends with an AbortError while its callback still runs.
      if (started && err !== fnError && err instanceof DOMException && err.name === 'AbortError') {
        cancelled = true;
        throw new BootLockStolen();
      }
      throw err;
    };
    if (steal) {
      // Only the first request; after a pause it waits again like any other.
      steal = false;
      return (deps.locks.request(BOOT_LOCK_NAME, { steal: true }, body) as Promise<T>).catch(lostLock);
    }
    const signal = typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal ? AbortSignal.timeout(deps.waitMs ?? BOOT_LOCK_WAIT_MS) : undefined;
    return (deps.locks.request(BOOT_LOCK_NAME, signal ? { signal } : {}, body) as Promise<T>).catch((err: unknown) => {
      // Alleen het wachten op het slot zelf; een fout uit fn gaat door zoals hij is.
      if (!started && signal?.aborted && err === signal.reason) throw new BootLockBusy();
      return lostLock(err);
    });
  };
  const settled = (async () => {
    for (;;) {
      await deps.whenOpen();
      const result = await withLock(async () => {
        // Tussen het vragen en het krijgen kan hij weer uit beeld zijn geraakt.
        if (shouldPause()) return { skipped: [], paused: true } as BootRunResult;
        const r = await deps.run(shouldPause, isCancelled);
        if (r.cancelled) throw new BootLockStolen();
        if (r.paused) return r;
        resolveReady(r.skipped);
        // Het slot blijft vast tot de hangende herstelstap echt klaar is.
        if (r.pending) await r.pending;
        return r;
      });
      if (!result.paused) return;
    }
  })();
  // Een fout voordat het openen door mocht, gaat naar `ready`; daarna doet
  // rejectReady niets meer.
  settled.catch(rejectReady);
  return { ready, settled: settled.catch(() => undefined) };
}

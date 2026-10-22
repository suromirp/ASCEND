// Het slot 'ascend-boot': nooit vast zonder te werken, nooit los terwijl er nog
// geschreven wordt. Alleen nagemaakte gegevens (het demoprogramma).
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runBootUnderLock, type LockManagerLike } from './bootLock';
import { runBootMigrations } from './bootMigrations';
import { wipeAllData } from './database';

// Een eenvoudig slot zoals navigator.locks: één houder tegelijk, de rest in de rij.
function fakeLocks() {
  let held = false;
  const queue: (() => void)[] = [];
  const log: string[] = [];
  const locks: LockManagerLike = {
    async request(_name, _options, fn) {
      log.push('gevraagd');
      if (held) await new Promise<void>((r) => queue.push(r));
      held = true;
      log.push('gekregen');
      try {
        return await fn();
      } finally {
        held = false;
        log.push('los');
        queue.shift()?.();
      }
    },
  };
  return { locks, log, isHeld: () => held };
}

function page(open: boolean) {
  let isOpen = open;
  let waiters: (() => void)[] = [];
  return {
    isOpen: () => isOpen,
    whenOpen: () => (isOpen ? Promise.resolve() : new Promise<void>((r) => waiters.push(r))),
    set(next: boolean) {
      isOpen = next;
      if (next) {
        const w = waiters;
        waiters = [];
        w.forEach((fn) => fn());
      }
    },
  };
}

const tick = (ms = 10) => new Promise((r) => setTimeout(r, ms));

describe('het opstartslot', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    await wipeAllData();
  });

  it('een verborgen opstartende pagina vraagt het slot pas als hij in beeld is', async () => {
    const { locks, log } = fakeLocks();
    const p = page(false);
    const run = vi.fn(async () => ({ skipped: [] }));
    const { ready, settled } = runBootUnderLock({ locks, run, whenOpen: p.whenOpen, isOpen: p.isOpen });
    await tick();
    expect(log).toEqual([]);
    expect(run).not.toHaveBeenCalled();
    p.set(true);
    await ready;
    await settled;
    expect(log).toEqual(['gevraagd', 'gekregen', 'los']);
  });

  it('raakt de pagina tijdens de stappen uit beeld, dan gaat het slot los tot hij terug is', async () => {
    const { locks, log, isHeld } = fakeLocks();
    const p = page(true);
    const seen: string[] = [];
    let readyDone = false;
    const { ready, settled } = runBootUnderLock({
      locks,
      whenOpen: p.whenOpen,
      isOpen: p.isOpen,
      run: (shouldPause) =>
        runBootMigrations({
          build: 'v1',
          shouldPause,
          onStep: (id) => {
            seen.push(id);
            // Halverwege de stappen gaat de app naar de achtergrond.
            if (id === 'migrateGoalRouteProfiles') p.set(false);
          },
        }),
    });
    void ready.then(() => (readyDone = true));
    await tick(200);
    expect(isHeld()).toBe(false);
    expect(readyDone).toBe(false);
    expect(log).toEqual(['gevraagd', 'gekregen', 'los']);
    p.set(true);
    await ready;
    await settled;
    expect(log).toEqual(['gevraagd', 'gekregen', 'los', 'gevraagd', 'gekregen', 'los']);
    // Elke stap liep precies één keer.
    expect(seen.filter((id) => id === 'seedIfEmpty')).toHaveLength(1);
    expect(seen.filter((id) => id === 'mergeDuplicateWeeklyPrescriptionLines')).toHaveLength(1);
  });

  it('een herstelstap over zijn tijd: het openen gaat door, het slot blijft vast tot de stap klaar is', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { locks, isHeld } = fakeLocks();
    const p = page(true);
    let finish!: () => void;
    let stepDone = false;
    const slow = () =>
      new Promise<void>((r) => {
        finish = () => {
          stepDone = true;
          r();
        };
      });
    let settledDone = false;
    const { ready, settled } = runBootUnderLock({
      locks,
      whenOpen: p.whenOpen,
      isOpen: p.isOpen,
      run: (shouldPause) => runBootMigrations({ build: 'v1', stepLimitMs: 20, shouldPause, overrides: { syncGr5MilestoneDefinitions: async () => undefined, migrateStrengthProgramDefault: async () => undefined, restorePatternSessionsRemovedByPrescription: slow } }),
    });
    void settled.then(() => (settledDone = true));
    const skipped = await ready;
    expect(skipped).toContain('restorePatternSessionsRemovedByPrescription');
    // Het openen ging door, maar de stap loopt nog: het slot blijft vast en
    // wie na de stappen het plan schrijft, wacht nog.
    await tick(50);
    expect(isHeld()).toBe(true);
    expect(settledDone).toBe(false);
    finish();
    await settled;
    expect(stepDone).toBe(true);
    expect(isHeld()).toBe(false);
    warn.mockRestore();
  });

  it('een fout in een onmisbare stap komt bij het openen aan', async () => {
    const { locks } = fakeLocks();
    const p = page(true);
    const { ready } = runBootUnderLock({ locks, whenOpen: p.whenOpen, isOpen: p.isOpen, run: async () => Promise.reject(new Error('stuk')) });
    await expect(ready).rejects.toThrow('stuk');
  });
});

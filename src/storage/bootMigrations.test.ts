// De opstartstappen: een stap die al liep slaat over zonder te schrijven, een
// teruggezette back-up laat ze opnieuw lopen, en een herstelstap die blijft
// hangen houdt het openen niet tegen. Alleen nagemaakte gegevens (het demoprogramma).
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { missingBootSteps, runBootMigrations } from './bootMigrations';
import { MetaRepo, applyBackupWrites, seedIfEmpty, wipeAllData } from './database';
import { BOOT_MIGRATIONS, BOOT_MIGRATIONS_KEY, type BootMigrationRecord } from '../engine/bootWatch';
import { probeStorage } from './storageProbe';
import { setPageLife, storageOpenFor, whenStorageOpen } from './lifecycle';

// The repairs before the one under test, made instant: with a limit of a few
// milliseconds a real repair on a busy test machine could go over it too.
const quickRepairs = { syncGr5MilestoneDefinitions: async () => undefined, migrateStrengthProgramDefault: async () => undefined };

async function countWrites<T>(fn: () => Promise<T>): Promise<string[]> {
  const writes: string[] = [];
  const spies = (['put', 'add', 'delete', 'clear'] as const).map((method) => {
    const original = IDBObjectStore.prototype[method] as (...args: unknown[]) => unknown;
    return vi.spyOn(IDBObjectStore.prototype, method).mockImplementation(function (this: IDBObjectStore, ...args: unknown[]) {
      writes.push(`${method} ${this.name}`);
      return original.apply(this, args);
    } as never);
  });
  try {
    await fn();
    return writes;
  } finally {
    spies.forEach((s) => s.mockRestore());
  }
}

describe('opstartstappen', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    await wipeAllData();
  });

  it('elke stap uit de rij heeft een functie', () => {
    expect(missingBootSteps()).toEqual([]);
  });

  it('meldt elke stap die loopt, en onthoudt wat gedaan is', async () => {
    const seen: string[] = [];
    await runBootMigrations({ build: 'v1', onStep: (id) => seen.push(id) });
    expect(seen).toEqual([BOOT_MIGRATIONS_KEY, ...BOOT_MIGRATIONS.map((m) => m.id)]);
    const record = await MetaRepo.get<BootMigrationRecord>(BOOT_MIGRATIONS_KEY);
    expect(record?.build).toBe('v1');
    expect(record?.done).toHaveLength(BOOT_MIGRATIONS.length);
  });

  it('de tweede keer in dezelfde versie: één keer lezen, niets schrijven, geen stap', async () => {
    await runBootMigrations({ build: 'v1' });
    const seen: string[] = [];
    const writes = await countWrites(() => runBootMigrations({ build: 'v1', onStep: (id) => seen.push(id) }));
    expect(writes).toEqual([]);
    expect(seen).toEqual([BOOT_MIGRATIONS_KEY]);
  });

  it('een nieuwe versie loopt alles nog één keer', async () => {
    await runBootMigrations({ build: 'v1' });
    const seen: string[] = [];
    await runBootMigrations({ build: 'v2', onStep: (id) => seen.push(id) });
    expect(seen).toHaveLength(BOOT_MIGRATIONS.length + 1);
  });

  it('een teruggezette back-up laat de stappen opnieuw lopen', async () => {
    await runBootMigrations({ build: 'v1' });
    await applyBackupWrites({ meta: { adviceResponses: {} } });
    expect(await MetaRepo.get(BOOT_MIGRATIONS_KEY)).toBeUndefined();
    const seen: string[] = [];
    await runBootMigrations({ build: 'v1', onStep: (id) => seen.push(id) });
    expect(seen).toHaveLength(BOOT_MIGRATIONS.length + 1);
  });

  it('een herstelstap die blijft hangen houdt het openen niet tegen, en loopt de volgende keer weer', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const hangs = () => new Promise<never>(() => undefined);
    const { skipped } = await runBootMigrations({ build: 'v1', stepLimitMs: 50, overrides: { ...quickRepairs, restorePatternSessionsRemovedByPrescription: async () => undefined, normalizePlannedSessionWeeks: async () => undefined, mergeDuplicateWeeklyPrescriptionLines: hangs } });
    warn.mockRestore();
    expect(skipped).toEqual(['mergeDuplicateWeeklyPrescriptionLines', 'releaseSystemMoves']);
    const record = await MetaRepo.get<BootMigrationRecord>(BOOT_MIGRATIONS_KEY);
    expect(record?.done.some((k) => k.startsWith('mergeDuplicateWeeklyPrescriptionLines@'))).toBe(false);
    const seen: string[] = [];
    await runBootMigrations({ build: 'v1', onStep: (id) => seen.push(id) });
    expect(seen).toEqual([BOOT_MIGRATIONS_KEY, 'mergeDuplicateWeeklyPrescriptionLines', 'releaseSystemMoves']);
  });
});

describe('de opslag laat los als de app weggelegd wordt', () => {
  it('alleen in beeld mag er een transactie beginnen', () => {
    expect(storageOpenFor('visible')).toBe(true);
    expect(storageOpenFor('hidden')).toBe(false);
    expect(storageOpenFor('frozen')).toBe(false);
  });

  it('wie de opslag nodig heeft terwijl de app verborgen is, wacht tot hij terug is', async () => {
    setPageLife('hidden');
    let through = false;
    const waiting = whenStorageOpen().then(() => (through = true));
    await new Promise((r) => setTimeout(r, 10));
    expect(through).toBe(false);
    setPageLife('frozen');
    await new Promise((r) => setTimeout(r, 10));
    expect(through).toBe(false);
    setPageLife('visible');
    await waiting;
    expect(through).toBe(true);
  });
});

describe('de proef: antwoordt de opslag?', () => {
  it('ja, bij een gewone opslag', async () => {
    expect(await probeStorage(1_000)).toBe('answers');
  });

  it('nee, als de leesactie niet binnen de grens terugkomt', async () => {
    expect(await probeStorage(30, () => new Promise(() => undefined))).toBe('silent');
  });

  it('een fout is ook een antwoord', async () => {
    expect(await probeStorage(1_000, () => Promise.reject(new Error('nee')))).toBe('answers');
  });
});

describe('een onmisbare stap', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  it('heeft geen grens: het openen wacht erop', async () => {
    let done = false;
    const slow = () => new Promise<void>((r) => setTimeout(() => ((done = true), r()), 80));
    await runBootMigrations({ build: 'v1', stepLimitMs: 20, overrides: { seedIfEmpty: slow } });
    expect(done).toBe(true);
  });

  it('na een hangende herstelstap komen de andere herstelstappen pas de volgende keer', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const hangs = () => new Promise<never>(() => undefined);
    const { skipped } = await runBootMigrations({ build: 'v1', stepLimitMs: 20, overrides: { ...quickRepairs, restorePatternSessionsRemovedByPrescription: hangs } });
    warn.mockRestore();
    expect(skipped).toEqual(['restorePatternSessionsRemovedByPrescription', 'normalizePlannedSessionWeeks', 'mergeDuplicateWeeklyPrescriptionLines', 'releaseSystemMoves']);
  });
});

describe('een venster waarvan het slot is overgenomen', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  it('twee keer tegelijk, de eerste geannuleerd na stap 1: die stopt voor de volgende stap, de tweede loopt alles', async () => {
    let cancelled = false;
    const seenA: string[] = [];
    const seenB: string[] = [];
    let second: Promise<unknown> | undefined;
    const first = runBootMigrations({
      build: 'v1',
      isCancelled: () => cancelled,
      onStep: (id) => seenA.push(id),
      overrides: {
        seedIfEmpty: async () => {
          await seedIfEmpty();
          // Hier neemt een ander venster het slot over (Toch openen) en begint zelf.
          cancelled = true;
          second = runBootMigrations({ build: 'v1', onStep: (id) => seenB.push(id) });
        },
      },
    });
    const resultA = await first;
    await second;
    expect(resultA.cancelled).toBe(true);
    expect(seenA).toEqual([BOOT_MIGRATIONS_KEY, 'seedIfEmpty']);
    expect(seenB).toContain('mergeDuplicateWeeklyPrescriptionLines');
    const record = await MetaRepo.get<BootMigrationRecord>(BOOT_MIGRATIONS_KEY);
    expect(record?.done).toHaveLength(BOOT_MIGRATIONS.length);
  });
});

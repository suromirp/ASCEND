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
    expect(skipped).toEqual(['mergeDuplicateWeeklyPrescriptionLines', 'releaseSystemMoves', 'migrateGoalKinds', 'tidyOldProposals']);
    const record = await MetaRepo.get<BootMigrationRecord>(BOOT_MIGRATIONS_KEY);
    expect(record?.done.some((k) => k.startsWith('mergeDuplicateWeeklyPrescriptionLines@'))).toBe(false);
    const seen: string[] = [];
    await runBootMigrations({ build: 'v1', onStep: (id) => seen.push(id) });
    expect(seen).toEqual([BOOT_MIGRATIONS_KEY, 'mergeDuplicateWeeklyPrescriptionLines', 'releaseSystemMoves', 'migrateGoalKinds', 'tidyOldProposals']);
  });
});

// Een fout is geen hangen (docs/beslissingen/2026-11-14-opstarten-en-intervals-grens.md).
describe('een herstelstap die een fout gooit', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    await wipeAllData();
  });

  const fails = () => Promise.reject(new Error('nagemaakte fout'));

  it('alleen die stap valt weg: de herstelstappen erna lopen en tellen als gelopen', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const seen: string[] = [];
    const result = await runBootMigrations({ build: 'v1', onStep: (id) => seen.push(id), overrides: { ...quickRepairs, mergeDuplicateWeeklyPrescriptionLines: fails } });
    expect(error).toHaveBeenCalledTimes(1);
    expect(result.skipped).toEqual(['mergeDuplicateWeeklyPrescriptionLines']);
    // Niets loopt nog: de aanroeper hoeft nergens op te wachten.
    expect(result.pending).toBeUndefined();
    expect(seen).toEqual([BOOT_MIGRATIONS_KEY, ...BOOT_MIGRATIONS.map((m) => m.id)]);
    const record = await MetaRepo.get<BootMigrationRecord>(BOOT_MIGRATIONS_KEY);
    expect(record?.done.some((k) => k.startsWith('mergeDuplicateWeeklyPrescriptionLines@'))).toBe(false);
    expect(record?.done).toHaveLength(BOOT_MIGRATIONS.length - 1);
    for (const id of ['releaseSystemMoves', 'migrateGoalKinds', 'tidyOldProposals']) {
      expect(record?.done.some((k) => k.startsWith(`${id}@`))).toBe(true);
    }
  });

  it('de volgende start probeert alleen de mislukte stap opnieuw, en onthoudt hem als hij lukt', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await runBootMigrations({ build: 'v1', overrides: { ...quickRepairs, mergeDuplicateWeeklyPrescriptionLines: fails } });
    const again: string[] = [];
    const second = await runBootMigrations({ build: 'v1', onStep: (id) => again.push(id), overrides: { mergeDuplicateWeeklyPrescriptionLines: fails } });
    expect(again).toEqual([BOOT_MIGRATIONS_KEY, 'mergeDuplicateWeeklyPrescriptionLines']);
    expect(second.skipped).toEqual(['mergeDuplicateWeeklyPrescriptionLines']);
    const third: string[] = [];
    const ok = await runBootMigrations({ build: 'v1', onStep: (id) => third.push(id) });
    expect(third).toEqual([BOOT_MIGRATIONS_KEY, 'mergeDuplicateWeeklyPrescriptionLines']);
    expect(ok.skipped).toEqual([]);
    const record = await MetaRepo.get<BootMigrationRecord>(BOOT_MIGRATIONS_KEY);
    expect(record?.done).toHaveLength(BOOT_MIGRATIONS.length);
  });

  it('een stap die meteen gooit, zonder belofte, telt als dezelfde fout', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const throwsAtOnce = (() => {
      throw new Error('nagemaakte fout');
    }) as () => Promise<unknown>;
    const { skipped } = await runBootMigrations({ build: 'v1', overrides: { ...quickRepairs, releaseSystemMoves: throwsAtOnce } });
    expect(skipped).toEqual(['releaseSystemMoves']);
  });

  it('een fout en daarna een stap die hangt: alleen het hangen houdt de rest tegen', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const hangs = () => new Promise<never>(() => undefined);
    const result = await runBootMigrations({ build: 'v1', stepLimitMs: 30, overrides: { ...quickRepairs, restorePatternSessionsRemovedByPrescription: async () => undefined, normalizePlannedSessionWeeks: async () => undefined, mergeDuplicateWeeklyPrescriptionLines: fails, releaseSystemMoves: hangs } });
    expect(result.skipped).toEqual(['mergeDuplicateWeeklyPrescriptionLines', 'releaseSystemMoves', 'migrateGoalKinds', 'tidyOldProposals']);
    expect(result.pending).toBeDefined();
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
    expect(skipped).toEqual(['restorePatternSessionsRemovedByPrescription', 'normalizePlannedSessionWeeks', 'mergeDuplicateWeeklyPrescriptionLines', 'releaseSystemMoves', 'migrateGoalKinds', 'tidyOldProposals']);
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

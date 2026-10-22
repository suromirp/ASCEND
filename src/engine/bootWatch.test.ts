import { describe, expect, it } from 'vitest';
import { BOOT_MIGRATIONS, BOOT_MIGRATIONS_KEY, backupFailedLines, bootStepLine, bootStepName, bootStuckLines, bootWatchStage, migrationsToRun, recordAfter, runBoot, storageSilentAdvice, type BootStep } from './bootWatch';

describe('de waakhond bij het openen', () => {
  it('eerst stil, na 6 s wat er gebeurt, na 20 s een uitweg', () => {
    expect(bootWatchStage(0)).toBe('quiet');
    expect(bootWatchStage(5_999)).toBe('quiet');
    expect(bootWatchStage(6_000)).toBe('slow');
    expect(bootWatchStage(19_999)).toBe('slow');
    expect(bootWatchStage(20_000)).toBe('stuck');
  });

  it('noemt de stap in gewone woorden, zonder gedachtestreepjes', () => {
    const steps: BootStep[] = ['migraties', 'gegevens', 'planning'];
    expect(steps.map((s) => bootStepName(s))).toEqual(['migraties', 'gegevens lezen', 'planning']);
    expect(bootStepLine('planning')).toBe('Je planning wordt bijgewerkt…');
    expect(steps.map(bootStepLine).join(' ')).not.toMatch(new RegExp('[\\u2013\\u2014]'));
  });
});

describe('de volgorde van het openen', () => {
  it('toont de app ook als de planning nooit afloopt', async () => {
    const seen: string[] = [];
    await runBoot({
      migrate: async () => void seen.push('migrate'),
      load: async () => void seen.push('load'),
      onStep: (s) => seen.push(`stap ${s}`),
      onReady: () => seen.push('klaar'),
      background: () => new Promise<void>(() => undefined),
    });
    expect(seen).toEqual(['stap migraties', 'migrate', 'stap gegevens', 'load', 'stap planning', 'klaar']);
  });

  it('een fout in de planning op de achtergrond houdt het openen niet tegen', async () => {
    let ready = false;
    const original = console.error;
    console.error = () => undefined;
    try {
      await runBoot({ migrate: async () => undefined, load: async () => undefined, onStep: () => undefined, onReady: () => (ready = true), background: () => Promise.reject(new Error('kapot')) });
      await new Promise((r) => setTimeout(r, 0));
    } finally {
      console.error = original;
    }
    expect(ready).toBe(true);
  });

  it('een fout bij het lezen komt bij de beller, zodat het scherm een melding kan geven', async () => {
    await expect(runBoot({ migrate: async () => undefined, load: () => Promise.reject(new Error('opslag')), onStep: () => undefined, onReady: () => undefined, background: async () => undefined })).rejects.toThrow('opslag');
  });
});

describe('de precieze migratiestap', () => {
  it('noemt het onderdeel en waar het in de rij staat', () => {
    expect(bootStepName('migraties', 'normalizePlannedSessionWeeks')).toBe(`migraties, onderdeel normalizePlannedSessionWeeks (9 van ${BOOT_MIGRATIONS.length})`);
    expect(bootStepName('migraties', null)).toBe('migraties');
    expect(bootStepName('migraties', BOOT_MIGRATIONS_KEY)).toBe('migraties, de eerste leesactie (welke onderdelen al klaar zijn)');
    expect(bootStepName('migraties', 'bestaat niet')).toBe('migraties');
  });

  it('een stap die voor deze versie al liep, loopt niet nog eens', () => {
    const build = 'abc123';
    expect(migrationsToRun(undefined, build)).toHaveLength(BOOT_MIGRATIONS.length);
    let record = recordAfter(undefined, build, BOOT_MIGRATIONS[0]);
    record = recordAfter(record, build, BOOT_MIGRATIONS[1]);
    expect(migrationsToRun(record, build).map((m) => m.id)).toEqual(BOOT_MIGRATIONS.slice(2).map((m) => m.id));
    // Twee keer dezelfde stap telt één keer.
    expect(recordAfter(record, build, BOOT_MIGRATIONS[1]).done).toHaveLength(2);
  });

  it('een nieuwe versie van de app, of van de stap, laat hem opnieuw lopen', () => {
    const all = BOOT_MIGRATIONS.reduce((r, m) => recordAfter(r, 'v1', m), undefined as ReturnType<typeof recordAfter> | undefined);
    expect(migrationsToRun(all, 'v1')).toEqual([]);
    expect(migrationsToRun(all, 'v2')).toHaveLength(BOOT_MIGRATIONS.length);
    const bumped = BOOT_MIGRATIONS.map((m, i) => (i === 3 ? { ...m, version: m.version + 1 } : m));
    expect(migrationsToRun(all, 'v1', bumped).map((m) => m.id)).toEqual([BOOT_MIGRATIONS[3].id]);
  });

  it('een kapot geheugen telt als niets gedaan', () => {
    expect(migrationsToRun({ build: 'v1', done: 'x' as unknown as string[] }, 'v1')).toHaveLength(BOOT_MIGRATIONS.length);
  });

  it('de eerste stappen zijn onmisbaar, de herstelstappen niet', () => {
    const essential = (id: string) => BOOT_MIGRATIONS.find((m) => m.id === id)?.essential;
    expect(essential('seedIfEmpty')).toBe(true);
    expect(essential('migrateToGoalEngine')).toBe(true);
    expect(essential('mergeDuplicateWeeklyPrescriptionLines')).toBe(false);
    expect(essential('normalizePlannedSessionWeeks')).toBe(false);
  });
});

describe('als het openen hangt', () => {
  it('antwoordt de opslag niet, dan zegt het scherm wat je doet en dat je gegevens blijven', () => {
    const lines = bootStuckLines('migraties', 'seedIfEmpty', 'silent').join(' ');
    expect(lines).toContain('migraties, onderdeel seedIfEmpty (1 van');
    expect(lines).toContain('ergens anders open of is vastgelopen');
    expect(lines).toContain('Apps, Chrome, Geforceerd stoppen');
    expect(lines).toContain('Je gegevens blijven staan');
  });

  it('antwoordt de opslag wel, dan geen raad over Chrome', () => {
    const lines = bootStuckLines('gegevens', null, 'answers').join(' ');
    expect(lines).toContain('gegevens lezen');
    expect(lines).toContain('De opslag antwoordt wel');
    expect(lines).not.toContain('Geforceerd');
  });

  it('nog geen uitslag van de proef: dat staat er ook', () => {
    expect(bootStuckLines('migraties', null, null).join(' ')).toContain('Even kijken of de opslag nog antwoordt');
  });

  it('de back-up zegt eerlijk dat het niet lukt, met dezelfde uitleg', () => {
    expect(backupFailedLines('silent')).toEqual(['De back-up lukt nu niet.', ...storageSilentAdvice()]);
    expect(backupFailedLines('silent', true)).toEqual(['De back-up lukt nu niet, om dezelfde reden: de opslag antwoordt niet.']);
    expect(backupFailedLines('answers').join(' ')).not.toContain('Geforceerd');
  });

  it('geen gedachtestreepjes in de teksten', () => {
    const all = [...bootStuckLines('migraties', 'seedIfEmpty', 'silent'), ...bootStuckLines('planning', null, 'answers'), ...backupFailedLines('silent'), ...backupFailedLines(null)].join(' ');
    expect(all).not.toMatch(new RegExp('[\\u2013\\u2014]'));
  });
});

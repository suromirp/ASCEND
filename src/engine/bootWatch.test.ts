import { describe, expect, it } from 'vitest';
import { bootStepLine, bootStepName, bootWatchStage, runBoot, type BootStep } from './bootWatch';

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
    expect(steps.map(bootStepName)).toEqual(['migraties', 'gegevens lezen', 'planning']);
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

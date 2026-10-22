import { describe, it, expect, beforeEach } from 'vitest';
import { SettingsRepo, wipeAllData } from './database';
import { buildBackupEnvelope, normalizeBackupToCurrentModel } from './backup';
import { cleanNavigationSettings } from './migrations';

describe('de terugknop-instellingen en de back-up', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  it('reizen mee in de instellingen', async () => {
    await SettingsRepo.set({ tabBack: 'previous', resumeMinutes: 480 });
    const back = normalizeBackupToCurrentModel(JSON.parse(JSON.stringify(await buildBackupEnvelope())));
    expect(back.settings?.tabBack).toBe('previous');
    expect(back.settings?.resumeMinutes).toBe(480);
  });

  it('een oudere back-up zonder deze velden importeert zoals eerst', async () => {
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    delete envelope.payload.settings.tabBack;
    delete envelope.payload.settings.resumeMinutes;
    const back = normalizeBackupToCurrentModel(envelope);
    expect(back.settings?.tabBack).toBeUndefined();
    expect(back.settings?.resumeMinutes).toBeUndefined();
  });

  it('een beschadigde waarde wordt weggelaten in plaats van bewaard', async () => {
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    envelope.payload.settings = { ...envelope.payload.settings, tabBack: 'zijwaarts', resumeMinutes: 90 };
    const back = normalizeBackupToCurrentModel(envelope);
    expect(back.settings?.tabBack).toBeUndefined();
    expect(back.settings?.resumeMinutes).toBeUndefined();
  });
});

describe('cleanNavigationSettings', () => {
  it('houdt bekende waarden, ook 0 (uit)', () => {
    expect(cleanNavigationSettings({ tabBack: 'today', resumeMinutes: 0 })).toEqual({ value: { tabBack: 'today', resumeMinutes: 0 }, skipped: 0 });
  });

  it('laat ontbrekende velden ontbreken zonder te tellen', () => {
    expect(cleanNavigationSettings({})).toEqual({ value: {}, skipped: 0 });
  });

  it('laat onbekende waarden weg en telt ze', () => {
    expect(cleanNavigationSettings({ tabBack: 3, resumeMinutes: '120' })).toEqual({ value: {}, skipped: 2 });
    expect(cleanNavigationSettings({ tabBack: 'previous', resumeMinutes: 61 })).toEqual({ value: { tabBack: 'previous' }, skipped: 1 });
  });
});

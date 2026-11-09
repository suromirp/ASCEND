import { describe, it, expect, beforeEach } from 'vitest';
import { SettingsRepo, wipeAllData } from './database';
import { buildBackupEnvelope } from './backupExport';
import { normalizeBackupToCurrentModel } from './backupNormalize';
import { migrateCardsAboveMission } from './migrations';

describe('Kaarten boven de missie en de back-up', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  it('reist mee in de instellingen', async () => {
    await SettingsRepo.set({ cardsAboveMission: 'all' });
    const back = normalizeBackupToCurrentModel(JSON.parse(JSON.stringify(await buildBackupEnvelope())));
    expect(back.settings?.cardsAboveMission).toBe('all');
  });

  it('een oudere back-up zonder dit veld importeert zoals eerst: het advies geldt', async () => {
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    delete envelope.payload.settings.cardsAboveMission;
    const back = normalizeBackupToCurrentModel(envelope);
    expect(back.settings?.cardsAboveMission).toBeUndefined();
  });

  it('een beschadigde waarde wordt weggelaten in plaats van bewaard', async () => {
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    envelope.payload.settings = { ...envelope.payload.settings, cardsAboveMission: 'veel' };
    const back = normalizeBackupToCurrentModel(envelope);
    expect(back.settings?.cardsAboveMission).toBeUndefined();
  });
});

describe('migrateCardsAboveMission', () => {
  it('houdt 1, 2 en alles, en laat de rest weg', () => {
    expect(migrateCardsAboveMission(1)).toBe(1);
    expect(migrateCardsAboveMission(2)).toBe(2);
    expect(migrateCardsAboveMission('all')).toBe('all');
    expect(migrateCardsAboveMission(3)).toBeUndefined();
    expect(migrateCardsAboveMission('1')).toBeUndefined();
    expect(migrateCardsAboveMission(undefined)).toBeUndefined();
  });
});

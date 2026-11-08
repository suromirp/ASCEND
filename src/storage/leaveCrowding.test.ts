import { describe, it, expect, beforeEach } from 'vitest';
import { SettingsRepo, wipeAllData } from './database';
import { buildBackupEnvelope } from './backupExport';
import { normalizeBackupToCurrentModel } from './backupNormalize';

// "Opzij voor een vakantie" (AppSettings.leaveCrowding) en de back-up.
describe('opzij voor een vakantie en de back-up', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  it('reist mee in de instellingen', async () => {
    await SettingsRepo.set({ leaveCrowding: 'shift' });
    const back = normalizeBackupToCurrentModel(JSON.parse(JSON.stringify(await buildBackupEnvelope())));
    expect(back.settings?.leaveCrowding).toBe('shift');
  });

  it('een oudere back-up zonder dit veld importeert zoals eerst, met het advies', async () => {
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    delete envelope.payload.settings.leaveCrowding;
    const back = normalizeBackupToCurrentModel(envelope);
    expect(back.settings?.leaveCrowding).toBeUndefined();
  });

  it('een beschadigde waarde wordt weggelaten in plaats van bewaard', async () => {
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    envelope.payload.settings = { ...envelope.payload.settings, leaveCrowding: 'altijd' };
    const back = normalizeBackupToCurrentModel(envelope);
    expect(back.settings?.leaveCrowding).toBeUndefined();
  });
});

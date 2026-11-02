import { describe, it, expect, beforeEach } from 'vitest';
import { SettingsRepo, wipeAllData } from './database';
import { buildBackupEnvelope, normalizeBackupToCurrentModel } from './backup';

// "Loslaten op een training" (AppSettings.dropOnTraining) en de back-up.
describe('loslaten op een training en de back-up', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  it('een geldige waarde reist mee in de instellingen', async () => {
    await SettingsRepo.set({ dropOnTraining: 'together' });
    const back = normalizeBackupToCurrentModel(JSON.parse(JSON.stringify(await buildBackupEnvelope())));
    expect(back.settings?.dropOnTraining).toBe('together');
  });

  it('een oudere back-up zonder dit veld importeert zoals eerst, met het advies', async () => {
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    delete envelope.payload.settings.dropOnTraining;
    const back = normalizeBackupToCurrentModel(envelope);
    expect(back.settings?.dropOnTraining).toBeUndefined();
  });

  it('een kapotte waarde valt weg in plaats van bewaard te worden', async () => {
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    envelope.payload.settings = { ...envelope.payload.settings, dropOnTraining: 'wisselen' };
    const back = normalizeBackupToCurrentModel(envelope);
    expect(back.settings?.dropOnTraining).toBeUndefined();
  });
});

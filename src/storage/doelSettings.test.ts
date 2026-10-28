import { describe, it, expect, beforeEach } from 'vitest';
import { SettingsRepo, wipeAllData } from './database';
import { buildBackupEnvelope, normalizeBackupToCurrentModel } from './backup';

describe('de keuzes voor "Klaar voor je doel" en de doeltijd in de back-up', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  it('reizen mee in de instellingen', async () => {
    await SettingsRepo.set({ readinessWeighting: 'equal', proposeTargetTime: false });
    const back = normalizeBackupToCurrentModel(JSON.parse(JSON.stringify(await buildBackupEnvelope())));
    expect(back.settings?.readinessWeighting).toBe('equal');
    expect(back.settings?.proposeTargetTime).toBe(false);
  });

  it('een oudere back-up zonder deze velden importeert zoals eerst', async () => {
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    delete envelope.payload.settings.readinessWeighting;
    delete envelope.payload.settings.proposeTargetTime;
    const back = normalizeBackupToCurrentModel(envelope);
    expect(back.settings?.readinessWeighting).toBeUndefined();
    expect(back.settings?.proposeTargetTime).toBeUndefined();
  });

  it('een beschadigde waarde wordt weggelaten in plaats van bewaard', async () => {
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    envelope.payload.settings = { ...envelope.payload.settings, readinessWeighting: 'zwaar', proposeTargetTime: 'nee' };
    const back = normalizeBackupToCurrentModel(envelope);
    expect(back.settings?.readinessWeighting).toBeUndefined();
    expect(back.settings?.proposeTargetTime).toBeUndefined();
  });
});

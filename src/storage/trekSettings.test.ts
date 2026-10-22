import { describe, it, expect, beforeEach } from 'vitest';
import { SettingsRepo, wipeAllData } from './database';
import { buildBackupEnvelope, normalizeBackupToCurrentModel } from './backup';

describe('de schakelaars voor tochten en de back-up', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  it('reizen mee in de instellingen', async () => {
    await SettingsRepo.set({ showNextTrek: false, trekLegRest: 'strict' });
    const back = normalizeBackupToCurrentModel(JSON.parse(JSON.stringify(await buildBackupEnvelope())));
    expect(back.settings?.showNextTrek).toBe(false);
    expect(back.settings?.trekLegRest).toBe('strict');
  });

  it('een oudere back-up zonder deze velden importeert zoals eerst', async () => {
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    delete envelope.payload.settings.showNextTrek;
    delete envelope.payload.settings.trekLegRest;
    const back = normalizeBackupToCurrentModel(envelope);
    expect(back.settings?.showNextTrek).toBeUndefined();
    expect(back.settings?.trekLegRest).toBeUndefined();
  });

  it('een beschadigde waarde wordt weggelaten in plaats van bewaard', async () => {
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    envelope.payload.settings = { ...envelope.payload.settings, showNextTrek: 'nee', trekLegRest: 'zacht' };
    const back = normalizeBackupToCurrentModel(envelope);
    expect(back.settings?.showNextTrek).toBeUndefined();
    expect(back.settings?.trekLegRest).toBeUndefined();
  });
});

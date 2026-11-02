import { describe, it, expect, beforeEach } from 'vitest';
import { SettingsRepo, wipeAllData } from './database';
import { buildBackupEnvelope, normalizeBackupToCurrentModel } from './backup';
import { resolveTestRest } from '../engine/testRest';

// "Rust voor een test" (AppSettings.testRest) en de back-up. Geen migratiestap: het veld is optioneel en een
// oude back-up zonder het veld leest als 72 uur, het advies.
describe('rust voor een test en de back-up', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  it('reist mee in de instellingen', async () => {
    await SettingsRepo.set({ testRest: 48 });
    const back = normalizeBackupToCurrentModel(JSON.parse(JSON.stringify(await buildBackupEnvelope())));
    expect(back.settings?.testRest).toBe(48);
  });

  it('een oudere back-up zonder dit veld importeert zoals eerst, met het advies', async () => {
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    delete envelope.payload.settings.testRest;
    const back = normalizeBackupToCurrentModel(envelope);
    expect(back.settings?.testRest).toBeUndefined();
    expect(resolveTestRest(back.settings?.testRest)).toBe(72);
  });

  it('een beschadigde waarde wordt weggelaten in plaats van bewaard', async () => {
    for (const bad of [24, '48', 'altijd', null]) {
      const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
      envelope.payload.settings = { ...envelope.payload.settings, testRest: bad };
      const back = normalizeBackupToCurrentModel(envelope);
      expect(back.settings?.testRest).toBeUndefined();
    }
  });
});

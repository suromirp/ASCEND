import { describe, it, expect, beforeEach } from 'vitest';
import { SettingsRepo, wipeAllData } from './database';
import { buildBackupEnvelope, normalizeBackupToCurrentModel } from './backup';

describe('de keuzes voor "Klaar voor je doel" en de doeltijd in de back-up', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  it('reizen mee in de instellingen', async () => {
    await SettingsRepo.set({ readinessWeighting: 'equal', proposeTargetTime: false, goalGrowth: 'careful', limitMargin: 'five' });
    const back = normalizeBackupToCurrentModel(JSON.parse(JSON.stringify(await buildBackupEnvelope())));
    expect(back.settings?.readinessWeighting).toBe('equal');
    expect(back.settings?.proposeTargetTime).toBe(false);
    expect(back.settings?.goalGrowth).toBe('careful');
    expect(back.settings?.limitMargin).toBe('five');
  });

  it('een oudere back-up zonder deze velden importeert zoals eerst', async () => {
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    delete envelope.payload.settings.readinessWeighting;
    delete envelope.payload.settings.proposeTargetTime;
    delete envelope.payload.settings.goalGrowth;
    delete envelope.payload.settings.limitMargin;
    const back = normalizeBackupToCurrentModel(envelope);
    expect(back.settings?.readinessWeighting).toBeUndefined();
    expect(back.settings?.proposeTargetTime).toBeUndefined();
    expect(back.settings?.goalGrowth).toBeUndefined();
    expect(back.settings?.limitMargin).toBeUndefined();
  });

  it('een beschadigde waarde wordt weggelaten in plaats van bewaard', async () => {
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    envelope.payload.settings = { ...envelope.payload.settings, readinessWeighting: 'zwaar', proposeTargetTime: 'nee', goalGrowth: 'wild', limitMargin: 7 };
    const back = normalizeBackupToCurrentModel(envelope);
    expect(back.settings?.readinessWeighting).toBeUndefined();
    expect(back.settings?.proposeTargetTime).toBeUndefined();
    expect(back.settings?.goalGrowth).toBeUndefined();
    expect(back.settings?.limitMargin).toBeUndefined();
  });
});

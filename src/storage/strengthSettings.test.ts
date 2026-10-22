import { beforeEach, describe, expect, it } from 'vitest';
import { SettingsRepo, wipeAllData } from './database';
import { buildBackupEnvelope, normalizeBackupToCurrentModel } from './backup';
import { DEFAULT_PROFILE, resolveStrengthSettings } from '../engine/strengthSettings';

// Made-up settings. The choices and the gym profile of Forge (Kracht meerekenen)
// travel with the settings in a backup; rubbish is refused; an older backup
// without them means the advice.

describe('Forge-instellingen en de back-up', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  it('reizen mee in de export, in de instellingen', async () => {
    const mine = { enabled: false, warmup: 'scheme' as const, workSets: 'equal' as const, profiles: [{ ...DEFAULT_PROFILE, barsKg: [20], stackStepKg: 2.5 }], activeProfileId: DEFAULT_PROFILE.id };
    await SettingsRepo.set({ strengthModel: mine });
    const back = normalizeBackupToCurrentModel(JSON.parse(JSON.stringify(await buildBackupEnvelope())));
    expect(back.settings?.strengthModel).toEqual(mine);
    expect(resolveStrengthSettings(back.settings?.strengthModel).profile.stackStepKg).toBe(2.5);
  });

  it('een oudere back-up zonder Forge-instellingen leest als het advies', async () => {
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    delete envelope.payload.settings.strengthModel;
    const back = normalizeBackupToCurrentModel(envelope);
    expect(back.settings?.strengthModel).toBeUndefined();
    expect(resolveStrengthSettings(back.settings?.strengthModel).enabled).toBe(true);
  });

  it('weigert rommel: geen record valt weg, een record houdt alleen geldige waarden', async () => {
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    envelope.payload.settings = { ...envelope.payload.settings, strengthModel: 'uit' };
    expect(normalizeBackupToCurrentModel(envelope).settings?.strengthModel).toBeUndefined();

    envelope.payload.settings = {
      ...envelope.payload.settings,
      strengthModel: { enabled: 'nee', warmup: 'off', profiles: [{ id: 'p', barsKg: [-1, 'x'], stackStepKg: 'groot' }], onzin: true },
    };
    const clean = normalizeBackupToCurrentModel(envelope).settings?.strengthModel;
    expect(clean?.enabled).toBeUndefined();
    expect(clean?.warmup).toBe('off');
    expect(clean?.profiles?.[0].barsKg).toEqual(DEFAULT_PROFILE.barsKg);
    expect(clean?.profiles?.[0].stackStepKg).toBe(5);
    expect(JSON.stringify(clean)).not.toContain('onzin');
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { SettingsRepo, wipeAllData } from './database';
import { buildBackupEnvelope } from './backupExport';
import { normalizeBackupToCurrentModel } from './backupNormalize';
import { resolveDescentClock } from '../engine/descentClock';
import { cleanSettings } from './backupClean';

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

describe('de afdaalklok en de back-up', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  it('de keuze reist mee', async () => {
    await SettingsRepo.set({ descentClock: 'altijd' });
    const back = normalizeBackupToCurrentModel(JSON.parse(JSON.stringify(await buildBackupEnvelope())));
    expect(back.settings?.descentClock).toBe('altijd');
  });

  it('een oude back-up zonder het veld importeert zoals eerst en leest als het advies', async () => {
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    delete envelope.payload.settings.descentClock;
    const back = normalizeBackupToCurrentModel(envelope);
    expect(back.settings?.descentClock).toBeUndefined();
    expect(resolveDescentClock(back.settings?.descentClock)).toBe('advies');
  });

  it('een beschadigde waarde wordt weggelaten', async () => {
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    envelope.payload.settings = { ...envelope.payload.settings, descentClock: 'soms' };
    expect(normalizeBackupToCurrentModel(envelope).settings?.descentClock).toBeUndefined();
  });
});

describe('een beschadigde afdaalklok telt mee als overgeslagen', () => {
  it('cleanSettings haalt de waarde weg en telt hem', () => {
    const skipped = { n: 0 };
    expect(cleanSettings({ descentClock: 'soms' }, skipped)?.descentClock).toBeUndefined();
    expect(skipped.n).toBe(1);
    const fine = { n: 0 };
    expect(cleanSettings({ descentClock: 'uit' }, fine)?.descentClock).toBe('uit');
    expect(fine.n).toBe(0);
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { SettingsRepo, wipeAllData } from './database';
import { buildBackupEnvelope, normalizeBackupToCurrentModel } from './backup';
import { migrateDirection, migrateWaveSettings } from './migrations';

describe('migrateDirection', () => {
  it('houdt bekende waarden over', () => {
    expect(migrateDirection({ direction: 'improve', directionStart: '2026-10-26', weekBudget: { minutes: 135, strength: 3, doubleHard: false } })).toEqual({
      value: { direction: 'improve', directionStart: '2026-10-26', weekBudget: { minutes: 135, strength: 3, doubleHard: false } },
      skipped: 0,
    });
  });

  it('laat een leeg bestand zoals het was', () => {
    expect(migrateDirection({})).toEqual({ value: {}, skipped: 0 });
  });

  it('laat onbekende waarden weg en telt ze', () => {
    expect(migrateDirection({ direction: 'doel', directionStart: '2026-10-27', weekBudget: { minutes: 5, strength: 9, doubleHard: 'ja' } })).toEqual({ value: {}, skipped: 5 });
    expect(migrateDirection({ weekBudget: 'veel' })).toEqual({ value: {}, skipped: 1 });
  });

  it('bewaart de richting als alleen de start niet klopt', () => {
    expect(migrateDirection({ direction: 'easy', directionStart: '2026-10-28' })).toEqual({ value: { direction: 'easy' }, skipped: 1 });
  });

  it('bewaart geen start zonder richting', () => {
    expect(migrateDirection({ directionStart: '2026-10-26' })).toEqual({ value: {}, skipped: 1 });
  });
});

describe('migrateWaveSettings', () => {
  it('houdt alleen een bekende beginnersstart over', () => {
    expect(migrateWaveSettings({ beginnerStart: 'ja' })).toEqual({ value: { beginnerStart: 'ja' }, skipped: 0 });
    expect(migrateWaveSettings({ beginnerStart: 'soms' })).toEqual({ value: {}, skipped: 1 });
    expect(migrateWaveSettings({})).toEqual({ value: {}, skipped: 0 });
  });
});

describe('richting en weekbudget in de back-up', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  it('reizen mee in de instellingen', async () => {
    await SettingsRepo.set({ direction: 'stronger', directionStart: '2026-10-26', weekBudget: { minutes: 105, strength: 3 } });
    const back = normalizeBackupToCurrentModel(JSON.parse(JSON.stringify(await buildBackupEnvelope())));
    expect(back.settings?.direction).toBe('stronger');
    expect(back.settings?.directionStart).toBe('2026-10-26');
    expect(back.settings?.weekBudget).toEqual({ minutes: 105, strength: 3 });
  });

  it('de beginnersstart reist mee, een onzinnige waarde niet', async () => {
    await SettingsRepo.set({ beginnerStart: 'nee' });
    expect(normalizeBackupToCurrentModel(JSON.parse(JSON.stringify(await buildBackupEnvelope()))).settings?.beginnerStart).toBe('nee');
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    envelope.payload.settings = { ...envelope.payload.settings, beginnerStart: 'soms' };
    expect(normalizeBackupToCurrentModel(envelope).settings?.beginnerStart).toBeUndefined();
  });

  it('een oudere back-up zonder deze velden importeert zoals eerst', async () => {
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    const back = normalizeBackupToCurrentModel(envelope);
    expect(back.settings?.direction).toBeUndefined();
    expect(back.settings?.directionStart).toBeUndefined();
    expect(back.settings?.weekBudget).toBeUndefined();
  });

  it('een beschadigde waarde wordt weggelaten in plaats van bewaard', async () => {
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    envelope.payload.settings = { ...envelope.payload.settings, direction: 'zweven', directionStart: 7, weekBudget: { minutes: 'veel' } };
    const back = normalizeBackupToCurrentModel(envelope);
    expect(back.settings?.direction).toBeUndefined();
    expect(back.settings?.directionStart).toBeUndefined();
    expect(back.settings?.weekBudget).toBeUndefined();
  });
});

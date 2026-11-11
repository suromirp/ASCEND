import { beforeEach, describe, expect, it } from 'vitest';
import { MetaRepo, wipeAllData } from './database';
import { buildBackupEnvelope } from './backupExport';
import { TRAINING_PLACE_KEY, getTrainingPlace, getTrainingPlaces, onTrainingPlaceChange, peekTrainingPlaces, resetTrainingPlaceCache, saveTrainingPlace } from './trainingPlace';

beforeEach(async () => {
  await wipeAllData();
  resetTrainingPlaceCache();
});

describe('de keuze Waar train je? op dit toestel', () => {
  it('bewaart per geplande training, en geldt alleen voor die ene', async () => {
    expect(await saveTrainingPlace('p1', '2026-11-12', 'run_treadmill', '2026-11-11')).toBe(true);
    expect(await getTrainingPlace('p1')).toBe('run_treadmill');
    expect(await getTrainingPlace('p2')).toBeUndefined();
  });
  it('een toestel zonder bewaarde keuze of met een kapotte waarde: niets, dan geldt de standaard', async () => {
    expect(await getTrainingPlace('p1')).toBeUndefined();
    await MetaRepo.set(TRAINING_PLACE_KEY, 'kapot');
    expect(await getTrainingPlace('p1')).toBeUndefined();
    await MetaRepo.set(TRAINING_PLACE_KEY, { p1: { key: 7, date: 'gisteren' } });
    expect(await getTrainingPlace('p1')).toBeUndefined();
  });
  it('oude keuzes gaan weg bij een nieuwe', async () => {
    await saveTrainingPlace('oud', '2026-10-01', 'run_treadmill', '2026-10-01');
    await saveTrainingPlace('nieuw', '2026-11-12', 'run_outdoor', '2026-11-11');
    expect(await getTrainingPlace('oud')).toBeUndefined();
    expect(await getTrainingPlace('nieuw')).toBe('run_outdoor');
  });
  it('staat niet in de export en niet in een back-up', async () => {
    await saveTrainingPlace('p1', '2026-11-12', 'run_treadmill', '2026-11-11');
    const backup = JSON.stringify(await buildBackupEnvelope());
    expect(backup).not.toContain(TRAINING_PLACE_KEY);
    expect(backup).not.toContain('run_treadmill');
  });
});

describe('andere schermen volgen een nieuwe keuze', () => {
  it('voor het lezen is er niets; na een tik weten ze het meteen, ook voor het schrijven klaar is', async () => {
    expect(peekTrainingPlaces()).toBeUndefined();
    let heard = 0;
    const off = onTrainingPlaceChange(() => { heard += 1; });
    const pending = saveTrainingPlace('p1', '2026-11-12', 'run_treadmill', '2026-11-11');
    expect(peekTrainingPlaces()).toEqual({ p1: 'run_treadmill' });
    await pending;
    off();
    expect(heard).toBeGreaterThanOrEqual(1);
    resetTrainingPlaceCache();
    expect(await getTrainingPlaces()).toEqual({ p1: 'run_treadmill' });
    expect(peekTrainingPlaces()).toEqual({ p1: 'run_treadmill' });
  });
});

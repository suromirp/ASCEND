import { describe, it, expect, beforeEach } from 'vitest';
import { SettingsRepo, wipeAllData } from './database';
import { buildBackupEnvelope, normalizeBackupToCurrentModel } from './backup';

// Sporten die meetellen stap 3: de rol per sport reist mee in de back-up. Nagemaakte data.
describe('sportHandling in de back-up', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  it('reist mee in de instellingen', async () => {
    await SettingsRepo.set({ sportHandling: { football: { role: 'fixed', fixed: [{ day: 6, minutes: 90, intensity: 'high' }] }, swimming: { role: 'off' } } });
    const back = normalizeBackupToCurrentModel(JSON.parse(JSON.stringify(await buildBackupEnvelope())));
    expect(back.settings?.sportHandling).toEqual({ football: { role: 'fixed', fixed: [{ day: 6, minutes: 90, intensity: 'high' }] }, swimming: { role: 'off' } });
  });

  it('een oudere back-up zonder dit veld importeert zoals eerst, onzin valt weg', async () => {
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    expect(normalizeBackupToCurrentModel(envelope).settings?.sportHandling).toBeUndefined();
    envelope.payload.settings = { ...envelope.payload.settings, sportHandling: { tennis: { role: 'count' } } };
    expect(normalizeBackupToCurrentModel(envelope).settings?.sportHandling).toBeUndefined();
  });
});

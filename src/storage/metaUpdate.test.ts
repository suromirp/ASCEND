// Lezen en schrijven in één transactie (backlog I-38): twee wijzigingen tegelijk
// bouwen op elkaar voort, de laatste schrijft nooit een oude kopie terug.

import { describe, it, expect, beforeEach } from 'vitest';
import { GoalEngineConfigRepo, MetaRepo, SettingsRepo, StretchCompletionRepo, wipeAllData } from './database';

describe('set-functies lezen en schrijven in één transactie', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  it('SettingsRepo.set: twee wijzigingen tegelijk blijven allebei staan', async () => {
    await Promise.all([SettingsRepo.set({ restDay: 3 }), SettingsRepo.set({ introSoundEnabled: false })]);
    const s = await SettingsRepo.get();
    expect(s.restDay).toBe(3);
    expect(s.introSoundEnabled).toBe(false);
  });

  it('SettingsRepo.set geeft terug wat er staat, met de standaardwaarden', async () => {
    const next = await SettingsRepo.set({ restDay: 2 });
    expect(next).toEqual(await SettingsRepo.get());
    expect(next.strengthTrackedExternally).toBe(false);
  });

  it('StretchCompletionRepo.set: ochtend en avond tegelijk blijven allebei staan', async () => {
    await Promise.all([StretchCompletionRepo.set({ morning: '2026-11-15' }), StretchCompletionRepo.set({ evening: '2026-11-15' })]);
    expect(await StretchCompletionRepo.get()).toEqual({ morning: '2026-11-15', evening: '2026-11-15' });
  });

  it('GoalEngineConfigRepo.set: twee wijzigingen tegelijk blijven allebei staan', async () => {
    const base = await GoalEngineConfigRepo.get();
    await Promise.all([
      GoalEngineConfigRepo.set({ strategy: { ...base.strategy, progressionStyle: 'conservative' } }),
      GoalEngineConfigRepo.set({ availability: { ...base.availability, allowedDays: ['mon', 'wed', 'fri'] } }),
    ]);
    const after = await GoalEngineConfigRepo.get();
    expect(after.strategy.progressionStyle).toBe('conservative');
    expect(after.availability.allowedDays).toEqual(['mon', 'wed', 'fri']);
    expect(after.updatedAt).toBeDefined();
  });

  it('MetaRepo.update leest wat de vorige wijziging schreef', async () => {
    await Promise.all(Array.from({ length: 10 }, () => MetaRepo.update<number>('teller', (n) => (n ?? 0) + 1)));
    expect(await MetaRepo.get<number>('teller')).toBe(10);
  });
});

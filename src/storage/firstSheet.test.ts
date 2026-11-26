// Belangrijk advies als blad (I-157) in de opslag en de back-up: `firstSheet` en `firstAdviceSheet` in de
// instellingen, optioneel. Een oude back-up zonder de map blijft importeerbaar. Testdata is nagemaakt.
import { describe, it, expect, beforeEach } from 'vitest';
import { SettingsRepo, wipeAllData } from './database';
import { buildBackupEnvelope } from './backupExport';
import { normalizeBackupToCurrentModel } from './backupNormalize';
import { buildImportPreview } from './backupPreview';
import { createImportPlan, createPreImportSnapshot, applyImportPlan } from './backupApply';
import { defaultActionsForMode, defaultPlanPolicyForMode } from './backupMerge';
import { migrateFirstSheet } from './migrations';
import { cleanSettings } from './backupClean';

async function importEnvelope(payload: unknown) {
  const backup = normalizeBackupToCurrentModel(payload);
  const sel = defaultActionsForMode('full_restore');
  const pol = defaultPlanPolicyForMode('full_restore');
  const preview = await buildImportPreview(backup, sel, pol);
  const snapshot = await createPreImportSnapshot();
  await applyImportPlan(backup, createImportPlan(backup, 'full_restore', sel, pol, preview.diffByCategory.flatMap((d) => d.conflicts), snapshot.id));
}

const MAP = { 'reentry:2026-11-24': { shownOn: '2026-11-26', snoozes: 1 } };

describe('firstSheet in de back-up', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  it('een oude back-up zonder firstSheet: de migratie laat hem zoals hij was', () => {
    expect(migrateFirstSheet(undefined)).toEqual({ value: undefined, skipped: 0 });
    const count = { n: 0 };
    const out = cleanSettings({ askSweat: true }, count);
    expect(out && 'firstSheet' in out).toBe(false);
    expect(count.n).toBe(0);
  });

  it('een oude back-up zonder de map importeert zoals eerst en laat de map op het toestel staan', async () => {
    const envelope = await buildBackupEnvelope();
    expect(envelope.payload.settings.firstSheet).toBeUndefined();
    expect(normalizeBackupToCurrentModel(envelope).skippedInvalid).toBe(0);
    await SettingsRepo.set({ firstSheet: MAP });
    await importEnvelope(envelope);
    expect((await SettingsRepo.get()).firstSheet).toEqual(MAP);
  });

  it('gaat mee in de export en komt terug op een leeg toestel, met de instelling', async () => {
    await SettingsRepo.set({ firstSheet: MAP, firstAdviceSheet: false });
    const envelope = await buildBackupEnvelope();
    expect(envelope.payload.settings.firstSheet).toEqual(MAP);
    await wipeAllData();
    await importEnvelope(envelope);
    const restored = await SettingsRepo.get();
    expect(restored.firstSheet).toEqual(MAP);
    expect(restored.firstAdviceSheet).toBe(false);
  });

  it('terugzetten: een blad dat op het toestel al kwam, komt niet terug', async () => {
    await SettingsRepo.set({ firstSheet: MAP });
    const envelope = await buildBackupEnvelope();
    await SettingsRepo.set({ firstSheet: { 'reentry:2026-11-24': { shownOn: '2026-11-27', snoozes: 2 } } });
    await importEnvelope(envelope);
    expect((await SettingsRepo.get()).firstSheet).toEqual({ 'reentry:2026-11-24': { shownOn: '2026-11-27', snoozes: 2 } });
  });

  it('een kapotte regel of waarde valt weg en telt mee', async () => {
    const envelope = await buildBackupEnvelope();
    const backup = normalizeBackupToCurrentModel({ ...envelope, payload: { ...envelope.payload, settings: { firstSheet: { ...MAP, kapot: { shownOn: 'ooit', snoozes: 1 } }, firstAdviceSheet: 'ja' } } });
    expect(backup.settings.firstSheet).toEqual(MAP);
    expect(backup.settings).not.toHaveProperty('firstAdviceSheet');
    expect(backup.skippedInvalid).toBe(2);
  });
});

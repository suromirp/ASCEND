// Feestdagen en de back-up (docs/beslissingen/2026-11-26-feestdagen-als-voorstel.md): de twee instellingen gaan mee,
// een oude back-up zonder ze importeert zoals eerst (het advies: aan, Nederland), een kapotte waarde valt weg en
// telt, en de opgehaalde feestdagen staan nooit in het bestand. Alles nagemaakt.
import { beforeEach, describe, expect, it } from 'vitest';
import { MetaRepo, SettingsRepo, wipeAllData } from './database';
import { buildBackupEnvelope } from './backupExport';
import { normalizeBackupToCurrentModel } from './backupNormalize';
import { buildImportPreview } from './backupPreview';
import { applyImportPlan, createImportPlan, createPreImportSnapshot } from './backupApply';
import { defaultActionsForMode, defaultPlanPolicyForMode } from './backupMerge';
import { cleanSettings } from './backupClean';
import { HOLIDAYS_KEY } from './publicHolidays';
import { resolveHolidayCountry, resolveHolidayOffers } from '../engine/publicHolidays';

type Bestand = { createdAt?: unknown; schemaVersion?: number; payload: { settings: Record<string, unknown> } };

async function restore(bestand: unknown) {
  const backup = normalizeBackupToCurrentModel(structuredClone(bestand));
  const actions = defaultActionsForMode('full_restore');
  const policy = defaultPlanPolicyForMode('full_restore');
  const preview = await buildImportPreview(backup, actions, policy);
  const snapshot = await createPreImportSnapshot();
  await applyImportPlan(backup, createImportPlan(backup, 'full_restore', actions, policy, preview.diffByCategory.flatMap((d) => d.conflicts), snapshot.id));
}

async function envelope(): Promise<Bestand> {
  const e = JSON.parse(JSON.stringify(await buildBackupEnvelope())) as Bestand;
  e.createdAt = new Date(Date.now() + 60_000).toISOString();
  return e;
}

beforeEach(async () => {
  await wipeAllData();
});

describe('feestdagen in de back-up', () => {
  it('een oude back-up zonder de instellingen importeert: het advies, en een ontbrekend veld raakt het toestel niet', async () => {
    const old = await envelope();
    delete old.payload.settings.publicHolidayOffers;
    delete old.payload.settings.publicHolidayCountry;
    await restore(old);
    const s = await SettingsRepo.get();
    expect(resolveHolidayOffers(s.publicHolidayOffers)).toBe(true);
    expect(resolveHolidayCountry(s.publicHolidayCountry)).toBe('NL');
    // Een ontbrekend veld betekent niet aanraken (werkbriefje koppelingen-en-data).
    await SettingsRepo.set({ publicHolidayOffers: false, publicHolidayCountry: 'BE' });
    await restore({ ...old, createdAt: new Date(Date.now() + 120_000).toISOString() });
    expect(await SettingsRepo.get()).toMatchObject({ publicHolidayOffers: false, publicHolidayCountry: 'BE' });
  });

  it('de keuzes gaan mee en komen terug', async () => {
    await SettingsRepo.set({ publicHolidayOffers: false, publicHolidayCountry: 'BE' });
    const file = await envelope();
    expect(file.payload.settings).toMatchObject({ publicHolidayOffers: false, publicHolidayCountry: 'BE' });
    await wipeAllData();
    await restore(file);
    expect(await SettingsRepo.get()).toMatchObject({ publicHolidayOffers: false, publicHolidayCountry: 'BE' });
  });

  it('een kapotte waarde valt weg en telt', () => {
    const skipped = { n: 0 };
    const s = cleanSettings({ publicHolidayOffers: 'ja', publicHolidayCountry: 'XX' }, skipped);
    expect(s).not.toHaveProperty('publicHolidayOffers');
    expect(s).not.toHaveProperty('publicHolidayCountry');
    expect(skipped.n).toBe(2);
    const fine = cleanSettings({ publicHolidayOffers: true, publicHolidayCountry: 'DE' }, { n: 0 });
    expect(fine).toMatchObject({ publicHolidayOffers: true, publicHolidayCountry: 'DE' });
  });

  it('de opgehaalde feestdagen staan niet in het bestand', async () => {
    await MetaRepo.set(HOLIDAYS_KEY, { years: [{ country: 'NL', year: 2027, fetchedAt: '2027-01-02T08:00:00.000Z', holidays: [{ date: '2027-04-27', name: 'Koningsdag', country: 'NL', source: 'nager-date' }] }] });
    expect(JSON.stringify(await buildBackupEnvelope())).not.toContain('Koningsdag');
  });
});

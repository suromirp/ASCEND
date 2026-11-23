// Een voorstel na een zware sport (I-23 punt 10): de lijst `sportRestOffers` in de opslag, in de back-up en in twee
// tabbladen tegelijk. Nagemaakte data.
import { describe, it, expect, beforeEach } from 'vitest';
import { SettingsRepo, wipeAllData } from './database';
import { buildBackupEnvelope } from './backupExport';
import { normalizeBackupToCurrentModel } from './backupNormalize';
import { buildImportPreview } from './backupPreview';
import { createImportPlan, createPreImportSnapshot, applyImportPlan } from './backupApply';
import { defaultActionsForMode, defaultPlanPolicyForMode } from './backupMerge';
import { migrateSportRestKeep, migrateSportRestOffers } from './migrations';
import { appendSportRestOffers } from './sportRestOffers';
import { answerRow, lastRows, sportRestOfferId, type SportRestOffer } from '../engine/sportRestOffer';

const TODAY = '2026-11-28';
const ID = sportRestOfferId('padel1', 'legs');
const OTHER = sportRestOfferId('voetbal1', 'legs2');
const shown = (id: string, date: string): SportRestOffer => ({ id, state: 'shown', date, at: `${date}T21:00:00Z`, sport: 'padel', sessionDate: '2026-11-27' });

async function importEnvelope(payload: unknown) {
  const backup = normalizeBackupToCurrentModel(payload);
  const sel = defaultActionsForMode('full_restore');
  const pol = defaultPlanPolicyForMode('full_restore');
  const preview = await buildImportPreview(backup, sel, pol);
  const snapshot = await createPreImportSnapshot();
  await applyImportPlan(backup, createImportPlan(backup, 'full_restore', sel, pol, preview.diffByCategory.flatMap((d) => d.conflicts), snapshot.id));
}

describe('sportRestOffers in de opslag', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  it('alleen toevoegen: de eerste regel blijft staan, de laatste geldt', async () => {
    await appendSportRestOffers([shown(ID, '2026-11-26')], TODAY);
    await appendSportRestOffers([answerRow(ID, 'declined', '2026-11-27', '2026-11-27T07:00:00Z')], TODAY);
    const list = (await SettingsRepo.get()).sportRestOffers!;
    expect(list.map((r) => r.state)).toEqual(['shown', 'declined']);
    expect(list[0]).toEqual(shown(ID, '2026-11-26'));
    expect(lastRows(list).get(ID)?.state).toBe('declined');
  });

  it('ouder dan 30 dagen valt bij het lezen weg en gaat niet mee terug', async () => {
    await SettingsRepo.set({ sportRestOffers: [shown(OTHER, '2026-10-20')] });
    await appendSportRestOffers([shown(ID, '2026-11-26')], TODAY);
    expect((await SettingsRepo.get()).sportRestOffers!.map((r) => r.id)).toEqual([ID]);
  });

  it('twee tabbladen tegelijk: elk schrijft vanaf wat er staat, en dezelfde regel staat er één keer', async () => {
    await Promise.all([
      appendSportRestOffers([shown(ID, '2026-11-26')], TODAY),
      appendSportRestOffers([shown(OTHER, '2026-11-26')], TODAY),
      appendSportRestOffers([shown(ID, '2026-11-26')], TODAY),
    ]);
    const list = (await SettingsRepo.get()).sportRestOffers!;
    expect(list.map((r) => r.id).sort()).toEqual([ID, OTHER].sort());
    await Promise.all([
      appendSportRestOffers([answerRow(ID, 'accepted', TODAY, `${TODAY}T08:00:00Z`)], TODAY),
      appendSportRestOffers([answerRow(OTHER, 'lapsed', TODAY, `${TODAY}T08:00:01Z`)], TODAY),
    ]);
    const after = lastRows((await SettingsRepo.get()).sportRestOffers!);
    expect(after.get(ID)?.state).toBe('accepted');
    expect(after.get(OTHER)?.state).toBe('lapsed');
  });
});

describe('sportRestOffers in de back-up', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  it('gaat mee in de export en komt terug op een leeg toestel, met de instelling', async () => {
    const list = [shown(ID, '2026-11-26'), answerRow(ID, 'declined', '2026-11-27', '2026-11-27T07:00:00Z')];
    await SettingsRepo.set({ sportRestOffers: list, sportRestKeep: 'vanzelf' });
    const envelope = await buildBackupEnvelope();
    expect(envelope.payload.settings.sportRestOffers).toEqual(list);
    await wipeAllData();
    await importEnvelope(envelope);
    const restored = await SettingsRepo.get();
    expect(restored.sportRestOffers).toEqual(list);
    expect(restored.sportRestKeep).toBe('vanzelf');
  });

  it('een oude back-up zonder de lijst importeert zoals eerst en laat de lijst op het toestel staan', async () => {
    const envelope = await buildBackupEnvelope();
    expect(envelope.payload.settings.sportRestOffers).toBeUndefined();
    const backup = normalizeBackupToCurrentModel(envelope);
    expect(backup.skippedInvalid).toBe(0);
    const kept = [shown(ID, '2026-11-26')];
    await SettingsRepo.set({ sportRestOffers: kept });
    await importEnvelope(envelope);
    expect((await SettingsRepo.get()).sportRestOffers).toEqual(kept);
  });

  it('terugzetten voegt alleen nieuwe regels toe, wat op het toestel staat blijft', async () => {
    await SettingsRepo.set({ sportRestOffers: [shown(ID, '2026-11-26'), answerRow(ID, 'declined', '2026-11-26', '2026-11-26T22:00:00Z'), shown(OTHER, '2026-11-26')] });
    const envelope = await buildBackupEnvelope();
    await SettingsRepo.set({ sportRestOffers: [shown(ID, '2026-11-26'), answerRow(ID, 'accepted', '2026-11-27', '2026-11-27T07:00:00Z')] });
    await importEnvelope(envelope);
    const list = (await SettingsRepo.get()).sportRestOffers!;
    expect(list.filter((r) => r.id === ID).map((r) => r.state)).toEqual(['shown', 'declined', 'accepted']);
    expect(lastRows(list).get(ID)?.state).toBe('accepted');
    expect(list.some((r) => r.id === OTHER)).toBe(true);
  });

  it('een kapotte regel of waarde valt weg en telt mee', async () => {
    expect(migrateSportRestOffers([shown(ID, '2026-11-26'), { id: 'iets' }]).list).toEqual([shown(ID, '2026-11-26')]);
    expect(migrateSportRestKeep('soms')).toEqual({ value: undefined, skipped: 1 });
    const envelope = await buildBackupEnvelope();
    const backup = normalizeBackupToCurrentModel({ ...envelope, payload: { ...envelope.payload, settings: { sportRestOffers: [shown(ID, '2026-11-26'), { id: 'iets' }], sportRestKeep: 'soms' } } });
    expect(backup.settings.sportRestOffers).toEqual([shown(ID, '2026-11-26')]);
    expect(backup.settings).not.toHaveProperty('sportRestKeep');
    expect(backup.skippedInvalid).toBe(2);
  });
});

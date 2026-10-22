import { describe, it, expect, beforeEach } from 'vitest';
import { SettingsRepo, wipeAllData } from './database';
import { buildBackupEnvelope, normalizeBackupToCurrentModel, buildImportPreview, createImportPlan, createPreImportSnapshot, applyImportPlan, defaultActionsForMode, defaultPlanPolicyForMode, parseBackupText } from './backup';
import type { JourneyState } from '../engine/journey';
import type { PackListState } from '../engine/packList';
import { DEFAULT_PACK_ITEMS } from '../data/packList';

// The reisplanner (ticked tasks) and the packing list live in the settings,
// as optional additive fields: they travel in every export, an old backup
// without them still imports, and a restore never un-ticks what this device
// has ticked.

async function importEnvelope(payload: unknown, mode: 'full_restore' | 'merge' = 'full_restore') {
  const backup = normalizeBackupToCurrentModel(payload);
  const categorySelections = { ...defaultActionsForMode(mode), app_settings: 'replace' as const };
  const planPolicy = defaultPlanPolicyForMode(mode);
  const preview = await buildImportPreview(backup, categorySelections, planPolicy);
  const snapshot = await createPreImportSnapshot();
  const plan = createImportPlan(backup, mode, categorySelections, planPolicy, preview.diffByCategory.flatMap((d) => d.conflicts), snapshot.id);
  await applyImportPlan(backup, plan);
}

const journey: JourneyState = { v: 1, done: { 'grote-drie-kiezen': '2026-11-03', verzekering: '2026-11-10' }, week: { weekStart: '2026-11-09', taskId: 'verzekering' } };
const packList: PackListState = {
  v: 1,
  items: [
    { id: 'tent', group: 'slapen', name: 'Mijn tent', grams: 1240, have: true },
    { id: 'pack_x1', group: 'overig', name: 'Boek', grams: 210, have: false },
  ],
};

describe('journey and packing list in settings', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  it('are stored with the settings and read back as they were', async () => {
    expect((await SettingsRepo.get()).journey).toBeUndefined();
    expect((await SettingsRepo.get()).packList).toBeUndefined();
    await SettingsRepo.set({ journey, packList });
    const stored = await SettingsRepo.get();
    expect(stored.journey).toEqual(journey);
    expect(stored.packList).toEqual(packList);
    // A later, unrelated settings change keeps them.
    await SettingsRepo.set({ restDayMode: 'active' });
    expect((await SettingsRepo.get()).journey).toEqual(journey);
  });

  it('travel in the export and come back on a clean device', async () => {
    await SettingsRepo.set({ journey, packList });
    const envelope = await buildBackupEnvelope();
    expect(envelope.payload.settings.journey).toEqual(journey);
    expect(envelope.payload.settings.packList).toEqual(packList);

    // Through the JSON file, as a real export is.
    const file = parseBackupText(JSON.stringify(envelope));
    await wipeAllData();
    expect((await SettingsRepo.get()).journey).toBeUndefined();
    await importEnvelope(file);
    const restored = await SettingsRepo.get();
    expect(restored.journey).toEqual(journey);
    expect(restored.packList).toEqual(packList);
  });

  it('an old backup without them still imports and leaves what the device has', async () => {
    const oldEnvelope = await buildBackupEnvelope();
    expect(oldEnvelope.payload.settings.journey).toBeUndefined();
    await SettingsRepo.set({ journey, packList });
    await importEnvelope(oldEnvelope);
    const after = await SettingsRepo.get();
    expect(after.journey).toEqual(journey);
    expect(after.packList).toEqual(packList);
  });

  it('a restore never un-ticks a task this device has ticked', async () => {
    await SettingsRepo.set({ journey: { v: 1, done: { a: '2026-11-01', b: '2026-11-02' } } });
    const envelope = await buildBackupEnvelope();
    await SettingsRepo.set({ journey: { v: 1, done: { a: '2026-11-05', c: '2026-11-20' } } });
    await importEnvelope(envelope);
    expect((await SettingsRepo.get()).journey?.done).toEqual({ a: '2026-11-05', b: '2026-11-02', c: '2026-11-20' });
  });

  it('drops damaged data instead of storing it, and counts it', async () => {
    const envelope = await buildBackupEnvelope();
    const broken = {
      ...envelope,
      payload: {
        ...envelope.payload,
        settings: {
          journey: { v: 1, done: { a: '2026-11-01', b: 'morgen' }, week: 'oops' },
          packList: { v: 1, items: [{ id: 't', group: 'slapen', name: 'Tent', grams: 1100 }, { id: 'u', name: 'Zonder gewicht' }] },
        },
      },
    };
    const backup = normalizeBackupToCurrentModel(broken);
    expect(backup.settings.journey).toEqual({ v: 1, done: { a: '2026-11-01' } });
    expect(backup.settings.packList?.items.map((i) => i.id)).toEqual(['t']);
    expect(backup.skippedInvalid).toBe(3);

    const unreadable = normalizeBackupToCurrentModel({ ...envelope, payload: { ...envelope.payload, settings: { journey: 'oops', packList: { items: 4 } } } });
    expect(unreadable.settings.journey).toBeUndefined();
    expect(unreadable.settings.packList).toBeUndefined();
    expect(unreadable.skippedInvalid).toBe(2);
  });

  it('an emptied packing list stays empty after a round trip, and the example is not stored', async () => {
    await SettingsRepo.set({ packList: { v: 1, items: [] } });
    const envelope = await buildBackupEnvelope();
    await wipeAllData();
    await importEnvelope(envelope);
    expect((await SettingsRepo.get()).packList).toEqual({ v: 1, items: [] });

    // Never customised: nothing is stored, the example is read from the data.
    await wipeAllData();
    const clean = await buildBackupEnvelope();
    expect(clean.payload.settings.packList).toBeUndefined();
    expect(DEFAULT_PACK_ITEMS.length).toBeGreaterThan(0);
  });
});

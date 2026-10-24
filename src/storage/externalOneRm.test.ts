import { beforeEach, describe, expect, it } from 'vitest';
import { SettingsRepo, wipeAllData } from './database';
import { applyImportPlan, buildBackupEnvelope, buildImportPreview, createImportPlan, createPreImportSnapshot, defaultActionsForMode, defaultPlanPolicyForMode, normalizeBackupToCurrentModel } from './backup';
import { CURRENT_BACKUP_SCHEMA_VERSION } from './backupTypes';
import { migrateExternalOneRm } from './migrations';
import type { ExternalOneRm } from '../models/metrics';

// Made-up readings only. The 1RM from the MacroFactor export lives in the settings
// (settings.externalOneRm), optional and additive: it travels in a backup, an older
// backup without it imports as before, and a damaged one loses only what is damaged
// (docs/beslissingen/2026-10-24-1rm-uit-macrofactor.md).

const squat = (rows: [string, number][]): ExternalOneRm => ({ exerciseName: 'Back Squat', source: 'macrofactor', points: rows.map(([date, kg]) => ({ date, kg })) });

describe('migrateExternalOneRm', () => {
  it('laat een reeks zoals hij is gebouwd ongemoeid', () => {
    const series = [squat([['2026-10-05', 100], ['2026-10-12', 102.5]])];
    expect(migrateExternalOneRm(series)).toEqual({ series, skipped: 0 });
  });

  it('geen veld is onbekend, niet leeg: er komt niets uit', () => {
    expect(migrateExternalOneRm(undefined)).toEqual({ series: undefined, skipped: 0 });
    expect(migrateExternalOneRm(null)).toEqual({ series: undefined, skipped: 0 });
  });

  it('geen lijst is een beschadigd veld', () => {
    expect(migrateExternalOneRm('veel')).toEqual({ series: undefined, skipped: 1 });
    expect(migrateExternalOneRm({ a: 1 })).toEqual({ series: undefined, skipped: 1 });
  });

  it('laat een meting zonder echte datum of met een onmogelijk gewicht weg en telt hem', () => {
    const raw = [
      {
        exerciseName: 'Back Squat',
        source: 'macrofactor',
        points: [
          { date: '2026-10-12', kg: 102.5 },
          { date: '12 oktober', kg: 100 },
          { date: '2026-10-13', kg: -3 },
          { date: '2026-10-14', kg: 5000 },
          { date: '2026-10-15', kg: 'veel' },
          null,
          { date: '2026-10-05', kg: 100 },
        ],
      },
    ];
    const { series, skipped } = migrateExternalOneRm(raw);
    expect(skipped).toBe(5);
    expect(series).toEqual([squat([['2026-10-05', 100], ['2026-10-12', 102.5]])]);
  });

  it('laat een reeks zonder naam, bron of meting weg en telt hem, en houdt de rest', () => {
    const raw = [
      { exerciseName: '', source: 'macrofactor', points: [{ date: '2026-10-05', kg: 100 }] },
      { exerciseName: 'Back Squat', source: 'onbekend', points: [{ date: '2026-10-05', kg: 100 }] },
      { exerciseName: 'Back Squat', source: 'macrofactor' },
      { exerciseName: 'Leeg', source: 'macrofactor', points: [] },
      'rommel',
      { exerciseName: ' Hanging Leg Raise ', source: 'macrofactor', points: [{ date: '2026-10-12', kg: 40 }, { date: '2026-10-12', kg: 41 }], onzin: true },
    ];
    const { series, skipped } = migrateExternalOneRm(raw);
    expect(skipped).toBe(5);
    expect(series).toEqual([{ exerciseName: 'Hanging Leg Raise', source: 'macrofactor', points: [{ date: '2026-10-12', kg: 41 }] }]);
    expect(JSON.stringify(series)).not.toContain('onzin');
  });
});

describe('de 1RM uit MacroFactor en de back-up', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  async function importEnvelope(payload: unknown) {
    const backup = normalizeBackupToCurrentModel(payload);
    const categorySelections = defaultActionsForMode('full_restore');
    const planPolicy = defaultPlanPolicyForMode('full_restore');
    const preview = await buildImportPreview(backup, categorySelections, planPolicy);
    const snapshot = await createPreImportSnapshot();
    const plan = createImportPlan(backup, 'full_restore', categorySelections, planPolicy, preview.diffByCategory.flatMap((d) => d.conflicts), snapshot.id);
    await applyImportPlan(backup, plan);
  }

  it('reist mee in de export, in de instellingen, zonder dat het schemanummer verandert', async () => {
    const mine = [squat([['2026-10-05', 100], ['2026-10-12', 102.5]])];
    await SettingsRepo.set({ externalOneRm: mine });
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    expect(envelope.backupSchemaVersion).toBe(CURRENT_BACKUP_SCHEMA_VERSION);
    expect(envelope.payload.settings.externalOneRm).toEqual(mine);
    expect(normalizeBackupToCurrentModel(envelope).settings?.externalOneRm).toEqual(mine);
  });

  it('een oudere back-up zonder het veld importeert zoals eerst en laat de metingen op het apparaat staan', async () => {
    const mine = [squat([['2026-10-05', 100]])];
    await SettingsRepo.set({ externalOneRm: mine });
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    delete envelope.payload.settings.externalOneRm;
    expect(normalizeBackupToCurrentModel(envelope).settings?.externalOneRm).toBeUndefined();
    await importEnvelope(envelope);
    expect((await SettingsRepo.get()).externalOneRm).toEqual(mine);
  });

  it('een beschadigd veld wordt weggelaten en geteld, niet bewaard', async () => {
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    envelope.payload.settings = { ...envelope.payload.settings, externalOneRm: 'veel' };
    const damaged = normalizeBackupToCurrentModel(envelope);
    expect(damaged.settings?.externalOneRm).toBeUndefined();
    expect(damaged.skippedInvalid).toBeGreaterThan(0);

    envelope.payload.settings = { ...envelope.payload.settings, externalOneRm: [squat([['2026-10-05', 100]]), { exerciseName: 'Kapot' }] };
    const partly = normalizeBackupToCurrentModel(envelope);
    expect(partly.settings?.externalOneRm).toEqual([squat([['2026-10-05', 100]])]);
    expect(partly.skippedInvalid).toBe(1);
  });

  it('terugzetten voegt toe en laat geen dag vallen die het apparaat heeft en de back-up mist', async () => {
    await SettingsRepo.set({ externalOneRm: [squat([['2026-10-05', 100]])] });
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    await SettingsRepo.set({ externalOneRm: [squat([['2026-10-05', 99], ['2026-10-12', 102.5]])] });
    await importEnvelope(envelope);
    // Per day the reading of the device wins; the day only the device has stays.
    expect((await SettingsRepo.get()).externalOneRm).toEqual([squat([['2026-10-05', 99], ['2026-10-12', 102.5]])]);
  });
});

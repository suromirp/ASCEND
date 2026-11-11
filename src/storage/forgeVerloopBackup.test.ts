import { beforeEach, describe, expect, it } from 'vitest';
import { SessionLogsRepo, SettingsRepo, wipeAllData } from './database';
import { buildBackupEnvelope } from './backupExport';
import { normalizeBackupToCurrentModel } from './backupNormalize';
import { buildImportPreview } from './backupPreview';
import { applyImportPlan, createImportPlan, createPreImportSnapshot } from './backupApply';
import { defaultActionsForMode } from './backupMerge';
import { migrateLogSetRow } from './migrations';
import { toStrengthData, type WorkoutExercise } from '../engine/forgeWorkout';
import type { SessionLog, SetLog } from '../models/training';

// Het verloop van de training (docs/beslissingen/2026-11-11-forge-verloop.md): het rij-id op een gelogde set
// en de instelling Verloop toont. Nagemaakte logs.
const log = (id: string, sets: unknown[], kept?: unknown[]): SessionLog => ({
  id, templateId: 'tpl_legs_a', type: 'strength', completedDate: '2026-11-02', completedAt: '2026-11-02T18:00:00.000Z',
  variant: 'full', durationMinutes: 50, source: 'manual',
  strengthData: [{ exerciseId: 'leg-press', exerciseName: 'Pin-Loaded Leg Press', sets: sets as SetLog[] }],
  ...(kept ? { manualMeasured: { at: '2026-11-02T19:00:00.000Z', strength: { strengthData: [{ exerciseId: 'leg-press', exerciseName: 'Pin-Loaded Leg Press', sets: kept as SetLog[] }] } } } as Partial<SessionLog> : {}),
});

async function restore(payload: unknown) {
  const backup = normalizeBackupToCurrentModel(payload);
  const selections = defaultActionsForMode('full_restore');
  const preview = await buildImportPreview(backup, selections, 'restore_backup_plan');
  const snapshot = await createPreImportSnapshot();
  const plan = createImportPlan(backup, 'full_restore', selections, 'restore_backup_plan', preview.diffByCategory.flatMap((d) => d.conflicts), snapshot.id);
  await applyImportPlan(backup, plan);
}

describe('SetLog.rowId', () => {
  it('Afronden schrijft het rij-id van elke gedane set in het log', () => {
    const ex: WorkoutExercise = { slot: 'lp', exerciseId: 'leg-press', name: 'Pin-Loaded Leg Press', known: true, restSec: 120, timed: false, rows: [
      { id: 'lp:s1', kind: 'work', target: { repsLow: 8, repsHigh: 10 }, weightKg: 80, reps: 10, done: false },
      { id: 'lp:s2', kind: 'work', target: { repsLow: 8, repsHigh: 10 }, weightKg: 85, reps: 8, rir: 1, done: true },
    ] };
    expect(toStrengthData([ex])![0].sets.map((s) => s.rowId)).toEqual(['lp:s2']);
  });

  it('een oud log zonder rij-id en een goed log blijven precies staan', () => {
    const old = log('a', [{ reps: 8, weightKg: 80 }]);
    expect(migrateLogSetRow(old)).toBe(old);
    const good = log('b', [{ reps: 8, weightKg: 80, rowId: 'lp:s1' }]);
    expect(migrateLogSetRow(good)).toBe(good);
  });

  it('een kapot rij-id valt weg, ook in de bewaarde sets; de set blijft', () => {
    const next = migrateLogSetRow(log('c', [{ reps: 8, rowId: 7 }, { reps: 6, rowId: '' }, { reps: 5, rowId: 'x'.repeat(81) }], [{ reps: 8, rowId: null }]));
    expect(next.strengthData![0].sets).toEqual([{ reps: 8 }, { reps: 6 }, { reps: 5 }]);
    expect(next.manualMeasured!.strength!.strengthData![0].sets).toEqual([{ reps: 8 }]);
  });
});

describe('export en import', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  it('het rij-id gaat heen en terug; een oude back-up zonder rij-id leest gelijk', async () => {
    const withRow = [{ reps: 8, weightKg: 85, kind: 'work' as const, rowId: 'lp:s2' }];
    const without = [{ reps: 10, weightKg: 80, kind: 'work' as const }];
    await SessionLogsRepo.put(log('nieuw', withRow));
    await SessionLogsRepo.put(log('oud', without));
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    await wipeAllData();
    await restore(envelope);
    const all = await SessionLogsRepo.getAll();
    expect(all.find((l) => l.id === 'nieuw')!.strengthData![0].sets).toEqual(withRow);
    expect(all.find((l) => l.id === 'oud')!.strengthData![0].sets).toEqual(without);
  });

  it('Verloop toont reist mee; een rare waarde valt weg, een oude back-up zonder veld blijft zonder', async () => {
    await SettingsRepo.set({ forgeLogView: 'alle' });
    const good = normalizeBackupToCurrentModel(JSON.parse(JSON.stringify(await buildBackupEnvelope())));
    expect(good.settings?.forgeLogView).toBe('alle');
    const bad = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    bad.payload.settings.forgeLogView = 'soms';
    expect(normalizeBackupToCurrentModel(bad).settings?.forgeLogView).toBeUndefined();
    const old = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    delete old.payload.settings.forgeLogView;
    expect(normalizeBackupToCurrentModel(old).settings?.forgeLogView).toBeUndefined();
  });
});

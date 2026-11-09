import { beforeEach, describe, expect, it } from 'vitest';
import { SessionLogsRepo, wipeAllData } from './database';
import { buildBackupEnvelope } from './backupExport';
import { normalizeBackupToCurrentModel } from './backupNormalize';
import { buildImportPreview } from './backupPreview';
import { applyImportPlan, createImportPlan, createPreImportSnapshot } from './backupApply';
import { defaultActionsForMode } from './backupMerge';
import { migrateLogSetSkill } from './migrations';
import type { SessionLog, SetLog } from '../models/training';

// Calisthenics op de set: seconds, band en clean (docs/beslissingen/2026-11-09-calisthenics-ontwerp.md).
// Nagemaakte logs.
const log = (id: string, sets: unknown[], kept?: unknown[]): SessionLog => ({
  id, templateId: 'tpl_upper_a', type: 'strength', completedDate: '2026-11-02', completedAt: '2026-11-02T18:00:00.000Z',
  variant: 'full', durationMinutes: 45, source: 'manual',
  strengthData: [{ exerciseId: 'dead-hang', exerciseName: 'Dead Hang', sets: sets as SetLog[] }],
  ...(kept ? { manualMeasured: { at: '2026-11-02T19:00:00.000Z', strength: { strengthData: [{ exerciseId: 'dead-hang', exerciseName: 'Dead Hang', sets: kept as SetLog[] }] } } } as Partial<SessionLog> : {}),
});

describe('migrateLogSetSkill', () => {
  it('laat een oud log zonder de velden en een goed log precies staan', () => {
    const old = log('a', [{ reps: 8, weightKg: 0 }, { reps: 6, rir: 2 }]);
    expect(migrateLogSetSkill(old)).toBe(old);
    const good = log('b', [{ reps: 1, seconds: 30, clean: true }, { reps: 8, band: 'middel', clean: false }]);
    expect(migrateLogSetSkill(good)).toBe(good);
  });

  it('laat een kapotte waarde vallen en houdt de rest van de set', () => {
    const bad = migrateLogSetSkill(log('c', [
      { reps: 1, seconds: -5, clean: true },
      { reps: 1, seconds: Number.NaN },
      { reps: 1, seconds: '30' },
      { reps: 8, band: 'paars', clean: 'ja' },
      { reps: 8, band: 'zwaar', seconds: 0 },
      { reps: 1, seconds: Number.POSITIVE_INFINITY, band: null },
    ]));
    expect(bad.strengthData![0].sets).toEqual([
      { reps: 1, clean: true },
      { reps: 1 },
      { reps: 1 },
      { reps: 8 },
      { reps: 8, band: 'zwaar' },
      { reps: 1 },
    ]);
  });

  it('maakt ook de bewaarde sets schoon (manualMeasured.strength)', () => {
    const next = migrateLogSetSkill(log('d', [{ reps: 1, seconds: 20 }], [{ reps: 1, seconds: -1 }]));
    expect(next.strengthData![0].sets).toEqual([{ reps: 1, seconds: 20 }]);
    expect(next.manualMeasured!.strength!.strengthData![0].sets).toEqual([{ reps: 1 }]);
  });
});

describe('export en import met de nieuwe velden', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  async function restore(payload: unknown) {
    const backup = normalizeBackupToCurrentModel(payload);
    const selections = defaultActionsForMode('full_restore');
    const preview = await buildImportPreview(backup, selections, 'restore_backup_plan');
    const snapshot = await createPreImportSnapshot();
    const plan = createImportPlan(backup, 'full_restore', selections, 'restore_backup_plan', preview.diffByCategory.flatMap((d) => d.conflicts), snapshot.id);
    await applyImportPlan(backup, plan);
  }

  it('een oude back-up zonder de velden leest gelijk', async () => {
    const sets = [{ reps: 8, weightKg: 10 }, { reps: 6, rir: 1, kind: 'work' as const }];
    await SessionLogsRepo.put(log('oud', sets));
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    await wipeAllData();
    await restore(envelope);
    expect((await SessionLogsRepo.getAll())[0].strengthData![0].sets).toEqual(sets);
  });

  it('seconds, band en clean gaan heen en terug; een kapotte waarde valt weg bij het lezen', async () => {
    const sets = [{ reps: 1, seconds: 32, clean: true }, { reps: 6, band: 'licht' as const, clean: false }];
    await SessionLogsRepo.put(log('nieuw', sets));
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    expect(envelope.payload.sessionLogs[0].strengthData[0].sets).toEqual(sets);
    envelope.payload.sessionLogs[0].strengthData[0].sets.push({ reps: 1, seconds: -3, band: 'roze' });
    await wipeAllData();
    await restore(envelope);
    expect((await SessionLogsRepo.getAll())[0].strengthData![0].sets).toEqual([...sets, { reps: 1 }]);
  });
});

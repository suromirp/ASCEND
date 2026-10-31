import { beforeEach, describe, expect, it } from 'vitest';
import { RecoveryMetricsRepo, SettingsRepo, wipeAllData } from './database';
import { setWatchUse } from './externalActivities';
import { applyImportPlan, buildBackupEnvelope, buildImportPreview, createImportPlan, createPreImportSnapshot, defaultActionsForMode, defaultPlanPolicyForMode, listSnapshots, normalizeBackupToCurrentModel } from './backup';
import { migrateMornings } from './migrations';
import type { RecoveryMetric } from '../models/metrics';

// Nagemaakte ochtenden, geen echte persoon. De ochtendgetallen gaan mee in de back-up
// (docs/beslissingen/2026-10-31-kansen-stap-0.md) en een oude back-up importeert zoals hij was.

const morning = (date: string, extra: Partial<RecoveryMetric> = {}): RecoveryMetric => ({ id: `intervals.icu:${date}`, date, source: 'import', restingHeartRate: 50, hrv: 60, sleepMinutes: 440, sleepScore: 82, ...extra });

async function importEnvelope(payload: unknown) {
  const backup = normalizeBackupToCurrentModel(payload);
  const selections = { ...defaultActionsForMode('full_restore'), app_settings: 'replace' as const };
  const policy = defaultPlanPolicyForMode('full_restore');
  const preview = await buildImportPreview(backup, selections, policy);
  const snapshot = await createPreImportSnapshot();
  const plan = createImportPlan(backup, 'full_restore', selections, policy, preview.diffByCategory.flatMap((d) => d.conflicts), snapshot.id);
  await applyImportPlan(backup, plan);
}

beforeEach(async () => {
  await wipeAllData();
  await RecoveryMetricsRepo.putAll([morning('2026-10-20', { bodyBattery: 55, stress: 30 }), morning('2026-10-21')]);
});

describe('ochtendgetallen in de back-up', () => {
  it('gaan standaard mee, alleen met de vier getallen en de datum', async () => {
    const envelope = await buildBackupEnvelope();
    const mornings = (envelope.payload as { mornings?: RecoveryMetric[] }).mornings!;
    expect(mornings).toHaveLength(2);
    expect(mornings[0]).toEqual({ id: 'intervals.icu:2026-10-20', date: '2026-10-20', source: 'import', restingHeartRate: 50, hrv: 60, sleepMinutes: 440, sleepScore: 82 });
  });

  it('blijven weg als je de instelling uitzet, en in de kopie van voor een import', async () => {
    await SettingsRepo.set({ morningInBackup: false });
    expect((await buildBackupEnvelope()).payload).not.toHaveProperty('mornings');
    await SettingsRepo.set({});
    await createPreImportSnapshot();
    expect((await listSnapshots())[0].envelope.payload).not.toHaveProperty('mornings');
  });

  it('komen terug op een leeg toestel', async () => {
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    await wipeAllData();
    await importEnvelope(envelope);
    const back = (await RecoveryMetricsRepo.getAll()).sort((a, b) => a.date.localeCompare(b.date));
    expect(back.map((m) => m.date)).toEqual(['2026-10-20', '2026-10-21']);
    expect(back[0].bodyBattery).toBeUndefined();
  });

  it('schrijven nooit over een ochtend die het toestel zelf al heeft', async () => {
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    await RecoveryMetricsRepo.putAll([morning('2026-10-21', { restingHeartRate: 47 })]);
    await importEnvelope(envelope);
    expect((await RecoveryMetricsRepo.getAll()).find((m) => m.date === '2026-10-21')!.restingHeartRate).toBe(47);
  });

  it('een back-up van voor de ochtendgetallen importeert zoals hij was', async () => {
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    delete envelope.payload.mornings;
    await wipeAllData();
    const backup = normalizeBackupToCurrentModel(envelope);
    expect(backup.mornings).toBeUndefined();
    expect(backup.skippedInvalid).toBe(0);
    await importEnvelope(envelope);
    expect(await RecoveryMetricsRepo.getAll()).toEqual([]);
  });

  it('een beschadigde ochtend valt weg en telt mee, een getal buiten bereik valt alleen zelf weg', () => {
    const read = migrateMornings([
      { date: '2026-10-22', restingHeartRate: 400, hrv: 55, source: 'onbekend' },
      { date: 'gisteren', hrv: 50 },
      { date: '2026-10-23' },
      'rommel',
    ]);
    expect(read.skipped).toBe(3);
    expect(read.list).toEqual([{ id: 'import:2026-10-22', date: '2026-10-22', source: 'import', hrv: 55 }]);
    expect(migrateMornings(undefined)).toEqual({ list: undefined, skipped: 0 });
    expect(migrateMornings('lijst')).toEqual({ list: undefined, skipped: 1 });
  });

  it('een ochtend zonder id krijgt een id uit zijn eigen bron', () => {
    const read = migrateMornings([
      { date: '2026-10-22', restingHeartRate: 48, source: 'manual' },
      { date: '2026-10-23', hrv: 58, source: 'health-connect' },
      { id: 'intervals.icu:2026-10-24', date: '2026-10-24', hrv: 61, source: 'import' },
    ]);
    expect(read.list!.map((m) => m.id)).toEqual(['manual:2026-10-22', 'health-connect:2026-10-23', 'intervals.icu:2026-10-24']);
  });

  it('volgen bij terugzetten wat je van je horloge gebruikt: slaap uit komt niet terug', async () => {
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    await wipeAllData();
    await setWatchUse({ sleep: false });
    await importEnvelope(envelope);
    const back = (await RecoveryMetricsRepo.getAll()).sort((a, b) => a.date.localeCompare(b.date));
    expect(back.map((m) => m.date)).toEqual(['2026-10-20', '2026-10-21']);
    expect(back.every((m) => m.sleepMinutes === undefined && m.sleepScore === undefined)).toBe(true);
    expect(back[0].restingHeartRate).toBe(50);
  });

  it('een ochtend met alleen slaap komt met slaap uit helemaal niet terug', async () => {
    await wipeAllData();
    await RecoveryMetricsRepo.putAll([{ id: 'intervals.icu:2026-10-22', date: '2026-10-22', source: 'import', sleepMinutes: 400 }]);
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    await wipeAllData();
    await setWatchUse({ sleep: false });
    await importEnvelope(envelope);
    expect(await RecoveryMetricsRepo.getAll()).toEqual([]);
  });

  it('een verkeerde waarde voor de schakelaar valt weg bij het importeren', () => {
    const backup = normalizeBackupToCurrentModel({ backupSchemaVersion: 5, createdAt: '2026-10-31T08:00:00.000Z', payload: { version: 5, settings: { morningInBackup: 'ja' } } });
    expect(backup.settings).not.toHaveProperty('morningInBackup');
  });
});

// I-93 (docs/beslissingen/2026-11-20-backup-kopie-en-toekomst.md): een kopie van voor een import zet Laatste
// back-up nooit terug in de tijd, en een Laatste back-up in de toekomst wordt nu. Alle gegevens zijn nagemaakt.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BackupSnapshotsRepo, InjuryNotesRepo, MetaRepo, SessionLogsRepo, SettingsRepo, wipeAllData } from './database';
import { buildBackupEnvelope } from './backupExport';
import { normalizeBackupToCurrentModel } from './backupNormalize';
import { buildImportPreview } from './backupPreview';
import { applyImportPlan, createImportPlan, createPreImportSnapshot, listSnapshots, restoreSnapshot } from './backupApply';
import { defaultActionsForMode, defaultPlanPolicyForMode } from './backupMerge';
import { straightenBackupTime } from './backupTime';
import { runBootMigrations } from './bootMigrations';
import { backupMadeSettings, logsNotInLastBackup } from '../engine/backupSince';
import { isAutoBackupDue } from '../engine/autoBackup';
import { backupAge } from '../engine/settingsAttention';
import { addDays, localDateOf } from '../utils/dates';
import type { SessionLog } from '../models/training';
import type { AscendBackupEnvelope } from './backupTypes';

const NOV8 = '2026-11-08T19:00:00.000Z';
const NOV15 = '2026-11-15T19:00:00.000Z';
const FUTURE = '2099-11-20T12:00:00.000Z';

const log = (id: string, completedAt: string): SessionLog => ({
  id, templateId: 'tpl', type: 'cardio', completedDate: completedAt.slice(0, 10), completedAt, variant: 'full', durationMinutes: 40, source: 'manual',
});
const pair = async () => {
  const s = await SettingsRepo.get();
  return { lastExportedAt: s.lastExportedAt, lastBackupLogs: s.lastBackupLogs };
};
const logIds = async () => (await SessionLogsRepo.getAll()).map((l) => l.id).sort();
const unsaved = async () => {
  const [logs, settings] = [await SessionLogsRepo.getAll(), await SettingsRepo.get()];
  return logs.filter((l) => logsNotInLastBackup([l], settings) === 1).map((l) => l.id).sort();
};
// Laatste back-up is niet later dan nu en niet eerder dan `start`.
const expectNow = (at: string | undefined, start: number) => {
  const ms = Date.parse(at ?? '');
  expect(ms).toBeGreaterThanOrEqual(start);
  expect(ms).toBeLessThanOrEqual(Date.now());
};

async function plan(bestand: unknown) {
  const backup = normalizeBackupToCurrentModel(structuredClone(bestand));
  const categorySelections = defaultActionsForMode('full_restore');
  const planPolicy = defaultPlanPolicyForMode('full_restore');
  const preview = await buildImportPreview(backup, categorySelections, planPolicy);
  const snapshot = await createPreImportSnapshot();
  return { backup, snapshot, plan: createImportPlan(backup, 'full_restore', categorySelections, planPolicy, preview.diffByCategory.flatMap((d) => d.conflicts), snapshot.id) };
}

// Een back-up zoals een oudere app hem schreef (schema 5), met alleen Laatste back-up in de instellingen.
const oldBackup = (createdAt: string, logs: SessionLog[], settings: Record<string, unknown> = {}) => ({
  backupSchemaVersion: 5,
  createdAt,
  payload: { version: 5, program: null, templates: [], plannedSessions: [], sessionLogs: logs, trainingGoals: [], goalMilestones: [], goalMilestoneProgress: [], capabilityEvidence: [], injuryNotes: [], settings },
});

beforeEach(async () => {
  await wipeAllData();
});

describe('een kopie van voor een import terugzetten: het nieuwste paar blijft', () => {
  it('een kopie van 8 november na een back-up van 15 november: Laatste back-up blijft 15 november, geen log verandert', async () => {
    await SessionLogsRepo.put(log('a', '2026-11-01T10:00:00.000Z'));
    await SettingsRepo.set(backupMadeSettings(NOV8, ['a']));
    const kopie = await createPreImportSnapshot();
    await SessionLogsRepo.put(log('b', '2026-11-10T10:00:00.000Z'));
    await SettingsRepo.set(backupMadeSettings(NOV15, ['a', 'b']));
    // Een Forge-training met een eerdere dag, pas na de back-up afgerond: die moet blijven meetellen.
    await SessionLogsRepo.put(log('forge', '2026-11-07T18:00:00.000Z'));
    const before = await SessionLogsRepo.getAll();

    await restoreSnapshot(kopie.id);

    expect(await pair()).toEqual({ lastExportedAt: NOV15, lastBackupLogs: { at: NOV15, ids: ['a', 'b'] } });
    expect(await unsaved()).toEqual(['forge']);
    expect(await SessionLogsRepo.getAll()).toEqual(before);
  });

  it('een kopie die nieuwer is dan het toestel: tijdstip en lijst van de kopie komen samen terug', async () => {
    await SessionLogsRepo.put(log('a', '2026-11-01T10:00:00.000Z'));
    await SessionLogsRepo.put(log('b', '2026-11-10T10:00:00.000Z'));
    await SettingsRepo.set(backupMadeSettings(NOV15, ['a', 'b']));
    const kopie = await createPreImportSnapshot();
    // Het toestel loopt daarna achter (een ouder bestand over de instellingen, zoals voor I-68 kon).
    await SettingsRepo.set(backupMadeSettings(NOV8, ['a']));

    await restoreSnapshot(kopie.id);

    expect(await pair()).toEqual({ lastExportedAt: NOV15, lastBackupLogs: { at: NOV15, ids: ['a', 'b'] } });
    expect(await unsaved()).toEqual([]);
  });

  it('even oud: de lijst van het toestel blijft', async () => {
    await SessionLogsRepo.put(log('a', '2026-11-01T10:00:00.000Z'));
    await SettingsRepo.set(backupMadeSettings(NOV15, ['a']));
    const kopie = await createPreImportSnapshot();
    await SettingsRepo.set(backupMadeSettings(NOV15, ['a', 'x']));

    await restoreSnapshot(kopie.id);

    expect(await pair()).toEqual({ lastExportedAt: NOV15, lastBackupLogs: { at: NOV15, ids: ['a', 'x'] } });
  });

  it('een andere instelling uit de kopie komt wel terug: alleen het paar volgt de regel', async () => {
    await SettingsRepo.set({ ...backupMadeSettings(NOV8, []), restDayMode: 'active' });
    const kopie = await createPreImportSnapshot();
    await SettingsRepo.set({ ...backupMadeSettings(NOV15, []), restDayMode: 'rest' });

    await restoreSnapshot(kopie.id);

    const settings = await SettingsRepo.get();
    expect(settings.restDayMode).toBe('active');
    expect(settings.lastExportedAt).toBe(NOV15);
  });

  it('een kopie met een Laatste back-up in de toekomst: hij wordt nu, met zijn lijst', async () => {
    await SessionLogsRepo.put(log('a', '2026-11-01T10:00:00.000Z'));
    await SettingsRepo.set(backupMadeSettings(FUTURE, ['a']));
    const kopie = await createPreImportSnapshot();
    await SettingsRepo.set(backupMadeSettings(NOV8, []));
    const start = Date.now();

    await restoreSnapshot(kopie.id);

    const p = await pair();
    expectNow(p.lastExportedAt, start);
    expect(p.lastBackupLogs).toEqual({ at: p.lastExportedAt, ids: ['a'] });
    expect(await unsaved()).toEqual([]);
  });

  it('een fout halverwege het terugzetten van een kopie: alles of niets, en Ongedaan maken blijft', async () => {
    await InjuryNotesRepo.put({ id: 'n1', date: '2026-11-01', bodyPart: 'Knie', severity: 'licht', note: 'nagemaakt' });
    await SessionLogsRepo.put(log('a', '2026-11-01T10:00:00.000Z'));
    await SettingsRepo.set(backupMadeSettings(NOV15, ['a']));
    const kopie = await createPreImportSnapshot();
    // Het toestel loopt achter op de kopie, zodat een gelukte poging het paar zou veranderen.
    await SettingsRepo.set({ ...backupMadeSettings(NOV8, []), restDayMode: 'active' });
    await SessionLogsRepo.put(log('b', '2026-11-10T10:00:00.000Z'));
    const before = { settings: await SettingsRepo.get(), logs: await SessionLogsRepo.getAll(), notes: await InjuryNotesRepo.getAll() };

    // Dezelfde weg als restoreSnapshot, met een rij die de opslag niet kan schrijven.
    const backup = normalizeBackupToCurrentModel(kopie.envelope);
    const eigen = await createPreImportSnapshot();
    (backup.injuryNotes[0] as unknown as Record<string, unknown>).note = () => 'geen kloon';
    const p = createImportPlan(backup, 'full_restore', defaultActionsForMode('full_restore'), 'restore_backup_plan', [], eigen.id);
    await expect(applyImportPlan(backup, p, { deviceCopy: true })).rejects.toThrow('Er is niets gewijzigd');

    expect(await SettingsRepo.get()).toEqual(before.settings);
    expect(await SessionLogsRepo.getAll()).toEqual(before.logs);
    expect(await InjuryNotesRepo.getAll()).toEqual(before.notes);
    // Beide kopieën staan er nog, en terugzetten werkt daarna gewoon.
    expect((await listSnapshots()).map((s) => s.id).sort()).toEqual([kopie.id, eigen.id].sort());
    await restoreSnapshot(eigen.id);
    expect(await SettingsRepo.get()).toEqual(before.settings);
    expect(await SessionLogsRepo.getAll()).toEqual(before.logs);
    await restoreSnapshot(kopie.id);
    expect(await pair()).toEqual({ lastExportedAt: NOV15, lastBackupLogs: { at: NOV15, ids: ['a'] } });
    expect(await logIds()).toEqual(['a', 'b']);
  });

  it('een kopie die een oudere app bewaarde (schema 5, zonder lijst): terugzetten lukt en het nieuwste paar blijft', async () => {
    await SessionLogsRepo.put(log('a', '2026-11-01T10:00:00.000Z'));
    await SessionLogsRepo.put(log('b', '2026-11-10T10:00:00.000Z'));
    await SettingsRepo.set(backupMadeSettings(NOV15, ['a', 'b']));
    const envelope = oldBackup('2026-11-08T18:00:00.000Z', [log('a', '2026-11-01T10:00:00.000Z')], { lastExportedAt: NOV8, restDayMode: 'active' }) as unknown as AscendBackupEnvelope;
    await BackupSnapshotsRepo.put({ id: 'snapshot_oud', createdAt: '2026-11-08T18:00:00.000Z', envelope, reason: 'pre_import' });

    await restoreSnapshot('snapshot_oud');

    expect(await pair()).toEqual({ lastExportedAt: NOV15, lastBackupLogs: { at: NOV15, ids: ['a', 'b'] } });
    expect((await SettingsRepo.get()).restDayMode).toBe('active');
    expect(await logIds()).toEqual(['a', 'b']);

    // Loopt het toestel achter, dan komt het tijdstip van die oude kopie terug; zonder lijst telt de app op tijd.
    await SettingsRepo.set(backupMadeSettings('2026-11-05T19:00:00.000Z', []));
    await restoreSnapshot('snapshot_oud');
    expect((await pair()).lastExportedAt).toBe(NOV8);
    expect(await unsaved()).toEqual(['b']);
  });
});

describe('Laatste back-up in de toekomst op het toestel wordt nu', () => {
  it('een toekomstige datum: rechtgezet met de lijst, en de automatische back-up en de herinnering lopen weer', async () => {
    await SessionLogsRepo.put(log('a', '2026-11-01T10:00:00.000Z'));
    await SessionLogsRepo.put(log('nieuw', '2026-11-18T10:00:00.000Z'));
    await SettingsRepo.set({ ...backupMadeSettings(FUTURE, ['a']), restDayMode: 'active' });
    const logs = await SessionLogsRepo.getAll();
    const start = Date.now();

    expect(await straightenBackupTime()).toBe('straightened');

    const settings = await SettingsRepo.get();
    expectNow(settings.lastExportedAt, start);
    expect(settings.lastBackupLogs).toEqual({ at: settings.lastExportedAt, ids: ['a'] });
    expect(settings.restDayMode).toBe('active');
    // Telt op id, dus niets telt te weinig; geen log is aangeraakt.
    expect(await unsaved()).toEqual(['nieuw']);
    expect(await SessionLogsRepo.getAll()).toEqual(logs);
    const day = new Date(Date.parse(settings.lastExportedAt!));
    const tomorrow = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1, 23, 59);
    expect(isAutoBackupDue({ frequency: 'daily', now: tomorrow, lastBackupAt: FUTURE, hasData: true })).toBe(false);
    expect(isAutoBackupDue({ frequency: 'daily', now: tomorrow, lastBackupAt: settings.lastExportedAt, hasData: true })).toBe(true);
    expect(backupAge(settings.lastExportedAt, addDays(localDateOf(settings.lastExportedAt!), 35)).level).toBe('old');
    // Een tweede keer doet niets.
    expect(await straightenBackupTime()).toBe('ok');
    expect((await SettingsRepo.get()).lastExportedAt).toBe(settings.lastExportedAt);
  });

  it('de dag zelf: een back-up van eerder vandaag of van precies nu blijft staan, zonder schrijven', async () => {
    const now = Date.parse('2026-11-20T12:00:00.000Z');
    const write = vi.spyOn(MetaRepo, 'update');
    try {
      for (const at of ['2026-11-20T00:00:01.000Z', '2026-11-20T11:59:59.000Z', '2026-11-20T12:00:00.000Z']) {
        await SettingsRepo.set(backupMadeSettings(at, ['a']));
        write.mockClear();
        expect(await straightenBackupTime(now)).toBe('ok');
        expect(write).not.toHaveBeenCalled();
        expect(await pair()).toEqual({ lastExportedAt: at, lastBackupLogs: { at, ids: ['a'] } });
      }
    } finally {
      write.mockRestore();
    }
  });

  it('de dag zelf: later vandaag is ook de toekomst en wordt nu', async () => {
    const nowAt = '2026-11-20T12:00:00.000Z';
    await SettingsRepo.set(backupMadeSettings('2026-11-20T21:00:00.000Z', ['a']));
    expect(await straightenBackupTime(Date.parse(nowAt))).toBe('straightened');
    expect(await pair()).toEqual({ lastExportedAt: nowAt, lastBackupLogs: { at: nowAt, ids: ['a'] } });
  });

  it('nog nooit een back-up, of een onleesbaar tijdstip: er verandert niets', async () => {
    expect(await straightenBackupTime()).toBe('ok');
    expect(await MetaRepo.get('settings')).toBeUndefined();
    await SettingsRepo.set({ lastExportedAt: 'geen datum' });
    expect(await straightenBackupTime()).toBe('ok');
    expect((await SettingsRepo.get()).lastExportedAt).toBe('geen datum');
  });

  it('een opslag die niet antwoordt: de stap gooit niet', async () => {
    const read = vi.spyOn(MetaRepo, 'get').mockRejectedValue(new Error('opslag dicht'));
    try {
      expect(await straightenBackupTime()).toBe('failed');
    } finally {
      read.mockRestore();
    }
  });

  it('bij de start van de app, ook als alle stappen voor deze versie al gelopen hebben', async () => {
    await runBootMigrations({ build: 'test' });
    await SettingsRepo.set(backupMadeSettings(FUTURE, []));
    const start = Date.now();
    await runBootMigrations({ build: 'test' });
    expectNow((await pair()).lastExportedAt, start);
  });

  it('een toestel in de toekomst en een bestand van een oudere schemaVersion: importeren lukt, het paar is hoogstens nu', async () => {
    await SessionLogsRepo.put(log('eigen', '2026-11-18T10:00:00.000Z'));
    await SettingsRepo.set(backupMadeSettings(FUTURE, ['eigen']));
    const start = Date.now();
    const p = await plan(oldBackup('2026-11-10T19:00:00.000Z', [log('a', '2026-11-09T10:00:00.000Z')], { lastExportedAt: '2026-11-09T19:00:00.000Z' }));

    await applyImportPlan(p.backup, p.plan);

    // Het toestel is rechtgezet naar nu en is dan nieuwer dan het bestand van 10 november: zijn paar blijft.
    const after = await pair();
    expectNow(after.lastExportedAt, start);
    expect(after.lastBackupLogs).toEqual({ at: after.lastExportedAt, ids: ['eigen'] });
    expect(await logIds()).toEqual(['a', 'eigen']);
    // a staat in het bestand maar niet in de lijst: hij telt mee. Te veel, nooit te weinig.
    expect(await unsaved()).toEqual(['a']);
  });

  it('een fout halverwege een import op een toestel in de toekomst: er verandert niets, ook het tijdstip niet', async () => {
    await InjuryNotesRepo.put({ id: 'n1', date: '2026-11-01', bodyPart: 'Knie', severity: 'licht', note: 'nagemaakt' });
    await SessionLogsRepo.put(log('a', '2026-11-01T10:00:00.000Z'));
    const bestand = JSON.parse(JSON.stringify(await buildBackupEnvelope())) as { createdAt: string };
    bestand.createdAt = NOV15;
    await SettingsRepo.set(backupMadeSettings(FUTURE, ['a']));
    const before = await SettingsRepo.get();

    const p = await plan(bestand);
    (p.backup.injuryNotes[0] as unknown as Record<string, unknown>).note = () => 'geen kloon';
    await expect(applyImportPlan(p.backup, p.plan)).rejects.toThrow('Er is niets gewijzigd');

    expect(await SettingsRepo.get()).toEqual(before);
    // Ongedaan maken blijft: de kopie van voor de import staat er en is terug te zetten.
    expect((await listSnapshots()).some((s) => s.id === p.snapshot.id)).toBe(true);
    const start = Date.now();
    await restoreSnapshot(p.snapshot.id);
    expectNow((await pair()).lastExportedAt, start);
    expect(await logIds()).toEqual(['a']);
  });
});

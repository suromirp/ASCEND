import { beforeEach, describe, expect, it } from 'vitest';
import { SessionLogsRepo, SettingsRepo, wipeAllData } from './database';
import { buildBackupEnvelope, logIdsInEnvelope } from './backupExport';
import { normalizeBackupToCurrentModel } from './backupNormalize';
import { buildImportPreview } from './backupPreview';
import { applyImportPlan, createImportPlan, createPreImportSnapshot } from './backupApply';
import { defaultActionsForMode, defaultPlanPolicyForMode } from './backupMerge';
import { backupMadeSettings, logsNotInLastBackup } from '../engine/backupSince';
import type { SessionLog } from '../models/training';

// Nagemaakte logs (docs/beslissingen/2026-11-15-backup-telling.md).
const log = (id: string, completedAt: string): SessionLog => ({
  id, templateId: 'tpl', type: 'cardio', completedDate: completedAt.slice(0, 10), completedAt, variant: 'full', durationMinutes: 40, source: 'manual',
});

async function restore(payload: unknown) {
  const backup = normalizeBackupToCurrentModel(payload);
  const mode = 'full_restore' as const;
  const categorySelections = defaultActionsForMode(mode);
  const planPolicy = defaultPlanPolicyForMode(mode);
  const preview = await buildImportPreview(backup, categorySelections, planPolicy);
  const snapshot = await createPreImportSnapshot();
  const plan = createImportPlan(backup, mode, categorySelections, planPolicy, preview.diffByCategory.flatMap((d) => d.conflicts), snapshot.id);
  await applyImportPlan(backup, plan);
}

describe('de telling sinds je laatste back-up', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  it('de ids van de trainingen gaan niet mee in een gewone back-up, wel in de kopie van voor een import', async () => {
    await SessionLogsRepo.put(log('log_a', '2026-11-14T10:00:00.000Z'));
    await SettingsRepo.set(backupMadeSettings('2026-11-15T19:00:00.000Z', ['log_a']));
    const envelope = await buildBackupEnvelope();
    expect('lastBackupLogs' in (envelope.payload.settings as object)).toBe(false);
    expect((envelope.payload.settings as { lastExportedAt?: string }).lastExportedAt).toBe('2026-11-15T19:00:00.000Z');
    expect(logIdsInEnvelope(envelope)).toEqual(['log_a']);
    const whole = await buildBackupEnvelope({ wholeState: true });
    expect((whole.payload.settings as { lastBackupLogs?: unknown }).lastBackupLogs).toEqual({ at: '2026-11-15T19:00:00.000Z', ids: ['log_a'] });
  });

  it('een oude back-up zonder het veld: terugzetten lukt; op een leeg toestel is dat bestand de laatste back-up (besluit 2026-11-20-backup-terugzetten.md)', async () => {
    // Zoals een back-up van een oudere app: alleen lastExportedAt in de instellingen.
    const old = {
      backupSchemaVersion: 5,
      createdAt: '2026-11-10T19:00:00.000Z',
      payload: { version: 5, program: null, templates: [], plannedSessions: [], sessionLogs: [log('log_a', '2026-11-09T10:00:00.000Z')], trainingGoals: [], goalMilestones: [], goalMilestoneProgress: [], capabilityEvidence: [], injuryNotes: [], settings: { lastExportedAt: '2026-11-09T19:00:00.000Z' } },
    };
    await restore(JSON.parse(JSON.stringify(old)));
    const settings = await SettingsRepo.get();
    // Niet het tijdstip uit de instellingen in het bestand (9 november), maar dat van het bestand zelf.
    expect(settings.lastExportedAt).toBe('2026-11-10T19:00:00.000Z');
    expect(settings.lastBackupLogs).toEqual({ at: '2026-11-10T19:00:00.000Z', ids: ['log_a'] });
    await SessionLogsRepo.put(log('log_b', '2026-11-08T10:00:00.000Z'));
    expect(logsNotInLastBackup(await SessionLogsRepo.getAll(), settings)).toBe(1);
  });

  it('terugzetten met de instellingen van de back-up: het tijdstip uit het bestand komt niet over dat van dit toestel (besluit 2026-11-20-backup-terugzetten.md)', async () => {
    await SessionLogsRepo.put(log('log_a', '2026-11-14T10:00:00.000Z'));
    await SettingsRepo.set(backupMadeSettings('2026-11-08T19:00:00.000Z', ['log_a']));
    const envelope = { ...JSON.parse(JSON.stringify(await buildBackupEnvelope())), createdAt: '2026-11-12T19:00:00.000Z' };
    expect(envelope.payload.settings.lastExportedAt).toBe('2026-11-08T19:00:00.000Z');
    await SettingsRepo.set(backupMadeSettings('2026-11-15T19:00:00.000Z', ['log_a']));
    await restore(envelope);
    const settings = await SettingsRepo.get();
    expect(settings.lastExportedAt).toBe('2026-11-15T19:00:00.000Z');
    expect(settings.lastBackupLogs).toEqual({ at: '2026-11-15T19:00:00.000Z', ids: ['log_a'] });
    expect(logsNotInLastBackup(await SessionLogsRepo.getAll(), settings)).toBe(0);
  });
});

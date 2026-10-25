import { describe, it, expect, beforeEach } from 'vitest';
import { wipeAllData, seedIfEmpty, InjuryNotesRepo, SessionTemplatesRepo, ProgramsRepo, PlannedSessionsRepo, SettingsRepo, StrengthProgramStrategiesRepo } from './database';
import { runBootMigrations } from './bootMigrations';
import { buildBackupEnvelope, normalizeBackupToCurrentModel, buildImportPreview, createImportPlan, createPreImportSnapshot, applyImportPlan, defaultActionsForMode, defaultPlanPolicyForMode } from './backup';
import { restoreSafetyLines } from '../engine/freshStart';

// Terugzetten op een lege app: er is niets om te verwijderen. Een back-up van
// een oudere versie mist nieuwere sjablonen; die tellen niet als "verdwijnen"
// en blijven staan. Op een toestel met eigen gegevens blijft de telling zoals ze was.

async function olderBackup() {
  await wipeAllData();
  await seedIfEmpty();
  const envelope = await buildBackupEnvelope();
  const missing = envelope.payload.templates!.find((t) => t.id === 'tpl_easy_run')!;
  envelope.payload.templates = envelope.payload.templates!.filter((t) => t.id !== missing.id);
  return { envelope, missingId: missing.id };
}

describe('terugzetten op een lege app', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  it('laat niets verdwijnen, ook niet als de back-up een nieuwer sjabloon mist', async () => {
    const { envelope, missingId } = await olderBackup();
    await wipeAllData();
    await runBootMigrations({ build: 'test-restore-empty' });
    expect((await ProgramsRepo.getAll())).toEqual([]);
    expect((await SessionTemplatesRepo.getAll()).some((t) => t.id === missingId)).toBe(true);

    const backup = normalizeBackupToCurrentModel(envelope);
    const selections = defaultActionsForMode('full_restore');
    const preview = await buildImportPreview(backup, selections, defaultPlanPolicyForMode('full_restore'));
    expect(preview.diffByCategory.every((d) => d.toRemove === 0)).toBe(true);

    // De zinnen van de samenvatting: geen verdwijnen en geen verwijderen.
    const sentences = restoreSafetyLines(true).join(' ');
    expect(sentences).not.toMatch(/verdwijn|verwijder/i);

    const snapshot = await createPreImportSnapshot();
    await applyImportPlan(backup, createImportPlan(backup, 'full_restore', selections, defaultPlanPolicyForMode('full_restore'), [], snapshot.id));
    expect((await ProgramsRepo.getAll()).length).toBe(1);
    expect((await PlannedSessionsRepo.getAll()).length).toBeGreaterThan(0);
    // Het sjabloon dat de oude back-up niet kent, blijft er gewoon.
    expect((await SessionTemplatesRepo.getAll()).some((t) => t.id === missingId)).toBe(true);
    await SettingsRepo.get();
  });

  it('een eigen klacht op een verder lege app telt wel als verdwijnen', async () => {
    const { envelope } = await olderBackup();
    await wipeAllData();
    await runBootMigrations({ build: 'test-restore-empty-injury' });
    await InjuryNotesRepo.put({ id: 'inj-nieuw', date: '2026-10-25', bodyPart: 'Knie', severity: 'licht' });
    const backup = normalizeBackupToCurrentModel(envelope);
    const preview = await buildImportPreview(backup, defaultActionsForMode('full_restore'), defaultPlanPolicyForMode('full_restore'));
    const injuries = preview.diffByCategory.find((d) => d.category === 'injuries');
    expect(injuries?.toRemove).toBe(1);
    expect(preview.diffByCategory.filter((d) => d.category !== 'injuries').every((d) => d.toRemove === 0)).toBe(true);
  });

  it('op een toestel met een programma telt het sjabloon dat de back-up mist nog steeds mee', async () => {
    const { envelope, missingId } = await olderBackup();
    const backup = normalizeBackupToCurrentModel(envelope);
    const preview = await buildImportPreview(backup, defaultActionsForMode('full_restore'), defaultPlanPolicyForMode('full_restore'));
    const entry = preview.diffByCategory.find((d) => d.category === 'program_and_templates')!;
    expect(entry.toRemove).toBe(1);
    expect(missingId).toBe('tpl_easy_run');
  });

  it('een terugzetting op een nieuwe installatie krijgt bij de volgende versie niet ongevraagd het standaardkrachtblok', async () => {
    const { envelope } = await olderBackup();
    delete (envelope.payload as unknown as Record<string, unknown>).strengthProgramStrategies;
    await wipeAllData();
    await runBootMigrations({ build: 'build-1' });
    const backup = normalizeBackupToCurrentModel(envelope);
    const selections = defaultActionsForMode('full_restore');
    const policy = defaultPlanPolicyForMode('full_restore');
    const snapshot = await createPreImportSnapshot();
    await applyImportPlan(backup, createImportPlan(backup, 'full_restore', selections, policy, [], snapshot.id));
    expect((await ProgramsRepo.getAll()).length).toBe(1);
    await runBootMigrations({ build: 'build-1' });
    await runBootMigrations({ build: 'build-2' });
    expect(await StrengthProgramStrategiesRepo.getAll()).toEqual([]);
  });
});

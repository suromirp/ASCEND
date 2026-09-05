import { describe, it, expect, beforeEach } from 'vitest';
import { InjuryNotesRepo, ProgramsRepo, SessionLogsRepo, wipeAllData } from './database';
import { buildBackupEnvelope, normalizeBackupToCurrentModel, buildImportPreview, createImportPlan, createPreImportSnapshot, applyImportPlan, defaultActionsForMode, defaultPlanPolicyForMode } from './backup';
import type { InjuryNote } from '../models/injury';
import type { Program } from '../models/program';

// Phase 0a's original regression (export.ts/import.ts silently dropped
// injuryNotes) — this now lives against the Phase 0b pipeline that replaced
// those files.

describe('backup envelope round-trip', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  async function importEnvelope(payload: unknown, mode: 'full_restore' = 'full_restore') {
    const backup = normalizeBackupToCurrentModel(payload);
    const categorySelections = defaultActionsForMode(mode);
    const planPolicy = defaultPlanPolicyForMode(mode);
    const preview = await buildImportPreview(backup, categorySelections, planPolicy);
    const snapshot = await createPreImportSnapshot();
    const conflicts = preview.diffByCategory.flatMap((d) => d.conflicts);
    const plan = createImportPlan(backup, mode, categorySelections, planPolicy, conflicts, snapshot.id);
    await applyImportPlan(backup, plan);
  }

  it('round-trips injuryNotes through export and full-restore import', async () => {
    const program: Program = { id: 'p1', name: 'Test Program', startDate: '2026-01-05', phases: [] };
    const injury: InjuryNote = { id: 'inj1', date: '2026-08-01', bodyPart: 'Rechterknie', severity: 'matig', note: 'test' };

    await ProgramsRepo.put(program);
    await InjuryNotesRepo.put(injury);

    const envelope = await buildBackupEnvelope();
    expect(envelope.payload.injuryNotes).toEqual([injury]);

    // Simulate importing that back-up onto a clean device.
    await wipeAllData();
    expect(await InjuryNotesRepo.getAll()).toEqual([]);

    await importEnvelope(envelope);

    expect(await InjuryNotesRepo.getAll()).toEqual([injury]);
  });

  it('imports a legacy (pre-v0.3.2) flat export cleanly, injuryNotes absent', async () => {
    const legacyExport = {
      schemaVersion: 1,
      exportDate: '2026-06-01T00:00:00.000Z',
      program: { id: 'p1', name: 'Test Program', startDate: '2026-01-05', phases: [] },
      templates: [],
      plannedSessions: [],
      sessionLogs: [],
      objectives: [],
      milestoneProgress: [],
      settings: {},
      // injuryNotes deliberately absent — an export made before the field existed.
    };

    await expect(importEnvelope(legacyExport)).resolves.not.toThrow();
    expect(await InjuryNotesRepo.getAll()).toEqual([]);
    expect((await ProgramsRepo.getAll())[0]?.id).toBe('p1');
  });

  it('merge mode never silently overwrites a conflicting historical record', async () => {
    const currentLog = {
      id: 'log1', templateId: 't1', type: 'hiking' as const, completedDate: '2026-08-01',
      completedAt: '2026-08-01T10:00:00.000Z', variant: 'full' as const, durationMinutes: 60, source: 'manual' as const,
    };
    await SessionLogsRepo.put(currentLog);

    const backup = normalizeBackupToCurrentModel({
      backupSchemaVersion: 1,
      createdAt: '2026-09-01T00:00:00.000Z',
      payload: {
        version: 1,
        program: null,
        templates: [],
        plannedSessions: [],
        // Same id, different durationMinutes — a genuine conflict, not a duplicate.
        sessionLogs: [{ ...currentLog, durationMinutes: 90 }],
        objectives: [],
        milestoneProgress: [],
        injuryNotes: [],
        settings: {},
      },
    });

    const categorySelections = { training_history: 'merge' as const };
    const preview = await buildImportPreview(backup, categorySelections, 'keep_current_plan');
    const historyDiff = preview.diffByCategory.find((d) => d.category === 'training_history');
    expect(historyDiff?.toAdd).toBe(0);
    expect(historyDiff?.toReplace).toBe(0);
    expect(historyDiff?.conflicts).toEqual([{ id: 'log1', reason: expect.any(String) }]);

    const snapshot = await createPreImportSnapshot();
    const plan = createImportPlan(backup, 'custom', categorySelections, 'keep_current_plan', preview.diffByCategory.flatMap((d) => d.conflicts), snapshot.id);
    await applyImportPlan(backup, plan);

    // The original, un-overwritten log survives.
    expect(await SessionLogsRepo.getAll()).toEqual([currentLog]);
  });
});

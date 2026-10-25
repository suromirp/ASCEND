import { describe, it, expect, beforeEach } from 'vitest';
import { InjuryNotesRepo, ProgramsRepo, SessionLogsRepo, TrainingGoalsRepo, GoalMilestonesRepo, GoalMilestoneProgressRepo, CapabilityEvidenceRepo, SettingsRepo, MetaRepo, PlannedSessionsRepo, StrengthProgramStrategiesRepo, PlanChangeProposalsRepo, BackupSnapshotsRepo, wipeAllData } from './database';
import { buildBackupEnvelope, normalizeBackupToCurrentModel, buildImportPreview, createImportPlan, createPreImportSnapshot, applyImportPlan, defaultActionsForMode, defaultPlanPolicyForMode, parseBackupText, listSnapshots, restoreSnapshot } from './backup';
import type { SessionLog, PlannedSession } from '../models/training';
import { LEGACY_MILESTONE_ID_MAP } from '../engine/goalMigration';
import type { InjuryNote } from '../models/injury';
import type { Program } from '../models/program';
import type { LeavePeriod } from '../models/leave';

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

  it('restoring a V1 backup migrates its legacy objectives/milestoneProgress into the new goal-engine stores', async () => {
    const backup = normalizeBackupToCurrentModel({
      backupSchemaVersion: 1,
      createdAt: '2026-09-01T00:00:00.000Z',
      payload: {
        version: 1,
        program: null,
        templates: [],
        plannedSessions: [],
        sessionLogs: [],
        objectives: [{
          id: 'obj_gr5',
          name: 'GR5 / ALPINE READINESS',
          targetDate: '2027-06-01',
          targetDistanceKm: 600,
          milestones: [{ id: 'obj_gr5_m1', objectiveId: 'obj_gr5', order: 1, title: 'First', requirement: { kind: 'duration', activityType: 'cardio', minMinutes: 40 } }],
        }],
        milestoneProgress: [{ id: 'p1', objectiveId: 'obj_gr5', milestoneId: 'obj_gr5_m1', clearedDate: '2026-01-01' }],
        injuryNotes: [],
        settings: {},
      },
    });

    expect(backup.trainingGoals).toEqual([expect.objectContaining({ id: 'obj_gr5', status: 'active' })]);
    expect(backup.goalMilestones).toEqual([expect.objectContaining({ id: LEGACY_MILESTONE_ID_MAP.obj_gr5_m1, goalId: 'obj_gr5' })]);
    expect(backup.goalMilestoneProgress).toEqual([expect.objectContaining({ milestoneId: LEGACY_MILESTONE_ID_MAP.obj_gr5_m1, goalId: 'obj_gr5' })]);

    await applyImportPlan(
      backup,
      createImportPlan(backup, 'full_restore', defaultActionsForMode('full_restore'), 'restore_backup_plan', [], (await createPreImportSnapshot()).id),
    );

    expect(await TrainingGoalsRepo.getAll()).toHaveLength(1);
    expect(await GoalMilestonesRepo.getAll()).toHaveLength(1);
    expect(await GoalMilestoneProgressRepo.getAll()).toHaveLength(1);
  });

  it('round-trips a real TrainingGoal/GoalMilestone/CapabilityEvidence through export and full-restore import (V5)', async () => {
    await TrainingGoalsRepo.put({ id: 'goal1', name: 'Marathon', requirements: [], createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', status: 'paused' });
    await GoalMilestonesRepo.put({ id: 'ms1', goalId: 'goal1', order: 1, title: 'First', requirement: { kind: 'manual' } });
    await GoalMilestoneProgressRepo.put({ id: 'p1', goalId: 'goal1', milestoneId: 'ms1', clearedDate: '2026-02-01' });
    await CapabilityEvidenceRepo.put({ id: 'ce1', key: { dimension: 'load_carriage' }, measured: { amount: 12, unit: 'kg' }, date: '2026-02-01', evidenceType: 'manual', source: 'manualEntry' });

    const envelope = await buildBackupEnvelope();
    expect(envelope.payload).toEqual(expect.objectContaining({ version: 5 }));

    await wipeAllData();
    await importEnvelope(envelope);

    expect(await TrainingGoalsRepo.getAll()).toEqual([expect.objectContaining({ id: 'goal1' })]);
    expect(await GoalMilestonesRepo.getAll()).toEqual([expect.objectContaining({ id: 'ms1' })]);
    expect(await CapabilityEvidenceRepo.getAll()).toEqual([expect.objectContaining({ id: 'ce1' })]);
    expect(await GoalMilestoneProgressRepo.getAll()).toEqual([expect.objectContaining({ id: 'p1' })]);
  });

  // --- audit 2026-10: restoring may never lose history ---------------------

  const log = (id: string, date: string): SessionLog => ({
    id, templateId: 'tpl', type: 'cardio', completedDate: date, completedAt: `${date}T10:00:00.000Z`, variant: 'full', durationMinutes: 40, source: 'manual',
  });

  it('a backup with an empty payload changes nothing (missing categories are unknown, not empty)', async () => {
    await SessionLogsRepo.put(log('a', '2026-09-01'));
    await TrainingGoalsRepo.put({ id: 'goal1', name: 'GR5', requirements: [], createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', status: 'active', targetDate: '2027-08-02' });
    const backup = normalizeBackupToCurrentModel({ backupSchemaVersion: 3, createdAt: '2026-09-02T00:00:00.000Z', payload: { version: 3 } });
    const preview = await buildImportPreview(backup, defaultActionsForMode('full_restore'), 'restore_backup_plan');
    expect(preview.diffByCategory.every((d) => d.toRemove === 0)).toBe(true);
    expect(preview.diffByCategory.find((d) => d.category === 'training_history')?.missingInBackup).toBe(true);
    await importEnvelope({ backupSchemaVersion: 3, createdAt: '2026-09-02T00:00:00.000Z', payload: { version: 3 } });
    expect((await SessionLogsRepo.getAll()).map((l) => l.id)).toEqual(['a']);
    expect((await TrainingGoalsRepo.getAll()).map((g) => g.id)).toEqual(['goal1']);
  });

  it('a full restore of an older backup keeps trainings logged since', async () => {
    await SessionLogsRepo.put(log('old', '2026-09-20'));
    const envelope = await buildBackupEnvelope();
    await SessionLogsRepo.put(log('new1', '2026-09-28'));
    await SessionLogsRepo.put(log('new2', '2026-10-02'));
    const backup = normalizeBackupToCurrentModel({ ...envelope, createdAt: '2026-09-23T00:00:00.000Z' });
    const preview = await buildImportPreview(backup, defaultActionsForMode('full_restore'), 'restore_backup_plan');
    expect(preview.backupMeta.logsSinceBackup).toBe(2);
    expect(preview.diffByCategory.find((d) => d.category === 'training_history')?.toRemove).toBe(0);
    await importEnvelope(envelope);
    expect((await SessionLogsRepo.getAll()).map((l) => l.id).sort()).toEqual(['new1', 'new2', 'old']);
  });

  it('restoring settings keeps weigh-ins the device has and the backup lacks', async () => {
    await SettingsRepo.set({ weightEntries: [{ date: '2026-09-01', kg: 80, source: 'manual' }] });
    const envelope = await buildBackupEnvelope();
    await SettingsRepo.set({ weightEntries: [{ date: '2026-09-01', kg: 80, source: 'manual' }, { date: '2026-10-01', kg: 79, source: 'manual' }] });
    await importEnvelope(envelope);
    expect((await SettingsRepo.get()).weightEntries?.map((e) => e.date)).toEqual(['2026-09-01', '2026-10-01']);
  });

  it('restoring settings adds a fat percentage only the backup has, and keeps the device weight', async () => {
    await SettingsRepo.set({ weightEntries: [{ date: '2026-09-01', kg: 80, source: 'manual', fatPct: 19.5 }] });
    const envelope = await buildBackupEnvelope();
    await SettingsRepo.set({ weightEntries: [{ date: '2026-09-01', kg: 81, source: 'manual' }] });
    await importEnvelope(envelope);
    expect((await SettingsRepo.get()).weightEntries).toEqual([{ date: '2026-09-01', kg: 81, source: 'manual', fatPct: 19.5 }]);
  });

  it('drops malformed records instead of storing them, and says how many', async () => {
    const envelope = await buildBackupEnvelope();
    const broken = { ...envelope, payload: { ...envelope.payload, sessionLogs: [{ id: 'junk' }, log('ok', '2026-09-01')], settings: { weightEntries: 'oops' } } };
    const backup = normalizeBackupToCurrentModel(broken);
    expect(backup.sessionLogs.map((l) => l.id)).toEqual(['ok']);
    expect(backup.skippedInvalid).toBe(2);
    expect(backup.settings.weightEntries).toBeUndefined();
  });

  // The question of the week (engine/weeklyQuestion.ts): additive in the
  // settings, so no schema step, but it must travel in an export, survive a
  // restore onto a clean device, never drop an answer the device has, and an
  // old back-up without it must still import.
  describe('weekly intentions (the question of the week)', () => {
    const intention = (weekStart: string, answer?: string) => ({ weekStart, questionId: 'WQ-basis-01', question: 'Als je een training moet overslaan, wat doe je dan?', ...(answer ? { answer, answeredAt: `${weekStart}T08:00:00.000Z` } : {}) });

    it('round-trips through export and a full restore onto a clean device', async () => {
      await SettingsRepo.set({ weeklyIntentions: [intention('2026-10-19', 'Dan loop ik zondag.')] });
      const envelope = await buildBackupEnvelope();
      expect((envelope.payload.settings as { weeklyIntentions?: unknown }).weeklyIntentions).toEqual([intention('2026-10-19', 'Dan loop ik zondag.')]);
      await wipeAllData();
      expect((await SettingsRepo.get()).weeklyIntentions).toBeUndefined();
      await importEnvelope(envelope);
      expect((await SettingsRepo.get()).weeklyIntentions).toEqual([intention('2026-10-19', 'Dan loop ik zondag.')]);
    });

    it('a back-up made before the field existed still imports and leaves the answers on the device alone', async () => {
      const envelope = await buildBackupEnvelope(); // settings without weeklyIntentions
      await SettingsRepo.set({ weeklyIntentions: [intention('2026-10-26', 'Mijn plan')] });
      const backup = normalizeBackupToCurrentModel(envelope);
      expect(backup.skippedInvalid).toBe(0);
      expect(backup.settings.weeklyIntentions).toBeUndefined();
      await importEnvelope(envelope);
      expect((await SettingsRepo.get()).weeklyIntentions).toEqual([intention('2026-10-26', 'Mijn plan')]);
    });

    it('a restore keeps answers the device has and the back-up lacks, and takes the ones it lacks', async () => {
      await SettingsRepo.set({ weeklyIntentions: [intention('2026-10-19', 'Uit de back-up')] });
      const envelope = await buildBackupEnvelope();
      await SettingsRepo.set({ weeklyIntentions: [{ ...intention('2026-10-19'), laterOn: '2026-10-20' }, intention('2026-10-26', 'Alleen op het toestel')] });
      await importEnvelope(envelope);
      expect((await SettingsRepo.get()).weeklyIntentions).toEqual([intention('2026-10-19', 'Uit de back-up'), intention('2026-10-26', 'Alleen op het toestel')]);
    });

    it('drops damaged lines on import and counts them', async () => {
      const envelope = await buildBackupEnvelope();
      const broken = { ...envelope, payload: { ...envelope.payload, settings: { weeklyIntentions: [intention('2026-10-19', 'goed'), { weekStart: 'nooit', questionId: 'x', question: 'y' }, { weekStart: '2026-10-26', questionId: 'x', question: 'y', answer: 7 }] } } };
      const backup = normalizeBackupToCurrentModel(broken);
      expect(backup.settings.weeklyIntentions).toEqual([intention('2026-10-19', 'goed')]);
      expect(backup.skippedInvalid).toBe(2);
      const notAList = normalizeBackupToCurrentModel({ ...envelope, payload: { ...envelope.payload, settings: { weeklyIntentions: 'oops' } } });
      expect(notAList.settings.weeklyIntentions).toBeUndefined();
    });
  });

  it('a damaged file gets a readable message', () => {
    expect(() => parseBackupText('{"backupSchemaVersion": 4, "payl')).toThrow(/beschadigd of onvolledig/);
  });

  it('exports and restores availability, strength block, change log and coach answers (V4)', async () => {
    await MetaRepo.set('goalEngineConfig', { strategy: 'balanced' });
    await MetaRepo.set('adviceResponses', { a1: { response: 'accepted' } });
    await StrengthProgramStrategiesRepo.put({ id: 'sps1' } as never);
    await PlanChangeProposalsRepo.put({ id: 'pcp1' } as never);
    const envelope = await buildBackupEnvelope();
    expect(envelope.appVersion === undefined || typeof envelope.appVersion === 'string').toBe(true);
    await wipeAllData();
    await importEnvelope(envelope);
    expect(await MetaRepo.get('goalEngineConfig')).toEqual(expect.objectContaining({ strategy: 'balanced' }));
    expect(await MetaRepo.get('adviceResponses')).toEqual({ a1: { response: 'accepted' } });
    expect((await StrengthProgramStrategiesRepo.getAll()).map((x) => x.id)).toEqual(['sps1']);
    expect((await PlanChangeProposalsRepo.getAll()).map((x) => x.id)).toEqual(['pcp1']);
  });

  it('keeps at most five pre-import copies and can put one back', async () => {
    const planned = (id: string, date: string): PlannedSession => ({ id, templateId: 'tpl', scheduledDate: date, weekStartDate: '2026-09-28', status: 'planned', order: 0 });
    await PlannedSessionsRepo.put(planned('p-before', '2026-10-01'));
    await SessionLogsRepo.put(log('kept', '2026-10-01'));
    const first = await createPreImportSnapshot();
    for (let i = 0; i < 6; i++) await createPreImportSnapshot();
    expect((await BackupSnapshotsRepo.getAll()).length).toBe(5);
    const target = (await listSnapshots())[4];
    await PlannedSessionsRepo.delete('p-before');
    await PlannedSessionsRepo.put(planned('p-after', '2026-10-02'));
    await SessionLogsRepo.put(log('since', '2026-10-02'));
    await restoreSnapshot(target.id);
    expect((await PlannedSessionsRepo.getAll()).map((p) => p.id)).toEqual(['p-before']);
    expect((await SessionLogsRepo.getAll()).map((l) => l.id).sort()).toEqual(['kept', 'since']);
    expect(first.id).toBeTruthy();
  });
});


// --- vrije dagen en vakanties (backup schema 5) --------------------------------

describe('vrije periodes in een back-up', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  const periods: LeavePeriod[] = [
    { id: 'leave_a', kind: 'no_training', startDate: '2027-05-06', endDate: '2027-05-09', note: 'Hemelvaart' },
    { id: 'leave_b', kind: 'trek', startDate: '2027-05-15', endDate: '2027-05-17' },
    { id: 'leave_c', kind: 'free_days', startDate: '2027-06-03', endDate: '2027-06-04' },
  ];

  async function restore(envelope: unknown) {
    const backup = normalizeBackupToCurrentModel(envelope);
    const selections = defaultActionsForMode('full_restore');
    const preview = await buildImportPreview(backup, selections, 'restore_backup_plan');
    const snapshot = await createPreImportSnapshot();
    const plan = createImportPlan(backup, 'full_restore', selections, 'restore_backup_plan', preview.diffByCategory.flatMap((d) => d.conflicts), snapshot.id);
    await applyImportPlan(backup, plan);
    return backup;
  }

  it('export and restore keep the periods and the marks on sessions', async () => {
    await SettingsRepo.set({ leavePeriods: periods });
    await PlannedSessionsRepo.put({ id: 'walk', templateId: 'tpl_mountain_hike', scheduledDate: '2027-05-15', weekStartDate: '2027-05-10', status: 'planned', order: 0, leave: { periodId: 'leave_b', role: 'placed', from: '2027-05-15' } });
    const envelope = await buildBackupEnvelope();
    expect(envelope.backupSchemaVersion).toBe(5);
    expect((envelope.payload.settings as { leavePeriods?: LeavePeriod[] }).leavePeriods).toEqual(periods);

    await wipeAllData();
    await restore(JSON.parse(JSON.stringify(envelope)));
    expect((await SettingsRepo.get()).leavePeriods).toEqual(periods);
    expect((await PlannedSessionsRepo.getAll())[0].leave).toEqual({ periodId: 'leave_b', role: 'placed', from: '2027-05-15' });
  });

  it('an old backup without periods still imports, and leaves the periods on the device alone', async () => {
    await SettingsRepo.set({ leavePeriods: periods });
    const oldBackup = { backupSchemaVersion: 4, createdAt: '2026-10-01T00:00:00.000Z', payload: { version: 4, program: null, templates: [], plannedSessions: [], sessionLogs: [], trainingGoals: [], goalMilestones: [], goalMilestoneProgress: [], capabilityEvidence: [], injuryNotes: [], settings: { restDay: 3 } } };
    const backup = normalizeBackupToCurrentModel(oldBackup);
    expect(backup.settings.leavePeriods).toBeUndefined();
    expect(backup.sourceBackupSchemaVersion).toBe(4);
    await restore(oldBackup);
    const settings = await SettingsRepo.get();
    expect(settings.restDay).toBe(3);
    expect(settings.leavePeriods).toEqual(periods);
  });

  it('a restore keeps a period the device has and the back-up lacks', async () => {
    // Back-up made before the trek was planned: the sessions it moved carry
    // its marker, so dropping the period would strand them.
    await SettingsRepo.set({ leavePeriods: [periods[0]] });
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    await SettingsRepo.set({ leavePeriods: periods });
    await restore(envelope);
    expect((await SettingsRepo.get()).leavePeriods?.map((p) => p.id)).toEqual(['leave_a', 'leave_b', 'leave_c']);
  });

  it('a flat export from before backups existed still imports', async () => {
    const legacy = { schemaVersion: 1, exportDate: '2026-06-01T00:00:00.000Z', program: null, templates: [], plannedSessions: [], sessionLogs: [], objectives: [], milestoneProgress: [], settings: {} };
    const backup = normalizeBackupToCurrentModel(legacy);
    expect(backup.settings.leavePeriods).toBeUndefined();
    await expect(restore(legacy)).resolves.not.toThrow();
    expect((await SettingsRepo.get()).leavePeriods).toBeUndefined();
  });

  it('drops a period that is incomplete or of an unknown kind, and says how many', () => {
    const broken = {
      backupSchemaVersion: 5, createdAt: '2026-10-01T00:00:00.000Z',
      payload: { version: 5, settings: { leavePeriods: [periods[0], { id: 'x', kind: 'spa', startDate: '2027-05-01', endDate: '2027-05-02' }, { id: 'y', kind: 'trek', startDate: '2027-05-09', endDate: '2027-05-01' }, { kind: 'trek' }] } },
    };
    const backup = normalizeBackupToCurrentModel(broken);
    expect(backup.settings.leavePeriods).toEqual([periods[0]]);
    expect(backup.skippedInvalid).toBe(3);
  });

  it('a file that is not a list of periods is ignored, not stored', () => {
    const backup = normalizeBackupToCurrentModel({ backupSchemaVersion: 5, createdAt: '2026-10-01T00:00:00.000Z', payload: { version: 5, settings: { leavePeriods: 'oops' } } });
    expect(backup.settings.leavePeriods).toBeUndefined();
    expect(backup.skippedInvalid).toBe(1);
  });

  it('a file from a newer app than schema 5 says to update', () => {
    expect(() => normalizeBackupToCurrentModel({ backupSchemaVersion: 6, createdAt: '2027-01-01T00:00:00.000Z', payload: { version: 6 } })).toThrow(/nieuwere versie/);
  });
});

describe('meer per set in een back-up (rir en kind)', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  const baseLog = (id: string, sets: SessionLog['strengthData']): SessionLog => ({
    id, templateId: 'tpl_lower_a', type: 'strength', completedDate: '2026-10-14', completedAt: '2026-10-14T18:00:00.000Z',
    variant: 'full', durationMinutes: 62, source: 'macrofactor', strengthData: sets,
  });
  const oldSets = [{ exerciseId: 'sq', exerciseName: 'Squat', sets: [{ reps: 6, weightKg: 100 }, { reps: 5, weightKg: 100, rpe: 8 }] }];
  const newSets = [{ exerciseId: 'sq', exerciseName: 'Squat', sets: [{ reps: 8, weightKg: 60, kind: 'warmup' as const }, { reps: 6, weightKg: 100, rir: 2 }, { reps: 5, weightKg: 100, rir: 0, kind: 'work' as const }] }];
  const flat = (logs: SessionLog[]) => ({ schemaVersion: 1, exportDate: '2026-06-01T00:00:00.000Z', program: null, templates: [], plannedSessions: [], sessionLogs: logs, objectives: [], milestoneProgress: [], settings: {} });

  async function restore(payload: unknown) {
    const backup = normalizeBackupToCurrentModel(payload);
    const selections = defaultActionsForMode('full_restore');
    const preview = await buildImportPreview(backup, selections, 'restore_backup_plan');
    const snapshot = await createPreImportSnapshot();
    const plan = createImportPlan(backup, 'full_restore', selections, 'restore_backup_plan', preview.diffByCategory.flatMap((d) => d.conflicts), snapshot.id);
    await applyImportPlan(backup, plan);
  }

  it('a back-up of the current schema and an older flat export import the sets exactly as they are', async () => {
    await restore(flat([baseLog('old', oldSets)]));
    expect((await SessionLogsRepo.getAll())[0].strengthData).toEqual(oldSets);

    await wipeAllData();
    await SessionLogsRepo.put(baseLog('cur', oldSets));
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    await wipeAllData();
    await restore(envelope);
    expect((await SessionLogsRepo.getAll())[0].strengthData).toEqual(oldSets);
  });

  it('rir and kind survive export and import', async () => {
    await SessionLogsRepo.put(baseLog('new', newSets));
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    expect(envelope.payload.sessionLogs[0].strengthData).toEqual(newSets);
    await wipeAllData();
    await restore(envelope);
    expect((await SessionLogsRepo.getAll())[0].strengthData).toEqual(newSets);
  });

  it('a damaged rir or kind is dropped, the reps and weight stay', () => {
    const damaged = [{ exerciseId: 'sq', exerciseName: 'Squat', sets: [{ reps: 6, weightKg: 100, rir: 'veel', kind: 'zwaar' }, { reps: 5, rir: 11 }, { reps: 4, rir: -1 }] }];
    const backup = normalizeBackupToCurrentModel(flat([baseLog('bad', damaged as never)]));
    expect(backup.sessionLogs[0].strengthData![0].sets).toEqual([{ reps: 6, weightKg: 100 }, { reps: 5 }, { reps: 4 }]);
  });
});

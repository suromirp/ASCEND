import { describe, it, expect, beforeEach } from 'vitest';
import { InjuryNotesRepo, ProgramsRepo, SessionLogsRepo, TrainingGoalsRepo, GoalMilestonesRepo, GoalMilestoneProgressRepo, CapabilityEvidenceRepo, SettingsRepo, MetaRepo, PlannedSessionsRepo, StrengthProgramStrategiesRepo, PlanChangeProposalsRepo, BackupSnapshotsRepo, wipeAllData } from './database';
import { buildBackupEnvelope, normalizeBackupToCurrentModel, buildImportPreview, createImportPlan, createPreImportSnapshot, applyImportPlan, defaultActionsForMode, defaultPlanPolicyForMode, parseBackupText, backupErrorText, listSnapshots, restoreSnapshot } from './backup';
import type { SessionLog, PlannedSession } from '../models/training';
import { migrateInfluences, migrateLegEaseDays, migrateNightJudgments } from './migrations';
import type { InfluenceEntry } from '../models/influence';
import type { SweatEntry } from '../models/sweat';
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

  it('the gym of a strength log and the weights per machine travel in a backup; an older log stays as it was', async () => {
    await SessionLogsRepo.put({ ...log('with', '2026-09-01'), gymProfileId: 'a' });
    await SessionLogsRepo.put(log('without', '2026-09-02'));
    await SettingsRepo.set({ strengthModel: { activeProfileId: 'a', profiles: [{ id: 'a', name: 'Sportschool A', barsKg: [20], platesKg: [5], dumbbells: { startKg: 2, stepKg: 2, upToKg: 10, thenStepKg: 2.5, maxKg: 50 }, stackStepKg: 5, exerciseWeightsKg: { 'cable-fly': [4.5, 9, 13.5] }, addOnKg: [2.3], exerciseAddOnKg: { 'kelso-shrug': [] } }] } });
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    const backup = normalizeBackupToCurrentModel(envelope);
    expect(backup.sessionLogs.find((l) => l.id === 'with')?.gymProfileId).toBe('a');
    expect('gymProfileId' in backup.sessionLogs.find((l) => l.id === 'without')!).toBe(false);
    await importEnvelope(envelope);
    expect((await SessionLogsRepo.getAll()).find((l) => l.id === 'with')?.gymProfileId).toBe('a');
    expect((await SettingsRepo.get()).strengthModel?.profiles?.[0].exerciseWeightsKg).toEqual({ 'cable-fly': [4.5, 9, 13.5] });
    expect((await SettingsRepo.get()).strengthModel?.profiles?.[0].addOnKg).toEqual([2.3]);
    expect((await SettingsRepo.get()).strengthModel?.profiles?.[0].exerciseAddOnKg).toEqual({ 'kelso-shrug': [] });
  });

  it('a damaged gym on a log in a backup is dropped, so the training counts for every gym', async () => {
    await SessionLogsRepo.put({ ...log('num', '2026-09-01'), gymProfileId: 7 } as unknown as SessionLog);
    await SessionLogsRepo.put({ ...log('empty', '2026-09-02'), gymProfileId: '  ' });
    await SessionLogsRepo.put({ ...log('ok', '2026-09-03'), gymProfileId: 'b' });
    const backup = normalizeBackupToCurrentModel(JSON.parse(JSON.stringify(await buildBackupEnvelope())));
    expect('gymProfileId' in backup.sessionLogs.find((l) => l.id === 'num')!).toBe(false);
    expect('gymProfileId' in backup.sessionLogs.find((l) => l.id === 'empty')!).toBe(false);
    expect(backup.sessionLogs.find((l) => l.id === 'ok')?.gymProfileId).toBe('b');
  });

  it('the course of a Forge training travels in a backup; an older log stays as it was and a damaged event is dropped', async () => {
    const event = { id: 'ev1', at: 1_700_000_000_000, exerciseId: 'bench-press', exercise: 'Bench Press', rowId: 'bench:s1', set: '2', kind: 'bijgestuurd', from: { kg: 62.5, reps: 8 }, to: { kg: 60, reps: 8 } };
    await SessionLogsRepo.put({ ...log('with', '2026-09-01'), forgeLog: [event as never, { ...event, id: 'ev2', kind: 'raar' } as never] });
    await SessionLogsRepo.put({ ...log('broken', '2026-09-02'), forgeLog: 'rommel' } as unknown as SessionLog);
    await SessionLogsRepo.put(log('without', '2026-09-03'));
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    const backup = normalizeBackupToCurrentModel(envelope);
    expect(backup.sessionLogs.find((l) => l.id === 'with')?.forgeLog).toEqual([event]);
    expect('forgeLog' in backup.sessionLogs.find((l) => l.id === 'broken')!).toBe(false);
    expect('forgeLog' in backup.sessionLogs.find((l) => l.id === 'without')!).toBe(false);
    expect(backup.sessionLogs.find((l) => l.id === 'broken')?.id).toBe('broken');
    await wipeAllData();
    await importEnvelope(envelope);
    expect((await SessionLogsRepo.getAll()).find((l) => l.id === 'with')?.forgeLog).toEqual([event]);
  });

  it('the setting Zonder spotter and the safety arms of a gym travel in a backup', async () => {
    await SettingsRepo.set({ strengthModel: { noSpotter: false, activeProfileId: 'a', profiles: [{ id: 'a', name: 'Sportschool A', barsKg: [20], platesKg: [5], dumbbells: { startKg: 2, stepKg: 2, upToKg: 10, thenStepKg: 2.5, maxKg: 50 }, stackStepKg: 5, spotterRack: true }] } });
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    await wipeAllData();
    await importEnvelope(envelope);
    const model = (await SettingsRepo.get()).strengthModel;
    expect(model?.noSpotter).toBe(false);
    expect(model?.profiles?.[0].spotterRack).toBe(true);
  });

  it('what you noticed and the side of a complaint travel in a backup; an older complaint stays as it was', async () => {
    await InjuryNotesRepo.put({ id: 'new', date: '2026-10-20', bodyPart: 'Onderrug rechts', severity: 'matig', kind: 'pijn', side: 'rechts' });
    await InjuryNotesRepo.put({ id: 'sore', date: '2026-10-21', bodyPart: 'Quadriceps', severity: 'licht', kind: 'spierpijn', side: 'beide' });
    await InjuryNotesRepo.put({ id: 'old', date: '2026-09-01', bodyPart: 'Onderrug', severity: 'licht' });
    await SettingsRepo.set({ bodyCheck: 'elke-week', weeklyHealthChecks: [{ weekStart: '2026-10-19', trouble: 'geen', laterOn: '2026-10-22' }] });
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    const backup = normalizeBackupToCurrentModel(envelope);
    expect(backup.injuryNotes.find((n) => n.id === 'new')).toMatchObject({ kind: 'pijn', side: 'rechts' });
    expect(backup.injuryNotes.find((n) => n.id === 'sore')).toMatchObject({ kind: 'spierpijn', side: 'beide' });
    const old = backup.injuryNotes.find((n) => n.id === 'old')!;
    expect('kind' in old || 'side' in old).toBe(false);
    expect(backup.settings.bodyCheck).toBe('elke-week');
    expect(backup.settings.weeklyHealthChecks?.[0].laterOn).toBe('2026-10-22');
    await importEnvelope(envelope);
    expect((await InjuryNotesRepo.getAll()).find((n) => n.id === 'sore')).toMatchObject({ kind: 'spierpijn', side: 'beide' });
  });

  it('a damaged kind or side on a complaint, and a damaged day of "Niet nu", are dropped', async () => {
    await InjuryNotesRepo.put({ id: 'bad', date: '2026-10-20', bodyPart: 'Knie', severity: 'licht', kind: 'vreemd', side: 7 } as unknown as InjuryNote);
    await SettingsRepo.set({ weeklyHealthChecks: [{ weekStart: '2026-10-19', trouble: 'geen', laterOn: 'morgen' }] });
    const backup = normalizeBackupToCurrentModel(JSON.parse(JSON.stringify(await buildBackupEnvelope())));
    const bad = backup.injuryNotes.find((n) => n.id === 'bad')!;
    expect('kind' in bad || 'side' in bad).toBe(false);
    expect(backup.settings.weeklyHealthChecks?.[0]).toEqual({ weekStart: '2026-10-19', trouble: 'geen' });
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

  // Hartslag op je horloge: two optional fields, read defensively.
  describe('watchHeartRate en watchCalmRun', () => {
    it('round-trips, and rubbish is dropped and counted', async () => {
      await SettingsRepo.set({ watchHeartRate: 'intervals', watchCalmRun: false });
      const envelope = await buildBackupEnvelope();
      await wipeAllData();
      await importEnvelope(envelope);
      const restored = await SettingsRepo.get();
      expect(restored.watchHeartRate).toBe('intervals');
      expect(restored.watchCalmRun).toBe(false);
      const bad = normalizeBackupToCurrentModel({ ...envelope, payload: { ...envelope.payload, settings: { watchHeartRate: 'zones', watchCalmRun: 'ja' } } });
      expect(bad.settings.watchHeartRate).toBeUndefined();
      expect(bad.settings.watchCalmRun).toBeUndefined();
      expect(bad.skippedInvalid).toBe(2);
    });
  });

  // Your verdicts on short nights (engine/shortNight.ts): additive in the settings,
  // so no schema step, but they travel in a backup, an old backup without them still
  // imports, and a restore never drops a verdict the device has.
  describe('nightJudgments (korte nacht)', () => {
    const verdicts = [{ date: '2026-10-20', verdict: 'klopt' as const }, { date: '2026-10-21', verdict: 'niet_goed' as const, hours: 7 }];

    it('round-trips through export and a full restore onto a clean device', async () => {
      await SettingsRepo.set({ nightJudgments: verdicts, askShortNight: false });
      const envelope = await buildBackupEnvelope();
      await wipeAllData();
      expect((await SettingsRepo.get()).nightJudgments).toBeUndefined();
      await importEnvelope(envelope);
      const restored = await SettingsRepo.get();
      expect(restored.nightJudgments).toEqual(verdicts);
      expect(restored.askShortNight).toBe(false);
    });

    it('a back-up without the field imports as before and leaves the verdicts on the device alone', async () => {
      const envelope = await buildBackupEnvelope();
      await SettingsRepo.set({ nightJudgments: verdicts });
      const backup = normalizeBackupToCurrentModel(envelope);
      expect(backup.skippedInvalid).toBe(0);
      expect(backup.settings.nightJudgments).toBeUndefined();
      await importEnvelope(envelope);
      expect((await SettingsRepo.get()).nightJudgments).toEqual(verdicts);
    });

    it('a restore keeps verdicts the device has and takes the ones it lacks', async () => {
      await SettingsRepo.set({ nightJudgments: [{ date: '2026-10-20', verdict: 'klopt' }] });
      const envelope = await buildBackupEnvelope();
      await SettingsRepo.set({ nightJudgments: [{ date: '2026-10-20', verdict: 'niet_goed', hoursSkipped: true }, { date: '2026-10-22', verdict: 'klopt' }] });
      await importEnvelope(envelope);
      expect((await SettingsRepo.get()).nightJudgments).toEqual([{ date: '2026-10-20', verdict: 'niet_goed', hoursSkipped: true }, { date: '2026-10-22', verdict: 'klopt' }]);
    });

    it('keeps the minutes, and drops a damaged date or damaged minutes', () => {
      const out = migrateNightJudgments([{ date: '2026-10-21', verdict: 'niet_goed', hours: 7, minutes: 190 }, { date: '2026-13-45', verdict: 'klopt' }, { date: '2026-10-22', verdict: 'klopt', minutes: -5 }]);
      expect(out.list).toEqual([{ date: '2026-10-21', verdict: 'niet_goed', hours: 7, minutes: 190 }, { date: '2026-10-22', verdict: 'klopt' }]);
      expect(out.skipped).toBe(2);
    });

    it('a restore cuts the merged list to the newest 120 and brings back an undone verdict', async () => {
      const many = Array.from({ length: 130 }, (_, i) => ({ date: `2027-${String(1 + Math.floor(i / 28)).padStart(2, '0')}-${String(1 + (i % 28)).padStart(2, '0')}`, verdict: 'klopt' as const }));
      await SettingsRepo.set({ nightJudgments: many.slice(0, 5) });
      const envelope = await buildBackupEnvelope();
      await SettingsRepo.set({ nightJudgments: many.slice(5) });
      await importEnvelope(envelope);
      const list = (await SettingsRepo.get()).nightJudgments!;
      expect(list).toHaveLength(120);
      expect(list[list.length - 1].date).toBe(many[129].date);
      await SettingsRepo.set({ nightJudgments: [] });
      await importEnvelope(envelope);
      expect((await SettingsRepo.get()).nightJudgments).toEqual(many.slice(0, 5));
    });

    it('drops damaged verdicts and counts them', async () => {
      const envelope = await buildBackupEnvelope();
      const settings = { nightJudgments: [verdicts[1], { date: 'nooit', verdict: 'klopt' }, { date: '2026-10-23', verdict: 'misschien' }, { date: '2026-10-24', verdict: 'niet_goed', hours: 42 }], askShortNight: 'ja' };
      const backup = normalizeBackupToCurrentModel({ ...envelope, payload: { ...envelope.payload, settings } });
      expect(backup.settings.nightJudgments).toEqual([verdicts[1], { date: '2026-10-24', verdict: 'niet_goed' }]);
      expect(backup.settings.askShortNight).toBeUndefined();
      expect(backup.skippedInvalid).toBe(4);
      const notAList = normalizeBackupToCurrentModel({ ...envelope, payload: { ...envelope.payload, settings: { nightJudgments: 'oops' } } });
      expect(notAList.settings.nightJudgments).toBeUndefined();
    });
  });

  // What you chose on days with tired legs (models/legEase.ts): additive in the settings, no schema step,
  // it travels in a backup, an old backup without it imports as before, and a restore merges per date and training.
  describe('legEaseDays (lichter bij vermoeide benen)', () => {
    const day = (date: string, plannedSessionId: string, choice: 'lichter' | 'liever-niet' = 'lichter') => ({ date, plannedSessionId, choice, reasons: ['spierpijn' as const], index: 9.5, at: `${date}T07:00:00.000Z` });
    const kept = [day('2026-10-20', 's1'), day('2026-10-21', 's2', 'liever-niet')];

    it('round-trips through export and a full restore onto a clean device', async () => {
      await SettingsRepo.set({ legEaseDays: kept, legEase: 'regel', legEaseHow: 'extra' });
      const envelope = await buildBackupEnvelope();
      await wipeAllData();
      expect((await SettingsRepo.get()).legEaseDays).toBeUndefined();
      await importEnvelope(envelope);
      const restored = await SettingsRepo.get();
      expect(restored.legEaseDays).toEqual(kept);
      expect(restored.legEase).toBe('regel');
      expect(restored.legEaseHow).toBe('extra');
    });

    it('a back-up without the field imports as before and leaves the choices on the device alone', async () => {
      const envelope = await buildBackupEnvelope();
      await SettingsRepo.set({ legEaseDays: kept });
      const backup = normalizeBackupToCurrentModel(envelope);
      expect(backup.skippedInvalid).toBe(0);
      expect(backup.settings.legEaseDays).toBeUndefined();
      await importEnvelope(envelope);
      expect((await SettingsRepo.get()).legEaseDays).toEqual(kept);
    });

    it('a restore merges per date and training, the device wins', async () => {
      await SettingsRepo.set({ legEaseDays: [day('2026-10-20', 's1', 'liever-niet'), day('2026-10-19', 's0')] });
      const envelope = await buildBackupEnvelope();
      await SettingsRepo.set({ legEaseDays: [day('2026-10-20', 's1', 'lichter'), day('2026-10-22', 's3')] });
      await importEnvelope(envelope);
      expect((await SettingsRepo.get()).legEaseDays).toEqual([day('2026-10-19', 's0'), day('2026-10-20', 's1', 'lichter'), day('2026-10-22', 's3')]);
    });

    it('drops a damaged record and counts it, keeps the rest of a record with a damaged reason or index', async () => {
      const out = migrateLegEaseDays([day('2026-10-20', 's1'), { date: 'nooit', plannedSessionId: 's2', choice: 'lichter' }, { date: '2026-10-21', plannedSessionId: '', choice: 'lichter' }, { date: '2026-10-22', plannedSessionId: 's3', choice: 'misschien' }, { date: '2026-10-23', plannedSessionId: 's4', choice: 'lichter', reasons: ['spierpijn', 'rommel'], index: 'veel' }]);
      expect(out.list).toHaveLength(2);
      expect(out.list![1]).toMatchObject({ date: '2026-10-23', plannedSessionId: 's4', choice: 'lichter', reasons: ['spierpijn'], index: 0 });
      expect(out.skipped).toBe(3);
      expect(migrateLegEaseDays('oops')).toEqual({ list: undefined, skipped: 1 });
      expect(migrateLegEaseDays(undefined)).toEqual({ list: undefined, skipped: 0 });
      const envelope = await buildBackupEnvelope();
      const backup = normalizeBackupToCurrentModel({ ...envelope, payload: { ...envelope.payload, settings: { legEaseDays: [kept[0], { date: 'nooit' }] } } });
      expect(backup.settings.legEaseDays).toEqual([kept[0]]);
      expect(backup.skippedInvalid).toBe(1);
    });

    it('keeps the newest 60 and one choice per date and training', () => {
      const many = Array.from({ length: 70 }, (_, i) => day(`2026-${i < 35 ? '08' : '09'}-${String((i % 28) + 1).padStart(2, '0')}`, `s${i}`));
      const out = migrateLegEaseDays([...many, { ...many[0], choice: 'liever-niet' }]);
      expect(out.list).toHaveLength(60);
    });
  });

  // Your own sweat weighings (models/sweat.ts): additive in the settings, no schema step.
  describe('sweatEntries (zweetverlies)', () => {
    const entry = (id: string, logId: string, date: string, updatedAt: string, extra: Partial<SweatEntry> = {}): SweatEntry => ({
      id, logId, date, activity: 'walk', durationMinutes: 120, weightBeforeKg: 80, weightAfterKg: 78.8, tempC: 24, updatedAt, ...extra,
    });
    const list = [entry('s1', 'l1', '2026-06-01', '2026-06-01T10:00:00.000Z'), entry('s2', 'l2', '2026-06-08', '2026-06-08T10:00:00.000Z', { activity: 'run' })];

    it('travels in the export and comes back on a clean device', async () => {
      await SettingsRepo.set({ sweatEntries: list, showStageWater: false });
      const envelope = await buildBackupEnvelope();
      expect(envelope.payload.settings.sweatEntries).toEqual(list);
      await wipeAllData();
      expect((await SettingsRepo.get()).sweatEntries).toBeUndefined();
      await importEnvelope(envelope);
      const restored = await SettingsRepo.get();
      expect(restored.sweatEntries).toEqual(list);
      expect(restored.showStageWater).toBe(false);
    });

    it('a back-up without the key imports as before and leaves the weighings on the device alone', async () => {
      const envelope = await buildBackupEnvelope();
      await SettingsRepo.set({ sweatEntries: list });
      const backup = normalizeBackupToCurrentModel(envelope);
      expect(backup.skippedInvalid).toBe(0);
      expect(backup.settings.sweatEntries).toBeUndefined();
      await importEnvelope(envelope);
      expect((await SettingsRepo.get()).sweatEntries).toEqual(list);
    });

    it('a restore merges: the device wins per training and the back-up adds the ones it lacks', async () => {
      await SettingsRepo.set({ sweatEntries: [entry('b1', 'l1', '2026-06-01', '2026-06-05T10:00:00.000Z', { weightAfterKg: 78 }), entry('b3', 'l3', '2026-06-15', '2026-06-15T10:00:00.000Z')] });
      const envelope = await buildBackupEnvelope();
      // On the device: a different (older) weighing for l1 and one for l2.
      await SettingsRepo.set({ sweatEntries: [entry('d1', 'l1', '2026-06-01', '2026-06-01T10:00:00.000Z'), entry('d2', 'l2', '2026-06-08', '2026-06-08T10:00:00.000Z')] });
      await importEnvelope(envelope);
      const merged = (await SettingsRepo.get()).sweatEntries!;
      expect(merged.map((e) => e.id)).toEqual(['d1', 'd2', 'b3']);
      expect(merged[0].weightAfterKg).toBe(78.8);
    });

    it('drops damaged switches and counts them', async () => {
      const envelope = await buildBackupEnvelope();
      const settings = { showStageWater: 'ja', intensityCounting: 'altijd', bootBreakInKm: 120, bootBreakInReminder: 'aan' };
      const backup = normalizeBackupToCurrentModel({ ...envelope, payload: { ...envelope.payload, settings } });
      expect(backup.settings.showStageWater).toBeUndefined();
      expect(backup.settings.intensityCounting).toBeUndefined();
      expect(backup.settings.bootBreakInKm).toBeUndefined();
      expect(backup.settings.bootBreakInReminder).toBeUndefined();
      expect(backup.skippedInvalid).toBe(4);
      const fine = normalizeBackupToCurrentModel({ ...envelope, payload: { ...envelope.payload, settings: { showStageWater: false, intensityCounting: 'plan', bootBreakInKm: 150, bootBreakInReminder: false } } });
      expect(fine.skippedInvalid).toBe(0);
      expect(fine.settings.bootBreakInKm).toBe(150);
    });
  });

  // Your weight from before a training (models/sweat.ts#SweatPre): additive in the settings.
  describe('sweatPre (gewicht van voor de training)', () => {
    const pres = [{ date: '2026-10-26', weightKg: 79.8, updatedAt: '2026-10-26T06:00:00.000Z' }, { date: '2026-10-27', weightKg: 80, updatedAt: '2026-10-27T06:00:00.000Z' }];

    it('travels in the export together with the switch and comes back on a clean device', async () => {
      await SettingsRepo.set({ sweatPre: pres, askSweat: false });
      const envelope = await buildBackupEnvelope();
      expect(envelope.payload.settings.sweatPre).toEqual(pres);
      await wipeAllData();
      expect((await SettingsRepo.get()).sweatPre).toBeUndefined();
      await importEnvelope(envelope);
      const restored = await SettingsRepo.get();
      expect(restored.sweatPre).toEqual(pres);
      expect(restored.askSweat).toBe(false);
    });

    it('an older back-up without the keys imports as before and leaves the device alone', async () => {
      const envelope = await buildBackupEnvelope();
      await SettingsRepo.set({ sweatPre: pres });
      const backup = normalizeBackupToCurrentModel(envelope);
      expect(backup.skippedInvalid).toBe(0);
      expect(backup.settings.sweatPre).toBeUndefined();
      expect(backup.settings.askSweat).toBeUndefined();
      await importEnvelope(envelope);
      const restored = await SettingsRepo.get();
      expect(restored.sweatPre).toEqual(pres);
      expect(restored.askSweat).toBeUndefined();
    });

    it('drops damaged records and a damaged switch and counts them', async () => {
      const envelope = await buildBackupEnvelope();
      const settings = { sweatPre: [pres[1], { date: 'nooit', weightKg: 80 }, { date: '2026-10-25', weightKg: 5 }, { date: '2026-10-24', weightKg: '80' }], askSweat: 'ja' };
      const backup = normalizeBackupToCurrentModel({ ...envelope, payload: { ...envelope.payload, settings } });
      expect(backup.settings.sweatPre).toEqual([pres[1]]);
      expect(backup.settings.askSweat).toBeUndefined();
      expect(backup.skippedInvalid).toBe(4);
      const notAList = normalizeBackupToCurrentModel({ ...envelope, payload: { ...envelope.payload, settings: { sweatPre: 'oops' } } });
      expect(notAList.settings.sweatPre).toBeUndefined();
    });

    it('a restore merges per day and the device wins', async () => {
      await SettingsRepo.set({ sweatPre: [{ ...pres[0], weightKg: 70 }, { date: '2026-10-20', weightKg: 79, updatedAt: '2026-10-20T06:00:00.000Z' }] });
      const envelope = await buildBackupEnvelope();
      await SettingsRepo.set({ sweatPre: pres });
      await importEnvelope(envelope);
      const merged = (await SettingsRepo.get()).sweatPre!;
      expect(merged.map((p) => p.date)).toEqual(['2026-10-20', '2026-10-26', '2026-10-27']);
      expect(merged[1].weightKg).toBe(79.8);
    });
  });

  // "Wat speelde er" (models/influence.ts): additive in the settings, no schema step.
  describe('influences (wat speelde er)', () => {
    const note = (id: string, date: string, updatedAt: string, extra: Partial<InfluenceEntry> = {}): InfluenceEntry => ({ id, date, reasons: [{ reason: 'alcohol', amount: 'matig' }], updatedAt, ...extra });
    const notes = [note('a', '2026-10-20', '2026-10-21T08:00:00.000Z', { logId: 'l1', excludeHeartRate: true }), note('b', '2026-10-22', '2026-10-23T08:00:00.000Z')];

    it('round-trips through export and a full restore onto a clean device', async () => {
      await SettingsRepo.set({ influences: notes, influenceSign: false });
      const envelope = await buildBackupEnvelope();
      await wipeAllData();
      expect((await SettingsRepo.get()).influences).toBeUndefined();
      await importEnvelope(envelope);
      const restored = await SettingsRepo.get();
      expect(restored.influences).toEqual(notes);
      expect(restored.influenceSign).toBe(false);
    });

    it('a back-up without the field imports as before and leaves the notes on the device alone', async () => {
      const envelope = await buildBackupEnvelope();
      await SettingsRepo.set({ influences: notes });
      const backup = normalizeBackupToCurrentModel(envelope);
      expect(backup.skippedInvalid).toBe(0);
      expect(backup.settings.influences).toBeUndefined();
      await importEnvelope(envelope);
      expect((await SettingsRepo.get()).influences).toEqual(notes);
    });

    it('a restore merges per id: the newest updatedAt wins, on a tie the device', async () => {
      await SettingsRepo.set({ influences: [note('a', '2026-10-20', '2026-10-21T08:00:00.000Z', { excludeHeartRate: true }), note('b', '2026-10-22', '2026-10-23T08:00:00.000Z'), note('c', '2026-10-24', '2026-10-24T08:00:00.000Z')] });
      const envelope = await buildBackupEnvelope();
      const device = [
        note('a', '2026-10-20', '2026-10-21T09:00:00.000Z'),
        note('b', '2026-10-22', '2026-10-23T08:00:00.000Z', { reasons: [{ reason: 'wiet' }] }),
        note('c', '2026-10-24', '2026-10-24T07:00:00.000Z', { reasons: [{ reason: 'stress' }] }),
        note('d', '2026-10-25', '2026-10-25T08:00:00.000Z'),
      ];
      await SettingsRepo.set({ influences: device });
      await importEnvelope(envelope);
      const list = (await SettingsRepo.get()).influences!;
      expect(list.map((e) => e.id)).toEqual(['a', 'b', 'c', 'd']);
      expect(list[0].excludeHeartRate).toBeUndefined(); // device is newer
      expect(list[1].reasons).toEqual([{ reason: 'wiet' }]); // tie: device
      expect(list[2].reasons).toEqual([{ reason: 'alcohol', amount: 'matig' }]); // backup is newer
    });

    it('drops damaged notes and counts them, a damaged amount or label loses only itself', () => {
      const out = migrateInfluences([
        notes[0],
        { id: '', date: '2026-10-20', reasons: [], updatedAt: '2026-10-20T08:00:00.000Z' },
        { id: 'x', date: '2026-13-45', reasons: [], updatedAt: '2026-10-20T08:00:00.000Z' },
        { id: 'y', date: '2026-10-21', reasons: 'oops', updatedAt: '2026-10-20T08:00:00.000Z' },
        'oops',
        { id: 'z', date: '2026-10-23', updatedAt: '2026-10-23T08:00:00.000Z', reasons: [{ reason: 'alcohol', amount: 'enorm' }, { reason: 'bier' }, { reason: 'anders', label: 'a'.repeat(60) }, { reason: 'wiet', label: 5 }, { reason: 'stress' }] },
      ]);
      expect(out.list).toHaveLength(2);
      const z = out.list!.find((e) => e.id === 'z')!;
      expect(z.reasons.map((r) => r.reason)).toEqual(['alcohol', 'anders', 'wiet', 'stress']);
      expect(z.reasons[0].amount).toBeUndefined();
      expect(z.reasons[1].label).toHaveLength(40);
      expect(z.reasons[2].label).toBeUndefined();
      expect(out.skipped).toBe(4 + 3);
      expect(migrateInfluences('oops')).toEqual({ list: undefined, skipped: 1 });
      expect(migrateInfluences(undefined)).toEqual({ list: undefined, skipped: 0 });
    });

    it('keeps one note per place after a restore and after a read, the newest wins', async () => {
      await SettingsRepo.set({ influences: [note('x', '2026-10-20', '2026-10-21T08:00:00.000Z', { logId: 'l9' }), note('d1', '2026-10-22', '2026-10-22T08:00:00.000Z')] });
      const envelope = await buildBackupEnvelope();
      await SettingsRepo.set({ influences: [note('y', '2026-10-20', '2026-10-23T08:00:00.000Z', { logId: 'l9', excludeHeartRate: true }), note('d2', '2026-10-22', '2026-10-21T08:00:00.000Z')] });
      await importEnvelope(envelope);
      const list = (await SettingsRepo.get()).influences!;
      expect(list.map((e) => e.id).sort()).toEqual(['d1', 'y']);
      const read = migrateInfluences([note('a', '2026-10-22', '2026-10-22T08:00:00.000Z'), note('b', '2026-10-22', '2026-10-23T08:00:00.000Z'), note('c', '2026-10-22', '2026-10-23T08:00:00.000Z', { logId: 'l1' })]);
      expect(read.list!.map((e) => e.id).sort()).toEqual(['b', 'c']);
      expect(read.skipped).toBe(1);
    });

    it('lets only a yes or no through for the switches, and one of three words for the cause', async () => {
      const envelope = await buildBackupEnvelope();
      const bad = normalizeBackupToCurrentModel({ ...envelope, payload: { ...envelope.payload, settings: { influenceSign: 'ja', influenceOverview: 1, influenceTestMove: null, influenceCause: 'misschien' } } });
      expect(bad.settings.influenceSign).toBeUndefined();
      expect(bad.settings.influenceOverview).toBeUndefined();
      expect(bad.settings.influenceTestMove).toBeUndefined();
      expect(normalizeBackupToCurrentModel({ ...envelope, payload: { ...envelope.payload, settings: { influenceNames: 'nee' } } }).settings.influenceNames).toBeUndefined();
      expect(normalizeBackupToCurrentModel({ ...envelope, payload: { ...envelope.payload, settings: { influenceNames: false } } }).settings.influenceNames).toBe(false);
      expect(bad.settings.influenceCause).toBeUndefined();
      expect(bad.skippedInvalid).toBe(4);
      const good = normalizeBackupToCurrentModel({ ...envelope, payload: { ...envelope.payload, settings: { influenceSign: false, influenceOverview: true, influenceTestMove: false, influenceCause: 'weet' } } });
      expect(good.settings).toMatchObject({ influenceSign: false, influenceOverview: true, influenceTestMove: false, influenceCause: 'weet' });
      expect(good.skippedInvalid).toBe(0);
    });

    it('keeps the newest of two records with one id', () => {
      const out = migrateInfluences([note('a', '2026-10-20', '2026-10-22T08:00:00.000Z', { excludeHeartRate: true }), note('a', '2026-10-20', '2026-10-21T08:00:00.000Z')]);
      expect(out.list).toHaveLength(1);
      expect(out.list![0].excludeHeartRate).toBe(true);
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

describe('meer per set in een back-up (rir, kind en rirAssumed)', () => {
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

  it('rirAssumed survives export and import, and a log without it reads as measured', async () => {
    const withMark = [{ exerciseId: 'sq', exerciseName: 'Squat', sets: [{ reps: 6, weightKg: 100, rir: 2, kind: 'work' as const, rirAssumed: true }, { reps: 6, weightKg: 100, rir: 1, kind: 'work' as const }] }];
    await SessionLogsRepo.put(baseLog('mark', withMark));
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    expect(envelope.payload.sessionLogs[0].strengthData).toEqual(withMark);
    await wipeAllData();
    await restore(envelope);
    const sets = (await SessionLogsRepo.getAll())[0].strengthData![0].sets;
    expect(sets[0].rirAssumed).toBe(true);
    expect(sets[1].rirAssumed).toBeUndefined();
  });

  it('a damaged rirAssumed is dropped, also without a rir', () => {
    const damaged = [{ exerciseId: 'sq', exerciseName: 'Squat', sets: [{ reps: 6, rir: 2, rirAssumed: 'ja' }, { reps: 5, rirAssumed: true }, { reps: 4, rir: 1, rirAssumed: false }] }];
    const backup = normalizeBackupToCurrentModel(flat([baseLog('bad2', damaged as never)]));
    expect(backup.sessionLogs[0].strengthData![0].sets).toEqual([{ reps: 6, rir: 2 }, { reps: 5 }, { reps: 4, rir: 1 }]);
  });

  it('a damaged rir or kind is dropped, the reps and weight stay', () => {
    const damaged = [{ exerciseId: 'sq', exerciseName: 'Squat', sets: [{ reps: 6, weightKg: 100, rir: 'veel', kind: 'zwaar' }, { reps: 5, rir: 11 }, { reps: 4, rir: -1 }] }];
    const backup = normalizeBackupToCurrentModel(flat([baseLog('bad', damaged as never)]));
    expect(backup.sessionLogs[0].strengthData![0].sets).toEqual([{ reps: 6, weightKg: 100 }, { reps: 5 }, { reps: 4 }]);
  });
});

describe('foutzinnen voor de gebruiker', () => {
  it('een eigen zin van ASCEND komt in beeld, een andere fout wordt de vaste zin', () => {
    let own: unknown;
    try { parseBackupText('{"backupSchemaVersion": 4, "payl'); } catch (e) { own = e; }
    expect(backupErrorText(own, 'vast')).toMatch(/beschadigd of onvolledig/);
    expect(backupErrorText(new Error('QuotaExceededError'), 'vast')).toBe('vast');
  });
});

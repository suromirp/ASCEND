import { beforeEach, describe, expect, it } from 'vitest';
import { GoalMilestoneProgressRepo, GoalMilestonesRepo, SessionLogsRepo, SessionTemplatesRepo, TrainingGoalsRepo, wipeAllData } from './database';
import { applyStrengthTakeovers, restoreStrengthTakeovers } from './macrofactorLead';
import { getMacroFactorState, setMacroFactorLeads, setMappings, getMapping, importMacroFactorText } from './macrofactor';
import { recordClearedMilestones } from './milestoneClearing';
import { buildBackupEnvelope, normalizeBackupToCurrentModel } from './backup';
import { migrateLogManualMeasured, migrateManualMeasured } from './migrations';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { readMacroFactorCsv } from '../engine/macrofactorImport';
import { planMacroFactor } from '../engine/macrofactorLink';
import type { SessionLog } from '../models/training';
import csv from '../engine/fixtures/macrofactor-workout-log.csv?raw';

// Made-up export, made-up logs.
const { templates } = buildDefaultProgramData();
const workouts = readMacroFactorCsv(csv).workouts;
const lower = workouts.find((w) => w.name === 'Lower A')!;
const upper = workouts.find((w) => w.name === 'Upper A')!;
const NOW = new Date('2026-10-22T08:00:00.000Z');

const mine = (extra: Partial<SessionLog> = {}): SessionLog => ({
  id: 'log_1', templateId: 'tpl_lower_a', type: 'strength', completedDate: '2026-10-14', completedAt: '2026-10-14T18:00:00.000Z',
  variant: 'full', durationMinutes: 45, rpe: 8, subjectiveFeel: 'normal', notes: 'Zwaar', source: 'manual', ...extra,
});

async function seedTemplates() {
  for (const t of templates) await SessionTemplatesRepo.put(t);
}

describe('applying and putting back', () => {
  beforeEach(async () => {
    await wipeAllData();
    await seedTemplates();
  });

  it('takes over the numbers, ties the workout, and writes nothing the second time', async () => {
    await SessionLogsRepo.put(mine());
    const request = { logId: 'log_1', workout: lower, templateId: 'tpl_lower_a' };
    const outcome = await applyStrengthTakeovers([request], NOW);
    expect(outcome.moments).toEqual([{ logId: 'log_1', clearedTitle: undefined }]);
    expect(outcome.lines).toEqual(['Benen A (zwaar) 14 oktober: duur 45 min wordt 1 uur 2 min, 13 sets komen erbij, herhalingen in reserve 1 komt erbij']);
    const [stored] = await SessionLogsRepo.getAll();
    expect(stored).toMatchObject({ durationMinutes: 62, strengthRir: 1, externalId: lower.externalId, source: 'macrofactor', rpe: 8, notes: 'Zwaar' });
    expect(stored.manualMeasured?.values).toEqual({ durationMinutes: 45 });

    expect((await applyStrengthTakeovers([request], NOW)).moments).toEqual([]);
    expect(await SessionLogsRepo.getAll()).toEqual([stored]);
  });

  it('never ties one workout to a second log, and ignores a log that is gone', async () => {
    await SessionLogsRepo.put(mine());
    await SessionLogsRepo.put(mine({ id: 'log_2', completedDate: '2026-10-15' }));
    const outcome = await applyStrengthTakeovers(
      [
        { logId: 'log_1', workout: lower, templateId: 'tpl_lower_a' },
        { logId: 'log_2', workout: lower, templateId: 'tpl_lower_a' },
        { logId: 'weg', workout: upper, templateId: 'tpl_upper_a' },
      ],
      NOW,
    );
    expect(outcome.moments.map((m) => m.logId)).toEqual(['log_1']);
    expect((await SessionLogsRepo.getAll()).find((l) => l.id === 'log_2')?.manualMeasured).toBeUndefined();
  });

  it('puts the own numbers back, offers the workout no more, and keeps what was added since', async () => {
    await SessionLogsRepo.put(mine());
    await applyStrengthTakeovers([{ logId: 'log_1', workout: lower, templateId: 'tpl_lower_a' }], NOW);
    const [taken] = await SessionLogsRepo.getAll();
    await SessionLogsRepo.put({ ...taken, notes: 'Zwaar, achteraf aangevuld' });

    expect(await restoreStrengthTakeovers(['log_1', 'weg'])).toBe(1);
    const [back] = await SessionLogsRepo.getAll();
    expect(back).toEqual(mine({ notes: 'Zwaar, achteraf aangevuld' }));
    expect((await getMacroFactorState()).dismissed).toEqual([lower.externalId]);

    // The same workout is not offered again, and a second restore does nothing.
    const { proposals, alreadyDone } = planMacroFactor([lower], { 'lower a': 'tpl_lower_a' }, (await getMacroFactorState()).dismissed, [], templates, [back]);
    expect(proposals).toEqual([]);
    expect(alreadyDone).toBe(1);
    expect(await restoreStrengthTakeovers(['log_1'])).toBe(0);
  });

  it('takes over several logs in one go, in order', async () => {
    await SessionLogsRepo.put(mine());
    await SessionLogsRepo.put(mine({ id: 'log_u', templateId: 'tpl_upper_a', completedDate: '2026-10-12', durationMinutes: 50 }));
    const outcome = await applyStrengthTakeovers(
      [
        { logId: 'log_u', workout: upper, templateId: 'tpl_upper_a' },
        { logId: 'log_1', workout: lower, templateId: 'tpl_lower_a' },
      ],
      NOW,
    );
    expect(outcome.moments.map((m) => m.logId)).toEqual(['log_u', 'log_1']);
    // An upper body day gets no reps in reserve.
    expect((await SessionLogsRepo.getAll()).find((l) => l.id === 'log_u')?.strengthRir).toBeUndefined();
  });
});

describe('the milestones', () => {
  const goal = {
    id: 'g1', name: 'Testdoel', requirements: [], createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    status: 'active' as const, targetDate: '2027-06-01',
  };

  beforeEach(async () => {
    await wipeAllData();
    await seedTemplates();
    await TrainingGoalsRepo.put(goal);
    await GoalMilestonesRepo.put({ id: 'm1', goalId: 'g1', order: 1, title: 'Een uur kracht', requirement: { kind: 'duration', activityType: 'strength', minMinutes: 60 } });
    await GoalMilestonesRepo.put({ id: 'm2', goalId: 'g1', order: 2, title: 'Twee uur kracht', requirement: { kind: 'duration', activityType: 'strength', minMinutes: 120 } });
  });

  it('records a milestone only the file reaches, once, and takes it away with the numbers', async () => {
    await SessionLogsRepo.put(mine());
    const outcome = await applyStrengthTakeovers([{ logId: 'log_1', workout: lower, templateId: 'tpl_lower_a' }], NOW);
    expect(outcome.moments[0].clearedTitle).toBe('Een uur kracht');
    const rows = await GoalMilestoneProgressRepo.getAll();
    expect(rows).toEqual([expect.objectContaining({ milestoneId: 'm1', sourceSessionLogId: 'log_1', clearedDate: '2026-10-14' })]);
    expect((await SessionLogsRepo.getAll())[0].manualMeasured?.clearedProgressIds).toEqual([rows[0].id]);

    // Nothing is written twice.
    await applyStrengthTakeovers([{ logId: 'log_1', workout: lower, templateId: 'tpl_lower_a' }], NOW);
    expect(await GoalMilestoneProgressRepo.getAll()).toHaveLength(1);

    await restoreStrengthTakeovers(['log_1']);
    expect(await GoalMilestoneProgressRepo.getAll()).toEqual([]);
    expect((await SessionLogsRepo.getAll())[0].durationMinutes).toBe(45);
  });

  it('keeps a milestone the own numbers had reached, also after putting back', async () => {
    const long = mine({ durationMinutes: 90 });
    await SessionLogsRepo.put(long);
    await recordClearedMilestones(long);
    const before = await GoalMilestoneProgressRepo.getAll();
    expect(before).toHaveLength(1);
    // The file measured 62 minutes: still more than the hour, nothing new.
    const outcome = await applyStrengthTakeovers([{ logId: 'log_1', workout: lower, templateId: 'tpl_lower_a' }], NOW);
    expect(outcome.moments[0].clearedTitle).toBeUndefined();
    expect(await GoalMilestoneProgressRepo.getAll()).toEqual(before);
    await restoreStrengthTakeovers(['log_1']);
    expect(await GoalMilestoneProgressRepo.getAll()).toEqual(before);
  });

  it('writes a milestone fresh when two workouts follow each other, never the same one twice', async () => {
    await SessionLogsRepo.put(mine({ id: 'a', completedDate: '2026-10-14' }));
    await SessionLogsRepo.put(mine({ id: 'b', completedDate: '2026-10-15' }));
    const second = { ...lower, externalId: 'macrofactor:2026-10-15:lower a', date: '2026-10-15', start: '2026-10-15T12:00:00' };
    await applyStrengthTakeovers(
      [
        { logId: 'a', workout: lower, templateId: 'tpl_lower_a' },
        { logId: 'b', workout: second, templateId: 'tpl_lower_a' },
      ],
      NOW,
    );
    // 62 minutes reaches the first milestone with the first log; the second log has nothing new.
    expect((await GoalMilestoneProgressRepo.getAll()).map((r) => r.milestoneId)).toEqual(['m1']);
  });
});

describe('the switch and the names', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  it('is on until it is switched off, and is kept on this phone only', async () => {
    expect((await getMacroFactorState()).leads).toBe(true);
    await setMacroFactorLeads(false);
    expect((await getMacroFactorState()).leads).toBe(false);
    await importMacroFactorText(csv);
    expect((await getMacroFactorState()).leads).toBe(false);
    await setMacroFactorLeads(true);
    expect((await getMacroFactorState()).leads).toBe(true);
    expect(JSON.stringify(await buildBackupEnvelope())).not.toContain('leads');
  });

  it('keeps all confirmed names in one go, per name and not per training', async () => {
    await setMappings([
      { name: ' Upper/Lower Split Voorbeeld (Workout A) ', templateId: 'tpl_lower_a' },
      { name: 'Upper/Lower Split Voorbeeld (Workout B)', templateId: 'tpl_upper_a' },
      { name: 'Arms', templateId: null },
    ]);
    expect(await getMapping()).toEqual({
      'upper/lower split voorbeeld (workout a)': 'tpl_lower_a',
      'upper/lower split voorbeeld (workout b)': 'tpl_upper_a',
      arms: null,
    });
    await setMappings([]);
    expect(Object.keys(await getMapping())).toHaveLength(3);
  });
});

describe('the stored shape', () => {
  beforeEach(async () => {
    await wipeAllData();
    await seedTemplates();
  });

  it('travels in the export and reads back whole', async () => {
    await SessionLogsRepo.put(mine({ strengthRir: 3 }));
    await applyStrengthTakeovers([{ logId: 'log_1', workout: lower, templateId: 'tpl_lower_a' }], NOW);
    const text = JSON.stringify(await buildBackupEnvelope());
    const log = normalizeBackupToCurrentModel(JSON.parse(text)).sessionLogs.find((l) => l.id === 'log_1')!;
    expect(log.manualMeasured?.strength).toMatchObject({ workoutId: lower.externalId, strengthData: null, strengthRir: 3, tied: { source: 'manual' } });
    expect(log.manualMeasured?.values.durationMinutes).toBe(45);
  });

  it('drops only a damaged strength field and keeps the log', () => {
    const whole = { at: NOW.toISOString(), values: { durationMinutes: 45 }, strength: { workoutId: 'macrofactor:x', strengthData: null, strengthRir: 2.5, tied: { source: 'manual' } } };
    expect(migrateManualMeasured(whole)).toEqual(whole);
    expect(migrateManualMeasured({ ...whole, strength: { workoutId: 5 } })).toBeUndefined();
    expect(migrateManualMeasured({ ...whole, strength: { workoutId: 'x', strengthData: 'kapot' } })).toBeUndefined();
    expect(migrateManualMeasured({ ...whole, strength: { workoutId: 'x', strengthRir: 'veel' } })).toBeUndefined();
    // Without a strength part a block is still required, as it was.
    expect(migrateManualMeasured({ at: 'x', values: {} })).toBeUndefined();
    const damaged = { ...mine(), manualMeasured: { ...whole, strength: { workoutId: 5 } } } as unknown as SessionLog;
    expect(migrateLogManualMeasured(damaged)).toEqual(mine());
  });
});

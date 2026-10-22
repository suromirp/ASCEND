import { describe, it, expect, beforeEach } from 'vitest';
import { MetaRepo, SessionLogsRepo, SettingsRepo, wipeAllData } from './database';
import {
  clearMacroFactorWorkouts,
  dismissWorkout,
  fillInLog,
  forgetMapping,
  getMacroFactorState,
  getMapping,
  importMacroFactorText,
  onMacroFactorChange,
  setMapping,
} from './macrofactor';
import { buildBackupEnvelope } from './backup';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { MacroFactorFormatError, readMacroFactorCsv } from '../engine/macrofactorImport';
import type { SessionLog } from '../models/training';
import csv from '../engine/fixtures/macrofactor-workout-log.csv?raw';

const { templates } = buildDefaultProgramData();
const lowerA = templates.find((t) => t.id === 'tpl_lower_a')!;
const lowerWorkout = readMacroFactorCsv(csv).workouts.find((w) => w.name === 'Lower A')!;

describe('the file', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  it('is read and kept, so the card survives a restart', async () => {
    expect(await getMacroFactorState()).toEqual({ readAt: undefined, fileName: undefined, workouts: [], dismissed: [], leads: true });
    const result = await importMacroFactorText(csv, 'workout-log.csv', new Date('2026-10-19T08:00:00.000Z'));
    expect(result.count).toBe(4);
    const state = await getMacroFactorState();
    expect(state.workouts).toHaveLength(4);
    expect(state).toMatchObject({ fileName: 'workout-log.csv', readAt: '2026-10-19T08:00:00.000Z' });
  });

  it('refuses a wrong file with a Dutch message and keeps what was there', async () => {
    await importMacroFactorText(csv);
    await expect(importMacroFactorText('Date,Calories\n2026-10-12,2400\n')).rejects.toBeInstanceOf(MacroFactorFormatError);
    expect((await getMacroFactorState()).workouts).toHaveLength(4);
  });

  it('remembers "Niet opslaan" and can be cleared', async () => {
    await importMacroFactorText(csv);
    await dismissWorkout(lowerWorkout.externalId);
    await dismissWorkout(lowerWorkout.externalId);
    expect((await getMacroFactorState()).dismissed).toEqual([lowerWorkout.externalId]);
    await clearMacroFactorWorkouts();
    const state = await getMacroFactorState();
    expect(state.workouts).toEqual([]);
    expect(state.dismissed).toEqual([lowerWorkout.externalId]);
  });

  it('tells a listener when something changed', async () => {
    let calls = 0;
    const stop = onMacroFactorChange(() => calls++);
    await importMacroFactorText(csv);
    await setMapping('Lower A', 'tpl_lower_a');
    stop();
    await dismissWorkout('x');
    expect(calls).toBe(2);
  });
});

describe('the naming choice', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  it('is kept per name, without regard to case or spaces, and can be forgotten', async () => {
    await setMapping('  Lower   A ', 'tpl_lower_a');
    await setMapping('Arms', null);
    expect(await getMapping()).toEqual({ 'lower a': 'tpl_lower_a', arms: null });
    await forgetMapping('LOWER A');
    expect(await getMapping()).toEqual({ arms: null });
  });
});

describe('filling in a log', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  const ticked: SessionLog = {
    id: 'log_t', plannedSessionId: 'p1', templateId: 'tpl_lower_a', type: 'strength', completedDate: '2026-10-14', completedAt: '2026-10-14T18:00:00.000Z',
    variant: 'full', durationMinutes: 75, rpe: 9, subjectiveFeel: 'worse', source: 'manual',
  };

  it('adds the empty fields and keeps everything that had a value', async () => {
    await SessionLogsRepo.put(ticked);
    expect(await fillInLog('log_t', lowerWorkout, lowerA)).toBe(true);
    const [stored] = await SessionLogsRepo.getAll();
    expect(stored).toMatchObject({ ...ticked, strengthRir: 1, externalId: lowerWorkout.externalId });
    expect(stored.strengthData).toHaveLength(4);
    expect(stored.durationMinutes).toBe(75);
    expect(stored.source).toBe('manual');
    // A second time there is nothing left to fill.
    expect(await fillInLog('log_t', lowerWorkout, lowerA)).toBe(false);
  });

  it('does not overwrite a field that was filled in since the card was drawn', async () => {
    await SessionLogsRepo.put({ ...ticked, strengthRir: 4 });
    await fillInLog('log_t', lowerWorkout, lowerA);
    expect((await SessionLogsRepo.getAll())[0].strengthRir).toBe(4);
  });

  it('does nothing for a log that is gone', async () => {
    expect(await fillInLog('weg', lowerWorkout, lowerA)).toBe(false);
  });
});

describe('what stays on this phone', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  it('is in neither the backup envelope nor the settings', async () => {
    await importMacroFactorText(csv, 'geheim-bestand.csv');
    await setMapping('Upper A', 'tpl_upper_a');
    await dismissWorkout('macrofactor:2026-10-12:upper a');
    await SettingsRepo.set({ strengthTrackedExternally: true });
    const text = JSON.stringify(await buildBackupEnvelope());
    expect(text).not.toContain('macrofactor');
    expect(text).not.toContain('geheim-bestand');
    expect(text).not.toContain('Back Squat');
    expect(JSON.stringify(await SettingsRepo.get())).not.toContain('macrofactor');
    expect(await MetaRepo.get('macrofactorMapping')).toEqual({ 'upper a': 'tpl_upper_a' });
  });

  it('keeps a log made from the file, with its id, in the export', async () => {
    const log: SessionLog = {
      id: 'log_m', templateId: 'tpl_lower_a', type: 'strength', completedDate: '2026-10-14', completedAt: '2026-10-14T19:00:00.000Z',
      variant: 'custom', durationMinutes: 62, strengthRir: 1, externalId: lowerWorkout.externalId, source: 'macrofactor',
    };
    await SessionLogsRepo.put(log);
    const envelope = await buildBackupEnvelope();
    expect(JSON.stringify(envelope)).toContain(lowerWorkout.externalId);
  });
});

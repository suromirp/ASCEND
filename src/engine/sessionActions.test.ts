import { describe, it, expect } from 'vitest';
import { macroFactorLine, pendingMacroFactorWorkout, previewDayLine, sessionSheetActions, strengthDoneDuration, QUICK_RPE_SCALE } from './sessionActions';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { resolveProgramWeek } from '../utils/dates';
import type { SessionLog } from '../models/training';
import type { MacroFactorWorkout } from './macrofactorImport';

const TODAY = '2026-10-22';

describe('sessionSheetActions', () => {
  it('never offers ticking off as the main choice for a day still to come', () => {
    for (const kind of ['quick', 'inApp', 'log'] as const) {
      const a = sessionSheetActions({ date: '2026-10-23', today: TODAY, skipped: false, canComeBack: false, kind });
      expect(a.main).toBe('move');
      expect(a.rows).toEqual(['preview', 'doToday', 'skip']);
    }
  });

  it('"Hoe je het doet" opens ahead only for a training of a day still to come that is not skipped', () => {
    const rowsOf = (over: Partial<Parameters<typeof sessionSheetActions>[0]>) => sessionSheetActions({ date: '2026-10-23', today: TODAY, skipped: false, canComeBack: false, kind: 'log', ...over }).rows;
    expect(rowsOf({})).toContain('preview');
    expect(rowsOf({ kind: 'inApp' })).toContain('preview');
    expect(rowsOf({ date: TODAY })).not.toContain('preview');
    expect(rowsOf({ date: '2026-10-20' })).not.toContain('preview');
    expect(rowsOf({ skipped: true, canComeBack: true })).not.toContain('preview');
  });

  it('today: strength in MacroFactor and a run are ticked off, strength in ASCEND is started', () => {
    expect(sessionSheetActions({ date: TODAY, today: TODAY, skipped: false, canComeBack: false, kind: 'quick' })).toEqual({ main: 'done', rows: ['move', 'skip'] });
    expect(sessionSheetActions({ date: TODAY, today: TODAY, skipped: false, canComeBack: false, kind: 'inApp' })).toEqual({ main: 'start', rows: ['move', 'skip'] });
    expect(sessionSheetActions({ date: TODAY, today: TODAY, skipped: false, canComeBack: false, kind: 'log' })).toEqual({ main: 'done', rows: ['start', 'move', 'skip'] });
  });

  it('a day that is over is still ticked off afterwards', () => {
    expect(sessionSheetActions({ date: '2026-10-21', today: TODAY, skipped: false, canComeBack: false, kind: 'quick' }).main).toBe('done');
  });

  it('a skipped training: back on its day when it can, else moved; never skipped twice', () => {
    expect(sessionSheetActions({ date: '2026-10-24', today: TODAY, skipped: true, canComeBack: true, kind: 'log' })).toEqual({ main: 'backOnPlan', rows: ['move'] });
    expect(sessionSheetActions({ date: '2026-10-20', today: TODAY, skipped: true, canComeBack: false, kind: 'log' })).toEqual({ main: 'move', rows: ['done'] });
    expect(sessionSheetActions({ date: '2026-10-20', today: TODAY, skipped: true, canComeBack: false, kind: 'inApp' })).toEqual({ main: 'move', rows: ['start'] });
  });
});

describe('previewDayLine: de dag en week van de training zelf', () => {
  const { program } = buildDefaultProgramData();

  it('noemt de weekdag, de datum en de week van het programma op die dag, niet van vandaag', () => {
    const date = '2026-10-29';
    const position = resolveProgramWeek(program, date)!;
    expect(position).toBeTruthy();
    const line = previewDayLine(date, program);
    // formatDateNL zet het jaartal erbij als het niet dit jaar is: daarom toContain.
    expect(line).toContain('Donderdag 29 oktober');
    expect(line).toContain(`Week ${position.weekInPhase} van ${position.phase.weekCount}, ${position.phase.name.toLowerCase()}`);
    // Een week later hoort een andere regel.
    expect(previewDayLine('2026-11-05', program)).not.toBe(line);
  });

  it('zonder programma, of buiten het programma, alleen de dag', () => {
    expect(previewDayLine('2026-10-29', null)).toContain('Donderdag 29 oktober');
    expect(previewDayLine('2026-10-29', null)).not.toContain('Week');
    expect(previewDayLine('2020-01-06', program)).toBe('Maandag 6 januari 2020');
  });
});

describe('strengthDoneDuration', () => {
  const workout = (over: Partial<MacroFactorWorkout> = {}): MacroFactorWorkout => ({ externalId: 'macrofactor:2026-10-22:upper b', date: TODAY, start: `${TODAY}T18:00:00`, name: 'Upper B', durationSec: 52 * 60 + 20, exercises: [], setCount: 12, ...over });
  const mf = (w: MacroFactorWorkout[], dismissed: string[] = []) => ({ workouts: w, mapping: { 'upper b': 'tpl_upper_b' }, dismissed });
  const session = { scheduledDate: TODAY };
  const template = { id: 'tpl_upper_b' };

  it('without a MacroFactor workout, the planned minutes as a proposal', () => {
    expect(strengthDoneDuration(session, template, 75)).toEqual({ minutes: 75, source: 'plan' });
    expect(strengthDoneDuration(session, template, 75, mf([]))).toEqual({ minutes: 75, source: 'plan' });
  });

  it('with the workout of that day and that training, its own minutes', () => {
    expect(strengthDoneDuration(session, template, 75, mf([workout()]))).toEqual({ minutes: 52, source: 'macrofactor' });
  });

  it('not another day, another training, one already saved or turned down, or one without a length', () => {
    expect(strengthDoneDuration(session, template, 75, mf([workout({ date: '2026-10-21' })])).source).toBe('plan');
    expect(strengthDoneDuration(session, { id: 'tpl_upper_a' }, 75, mf([workout()])).source).toBe('plan');
    expect(strengthDoneDuration(session, template, 75, mf([workout()]), [{ externalId: 'macrofactor:2026-10-22:upper b' }]).source).toBe('plan');
    expect(strengthDoneDuration(session, template, 75, mf([workout()], ['macrofactor:2026-10-22:upper b'])).source).toBe('plan');
    expect(strengthDoneDuration(session, template, 75, mf([workout({ durationSec: undefined })])).source).toBe('plan');
  });

  it('the effort scale fits one row of 44 px cells at 360 px', () => {
    expect(QUICK_RPE_SCALE.length * 44).toBeLessThanOrEqual(360 - 32);
    expect(QUICK_RPE_SCALE[QUICK_RPE_SCALE.length - 1]).toBe(10);
  });
});

describe('a MacroFactor workout that is already there', () => {
  const workout: MacroFactorWorkout = { externalId: 'macrofactor:2026-10-22:upper b', date: TODAY, start: `${TODAY}T18:00:00`, name: 'Upper B', durationSec: 50 * 60, exercises: [], setCount: 18 };
  const mf = { workouts: [workout], mapping: { 'upper b': 'tpl_upper_b' }, dismissed: [] };

  it('replaces "Gedaan" with saving it, today or after; not for a day still to come', () => {
    expect(sessionSheetActions({ date: TODAY, today: TODAY, skipped: false, canComeBack: false, kind: 'quick', workoutWaiting: true })).toEqual({ main: 'saveWorkout', rows: ['done', 'move'] });
    expect(sessionSheetActions({ date: '2026-10-23', today: TODAY, skipped: false, canComeBack: false, kind: 'quick', workoutWaiting: true }).main).toBe('move');
  });

  it('is found for its training and day only, and not once saved', () => {
    expect(pendingMacroFactorWorkout(TODAY, 'tpl_upper_b', mf)?.externalId).toBe(workout.externalId);
    expect(pendingMacroFactorWorkout(TODAY, 'tpl_upper_a', mf)).toBeUndefined();
    expect(pendingMacroFactorWorkout(TODAY, 'tpl_upper_b', mf, [{ externalId: workout.externalId }])).toBeUndefined();
    expect(pendingMacroFactorWorkout(TODAY, 'tpl_upper_b', undefined)).toBeUndefined();
  });

  it('is not offered again when a log took over its numbers, or the same training is already logged that week', () => {
    const took = { externalId: 'garmin:1', manualMeasured: { strength: { workoutId: workout.externalId } } } as unknown as NonNullable<Parameters<typeof pendingMacroFactorWorkout>[3]>[number];
    expect(pendingMacroFactorWorkout(TODAY, 'tpl_upper_b', mf, [took])).toBeUndefined();
    expect(pendingMacroFactorWorkout(TODAY, 'tpl_upper_b', mf, [{ externalId: undefined, templateId: 'tpl_upper_b', completedDate: '2026-10-19' }])).toBeUndefined();
    expect(pendingMacroFactorWorkout(TODAY, 'tpl_upper_b', mf, [{ externalId: undefined, templateId: 'tpl_upper_b', completedDate: '2026-10-12' }])?.externalId).toBe(workout.externalId);
  });

  it('reads as "Uit MacroFactor: 50 min, 18 sets", from the file or from the log', () => {
    expect(macroFactorLine(workout)).toBe('Uit MacroFactor: 50 min, 18 sets');
    const log = { id: 'l', templateId: 'tpl_upper_b', type: 'strength', completedDate: TODAY, completedAt: `${TODAY}T19:00:00Z`, variant: 'custom', durationMinutes: 50, externalId: workout.externalId, strengthData: [{ exerciseId: 'a', exerciseName: 'Row', sets: [{ reps: 8, weightKg: 20, kind: 'warmup' }, { reps: 8, weightKg: 40 }, { reps: 8, weightKg: 40 }] }] } as unknown as SessionLog;
    expect(macroFactorLine(log)).toBe('Uit MacroFactor: 50 min, 2 sets');
    expect(macroFactorLine({ ...log, externalId: undefined, source: 'manual' } as SessionLog)).toBeUndefined();
  });
});

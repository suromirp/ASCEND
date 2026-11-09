import { describe, expect, it } from 'vitest';
import type { PlannedSession, SessionTemplate } from '../models/training';
import { calibrationBlock, calibrationSlot, withCalibrationTarget, CALIBRATION_RIR } from './calibration';
import type { WorkoutExercise, WorkoutRow } from './forgeWorkout';

// Nagemaakte trainingen.
const tpl = (id: string, extra: Partial<SessionTemplate> = {}): SessionTemplate => ({ id, name: id, type: 'strength', ...extra }) as SessionTemplate;
const planned = (id: string, templateId: string, scheduledDate: string, status: PlannedSession['status'] = 'planned'): PlannedSession =>
  ({ id, templateId, scheduledDate, weekStartDate: '2026-11-09', status, order: 0 });
const templates = [tpl('kracht'), tpl('tpl_mountain_hike', { type: 'adventure' }), tpl('test', { roles: ['test'] } as Partial<SessionTemplate>)];
const base = { date: '2026-11-10', planned: [] as PlannedSession[], templates };

describe('calibrationBlock', () => {
  it('kan als er niets in de weg zit', () => {
    expect(calibrationBlock(base)).toBeUndefined();
  });
  it('wacht vier weken na de laatste Akkoord', () => {
    expect(calibrationBlock({ ...base, lastAt: '2026-10-14' })).toBe('recent');
    expect(calibrationBlock({ ...base, lastAt: '2026-10-13' })).toBeUndefined();
  });
  it('geen set in een week met een tocht, ook als die later in de week valt', () => {
    expect(calibrationBlock({ ...base, planned: [planned('a', 'tpl_mountain_hike', '2026-11-15')] })).toBe('trip');
  });
  it('geen set in een week met een test, en niet vlak voor een tocht in de volgende week', () => {
    expect(calibrationBlock({ ...base, planned: [planned('a', 'test', '2026-11-12')] })).toBe('test');
    expect(calibrationBlock({ ...base, date: '2026-11-15', planned: [planned('a', 'tpl_mountain_hike', '2026-11-16')] })).toBe('trip');
  });
  it('een overgeslagen tocht telt niet', () => {
    expect(calibrationBlock({ ...base, planned: [planned('a', 'tpl_mountain_hike', '2026-11-15', 'skipped')] })).toBeUndefined();
  });
});

const row = (id: string, over: Partial<WorkoutRow> = {}): WorkoutRow => ({ id, kind: 'work', target: { repsLow: 6, repsHigh: 8, rir: 2, failure: true }, weightKg: 60, reps: 7, done: false, ...over });
const ex = (slot: string, exerciseId: string, rows: WorkoutRow[]): WorkoutExercise => ({ slot, exerciseId, name: exerciseId, known: true, timed: false, trainings: 5, rows, restSec: 120 });

describe('calibrationSlot', () => {
  it('kiest de eerste samengestelde oefening met een gewicht van buiten', () => {
    const w = [ex('a', 'push-up', [row('a1')]), ex('b', 'bench-press', [row('b1')]), ex('c', 'barbell-row', [row('c1')])];
    expect(calibrationSlot(w)).toBe('b');
  });
  it('wacht tot je de oefening al een paar keer deed', () => {
    expect(calibrationSlot([{ ...ex('b', 'bench-press', [row('b1')]), trainings: 2 }])).toBeUndefined();
    expect(calibrationSlot([{ ...ex('b', 'bench-press', [row('b1')]), trainings: undefined }])).toBeUndefined();
  });
  it('slaat een oefening over waar al een set van is afgevinkt', () => {
    expect(calibrationSlot([ex('b', 'bench-press', [row('b1', { done: true })])])).toBeUndefined();
  });
});

describe('withCalibrationTarget', () => {
  it('geeft de laatste werkset de reserve van de ijkset en laat de rest zoals hij was', () => {
    const before = ex('b', 'bench-press', [row('b1'), row('b2')]);
    const after = withCalibrationTarget(before);
    expect(after.rows[0]).toEqual(before.rows[0]);
    expect(after.rows[1]).toMatchObject({ weightKg: 60, done: false, target: { rir: CALIBRATION_RIR, failure: false } });
  });
});

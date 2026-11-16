import { describe, expect, it } from 'vitest';
import type { PlannedSession, SessionTemplate } from '../models/training';
import { calibrationBlock, calibrationDone, calibrationRemoved, calibrationSlot, isCalibrationRow, syncAutoCalibration, withAutoCalibration, withCalibrationTarget, CALIBRATION_AUTO_FACT, CALIBRATION_RIR } from './calibration';
import { mergeDraft, resumeDraft } from './forgeInput';
import { setCountEvent, unseenCount } from './forgeLog';
import type { ForgeEvent } from '../models/forgeLog';
import { canRemoveRow, isOwnRow } from './forgeRows';
import type { IllnessEpisode } from '../models/illness';
import type { LeavePeriod } from '../models/leave';
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
  it('nooit als je ziek bent of opbouwt na ziek', () => {
    const ill = (endDate?: string): IllnessEpisode[] => [{ id: 'z', kind: 'above_neck', startDate: '2026-11-08', ...(endDate ? { endDate } : {}) }];
    expect(calibrationBlock({ ...base, illness: ill() })).toBe('ill');
    // Beter gemeld op de 9e na een dag ziek: twee dagen opbouwen, de 10e valt erin.
    expect(calibrationBlock({ ...base, illness: ill('2026-11-09') })).toBe('ill');
    expect(calibrationBlock({ ...base, date: '2026-11-20', illness: ill('2026-11-09') })).toBeUndefined();
  });
  it('nooit op een dag zonder sportschool, in een vakantie of op een tocht', () => {
    const leave = (kind: LeavePeriod['kind'], startDate: string, endDate: string): LeavePeriod[] => [{ id: 'v', kind, startDate, endDate }];
    expect(calibrationBlock({ ...base, leave: leave('no_gym', '2026-11-10', '2026-11-12') })).toBe('nogym');
    expect(calibrationBlock({ ...base, leave: leave('no_training', '2026-11-09', '2026-11-11') })).toBe('away');
    expect(calibrationBlock({ ...base, leave: leave('trek', '2026-11-10', '2026-11-11') })).toBe('away');
    // Een tocht later in de week of in de drie dagen erna, als vrije periode.
    expect(calibrationBlock({ ...base, leave: leave('trek', '2026-11-14', '2026-11-16') })).toBe('trip');
    expect(calibrationBlock({ ...base, date: '2026-11-15', leave: leave('trek', '2026-11-17', '2026-11-18') })).toBe('trip');
    // Vrije dagen zijn tijd die je hebt; een vakantie in een andere week raakt niets.
    expect(calibrationBlock({ ...base, leave: leave('free_days', '2026-11-10', '2026-11-12') })).toBeUndefined();
    expect(calibrationBlock({ ...base, leave: leave('no_training', '2026-11-20', '2026-11-22') })).toBeUndefined();
  });
  it('geen ijkset op een training die Forge lichter maakt, en geen tweede naast een lopend concept met een ijkset', () => {
    expect(calibrationBlock({ ...base, eased: true })).toBe('eased');
    expect(calibrationBlock({ ...base, pending: true })).toBe('pending');
    expect(calibrationBlock({ ...base, eased: false, pending: false })).toBeUndefined();
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

describe('withAutoCalibration', () => {
  it('zet een toegevoegde werkset met nog één over bij de hoofdoefening, weg te tikken als elke set', () => {
    const w = [ex('a', 'push-up', [row('a1')]), ex('b', 'bench-press', [row('b1'), row('b2')])];
    const r = withAutoCalibration(w)!;
    expect(r.slot).toBe('b');
    const b = r.workout[1];
    expect(b.rows).toHaveLength(3);
    const added = b.rows[2];
    expect(added.id).toBe(r.rowId);
    expect(isCalibrationRow(added)).toBe(true);
    expect(isOwnRow(added)).toBe(true);
    expect(canRemoveRow(b, added.id)).toBe(true);
    expect(added).toMatchObject({ kind: 'work', weightKg: 60, done: false, target: { rir: CALIBRATION_RIR, failure: false } });
    expect(b.rows.slice(0, 2)).toEqual(w[1].rows);
    expect(r.workout[0]).toBe(w[0]);
  });
  it('niets zonder hoofdoefening', () => {
    expect(withAutoCalibration([ex('a', 'push-up', [row('a1')])])).toBeUndefined();
  });
  it('de dag telt pas met de ijkset afgevinkt', () => {
    const r = withAutoCalibration([ex('b', 'bench-press', [row('b1')])])!;
    expect(calibrationDone(r.workout)).toBe(false);
    const done = r.workout.map((e) => ({ ...e, rows: e.rows.map((x) => ({ ...x, done: true })) }));
    expect(calibrationDone(done)).toBe(true);
    // Weggehaald: geen ijkset, ook niet als de rest is afgevinkt.
    const gone = done.map((e) => ({ ...e, rows: e.rows.filter((x) => !isCalibrationRow(x)) }));
    expect(calibrationDone(gone)).toBe(false);
  });
});

describe('syncAutoCalibration: Lichter aan of uit en een heropend concept', () => {
  let n = 0;
  const id = () => `fe${++n}`;
  const plan = () => [ex('b', 'bench-press', [row('b1'), row('b2')])];
  const auto = (e: ForgeEvent) => e.kind === 'toegevoegd' && isCalibrationRow({ id: e.rowId });

  it('zet de set erbij met een regel in het verloop, en niet twee keer', () => {
    const once = syncAutoCalibration(plan(), [], true, 1, id);
    expect(once.workout[0].rows.filter(isCalibrationRow)).toHaveLength(1);
    expect(once.log.filter(auto)).toHaveLength(1);
    expect(once.log[0].fact).toBe(CALIBRATION_AUTO_FACT);
    const twice = syncAutoCalibration(once.workout, once.log, true, 2, id);
    expect(twice.workout[0].rows).toHaveLength(3);
    expect(twice.log.filter(auto)).toHaveLength(1);
  });
  it('Lichter aan haalt hem weg met zijn regel; Terugzetten zet hem terug', () => {
    const open = syncAutoCalibration(plan(), [], true, 1, id);
    const eased = syncAutoCalibration(plan(), open.log, false, 2, id);
    expect(eased.workout[0].rows.some(isCalibrationRow)).toBe(false);
    expect(eased.log.filter(auto)).toHaveLength(0);
    const back = syncAutoCalibration(plan(), eased.log, true, 3, id);
    expect(back.workout[0].rows.some(isCalibrationRow)).toBe(true);
    expect(back.log.filter(auto)).toHaveLength(1);
  });
  it('een set die je zelf weghaalde komt niet terug, ook niet na Lichter uit', () => {
    const open = syncAutoCalibration(plan(), [], true, 1, id);
    const r = open.workout[0].rows.find(isCalibrationRow)!;
    const log = [...open.log, setCountEvent('weggehaald', open.workout[0], r, '3', 2, 'fx')];
    expect(calibrationRemoved(log)).toBe(true);
    expect(syncAutoCalibration(plan(), log, true, 3, id).workout[0].rows.some(isCalibrationRow)).toBe(false);
  });
  it('een afgevinkte ijkset blijft altijd staan', () => {
    const open = syncAutoCalibration(plan(), [], true, 1, id);
    const done = open.workout.map((e) => ({ ...e, rows: e.rows.map((x) => ({ ...x, done: true })) }));
    const kept = syncAutoCalibration(done, open.log, false, 2, id);
    expect(kept.workout[0].rows.some(isCalibrationRow)).toBe(true);
    expect(kept.log.filter(auto)).toHaveLength(1);
  });
  it('een heropend concept dat opnieuw gepland wordt (Lichter veranderd) volgt dezelfde regel', () => {
    const open = syncAutoCalibration(plan(), [], true, 1, id);
    // Concept zonder afgevinkte set, gemaakt zonder Lichter; nu staat Lichter aan: resumeDraft plant opnieuw.
    const resumed = resumeDraft(open.workout, false, true, plan());
    expect(resumed[0].rows.some(isCalibrationRow)).toBe(false);
    const synced = syncAutoCalibration(resumed, open.log, false, 2, id);
    expect(synced.log.filter(auto)).toHaveLength(0);
  });
  it('de rij van Forge telt niet als aangeraakt: een onaangeraakt concept krijgt het plan van nu, met dezelfde ijkset', () => {
    const open = syncAutoCalibration(plan(), [], true, 1, id).workout;
    const now = withAutoCalibration(plan().map((e) => ({ ...e, rows: e.rows.map((x) => ({ ...x, weightKg: 62.5 })) })))!.workout;
    const merged = mergeDraft(open, now);
    expect(merged[0]).toBe(now[0]);
    expect(merged[0].rows.filter(isCalibrationRow)).toHaveLength(1);
  });
  it('de regel toegevoegd telt niet mee in het teken van het verloop', () => {
    const open = syncAutoCalibration(plan(), [], true, 1, id);
    expect(unseenCount(open.log, 0, open.workout)).toBe(0);
  });
});

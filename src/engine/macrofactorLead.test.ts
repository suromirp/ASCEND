import { describe, expect, it } from 'vitest';
import fixture from './fixtures/macrofactor-workout-log.csv?raw';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession, SessionLog } from '../models/training';
import { mondayOfWeek } from '../utils/dates';
import { readMacroFactorCsv, type MacroFactorWorkout } from './macrofactorImport';
import { planMacroFactor, strengthDataFor, type NameMapping } from './macrofactorLink';
import { applyStrengthTakeover, describeStrengthChange, describeStrengthManualLine, isStrengthTakeover, strengthChangeFor } from './macrofactorLead';
import { isAligned, restoreManual } from './watchAlign';

// Made-up export, made-up plan.
const { templates } = buildDefaultProgramData();
const tpl = (id: string) => templates.find((t) => t.id === id)!;
const workouts = readMacroFactorCsv(fixture).workouts;
const workout = (name: string) => workouts.find((w) => w.name === name)!;
const lower = workout('Lower A'); // 62 min, 13 sets, one set left in the hardest set
const upper = workout('Upper A');
const NOW = new Date('2026-10-22T08:00:00.000Z');

const MAPPING: NameMapping = { 'upper a': 'tpl_upper_a', 'lower a': 'tpl_lower_a', 'upper b': 'tpl_upper_b', 'lower b': 'tpl_lower_b' };

function planned(id: string, templateId: string, date: string, extra: Partial<PlannedSession> = {}): PlannedSession {
  return { id, templateId, scheduledDate: date, weekStartDate: mondayOfWeek(date), status: 'planned', order: 0, ...extra };
}
const week = [
  planned('p_ua', 'tpl_upper_a', '2026-10-13'),
  planned('p_la', 'tpl_lower_a', '2026-10-14'),
  planned('p_ub', 'tpl_upper_b', '2026-10-16'),
  planned('p_lb', 'tpl_lower_b', '2026-10-18'),
];

// The training as the user logged it by hand: his own duration, his own feel.
function mine(extra: Partial<SessionLog> = {}): SessionLog {
  return {
    id: 'log_1', plannedSessionId: 'p_la', templateId: 'tpl_lower_a', type: 'strength', completedDate: '2026-10-14', completedAt: '2026-10-14T18:00:00.000Z',
    variant: 'full', durationMinutes: 75, rpe: 8, subjectiveFeel: 'worse', notes: 'Zware benen', painAreas: ['knie'], source: 'manual', ...extra,
  };
}

describe('what would change', () => {
  it('is the duration, the sets and the reps in reserve of a log that has none of them from MacroFactor', () => {
    const change = strengthChangeFor(mine({ strengthRir: 3 }), lower, tpl('tpl_lower_a'))!;
    expect(change.duration).toEqual({ before: 75, after: 62 });
    expect(change.exercises).toEqual({ before: undefined, after: 13 });
    expect(change.rir).toEqual({ before: 3, after: 1 });
    expect(describeStrengthChange(change)).toBe('duur 1 uur 15 min wordt 1 uur 2 min, 13 sets komen erbij, herhalingen in reserve 3 wordt 1');
  });

  it('leaves out what is equal, and is nothing at all when everything is equal', () => {
    const same = mine({ durationMinutes: 62, strengthRir: 1, strengthData: strengthDataFor(lower, tpl('tpl_lower_a')) });
    expect(strengthChangeFor(same, lower, tpl('tpl_lower_a'))).toBeUndefined();
    const onlyDuration = strengthChangeFor({ ...same, durationMinutes: 70 }, lower, tpl('tpl_lower_a'))!;
    expect(onlyDuration).toEqual({ duration: { before: 70, after: 62 } });
  });

  it('counts the sets on both sides when the log had sets of its own', () => {
    const own = mine({ strengthData: [{ exerciseId: 'ex1', exerciseName: 'Squat', sets: [{ reps: 5, weightKg: 90 }, { reps: 5, weightKg: 90 }] }] });
    const change = strengthChangeFor(own, lower, tpl('tpl_lower_a'))!;
    expect(change.exercises).toEqual({ before: 2, after: 13 });
    expect(describeStrengthChange({ exercises: change.exercises })).toBe('2 sets wordt 13 sets');
  });

  it('keeps the duration when the file has none, and the reps in reserve on an upper body day', () => {
    const noDuration: MacroFactorWorkout = { ...upper, durationSec: undefined };
    const change = strengthChangeFor(mine({ templateId: 'tpl_upper_a', durationMinutes: 75 }), noDuration, tpl('tpl_upper_a'))!;
    expect(change.duration).toBeUndefined();
    expect(change.rir).toBeUndefined();
    expect(change.exercises).toBeDefined();
  });
});

describe('MacroFactor takes over', () => {
  it('replaces duration, sets and reps in reserve, keeps everything the user filled in, and keeps the old numbers', () => {
    const log = mine({ strengthRir: 3 });
    const taken = applyStrengthTakeover(log, lower, tpl('tpl_lower_a'), NOW, ['p1']);
    expect(taken).toMatchObject({
      durationMinutes: 62,
      strengthRir: 1,
      externalId: lower.externalId,
      source: 'macrofactor',
      // His own words and numbers stay.
      rpe: 8,
      subjectiveFeel: 'worse',
      notes: 'Zware benen',
      painAreas: ['knie'],
      plannedSessionId: 'p_la',
      completedDate: '2026-10-14',
    });
    expect(taken.strengthData).toHaveLength(4);
    expect(taken.manualMeasured).toEqual({
      at: NOW.toISOString(),
      values: { durationMinutes: 75 },
      strength: { workoutId: lower.externalId, strengthData: null, strengthRir: 3, tied: { source: 'manual' } },
      clearedProgressIds: ['p1'],
    });
    expect(isStrengthTakeover(taken)).toBe(true);
    // It is not a watch alignment: that list stays the watch's.
    expect(isAligned(taken)).toBe(false);
  });

  it('puts every one of the old numbers back, also what was added to the log since', () => {
    const log = mine({
      strengthRir: 3,
      strengthData: [{ exerciseId: 'ex1', exerciseName: 'Squat', sets: [{ reps: 5, weightKg: 90 }] }],
    });
    const taken = applyStrengthTakeover(log, lower, tpl('tpl_lower_a'), NOW);
    expect(restoreManual(taken)).toEqual(log);
    // Feedback given after the takeover stays after putting back.
    const later = { ...taken, notes: 'Achteraf toegevoegd', painAreas: ['knie', 'rug'] };
    expect(restoreManual(later)).toEqual({ ...log, notes: 'Achteraf toegevoegd', painAreas: ['knie', 'rug'] });
  });

  it('removes what it added: no duration of the file means the log duration is not touched, no old sets means none again', () => {
    const noDuration: MacroFactorWorkout = { ...lower, durationSec: undefined };
    const log = mine();
    const taken = applyStrengthTakeover(log, noDuration, tpl('tpl_lower_a'), NOW);
    expect(taken.durationMinutes).toBe(75);
    expect(taken.manualMeasured?.values).toEqual({});
    const back = restoreManual(taken);
    expect(back).toEqual(log);
    expect('strengthData' in back).toBe(false);
    expect('externalId' in back).toBe(false);
  });

  it('keeps the id and source of a strength entry that came from the watch', () => {
    const watch = mine({ externalId: 'intervals.icu:i77', source: 'garmin' });
    const taken = applyStrengthTakeover(watch, lower, tpl('tpl_lower_a'), NOW);
    expect(taken).toMatchObject({ externalId: 'intervals.icu:i77', source: 'garmin', durationMinutes: 62 });
    expect(taken.manualMeasured?.strength?.tied).toBeUndefined();
    expect(restoreManual(taken)).toEqual(watch);
  });

  it('does nothing when nothing differs or the log already has a takeover', () => {
    const same = mine({ durationMinutes: 62, strengthRir: 1, strengthData: strengthDataFor(lower, tpl('tpl_lower_a')) });
    expect(applyStrengthTakeover(same, lower, tpl('tpl_lower_a'), NOW)).toBe(same);
    const taken = applyStrengthTakeover(mine(), lower, tpl('tpl_lower_a'), NOW);
    expect(applyStrengthTakeover(taken, workout('Lower B'), tpl('tpl_lower_a'), NOW)).toBe(taken);
  });

  it('says in words what was there before', () => {
    const taken = applyStrengthTakeover(mine({ strengthRir: 3, strengthData: [{ exerciseId: 'ex1', exerciseName: 'Squat', sets: [{ reps: 5 }, { reps: 5 }] }] }), lower, tpl('tpl_lower_a'), NOW);
    expect(describeStrengthManualLine(taken)).toBe('Eerst met de hand: 1 uur 15 min, 2 sets, herhalingen in reserve 3');
    const filled = applyStrengthTakeover(mine({ durationMinutes: 62 }), lower, tpl('tpl_lower_a'), NOW);
    expect(describeStrengthManualLine(filled)).toBe('MacroFactor vulde aan: de sets en de herhalingen in reserve. Je eigen cijfers bleven staan.');
  });
});

describe('the proposal with the switch on', () => {
  const ticked = mine();

  it('offers a takeover for a log of that template in the week, and a new log for a day with and without a planned session', () => {
    const { proposals } = planMacroFactor(workouts, MAPPING, [], week.filter((s) => s.id !== 'p_lb'), templates, [ticked]);
    expect(proposals.map((p) => p.kind)).toEqual(['new', 'takeover', 'new', 'new']);
    const [, takeover, upperB, lowerB] = proposals;
    expect(takeover.kind === 'takeover' && takeover.log.id).toBe('log_1');
    // Upper B has its planned session that week, Lower B none.
    expect(upperB.kind === 'new' && upperB.planned?.id).toBe('p_ub');
    expect(lowerB.kind === 'new' && lowerB.planned).toBeUndefined();
  });

  it('is a takeover also for a log that has a field or two already (the duration included)', () => {
    const { proposals } = planMacroFactor([lower], MAPPING, [], week, templates, [mine({ strengthRir: 3, durationMinutes: 75 })]);
    const p = proposals[0];
    if (p.kind !== 'takeover') throw new Error('expected a takeover');
    expect(p.change.duration).toEqual({ before: 75, after: 62 });
  });

  it('offers nothing for a log that already has the same numbers', () => {
    const same = mine({ durationMinutes: 62, strengthRir: 1, strengthData: strengthDataFor(lower, tpl('tpl_lower_a')) });
    const { proposals, alreadyDone } = planMacroFactor([lower], MAPPING, [], week, templates, [same]);
    expect(proposals).toEqual([]);
    expect(alreadyDone).toBe(1);
  });

  it('never offers a workout again once a log took it over, also when the log kept the id of the watch', () => {
    const watch = mine({ externalId: 'intervals.icu:i77', source: 'garmin' });
    const taken = applyStrengthTakeover(watch, lower, tpl('tpl_lower_a'), NOW);
    const { proposals, alreadyDone } = planMacroFactor([lower], MAPPING, [], week, templates, [taken]);
    expect(proposals).toEqual([]);
    expect(alreadyDone).toBe(1);
  });

  it('uses each log once: two workouts of one template make one takeover and one new log', () => {
    const second: MacroFactorWorkout = { ...lower, externalId: 'macrofactor:2026-10-15:lower a', date: '2026-10-15', start: '2026-10-15T12:00:00' };
    const { proposals } = planMacroFactor([lower, second], MAPPING, [], week, templates, [ticked]);
    expect(proposals.map((p) => p.kind)).toEqual(['takeover', 'new']);
  });

  it('only fills empty fields with the switch off, as before', () => {
    const { proposals } = planMacroFactor([lower], MAPPING, [], week, templates, [mine({ strengthRir: 3 })], false);
    const p = proposals[0];
    if (p.kind !== 'supplement') throw new Error('expected a supplement');
    expect(Object.keys(p.patch).sort()).toEqual(['externalId', 'strengthData']);
  });
});

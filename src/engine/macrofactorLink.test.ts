import { describe, it, expect } from 'vitest';
import fixture from './fixtures/macrofactor-workout-log.csv?raw';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession, SessionLog } from '../models/training';
import { mondayOfWeek } from '../utils/dates';
import { legFatigueOn, type LegFatigueInputs } from './legFatigue';
import { readMacroFactorCsv, type MacroFactorWorkout } from './macrofactorImport';
import {
  describeRir,
  describeWorkout,
  planMacroFactor,
  strengthDataFor,
  strengthRirFor,
  supplementPatch,
  workoutToDraft,
  type NameMapping,
} from './macrofactorLink';

// Made-up export, made-up plan.
const { templates } = buildDefaultProgramData();
const tpl = (id: string) => templates.find((t) => t.id === id)!;
const workouts = readMacroFactorCsv(fixture).workouts;
const workout = (name: string) => workouts.find((w) => w.name === name)!;

const MAPPING: NameMapping = { 'upper a': 'tpl_upper_a', 'lower a': 'tpl_lower_a', 'upper b': 'tpl_upper_b', 'lower b': 'tpl_lower_b' };

function planned(id: string, templateId: string, date: string, extra: Partial<PlannedSession> = {}): PlannedSession {
  return { id, templateId, scheduledDate: date, weekStartDate: mondayOfWeek(date), status: 'planned', order: 0, ...extra };
}
// The week of the export (12 to 18 October 2026) as the plan had it.
const week = [
  planned('p_ua', 'tpl_upper_a', '2026-10-13'),
  planned('p_la', 'tpl_lower_a', '2026-10-14'),
  planned('p_ub', 'tpl_upper_b', '2026-10-16'),
  planned('p_lb', 'tpl_lower_b', '2026-10-18'),
];

function log(extra: Partial<SessionLog> = {}): SessionLog {
  return {
    id: 'log_1', plannedSessionId: 'p_la', templateId: 'tpl_lower_a', type: 'strength', completedDate: '2026-10-14', completedAt: '2026-10-14T18:00:00.000Z',
    variant: 'full', durationMinutes: 75, source: 'manual', ...extra,
  };
}

describe('four workouts, a week of planned sessions', () => {
  const { proposals, alreadyDone } = planMacroFactor(workouts, MAPPING, [], week, templates, []);

  it('offers all four, each with the planned session of its template that week', () => {
    expect(alreadyDone).toBe(0);
    expect(proposals.map((p) => p.kind)).toEqual(['new', 'new', 'new', 'new']);
    expect(proposals.map((p) => p.kind === 'new' && p.planned?.id)).toEqual(['p_ua', 'p_la', 'p_ub', 'p_lb']);
  });

  it('turns a workout into a log: real duration, sets, the id, and where it came from', () => {
    const lower = proposals[1];
    if (lower.kind !== 'new') throw new Error('expected a new log');
    expect(lower.draft).toMatchObject({
      plannedSessionId: 'p_la',
      templateId: 'tpl_lower_a',
      type: 'strength',
      completedDate: '2026-10-14',
      durationMinutes: 62,
      externalId: 'macrofactor:2026-10-14:lower a',
      source: 'macrofactor',
    });
    expect(lower.draft.strengthData).toHaveLength(4);
    expect(lower.draft.strengthData![0].sets[0]).toEqual({ reps: 6, weightKg: 100 });
  });

  it('puts reps in reserve on leg sessions only', () => {
    const [upperA, lowerA, , lowerB] = proposals;
    expect(upperA.kind === 'new' && upperA.draft.strengthRir).toBeUndefined();
    expect(lowerA.kind === 'new' && lowerA.draft.strengthRir).toBe(1);
    expect(lowerB.kind === 'new' && lowerB.draft.strengthRir).toBe(2);
  });

  it('saves on its own under the template when the week had no such session', () => {
    const { proposals: p } = planMacroFactor([workout('Lower A')], MAPPING, [], week.filter((s) => s.id !== 'p_la'), templates, []);
    expect(p[0]).toMatchObject({ kind: 'new', planned: undefined });
  });

  it('does not take a planned session that has a log, was skipped, or is in another week', () => {
    const plan = [
      planned('p_done', 'tpl_lower_a', '2026-10-14'),
      planned('p_skip', 'tpl_lower_a', '2026-10-15', { status: 'skipped' }),
      planned('p_next', 'tpl_lower_a', '2026-10-21'),
    ];
    const done = log({ id: 'log_x', plannedSessionId: 'p_done', templateId: 'tpl_upper_a' });
    const { proposals: p } = planMacroFactor([workout('Lower A')], MAPPING, [], plan, templates, [done]);
    expect(p[0]).toMatchObject({ kind: 'new', planned: undefined });
  });
});

describe('the name of a workout', () => {
  it('asks once for a name that is not linked, and keeps asking until it is', () => {
    const { proposals } = planMacroFactor(workouts, { 'upper a': 'tpl_upper_a' }, [], week, templates, []);
    expect(proposals.map((p) => p.kind)).toEqual(['new', 'unmapped', 'unmapped', 'unmapped']);
  });

  it('leaves out a workout the user said is not for ASCEND', () => {
    const { proposals, alreadyDone } = planMacroFactor(workouts, { ...MAPPING, 'upper b': null }, [], week, templates, []);
    expect(proposals).toHaveLength(3);
    expect(alreadyDone).toBe(1);
  });

  it('asks again when the linked template no longer exists', () => {
    const { proposals } = planMacroFactor([workout('Upper A')], { 'upper a': 'tpl_weg' }, [], week, templates, []);
    expect(proposals[0].kind).toBe('unmapped');
  });
});

describe('never twice', () => {
  it('skips what the user said no to and what is stored with the same id', () => {
    const lower = workout('Lower A');
    const stored = log({ id: 'log_s', externalId: lower.externalId, source: 'macrofactor' });
    const { proposals, alreadyDone } = planMacroFactor(workouts, MAPPING, [workout('Upper A').externalId], week, templates, [stored]);
    expect(proposals.map((p) => p.workout.name)).toEqual(['Upper B', 'Lower B']);
    expect(alreadyDone).toBe(2);
  });
});

describe('a session already ticked off in MacroFactor, with the switch off', () => {
  // Without "MacroFactor is leidend voor kracht" a log is only filled in where a field is empty.
  const plan = (list: MacroFactorWorkout[], logs: SessionLog[], sessions = week) => planMacroFactor(list, MAPPING, [], sessions, templates, logs, false);
  const lower = workout('Lower A');
  const tickedOff = log({ strengthRir: undefined });

  it('is filled in, not doubled: the sets, the reps in reserve and the id come in', () => {
    const { proposals } = plan([lower], [tickedOff]);
    expect(proposals).toHaveLength(1);
    const p = proposals[0];
    if (p.kind !== 'supplement') throw new Error('expected a supplement');
    expect(p.log.id).toBe('log_1');
    expect(Object.keys(p.patch).sort()).toEqual(['externalId', 'strengthData', 'strengthRir']);
    expect(p.patch.strengthRir).toBe(1);
  });

  it('never changes what the log already has, the duration included', () => {
    const mine = log({ rpe: 9, strengthRir: 3, durationMinutes: 75, notes: 'zwaar', subjectiveFeel: 'worse' });
    const patch = supplementPatch(mine, lower, tpl('tpl_lower_a'));
    // The log has its reps in reserve already: only the sets and the id come in.
    expect(Object.keys(patch).sort()).toEqual(['externalId', 'strengthData']);
    const merged = { ...mine, ...patch };
    expect(merged).toMatchObject({ rpe: 9, strengthRir: 3, durationMinutes: 75, notes: 'zwaar', subjectiveFeel: 'worse', completedDate: '2026-10-14' });
  });

  it('has nothing to fill when the log is complete: nothing is offered', () => {
    const full = log({ strengthRir: 2, strengthData: strengthDataFor(lower, tpl('tpl_lower_a')) });
    expect(supplementPatch(full, lower, tpl('tpl_lower_a'))).toEqual({});
    const { proposals, alreadyDone } = plan([lower], [full]);
    expect(proposals).toEqual([]);
    expect(alreadyDone).toBe(1);
  });

  it('is found when it was ticked off on the planned day and the workout was a day later', () => {
    const { proposals } = plan([lower], [log({ completedDate: '2026-10-13' })]);
    expect(proposals[0].kind).toBe('supplement');
  });

  it('is not touched once it has been filled in from a file: a second file leaves it alone', () => {
    const filled = log({ externalId: lower.externalId, source: 'manual' });
    const { proposals } = plan([lower], [filled]);
    expect(proposals).toEqual([]);
  });

  it('uses each log once: a second workout of the same template goes to a free session', () => {
    const second: MacroFactorWorkout = { ...lower, externalId: 'macrofactor:2026-10-17:lower a', date: '2026-10-17', start: '2026-10-17T12:00:00' };
    const planWeek = [...week, planned('p_la2', 'tpl_lower_a', '2026-10-17')];
    const { proposals } = plan([lower, second], [tickedOff], planWeek);
    expect(proposals.map((p) => p.kind)).toEqual(['supplement', 'new']);
    expect(proposals[1].kind === 'new' && proposals[1].planned?.id).toBe('p_la2');
  });

  it('can also fill in a strength entry that came from the watch', () => {
    const watch = log({ externalId: 'intervals.icu:i77', source: 'garmin' });
    const { proposals } = plan([lower], [watch]);
    const p = proposals[0];
    expect(p.kind).toBe('supplement');
    // The watch's own id stays; the workout's id is not added over it.
    expect(p.kind === 'supplement' && p.patch.externalId).toBeUndefined();
  });
});

describe('the sets as ASCEND keeps them', () => {
  it('keeps the exercise id of an exercise with the same name in the template, others get their own', () => {
    const upper: MacroFactorWorkout = {
      ...workout('Upper A'),
      exercises: [
        { name: 'Bench press', sets: [{ reps: 8, weightKg: 70 }], top: { reps: 8, weightKg: 70 } },
        { name: 'Row, Seated Cable', sets: [{ reps: 10, weightKg: 55 }], top: { reps: 10, weightKg: 55 } },
      ],
    };
    expect(strengthDataFor(upper, tpl('tpl_upper_a')).map((e) => e.exerciseId)).toEqual(['ex1', 'mf_row_seated_cable']);
  });

  it('takes the planned minutes when the file has no duration', () => {
    const noDuration: MacroFactorWorkout = { ...workout('Lower A'), durationSec: undefined };
    expect(workoutToDraft(noDuration, tpl('tpl_lower_a'), week[1]).durationMinutes).toBe(tpl('tpl_lower_a').durationVariants.full);
  });
});

describe('reps in reserve and the leg index', () => {
  const lower = workout('Lower A');
  const inputs = (logs: SessionLog[]): LegFatigueInputs => ({ logs, plannedSessions: [], templates, today: '2026-12-31' });
  const draftLog = (rir: number | undefined): SessionLog => ({ id: 'l', ...workoutToDraft({ ...lower, exercises: lower.exercises.map((e) => ({ ...e, top: { ...e.top, rir } })) }, tpl('tpl_lower_a'), week[1]) });
  const index = (rir: number | undefined) => legFatigueOn('2026-10-15', inputs([draftLog(rir)])).index;

  it('is read as effort: 0 left counts about RPE 10, 2 left about RPE 8 (the old assumption)', () => {
    expect(index(0)).toBeGreaterThan(index(2));
    expect(index(2)).toBeGreaterThan(index(4));
    // No RIR in the file: the legs run on the assumed RPE 8, which is 2 left.
    expect(index(undefined)).toBeCloseTo(index(2), 6);
  });

  it('stays between 0 and 4 and only counts for a leg session', () => {
    expect(strengthRirFor({ ...lower, exercises: lower.exercises.map((e) => ({ ...e, top: { ...e.top, rir: 7 } })) }, tpl('tpl_lower_a'))).toBe(4);
    expect(strengthRirFor(workout('Upper A'), tpl('tpl_upper_a'))).toBeUndefined();
  });
});

describe('words', () => {
  it('says duration and sets, and what the reps in reserve mean', () => {
    expect(describeWorkout(workout('Lower A'))).toBe('1 uur 2 min, 13 sets');
    expect(describeWorkout({ ...workout('Lower A'), durationSec: undefined, setCount: 1 })).toBe('1 set');
    expect(describeRir(1)).toBe('Zwaarste set met nog 1 herhaling over');
    expect(describeRir(2)).toBe('Zwaarste set met nog 2 herhalingen over');
    expect(describeRir(0)).toMatch(/geen herhaling over/);
    expect(describeRir(undefined)).toBeUndefined();
  });
});

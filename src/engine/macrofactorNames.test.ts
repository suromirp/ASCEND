import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession, SessionLog } from '../models/training';
import { mondayOfWeek } from '../utils/dates';
import { nameKey, type MacroFactorWorkout } from './macrofactorImport';
import { describeSuggestion, exerciseSide, linkRows, suggestMappings, workoutSide } from './macrofactorNames';

// Made-up export (four MacroFactor names, some of them more than once) and a made-up plan.
const { templates } = buildDefaultProgramData();

const NAME_A = 'Upper/Lower Split Voorbeeld (Workout A)';
const NAME_B = 'Upper/Lower Split Voorbeeld (Workout B)';
const NAME_C = 'Upper/Lower Split Voorbeeld (Workout C)';
const NAME_D = 'Upper/Lower Split Voorbeeld (Workout D)';

const LEG_DAY = ['Back Squat (Barbell)', 'Romanian Deadlift (Barbell)', 'Leg Press', 'Standing Calf Raise'];
const UPPER_DAY = ['Bench Press (Barbell)', 'Row, Seated Cable', 'Overhead Press (Barbell)', 'Lat Pulldown'];

function wk(name: string, date: string, exercises: string[], durationSec = 3600): MacroFactorWorkout {
  const list = exercises.map((e) => {
    const sets = [{ reps: 8, weightKg: 50, rir: 2 }, { reps: 8, weightKg: 50, rir: 1 }, { reps: 7, weightKg: 50, rir: 1 }];
    return { name: e, sets, top: sets[0] };
  });
  return { externalId: `macrofactor:${date}:${nameKey(name)}`, date, start: `${date}T12:00:00`, name, durationSec, exercises: list, setCount: list.length * 3 };
}

function planned(id: string, templateId: string, date: string, extra: Partial<PlannedSession> = {}): PlannedSession {
  return { id, templateId, scheduledDate: date, weekStartDate: mondayOfWeek(date), status: 'planned', order: 0, ...extra };
}
function log(id: string, templateId: string, date: string, extra: Partial<SessionLog> = {}): SessionLog {
  return { id, templateId, type: 'strength', completedDate: date, completedAt: `${date}T18:00:00.000Z`, variant: 'full', durationMinutes: 60, source: 'manual', ...extra };
}

// Ten workouts: A three times (one of them on a day nothing was planned), B three
// times, C twice, D twice.
const workouts = [
  wk(NAME_A, '2026-09-30', LEG_DAY),
  wk(NAME_B, '2026-10-01', UPPER_DAY),
  wk(NAME_C, '2026-10-03', LEG_DAY),
  wk(NAME_D, '2026-10-04', UPPER_DAY),
  wk(NAME_A, '2026-10-07', LEG_DAY),
  wk(NAME_B, '2026-10-08', UPPER_DAY),
  wk(NAME_C, '2026-10-10', LEG_DAY),
  wk(NAME_D, '2026-10-11', UPPER_DAY),
  wk(NAME_A, '2026-10-14', LEG_DAY),
  wk(NAME_B, '2026-10-15', UPPER_DAY),
];
const plan = [
  planned('p1', 'tpl_lower_a', '2026-09-30'),
  planned('p2', 'tpl_upper_a', '2026-10-01'),
  planned('p3', 'tpl_lower_b', '2026-10-03'),
  // 10-04 and 10-11: nothing planned. 10-07: nothing planned either.
  planned('p4', 'tpl_upper_a', '2026-10-08'),
  planned('p5', 'tpl_lower_a', '2026-10-14'),
];

describe('the exercises', () => {
  it('reads legs and upper body from the names', () => {
    for (const e of ['Back Squat (Barbell)', 'Romanian Deadlift (Barbell)', 'Leg Press', 'Walking Lunge', 'Standing Calf Raise', 'Trap Bar Deadlift', 'RDL', 'Bulgarian Split Squat', 'Hip Thrust']) {
      expect(exerciseSide(e), e).toBe('legs');
    }
    for (const e of ['Bench Press (Barbell)', 'Row, Seated Cable', 'Barbell Row', 'Pull-Up', 'Overhead Press (Barbell)', 'Lat Pulldown', 'Incline Dumbbell Press', 'Lateral Raise (Dumbbell)', 'Triceps Pushdown', 'Face Pull']) {
      expect(exerciseSide(e), e).toBe('upper');
    }
    expect(exerciseSide('Plank')).toBeUndefined();
  });

  it('takes the side most of the exercises point at, and none for a draw', () => {
    expect(workoutSide(wk(NAME_A, '2026-10-01', LEG_DAY))).toBe('legs');
    expect(workoutSide(wk(NAME_B, '2026-10-01', UPPER_DAY))).toBe('upper');
    expect(workoutSide(wk(NAME_B, '2026-10-01', ['Back Squat', 'Bench Press']))).toBeUndefined();
    expect(workoutSide(wk(NAME_B, '2026-10-01', ['Plank']))).toBeUndefined();
  });
});

describe('the suggestion per name', () => {
  const suggestions = suggestMappings(workouts, plan, [], templates);

  it('is the template that stood planned most often, also when one of the days had nothing planned', () => {
    expect(suggestions[nameKey(NAME_A)]).toEqual({ templateId: 'tpl_lower_a', votes: 2, date: '2026-10-14', basis: 'planned' });
    expect(suggestions[nameKey(NAME_B)]).toEqual({ templateId: 'tpl_upper_a', votes: 2, date: '2026-10-08', basis: 'planned' });
  });

  it('accepts one single day when the exercises point the same way', () => {
    expect(suggestions[nameKey(NAME_C)]).toEqual({ templateId: 'tpl_lower_b', votes: 1, date: '2026-10-03', basis: 'planned' });
  });

  it('gives nothing when no day has anything planned or logged and two templates of that kind exist', () => {
    expect(suggestions[nameKey(NAME_D)]).toBeUndefined();
  });

  it('gives nothing for a draw', () => {
    const draw = [wk(NAME_A, '2026-10-01', LEG_DAY), wk(NAME_A, '2026-10-08', LEG_DAY)];
    const p = [planned('x', 'tpl_lower_a', '2026-10-01'), planned('y', 'tpl_lower_b', '2026-10-08')];
    expect(suggestMappings(draw, p, [], templates)).toEqual({});
    // Two templates on one day are a draw too.
    const both = [planned('x', 'tpl_lower_a', '2026-10-01'), planned('y', 'tpl_lower_b', '2026-10-01')];
    expect(suggestMappings([draw[0], draw[1]], both, [], templates)).toEqual({});
  });

  it('gives nothing for one day without exercises that tell the side', () => {
    const odd = [wk(NAME_A, '2026-10-01', ['Plank', 'Farmer Walk'])];
    expect(suggestMappings(odd, [planned('x', 'tpl_lower_a', '2026-10-01')], [], templates)).toEqual({});
  });

  it('does not count a day that points at the other kind of training', () => {
    // Upper body was planned that day, but the exercises were a leg session.
    const swapped = [wk(NAME_A, '2026-10-01', LEG_DAY), wk(NAME_A, '2026-10-08', LEG_DAY)];
    const p = [planned('x', 'tpl_upper_a', '2026-10-01'), planned('y', 'tpl_upper_a', '2026-10-08')];
    expect(suggestMappings(swapped, p, [], templates)).toEqual({});
  });

  it('does not count a skipped session', () => {
    const w = [wk(NAME_A, '2026-10-01', LEG_DAY), wk(NAME_A, '2026-10-08', LEG_DAY)];
    const p = [planned('x', 'tpl_lower_a', '2026-10-01', { status: 'skipped' }), planned('y', 'tpl_lower_a', '2026-10-08', { status: 'skipped' })];
    expect(suggestMappings(w, p, [], templates)).toEqual({});
  });

  it('lets a log of that day beat the plan, and ignores logs that came from a MacroFactor file', () => {
    const w = [wk(NAME_A, '2026-10-01', LEG_DAY), wk(NAME_A, '2026-10-08', LEG_DAY)];
    const p = [planned('x', 'tpl_lower_a', '2026-10-01'), planned('y', 'tpl_lower_a', '2026-10-08')];
    const logs = [log('l1', 'tpl_lower_b', '2026-10-01'), log('l2', 'tpl_lower_b', '2026-10-08')];
    expect(suggestMappings(w, p, logs, templates)[nameKey(NAME_A)]).toMatchObject({ templateId: 'tpl_lower_b', votes: 2, basis: 'logged' });
    const own = [
      log('l1', 'tpl_lower_b', '2026-10-01', { externalId: 'macrofactor:2026-10-01:x', source: 'macrofactor' }),
      log('l2', 'tpl_lower_b', '2026-10-08', { externalId: 'macrofactor:2026-10-08:x', source: 'macrofactor' }),
    ];
    expect(suggestMappings(w, p, own, templates)[nameKey(NAME_A)]).toMatchObject({ templateId: 'tpl_lower_a', basis: 'planned' });
  });

  it('suggests the only template of that kind from the exercises alone', () => {
    const only = templates.filter((t) => t.type !== 'strength' || t.id !== 'tpl_lower_b');
    const w = [wk(NAME_C, '2026-10-03', LEG_DAY)];
    // Lower A is left as the one leg template.
    expect(suggestMappings(w, [], [], only)[nameKey(NAME_C)]).toEqual({ templateId: 'tpl_lower_a', votes: 0, date: '2026-10-03', basis: 'exercises' });
    // With both leg templates it is a guess between two: nothing.
    expect(suggestMappings(w, [], [], templates)).toEqual({});
  });

  it('never gives two names the same template unless one has clearly more evidence', () => {
    const w = [wk(NAME_A, '2026-10-01', LEG_DAY), wk(NAME_A, '2026-10-08', LEG_DAY), wk(NAME_C, '2026-10-15', LEG_DAY)];
    const p = [planned('x', 'tpl_lower_a', '2026-10-01'), planned('y', 'tpl_lower_a', '2026-10-08'), planned('z', 'tpl_lower_a', '2026-10-15')];
    expect(Object.keys(suggestMappings(w, p, [], templates))).toEqual([nameKey(NAME_A)]);
    const even = [wk(NAME_A, '2026-10-01', LEG_DAY), wk(NAME_C, '2026-10-15', LEG_DAY)];
    expect(suggestMappings(even, p, [], templates)).toEqual({});
  });
});

describe('the sentence', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-22T10:00:00'));
  });
  afterEach(() => vi.useRealTimers());

  it('says which day and what stood there', () => {
    expect(describeSuggestion({ templateId: 'tpl_lower_a', votes: 1, date: '2026-09-30', basis: 'planned' }, 'Benen A')).toBe('voorgesteld omdat op 30 september Benen A gepland stond');
    expect(describeSuggestion({ templateId: 'tpl_lower_a', votes: 2, date: '2026-10-14', basis: 'planned' }, 'Benen A')).toBe(
      'voorgesteld omdat op 14 oktober Benen A gepland stond, en op 1 andere dag ook',
    );
    expect(describeSuggestion({ templateId: 'tpl_lower_a', votes: 3, date: '2026-10-14', basis: 'logged' }, 'Benen A')).toBe(
      'voorgesteld omdat op 14 oktober Benen A gelogd stond, en op 2 andere dagen ook',
    );
    expect(describeSuggestion({ templateId: 'tpl_lower_a', votes: 0, date: '2026-10-14', basis: 'exercises' }, 'Benen A')).toBe('voorgesteld omdat de oefeningen bij Benen A passen');
  });
});

describe('one row per name', () => {
  const suggestions = suggestMappings(workouts, plan, [], templates);

  it('has four rows for ten workouts, counted per name, in the order of the file', () => {
    const rows = linkRows(workouts, {}, [], [], templates, suggestions);
    expect(rows.map((r) => [r.name, r.count])).toEqual([[NAME_A, 3], [NAME_B, 3], [NAME_C, 2], [NAME_D, 2]]);
    expect(rows.every((r) => r.linked === undefined)).toBe(true);
    expect(rows[0].suggestion?.templateId).toBe('tpl_lower_a');
    expect(rows[3].suggestion).toBeUndefined();
  });

  it('shows what is linked, "niet inlezen" and a template that is gone as not linked', () => {
    const rows = linkRows(workouts, { [nameKey(NAME_A)]: 'tpl_lower_a', [nameKey(NAME_B)]: null, [nameKey(NAME_C)]: 'tpl_weg' }, [], [], templates, suggestions);
    expect(rows.map((r) => r.linked)).toEqual(['tpl_lower_a', null, undefined, undefined]);
  });

  it('leaves out workouts that were handled, and a name with nothing left', () => {
    const stored = [
      log('s1', 'tpl_lower_a', '2026-09-30', { externalId: workouts[0].externalId, source: 'macrofactor' }),
      // A taken-over entry from the watch keeps its own id; the workout is in the takeover.
      log('s2', 'tpl_lower_a', '2026-10-07', { externalId: 'intervals.icu:z', source: 'garmin', manualMeasured: { at: 'x', values: {}, strength: { workoutId: workouts[4].externalId } } }),
    ];
    const rows = linkRows(workouts, {}, [workouts[8].externalId, workouts[3].externalId, workouts[7].externalId], stored, templates, suggestions);
    expect(rows.map((r) => [r.name, r.count])).toEqual([[NAME_B, 3], [NAME_C, 2]]);
  });
});

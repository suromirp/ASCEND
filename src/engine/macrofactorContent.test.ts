import { describe, expect, it } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession } from '../models/training';
import { mondayOfWeek } from '../utils/dates';
import { nameKey, type MacroFactorWorkout } from './macrofactorImport';
import { contentReason, suggestByContent, workoutProfile } from './macrofactorContent';
import { planMacroFactor } from './macrofactorLink';
import { describeSuggestion, groupRows, linkRows, suggestAll } from './macrofactorNames';

// Made-up names and exercises; the default program has two leg and two upper templates.
const { templates } = buildDefaultProgramData();

const LEGS = ['Barbell Back Squat', 'Romanian Deadlift', 'Leg Press', 'Standing Calf Raise'];
const UPPER_PUSH = ['Barbell Bench Press', 'Overhead Press (Barbell)', 'Lateral Raise', 'Triceps Pushdown'];
const UPPER_PULL = ['Seated Cable Row', 'Lat Pulldown', 'Biceps Curl'];
const FULL = ['Barbell Back Squat', 'Barbell Bench Press', 'Seated Cable Row', 'Romanian Deadlift'];

function wk(name: string, date: string, exercises: string[]): MacroFactorWorkout {
  const list = exercises.map((e) => {
    const sets = [{ reps: 8, weightKg: 40, rir: 2 }, { reps: 8, weightKg: 40, rir: 1 }, { reps: 8, weightKg: 40, rir: 1 }];
    return { name: e, sets, top: sets[0] };
  });
  return { externalId: `macrofactor:${date}:${nameKey(name)}`, date, start: `${date}T12:00:00`, name, durationSec: 3600, exercises: list, setCount: list.length * 3 };
}
const planned = (id: string, templateId: string, date: string): PlannedSession => ({ id, templateId, scheduledDate: date, weekStartDate: mondayOfWeek(date), status: 'planned', order: 0 });

describe('the profile of a name', () => {
  it('calls squat, deadlift and leg press a leg day', () => {
    expect(workoutProfile([wk('X', '2026-03-02', LEGS)])?.kind).toBe('legs');
  });
  it('calls bench, press and pushdown an upper body day', () => {
    expect(workoutProfile([wk('X', '2026-03-02', UPPER_PUSH)])?.kind).toBe('upper');
  });
  it('calls legs and upper body together a full body day', () => {
    expect(workoutProfile([wk('X', '2026-03-02', FULL)])?.kind).toBe('full');
  });
  it('has nothing to say about exercises it does not know', () => {
    expect(workoutProfile([wk('X', '2026-03-02', ['Mystery Move'])])).toBeUndefined();
  });
});

describe('the reason in words', () => {
  it('names the exercises as they are written, and the kind of day', () => {
    const profile = workoutProfile([wk('X', '2026-03-02', LEGS)])!;
    expect(contentReason(profile)).toBe('Barbell Back Squat, Romanian Deadlift en Leg Press: een beendag');
  });
});

describe('suggestByContent', () => {
  const list = [
    wk('Split (Workout A)', '2026-03-02', UPPER_PUSH),
    wk('Split (Workout B)', '2026-03-03', LEGS),
    wk('Split (Workout C)', '2026-03-05', UPPER_PULL),
    wk('Split (Workout D)', '2026-03-06', LEGS),
    wk('Mystery (Workout A)', '2026-03-07', ['Mystery Move']),
  ];

  it('puts leg days on leg templates and upper days on upper templates, in turn within a program', () => {
    const s = suggestByContent(list, templates, [], '2026-10-01');
    const kind = (name: string) => templates.find((t) => t.id === s[nameKey(name)].templateId)?.name;
    expect(kind('Split (Workout A)')).toMatch(/Bovenlichaam/);
    expect(kind('Split (Workout C)')).toMatch(/Bovenlichaam/);
    expect(s[nameKey('Split (Workout A)')].templateId).not.toBe(s[nameKey('Split (Workout C)')].templateId);
    expect(kind('Split (Workout B)')).toMatch(/Benen/);
    expect(s[nameKey('Split (Workout B)')].templateId).not.toBe(s[nameKey('Split (Workout D)')].templateId);
  });

  it('gives nothing for a name whose exercises say nothing', () => {
    expect(suggestByContent(list, templates, [], '2026-10-01')[nameKey('Mystery (Workout A)')]).toBeUndefined();
  });

  it('suggests a loose strength training when all workouts are before the program', () => {
    expect(suggestByContent(list, templates, [], '2026-10-01')[nameKey('Split (Workout B)')].loose).toBe(true);
  });

  it('does not when a workout fell in a week with a planned strength session', () => {
    const later = [...list, wk('Later (Workout A)', '2026-03-20', LEGS)];
    const s = suggestByContent(later, templates, [planned('p', 'tpl_lower_a', '2026-03-03')], '2026-01-01');
    expect(s[nameKey('Split (Workout B)')].loose).toBe(false);
    // The later workout has no planned session in its week.
    expect(s[nameKey('Later (Workout A)')].loose).toBe(true);
  });

  it('puts a full body day on the closest template when there is no full body template', () => {
    const s = suggestByContent([wk('Full Body (Workout A)', '2026-03-02', FULL)], templates, [], '2026-10-01');
    expect(s[nameKey('Full Body (Workout A)')].templateId).toBeTruthy();
    expect(s[nameKey('Full Body (Workout A)')].reason).toMatch(/hele lichaam/);
  });

  it('has nothing without strength templates', () => {
    expect(suggestByContent(list, templates.filter((t) => t.type !== 'strength'), [], undefined)).toEqual({});
  });
});

describe('together with the day-based suggestion', () => {
  it('keeps the suggestion of a planned day and fills the rest by content', () => {
    const list = [wk('A', '2026-10-07', LEGS), wk('A', '2026-10-14', LEGS), wk('B', '2026-03-03', UPPER_PUSH)];
    const plan = [planned('p1', 'tpl_lower_b', '2026-10-07'), planned('p2', 'tpl_lower_b', '2026-10-14')];
    const s = suggestAll(list, plan, [], templates, '2026-09-01');
    expect(s[nameKey('A')]).toMatchObject({ templateId: 'tpl_lower_b', basis: 'planned' });
    expect(s[nameKey('B')]).toMatchObject({ basis: 'content', loose: true });
    expect(describeSuggestion(s[nameKey('B')], 'Bovenlichaam A')).toMatch(/een bovenlichaamdag\. Valt buiten je planning, daarom als losse krachttraining$/);
  });

  it('sorts the rows so the same kind is together, names without a suggestion last', () => {
    const list = [wk('M', '2026-03-01', ['Mystery Move']), wk('U1', '2026-03-02', UPPER_PUSH), wk('L1', '2026-03-03', LEGS), wk('U2', '2026-03-04', UPPER_PULL)];
    const s = suggestAll(list, [], [], templates, '2026-09-01');
    const rows = groupRows(linkRows(list, {}, [], [], templates, s, []), templates);
    expect(rows.map((r) => r.name)).toEqual(['U1', 'U2', 'L1', 'M']);
    expect(rows.some((r) => r.loose)).toBe(false);
  });
});

describe('linked as a loose strength training', () => {
  const workout = wk('Split (Workout B)', '2026-10-07', LEGS);
  const free = [planned('p1', 'tpl_lower_a', '2026-10-08')];

  it('is tied to the free planned session of that week when linked normally', () => {
    const plan = planMacroFactor([workout], { [nameKey(workout.name)]: 'tpl_lower_a' }, [], free, templates, []);
    expect(plan.proposals[0]).toMatchObject({ kind: 'new', draft: { plannedSessionId: 'p1' } });
  });

  it('is saved on its own, with the template as its kind, when linked as loose', () => {
    const plan = planMacroFactor([workout], { [nameKey(workout.name)]: 'tpl_lower_a' }, [], free, templates, [], true, [nameKey(workout.name)]);
    const proposal = plan.proposals[0];
    expect(proposal).toMatchObject({ kind: 'new', draft: { templateId: 'tpl_lower_a', type: 'strength' } });
    expect(proposal.kind === 'new' && proposal.draft.plannedSessionId).toBeFalsy();
  });
});

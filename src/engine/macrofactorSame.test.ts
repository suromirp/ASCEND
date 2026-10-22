import { describe, expect, it } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession, SessionLog } from '../models/training';
import { mondayOfWeek } from '../utils/dates';
import { readMacroFactorCsv, type MacroFactorWorkout } from './macrofactorImport';
import { doubtAbout, planMacroFactor, strengthDataFor, type NameMapping } from './macrofactorLink';
import { findSameWorkoutLog, setOverlap } from './macrofactorSame';

// Made-up export and plan, as in macrofactorLink.test.ts.
const CSV = [
  'Date,Workout Duration,Workout,Exercise,Set Type,Weight (kg),Reps,RIR',
  ...[['Squat', 100, 6], ['Squat', 100, 6], ['Squat', 100, 5], ['Leg Press', 180, 10], ['Leg Press', 180, 10]].map(
    ([ex, w, r]) => `2026-10-14,3720,Lower A,${ex},Working,${w},${r},2`,
  ),
].join('\n');
const original = readMacroFactorCsv(CSV).workouts[0];
// The same training after a rename in MacroFactor: the id changes with the name.
const renamed: MacroFactorWorkout = { ...original, name: 'Benen zwaar', externalId: 'macrofactor:2026-10-14:benen zwaar' };

const { templates } = buildDefaultProgramData();
const lower = templates.find((t) => t.id === 'tpl_lower_a')!;
const MAPPING: NameMapping = { 'lower a': 'tpl_lower_a', 'benen zwaar': 'tpl_lower_a' };

function storedLog(extra: Partial<SessionLog> = {}): SessionLog {
  return {
    id: 'log_mf', templateId: 'tpl_lower_a', type: 'strength', completedDate: '2026-10-14', completedAt: '2026-10-14T19:00:00.000Z',
    variant: 'custom', durationMinutes: 62, source: 'macrofactor', externalId: original.externalId,
    strengthData: strengthDataFor(original, lower), ...extra,
  };
}
const week: PlannedSession[] = [{ id: 'p_la', templateId: 'tpl_lower_a', scheduledDate: '2026-10-14', weekStartDate: mondayOfWeek('2026-10-14'), status: 'planned', order: 0 }];

describe('dezelfde workout onder een andere naam', () => {
  it('maakt geen tweede log als de naam in MacroFactor is veranderd', () => {
    const { proposals, alreadyDone } = planMacroFactor([renamed], MAPPING, [], week, templates, [storedLog()]);
    expect(proposals.filter((p) => p.kind === 'new')).toHaveLength(0);
    expect(alreadyDone).toBe(1);
  });

  it('vraagt ook niet om de nieuwe naam te koppelen', () => {
    const { proposals } = planMacroFactor([renamed], {}, [], week, templates, [storedLog()]);
    expect(proposals.filter((p) => p.kind === 'unmapped')).toHaveLength(0);
  });

  it('herkent hem met een set erbij of eraf', () => {
    const extra: MacroFactorWorkout = { ...renamed, exercises: renamed.exercises.map((e, i) => (i === 0 ? { ...e, sets: [...e.sets, { reps: 4, weightKg: 100, rir: 0 }] } : e)) };
    expect(findSameWorkoutLog(extra, [storedLog()])).toBeDefined();
  });

  it('laat een andere training op dezelfde dag staan', () => {
    const other: MacroFactorWorkout = { ...renamed, exercises: [{ name: 'Bench Press', sets: [{ reps: 8, weightKg: 70 }, { reps: 8, weightKg: 70 }, { reps: 8, weightKg: 70 }], top: { reps: 8, weightKg: 70 } }], setCount: 3 };
    expect(findSameWorkoutLog(other, [storedLog()])).toBeUndefined();
    const { proposals } = planMacroFactor([other], { 'benen zwaar': 'tpl_lower_a' }, [], week, templates, [storedLog()]);
    expect(proposals.map((p) => p.kind)).toEqual(['new']);
  });

  it('laat een log van een andere dag of met de hand gemaakt buiten beschouwing', () => {
    expect(findSameWorkoutLog(renamed, [storedLog({ completedDate: '2026-10-15' })])).toBeUndefined();
    expect(findSameWorkoutLog(renamed, [storedLog({ externalId: undefined, source: 'manual' })])).toBeUndefined();
  });

  it('gebruikt een log niet voor twee workouts', () => {
    const twin: MacroFactorWorkout = { ...renamed, name: 'Nog een', externalId: 'macrofactor:2026-10-14:nog een' };
    const { proposals } = planMacroFactor([renamed, twin], { ...MAPPING, 'nog een': 'tpl_lower_a' }, [], week, templates, [storedLog()]);
    expect(proposals.map((p) => p.kind)).toEqual(['new']);
  });

  it('herschrijft de bestaande log niet', () => {
    const log = storedLog();
    const before = JSON.stringify(log);
    planMacroFactor([renamed], MAPPING, [], week, templates, [log]);
    expect(JSON.stringify(log)).toBe(before);
  });

  it('setOverlap rekent met de grootste lijst', () => {
    expect(setOverlap(['a', 'b', 'c', 'd', 'e'], ['a', 'b', 'c', 'd'])).toBe(0.8);
    expect(setOverlap([], ['a'])).toBe(0);
  });
});

describe('een rij die niet klopt wordt apart gezet', () => {
  it('een training in de toekomst', () => {
    expect(doubtAbout({ ...original, date: '2027-05-01' }, '2026-10-22')).toMatch(/toekomst/);
    expect(doubtAbout(original, '2026-10-22')).toBeUndefined();
  });

  it('een duur van 1667 minuten', () => {
    expect(doubtAbout({ ...original, durationSec: 1667 * 60 }, '2026-10-22')).toMatch(/te lang/);
    expect(doubtAbout({ ...original, durationSec: 100 * 60 }, '2026-10-22')).toBeUndefined();
  });

  it('een set van 999 herhalingen of 9999 kg', () => {
    const odd = { ...original, exercises: [{ ...original.exercises[0], sets: [{ reps: 999, weightKg: 9999 }] }] };
    expect(doubtAbout(odd, '2026-10-22')).toMatch(/onwaarschijnlijk/);
  });

  it('planMacroFactor markeert zo een rij met de reden', () => {
    const future = { ...original, date: '2027-05-01', start: '2027-05-01T12:00:00', externalId: 'macrofactor:2027-05-01:lower a' };
    const { proposals } = planMacroFactor([future, original], MAPPING, [], week, templates, [], true, [], '2026-10-22');
    const flagged = proposals.filter((p) => p.kind !== 'unmapped' && p.doubt);
    expect(flagged).toHaveLength(1);
    expect(flagged[0].workout.date).toBe('2027-05-01');
  });
});

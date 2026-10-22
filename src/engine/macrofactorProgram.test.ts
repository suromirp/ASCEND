import { describe, expect, it } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { Cell } from './sheetTable';
import {
  buildStoredProgram,
  dayName,
  isLegDay,
  isProgramTable,
  parseRepRange,
  parseRest,
  programCycle,
  programExercisesFor,
  proposeMapping,
  readProgramRows,
  setsText,
  withProgramExercises,
} from './macrofactorProgram';
import { normalizeStrengthProgram } from './strengthProgramStore';
import { normalizeStrengthSettings } from './strengthSettings';
import { readMacroFactorTables } from './macrofactorFile';
import { demoStrengthLogs, demoWeights } from './fixtures/strengthLogs';
import { planWorkout } from './forgeWorkout';
import { resolveStrengthSettings } from './strengthSettings';

// A made-up program in the layout of the sheet "Training Programs" of a
// MacroFactor export. The gym name is made up too, and must never come through.
const HEAD = (cycle: number): Cell[] => [`Cycle ${cycle}`, 'Exercise', 'Skipped', 'Notes', 'Set 1 Type', 'Set 1 Rep Range', 'Set 1 RIR', 'Set 1 Rest', 'Set 2 Type', 'Set 2 Rep Range', 'Set 2 RIR', 'Set 2 Rest', 'Set 3 Type', 'Set 3 Rep Range', 'Set 3 RIR', 'Set 3 Rest'];
const std = (range: string, rir: number, rest = ''): Cell[] => ['Standard Set', range, rir, rest];
const fail = (range: string): Cell[] => ['Failure Set', range, 0, ''];

export const PROGRAM_ROWS: Cell[][] = [
  ['Program: Test Boven Onder', 'Cycles: 2', 'Deload: Last Cycle', 'Color: Blue', 'Icon: Mountain'],
  ['Block 1'],
  HEAD(1),
  ['Rest'],
  ['Workout A @ Voorbeeldgym Centrum', 'Barbell Bench Press', 'No', '', ...std('4 - 6', 1, '3:00'), ...std('4 - 6', 2), ...std('4 - 6', 3)],
  ['', 'Lateral Raise', 'No', 'stoel 4', ...fail('12+'), ...std('12 - 15', 1)],
  ['', 'Cable Crunch', 'Yes', '', ...std('10 - 12', 2)],
  ['Workout B @ Voorbeeldgym Centrum', 'Barbell Back Squat', 'No', '', ...std('4 - 6', 1), ...std('4 - 6', 2), ...std('4 - 6', 3)],
  ['', 'Leg Press', 'No', '', ...std('10 - 12', 2), ...std('10 - 12', 2)],
  ['Rest'],
  ['Rest'],
  HEAD(2),
  ['Rest'],
  ['Workout A @ Voorbeeldgym Centrum', 'Barbell Bench Press', 'No', '', ...std('7 - 9', 2), ...std('7 - 9', 2), ...std('7 - 9', 2)],
  ['', 'Lateral Raise', 'No', '', ...std('14 - 16', 2), ...std('14 - 16', 2)],
  ['Workout B @ Voorbeeldgym Centrum', 'Barbell Back Squat', 'No', '', ...std('7 - 9', 2), ...std('7 - 9', 2), ...std('7 - 9', 2)],
  ['', 'Leg Press', 'No', '', ...std('14 - 16', 1), ...std('14 - 16', 1)],
  ['Rest'],
];

const { templates, program: ascendProgram } = buildDefaultProgramData();

describe('lezen', () => {
  it('herkent het blad aan Exercise en Set 1 Rep Range', () => {
    expect(isProgramTable(PROGRAM_ROWS)).toBe(true);
    expect(isProgramTable([['Date', 'Exercise', 'Weight (kg)', 'Reps']])).toBe(false);
  });

  it('leest naam, weken, dagen, oefeningen en per set bereik en RIR', () => {
    const p = readProgramRows(PROGRAM_ROWS)!;
    expect(p.name).toBe('Test Boven Onder');
    expect(p.cycleCount).toBe(2);
    expect(p.days.map((d) => d.name)).toEqual(['Workout A', 'Workout B']);
    const a1 = p.days[0].cycles[0];
    expect(a1.map((e) => e.name)).toEqual(['Barbell Bench Press', 'Lateral Raise']);
    expect(a1[0].sets).toEqual([
      { repsLow: 4, repsHigh: 6, rir: 1, restSec: 180 },
      { repsLow: 4, repsHigh: 6, rir: 2 },
      { repsLow: 4, repsHigh: 6, rir: 3 },
    ]);
    expect(a1[1].sets[0]).toEqual({ repsLow: 12, repsHigh: 12, rir: 0, failure: true });
    expect(a1[1].note).toBe('stoel 4');
    expect(p.days[0].cycles[1][0].sets[0]).toEqual({ repsLow: 7, repsHigh: 9, rir: 2 });
  });

  it('een overgeslagen oefening komt er niet in, en de sportschool nooit', () => {
    const p = readProgramRows(PROGRAM_ROWS)!;
    expect(JSON.stringify(p)).not.toContain('Cable Crunch');
    expect(JSON.stringify(p)).not.toContain('Voorbeeldgym');
    expect(dayName('Workout C @ Ergens')).toBe('Workout C');
  });

  it('bereik en rust in de vormen van het bestand', () => {
    expect(parseRepRange('4 - 6')).toEqual({ low: 4, high: 6, failure: false });
    expect(parseRepRange('9+')).toEqual({ low: 9, high: 9, failure: true });
    expect(parseRepRange('10')).toEqual({ low: 10, high: 10, failure: false });
    expect(parseRepRange('veel')).toBeUndefined();
    expect(parseRest('2:30')).toBe(150);
    expect(parseRest('90')).toBe(90);
    expect(parseRest('2 min')).toBe(120);
    expect(parseRest('')).toBeUndefined();
  });

  it('niets bruikbaars is geen programma', () => {
    expect(readProgramRows([HEAD(1), ['Rest']])).toBeUndefined();
  });

  it('een export met alleen een programma wordt gelezen, naast de rest', () => {
    const content = readMacroFactorTables([{ name: 'Training Programs', rows: PROGRAM_ROWS }]);
    expect(content.program?.name).toBe('Test Boven Onder');
    expect(content.workouts).toBeUndefined();
  });
});

describe('het voorstel', () => {
  const p = readProgramRows(PROGRAM_ROWS)!;

  it('een beendag naar een beensjabloon, een andere dag naar bovenlichaam', () => {
    expect(isLegDay(p.days[1])).toBe(true);
    expect(isLegDay(p.days[0])).toBe(false);
    const mapping = proposeMapping(p, templates);
    expect(mapping['Workout A']).toBe('tpl_upper_a');
    expect(mapping['Workout B']).toBe('tpl_lower_a');
  });

  it('bewaart per sjabloon de dagen, met week 1 op de maandag die je kiest', () => {
    const stored = buildStoredProgram(p, { 'Workout A': 'tpl_upper_a', 'Workout B': null }, '2026-10-22', 2)!;
    expect(stored.days.map((d) => d.templateId)).toEqual(['tpl_upper_a']);
    expect(stored.startMonday).toBe('2026-10-12');
    expect(programCycle(stored, '2026-10-22')).toBe(1);
    expect(programCycle(stored, '2026-10-26')).toBe(0); // na week 2 weer week 1
    expect(programCycle(stored, '2026-10-01')).toBe(0); // voor het begin: week 1
    expect(buildStoredProgram(p, { 'Workout A': null, 'Workout B': null }, '2026-10-22')).toBeUndefined();
  });

  it('wat je de vorige keer koos voor dezelfde dag gaat voor', () => {
    const before = buildStoredProgram(p, { 'Workout A': 'tpl_upper_b', 'Workout B': 'tpl_lower_a' }, '2026-10-22')!;
    expect(proposeMapping(p, templates, before)['Workout A']).toBe('tpl_upper_b');
  });

  it('beschrijft de sets in gewone woorden', () => {
    expect(setsText(p.days[0].cycles[0][0].sets)).toBe('3 sets van 4-6, 1, 2 en 3 over');
    expect(setsText(p.days[0].cycles[1][0].sets)).toBe('3 sets van 7-9, 2 over');
    expect(setsText(p.days[0].cycles[0][1].sets)).toBe('2 sets: 12+ tot falen, 12-15 met 1 over');
  });

  it('het bewaarde programma overleeft de normalisatie en rommel valt weg', () => {
    const stored = buildStoredProgram(p, proposeMapping(p, templates), '2026-10-22')!;
    expect(normalizeStrengthProgram(JSON.parse(JSON.stringify(stored)))).toEqual(stored);
    expect(normalizeStrengthSettings({ program: stored })?.program).toEqual(stored);
    expect(normalizeStrengthProgram({ ...stored, startMonday: 'gisteren' })).toBeUndefined();
    const broken = { ...stored, days: [{ ...stored.days[0], cycles: [[{ name: 'X', sets: [{ repsLow: 9, repsHigh: 3, rir: 2 }] }]] }] };
    expect(normalizeStrengthProgram(broken)).toBeUndefined();
  });
});

describe('gebruiken', () => {
  const p = readProgramRows(PROGRAM_ROWS)!;
  const stored = buildStoredProgram(p, proposeMapping(p, templates), '2026-10-19', 1)!;

  it('vult een krachtsjabloon met de oefeningen van die week, de rest blijft', () => {
    const shown = withProgramExercises(templates, stored, '2026-10-20');
    const upper = shown.find((t) => t.id === 'tpl_upper_a')!;
    expect(upper.exercises!.map((e) => e.exerciseName)).toEqual(['Barbell Bench Press', 'Lateral Raise']);
    expect(upper.exercises![0]).toMatchObject({ id: 'mf-barbell-bench-press', sets: 3, reps: '4-6' });
    expect(upper.exercises![0].setTargets).toHaveLength(3);
    // Week 2: zelfde id, ander bereik.
    const next = programExercisesFor(stored, 'tpl_upper_a', '2026-10-27')!;
    expect(next[0].id).toBe('mf-barbell-bench-press');
    expect(next[0].reps).toBe('7-9');
    expect(shown.find((t) => t.id === 'tpl_easy_run')).toBe(templates.find((t) => t.id === 'tpl_easy_run'));
    expect(withProgramExercises(templates, undefined, '2026-10-20')).toBe(templates);
  });

  it('het workoutscherm krijgt per set het bereik en de RIR, en gewichten uit de geschatte kracht', () => {
    const slots = programExercisesFor(stored, 'tpl_upper_a', '2026-10-20')!;
    const settings = resolveStrengthSettings(undefined);
    const [bench, raise] = planWorkout(slots, { logs: demoStrengthLogs(), templates, program: ascendProgram, bodyKg: demoWeights[0].kg, settings, date: '2026-10-20', modelOn: true });
    const work = bench.rows.filter((r) => r.kind === 'work');
    expect(work.map((r) => [r.target.repsLow, r.target.repsHigh, r.target.rir])).toEqual([[4, 6, 1], [4, 6, 2], [4, 6, 3]]);
    // Zwaarder dan bij 7 tot 9 en lichter per set met meer over.
    expect(work[0].weightKg).toBeGreaterThan(work[2].weightKg!);
    expect(bench.reason).toContain('Je programma vraagt nu 3 sets van 4-6');
    expect(bench.restSec).toBe(180);
    // Een set tot falen: "12+", vooringevuld met 12.
    expect(raise.rows[0].target.failure).toBe(true);
    expect(raise.rows[0].reps).toBe(12);
    expect(raise.rows[0].rir).toBe(0);
  });
});

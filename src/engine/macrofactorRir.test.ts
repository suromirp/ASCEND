import { describe, expect, it } from 'vitest';
import fixture from './fixtures/macrofactor-workout-log.csv?raw';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { SessionLog } from '../models/training';
import { logFacts } from './completionSummary';
import { readMacroFactorBytes } from './macrofactorFile';
import { lowestTopRir, readMacroFactorCsv } from './macrofactorImport';
import { strengthChangeFor } from './macrofactorLead';
import { strengthDataFor, strengthRirFor } from './macrofactorSets';
import { makeXlsx } from './xlsxTestKit';
import { isWorkSet } from './workSets';

// Made-up exports in the real shape. The reps in reserve are a column of their
// own (RIR), one per set, and a warm-up is a Set Type ("Warm-Up Set").

const { templates } = buildDefaultProgramData();
const lowerTpl = templates.find((t) => t.id === 'tpl_lower_a')!;
const upperTpl = templates.find((t) => t.id === 'tpl_upper_a')!;
const workouts = readMacroFactorCsv(fixture).workouts;
const byName = (n: string) => workouts.find((w) => w.name === n)!;

describe('every set keeps its own reps in reserve, warm-ups are kept', () => {
  it('stores the warm-up sets with kind warmup, in the order of the file', () => {
    const data = strengthDataFor(byName('Lower A'), lowerTpl);
    expect(data[0].sets).toEqual([
      { reps: 8, weightKg: 60, kind: 'warmup' },
      { reps: 5, weightKg: 80, kind: 'warmup' },
      { reps: 6, weightKg: 100, rir: 2 },
      { reps: 6, weightKg: 100, rir: 1 },
      { reps: 5, weightKg: 100, rir: 1 },
      { reps: 5, weightKg: 100, rir: 1 },
    ]);
  });

  it('keeps the reps in reserve per set, not one lowest value', () => {
    const upper = strengthDataFor(byName('Upper A'), upperTpl);
    expect(upper[0].sets.filter(isWorkSet).map((s) => s.rir)).toEqual([3, 2, 1, 1]);
  });
});

describe('what counts working sets gives the same outcome as before', () => {
  it('the number of sets, the skipped rows and the top set are those of before', () => {
    const { skippedRows } = readMacroFactorCsv(fixture);
    expect(byName('Upper A').setCount).toBe(15);
    expect(byName('Lower A').setCount).toBe(13);
    expect(skippedRows).toBe(4);
    const squat = byName('Lower A').exercises[0];
    expect(squat.sets).toHaveLength(4);
    expect(squat.loggedSets).toHaveLength(6);
    expect(squat.top).toEqual({ reps: 6, weightKg: 100, rir: 1 });
  });

  it('the leg index input (lowest reps in reserve of the top sets) is unchanged', () => {
    expect(lowestTopRir(byName('Lower A'))).toBe(1);
    expect(lowestTopRir(byName('Upper A'))).toBe(2);
    expect(strengthRirFor(byName('Lower A'), lowerTpl)).toBe(1);
    expect(strengthRirFor(byName('Lower B'), templates.find((t) => t.id === 'tpl_lower_b')!)).toBe(2);
    expect(strengthRirFor(byName('Upper A'), upperTpl)).toBeUndefined();
  });

  it('a log that already holds the working sets of before is no change, with or without the new fields', () => {
    const before = byName('Lower A').exercises.map((e) => ({
      exerciseId: `mf_${e.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}`,
      exerciseName: e.name,
      sets: e.sets.map((s) => ({ reps: s.reps, weightKg: s.weightKg! })),
    }));
    const log: SessionLog = {
      id: 'l1', templateId: 'tpl_lower_a', type: 'strength', completedDate: '2026-10-14', completedAt: '2026-10-14T18:00:00.000Z',
      variant: 'full', durationMinutes: 62, source: 'macrofactor', strengthRir: 1, strengthData: before,
    };
    expect(strengthChangeFor(log, byName('Lower A'), lowerTpl)).toBeUndefined();
    const withNew = { ...log, strengthData: strengthDataFor(byName('Lower A'), lowerTpl) };
    expect(strengthChangeFor(withNew, byName('Lower A'), lowerTpl)).toBeUndefined();
  });

  it('the summary of a stored workout counts working sets, not warm-ups', () => {
    const log: SessionLog = {
      id: 'l1', templateId: 'tpl_lower_a', type: 'strength', completedDate: '2026-10-14', completedAt: '2026-10-14T18:00:00.000Z',
      variant: 'full', durationMinutes: 62, source: 'macrofactor', strengthData: strengthDataFor(byName('Lower A'), lowerTpl),
    };
    expect(logFacts(log).main.join(' ')).toContain('13 sets');
  });
});

describe('the xlsx MacroFactor writes (CSV text in one cell per row)', () => {
  const lines = [
    'Date,"Workout Duration","Workout","Exercise","Exercise Base Weight (kg)","Set Type","Weight (kg)","Reps","RIR","Duration","Distance short (m)","Distance long (km)"',
    '2026-09-30,"1901","Upper Lower (Workout B)","Barbell Back Squat",,"Warm-Up Set","20.0","7.0",,,,',
    '2026-09-30,"1901","Upper Lower (Workout B)","Barbell Back Squat",,"Standard Set","80.0","6.0","2.0",,,',
    '2026-09-30,"1901","Upper Lower (Workout B)","Barbell Back Squat",,"Standard Set","80.0","6.0","0.0",,,',
    '2026-09-30,"1901","Upper Lower (Workout B)","Romanian Deadlift",,"Standard Set","70.0","8.0","1.0",,,',
  ];

  it('keeps the warm-up and the reps in reserve per set, and the counts stay those of work sets', async () => {
    const content = await readMacroFactorBytes(makeXlsx([{ name: 'in', rows: lines.map((l) => [l]) }]));
    const w = content.workouts!.workouts[0];
    expect(w.setCount).toBe(3);
    expect(content.workouts!.skippedRows).toBe(1);
    expect(w.exercises[0].sets).toEqual([{ reps: 6, weightKg: 80, rir: 2 }, { reps: 6, weightKg: 80, rir: 0 }]);
    expect(w.exercises[0].loggedSets).toEqual([
      { reps: 7, weightKg: 20, kind: 'warmup' },
      { reps: 6, weightKg: 80, rir: 2 },
      { reps: 6, weightKg: 80, rir: 0 },
    ]);
    expect(w.exercises[0].top).toEqual({ reps: 6, weightKg: 80, rir: 0 });
    expect(lowestTopRir(w)).toBe(0);
  });

  it('a workout of warm-ups only is no workout, as before', async () => {
    const only = [lines[0], lines[1]];
    await expect(readMacroFactorBytes(makeXlsx([{ name: 'in', rows: only.map((l) => [l]) }]))).rejects.toThrow();
  });
});

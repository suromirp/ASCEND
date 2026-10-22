import { describe, it, expect } from 'vitest';
import { heaviestSet, lowestTopRir, MacroFactorFormatError, nameKey, parseCsv, parseDateCell, readMacroFactorCsv } from './macrofactorImport';
import fixture from './fixtures/macrofactor-workout-log.csv?raw';

// A made-up export in the shape MacroFactor's Workout Log has: one row per
// set, the duration (in seconds) repeated on every row of a workout.

function error(text: string): MacroFactorFormatError {
  try {
    readMacroFactorCsv(text);
  } catch (err) {
    expect(err).toBeInstanceOf(MacroFactorFormatError);
    return err as MacroFactorFormatError;
  }
  throw new Error('expected the file to be refused');
}

describe('the fixture export', () => {
  const { workouts, skippedRows } = readMacroFactorCsv(fixture);
  const byName = (name: string) => workouts.find((w) => w.name === name)!;

  it('finds the four workouts of the week, oldest first, with day and real duration', () => {
    expect(workouts.map((w) => [w.name, w.date])).toEqual([
      ['Upper A', '2026-10-12'],
      ['Lower A', '2026-10-14'],
      ['Upper B', '2026-10-16'],
      ['Lower B', '2026-10-17'],
    ]);
    expect(byName('Lower A').durationSec).toBe(3720);
    expect(byName('Upper B').durationSec).toBe(2940);
    expect(byName('Lower A').externalId).toBe('macrofactor:2026-10-14:lower a');
  });

  it('counts working sets only: the warm-ups are left out', () => {
    expect(byName('Upper A').setCount).toBe(15);
    expect(byName('Lower A').setCount).toBe(13);
    expect(skippedRows).toBe(4);
  });

  it('keeps a quoted exercise name with a comma in it as one name', () => {
    expect(byName('Upper A').exercises.map((e) => e.name)).toContain('Row, Seated Cable');
  });

  it('gives the heaviest set per exercise with its reps in reserve', () => {
    const squat = byName('Lower A').exercises.find((e) => e.name.startsWith('Back Squat'))!;
    expect(squat.sets).toHaveLength(4);
    // Most weight, then most reps, then the fewest reps left: 100 kg x 6 with 1 left.
    expect(squat.top).toEqual({ reps: 6, weightKg: 100, rir: 1 });
    const pullUp = byName('Upper B').exercises.find((e) => e.name === 'Pull-Up')!;
    expect(pullUp.top.weightKg).toBeUndefined();
    expect(pullUp.top).toMatchObject({ reps: 8, rir: 2 });
  });

  it('reads the fewest reps left over the hardest sets of the workout', () => {
    expect(lowestTopRir(byName('Lower A'))).toBe(1);
    expect(lowestTopRir(byName("Upper A"))).toBe(2);
  });
});

describe('columns are found by name, not by position', () => {
  it('reads shuffled, lower-case columns with extra ones in between', () => {
    const text = [
      'notes,reps,exercise,workout,weight (kg),rir,date,workout duration,set number',
      ',8,Bench Press,Push,60,2,2026-10-13,3600,1',
      ',7,Bench Press,Push,60,1,2026-10-13,3600,2',
    ].join('\n');
    const [w] = readMacroFactorCsv(text).workouts;
    expect(w).toMatchObject({ name: 'Push', date: '2026-10-13', durationSec: 3600, setCount: 2 });
    expect(w.exercises[0].top).toEqual({ reps: 8, weightKg: 60, rir: 2 });
  });

  it('reads Dutch headings, semicolons and decimal commas', () => {
    const text = ['Datum;Duur (min);Training;Oefening;Gewicht (kg);Herhalingen;RIR', '14-10-2026;62;Benen A;Kniebuiging;82,5;8;2'].join('\r\n');
    const [w] = readMacroFactorCsv(text).workouts;
    expect(w).toMatchObject({ name: 'Benen A', date: '2026-10-14', durationSec: 62 * 60 });
    expect(w.exercises[0].top).toEqual({ reps: 8, weightKg: 82.5, rir: 2 });
  });

  it('converts pounds, and copes with a byte order mark', () => {
    const text = '﻿Date,Workout Duration,Workout,Exercise,Weight (lbs),Reps\n2026-10-13,3600,Push,Bench,100,5\n';
    expect(readMacroFactorCsv(text).workouts[0].exercises[0].top.weightKg).toBeCloseTo(45.36, 2);
  });

  it('works without an RIR column: the rest is still read', () => {
    const text = 'Date,Workout Duration,Workout,Exercise,Weight (kg),Reps\n2026-10-13,3600,Push,Bench,60,8\n';
    const [w] = readMacroFactorCsv(text).workouts;
    expect(w.exercises[0].top.rir).toBeUndefined();
    expect(lowestTopRir(w)).toBeUndefined();
  });

  it('groups by day and workout name, however the name is cased', () => {
    const text = [
      'Date,Workout Duration,Workout,Exercise,Weight (kg),Reps',
      '2026-10-13,3600,Push,Bench,60,8',
      '2026-10-13,3600,push ,Bench,60,8',
      '2026-10-14,3000,Push,Bench,60,8',
    ].join('\n');
    const { workouts } = readMacroFactorCsv(text);
    expect(workouts).toHaveLength(2);
    expect(workouts[0].setCount).toBe(2);
  });
});

describe('durations', () => {
  const file = (duration: string, heading = 'Workout Duration') => `Date,${heading},Workout,Exercise,Weight (kg),Reps\n2026-10-13,${duration},Push,Bench,60,8\n`;
  it('reads seconds by default and minutes when the heading says so', () => {
    expect(readMacroFactorCsv(file('3600')).workouts[0].durationSec).toBe(3600);
    expect(readMacroFactorCsv(file('60', 'Duration (min)')).workouts[0].durationSec).toBe(3600);
    expect(readMacroFactorCsv(file('3600', 'Duration (sec)')).workouts[0].durationSec).toBe(3600);
  });
  it('reads small numbers without a unit as minutes, since no workout lasts five minutes', () => {
    expect(readMacroFactorCsv(file('62')).workouts[0].durationSec).toBe(62 * 60);
  });
  it('reads a clock time and leaves an empty duration empty', () => {
    expect(readMacroFactorCsv(file('1:02:10')).workouts[0].durationSec).toBe(3730);
    expect(readMacroFactorCsv(file('')).workouts[0].durationSec).toBeUndefined();
  });
});

describe('dates', () => {
  it('reads ISO, Dutch and American dates and a time of day', () => {
    expect(parseDateCell('2026-10-14')).toEqual({ date: '2026-10-14', time: undefined });
    expect(parseDateCell('2026-10-14 18:05')).toEqual({ date: '2026-10-14', time: '18:05:00' });
    expect(parseDateCell('2026-10-14T18:05:09Z')?.time).toBe('18:05:09');
    expect(parseDateCell('14-10-2026')?.date).toBe('2026-10-14');
    expect(parseDateCell('14.10.2026')?.date).toBe('2026-10-14');
    expect(parseDateCell('10/14/2026')?.date).toBe('2026-10-14');
    expect(parseDateCell('2026-02-31')).toBeUndefined();
    expect(parseDateCell('gisteren')).toBeUndefined();
  });
  it('starts a workout at noon when the file has no time of day', () => {
    expect(readMacroFactorCsv(fixture).workouts[0].start).toBe('2026-10-12T12:00:00');
  });
});

describe('a file that is not a Workout Log', () => {
  it('names the missing column in Dutch', () => {
    const e = error('Date,Workout Duration,Workout,Exercise,Weight (kg)\n2026-10-13,3600,Push,Bench,60\n');
    expect(e.message).toMatch(/Er ontbreekt een kolom/);
    expect(e.message).toContain('herhalingen (Reps)');
    expect(e.message).toContain('Gevonden kolommen: Date, Workout Duration');
    expect(e.missing).toEqual(['herhalingen (Reps)']);
  });
  it('names every missing column', () => {
    const e = error('Date,Workout,Exercise,Reps\n2026-10-13,Push,Bench,8\n');
    expect(e.message).toMatch(/Er ontbreken kolommen/);
    expect(e.message).toMatch(/duur \(Workout Duration\) en gewicht \(Weight\)/);
  });
  it('says so when nothing is recognised', () => {
    expect(error('Date,Calories,Protein\n2026-10-13,2400,180\n').message).toMatch(/niet de Workout Log van MacroFactor/);
  });
  it('refuses an empty file and a file without sets', () => {
    expect(error('').message).toMatch(/leeg/);
    expect(error('Date,Workout Duration,Workout,Exercise,Weight (kg),Reps\n').message).toMatch(/geen krachttrainingen/);
    expect(error('Date,Workout Duration,Workout,Exercise,Weight (kg),Reps\n2026-10-13,3600,Push,Bench,60,0\n').message).toMatch(/geen krachttrainingen/);
  });
});

describe('small pieces', () => {
  it('parses quotes, doubled quotes and line breaks inside a field', () => {
    expect(parseCsv('a,"b ""x"", c",d\n"e\nf",g,h\n')).toEqual([['a', 'b "x", c', 'd'], ['e\nf', 'g', 'h']]);
  });
  it('compares names without case, accents or extra spaces', () => {
    expect(nameKey('  Benen   A ')).toBe(nameKey('benen a'));
    expect(nameKey('Rücken')).toBe('rucken');
  });
  it('picks the hardest set', () => {
    expect(heaviestSet([{ reps: 10, weightKg: 50, rir: 3 }, { reps: 6, weightKg: 60, rir: 2 }, { reps: 6, weightKg: 60, rir: 0 }])).toEqual({ reps: 6, weightKg: 60, rir: 0 });
  });
});

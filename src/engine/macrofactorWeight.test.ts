import { describe, it, expect } from 'vitest';
import { applyWeightImport, planWeightImport, readMacroFactorWeightCsv, weightEntryFromDay } from './macrofactorWeight';
import { readMacroFactorBytes, readMacroFactorText } from './macrofactorFile';
import { MacroFactorFormatError } from './macrofactorImport';
import { currentBodyKg, freshMacroFactorWeight, hasMacroFactorWeight, packSharePct, weightsInUse } from './bodyWeight';
import type { WeightEntry } from '../models/metrics';
import weightCsv from './fixtures/macrofactor-weight.csv?raw';
import scaleOnlyCsv from './fixtures/macrofactor-weight-weegschaal.csv?raw';
import workoutCsv from './fixtures/macrofactor-workout-log.csv?raw';

// Made-up exports only. The column names are an educated guess at what
// MacroFactor writes (its help center does not publish them), which is why
// the reader finds columns by name and tolerates variants.

function refused(text: string): MacroFactorFormatError {
  try {
    readMacroFactorText(text);
  } catch (err) {
    expect(err).toBeInstanceOf(MacroFactorFormatError);
    return err as MacroFactorFormatError;
  }
  throw new Error('expected the file to be refused');
}

const own = (date: string, kg: number): WeightEntry => ({ date, kg, source: 'manual' });

describe('recognising a weight export', () => {
  it('sees a weight file and a workout log apart, through the same door', () => {
    const weight = readMacroFactorText(weightCsv);
    expect(weight.weight?.days).toHaveLength(14);
    expect(weight.workouts).toBeUndefined();
    const workouts = readMacroFactorText(workoutCsv);
    expect(workouts.weight).toBeUndefined();
    expect(workouts.workouts?.workouts).toHaveLength(4);
  });

  it('reads scale and trend weight per day, oldest first', () => {
    const { days, hasTrend, skippedRows } = readMacroFactorWeightCsv(weightCsv);
    expect(days).toHaveLength(14);
    expect(days[0]).toEqual({ date: '2026-10-05', scaleKg: 86.4, trendKg: 85.9 });
    expect(days[13].date).toBe('2026-10-18');
    expect(hasTrend).toBe(true);
    expect(skippedRows).toBe(0);
    // A day without a weighing still has its trend.
    expect(days.find((d) => d.date === '2026-10-07')).toEqual({ date: '2026-10-07', trendKg: 85.8 });
  });

  it('reads a Dutch file with semicolons, decimal commas and other columns in between', () => {
    const { days, hasTrend } = readMacroFactorWeightCsv(scaleOnlyCsv);
    expect(days).toEqual([
      { date: '2026-10-14', scaleKg: 85.5 },
      { date: '2026-10-15', scaleKg: 84.9 },
      { date: '2026-10-16', scaleKg: 85.3 },
    ]);
    expect(hasTrend).toBe(false);
  });

  it('finds columns by name, whatever the order, case or unit', () => {
    const { days } = readMacroFactorWeightCsv('TREND WEIGHT (kg),notes,date,scale weight\n80.5,,2026-10-01,81\n');
    expect(days).toEqual([{ date: '2026-10-01', scaleKg: 81, trendKg: 80.5 }]);
  });

  it('takes "Weight Trend" for the trend and plain "Weight" for the scale', () => {
    const { days } = readMacroFactorWeightCsv('Date,Weight,Weight Trend\n2026-10-01,81,80.5\n');
    expect(days).toEqual([{ date: '2026-10-01', scaleKg: 81, trendKg: 80.5 }]);
  });

  it('converts pounds when the heading says so, and skips numbers that are no body weight', () => {
    const { days, skippedRows } = readMacroFactorWeightCsv('Date,Scale Weight (lbs)\n2026-10-01,185.0\n2026-10-02,0\n2026-10-03,\nmorgen,184\n');
    expect(days).toEqual([{ date: '2026-10-01', scaleKg: 83.91 }]);
    expect(skippedRows).toBe(3);
  });

  it('does not take the Weight (kg) column of a workout log for body weight', () => {
    // A workout log that lacks a column gets the workout message, not a weight.
    const e = refused('Date,Workout Duration,Workout,Exercise,Weight (kg)\n2026-10-13,3600,Push,Bench,60\n');
    expect(e.message).toMatch(/Er ontbreekt een kolom/);
    expect(e.message).toContain('herhalingen (Reps)');
  });
});

describe('a file that cannot be read', () => {
  it('names the missing date column in Dutch', () => {
    const e = refused('Scale Weight (kg),Trend Weight (kg)\n85.5,85.2\n');
    expect(e.message).toMatch(/Er ontbreekt een kolom in dit bestand: datum \(Date\)/);
    expect(e.message).toContain('Gevonden kolommen: Scale Weight (kg), Trend Weight (kg)');
    expect(e.missing).toEqual(['datum (Date)']);
  });

  it('says which weight columns it looked for when there is none', () => {
    // No weight column: not a weight file, so the general message comes.
    const e = refused('Date,Calories,Protein\n2026-10-13,2400,180\n');
    expect(e.message).toMatch(/niet de Workout Log van MacroFactor, en ook geen bestand met gewicht/);
    expect(e.message).toMatch(/of het gewicht/);
    expect(() => readMacroFactorWeightCsv('Date,Calories\n2026-10-13,2400\n')).toThrow(/geen kolom met gewicht/);
  });

  it('says so, in Dutch, when a zip that claims to be an Excel file is broken', async () => {
    const bytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00, 1, 2, 3, 4, 5, 6]);
    await expect(readMacroFactorBytes(bytes)).rejects.toThrow(/Excel-bestand kan niet worden geopend/);
  });

  it('refuses an empty file and a file without a usable weight', () => {
    expect(refused('').message).toMatch(/leeg/);
    expect(refused('Date,Scale Weight (kg)\n2026-10-13,\n').message).toMatch(/geen gewicht met een datum/);
  });
});

describe('the trend weight over the scale weight', () => {
  it('stores the trend as the weight to use, and keeps the weighing next to it', () => {
    expect(weightEntryFromDay({ date: '2026-10-18', scaleKg: 84.8, trendKg: 85.35 })).toEqual({
      date: '2026-10-18', kg: 85.35, source: 'macrofactor', basis: 'trend', scaleKg: 84.8,
    });
  });

  it('falls back to the scale weight when the day has no trend', () => {
    expect(weightEntryFromDay({ date: '2026-10-18', scaleKg: 84.8 })).toEqual({ date: '2026-10-18', kg: 84.8, source: 'macrofactor', basis: 'scale' });
  });

  it('the body weight for the leg index and the rucksack share is the trend, not the weighing', () => {
    const { days } = readMacroFactorWeightCsv(weightCsv);
    const entries = applyWeightImport([], planWeightImport([], days));
    // The last day: the scale said 84.8, the trend 85.35.
    expect(currentBodyKg(entries, undefined)).toBe(85.35);
    expect(packSharePct(12, weightsInUse(entries, undefined))).toBe(14);
  });
});

describe('not overwriting what you filled in yourself', () => {
  const { days } = readMacroFactorWeightCsv(weightCsv);

  it('stores new days and keeps your own value on a day that differs', () => {
    const existing = [own('2026-10-12', 88)];
    const plan = planWeightImport(existing, days);
    expect(plan.conflicts).toEqual([{ own: own('2026-10-12', 88), incoming: expect.objectContaining({ date: '2026-10-12', kg: 85.62, source: 'macrofactor' }) }]);
    expect(plan.add).toHaveLength(13);
    const applied = applyWeightImport(existing, plan);
    expect(applied.find((e) => e.date === '2026-10-12')).toEqual(own('2026-10-12', 88));
    expect(applied).toHaveLength(14);
    expect(applied.map((e) => e.date)).toEqual([...applied.map((e) => e.date)].sort());
  });

  it('is only a conflict when the values really differ', () => {
    const plan = planWeightImport([own('2026-10-12', 85.6)], days);
    expect(plan.conflicts).toHaveLength(0);
    expect(plan.same).toBe(1);
    expect(applyWeightImport([own('2026-10-12', 85.6)], plan).find((e) => e.date === '2026-10-12')?.source).toBe('manual');
  });

  it('uses the MacroFactor value on those days only when you choose it', () => {
    const existing = [own('2026-10-12', 88)];
    const plan = planWeightImport(existing, days);
    const chosen = applyWeightImport(existing, plan, true);
    expect(chosen.find((e) => e.date === '2026-10-12')).toMatchObject({ kg: 85.62, source: 'macrofactor', basis: 'trend' });
  });

  it('refreshes what came from MacroFactor before, and does nothing when it is the same', () => {
    const first = applyWeightImport([], planWeightImport([], days));
    const again = planWeightImport(first, days);
    expect(again.add).toHaveLength(0);
    expect(again.same).toBe(14);
    const corrected = planWeightImport(first, [{ date: '2026-10-18', trendKg: 85.0, scaleKg: 84.8 }]);
    expect(corrected.add).toHaveLength(1);
    expect(applyWeightImport(first, corrected).find((e) => e.date === '2026-10-18')?.kg).toBe(85);
  });

  it('keeps a manual weight that is newer than the file as the weight in use', () => {
    const entries = applyWeightImport([own('2026-10-20', 86)], planWeightImport([own('2026-10-20', 86)], days));
    expect(currentBodyKg(entries, undefined)).toBe(86);
  });

  it('keeps only the last 120 days of a long file and drops MacroFactor days older than a year', () => {
    const long = Array.from({ length: 400 }, (_, i) => {
      const d = new Date(Date.UTC(2025, 8, 1 + i));
      return { date: d.toISOString().slice(0, 10), trendKg: 85 };
    });
    const plan = planWeightImport([], long);
    expect(plan.add).toHaveLength(121);
    const old: WeightEntry = { date: '2025-01-01', kg: 90, source: 'macrofactor', basis: 'trend' };
    const mine: WeightEntry = { date: '2025-01-02', kg: 90, source: 'manual' };
    const applied = applyWeightImport([old, mine], plan);
    expect(applied.some((e) => e.date === '2025-01-01')).toBe(false);
    expect(applied.some((e) => e.date === '2025-01-02')).toBe(true);
  });
});

describe('the switch "Gewicht uit MacroFactor gebruiken"', () => {
  const mf: WeightEntry = { date: '2026-10-18', kg: 85.35, source: 'macrofactor', basis: 'trend', scaleKg: 84.8 };
  const entries = [own('2026-09-01', 87), mf];

  it('counts the MacroFactor weight unless it is switched off', () => {
    expect(currentBodyKg(entries, undefined)).toBe(85.35);
    expect(currentBodyKg(entries, true)).toBe(85.35);
    expect(currentBodyKg(entries, false)).toBe(87);
    expect(weightsInUse(entries, false)).toEqual([own('2026-09-01', 87)]);
    // Off does not delete anything: it only stops using it.
    expect(hasMacroFactorWeight(entries)).toBe(true);
  });

  it('is "fresh" for two weeks: then the question for a weight is not asked', () => {
    expect(freshMacroFactorWeight(entries, undefined, '2026-10-20')).toEqual(mf);
    expect(freshMacroFactorWeight(entries, undefined, '2026-11-01')).toEqual(mf);
    expect(freshMacroFactorWeight(entries, undefined, '2026-11-02')).toBeUndefined();
    expect(freshMacroFactorWeight(entries, false, '2026-10-20')).toBeUndefined();
    expect(freshMacroFactorWeight([own('2026-10-19', 86), mf], undefined, '2026-10-20')).toBeUndefined();
  });
});

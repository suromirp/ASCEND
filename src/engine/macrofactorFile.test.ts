import { describe, it, expect } from 'vitest';
import { importSummary, readMacroFactorBytes, readMacroFactorTables, readMacroFactorText } from './macrofactorFile';
import { MacroFactorFormatError, parseCsv } from './macrofactorImport';
import { makeXlsx, serialOf, type KitCell, type KitSheet } from './xlsxTestKit';
import workoutCsv from './fixtures/macrofactor-workout-log.csv?raw';
import weightCsv from './fixtures/macrofactor-weight.csv?raw';

// Made-up files only, built in the test. The column names are an educated
// guess at what MacroFactor writes; the reader finds them by name.

async function refused(bytes: Uint8Array): Promise<MacroFactorFormatError> {
  try {
    await readMacroFactorBytes(bytes);
  } catch (err) {
    expect(err).toBeInstanceOf(MacroFactorFormatError);
    return err as MacroFactorFormatError;
  }
  throw new Error('expected the file to be refused');
}

// A CSV fixture as the sheet an export to xlsx would make of it: numbers as
// numbers, the Date column as real dates.
function sheetFromCsv(name: string, csv: string): KitSheet {
  const [header, ...body] = parseCsv(csv);
  const dateAt = header.findIndex((h) => h.trim().toLowerCase() === 'date');
  const rows: KitCell[][] = body.map((row) =>
    row.map((cell, c): KitCell => {
      if (c === dateAt) return { date: serialOf(cell.slice(0, 10)) };
      return cell.trim() !== '' && Number.isFinite(Number(cell)) ? Number(cell) : cell;
    }),
  );
  return { name, rows: [header, ...rows] };
}

const day = (iso: string) => ({ date: serialOf(iso) });

describe('an xlsx with the Workout Log', () => {
  it('gives the same workouts as the CSV it was made from', async () => {
    const fromCsv = readMacroFactorText(workoutCsv).workouts;
    const fromXlsx = (await readMacroFactorBytes(makeXlsx([sheetFromCsv('Workout Log', workoutCsv)]))).workouts;
    expect(fromXlsx?.workouts).toHaveLength(4);
    expect(fromXlsx).toEqual(fromCsv);
  });

  it('reads a duration formatted as a time, and a date with a start time', async () => {
    const content = await readMacroFactorBytes(
      makeXlsx([
        {
          name: 'Workouts',
          rows: [
            ['Date', 'Workout', 'Workout Duration', 'Exercise', 'Weight (kg)', 'Reps'],
            [{ date: serialOf('2026-10-14', 18 * 3600 + 5 * 60) }, 'Lower A', { time: 3720 / 86400 }, 'Back Squat', 100, 6],
            [{ date: serialOf('2026-10-14', 18 * 3600 + 5 * 60) }, 'Lower A', { time: 3720 / 86400 }, 'Back Squat', 100, 5],
          ],
        },
      ]),
    );
    expect(content.workouts?.workouts[0]).toMatchObject({ date: '2026-10-14', start: '2026-10-14T18:05:00', durationSec: 3720, setCount: 2 });
  });
});

describe('an xlsx with weight', () => {
  const weightRows: KitCell[][] = [
    ['Date', 'Scale Weight (kg)', 'Weight Trend (kg)'],
    [day('2026-10-13'), 86.1, 85.7],
    [day('2026-10-14'), 85.5, 85.6],
    [day('2026-10-15'), null, 85.5],
  ];

  it('reads one sheet with both columns', async () => {
    const content = await readMacroFactorBytes(makeXlsx([{ name: 'Weight', rows: weightRows }]));
    expect(content.workouts).toBeUndefined();
    expect(content.weight?.hasTrend).toBe(true);
    expect(content.weight?.days).toEqual([
      { date: '2026-10-13', scaleKg: 86.1, trendKg: 85.7 },
      { date: '2026-10-14', scaleKg: 85.5, trendKg: 85.6 },
      { date: '2026-10-15', trendKg: 85.5 },
    ]);
  });

  it('puts a sheet for the trend and a sheet for the scale together, by day', async () => {
    const content = await readMacroFactorBytes(
      makeXlsx([
        { name: 'Scale Weight', rows: [['Date', 'Weight (kg)'], [day('2026-10-13'), 86.1], [day('2026-10-14'), 85.5]] },
        { name: 'Weight Trend', rows: [['Date', 'Weight (kg)'], [day('2026-10-13'), 85.7], [day('2026-10-14'), 85.6], [day('2026-10-15'), 85.5]] },
      ]),
    );
    expect(content.weight?.days).toEqual([
      { date: '2026-10-13', scaleKg: 86.1, trendKg: 85.7 },
      { date: '2026-10-14', scaleKg: 85.5, trendKg: 85.6 },
      { date: '2026-10-15', trendKg: 85.5 },
    ]);
  });

  it('takes pounds from the heading', async () => {
    const content = await readMacroFactorBytes(makeXlsx([{ name: 'Weight', rows: [['Date', 'Scale Weight (lbs)'], [day('2026-10-13'), 190]] }]));
    expect(content.weight?.days[0].scaleKg).toBeCloseTo(86.18, 2);
  });

  it('reads a date that is a plain number in a column called Date', () => {
    const content = readMacroFactorTables([{ name: 'Weight', rows: [['Date', 'Weight (kg)'], [serialOf('2026-10-13'), 86.1]] }]);
    expect(content.weight?.days).toEqual([{ date: '2026-10-13', scaleKg: 86.1 }]);
  });
});

describe('an export with weight and workouts in one file', () => {
  const sheets = (): KitSheet[] => [
    { name: 'Weight Trend', rows: [['Date', 'Weight Trend (kg)'], [day('2026-10-13'), 85.7], [day('2026-10-14'), 85.6]] },
    { name: 'Scale Weight', rows: [['Date', 'Scale Weight (kg)'], [day('2026-10-14'), 85.5]] },
    sheetFromCsv('Workout Log', workoutCsv),
    { name: 'Voeding', rows: [['Date', 'Calories', 'Protein'], [day('2026-10-14'), 2400, 180]] },
  ];

  it('imports both and ignores the sheet it does not know', async () => {
    const content = await readMacroFactorBytes(makeXlsx(sheets()));
    expect(content.workouts?.workouts).toHaveLength(4);
    expect(content.weight?.days).toEqual([
      { date: '2026-10-13', trendKg: 85.7 },
      { date: '2026-10-14', scaleKg: 85.5, trendKg: 85.6 },
    ]);
    expect(content.ignoredSheets).toBe(1);
  });

  it('does not take the weight of the sets for body weight', async () => {
    const content = await readMacroFactorBytes(makeXlsx([sheetFromCsv('Workout Log', workoutCsv)]));
    expect(content.weight).toBeUndefined();
  });

  it('finds the headings under a title row', async () => {
    const content = await readMacroFactorBytes(
      makeXlsx([
        { name: 'Weight', rows: [['MacroFactor export'], [], ['Date', 'Scale Weight (kg)'], [day('2026-10-13'), 86.1]] },
        { name: 'Log', rows: [['Titel'], ...sheetFromCsv('x', workoutCsv).rows] },
      ]),
    );
    expect(content.weight?.days).toEqual([{ date: '2026-10-13', scaleKg: 86.1 }]);
    expect(content.workouts?.workouts).toHaveLength(4);
  });

  it('still imports what it can read and leaves the other sheet alone without a word', async () => {
    const content = await readMacroFactorBytes(
      makeXlsx([
        { name: 'Weight', rows: weightRowsOf() },
        { name: 'Oefeningen', rows: [['Date', 'Workout', 'Exercise', 'Reps'], [day('2026-10-14'), 'Lower A', 'Squat', 5]] },
      ]),
    );
    expect(content.weight?.days).toHaveLength(1);
    expect(content.workouts).toBeUndefined();
    expect(content.ignoredSheets).toBe(1);
  });
});

function weightRowsOf(): KitCell[][] {
  return [['Date', 'Scale Weight (kg)'], [day('2026-10-13'), 86.1]];
}

describe('what is said when the layout is not known', () => {
  it('names the columns found, per sheet, when no sheet fits', async () => {
    const e = await refused(
      makeXlsx([
        { name: 'Voeding', rows: [['Date', 'Calories', 'Protein'], [day('2026-10-14'), 2400, 180]] },
        { name: 'Stappen', rows: [['Datum', 'Steps (count)'], [day('2026-10-14'), 9000]] },
      ]),
    );
    expect(e.message).toMatch(/geen gewicht en geen krachttrainingen/);
    expect(e.message).not.toContain('Calories');
    expect(e.details).toMatch(/herkent geen werkblad/);
    expect(e.details).toContain('Voeding (Date, Calories, Protein)');
    expect(e.details).toContain('Stappen (Datum, Steps (count))');
    expect(e.details).toMatch(/Geef deze kolomnamen door/);
  });

  it('gives the usual message for a single sheet that is not known', async () => {
    const e = await refused(makeXlsx([{ name: 'Stappen', rows: [['Date', 'Steps', 'Floors'], [day('2026-10-14'), 9400, 12]] }]));
    expect(e.message).toMatch(/geen gewicht en geen krachttrainingen/);
    expect(e.details).toMatch(/niet de Workout Log van MacroFactor/);
    expect(e.details).toContain('Gevonden kolommen: Date, Steps, Floors');
  });

  it('says a sheet without a usable weight has none', async () => {
    const e = await refused(makeXlsx([{ name: 'Weight', rows: [['Date', 'Scale Weight (kg)'], [day('2026-10-13'), null]] }]));
    expect(e.details).toMatch(/geen gewicht met een datum/);
  });

  it('says a workbook without rows is empty', async () => {
    expect((await refused(makeXlsx([{ name: 'Leeg', rows: [] }]))).message).toMatch(/leeg/);
  });

  it('writes none of the dashes the app avoids', async () => {
    const e = await refused(makeXlsx([{ name: 'A', rows: [['x', 'y']] }, { name: 'B', rows: [['z']] }]));
    expect(e.message).not.toMatch(/[–—]/);
    expect(e.details).not.toMatch(/[–—]/);
  });
});

describe('a CSV through the same door', () => {
  it('reads the bytes of a CSV, with or without a byte order mark', async () => {
    const bytes = new TextEncoder().encode(weightCsv);
    expect((await readMacroFactorBytes(bytes)).weight?.days).toHaveLength(14);
    const withBom = new Uint8Array([0xef, 0xbb, 0xbf, ...bytes]);
    expect((await readMacroFactorBytes(withBom)).weight?.days).toHaveLength(14);
    expect((await readMacroFactorBytes(new TextEncoder().encode(workoutCsv))).workouts?.workouts).toHaveLength(4);
  });

  it('uses the file name for a plain Weight column', () => {
    const csv = 'Date,Weight (kg)\n2026-10-13,85.7\n';
    expect(readMacroFactorText(csv, 'Weight Trend.csv').weight?.days).toEqual([{ date: '2026-10-13', trendKg: 85.7 }]);
    expect(readMacroFactorText(csv, 'weight.csv').weight?.days).toEqual([{ date: '2026-10-13', scaleKg: 85.7 }]);
  });
});

// MacroFactor's real "xlsx" (seen in an export from October 2026): one sheet
// named "in", every row a single cell holding the whole CSV line. Made-up
// workouts, the real shape.
describe('the xlsx MacroFactor actually writes: CSV text in one cell per row', () => {
  const lines = [
    'Date,"Workout Duration","Workout","Exercise","Exercise Base Weight (kg)","Set Type","Weight (kg)","Reps","RIR","Duration","Distance short (m)","Distance long (km)"',
    '2026-09-30,"1901","Upper Lower (Workout B)","Barbell Back Squat",,"Warm-Up Set","20.0","7.0",,,,',
    '2026-09-30,"1901","Upper Lower (Workout B)","Barbell Back Squat",,"Standard Set","80.0","6.0","2.0",,,',
    '2026-09-30,"1901","Upper Lower (Workout B)","Romanian Deadlift",,"Standard Set","70.0","8.0","1.0",,,',
  ];

  it('reads the workouts, with the duration in seconds', async () => {
    const content = await readMacroFactorBytes(makeXlsx([{ name: 'in', rows: lines.map((l) => [l]) }]));
    const workouts = content.workouts!.workouts;
    expect(workouts).toHaveLength(1);
    expect(workouts[0].date).toBe('2026-09-30');
    expect(workouts[0].durationSec).toBe(1901);
    expect(workouts[0].exercises.map((e) => e.name)).toEqual(['Barbell Back Squat', 'Romanian Deadlift']);
  });

  it('says plainly that a Food Log is not used', async () => {
    const food = [
      'Date,"Time","Food Name","Serving Size","Calories (kcal)","Fat (g)","Carbs (g)","Protein (g)"',
      '2026-09-29,"07:00","Havermout","g","150","3","27","5"',
    ];
    const err = await refused(makeXlsx([{ name: 'in', rows: food.map((l) => [l]) }]));
    expect(err.message).toContain('Food Log');
    expect(err.message).toContain('Weight Trend');
  });
});

describe('the summary of a whole export', () => {
  const workoutSheet = (): KitSheet => sheetFromCsv('Workout Log', workoutCsv);
  const manySheets = (): KitSheet[] => [
    { name: 'Voeding', rows: [['Date', 'Calories', 'Protein'], [day('2026-10-14'), 2400, 180]] },
    { name: 'Workouts', rows: [['Exercise', 'Notes', 'Set 1 Type', 'Set 1 RIR', 'Set 1 Rest'], ['Squat', '', 'Normal', 2, 90]] },
    { name: 'Weight Trend', rows: [['Date', 'Trend Weight (kg)'], [day('2026-10-13'), 85.6]] },
    { name: 'Instellingen', rows: [['Setting', 'Value'], ['Doel', 'Behouden']] },
  ];

  it('reads the weight, says nothing per sheet and counts the ones it left alone', async () => {
    const content = await readMacroFactorBytes(makeXlsx(manySheets()));
    expect(content.weight?.days).toHaveLength(1);
    expect(content.workouts).toBeUndefined();
    expect(content.ignoredSheets).toBe(3);
  });

  it('makes a few calm lines of it', () => {
    const lines = importSummary({ weight: { kg: 85.6, date: '2026-10-13', basis: 'trend', added: 0, offInSettings: false }, ignoredSheets: 3 }, () => '13 oktober');
    expect(lines).toEqual([
      'Gewicht: 85,6 kg op 13 oktober (trendgewicht), stond al in ASCEND.',
      'Trainingen: geen in dit bestand. Voor je sets en RIR deel je de Workout Log.',
      'Voeding en andere gegevens laat ASCEND liggen.',
    ]);
  });

  it('counts the workouts and the new days, and leaves out the last line when nothing was left alone', async () => {
    const content = await readMacroFactorBytes(makeXlsx([workoutSheet()]));
    expect(content.ignoredSheets).toBe(0);
    const lines = importSummary({ weight: { kg: 80, date: '2026-10-13', basis: 'scale', added: 3, offInSettings: true }, workoutCount: content.workouts?.workouts.length, ignoredSheets: 0 }, () => '13 oktober');
    expect(lines[0]).toContain('3 dagen opgeslagen.');
    expect(lines[0]).toContain('staat uit');
    expect(lines[1]).toBe('Trainingen: 4 krachttrainingen gevonden. Hieronder koppel je ze.');
    expect(lines).toHaveLength(2);
    expect(lines.join(' ')).not.toMatch(/[–—]/);
  });

  it('says there is no weight when the file has none', () => {
    expect(importSummary({ workoutCount: 1, ignoredSheets: 0 }, () => '')[0]).toBe('Gewicht: niet in dit bestand.');
  });
});

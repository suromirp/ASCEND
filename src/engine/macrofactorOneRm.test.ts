import { describe, expect, it } from 'vitest';
import { isOneRmSheetName, mergeOneRmResults, oneRmFromMacroFactor, readOneRmRows } from './macrofactorOneRm';
import type { Cell } from './sheetTable';

// Made-up sheets only, built in the test: the shape of the sheet "Exercises - 1-RM"
// (a Date column, then one column per exercise with the unit in its heading, empty
// cells on the days an exercise was not trained), with invented numbers.

describe('isOneRmSheetName', () => {
  it('kent het 1-RM-blad aan zijn naam en laat 3-RM en 10-RM met rust', () => {
    for (const name of ['Exercises - 1-RM', '1RM', '1 RM', 'exercises 1rm', 'Exercises - 1-RM.csv', 'One Rep Max']) expect(isOneRmSheetName(name), name).toBe(true);
    for (const name of ['Exercises - 3-RM', 'Exercises - 10-RM', '11-RM', 'Exercises - Heaviest Weight', 'Weight Trend', '', undefined]) expect(isOneRmSheetName(name), String(name)).toBe(false);
  });
});

describe('readOneRmRows', () => {
  const rows: Cell[][] = [
    ['Date', 'Back Squat (kg)', 'Hanging Leg Raise (kg)', 'Fantasie Oefening (kg)'],
    ['2026-10-05', 100, '', ''],
    ['2026-10-12', 102.456, 40, ''],
    ['2026-10-19', '', 41.5, 60],
  ];

  it('geeft per oefening de reeks van datum en kg, oudste eerst, met lege cellen overgeslagen', () => {
    const result = readOneRmRows(rows)!;
    expect(result.skippedCells).toBe(0);
    expect(result.exercises).toEqual([
      { name: 'Back Squat', points: [{ date: '2026-10-05', kg: 100 }, { date: '2026-10-12', kg: 102.46 }] },
      { name: 'Hanging Leg Raise', points: [{ date: '2026-10-12', kg: 40 }, { date: '2026-10-19', kg: 41.5 }] },
      { name: 'Fantasie Oefening', points: [{ date: '2026-10-19', kg: 60 }] },
    ]);
  });

  it('zoekt de kop onder een titelrij en leest de kolommen op naam, niet op plek', () => {
    const result = readOneRmRows([['MacroFactor export'], ['Hanging Leg Raise (kg)', 'Date'], [40, '2026-10-12']])!;
    expect(result.exercises).toEqual([{ name: 'Hanging Leg Raise', points: [{ date: '2026-10-12', kg: 40 }] }]);
  });

  it('rekent ponden om naar kilo', () => {
    const result = readOneRmRows([['Date', 'Back Squat (lbs)'], ['2026-10-05', 225]])!;
    expect(result.exercises[0].points).toEqual([{ date: '2026-10-05', kg: 102.06 }]);
  });

  it('leest een getal met komma en een datum met een tijd', () => {
    const result = readOneRmRows([['Date', 'Back Squat (kg)'], ['2026-10-05 07:30', '100,5']])!;
    expect(result.exercises[0].points).toEqual([{ date: '2026-10-05', kg: 100.5 }]);
  });

  it('telt wat er stond maar niet te lezen is, en slaat het over', () => {
    const result = readOneRmRows([['Date', 'Back Squat (kg)'], ['2026-10-05', 100], ['2026-10-06', -5], ['2026-10-07', 'veel'], ['geen datum', 90], ['2026-10-09', 5000]])!;
    expect(result.exercises[0].points).toEqual([{ date: '2026-10-05', kg: 100 }]);
    expect(result.skippedCells).toBe(4);
  });

  it('een kop die twee keer voorkomt is een oefening, en de laatste waarde van een dag telt', () => {
    const result = readOneRmRows([['Date', 'Back Squat (kg)', 'back squat (kg)'], ['2026-10-05', 100, ''], ['2026-10-05', '', 101]])!;
    expect(result.exercises).toEqual([{ name: 'Back Squat', points: [{ date: '2026-10-05', kg: 101 }] }]);
  });

  it('laat een oefening zonder één bruikbare waarde weg', () => {
    expect(readOneRmRows([['Date', 'Back Squat (kg)', 'Leeg (kg)'], ['2026-10-05', 100, '']])!.exercises.map((e) => e.name)).toEqual(['Back Squat']);
  });

  it('geeft niets terug voor een tabel zonder datumkolom', () => {
    expect(readOneRmRows([['Oefening', 'Gewicht'], ['Back Squat', 100]])).toBeUndefined();
    expect(readOneRmRows([['Date']])).toBeUndefined();
    expect(readOneRmRows([])).toBeUndefined();
  });
});

describe('mergeOneRmResults en oneRmFromMacroFactor', () => {
  const a = readOneRmRows([['Date', 'Back Squat (kg)'], ['2026-10-05', 100], ['2026-10-12', 101]])!;
  const b = readOneRmRows([['Date', 'Back Squat (kg)', 'Hanging Leg Raise (kg)'], ['2026-10-12', 102, 40], ['2026-10-19', 103, '']])!;

  it('voegt twee bladen samen: de dagen bij elkaar, de latere waarde wint', () => {
    const merged = mergeOneRmResults(a, b);
    expect(merged.exercises.find((e) => e.name === 'Back Squat')?.points).toEqual([
      { date: '2026-10-05', kg: 100 },
      { date: '2026-10-12', kg: 102 },
      { date: '2026-10-19', kg: 103 },
    ]);
    expect(merged.exercises).toHaveLength(2);
    expect(mergeOneRmResults(undefined, b)).toBe(b);
  });

  it('bewaart per oefening de reeks met de bron MacroFactor', () => {
    expect(oneRmFromMacroFactor(a)).toEqual([{ exerciseName: 'Back Squat', source: 'macrofactor', points: [{ date: '2026-10-05', kg: 100 }, { date: '2026-10-12', kg: 101 }] }]);
  });
});

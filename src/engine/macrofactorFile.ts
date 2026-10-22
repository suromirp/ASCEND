// ASCEND: the one door for a MacroFactor export, CSV or xlsx.
//
// "Delen met ASCEND" and "Kies bestand" hand over the bytes of a file. This
// turns them into tables (a CSV is one table, an xlsx one per worksheet),
// finds out per table what it holds and reads it with the Workout Log reader
// (engine/macrofactorImport.ts) or the weight reader
// (engine/macrofactorWeight.ts). One file may hold both: a Granular Export
// with several sheets gives workouts and weight in one go.
//
// Recognition is by column names, never by sheet name or position (the sheet
// name only settles whether a plain "Weight" column is the trend or the
// scale). The heading may be below a title row (the first ten rows are
// searched). A sheet that is not recognised is skipped when another one is;
// when none is, the message names the columns found per sheet, so they can be
// passed on and added to the lists of names.

import {
  mapColumns,
  MacroFactorFormatError,
  parseCsv,
  readMacroFactorRows,
  REQUIRED,
  type MacroFactorReadResult,
} from './macrofactorImport';
import {
  isWorkoutLog,
  mapWeightColumns,
  readMacroFactorWeightRows,
  weightHintFromName,
  type MacroFactorWeightDay,
  type MacroFactorWeightResult,
} from './macrofactorWeight';
import { cellText, isXlsx, type Cell, type SheetTable } from './sheetTable';

export interface MacroFactorContent {
  workouts?: MacroFactorReadResult;
  weight?: MacroFactorWeightResult;
  // A sheet that looked like workouts or weight but could not be read, while
  // another sheet could: said to the user, in Dutch.
  notes: string[];
}

type Kind = 'workouts' | 'weight' | 'unknown';

// How many rows from the top are searched for the heading.
const HEADER_SEARCH_ROWS = 10;
// A heading further down needs at least this many Workout Log columns.
const MIN_WORKOUT_COLUMNS = 3;

function locate(table: SheetTable): { kind: Kind; at: number } {
  const hint = weightHintFromName(table.name);
  const first = table.rows[0].map(cellText);
  // The first row decides as it always did: any workout column makes it a
  // workout log (so a missing column is reported by that reader), else a weight column.
  if (isWorkoutLog(first)) return { kind: 'workouts', at: 0 };
  const firstIndex = mapWeightColumns(first, hint);
  if (firstIndex.trend !== undefined || firstIndex.scale !== undefined) return { kind: 'weight', at: 0 };
  // A title row may come first: look further down, with stricter rules.
  for (let at = 1; at < Math.min(HEADER_SEARCH_ROWS, table.rows.length); at++) {
    const header = table.rows[at].map(cellText);
    if (isWorkoutLog(header)) {
      const found = REQUIRED.filter((id) => mapColumns(header).index[id] !== undefined).length;
      if (found >= MIN_WORKOUT_COLUMNS) return { kind: 'workouts', at };
      continue;
    }
    const index = mapWeightColumns(header, hint);
    if (index.date !== undefined && (index.trend !== undefined || index.scale !== undefined)) return { kind: 'weight', at };
  }
  return { kind: 'unknown', at: 0 };
}

function mergeWeight(a: MacroFactorWeightResult | undefined, b: MacroFactorWeightResult): MacroFactorWeightResult {
  if (!a) return b;
  const byDate = new Map<string, MacroFactorWeightDay>(a.days.map((d) => [d.date, d]));
  for (const day of b.days) byDate.set(day.date, { ...byDate.get(day.date), ...day });
  const days = [...byDate.values()].sort((x, y) => x.date.localeCompare(y.date));
  return { days, skippedRows: a.skippedRows + b.skippedRows, hasTrend: days.some((d) => d.trendKg !== undefined) };
}

function mergeWorkouts(a: MacroFactorReadResult | undefined, b: MacroFactorReadResult): MacroFactorReadResult {
  if (!a) return b;
  const ids = new Set(a.workouts.map((w) => w.externalId));
  const workouts = [...a.workouts, ...b.workouts.filter((w) => !ids.has(w.externalId))];
  workouts.sort((x, y) => x.start.localeCompare(y.start) || x.name.localeCompare(y.name));
  return { workouts, skippedRows: a.skippedRows + b.skippedRows };
}

function headingsOf(rows: Cell[][]): string {
  const headings = (rows[0] ?? []).map((c) => cellText(c).trim()).filter(Boolean);
  return headings.slice(0, 14).join(', ') + (headings.length > 14 ? ', ...' : '') || 'geen';
}

function unknownLayoutMessage(tables: SheetTable[]): string {
  const sheets = tables.map((t, i) => `${t.name || `Blad ${i + 1}`} (${headingsOf(t.rows)})`).join('; ');
  return (
    'ASCEND herkent geen werkblad in dit bestand. ASCEND zoekt gewicht (datum met trendgewicht en/of weegschaalgewicht) of de Workout Log (datum, training, oefening, gewicht, herhalingen). ' +
    `Gevonden werkbladen en kolommen: ${sheets}. Geef deze kolomnamen door, dan kan ASCEND ze leren herkennen.`
  );
}

export function readMacroFactorTables(tables: SheetTable[]): MacroFactorContent {
  const usable = tables.filter((t) => t.rows.length > 0);
  if (usable.length === 0) throw new MacroFactorFormatError('Het bestand is leeg.');
  const content: MacroFactorContent = { notes: [] };
  const problems: { table: SheetTable; error: MacroFactorFormatError }[] = [];
  const unknown: SheetTable[] = [];

  for (const table of usable) {
    const located = locate(table);
    const at = located.at;
    // A file with one table that is not recognised gets the Workout Log
    // reader's message: it names what is missing and what was found.
    const kind: Kind = located.kind === 'unknown' && usable.length === 1 ? 'workouts' : located.kind;
    if (kind === 'unknown') {
      unknown.push(table);
      continue;
    }
    const rows = table.rows.slice(at);
    try {
      if (kind === 'weight') content.weight = mergeWeight(content.weight, readMacroFactorWeightRows(rows, table.name));
      else content.workouts = mergeWorkouts(content.workouts, readMacroFactorRows(rows));
    } catch (err) {
      if (!(err instanceof MacroFactorFormatError)) throw err;
      problems.push({ table, error: err });
    }
  }

  if (content.workouts || content.weight) {
    if (usable.length > 1) content.notes = problems.map((p) => `Werkblad ${p.table.name || 'zonder naam'}: ${p.error.message}`);
    return content;
  }
  if (problems.length > 0) throw problems[0].error;
  throw new MacroFactorFormatError(unknownLayoutMessage(unknown));
}

export function readMacroFactorText(text: string, fileName?: string): MacroFactorContent {
  return readMacroFactorTables([{ name: fileName ?? '', rows: parseCsv(text) }]);
}

// The bytes of a file as shared or picked: an xlsx (a zip, starts with "PK")
// or a CSV in UTF-8. The xlsx reader and its zip library are loaded only here.
export async function readMacroFactorBytes(bytes: Uint8Array, fileName?: string): Promise<MacroFactorContent> {
  if (isXlsx(bytes)) {
    const { readXlsx, XlsxError } = await import('./xlsx');
    try {
      return readMacroFactorTables(await readXlsx(bytes));
    } catch (err) {
      if (err instanceof XlsxError) throw new MacroFactorFormatError(err.message);
      throw err;
    }
  }
  return readMacroFactorText(new TextDecoder('utf-8').decode(bytes), fileName);
}

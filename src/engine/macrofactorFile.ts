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
import { isProgramTable, readProgramRows, type MacroFactorProgram } from './macrofactorProgram';
import { isOneRmSheetName, mergeOneRmResults, readOneRmRows, type MacroFactorOneRmResult } from './macrofactorOneRm';

export interface MacroFactorContent {
  workouts?: MacroFactorReadResult;
  weight?: MacroFactorWeightResult;
  // The training program (sheet "Training Programs"), offered as a proposal
  // for the strength templates (engine/macrofactorProgram.ts).
  program?: MacroFactorProgram;
  // The 1RM per exercise (sheet "Exercises - 1-RM"), kept next to ASCEND's own
  // estimate on Forge (engine/macrofactorOneRm.ts).
  oneRm?: MacroFactorOneRmResult;
  // How many sheets were left alone (food, notes, settings, program templates
  // and the like). Said in one line, never one error per sheet.
  ignoredSheets: number;
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
  return { days, skippedRows: a.skippedRows + b.skippedRows, hasTrend: days.some((d) => d.trendKg !== undefined), hasFat: days.some((d) => d.fatPct !== undefined) };
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

// MacroFactor's own "xlsx" export is CSV in disguise: every row is one cell
// holding the whole comma separated line (`Date,"Workout Duration",...`).
// Such a sheet is turned back into a real table before anything else.
export function unwrapCsvInCells(table: SheetTable): SheetTable {
  const lines = table.rows
    .map((row) => row.map(cellText).filter((t) => t.trim() !== ''))
    .filter((cells) => cells.length > 0);
  if (lines.length === 0) return table;
  const oneCellEach = lines.every((cells) => cells.length === 1);
  if (!oneCellEach || !lines[0][0].includes(',')) return table;
  return { ...table, rows: parseCsv(lines.map((cells) => cells[0]).join('\n')) };
}

// The Food Log has the same disguise and is never used by ASCEND: say so
// plainly instead of listing sixty nutrient columns.
const isFoodLog = (table: SheetTable) => {
  const header = (table.rows[0] ?? []).map((c) => cellText(c).toLowerCase());
  return header.some((h) => h.includes('food name')) || (header.some((h) => h.startsWith('calories')) && header.some((h) => h.startsWith('protein')));
};
const FOOD_LOG_MESSAGE =
  'Dit is je Food Log (wat je at). Die gebruikt ASCEND niet. Kies in MacroFactor bij Granular Export onder Metrics & Analytics Weight Trend en Scale Weight voor je gewicht, of Export Workout Log voor je krachttrainingen.';

const NOTHING_USABLE_MESSAGE = 'ASCEND vindt in dit bestand geen gewicht en geen krachttrainingen. Kies de Workout Log, of Weight Trend en Scale Weight.';

export function readMacroFactorTables(input: SheetTable[]): MacroFactorContent {
  const tables = input.map(unwrapCsvInCells);
  const usable = tables.filter((t) => t.rows.length > 0);
  if (usable.length > 0 && usable.every(isFoodLog)) throw new MacroFactorFormatError(FOOD_LOG_MESSAGE);
  if (usable.length === 0) throw new MacroFactorFormatError('Het bestand is leeg.');
  const content: MacroFactorContent = { ignoredSheets: 0 };
  const problems: { table: SheetTable; error: MacroFactorFormatError }[] = [];
  const unknown: SheetTable[] = [];

  for (const table of usable) {
    // The training program: a heading with Exercise and Set 1 Rep Range.
    if (isProgramTable(table.rows)) {
      const program = readProgramRows(table.rows);
      if (program) {
        content.program ??= program;
        continue;
      }
    }
    // The 1RM per exercise: told apart from the 3-RM and 10-RM sheets (the same
    // shape) by the name of the sheet, as "Weight Trend" is.
    if (isOneRmSheetName(table.name)) {
      const oneRm = readOneRmRows(table.rows);
      if (oneRm) {
        content.oneRm = mergeOneRmResults(content.oneRm, oneRm);
        continue;
      }
    }
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

  if (content.workouts || content.weight || content.program || content.oneRm) {
    // A sheet that could not be read while another could is left alone, like
    // the ones that are not recognised: nothing is said per sheet.
    content.ignoredSheets = problems.length + unknown.length + (input.length - usable.length);
    return content;
  }
  // Nothing usable at all: one plain line, the technical part behind "Details".
  const details = problems.length > 0 ? problems.map((p) => `${p.table.name || 'Werkblad'}: ${p.error.message}`).join('\n') : unknownLayoutMessage(unknown);
  throw new MacroFactorFormatError(NOTHING_USABLE_MESSAGE, problems[0]?.error.missing ?? [], details);
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

// --- the summary --------------------------------------------------------------------

export interface ImportSummaryInput {
  // A training program was found: its name, the number of training days and weeks.
  program?: { name: string; days: number; weeks: number };
  // The last weight in the file, with what happened to it.
  weight?: { kg: number; date: string; basis: 'trend' | 'scale'; added: number; offInSettings: boolean; fatDays?: number };
  workoutCount?: number;
  // The 1RM per exercise: for how many exercises how many new days were stored.
  oneRm?: { exercises: number; added: number };
  ignoredSheets: number;
}

const daysWord = (n: number) => (n === 1 ? '1 dag' : `${n} dagen`);

// A few calm lines for the page, in plain Dutch: weight, workouts, and what is
// left alone. Pure; the page only shows them.
export function importSummary(input: ImportSummaryInput, formatDate: (iso: string) => string): string[] {
  const lines: string[] = [];
  if (input.weight) {
    const w = input.weight;
    const kg = new Intl.NumberFormat('nl-NL', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(w.kg);
    const what = w.basis === 'trend' ? 'trendgewicht' : 'weegschaal';
    const stored = w.added > 0 ? `${daysWord(w.added)} opgeslagen.` : 'stond al in ASCEND.';
    const off = w.offInSettings ? ' Let op: Gewicht uit MacroFactor gebruiken staat uit, dus ASCEND rekent er nog niet mee.' : '';
    lines.push(`Gewicht: ${kg} kg op ${formatDate(w.date)} (${what}), ${stored}${off}`);
    if (w.fatDays && w.fatDays > 0) lines.push(`Vetpercentage: ${w.fatDays === 1 ? '1 meting' : `${w.fatDays} metingen`} uit je weegschaal gelezen.`);
  } else {
    lines.push('Gewicht: niet in dit bestand.');
  }
  if (input.workoutCount && input.workoutCount > 0) {
    lines.push(`Trainingen: ${input.workoutCount === 1 ? '1 krachttraining' : `${input.workoutCount} krachttrainingen`} gevonden. Hieronder koppel je ze.`);
  } else {
    lines.push('Trainingen: geen in dit bestand. Voor je sets en RIR deel je de Workout Log.');
  }
  if (input.program) {
    const p = input.program;
    lines.push(`Programma: ${p.name}, ${p.days === 1 ? '1 training' : `${p.days} trainingen`} per week, ${p.weeks === 1 ? '1 week' : `${p.weeks} weken`}. Hieronder zie je het voorstel.`);
  }
  if (input.oneRm) {
    const { exercises, added } = input.oneRm;
    lines.push(
      added > 0
        ? `1RM van MacroFactor: ${added === 1 ? '1 meting' : `${added} metingen`} bij ${exercises === 1 ? '1 oefening' : `${exercises} oefeningen`} opgeslagen. Je ziet ze naast je eigen schatting op Forge.`
        : '1RM van MacroFactor: stond al in ASCEND.',
    );
  }
  if (input.ignoredSheets > 0) lines.push('Voeding en andere gegevens laat ASCEND liggen.');
  return lines;
}

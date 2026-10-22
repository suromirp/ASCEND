// ASCEND: MacroFactor "Workout Log" (Granular Export) lezen
// (docs/visie/Data zonder handwerk.md, idee 2).
//
// Pure and without a library: a table of rows goes in (a CSV text through
// parseCsv, or a worksheet of an xlsx through engine/xlsx.ts, both as
// Cell[][]), workouts come out. The
// columns are found by NAME (case-insensitive, English or Dutch, a unit in
// the heading such as "(kg)" or "(min)" is read as the unit), never by
// position, so a reordered or extended export still works. A file that lacks
// a column ASCEND needs is refused with a Dutch message that says which one.
//
// Nothing in this file knows about ASCEND's plan or logs; that is
// engine/macrofactorLink.ts. This file only answers "what is in the file".

import { cleanExerciseName } from './exerciseMatch';
import { cellText, excelSerialToText, SERIAL_MAX, SERIAL_MIN, type Cell } from './sheetTable';

export interface MacroFactorSet {
  reps: number;
  weightKg?: number;
  // Reps in reserve: how many reps were left (0 = to failure).
  rir?: number;
  // Only 'warmup' is ever set here; absent is a working set.
  kind?: 'warmup';
}

export interface MacroFactorExercise {
  name: string;
  // Working sets in the order of the file (warm-up sets left out). Everything
  // that counts sets (the leg index, the top set, the set count) reads this.
  sets: MacroFactorSet[];
  // Every set of the exercise in the order of the file, warm-up sets included
  // (kind 'warmup'), each with its own reps in reserve. What ASCEND stores.
  loggedSets?: MacroFactorSet[];
  // The heaviest set: most weight, then most reps, then the fewest reps left.
  top: MacroFactorSet;
}

export interface MacroFactorWorkout {
  // Stable id for SessionLog.externalId: "macrofactor:2026-10-14:benen a".
  externalId: string;
  // The day, "2026-10-14".
  date: string;
  // Local start "2026-10-14T18:05:00"; noon when the file has no time of day.
  start: string;
  // The name as MacroFactor shows it.
  name: string;
  // Length of the workout in seconds, absent when the file has none for it.
  durationSec?: number;
  exercises: MacroFactorExercise[];
  setCount: number;
}

export interface MacroFactorReadResult {
  workouts: MacroFactorWorkout[];
  // Rows that were not counted as a working set (a warm-up, which is kept as a
  // warm-up set, or a set without reps, which is dropped).
  skippedRows: number;
}

// The message is Dutch and meant to be shown as is.
export class MacroFactorFormatError extends Error {
  readonly missing: string[];
  // The technical part (found sheets and columns), shown behind "Details" and
  // never as a block of text.
  readonly details?: string;
  constructor(message: string, missing: string[] = [], details?: string) {
    super(message);
    this.name = 'MacroFactorFormatError';
    this.missing = missing;
    this.details = details;
  }
}

// --- CSV ---------------------------------------------------------------------

function detectDelimiter(firstLine: string): string {
  const count = (c: string) => firstLine.split(c).length - 1;
  const candidates = [',', ';', '\t'];
  return candidates.reduce((best, c) => (count(c) > count(best) ? c : best), ',');
}

// RFC 4180 with the usual leniency: quoted fields may hold the delimiter, a
// line break and "" for a quote; \r\n, \n and \r all end a row.
export function parseCsv(input: string): string[][] {
  const text = input.replace(/^﻿/, '');
  const firstLine = text.split(/\r\n|\n|\r/, 1)[0] ?? '';
  const delimiter = detectDelimiter(firstLine);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === delimiter) {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      rows.push(row);
      row = [];
    } else field += ch;
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

// --- columns ----------------------------------------------------------------

export type ColumnId = 'date' | 'workout' | 'duration' | 'exercise' | 'weight' | 'reps' | 'rir' | 'setType';

// Heading after dropping units and everything that is not a letter or digit.
const ALIASES: Record<ColumnId, string[]> = {
  date: ['date', 'datum', 'workoutdate', 'workoutdatum', 'startdate', 'startdatum', 'datetime', 'datumtijd', 'day', 'dag'],
  workout: ['workout', 'workoutname', 'workoutnaam', 'name', 'naam', 'training', 'trainingsnaam', 'trainingnaam', 'routine', 'sessie'],
  duration: ['workoutduration', 'duration', 'duur', 'workoutduur', 'trainingsduur', 'trainingduur', 'workouttime', 'elapsedtime'],
  exercise: ['exercise', 'exercisename', 'oefening', 'oefeningnaam', 'naamoefening'],
  weight: ['weight', 'gewicht', 'load', 'lastkg', 'weightused'],
  reps: ['reps', 'rep', 'repetitions', 'herhalingen', 'herhaling', 'aantalherhalingen'],
  rir: ['rir', 'repsinreserve', 'repsleft', 'herhalingeninreserve', 'herhalingenover', 'reserve'],
  setType: ['settype', 'settypes', 'soortset', 'settsoort'],
};

// What the user is told when the column is missing: Dutch name first, the
// heading MacroFactor uses in brackets.
const COLUMN_LABEL: Record<ColumnId, string> = {
  date: 'datum (Date)',
  workout: 'naam van de training (Workout)',
  duration: 'duur (Workout Duration)',
  exercise: 'oefening (Exercise)',
  weight: 'gewicht (Weight)',
  reps: 'herhalingen (Reps)',
  rir: 'herhalingen in reserve (RIR)',
  setType: 'soort set (Set Type)',
};

export const REQUIRED: ColumnId[] = ['date', 'workout', 'duration', 'exercise', 'weight', 'reps'];

export function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function headingKey(heading: string): string {
  return stripDiacritics(heading)
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b(kg|kgs|lb|lbs|min|mins|minutes|minuten|sec|secs|seconds|seconden)\b/g, ' ')
    .replace(/[^a-z0-9]/g, '');
}

export function headingUnit(heading: string): string {
  return stripDiacritics(heading).toLowerCase();
}

export interface ColumnMap {
  index: Partial<Record<ColumnId, number>>;
  headings: string[];
}

export function mapColumns(header: string[]): ColumnMap {
  const keys = header.map(headingKey);
  const index: Partial<Record<ColumnId, number>> = {};
  for (const id of Object.keys(ALIASES) as ColumnId[]) {
    // The first alias wins over the later ones, so "Workout" beats "Name"
    // when both are in the file.
    for (const alias of ALIASES[id]) {
      const at = keys.findIndex((k, i) => k === alias && !Object.values(index).includes(i));
      if (at >= 0) {
        index[id] = at;
        break;
      }
    }
  }
  return { index, headings: header.map((h) => h.trim()).filter(Boolean) };
}

function listWords(labels: string[]): string {
  if (labels.length <= 1) return labels.join('');
  return `${labels.slice(0, -1).join(', ')} en ${labels[labels.length - 1]}`;
}

function missingMessage(missing: ColumnId[], headings: string[], recognized: number): string {
  const found = headings.slice(0, 14).join(', ') + (headings.length > 14 ? ', ...' : '');
  const lead =
    recognized <= 1
      ? 'Dit lijkt niet de Workout Log van MacroFactor, en ook geen bestand met gewicht.'
      : missing.length === 1
        ? `Er ontbreekt een kolom in dit bestand: ${COLUMN_LABEL[missing[0]]}.`
        : `Er ontbreken kolommen in dit bestand: ${listWords(missing.map((m) => COLUMN_LABEL[m]))}.`;
  const advice = recognized <= 1 ? 'Kies in MacroFactor bij Granular Export de Workout Log of het gewicht.' : 'Kies in MacroFactor bij Granular Export de Workout Log.';
  return `${lead} ${advice} Gevonden kolommen: ${found || 'geen'}.`;
}

// --- cells ------------------------------------------------------------------

export function parseNumber(raw: Cell | undefined): number | undefined {
  if (raw === undefined) return undefined;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : undefined;
  let s = raw.trim().replace(/\s/g, '');
  if (s === '') return undefined;
  if (s.includes(',') && s.includes('.')) {
    // "1.234,5" or "1,234.5": the last separator is the decimal one.
    s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (s.includes(',')) s = s.replace(',', '.');
  const n = Number(s.replace(/[^0-9.+-]/g, ''));
  return Number.isFinite(n) ? n : undefined;
}

function validDate(y: number, m: number, d: number): string | undefined {
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return undefined;
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

const pad2 = (n: string) => n.padStart(2, '0');

// "2026-10-14", "2026-10-14 18:05", "2026-10-14T18:05:00Z" (the clock as
// written), "14-10-2026", "14.10.2026" and, with slashes, "10/14/2026".
export function parseDateCell(raw: Cell | undefined): { date: string; time?: string } | undefined {
  if (raw === undefined || raw === '') return undefined;
  // A number in a date column is an Excel serial (an xlsx whose cell had no date format).
  if (typeof raw === 'number') return raw >= SERIAL_MIN && raw <= SERIAL_MAX ? parseDateCell(excelSerialToText(raw)) : undefined;
  const s = raw.trim();
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (iso) {
    const date = validDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
    if (!date) return undefined;
    return { date, time: iso[4] ? `${pad2(iso[4])}:${iso[5]}:${iso[6] ?? '00'}` : undefined };
  }
  const other = s.match(/^(\d{1,2})([-./])(\d{1,2})\2(\d{4})(?:[T\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (other) {
    const a = Number(other[1]);
    const b = Number(other[3]);
    // Slashes are the American order unless the first number cannot be a month.
    const monthFirst = other[2] === '/' && a <= 12;
    const date = monthFirst ? validDate(Number(other[4]), a, b) : validDate(Number(other[4]), b, a);
    if (!date) return undefined;
    return { date, time: other[5] ? `${pad2(other[5])}:${other[6]}:${other[7] ?? '00'}` : undefined };
  }
  return undefined;
}

// A clock-like duration ("1:02:10") in seconds, else a plain number.
function parseDurationCell(raw: Cell | undefined): { value: number; clock: boolean } | undefined {
  if (raw === undefined || raw === '') return undefined;
  if (typeof raw === 'number') return Number.isFinite(raw) && raw > 0 ? { value: raw, clock: false } : undefined;
  const s = raw.trim();
  const clock = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (clock) {
    const [, a, b, c] = clock;
    const sec = c === undefined ? Number(a) * 60 + Number(b) : Number(a) * 3600 + Number(b) * 60 + Number(c);
    return { value: sec, clock: true };
  }
  const n = parseNumber(s);
  return n !== undefined && n > 0 ? { value: n, clock: false } : undefined;
}

// Below this many seconds a "duration" without a unit in the heading cannot
// be seconds (no workout is five minutes long): read it as minutes.
const SECONDS_NOT_BELOW = 300;

const isWarmup = (type: string) => type !== '' && /warm|opwarm/i.test(stripDiacritics(type));

export const LB_TO_KG = 0.45359237;

// --- the reader --------------------------------------------------------------

export function readMacroFactorCsv(text: string): MacroFactorReadResult {
  return readMacroFactorRows(parseCsv(text));
}

// The first row is the heading, the rest are the sets.
export function readMacroFactorRows(rows: Cell[][]): MacroFactorReadResult {
  if (rows.length === 0) throw new MacroFactorFormatError('Het bestand is leeg.');
  const [headerCells, ...body] = rows;
  const header = headerCells.map(cellText);
  const { index, headings } = mapColumns(header);
  const missing = REQUIRED.filter((id) => index[id] === undefined);
  if (missing.length > 0) {
    throw new MacroFactorFormatError(missingMessage(missing, headings, REQUIRED.length - missing.length), missing.map((m) => COLUMN_LABEL[m]));
  }
  const col = (id: ColumnId) => index[id]!;
  const weightHeading = headingUnit(header[col('weight')] ?? '');
  const weightFactor = /\b(lb|lbs|pound|pounds)\b/.test(weightHeading) ? LB_TO_KG : 1;
  const durationHeading = headingUnit(header[col('duration')] ?? '');
  const headingSaysMinutes = /\b(min|mins|minutes|minuten)\b/.test(durationHeading);
  const headingSaysSeconds = /\b(sec|secs|seconds|seconden)\b/.test(durationHeading);

  interface RawSet { name: string; set: MacroFactorSet }
  interface Group {
    key: string;
    date: string;
    time?: string;
    name: string;
    // Time and name come from the first working set, not from a warm-up row.
    fromWorkSet: boolean;
    durations: { value: number; clock: boolean }[];
    sets: RawSet[];
    // Every kept row (work and warm-up) in file order.
    all: RawSet[];
  }
  const groups = new Map<string, Group>();
  let skippedRows = 0;

  for (const cells of body) {
    const cell = (id: ColumnId) => (index[id] === undefined ? undefined : cells[index[id]!]);
    const when = parseDateCell(cell('date'));
    const name = cellText(cell('workout')).trim();
    const exercise = cleanExerciseName(cellText(cell('exercise')).trim());
    if (!when || !name || !exercise) {
      skippedRows++;
      continue;
    }
    const reps = parseNumber(cell('reps'));
    const warmup = isWarmup(cellText(cell('setType')));
    // A warm-up row still counts as skipped (it is not a working set); it is
    // kept below as a warm-up set when it has reps.
    if (warmup) skippedRows++;
    if (reps === undefined || reps <= 0) {
      if (!warmup) skippedRows++;
      continue;
    }
    const weight = parseNumber(cell('weight'));
    const rirRaw = parseNumber(cell('rir'));
    const set: MacroFactorSet = { reps: Math.round(reps) };
    // Any weight but 0 is kept, also a negative one: on an assisted machine MacroFactor
    // writes the help as a negative weight. Dropping it would read as "no help".
    if (weight !== undefined && weight !== 0) set.weightKg = Math.round(weight * weightFactor * 100) / 100;
    if (rirRaw !== undefined && rirRaw >= 0) set.rir = Math.min(10, rirRaw);

    const key = `${when.date}|${nameKey(name)}`;
    let group = groups.get(key);
    if (!group) {
      group = { key, date: when.date, time: when.time, name, fromWorkSet: false, durations: [], sets: [], all: [] };
      groups.set(key, group);
    }
    if (warmup) {
      // Kept as a warm-up set; it never counts as a working set, never gives
      // the workout its duration, and a workout with only warm-ups is no workout.
      set.kind = 'warmup';
      group.all.push({ name: exercise, set });
      continue;
    }
    if (!group.fromWorkSet) {
      group.fromWorkSet = true;
      group.time = when.time;
      group.name = name;
    }
    const duration = parseDurationCell(cell('duration'));
    if (duration) group.durations.push(duration);
    group.sets.push({ name: exercise, set });
    group.all.push({ name: exercise, set });
  }
  for (const [key, g] of groups) if (g.sets.length === 0) groups.delete(key);

  if (groups.size === 0) {
    throw new MacroFactorFormatError('In dit bestand staan geen krachttrainingen met herhalingen. Kies in MacroFactor een periode waarin je hebt getraind.');
  }

  // Without a unit in the heading, one reading for the whole file.
  const allPlain = [...groups.values()].flatMap((g) => g.durations.filter((d) => !d.clock).map((d) => d.value));
  const plainAreMinutes = headingSaysMinutes || (!headingSaysSeconds && allPlain.length > 0 && Math.max(...allPlain) < SECONDS_NOT_BELOW);

  const workouts: MacroFactorWorkout[] = [...groups.values()].map((g) => {
    const first = g.durations[0];
    const durationSec = first ? Math.round(first.clock ? first.value : plainAreMinutes ? first.value * 60 : first.value) : undefined;
    const byExercise = new Map<string, MacroFactorSet[]>();
    for (const { name, set } of g.sets) {
      const list = byExercise.get(name);
      if (list) list.push(set);
      else byExercise.set(name, [set]);
    }
    const everySet = new Map<string, MacroFactorSet[]>();
    for (const { name, set } of g.all) {
      const list = everySet.get(name);
      if (list) list.push(set);
      else everySet.set(name, [set]);
    }
    const exercises: MacroFactorExercise[] = [...byExercise].map(([name, sets]) => ({ name, sets, loggedSets: everySet.get(name) ?? sets, top: heaviestSet(sets) }));
    return {
      externalId: `macrofactor:${g.date}:${nameKey(g.name)}`,
      date: g.date,
      start: `${g.date}T${g.time ?? '12:00:00'}`,
      name: g.name,
      durationSec: durationSec && durationSec > 0 ? durationSec : undefined,
      exercises,
      setCount: g.sets.length,
    };
  });
  workouts.sort((a, b) => a.start.localeCompare(b.start) || a.name.localeCompare(b.name));
  return { workouts, skippedRows };
}

// Most weight, then most reps, then the fewest reps left (the hardest one).
export function heaviestSet(sets: MacroFactorSet[]): MacroFactorSet {
  return sets.reduce((best, s) => {
    const w = s.weightKg ?? 0;
    const bw = best.weightKg ?? 0;
    if (w !== bw) return w > bw ? s : best;
    if (s.reps !== best.reps) return s.reps > best.reps ? s : best;
    return (s.rir ?? Infinity) < (best.rir ?? Infinity) ? s : best;
  });
}

// "Benen  A " and "benen a" are the same workout name.
export function nameKey(name: string): string {
  return stripDiacritics(name).toLowerCase().replace(/\s+/g, ' ').trim();
}

// The fewest reps left in the hardest set of any exercise: how close to
// failure the workout went. Absent when no set carries an RIR.
export function lowestTopRir(workout: MacroFactorWorkout): number | undefined {
  const rirs = workout.exercises.map((e) => e.top.rir).filter((r): r is number => r !== undefined);
  return rirs.length > 0 ? Math.min(...rirs) : undefined;
}

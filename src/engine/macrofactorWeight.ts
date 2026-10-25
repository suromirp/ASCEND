// ASCEND: body weight from a MacroFactor export (Granular Export with weight,
// a CSV or a worksheet of an xlsx, as rows: engine/sheetTable.ts).
//
// What is known and what is not (docs/beslissingen/2026-10-22-gewicht-uit-
// macrofactor.md): MacroFactor's help center says the Quick Export has the
// scale weight and the weight trend and the Granular Export can include
// weight, but it does not publish the column headings. So, as with the
// Workout Log (engine/macrofactorImport.ts), the columns are found by NAME,
// case-insensitive, English or Dutch, a unit in the heading ("(kg)", "(lbs)")
// is read as the unit, and a file that lacks a column ASCEND needs is refused
// with a Dutch message that says which one. One row per day; the scale weight
// and the trend weight may each be missing on a day.
//
// Which number ASCEND uses: the trend weight when the file has one, else the
// scale weight. The trend smooths out water, salt and the time of day (it is
// MacroFactor's own smoothing and the number its user looks at), and ASCEND
// only needs it to put a pack in proportion to a body (rucksack share, leg
// index), where one heavy morning would be noise.
//
// Pure: no React, no IndexedDB. Nothing here knows about the user's settings;
// planWeightImport gets the stored entries handed in.

import type { WeightEntry } from '../models/metrics';
import { addDays } from '../utils/dates';
import { isPlausibleFatPct } from './bodyFat';
import { headingKey, headingUnit, LB_TO_KG, MacroFactorFormatError, parseCsv, parseDateCell, parseNumber } from './macrofactorImport';
import { cellText, type Cell } from './sheetTable';

export interface MacroFactorWeightDay {
  date: string;
  scaleKg?: number;
  trendKg?: number;
  // Het vetpercentage van die dag, alleen als het tussen 3 en 60 ligt.
  fatPct?: number;
}

export interface MacroFactorWeightResult {
  // One per day, oldest first.
  days: MacroFactorWeightDay[];
  // Rows without a usable date or without a plausible weight.
  skippedRows: number;
  // Does the file carry a trend weight at all?
  hasTrend: boolean;
  // Staat er een kolom met vetpercentage met minstens één geldige waarde?
  hasFat: boolean;
}

// --- columns ----------------------------------------------------------------

export type WeightColumn = 'date' | 'trend' | 'scale' | 'fat';

// A sheet that holds just one kind of weight may call its column plain
// "Weight": which kind it is then comes from the sheet name ("Weight Trend").
export type WeightHint = 'trend' | 'scale';

const GENERIC_WEIGHT = ['weight', 'gewicht', 'bodyweight', 'lichaamsgewicht'];

export function weightHintFromName(name: string | undefined): WeightHint | undefined {
  const key = headingKey(name ?? '');
  if (key.includes('trend')) return 'trend';
  if (key.includes('scale') || key.includes('weegschaal')) return 'scale';
  return undefined;
}

const ALIASES: Record<WeightColumn, string[]> = {
  date: ['date', 'datum', 'day', 'dag', 'datetime', 'datumtijd', 'weighdate', 'weighindate', 'measurementdate'],
  // The trend first: "Weight Trend" must not be read as the scale weight.
  trend: ['trendweight', 'weighttrend', 'trendgewicht', 'gewichtstrend', 'trend', 'smoothedweight'],
  scale: ['scaleweight', 'weightscale', 'scalewt', 'scale', 'weegschaalgewicht', 'gewichtweegschaal', 'weegschaal', 'weight', 'gewicht', 'bodyweight', 'lichaamsgewicht'],
  // "Fat Percent" in de export van MacroFactor, de rest zijn varianten.
  fat: ['fatpercent', 'fatpercentage', 'fatpct', 'bodyfat', 'bodyfatpercent', 'bodyfatpercentage', 'bodyfatpct', 'vetpercentage'],
};

const COLUMN_LABEL: Record<WeightColumn, string> = {
  date: 'datum (Date)',
  trend: 'trendgewicht (Trend Weight)',
  scale: 'weegschaalgewicht (Scale Weight)',
  fat: 'vetpercentage (Fat Percent)',
};

// Any of these means the file is a workout log (or meant to be one), even if a
// column of it is missing: then the Workout Log reader gives the message, not
// this one, and its "Weight (kg)" column is never taken for body weight.
const WORKOUT_KEYS = [
  'exercise', 'exercisename', 'oefening', 'oefeningnaam',
  'reps', 'rep', 'repetitions', 'herhalingen', 'herhaling',
  'settype', 'rir', 'workout', 'workoutname', 'workoutduration', 'workoutnaam', 'sets', 'set',
];

export function mapWeightColumns(header: string[], hint?: WeightHint): Partial<Record<WeightColumn, number>> {
  const keys = header.map(headingKey);
  const index: Partial<Record<WeightColumn, number>> = {};
  for (const id of ['date', 'trend', 'scale', 'fat'] as WeightColumn[]) {
    const aliases = id === 'trend' && hint === 'trend' ? [...ALIASES.trend, ...GENERIC_WEIGHT] : ALIASES[id];
    for (const alias of aliases) {
      const at = keys.findIndex((k, i) => k === alias && !Object.values(index).includes(i));
      if (at >= 0) {
        index[id] = at;
        break;
      }
    }
  }
  return index;
}

export function isWorkoutLog(header: string[]): boolean {
  return header.map(headingKey).some((k) => WORKOUT_KEYS.includes(k));
}

// Below and above this a number is not a body weight in kilograms (a column
// of something else, or pounds the heading did not mention).
const MIN_KG = 25;
const MAX_KG = 400;

function plausibleKg(value: number | undefined, factor: number): number | undefined {
  if (value === undefined) return undefined;
  const kg = Math.round(value * factor * 100) / 100;
  return kg >= MIN_KG && kg <= MAX_KG ? kg : undefined;
}

// --- the reader --------------------------------------------------------------

export function readMacroFactorWeightCsv(text: string): MacroFactorWeightResult {
  return readMacroFactorWeightRows(parseCsv(text));
}

// The first row is the heading. `sheetName` ("Weight Trend") settles which
// kind of weight a plain "Weight" column is.
export function readMacroFactorWeightRows(rows: Cell[][], sheetName?: string): MacroFactorWeightResult {
  if (rows.length === 0) throw new MacroFactorFormatError('Het bestand is leeg.');
  const [headerCells, ...body] = rows;
  const header = headerCells.map(cellText);
  const index = mapWeightColumns(header, weightHintFromName(sheetName));
  if (index.trend === undefined && index.scale === undefined) {
    throw new MacroFactorFormatError(
      `Dit bestand heeft geen kolom met gewicht. ASCEND zoekt ${COLUMN_LABEL.scale} of ${COLUMN_LABEL.trend}. Kies in MacroFactor bij Granular Export ook het gewicht.`,
      [COLUMN_LABEL.scale, COLUMN_LABEL.trend],
    );
  }
  if (index.date === undefined) {
    const found = header.map((h) => h.trim()).filter(Boolean);
    throw new MacroFactorFormatError(
      `Er ontbreekt een kolom in dit bestand: ${COLUMN_LABEL.date}. Gevonden kolommen: ${found.slice(0, 14).join(', ') || 'geen'}.`,
      [COLUMN_LABEL.date],
    );
  }
  const factorOf = (column: number | undefined) => (column !== undefined && /\b(lb|lbs|pound|pounds)\b/.test(headingUnit(header[column] ?? '')) ? LB_TO_KG : 1);
  const trendFactor = factorOf(index.trend);
  // Een ontbrekende kolom, een lege cel of een onzinnig getal geeft gewoon geen vetpercentage.
  const scaleFactor = factorOf(index.scale);

  const byDate = new Map<string, MacroFactorWeightDay>();
  let skippedRows = 0;
  for (const cells of body) {
    const when = parseDateCell(cells[index.date]);
    const trendKg = index.trend === undefined ? undefined : plausibleKg(parseNumber(cells[index.trend]), trendFactor);
    const scaleKg = index.scale === undefined ? undefined : plausibleKg(parseNumber(cells[index.scale]), scaleFactor);
    const fatRaw = index.fat === undefined ? undefined : parseNumber(cells[index.fat]);
    const fatPct = isPlausibleFatPct(fatRaw) ? Math.round(fatRaw * 100) / 100 : undefined;
    if (!when || (trendKg === undefined && scaleKg === undefined)) {
      skippedRows++;
      continue;
    }
    // A second row for the same day completes the first, the later value wins.
    const day: MacroFactorWeightDay = { ...(byDate.get(when.date) ?? { date: when.date }) };
    if (trendKg !== undefined) day.trendKg = trendKg;
    if (scaleKg !== undefined) day.scaleKg = scaleKg;
    if (fatPct !== undefined) day.fatPct = fatPct;
    byDate.set(when.date, day);
  }
  if (byDate.size === 0) {
    throw new MacroFactorFormatError('In dit bestand staat geen gewicht met een datum. Kies in MacroFactor een periode waarin je je hebt gewogen.');
  }
  const days = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  return { days, skippedRows, hasTrend: days.some((d) => d.trendKg !== undefined), hasFat: days.some((d) => d.fatPct !== undefined) };
}

// --- from file to entries ---------------------------------------------------------

// How far back one import keeps days: a file of years does not fill the
// settings with a weight per day. Older MacroFactor entries are dropped on
// the next import, in the same way.
const KEEP_DAYS = 120;
const KEEP_OLD_DAYS = 365;

// What ASCEND stores for a day: the trend when there is one, else the scale
// weight. With a trend, the weighing of that day is kept next to it.
export function weightEntryFromDay(day: MacroFactorWeightDay): WeightEntry | undefined {
  if (day.trendKg !== undefined) {
    const entry: WeightEntry = { date: day.date, kg: day.trendKg, source: 'macrofactor', basis: 'trend' };
    if (day.scaleKg !== undefined) entry.scaleKg = day.scaleKg;
    if (day.fatPct !== undefined) entry.fatPct = day.fatPct;
    return entry;
  }
  if (day.scaleKg !== undefined) {
    const entry: WeightEntry = { date: day.date, kg: day.scaleKg, source: 'macrofactor', basis: 'scale' };
    if (day.fatPct !== undefined) entry.fatPct = day.fatPct;
    return entry;
  }
  return undefined;
}

export interface WeightConflict {
  // What the user filled in himself on that day, and what the file says.
  own: WeightEntry;
  incoming: WeightEntry;
}

export interface WeightImportPlan {
  // New days, and days that were already from MacroFactor (refreshed).
  add: WeightEntry[];
  // Days where the user filled in a weight himself that differs from the file.
  conflicts: WeightConflict[];
  // Days that need nothing (the same value was already there).
  same: number;
}

const SAME_KG = 0.05;

// Nothing is overwritten that the user filled in himself: such a day becomes
// a conflict and the choice is his (applyWeightImport).
export function planWeightImport(existing: WeightEntry[] | undefined, days: MacroFactorWeightDay[]): WeightImportPlan {
  const newest = days.reduce((max, d) => (d.date > max ? d.date : max), '');
  const from = newest ? addDays(newest, -KEEP_DAYS) : '';
  const byDate = new Map((existing ?? []).map((e) => [e.date, e]));
  const plan: WeightImportPlan = { add: [], conflicts: [], same: 0 };
  for (const day of days) {
    if (day.date < from) continue;
    const incoming = weightEntryFromDay(day);
    if (!incoming) continue;
    const current = byDate.get(day.date);
    // Een bestand zonder vetpercentage laat een bewaard vetpercentage van die dag staan.
    if (incoming.fatPct === undefined && current?.fatPct !== undefined) incoming.fatPct = current.fatPct;
    // Een meting van jezelf zonder vetpercentage krijgt het van het bestand, en verder niets.
    const withFat = current && current.fatPct === undefined && incoming.fatPct !== undefined ? { ...current, fatPct: incoming.fatPct } : undefined;
    if (!current) {
      plan.add.push(incoming);
    } else if (current.source === 'macrofactor') {
      if (Math.abs(current.kg - incoming.kg) < 0.005 && current.basis === incoming.basis && current.scaleKg === incoming.scaleKg && current.fatPct === incoming.fatPct) plan.same++;
      else plan.add.push(incoming);
    } else if (Math.abs(current.kg - incoming.kg) < SAME_KG) {
      if (withFat) plan.add.push(withFat);
      else plan.same++;
    } else {
      if (withFat) plan.add.push(withFat);
      plan.conflicts.push({ own: current, incoming });
    }
  }
  return plan;
}

// The new list. Conflicts stay as the user filled them in, unless he chose
// "MacroFactor gebruiken" (overwriteOwn). MacroFactor entries older than a
// year before the newest day of the file are dropped.
export function applyWeightImport(existing: WeightEntry[] | undefined, plan: WeightImportPlan, overwriteOwn = false): WeightEntry[] {
  const incoming = [...plan.add, ...(overwriteOwn ? plan.conflicts.map((c) => c.incoming) : [])];
  const dates = new Set(incoming.map((e) => e.date));
  const newest = incoming.reduce((max, e) => (e.date > max ? e.date : max), '');
  const cutoff = newest ? addDays(newest, -KEEP_OLD_DAYS) : '';
  const kept = (existing ?? []).filter((e) => !dates.has(e.date) && !(e.source === 'macrofactor' && e.date < cutoff));
  return [...kept, ...incoming].sort((a, b) => a.date.localeCompare(b.date));
}

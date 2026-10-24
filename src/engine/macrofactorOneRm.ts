// ASCEND: the 1RM per exercise from a MacroFactor export (Granular Export, the
// sheet "Exercises - 1-RM"). Decision: docs/beslissingen/2026-10-24-1rm-uit-macrofactor.md.
//
// The sheet is wide: the first column is the date, every other column is one
// exercise with the unit in its heading ("Bench Press (kg)"), one row per day,
// and a cell stays empty on a day the exercise was not trained. The sheets
// "Exercises - 3-RM" and "Exercises - 10-RM" have the same shape, so the sheet
// NAME is what tells them apart (as with "Weight Trend"): only the 1-RM sheet is
// read, the others are left alone. The columns themselves are found by heading,
// never by position, and a unit of pounds is turned into kilograms.
//
// Pure: no React, no IndexedDB. Which ASCEND exercise a column is, and what is
// stored, is engine/externalOneRm.ts.

import type { ExternalOneRm, OneRmReading } from '../models/metrics';
import { cleanExerciseName, normalizeExerciseName } from './exerciseMatch';
import { headingUnit, LB_TO_KG, parseDateCell, parseNumber } from './macrofactorImport';
import { mapWeightColumns } from './macrofactorWeight';
import { cellText, type Cell } from './sheetTable';

export interface MacroFactorOneRmExercise {
  // As MacroFactor writes it, without the unit.
  name: string;
  // Oldest first, one per day.
  points: OneRmReading[];
}

export interface MacroFactorOneRmResult {
  exercises: MacroFactorOneRmExercise[];
  // Cells that held something but not a usable date or 1RM.
  skippedCells: number;
}

// "Exercises - 1-RM", "1RM", "1 RM" or "One rep max", but not "10-RM" or "3-RM".
const ONE_RM_NAME = /(^|[^0-9])1[\s_-]*rm\b|one[\s_-]*rep[\s_-]*max/i;

export const isOneRmSheetName = (name: string | undefined): boolean => ONE_RM_NAME.test(name ?? '');

// A 1RM above this is not a weight on a bar (a column of something else).
const MAX_KG = 1000;
// How many rows from the top are searched for the heading.
const HEADER_SEARCH_ROWS = 5;

const UNIT_AT_END = /\s*\((?:kg|kgs|lb|lbs|pounds?)\)\s*$/i;

// The first row that has a date column and at least one more heading.
function findHeader(rows: Cell[][]): { at: number; dateAt: number } | undefined {
  for (let at = 0; at < Math.min(HEADER_SEARCH_ROWS, rows.length); at++) {
    const header = rows[at].map(cellText);
    const dateAt = mapWeightColumns(header).date;
    if (dateAt !== undefined && header.some((h, i) => i !== dateAt && h.trim() !== '')) return { at, dateAt };
  }
  return undefined;
}

// Undefined when the table is not of this shape (no date column).
export function readOneRmRows(rows: Cell[][]): MacroFactorOneRmResult | undefined {
  const found = findHeader(rows);
  if (!found) return undefined;
  const header = rows[found.at].map(cellText);
  const body = rows.slice(found.at + 1);
  let skippedCells = 0;

  // One entry per exercise; a heading that appears twice is one exercise.
  const byKey = new Map<string, { name: string; days: Map<string, number> }>();
  const columns: { at: number; key: string; factor: number }[] = [];
  header.forEach((heading, at) => {
    if (at === found.dateAt) return;
    const name = cleanExerciseName(heading.trim().replace(UNIT_AT_END, ''));
    const key = normalizeExerciseName(name);
    if (name === '' || key === '') return;
    if (!byKey.has(key)) byKey.set(key, { name, days: new Map() });
    columns.push({ at, key, factor: /\b(lb|lbs|pound|pounds)\b/.test(headingUnit(heading)) ? LB_TO_KG : 1 });
  });

  for (const row of body) {
    const date = parseDateCell(row[found.dateAt])?.date;
    for (const { at, key, factor } of columns) {
      const raw = row[at];
      if (raw === undefined || cellText(raw).trim() === '') continue;
      const value = parseNumber(raw);
      const kg = value === undefined ? undefined : Math.round(value * factor * 100) / 100;
      if (!date || kg === undefined || kg <= 0 || kg > MAX_KG) {
        skippedCells++;
        continue;
      }
      byKey.get(key)!.days.set(date, kg);
    }
  }

  const exercises: MacroFactorOneRmExercise[] = [];
  for (const { name, days } of byKey.values()) {
    if (days.size === 0) continue;
    const points = [...days].map(([date, kg]) => ({ date, kg })).sort((a, b) => a.date.localeCompare(b.date));
    exercises.push({ name, points });
  }
  return { exercises, skippedCells };
}

// Two sheets of the same kind in one file (a CSV per sheet): the days are merged.
export function mergeOneRmResults(a: MacroFactorOneRmResult | undefined, b: MacroFactorOneRmResult): MacroFactorOneRmResult {
  if (!a) return b;
  const byKey = new Map(a.exercises.map((e) => [normalizeExerciseName(e.name), { name: e.name, days: new Map(e.points.map((p) => [p.date, p.kg])) }]));
  for (const e of b.exercises) {
    const key = normalizeExerciseName(e.name);
    const into = byKey.get(key) ?? { name: e.name, days: new Map<string, number>() };
    for (const p of e.points) into.days.set(p.date, p.kg);
    byKey.set(key, into);
  }
  const exercises = [...byKey.values()].map(({ name, days }) => ({
    name,
    points: [...days].map(([date, kg]) => ({ date, kg })).sort((x, y) => x.date.localeCompare(y.date)),
  }));
  return { exercises, skippedCells: a.skippedCells + b.skippedCells };
}

// What is stored: one series per exercise, with the source named.
export function oneRmFromMacroFactor(result: MacroFactorOneRmResult): ExternalOneRm[] {
  return result.exercises.map((e) => ({ exerciseName: e.name, source: 'macrofactor', points: e.points }));
}

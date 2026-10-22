// ASCEND: the training program of a MacroFactor export (the sheet "Training
// Programs"), read and turned into a proposal for ASCEND's strength templates.
// Pure; no React, no storage. Decision:
// docs/beslissingen/2026-10-22-programma-uit-macrofactor.md.
//
// The sheet, as MacroFactor writes it:
//   Program: <name> | Cycles: 8 | Deload: Last Cycle | ...
//   Block 1
//   Cycle 1 | Exercise | Skipped | Notes | Set 1 Type | Set 1 Rep Range | Set 1 RIR | Set 1 Rest | Set 2 Type | ...
//   Rest
//   Workout A @ <gym> | Barbell Bench Press | No | | Standard Set | 4 - 6 | 1 | | Standard Set | 4 - 6 | 2 | ...
//              | Barbell Overhead Press | No | ...
//   Workout B @ <gym> | ...
//   Rest
//   Cycle 2 | Exercise | ...
// A cycle is a week. A row with a name in the first column starts a training
// day; a row without one adds an exercise to the day above it. "Failure Set"
// with "9+" is a set to failure from 9 reps. Columns are found by name, never
// by position. The gym after "@" is never kept: it can say where someone lives
// or works.
//
// Nothing here changes a log or the planning: the program fills which
// exercises a strength template shows, with sets, rep range and reps in
// reserve per set and per week. Applying it is a proposal with Akkoord.

import type { ExercisePrescription, SessionTemplate, SetTarget } from '../models/training';
import { addDays, daysBetween, mondayOfWeek } from '../utils/dates';
import { exerciseById } from '../data/exercises';
import { cleanExerciseName, matchExercise, normalizeExerciseName } from './exerciseMatch';
import { isLegHeavyTemplate } from './scheduler';
import { cellText, type Cell } from './sheetTable';
import type { ProgramDay, ProgramExercise, StoredStrengthProgram } from './strengthProgramStore';

export interface MacroFactorProgramDay {
  name: string;
  // Per cycle (week) the exercises; a cycle where the day is missing is empty.
  cycles: ProgramExercise[][];
}

export interface MacroFactorProgram {
  name: string;
  cycleCount: number;
  days: MacroFactorProgramDay[];
}

// --- reading ------------------------------------------------------------------------------

interface Header {
  exercise: number;
  skipped?: number;
  notes?: number;
  sets: { type?: number; range?: number; rir?: number; rest?: number }[];
}

const SET_COLUMN = /^set\s+(\d+)\s+(type|rep range|reps|rir|rest)$/i;

function readHeader(row: Cell[]): Header | undefined {
  const cells = row.map((c) => cellText(c).trim());
  const exercise = cells.findIndex((c) => /^exercise$/i.test(c));
  if (exercise < 0) return undefined;
  const sets: Header['sets'] = [];
  cells.forEach((c, i) => {
    const m = c.match(SET_COLUMN);
    if (!m) return;
    const n = Number(m[1]) - 1;
    if (n < 0 || n > 19) return;
    sets[n] ??= {};
    const kind = m[2].toLowerCase();
    if (kind === 'type') sets[n].type = i;
    else if (kind === 'rir') sets[n].rir = i;
    else if (kind === 'rest') sets[n].rest = i;
    else sets[n].range = i;
  });
  if (!sets.some((s) => s?.range !== undefined)) return undefined;
  const skipped = cells.findIndex((c) => /^skipped$/i.test(c));
  const notes = cells.findIndex((c) => /^notes?$/i.test(c));
  return { exercise, ...(skipped >= 0 ? { skipped } : {}), ...(notes >= 0 ? { notes } : {}), sets: [...sets].map((s) => s ?? {}) };
}

// A sheet is a program when one of its first rows is a heading with
// "Exercise" and "Set 1 Rep Range".
export function isProgramTable(rows: Cell[][]): boolean {
  return rows.slice(0, 12).some((r) => readHeader(r) !== undefined);
}

// "4 - 6" -> 4 to 6; "9+" -> 9, to failure; "10" -> 10.
export function parseRepRange(raw: string): { low: number; high: number; failure: boolean } | undefined {
  const t = raw.trim();
  const plus = t.match(/^(\d+)\s*\+$/);
  if (plus) return { low: Number(plus[1]), high: Number(plus[1]), failure: true };
  const range = t.match(/^(\d+)\s*(?:-|\u2013|to|tot)\s*(\d+)$/i);
  if (range) {
    const a = Number(range[1]);
    const b = Number(range[2]);
    return { low: Math.min(a, b), high: Math.max(a, b), failure: false };
  }
  const one = t.match(/^(\d+)$/);
  return one ? { low: Number(one[1]), high: Number(one[1]), failure: false } : undefined;
}

// "2:30", "150", "150s", "2 min" -> seconds.
export function parseRest(raw: string): number | undefined {
  const t = raw.trim().toLowerCase();
  if (t === '') return undefined;
  const clock = t.match(/^(\d+):(\d{2})$/);
  if (clock) return Number(clock[1]) * 60 + Number(clock[2]);
  const min = t.match(/^(\d+(?:[.,]\d+)?)\s*(m|min|minutes?)$/);
  if (min) return Math.round(Number(min[1].replace(',', '.')) * 60);
  const sec = t.match(/^(\d+)\s*(s|sec|seconds?)?$/);
  return sec ? Number(sec[1]) : undefined;
}

// "Workout A @ Some Gym" -> "Workout A". The gym never leaves this function.
export function dayName(raw: string): string {
  return raw.split('@')[0].trim();
}

const IGNORED_FIRST = /^(rest|rust|block\s*\d*|program\s*:|cycle\s*\d+|week\s*\d+)/i;

export function readProgramRows(rows: Cell[][]): MacroFactorProgram | undefined {
  let name = 'Programma uit MacroFactor';
  let declaredCycles: number | undefined;
  let header: Header | undefined;
  let cycle = -1;
  let day: MacroFactorProgramDay | undefined;
  const days: MacroFactorProgramDay[] = [];

  for (const row of rows) {
    const first = cellText(row[0]).trim();
    const programCell = row.map((c) => cellText(c).trim()).find((c) => /^program\s*:/i.test(c));
    if (programCell) {
      name = programCell.replace(/^program\s*:\s*/i, '').trim() || name;
      const cyclesCell = row.map((c) => cellText(c).trim()).find((c) => /^cycles\s*:/i.test(c));
      const n = cyclesCell ? Number(cyclesCell.replace(/^cycles\s*:\s*/i, '')) : NaN;
      if (Number.isFinite(n) && n > 0) declaredCycles = n;
      continue;
    }
    const nextHeader = readHeader(row);
    if (nextHeader) {
      header = nextHeader;
      cycle++;
      day = undefined;
      continue;
    }
    if (!header || cycle < 0) continue;
    if (first !== '' && IGNORED_FIRST.test(first)) {
      day = undefined;
      continue;
    }
    if (first !== '') {
      const dn = dayName(first);
      day = days.find((d) => d.name === dn);
      if (!day) {
        day = { name: dn, cycles: [] };
        days.push(day);
      }
    }
    if (!day) continue;
    const exerciseName = cleanExerciseName(cellText(row[header.exercise]).trim());
    if (exerciseName === '') continue;
    if (header.skipped !== undefined && /^(yes|ja|true)$/i.test(cellText(row[header.skipped]).trim())) continue;
    const sets: SetTarget[] = [];
    for (const col of header.sets) {
      if (col.range === undefined) continue;
      const type = col.type !== undefined ? cellText(row[col.type]).trim() : '';
      if (/warm/i.test(type)) continue;
      const range = parseRepRange(cellText(row[col.range]));
      if (!range) continue;
      const failure = range.failure || /failure/i.test(type);
      const rirRaw = col.rir !== undefined ? Number(cellText(row[col.rir]).trim().replace(',', '.')) : NaN;
      const rir = Number.isFinite(rirRaw) && cellText(row[col.rir!]).trim() !== '' ? Math.max(0, Math.min(10, Math.round(rirRaw))) : failure ? 0 : 2;
      const rest = col.rest !== undefined ? parseRest(cellText(row[col.rest])) : undefined;
      sets.push({ repsLow: range.low, repsHigh: range.high, rir, ...(failure ? { failure: true } : {}), ...(rest !== undefined && rest >= 15 && rest <= 600 ? { restSec: rest } : {}) });
    }
    if (sets.length === 0) continue;
    const note = header.notes !== undefined ? cellText(row[header.notes]).trim() : '';
    while (day.cycles.length <= cycle) day.cycles.push([]);
    day.cycles[cycle].push({ name: exerciseName, sets: sets.slice(0, 10), ...(note ? { note: note.slice(0, 200) } : {}) });
  }

  const usable = days.filter((d) => d.cycles.some((c) => c.length > 0));
  if (usable.length === 0) return undefined;
  const cycleCount = Math.max(1, cycle + 1);
  for (const d of usable) while (d.cycles.length < cycleCount) d.cycles.push([]);
  return { name: name.slice(0, 80), cycleCount: declaredCycles ? Math.min(declaredCycles, cycleCount) : cycleCount, days: usable.slice(0, 7) };
}

// --- the proposal --------------------------------------------------------------------------

// A day is a leg day when most exercises ASCEND knows load the legs.
export function isLegDay(day: MacroFactorProgramDay): boolean {
  const exercises = day.cycles.find((c) => c.length > 0) ?? [];
  let legs = 0;
  let known = 0;
  for (const e of exercises) {
    const id = matchExercise(e.name);
    const ex = id ? exerciseById(id) : undefined;
    if (ex) {
      known++;
      if (ex.loadsLegs) legs++;
    } else if (/squat|deadlift|leg press|lunge|calf|leg curl|leg extension/i.test(e.name)) {
      known++;
      legs++;
    }
  }
  return known > 0 && legs * 2 > known;
}

export type ProgramMapping = Record<string, string | null>;

// Which ASCEND strength template each day fills: in order, a leg day to a leg
// template and another day to an upper body template, the planned ones first.
// A day without a fitting template gets nothing (null).
export function proposeMapping(program: MacroFactorProgram, templates: SessionTemplate[], current?: StoredStrengthProgram): ProgramMapping {
  const strength = templates.filter((t) => t.type === 'strength').sort((a, b) => Number(!a.defaultDayOfWeek) - Number(!b.defaultDayOfWeek) || (a.defaultDayOfWeek ?? 9) - (b.defaultDayOfWeek ?? 9));
  const taken = new Set<string>();
  const mapping: ProgramMapping = {};
  // What you chose last time for a day with the same name comes first.
  for (const d of program.days) {
    const before = current?.days.find((x) => x.name === d.name)?.templateId;
    if (before && strength.some((t) => t.id === before) && !taken.has(before)) {
      mapping[d.name] = before;
      taken.add(before);
    }
  }
  for (const d of program.days) {
    if (mapping[d.name]) continue;
    const legs = isLegDay(d);
    const t = strength.find((x) => !taken.has(x.id) && isLegHeavyTemplate(x) === legs);
    mapping[d.name] = t?.id ?? null;
    if (t) taken.add(t.id);
  }
  return mapping;
}

// What is stored after Akkoord. `currentCycle` is the week of the program that
// this week is (1 is the first).
export function buildStoredProgram(program: MacroFactorProgram, mapping: ProgramMapping, today: string, currentCycle = 1): StoredStrengthProgram | undefined {
  const days: ProgramDay[] = [];
  const used = new Set<string>();
  for (const d of program.days) {
    const templateId = mapping[d.name];
    if (!templateId || used.has(templateId)) continue;
    used.add(templateId);
    days.push({ templateId, name: d.name, cycles: d.cycles });
  }
  if (days.length === 0) return undefined;
  const cycle = Math.max(1, Math.min(program.cycleCount, Math.round(currentCycle)));
  return { name: program.name, startMonday: addDays(mondayOfWeek(today), -7 * (cycle - 1)), cycleCount: program.cycleCount, days, importedOn: today };
}

// --- using it --------------------------------------------------------------------------------

// The week of the program (0-based) on a day. After the last week the program
// starts again at week 1; before the start it is week 1.
export function programCycle(program: StoredStrengthProgram, date: string): number {
  const weeks = Math.floor(daysBetween(program.startMonday, mondayOfWeek(date)) / 7);
  if (weeks < 0) return 0;
  return weeks % Math.max(1, program.cycleCount);
}

// A stable slot id per exercise of the program: the same exercise keeps its
// id from week to week, so a draft and the history line up.
export function programSlotId(name: string): string {
  return `mf-${normalizeExerciseName(name).replace(/\s+/g, '-').slice(0, 50)}`;
}

function rangeText(s: SetTarget): string {
  return s.failure ? `${s.repsLow}+` : s.repsLow === s.repsHigh ? `${s.repsLow}` : `${s.repsLow}-${s.repsHigh}`;
}

export function toPrescriptions(exercises: ProgramExercise[]): ExercisePrescription[] {
  const seen = new Map<string, number>();
  // The short version leaves out the last quarter (from four exercises on); the
  // first two are the core of the day.
  const optionalFrom = exercises.length >= 4 ? exercises.length - Math.ceil(exercises.length / 4) : exercises.length;
  return exercises.map((e, i) => {
    const base = programSlotId(e.name);
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return {
      id: n === 0 ? base : `${base}-${n + 1}`,
      exerciseName: e.name,
      sets: e.sets.length,
      reps: rangeText(e.sets.find((s) => !s.failure) ?? e.sets[0]),
      priority: i < 2 ? ('core' as const) : i >= optionalFrom ? ('optional' as const) : ('accessory' as const),
      setTargets: e.sets,
      ...(e.note ? { notes: e.note } : {}),
    };
  });
}

export function programExercisesFor(program: StoredStrengthProgram | undefined, templateId: string, date: string): ExercisePrescription[] | undefined {
  const day = program?.days.find((d) => d.templateId === templateId);
  if (!program || !day) return undefined;
  const cycle = programCycle(program, date);
  const exercises = day.cycles[cycle]?.length ? day.cycles[cycle] : day.cycles.find((c) => c.length > 0);
  return exercises ? toPrescriptions(exercises) : undefined;
}

// The templates as the app shows them: a template the program fills gets the
// exercises of this week of the program. The stored templates stay as they are.
export function withProgramExercises(templates: SessionTemplate[], program: StoredStrengthProgram | undefined, date: string): SessionTemplate[] {
  if (!program) return templates;
  return templates.map((t) => {
    const exercises = t.type === 'strength' ? programExercisesFor(program, t.id, date) : undefined;
    return exercises ? { ...t, exercises } : t;
  });
}

// --- words ---------------------------------------------------------------------------------

// "3 sets, 4-6, 1, 2 en 3 over" or with a set to failure "2 sets: 9+ tot falen, 9-11 met 1 over".
export function setsText(sets: SetTarget[]): string {
  const sameRange = sets.every((s) => rangeText(s) === rangeText(sets[0]) && !!s.failure === !!sets[0].failure);
  const count = sets.length === 1 ? '1 set' : `${sets.length} sets`;
  if (sameRange && !sets[0].failure) {
    const rirs = sets.map((s) => s.rir);
    const allSame = rirs.every((r) => r === rirs[0]);
    const rirText = allSame ? `${rirs[0]} over` : `${rirs.slice(0, -1).join(', ')} en ${rirs.at(-1)} over`;
    return `${count} van ${rangeText(sets[0])}, ${rirText}`;
  }
  return `${count}: ${sets.map((s) => (s.failure ? `${rangeText(s)} tot falen` : `${rangeText(s)} met ${s.rir} over`)).join(', ')}`;
}

export function restText(sets: SetTarget[]): string | undefined {
  const rest = sets.find((s) => s.restSec !== undefined)?.restSec;
  return rest !== undefined ? `rust ${Math.floor(rest / 60)}:${String(rest % 60).padStart(2, '0')}` : undefined;
}

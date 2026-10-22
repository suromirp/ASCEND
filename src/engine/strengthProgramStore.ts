// ASCEND: the strength program read in from MacroFactor, as it is stored in
// AppSettings.strengthModel.program. Pure; only the shape and the rules of
// what may be stored (a backup can be damaged). Reading the file is
// engine/macrofactorProgram.ts; using it for a training is the same file.
//
// Decision: docs/beslissingen/2026-10-22-programma-uit-macrofactor.md. The
// program changes which exercises a strength template shows, with sets, rep
// range and reps in reserve per set and per week of the program. It never
// changes a log or the planning, and the gym name of the file is never kept.

import type { SetTarget } from '../models/training';

export interface ProgramExercise {
  name: string;
  sets: SetTarget[];
  note?: string;
}

export interface ProgramDay {
  // The ASCEND strength template this day fills.
  templateId: string;
  // The name in MacroFactor, without the gym ("Workout A").
  name: string;
  // Per week of the program (MacroFactor calls it a cycle) the exercises.
  cycles: ProgramExercise[][];
}

export interface StoredStrengthProgram {
  name: string;
  // The Monday of the week that is week 1 of the program.
  startMonday: string;
  cycleCount: number;
  days: ProgramDay[];
  importedOn: string;
}

export const PROGRAM_LIMITS = { cycles: 26, days: 7, exercises: 15, sets: 10, name: 80, note: 200 };

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isIsoDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const text = (v: unknown, max: number): string | undefined => (typeof v === 'string' && v.trim() !== '' ? v.trim().slice(0, max) : undefined);

function normalizeSet(raw: unknown): SetTarget | undefined {
  if (!isRecord(raw)) return undefined;
  const { repsLow, repsHigh, rir } = raw;
  if (!isNum(repsLow) || !isNum(repsHigh) || !isNum(rir)) return undefined;
  if (repsLow < 1 || repsLow > 100 || repsHigh < repsLow || repsHigh > 100 || rir < 0 || rir > 10) return undefined;
  return {
    repsLow: Math.round(repsLow),
    repsHigh: Math.round(repsHigh),
    rir: Math.round(rir),
    ...(raw.failure === true ? { failure: true } : {}),
    ...(isNum(raw.restSec) && raw.restSec >= 15 && raw.restSec <= 600 ? { restSec: Math.round(raw.restSec) } : {}),
  };
}

function normalizeExercise(raw: unknown): ProgramExercise | undefined {
  if (!isRecord(raw)) return undefined;
  const name = text(raw.name, PROGRAM_LIMITS.name);
  if (!name || !Array.isArray(raw.sets)) return undefined;
  const sets = raw.sets.map(normalizeSet).filter((s): s is SetTarget => !!s).slice(0, PROGRAM_LIMITS.sets);
  if (sets.length === 0) return undefined;
  const note = text(raw.note, PROGRAM_LIMITS.note);
  return { name, sets, ...(note ? { note } : {}) };
}

function normalizeDay(raw: unknown): ProgramDay | undefined {
  if (!isRecord(raw)) return undefined;
  const templateId = text(raw.templateId, 60);
  const name = text(raw.name, PROGRAM_LIMITS.name);
  if (!templateId || !name || !Array.isArray(raw.cycles)) return undefined;
  const cycles = raw.cycles
    .slice(0, PROGRAM_LIMITS.cycles)
    .map((c) => (Array.isArray(c) ? c.map(normalizeExercise).filter((e): e is ProgramExercise => !!e).slice(0, PROGRAM_LIMITS.exercises) : []));
  if (!cycles.some((c) => c.length > 0)) return undefined;
  return { templateId, name, cycles };
}

// What may be stored, or nothing.
export function normalizeStrengthProgram(raw: unknown): StoredStrengthProgram | undefined {
  if (!isRecord(raw)) return undefined;
  const name = text(raw.name, PROGRAM_LIMITS.name);
  if (!name || !isIsoDate(raw.startMonday) || !Array.isArray(raw.days)) return undefined;
  const seen = new Set<string>();
  const days = raw.days
    .map(normalizeDay)
    .filter((d): d is ProgramDay => !!d && !seen.has(d.templateId) && !!seen.add(d.templateId))
    .slice(0, PROGRAM_LIMITS.days);
  if (days.length === 0) return undefined;
  const longest = Math.max(...days.map((d) => d.cycles.length));
  const cycleCount = isNum(raw.cycleCount) && raw.cycleCount >= 1 && raw.cycleCount <= PROGRAM_LIMITS.cycles ? Math.min(Math.round(raw.cycleCount), longest) : longest;
  return { name, startMonday: raw.startMonday, cycleCount, days, importedOn: isIsoDate(raw.importedOn) ? raw.importedOn : raw.startMonday };
}

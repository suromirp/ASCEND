// ASCEND: what the sheet of a planned training offers, and in which order
// (SessionActionSheet). Pure: no React, no IndexedDB.
//
// Production feedback on the old sheet ("dit is niet top"): ticking off and
// moving stood through each other, everything was open at once, and a
// training for tomorrow opened with a form that said "uit MacroFactor" for a
// training that had not happened yet. Now the sheet starts with one main
// choice and a short list of the others, and each choice opens its own step.
//
// - The main choice is the one that fits the day: for today or a day that is
//   over, ticking it off (or starting it, for strength logged in ASCEND); for
//   a day still to come, moving it; for a skipped training, doing it after all.
// - Ticking off is never the main choice for a day still to come. It stays
//   possible as "Vandaag al doen", as before.

import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import { nameKey, type MacroFactorWorkout } from './macrofactorImport';
import { isWorkSet } from './workSets';

// - done: tick it off (strength in MacroFactor: the short step; else the form)
// - start: open the training screen (strength logged in ASCEND, or a run you
//   are about to do)
// - move, skip: the move step, and skipping
// - backOnPlan: "Toch doen", a skipped training back on its own day
// - doToday: a training of a later day, done today
// - saveWorkout: the MacroFactor workout of that day is in the last file read
//   but not saved yet; one tap saves it, ticking off is not needed
export type SheetAction = 'done' | 'start' | 'move' | 'skip' | 'backOnPlan' | 'doToday' | 'saveWorkout';

// How a training is ticked off: strength kept in MacroFactor (one short step
// in the sheet), strength kept in ASCEND (the training screen), or anything
// else (the form of the training screen).
export type DoneKind = 'quick' | 'inApp' | 'log';

export interface SheetActions {
  main: SheetAction;
  rows: SheetAction[];
}

export function sessionSheetActions({ date, today, skipped, canComeBack, kind, workoutWaiting = false }: {
  date: string;
  today: string;
  skipped: boolean;
  // Skipped, on a day that has not passed, and the page can put it back.
  canComeBack: boolean;
  kind: DoneKind;
  // pendingMacroFactorWorkout found one for this training.
  workoutWaiting?: boolean;
}): SheetActions {
  const due = date <= today;
  if (workoutWaiting && due && kind === 'quick') return { main: 'saveWorkout', rows: [] };
  const tick: SheetAction = kind === 'inApp' ? 'start' : 'done';
  if (skipped) {
    if (canComeBack) return { main: 'backOnPlan', rows: ['move'] };
    // Its day is over: move it to a day that comes, or say it happened after all.
    return { main: 'move', rows: due ? [tick] : [] };
  }
  if (due) return { main: tick, rows: kind === 'log' ? ['start', 'move', 'skip'] : ['move', 'skip'] };
  return { main: 'move', rows: ['doToday', 'skip'] };
}

// The duration the short "Gedaan" step proposes for strength kept in
// MacroFactor, with an honest source: the minutes of the MacroFactor workout
// when the last file read holds one for this training on its day (mapped to
// this template, not yet saved, not turned down), otherwise the planned
// minutes as a proposal.
export interface DoneDuration {
  minutes: number;
  source: 'macrofactor' | 'plan';
}

export interface MacroFactorSource {
  workouts: MacroFactorWorkout[];
  mapping: Record<string, string | null>;
  dismissed: string[];
}

// The MacroFactor workout of this training on this day in the last file read:
// mapped to this template, not saved yet and not turned down.
export function pendingMacroFactorWorkout(
  date: string,
  templateId: string,
  macroFactor: MacroFactorSource | undefined,
  logs: Pick<SessionLog, 'externalId'>[] = [],
): MacroFactorWorkout | undefined {
  if (!macroFactor) return undefined;
  const saved = new Set([...macroFactor.dismissed, ...logs.map((l) => l.externalId).filter((id): id is string => !!id)]);
  return macroFactor.workouts.find((w) => w.date === date && macroFactor.mapping[nameKey(w.name)] === templateId && !saved.has(w.externalId));
}

const minutesAndSets = (minutes: number | undefined, sets: number) =>
  [minutes ? `${minutes} min` : null, sets > 0 ? `${sets} ${sets === 1 ? 'set' : 'sets'}` : null].filter(Boolean).join(', ');

// "Uit MacroFactor: 50 min, 18 sets", for a workout in the file or a log that
// came from it (or took over its numbers). Undefined for any other log.
export function macroFactorLine(item: MacroFactorWorkout | SessionLog): string | undefined {
  let text: string;
  if ('setCount' in item) {
    text = minutesAndSets(item.durationSec ? Math.max(1, Math.round(item.durationSec / 60)) : undefined, item.setCount);
  } else {
    const fromMacroFactor = item.source === 'macrofactor' || !!item.externalId?.startsWith('macrofactor:') || !!item.manualMeasured?.strength;
    if (!fromMacroFactor) return undefined;
    text = minutesAndSets(item.durationMinutes, (item.strengthData ?? []).reduce((n, e) => n + e.sets.filter(isWorkSet).length, 0));
  }
  return text ? `Uit MacroFactor: ${text}` : 'Uit MacroFactor';
}

export function strengthDoneDuration(
  session: Pick<PlannedSession, 'scheduledDate'>,
  template: Pick<SessionTemplate, 'id'>,
  plannedMinutes: number,
  macroFactor?: MacroFactorSource,
  logs: Pick<SessionLog, 'externalId'>[] = [],
): DoneDuration {
  const workout = pendingMacroFactorWorkout(session.scheduledDate, template.id, macroFactor, logs);
  if (workout?.durationSec) return { minutes: Math.max(1, Math.round(workout.durationSec / 60)), source: 'macrofactor' };
  return { minutes: plannedMinutes, source: 'plan' };
}

// The effort scale of that step: one row of cells, each at least 44 px wide on
// a 360 px screen. ASCEND_HEURISTIC(SESSION-RPE-FROM-4): ten cells do not fit
// one row at that width, and a whole strength training below RPE 4 ("licht")
// is not a training the plan asks for, so the row runs from 4 to 10. The form
// of the training screen keeps the full scale from 1.
export const QUICK_RPE_SCALE = [4, 5, 6, 7, 8, 9, 10] as const;

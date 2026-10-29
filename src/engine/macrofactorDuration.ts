// ASCEND: a MacroFactor workout whose duration in the file is too long (a clock
// left running) can be given a duration by hand before it becomes a log
// (docs/beslissingen/2026-10-29-mf-training-te-lang.md). Pure; nothing is stored
// here. The card keeps the choice per workout until "Alles verwerken".
//
// The file has no time per set (engine/macrofactorImport.ts reads one duration
// and one start per workout), so the suggestion is ASCEND's own estimate for
// the training, not a sum of the sets.

import type { SessionLog, SessionTemplate } from '../models/training';
import { predictDuration } from './durationLearning';
import { MAX_STRENGTH_MINUTES } from './logDuration';
import { doubtAbout, LONGEST_PLAUSIBLE_WORKOUT_MIN, type MacroFactorProposal } from './macrofactorLink';
import { minutesLabel } from './macrofactorSets';
import type { MacroFactorWorkout } from './macrofactorImport';
import { formatDateNL, todayISO, weekdayLongNL } from '../utils/dates';
import { isNextDay } from './logDay';

export type NewProposal = Extract<MacroFactorProposal, { kind: 'new' }>;

// The chosen duration in minutes. Never empty: a log without minutes would drop out of
// the load and the leg index, so there is no "Zonder duur". `date` is the day the new log
// gets ("Welke dag?"); without it the day of the file.
export interface DurationChoice {
  minutes: number;
  date?: string;
}

// The days "Welke dag?" offers: the day of the file and, when the row belongs to a planned
// training on another day, that day. The planned day is the default
// (docs/beslissingen/2026-10-29-dag-van-een-training.md). Only a new log gets a day here.
export function dayOptions(p: NewProposal, today: string = todayISO()): { fileDay: string; plannedDay?: string; defaultDay: string } {
  const fileDay = p.workout.date;
  // The same limit as logDay: the planned day is the day after the file, and not in the future.
  const plannedDay = p.planned && isNextDay(fileDay, p.planned.scheduledDate) && p.planned.scheduledDate <= today ? p.planned.scheduledDate : undefined;
  return { fileDay, plannedDay, defaultDay: plannedDay ?? fileDay };
}

// The moment the log ends on the chosen day: the real end (start plus duration) when that falls
// on the chosen day, else early on that day (00:15), since the work was done before midnight.
function completedAtOn(date: string, start: string, minutes: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const end = new Date(new Date(start).getTime() + minutes * 60_000);
  const sameDay = end.getFullYear() === y && end.getMonth() === m - 1 && end.getDate() === d;
  return (sameDay ? end : new Date(y, m - 1, d, 0, 15)).toISOString();
}

export const tooLong = (workout: MacroFactorWorkout): boolean => !!workout.durationSec && workout.durationSec / 60 > LONGEST_PLAUSIBLE_WORKOUT_MIN;

// Only a new log can get its duration set here; a row that takes over or fills
// in an existing log already ignores an impossible duration. Only a row whose
// one doubt is the duration.
export function canAdjustDuration(p: MacroFactorProposal, today: string = todayISO()): p is NewProposal {
  if (p.kind !== 'new') return false;
  return tooLong(p.workout) && doubtAbout(p.workout, today, true) === undefined;
}

// What the sheet starts with: the duration ASCEND already expects for this
// training (own median once there are enough logs, else the estimate, else the
// template's), kept inside what a strength training can last.
export function suggestedDuration(template: SessionTemplate, logs: SessionLog[], estimate: number | undefined): number {
  const minutes = predictDuration(template, logs, estimate).minutes;
  return Math.min(MAX_STRENGTH_MINUTES, Math.max(1, Math.round(minutes)));
}

export function isValidMinutes(minutes: number | undefined): minutes is number {
  return minutes !== undefined && Number.isFinite(minutes) && minutes >= 1 && minutes <= MAX_STRENGTH_MINUTES;
}

// "Het bestand zegt 6 uur 16 min. Je klok liep waarschijnlijk door."
export function fileDurationSentence(workout: MacroFactorWorkout): string {
  const minutes = Math.round((workout.durationSec ?? 0) / 60);
  return `Het bestand zegt ${minutesLabel(minutes)}. Je klok liep waarschijnlijk door.`;
}

// The row after the choice: the draft carries the chosen duration, the doubt is
// gone, and the duration of the file is kept on the log.
export function withChosenDuration(p: NewProposal, choice: DurationChoice): NewProposal {
  const { minutes } = choice;
  const otherDay = choice.date !== undefined && choice.date !== p.workout.date;
  const startMs = new Date(p.workout.start).getTime();
  const { doubt: _doubt, ...rest } = p;
  return {
    ...rest,
    durationChosen: true,
    draft: {
      ...p.draft,
      durationMinutes: minutes,
      ...(otherDay
        ? { completedDate: choice.date!, completedAt: completedAtOn(choice.date!, p.workout.start, minutes) }
        : { completedAt: new Date(startMs + minutes * 60_000).toISOString() }),
      fileDurationMinutes: Math.round((p.workout.durationSec ?? 0) / 60),
    },
  };
}

// The line under the row after the choice.
export function chosenDurationLine(p: NewProposal): string {
  const file = minutesLabel(p.draft.fileDurationMinutes ?? 0);
  const day = p.draft.completedDate !== p.workout.date ? ` Telt op ${weekdayLongNL(p.draft.completedDate)} ${formatDateNL(p.draft.completedDate)}.` : '';
  return `Duur ${minutesLabel(p.draft.durationMinutes)} (het bestand zegt ${file}).${day}`;
}

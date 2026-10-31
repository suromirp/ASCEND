// ASCEND — Reisplanner: which task of the journey is up this week, and what
// is ticked off (data/journeyTasks.ts). Fixed rules, no AI, like
// engine/weeklyLesson.ts, which this follows.
//
// A task is up from the week it opens (weeks before the main goal) and fits
// until the week it closes. Of the tasks that fit this week the one that
// closes first comes first. What is not done by then stays open and comes
// after the tasks that still fit: nothing here is ever "overdue".
//
// The pick is kept for the week once you act on it (state.week), so ticking
// it off does not make the card jump to the next task the same minute.
//
// Pure: no React, no IndexedDB.

import type { JourneyTask } from '../data/journeyTasks';
import type { SweatEntry } from '../models/sweat';
import { weighedCount, weighedDate } from './sweat';
import { addDays, daysBetween, mondayOfWeek } from '../utils/dates';
import { normalizeBoots, type BootBreakInStatus, type BootsState } from './bootBreakIn';
import { isRecord } from '../utils/guards';

// What is stored (AppSettings.journey). `v` is the shape's own version, so
// a later change can migrate it without touching the backup schema.
export interface JourneyState {
  v: 1;
  // Task id -> the date it was ticked off.
  done: Record<string, string>;
  // The task kept for one week, once you acted on it on Today.
  week?: { weekStart: string; taskId: string; postponed?: boolean };
  // Sinds wanneer je de nieuwe bergschoenen draagt (engine/bootBreakIn.ts).
  boots?: BootsState;
}

export const EMPTY_JOURNEY: JourneyState = { v: 1, done: {} };

export type JourneyTaskStatus = 'done' | 'open' | 'later' | 'lapsed';

// Whole weeks from this week's Monday to the goal date. Counted from the
// Monday so it stays the same all week.
export function journeyWeeksLeft(today: string, goalDate: string): number {
  return Math.max(0, Math.ceil(daysBetween(mondayOfWeek(today), goalDate) / 7));
}

// The first Monday of the weeks that count `weeksLeft` before the goal.
export function weekStartForWeeksLeft(goalDate: string, weeksLeft: number): string {
  const d = addDays(goalDate, -7 * weeksLeft);
  const monday = mondayOfWeek(d);
  return monday === d ? d : addDays(monday, 7);
}

export function taskStatus(task: JourneyTask, state: JourneyState | undefined, weeksLeft: number): JourneyTaskStatus {
  if (state?.done[task.id]) return 'done';
  if (weeksLeft > task.window[0]) return 'later';
  if (weeksLeft < task.window[1]) return 'lapsed';
  return 'open';
}

export interface JourneyPick {
  task: JourneyTask;
  // 'todo': still to do. 'done': ticked off, kept for the rest of the week.
  // 'postponed': you pushed it to next week; Today stays quiet.
  state: 'todo' | 'done' | 'postponed';
}

// The task for this week, or undefined when there is no goal date ahead or
// nothing is left.
export function pickJourneyTask(tasks: JourneyTask[], state: JourneyState | undefined, today: string, goalDate: string | undefined): JourneyPick | undefined {
  if (!goalDate || goalDate <= today) return undefined;
  const weekStart = mondayOfWeek(today);
  const weeksLeft = journeyWeeksLeft(today, goalDate);
  const kept = state?.week;
  if (kept && kept.weekStart === weekStart) {
    const task = tasks.find((t) => t.id === kept.taskId);
    if (task) return { task, state: kept.postponed ? 'postponed' : state?.done[task.id] ? 'done' : 'todo' };
  }
  const open = tasks.filter((t) => taskStatus(t, state, weeksLeft) === 'open')
    // Closes first: the larger the closing number, the sooner it runs out.
    .sort((a, b) => b.window[1] - a.window[1] || b.window[0] - a.window[0] || a.id.localeCompare(b.id));
  const lapsed = tasks.filter((t) => taskStatus(t, state, weeksLeft) === 'lapsed')
    // The one that closed most recently first.
    .sort((a, b) => a.window[1] - b.window[1] || a.id.localeCompare(b.id));
  const task = open[0] ?? lapsed[0];
  return task ? { task, state: 'todo' } : undefined;
}

// --- changes (each returns a new state; nothing is mutated) --------------------

export function markDone(state: JourneyState | undefined, taskId: string, today: string, keepForWeek = false): JourneyState {
  const base = state ?? EMPTY_JOURNEY;
  return {
    ...base,
    done: { ...base.done, [taskId]: today },
    ...(keepForWeek ? { week: { weekStart: mondayOfWeek(today), taskId } } : {}),
  };
}

export function unmarkDone(state: JourneyState | undefined, taskId: string): JourneyState {
  const base = state ?? EMPTY_JOURNEY;
  const done = { ...base.done };
  delete done[taskId];
  return { ...base, done };
}

// "Volgende week": the task stays open and Today says nothing more about it
// this week.
export function postponeTask(state: JourneyState | undefined, taskId: string, today: string): JourneyState {
  const base = state ?? EMPTY_JOURNEY;
  return { ...base, week: { weekStart: mondayOfWeek(today), taskId, postponed: true } };
}

// --- tasks that are done by what you did ----------------------------------------------------
// "Meet je zweetverlies" is done once there are two weighings of your own. Never stored as a
// flag: derived from the list, so removing a weighing opens the task again.
export const SWEAT_TASK_ID = 'meet-zweetverlies';
export const SWEAT_TASK_MEASUREMENTS = 2;

// Which tasks the data says are done, with the line that tells why. Such a task has no
// "Haal vinkje weg": the data would only tick it again. `sweat` is the list as
// engine/sweat.ts#usableSweatEntries gives it (logs that still exist).
export const BOOTS_TASK_ID = 'schoenen';

export function derivedDoneLines(sweat: SweatEntry[] | undefined, boots: Pick<BootBreakInStatus, 'kind' | 'km' | 'goalKm'>): Record<string, string> {
  const lines: Record<string, string> = {};
  if (weighedCount(sweat) >= SWEAT_TASK_MEASUREMENTS) lines[SWEAT_TASK_ID] = 'Af door je metingen';
  if (boots.kind === 'done') lines[BOOTS_TASK_ID] = `Af: ${Math.round(boots.km)} van ${Math.round(boots.goalKm)} km ingelopen`;
  return lines;
}

// The state as the screens show it: what you ticked, plus what the data says is done.
export function withDerivedDone(state: JourneyState | undefined, sweat: SweatEntry[] | undefined): JourneyState | undefined {
  if (weighedCount(sweat) < SWEAT_TASK_MEASUREMENTS) return state;
  const date = weighedDate(sweat, SWEAT_TASK_MEASUREMENTS);
  const base = state ?? EMPTY_JOURNEY;
  if (base.done[SWEAT_TASK_ID] || !date) return state;
  return { ...base, done: { ...base.done, [SWEAT_TASK_ID]: date } };
}

// "Kies je schoenen en begin met inlopen" is done once the boots reached their goal in time
// (engine/bootBreakIn.ts). The same rule for the Reisplanner and the overview in Instellingen.
export function withBootsDone(state: JourneyState | undefined, boots: Pick<BootBreakInStatus, 'kind' | 'reachedOn'>, today: string): JourneyState | undefined {
  if (boots.kind !== 'done' || state?.done[BOOTS_TASK_ID]) return state;
  const base = state ?? EMPTY_JOURNEY;
  return { ...base, done: { ...base.done, [BOOTS_TASK_ID]: boots.reachedOn ?? today } };
}

// --- the timeline -----------------------------------------------------------------

export interface TimelineTask {
  task: JourneyTask;
  status: JourneyTaskStatus;
  isThisWeek: boolean;
  // The first and last day of the window, as dates.
  opensOn: string;
  closesOn: string;
  doneOn?: string;
  // Set when the data makes the task done (derivedDoneLines): the line that says why.
  // Such a task cannot be un-ticked by hand.
  derived?: string;
}

export interface TimelineGroup {
  // First day of the month the tasks close in.
  month: string;
  tasks: TimelineTask[];
}

// The window as dates. The last day is the Sunday of the closing week, but
// never the goal date itself or later.
export function taskDates(task: JourneyTask, goalDate: string): { opensOn: string; closesOn: string } {
  const opensOn = weekStartForWeeksLeft(goalDate, task.window[0]);
  const closesOn = addDays(weekStartForWeeksLeft(goalDate, task.window[1]), 6);
  const lastDay = addDays(goalDate, -1);
  return { opensOn, closesOn: closesOn > lastDay ? lastDay : closesOn };
}

// All tasks in order of when they close, grouped by the month they close in.
export function journeyTimeline(tasks: JourneyTask[], state: JourneyState | undefined, today: string, goalDate: string, thisWeekTaskId?: string, derived?: Record<string, string>): TimelineGroup[] {
  const weeksLeft = journeyWeeksLeft(today, goalDate);
  const rows: TimelineTask[] = tasks.map((task) => ({
    task,
    status: taskStatus(task, state, weeksLeft),
    isThisWeek: task.id === thisWeekTaskId,
    ...taskDates(task, goalDate),
    doneOn: state?.done[task.id],
    ...(derived?.[task.id] && state?.done[task.id] ? { derived: derived[task.id] } : {}),
  }));
  rows.sort((a, b) => a.closesOn.localeCompare(b.closesOn) || a.opensOn.localeCompare(b.opensOn) || a.task.id.localeCompare(b.task.id));
  const groups: TimelineGroup[] = [];
  for (const row of rows) {
    const month = `${row.closesOn.slice(0, 7)}-01`;
    const last = groups[groups.length - 1];
    if (last && last.month === month) last.tasks.push(row);
    else groups.push({ month, tasks: [row] });
  }
  return groups;
}

export function journeyProgress(tasks: JourneyTask[], state: JourneyState | undefined): { done: number; total: number } {
  return { done: tasks.filter((t) => !!state?.done[t.id]).length, total: tasks.length };
}

// --- reading what is stored ------------------------------------------------------------

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// A backup can be old, hand-edited or cut off. Keeps what is readable and
// counts what is not. Unknown task ids are kept: a later version of the app
// may know them.
export function normalizeJourneyState(raw: unknown): { state?: JourneyState; skipped: number } {
  if (!isRecord(raw)) return { state: undefined, skipped: raw === undefined ? 0 : 1 };
  let skipped = 0;
  const done: Record<string, string> = {};
  if (isRecord(raw.done)) {
    for (const [id, date] of Object.entries(raw.done)) {
      if (id && typeof date === 'string' && ISO_DATE.test(date.slice(0, 10))) done[id] = date.slice(0, 10);
      else skipped++;
    }
  } else if (raw.done !== undefined) {
    skipped++;
  }
  const state: JourneyState = { v: 1, done };
  const w = raw.week;
  if (isRecord(w) && typeof w.weekStart === 'string' && ISO_DATE.test(w.weekStart) && typeof w.taskId === 'string' && w.taskId) {
    state.week = { weekStart: w.weekStart, taskId: w.taskId, ...(w.postponed === true ? { postponed: true } : {}) };
  } else if (w !== undefined) {
    skipped++;
  }
  if (raw.boots !== undefined) {
    const boots = normalizeBoots(raw.boots);
    if (boots) state.boots = boots;
    else skipped++;
  }
  return { state, skipped };
}

// Restoring a backup never un-ticks what this device has ticked: the union,
// and where both know a task the device's own date wins.
export function mergeJourneyState(current: JourneyState | undefined, incoming: JourneyState | undefined): JourneyState | undefined {
  if (!current) return incoming;
  if (!incoming) return current;
  const boots = current.boots ?? incoming.boots;
  return { v: 1, done: { ...incoming.done, ...current.done }, week: current.week ?? incoming.week, ...(boots ? { boots } : {}) };
}

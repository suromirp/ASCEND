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
import { addDays, daysBetween, mondayOfWeek } from '../utils/dates';

// What is stored (AppSettings.journey). `v` is the shape's own version, so
// a later change can migrate it without touching the backup schema.
export interface JourneyState {
  v: 1;
  // Task id -> the date it was ticked off.
  done: Record<string, string>;
  // The task kept for one week, once you acted on it on Today.
  week?: { weekStart: string; taskId: string; postponed?: boolean };
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

// --- the timeline -----------------------------------------------------------------

export interface TimelineTask {
  task: JourneyTask;
  status: JourneyTaskStatus;
  isThisWeek: boolean;
  // The first and last day of the window, as dates.
  opensOn: string;
  closesOn: string;
  doneOn?: string;
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
export function journeyTimeline(tasks: JourneyTask[], state: JourneyState | undefined, today: string, goalDate: string, thisWeekTaskId?: string): TimelineGroup[] {
  const weeksLeft = journeyWeeksLeft(today, goalDate);
  const rows: TimelineTask[] = tasks.map((task) => ({
    task,
    status: taskStatus(task, state, weeksLeft),
    isThisWeek: task.id === thisWeekTaskId,
    ...taskDates(task, goalDate),
    doneOn: state?.done[task.id],
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
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

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
  return { state, skipped };
}

// Restoring a backup never un-ticks what this device has ticked: the union,
// and where both know a task the device's own date wins.
export function mergeJourneyState(current: JourneyState | undefined, incoming: JourneyState | undefined): JourneyState | undefined {
  if (!current) return incoming;
  if (!incoming) return current;
  return { v: 1, done: { ...incoming.done, ...current.done }, week: current.week ?? incoming.week };
}

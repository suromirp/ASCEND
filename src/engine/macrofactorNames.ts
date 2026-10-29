// ASCEND: which ASCEND training is a MacroFactor workout name? One question
// per name, not per workout, with a suggestion the user only confirms.
//
// Pure. The suggestion comes from two signals, both read from what ASCEND
// already knows:
// 0. (last) The content, when nothing else is known: engine/macrofactorContent.ts.
// 1. The day. For every workout in the file: which strength template stood
//    planned that day, or, when the day has a log, which one was logged. Per
//    name the template that comes up most often wins. A tie, or too little
//    evidence, gives no suggestion at all.
// 2. The exercises. Squat, deadlift, RDL, lunge, leg press and the like mean a
//    leg session; bench, row, pull, press and the like mean the upper body. It
//    rules out a template of the other kind, and when the day gives one single
//    day of evidence it is the second opinion that makes it enough.
//
// Nothing here stores anything: the page shows the suggestion prefilled and the
// user confirms with one button (components/MacroFactorLinkCard.tsx).

import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import { daysBetween, formatDateNL } from '../utils/dates';
import { nameKey, type MacroFactorWorkout } from './macrofactorImport';
import { isLegSession } from './macrofactorSets';
import type { NameMapping } from './macrofactorLink';
import { suggestByContent } from './macrofactorContent';
import { findSameWorkoutLog, logsOfWorkoutsInFile } from './macrofactorSame';

// --- the exercises ------------------------------------------------------------------

export type Side = 'legs' | 'upper';

// Checked first, so "leg press" and "calf raise" are legs although they also
// contain "press" and "raise".
const LEG_WORDS = /squat|deadlift|\brdl\b|romanian|lunge|leg press|leg curl|leg extension|hamstring|calf|calves|hip thrust|glute|step[- ]?up|good morning|kniebuiging|beenpers|uitvalspas|sled/;
const UPPER_WORDS = /bench|\brow\b|rows\b|pull|press|curl|pulldown|chin|\bdip|fly|flye|raise|push|shrug|tricep|bicep|\blat\b|schouder|borst|optrek|roei/;

export function exerciseSide(exerciseName: string): Side | undefined {
  const name = nameKey(exerciseName);
  if (LEG_WORDS.test(name)) return 'legs';
  if (UPPER_WORDS.test(name)) return 'upper';
  return undefined;
}

// The side most exercises of the workout point at; absent when it is a draw or
// no exercise is recognised.
export function workoutSide(workout: MacroFactorWorkout): Side | undefined {
  let legs = 0;
  let upper = 0;
  for (const e of workout.exercises) {
    const side = exerciseSide(e.name);
    if (side === 'legs') legs++;
    else if (side === 'upper') upper++;
  }
  if (legs === upper) return undefined;
  return legs > upper ? 'legs' : 'upper';
}

const templateSide = (template: SessionTemplate): Side => (isLegSession(template) ? 'legs' : 'upper');

// --- the suggestion ---------------------------------------------------------------------

export interface MappingSuggestion {
  templateId: string;
  // How many workouts of this name fell on a day that points at the template.
  votes: number;
  // The latest of those days; for 'exercises' the latest workout.
  date: string;
  basis: 'planned' | 'logged' | 'exercises' | 'content';
  // 'content' only: the exercises in words ("Squat, deadlift en beenpers: een beendag").
  reason?: string;
  // The workouts of this name are all outside the plan: link them as a loose
  // strength training, tied to no planned session.
  loose?: boolean;
}

interface Tally {
  votes: number;
  date: string;
  basis: 'planned' | 'logged';
}

// A log that came from a MacroFactor file proves nothing about the name: it is
// there because of that name's own link.
const isOwnDerived = (l: SessionLog) => !!l.externalId?.startsWith('macrofactor:') || !!l.manualMeasured?.strength;

// Per name key: the template to suggest. A name without a suggestion is absent.
export function suggestMappings(
  workouts: MacroFactorWorkout[],
  planned: PlannedSession[],
  logs: SessionLog[],
  templates: SessionTemplate[],
): Record<string, MappingSuggestion> {
  const strength = new Map(templates.filter((t) => t.type === 'strength').map((t) => [t.id, t]));
  const byName = new Map<string, MacroFactorWorkout[]>();
  for (const w of workouts) {
    const key = nameKey(w.name);
    byName.set(key, [...(byName.get(key) ?? []), w]);
  }

  const result: Record<string, MappingSuggestion> = {};
  const strengthOf = (id: string) => strength.get(id)!;

  for (const [key, list] of byName) {
    const tallies = new Map<string, Tally>();
    for (const w of list) {
      const side = workoutSide(w);
      const logged = new Set(logs.filter((l) => (l.completedDate === w.date || (l.source === 'macrofactor' && Math.abs(daysBetween(l.completedDate, w.date)) <= 1)) && strength.has(l.templateId) && !isOwnDerived(l)).map((l) => l.templateId));
      const plannedIds = new Set(planned.filter((s) => s.scheduledDate === w.date && s.status !== 'skipped' && strength.has(s.templateId)).map((s) => s.templateId));
      const basis = logged.size > 0 ? 'logged' : 'planned';
      for (const id of logged.size > 0 ? logged : plannedIds) {
        // The exercises say it was the other kind of training: this day proves nothing.
        if (side && templateSide(strengthOf(id)) !== side) continue;
        const t = tallies.get(id);
        if (!t) tallies.set(id, { votes: 1, date: w.date, basis });
        else {
          t.votes++;
          if (w.date > t.date) {
            t.date = w.date;
            t.basis = basis;
          }
        }
      }
    }

    const nameSide = sideOfName(list);
    const ranked = [...tallies].sort((a, b) => b[1].votes - a[1].votes || b[1].date.localeCompare(a[1].date));
    const [top, second] = ranked;
    if (top && !(second && second[1].votes === top[1].votes)) {
      const agrees = nameSide !== undefined && templateSide(strengthOf(top[0])) === nameSide;
      const contradicts = nameSide !== undefined && !agrees;
      // One day alone is not enough, unless the exercises say the same.
      if (!contradicts && (top[1].votes >= 2 || agrees)) {
        result[key] = { templateId: top[0], votes: top[1].votes, date: top[1].date, basis: top[1].basis };
        continue;
      }
    }
    // No day to go on, but only one template of that kind exists.
    if (ranked.length === 0 && nameSide) {
      const fits = [...strength.values()].filter((t) => templateSide(t) === nameSide);
      if (fits.length === 1) result[key] = { templateId: fits[0].id, votes: 0, date: list[list.length - 1].date, basis: 'exercises' };
    }
  }

  // Two names never get the same template as a suggestion: the one with more
  // evidence keeps it, a draw leaves both without.
  const byTemplate = new Map<string, string[]>();
  for (const [key, s] of Object.entries(result)) byTemplate.set(s.templateId, [...(byTemplate.get(s.templateId) ?? []), key]);
  for (const keys of byTemplate.values()) {
    if (keys.length < 2) continue;
    const best = Math.max(...keys.map((k) => result[k].votes));
    const winners = keys.filter((k) => result[k].votes === best);
    for (const k of keys) if (winners.length !== 1 || k !== winners[0]) delete result[k];
  }
  return result;
}

// What the card shows: the suggestions from the plan and the logs, and for the
// names those say nothing about, the ones from the exercises
// (engine/macrofactorContent.ts). Several names may share a template there, as
// there are more names than trainings.
export function suggestAll(
  workouts: MacroFactorWorkout[],
  planned: PlannedSession[],
  logs: SessionLog[],
  templates: SessionTemplate[],
  programStart?: string,
): Record<string, MappingSuggestion> {
  const result = suggestMappings(workouts, planned, logs, templates);
  for (const [key, c] of Object.entries(suggestByContent(workouts, templates, planned, programStart))) {
    if (key in result) continue;
    const dates = workouts.filter((w) => nameKey(w.name) === key).map((w) => w.date).sort();
    result[key] = { templateId: c.templateId, votes: 0, date: dates[dates.length - 1], basis: 'content', reason: c.reason, loose: c.loose };
  }
  return result;
}

function sideOfName(list: MacroFactorWorkout[]): Side | undefined {
  const sides = list.map(workoutSide);
  const legs = sides.filter((s) => s === 'legs').length;
  const upper = sides.filter((s) => s === 'upper').length;
  if (legs === upper) return undefined;
  return legs > upper ? 'legs' : 'upper';
}

// "voorgesteld omdat op 30 september Benen A gepland stond"
export function describeSuggestion(s: MappingSuggestion, templateName: string): string {
  if (s.basis === 'content' && s.reason) return s.loose ? `${s.reason}. Valt buiten je planning, daarom als losse krachttraining` : s.reason;
  if (s.basis === 'exercises') return `voorgesteld omdat de oefeningen bij ${templateName} passen`;
  const state = s.basis === 'planned' ? 'gepland' : 'gelogd';
  const more = s.votes > 1 ? `, en op ${s.votes - 1} ${s.votes - 1 === 1 ? 'andere dag' : 'andere dagen'} ook` : '';
  return `voorgesteld omdat op ${formatDateNL(s.date)} ${templateName} ${state} stond${more}`;
}

// --- one line per name ----------------------------------------------------------------------

export interface LinkRow {
  key: string;
  // The name as MacroFactor shows it.
  name: string;
  // Workouts of this name that still have to be handled.
  count: number;
  // A template id, null for "niet inlezen", undefined when the name is not
  // linked yet (or its template is gone).
  linked: string | null | undefined;
  // Stored as a loose strength training (tied to no planned session).
  loose?: boolean;
  suggestion?: MappingSuggestion;
}

// One row for every unique name that still has a workout to handle (not stored
// in a log yet, not set aside), in the order of the file.
export function linkRows(
  workouts: MacroFactorWorkout[],
  mapping: NameMapping,
  dismissed: string[],
  logs: SessionLog[],
  templates: SessionTemplate[],
  suggestions: Record<string, MappingSuggestion>,
  loose: string[] = [],
): LinkRow[] {
  const done = new Set([...dismissed, ...logs.flatMap((l) => [l.externalId, l.manualMeasured?.strength?.workoutId]).filter((id): id is string => !!id)]);
  const known = new Set(templates.map((t) => t.id));
  const rows = new Map<string, LinkRow>();
  // A log of another workout in this file is never "the same, renamed".
  const taken = logsOfWorkoutsInFile(workouts, logs);
  for (const w of [...workouts].sort((a, b) => a.start.localeCompare(b.start))) {
    if (done.has(w.externalId)) continue;
    // Renamed, but the same sets on the same day as a log that is there: nothing to link.
    if (findSameWorkoutLog(w, logs, taken)) continue;
    const key = nameKey(w.name);
    const row = rows.get(key);
    if (row) {
      row.count++;
      continue;
    }
    const stored = mapping[key];
    rows.set(key, {
      key,
      name: w.name,
      count: 1,
      linked: key in mapping && (stored === null || (stored !== undefined && known.has(stored))) ? stored : undefined,
      ...(loose.includes(key) ? { loose: true } : {}),
      suggestion: suggestions[key],
    });
  }
  return [...rows.values()];
}

// The same kind together: sorted by the training a row points at, in the order
// of the program; names without a suggestion last. Stable, so the order of the
// file stays within a group.
export function groupRows(rows: LinkRow[], templates: SessionTemplate[]): LinkRow[] {
  const order = new Map(templates.map((t, i) => [t.id, i]));
  const rank = (r: LinkRow) => {
    const id = typeof r.linked === 'string' ? r.linked : r.suggestion?.templateId;
    return id !== undefined && order.has(id) ? order.get(id)! : templates.length + (r.linked === null ? 1 : 0);
  };
  return [...rows].sort((a, b) => rank(a) - rank(b));
}

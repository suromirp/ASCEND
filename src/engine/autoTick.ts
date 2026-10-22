// ASCEND: "Vanzelf afvinken": when the watch has an activity that belongs
// unmistakably to a planned training of that day, ASCEND stores it as the log
// of that training by itself and only asks how it went
// (docs/visie/Visuele upgrade en nieuwe ideeën.md, idee 2;
// docs/beslissingen/2026-10-22-vanzelf-afvinken.md).
//
// Pure: no React, no IndexedDB. The rule is deliberately narrow. It acts only
// when nothing is left to choose:
//
// - the same day, a planned training of the right kind, and only ONE of them,
// - a length in the neighbourhood of what was planned,
// - no log made by hand that day that looks like the same training,
// - not a test run or a race (their log feeds the pace calculation and the
//   user fills those in himself),
// - and no other activity of the same day pointing at the same training.
//
// In any doubt the ordinary proposal stays, with its Opslaan / Andere training
// / Niet opslaan choices (engine/activityImport.ts).
//
// History stays append-only: the log this makes is a NEW log, never a change
// of an old one. The one thing that may take it away again is the user
// refusing it straight away ("Klopt niet"), because the app made it itself a
// moment ago (canRejectAutoLog).

import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import { activityDate, candidatePlanned, findSimilarLog, isImportable, plannedMinutes, type ExternalActivity, type PlannedMatch } from './activityImport';
import { RACE_TEMPLATE_ID, TEST_TEMPLATE_ID } from './raceBlock';
import { todayISO } from '../utils/dates';

// "Duration in the neighbourhood": within 15 minutes or 35 percent of the
// plan, whichever is more. A 40-minute run done in 52 or 27 counts; a planned
// 3-hour hike that took 4 hours does not (that is a different day than planned).
export const DURATION_MARGIN_MIN = 15;
export const DURATION_MARGIN_RATIO = 0.35;

// How long after the tick-off "Hoe ging het?" stays open and "Klopt niet" works.
export const QUESTION_HOURS = 72;
const KEEP_ENTRIES = 60;

export type AutoLoggedStatus = 'asking' | 'done' | 'rejected';

// The note the app keeps of a log it made by itself. It outlives the log: a
// log the user deletes later, or refuses, stays remembered so the same
// activity is not ticked off a second time.
export interface AutoLogged {
  externalId: string;
  logId: string;
  at: string; // ISO date-time of the tick-off
  status: AutoLoggedStatus;
}

export interface AutoTick {
  activity: ExternalActivity;
  match: PlannedMatch;
}

export function durationIsClose(actualMinutes: number, plannedMinutesValue: number): boolean {
  return Math.abs(actualMinutes - plannedMinutesValue) <= Math.max(DURATION_MARGIN_MIN, plannedMinutesValue * DURATION_MARGIN_RATIO);
}

const NOT_AUTOMATIC = new Set([TEST_TEMPLATE_ID, RACE_TEMPLATE_ID]);

// The one planned training this activity unmistakably belongs to, or
// undefined when there is any doubt.
export function autoTickMatch(
  activity: ExternalActivity,
  planned: PlannedSession[],
  templates: SessionTemplate[],
  logs: SessionLog[],
  today: string = todayISO(),
): PlannedMatch | undefined {
  if (!isImportable(activity)) return undefined;
  if (activityDate(activity) > today) return undefined;
  if (logs.some((l) => l.externalId === activity.externalId)) return undefined;
  const candidates = candidatePlanned(activity, planned, templates, logs, { sameDayOnly: true });
  if (candidates.length !== 1) return undefined;
  const [match] = candidates;
  if (NOT_AUTOMATIC.has(match.template.id) || NOT_AUTOMATIC.has(match.session.templateId)) return undefined;
  if (!durationIsClose(activity.durationSec / 60, plannedMinutes(match))) return undefined;
  if (findSimilarLog(activity, logs)) return undefined;
  return match;
}

// All the tick-offs to make now. An activity the user said no to, one that
// was ticked off before (also when the user refused or deleted that log), and
// two activities fighting over one training are left alone.
export function planAutoTicks(
  activities: ExternalActivity[],
  dismissedIds: string[],
  autoLogged: AutoLogged[],
  planned: PlannedSession[],
  templates: SessionTemplate[],
  logs: SessionLog[],
  today: string = todayISO(),
): AutoTick[] {
  const dismissed = new Set(dismissedIds);
  const known = new Set(autoLogged.map((a) => a.externalId));
  const found: AutoTick[] = [];
  for (const activity of [...activities].sort((a, b) => a.start.localeCompare(b.start))) {
    if (dismissed.has(activity.externalId) || known.has(activity.externalId)) continue;
    const match = autoTickMatch(activity, planned, templates, logs, today);
    if (match) found.push({ activity, match });
  }
  // Two activities for one training (a warm-up walk and the run): which one
  // is "the" training is exactly the doubt this rule stays out of.
  const perSession = new Map<string, number>();
  for (const t of found) perSession.set(t.match.session.id, (perSession.get(t.match.session.id) ?? 0) + 1);
  return found.filter((t) => perSession.get(t.match.session.id) === 1);
}

// --- the question afterwards ---------------------------------------------------------

export interface AutoQuestion {
  entry: AutoLogged;
  log: SessionLog;
}

function ageHours(entry: AutoLogged, now: Date): number {
  const at = Date.parse(entry.at);
  return Number.isFinite(at) ? (now.getTime() - at) / 3_600_000 : Infinity;
}

// The ticked-off trainings still waiting for "Hoe ging het?": newest first,
// only while the log exists and the question is not older than three days.
export function pendingQuestions(autoLogged: AutoLogged[], logs: SessionLog[], now: Date = new Date()): AutoQuestion[] {
  const byId = new Map(logs.map((l) => [l.id, l]));
  return autoLogged
    .filter((a) => a.status === 'asking' && ageHours(a, now) <= QUESTION_HOURS)
    .map((entry) => ({ entry, log: byId.get(entry.logId) }))
    .filter((q): q is AutoQuestion => !!q.log && q.log.externalId === q.entry.externalId)
    .sort((a, b) => b.entry.at.localeCompare(a.entry.at));
}

// The only case in which the app takes a log away: the log is the one it made
// itself, the user has not answered the question yet, and it is recent. Every
// other log goes away only through the ordinary deletion in the logbook.
export function canRejectAutoLog(entry: AutoLogged | undefined, log: SessionLog | undefined, now: Date = new Date()): boolean {
  if (!entry || !log) return false;
  if (entry.status !== 'asking') return false;
  if (entry.logId !== log.id || !log.externalId || log.externalId !== entry.externalId) return false;
  if (log.source === 'manual') return false;
  return ageHours(entry, now) <= QUESTION_HOURS;
}

export function upsertAutoLogged(list: AutoLogged[], entry: AutoLogged): AutoLogged[] {
  const next = [...list.filter((a) => a.externalId !== entry.externalId), entry];
  return next.slice(-KEEP_ENTRIES);
}

export function withAutoStatus(list: AutoLogged[], externalId: string, status: AutoLoggedStatus): AutoLogged[] {
  return list.map((a) => (a.externalId === externalId ? { ...a, status } : a));
}

// --- the answer ---------------------------------------------------------------------

// What "Hoe ging het?" adds to the log: only the three things asked, nothing
// else of the log changes. Empty values stay as the watch gave them.
export interface FeedbackPatch {
  rpe?: number;
  subjectiveFeel?: SessionLog['subjectiveFeel'];
  painReports?: SessionLog['painReports'];
}

export function applyFeedback(log: SessionLog, patch: FeedbackPatch): SessionLog {
  const next: SessionLog = { ...log };
  if (patch.rpe !== undefined) next.rpe = Math.min(10, Math.max(1, Math.round(patch.rpe)));
  if (patch.subjectiveFeel !== undefined) next.subjectiveFeel = patch.subjectiveFeel;
  if (patch.painReports && patch.painReports.length > 0) next.painReports = patch.painReports;
  return next;
}

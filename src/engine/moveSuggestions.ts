// ASCEND — one-tap move suggestions (production feedback: "je wil gewoon
// een paar suggesties [...] waar je één keer op kan klikken en dan fixt
// hij dat voor je"). Replaces the separate "Geen tijd vandaag" flow and the
// bare date picker as the main way to move a session: the session sheet
// shows the best few days, each already checked against the same rules a
// manual move uses (time per day / pairing via dayHasRoomFor, 48 hours
// between heavy work for the same muscles via findHeavyConflict, never a
// day in the past). Deterministic, no guessing: nearest good day first,
// the session's own week before the next one. Never a day the planning keeps
// free: a holiday or trek day, the rest day, the main goal's day or later, or
// the days you are ill (MoveContext).

import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import type { Program } from '../models/program';
import type { DailyTimeBudget, TrainingStrategyProfile, Weekday } from '../models/goalEngineConfig';
import { dayHasRoomFor, findHeavyConflict, proposeMove, type ScheduleProposal } from './scheduler';
import { resolveEffectiveFullDuration } from './substitutions';
import { addDays, daysBetween, isoWeekday, mondayOfWeek, weekdayOf } from '../utils/dates';
import type { LeavePeriod } from '../models/leave';
import type { IllnessEpisode } from '../models/illness';
import { leaveDays, lightDays } from './leave';
import { activeIllness, isHeavySession } from './illness';

const UNSET_DAY_PAIRING_CAP_MINUTES = 120;

export interface MoveSuggestion {
  date: string;
  // Nothing else planned that day.
  free: boolean;
  // Why this day, in plain words: "Vrije dag", or "Met Rustige duurloop,
  // samen 105 min" (what already stands there, and the day's minutes).
  note: string;
  proposal: ScheduleProposal;
}

// The days the planning keeps free, which a one-tap suggestion must keep free
// too (Warden Logica punt 6): the suggestion gets your lock, so the week check
// could never put it right afterwards.
export interface MoveContext {
  // Free days, holidays and treks (engine/leave.ts): never a day of a holiday
  // or a trek, and nothing heavy on the light day before or after a trek.
  leave?: LeavePeriod[];
  // Weekday 1 to 7 of the rest day: kept free.
  restDay?: number;
  // The main goal's day: nothing on or after it.
  goalDay?: string;
  // While ill (an episode without an end): not today or tomorrow, the days
  // reporting ill cleared (engine/illness.ts).
  illness?: IllnessEpisode[];
}

// Why the planning keeps a day free for this training, or nothing when it may land there. One
// source for the one-tap suggestions and for dragging in Week (engine/weekDrag.ts).
export type KeptReason = 'off' | 'trek' | 'light' | 'rest' | 'goal' | 'ill';

export function keptDayReason(context: MoveContext, template: SessionTemplate, date: string, asOf: string): KeptReason | undefined {
  const offDays = leaveDays(context.leave);
  const leave = offDays.get(date)?.kind;
  if (leave === 'off') return 'off';
  if (leave === 'trek') return 'trek';
  if (isHeavySession(template) && lightDays(context.leave, offDays).has(date)) return 'light';
  if (context.restDay && isoWeekday(date) === context.restDay) return 'rest';
  if (context.goalDay && date >= context.goalDay) return 'goal';
  if (activeIllness(context.illness) && date <= addDays(asOf, 1)) return 'ill';
  return undefined;
}

export function suggestMoveDates(
  sessions: PlannedSession[], // the session's week and the weeks around it
  templates: SessionTemplate[],
  sessionId: string,
  recentLogs: SessionLog[],
  program: Program | null | undefined,
  dailyTimeBudget: Partial<Record<Weekday, DailyTimeBudget>> | undefined,
  sameDayPairingPreference: TrainingStrategyProfile['sameDayPairingPreference'],
  asOf: string,
  max = 3,
  context: MoveContext = {},
): MoveSuggestion[] {
  const templateById = new Map(templates.map((t) => [t.id, t]));
  const session = sessions.find((s) => s.id === sessionId);
  const template = session ? templateById.get(session.templateId) : undefined;
  if (!session || !template) return [];

  const ownWeek = mondayOfWeek(session.scheduledDate);
  const firstDay = asOf > ownWeek ? asOf : ownWeek;
  const lastDay = addDays(ownWeek, 13); // through the end of next week
  const others = sessions.filter((s) => s.id !== sessionId && s.status !== 'skipped');

  const minutesOn = (date: string) => others
    .filter((s) => s.scheduledDate === date)
    .reduce((sum, s) => { const t = templateById.get(s.templateId); return t ? sum + resolveEffectiveFullDuration(t, date, program) : sum; }, 0);
  const ownMinutes = (date: string) => resolveEffectiveFullDuration(template, date, program);

  const fitsNormally = (date: string) => dayHasRoomFor(date, template, others, templateById, program, dailyTimeBudget, sameDayPairingPreference);
  // ASCEND_HEURISTIC(UNSET-DAY-PAIRING-CAP): with no time set for a day,
  // planning treats it as full once it holds one session. Right for
  // automatic planning, but it leaves a 7-day week with nothing to suggest.
  // When the user asks to move, a day without its own time setting may
  // still take this session if the two together stay within 120 minutes
  // (unless pairing is switched off), ranked a little below a day that
  // fits normally.
  const fitsWhenAsked = (date: string) => sameDayPairingPreference !== 'never'
    && !dailyTimeBudget?.[weekdayOf(date)]
    && minutesOn(date) + ownMinutes(date) <= UNSET_DAY_PAIRING_CAP_MINUTES;

  const kept = (date: string) => keptDayReason(context, template, date, asOf) !== undefined;

  const candidates: { date: string; score: number }[] = [];
  for (let date = firstDay; date <= lastDay; date = addDays(date, 1)) {
    if (date === session.scheduledDate || kept(date)) continue;
    // Never a third session on one day, whatever the time allows.
    if (others.filter((s) => s.scheduledDate === date).length >= 2) continue;
    const normal = fitsNormally(date);
    if (!normal && !fitsWhenAsked(date)) continue;
    if (findHeavyConflict(sessionId, template, date, others, templateById, recentLogs)) continue;
    const distance = Math.abs(daysBetween(session.scheduledDate, date));
    const sameWeek = mondayOfWeek(date) === ownWeek;
    // ASCEND_HEURISTIC(FREE-DAY-FIRST): production feedback, a sheet offered two
    // days that already held a long training before the free day after them.
    // Sharing a day costs two days of distance, so a free day close by wins.
    const shared = others.some((s) => s.scheduledDate === date);
    candidates.push({ date, score: (sameWeek ? 0 : 7) + distance + (date < session.scheduledDate ? 0.5 : 0) + (normal ? 0 : 3) + (shared ? 2 : 0) });
  }

  return candidates
    .sort((a, b) => a.score - b.score || a.date.localeCompare(b.date))
    .slice(0, max)
    .map(({ date }) => ({ date, sameDay: others.filter((s) => s.scheduledDate === date).map((s) => templateById.get(s.templateId)?.name).filter((n): n is string => !!n) }))
    // Free days first, then the days it can share; each by date.
    .sort((a, b) => Number(a.sameDay.length > 0) - Number(b.sameDay.length > 0) || a.date.localeCompare(b.date))
    .map(({ date, sameDay }) => {
      return {
        date,
        free: sameDay.length === 0,
        note: sameDay.length === 0 ? 'Vrije dag' : `Met ${sameDay.join(' en ')}, samen ${minutesOn(date) + ownMinutes(date)} min`,
        proposal: proposeMove(sessions, templates, sessionId, date, recentLogs, program, dailyTimeBudget, sameDayPairingPreference, asOf),
      };
    });
}

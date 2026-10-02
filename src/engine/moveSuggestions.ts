// ASCEND — one-tap move suggestions (production feedback: "je wil gewoon
// een paar suggesties [...] waar je één keer op kan klikken en dan fixt
// hij dat voor je"). Replaces the separate "Geen tijd vandaag" flow and the
// bare date picker as the main way to move a session: the session sheet
// shows the best few days, each already checked against the same rules a
// manual move uses (time per day / pairing via dayHasRoomFor, 48 hours
// between heavy work for the same muscles via findHeavyConflict, never a
// day in the past). Deterministic, no guessing: nearest good day first,
// the session's own week before the next one.

import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import type { Program } from '../models/program';
import type { DailyTimeBudget, TrainingStrategyProfile, Weekday } from '../models/goalEngineConfig';
import { dayHasRoomFor, findHeavyConflict, proposeMove, type ScheduleProposal } from './scheduler';
import { resolveEffectiveFullDuration } from './substitutions';
import { addDays, daysBetween, mondayOfWeek, weekdayOf } from '../utils/dates';

const UNSET_DAY_PAIRING_CAP_MINUTES = 120;

export interface MoveSuggestion {
  date: string;
  // "vrije dag" or "samen met Easy Run"
  note: string;
  proposal: ScheduleProposal;
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

  const candidates: { date: string; score: number }[] = [];
  for (let date = firstDay; date <= lastDay; date = addDays(date, 1)) {
    if (date === session.scheduledDate) continue;
    // Never a third session on one day, whatever the time allows.
    if (others.filter((s) => s.scheduledDate === date).length >= 2) continue;
    const normal = fitsNormally(date);
    if (!normal && !fitsWhenAsked(date)) continue;
    if (findHeavyConflict(sessionId, template, date, others, templateById, recentLogs)) continue;
    const distance = Math.abs(daysBetween(session.scheduledDate, date));
    const sameWeek = mondayOfWeek(date) === ownWeek;
    candidates.push({ date, score: (sameWeek ? 0 : 7) + distance + (date < session.scheduledDate ? 0.5 : 0) + (normal ? 0 : 3) });
  }

  return candidates
    .sort((a, b) => a.score - b.score || a.date.localeCompare(b.date))
    .slice(0, max)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(({ date }) => {
      const sameDay = others.filter((s) => s.scheduledDate === date).map((s) => templateById.get(s.templateId)?.name).filter(Boolean);
      return {
        date,
        note: sameDay.length === 0 ? 'vrije dag' : `samen met ${sameDay.join(' en ')}, ${minutesOn(date) + ownMinutes(date)} min`,
        proposal: proposeMove(sessions, templates, sessionId, date, recentLogs, program, dailyTimeBudget, sameDayPairingPreference, asOf),
      };
    });
}

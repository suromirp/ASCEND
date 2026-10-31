import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import type { IllnessEpisode } from '../models/illness';
import { deriveSessionStatus } from './sessionStatus';
import { isIllnessDay } from './illness';
import { addDays, todayISO } from '../utils/dates';

// Safety bound on the backward walk below — a real program never runs this
// long, this only exists so an empty/near-empty planner (no sessions at all
// yet) can't spin forever just because every day it looks at is neutral.
const MAX_LOOKBACK_DAYS = 1000;

// Wat de reeks moet weten om eerlijk te tellen. Zonder deze gegevens telt elke
// geplande sessie mee (de oude werking).
export interface StreakContext {
  templateById?: ReadonlyMap<string, Pick<SessionTemplate, 'type'>>;
  programStart?: string;
  illnessEpisodes?: IllnessEpisode[];
}

// Consecutive days of discipline, ending today (or yesterday, if today's
// session(s) haven't been resolved yet — an unfinished "today" shouldn't
// retroactively zero out yesterday's streak just because you haven't
// trained yet this morning). A day with no planned session is neutral: it
// neither extends nor breaks the streak, it's just skipped over. A day
// where every planned session was completed extends it by one. A day with
// a skipped or missed session ends it.
//
// Neutral too, like on Logboek (pages/History.tsx#countMissed): a rest day, a
// day you were ill, a session that fell away because of a leave
// (`leave.role === 'dropped'`) and days before the program started.
export function computeCurrentStreak(plannedSessions: PlannedSession[], logs: SessionLog[], context: StreakContext = {}): number {
  const { templateById, programStart, illnessEpisodes } = context;
  const today = todayISO();
  const isRest = (s: PlannedSession) => templateById?.get(s.templateId)?.type === 'recovery';
  const neutral = (s: PlannedSession) =>
    (programStart !== undefined && s.scheduledDate < programStart) ||
    (illnessEpisodes !== undefined && isIllnessDay(s.scheduledDate, illnessEpisodes, today)) ||
    (s.status === 'skipped' && s.leave?.role === 'dropped');
  const statusOf = (s: PlannedSession) => deriveSessionStatus(s, logs, isRest(s)).status;

  const byDate = new Map<string, PlannedSession[]>();
  for (const s of plannedSessions) {
    if (neutral(s)) continue;
    const list = byDate.get(s.scheduledDate);
    if (list) list.push(s);
    else byDate.set(s.scheduledDate, [s]);
  }

  let cursor = today;
  const todaysSessions = byDate.get(today) ?? [];
  const todayUnresolved = todaysSessions.some((s) => statusOf(s) === 'today');
  if (todayUnresolved) cursor = addDays(today, -1);

  let streak = 0;
  for (let i = 0; i < MAX_LOOKBACK_DAYS; i++) {
    // A rest day with no log is neutral; one with a walk logged counts as done.
    const daySessions = (byDate.get(cursor) ?? []).filter((s) => statusOf(s) !== 'rest');
    if (daySessions.length > 0) {
      const statuses = daySessions.map(statusOf);
      if (statuses.some((st) => st === 'skipped' || st === 'missed')) break;
      if (!statuses.every((st) => st === 'completed')) break;
      streak++;
    }
    cursor = addDays(cursor, -1);
  }

  return streak;
}

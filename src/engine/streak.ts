import type { PlannedSession, SessionLog } from '../models/training';
import { deriveSessionStatus } from './sessionStatus';
import { addDays, todayISO } from '../utils/dates';

// Safety bound on the backward walk below — a real program never runs this
// long, this only exists so an empty/near-empty planner (no sessions at all
// yet) can't spin forever just because every day it looks at is neutral.
const MAX_LOOKBACK_DAYS = 1000;

// Consecutive days of discipline, ending today (or yesterday, if today's
// session(s) haven't been resolved yet — an unfinished "today" shouldn't
// retroactively zero out yesterday's streak just because you haven't
// trained yet this morning). A day with no planned session is neutral: it
// neither extends nor breaks the streak, it's just skipped over. A day
// where every planned session was completed extends it by one. A day with
// a skipped or missed session ends it.
export function computeCurrentStreak(plannedSessions: PlannedSession[], logs: SessionLog[]): number {
  const byDate = new Map<string, PlannedSession[]>();
  for (const s of plannedSessions) {
    const list = byDate.get(s.scheduledDate);
    if (list) list.push(s);
    else byDate.set(s.scheduledDate, [s]);
  }

  const today = todayISO();
  let cursor = today;
  const todaysSessions = byDate.get(today) ?? [];
  const todayUnresolved = todaysSessions.some((s) => deriveSessionStatus(s, logs).status === 'today');
  if (todayUnresolved) cursor = addDays(today, -1);

  let streak = 0;
  for (let i = 0; i < MAX_LOOKBACK_DAYS; i++) {
    const daySessions = byDate.get(cursor) ?? [];
    if (daySessions.length > 0) {
      const statuses = daySessions.map((s) => deriveSessionStatus(s, logs).status);
      if (statuses.some((st) => st === 'skipped' || st === 'missed')) break;
      if (!statuses.every((st) => st === 'completed')) break;
      streak++;
    }
    cursor = addDays(cursor, -1);
  }

  return streak;
}

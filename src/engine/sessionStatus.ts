import type { PlannedSession, SessionLog } from '../models/training';
import { todayISO } from '../utils/dates';
import type { LeavePeriod } from '../models/leave';
import { isAwayDay } from './leave';

// 'away': voorbij en niet gedaan op een dag van een vakantie, tocht of periode zonder sportschool die je meldde
// (engine/leave.ts#isAwayDay). Nooit gemist, dezelfde afleiding als de weekterugblik (engine/weekLogs.ts#leftOutOfCount).
export type DisplayStatus = 'completed' | 'today' | 'planned' | 'moved' | 'skipped' | 'missed' | 'rest' | 'away';

export interface DisplaySessionState {
  status: DisplayStatus;
  wasMoved: boolean;
  log?: SessionLog;
}

// Completion is never stored directly on a PlannedSession — it is always
// derived from whether a SessionLog referencing it exists. This is the one
// place that derivation happens so every screen agrees on what "done" means.
//
// A past session that was never logged AND never explicitly skipped is
// "missed" — distinct from a future "planned" session. Without this,
// history quietly renders an untouched past session as an empty upcoming
// circle, which looks identical to something that simply hasn't happened
// yet.
//
// A rest day (isRest) is not a training: nothing to tick off, so it is
// never "missed" and never waits for a log. Logging a walk on it still
// shows as done.
//
// "Verplaatst" (wasMoved) is only what you moved, or a proposal you accepted
// did: status 'moved' or a lock. A move by the system itself keeps
// movedFromDate as a trace, but no screen calls it "verplaatst" as if you did
// it (Warden Planning punt 8, docs/beslissingen/2026-10-23-planning-nooit-stil.md).
function movedByYou(session: PlannedSession): boolean {
  return !!session.movedFromDate && session.movedFromDate !== session.scheduledDate && (session.status === 'moved' || !!session.lock);
}

export function deriveSessionStatus(session: PlannedSession, logs: SessionLog[], isRest = false, leave?: LeavePeriod[]): DisplaySessionState {
  const log = logs.find((l) => l.plannedSessionId === session.id);
  const wasMoved = movedByYou(session);
  if (log) return { status: 'completed', wasMoved, log };
  if (isRest) return { status: 'rest', wasMoved };
  if (session.status === 'skipped') return { status: 'skipped', wasMoved };
  if (session.scheduledDate === todayISO()) return { status: 'today', wasMoved };
  if (session.scheduledDate < todayISO()) return { status: leave?.length && isAwayDay(session.scheduledDate, leave) ? 'away' : 'missed', wasMoved };
  if (session.status === 'moved') return { status: 'moved', wasMoved: true };
  return { status: 'planned', wasMoved: false };
}

// De duur van een gedane training is die van het log, in hele minuten, nooit die van het plan
// (profielen 14 november, punt A). Een log zonder bruikbare duur (oud, leeg, 0 of negatief) heeft
// geen duur: dan staat er geen getal, ook niet het plan.
export function loggedMinutes(log: Pick<SessionLog, 'durationMinutes'> | undefined): number | undefined {
  const m = log?.durationMinutes;
  if (typeof m !== 'number' || !Number.isFinite(m) || m < 0.5) return undefined;
  return Math.round(m);
}

// De minuten op een rij: met een log die van het log (of geen), zonder log het plan.
export function rowMinutes(log: Pick<SessionLog, 'durationMinutes'> | undefined, plannedMinutes: number): number | undefined {
  return log ? loggedMinutes(log) : plannedMinutes;
}

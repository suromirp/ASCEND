import type { PlannedSession, SessionLog } from '../models/training';
import { todayISO } from '../utils/dates';

export type DisplayStatus = 'completed' | 'today' | 'planned' | 'moved' | 'skipped' | 'missed';

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
export function deriveSessionStatus(session: PlannedSession, logs: SessionLog[]): DisplaySessionState {
  const log = logs.find((l) => l.plannedSessionId === session.id);
  if (log) return { status: 'completed', wasMoved: !!session.movedFromDate, log };
  if (session.status === 'skipped') return { status: 'skipped', wasMoved: !!session.movedFromDate };
  if (session.scheduledDate === todayISO()) return { status: 'today', wasMoved: !!session.movedFromDate };
  if (session.scheduledDate < todayISO()) return { status: 'missed', wasMoved: !!session.movedFromDate };
  if (session.status === 'moved') return { status: 'moved', wasMoved: true };
  return { status: 'planned', wasMoved: false };
}

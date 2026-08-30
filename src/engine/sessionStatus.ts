import type { PlannedSession, SessionLog } from '../models/training';
import { todayISO } from '../utils/dates';

export type DisplayStatus = 'completed' | 'today' | 'planned' | 'moved' | 'skipped';

export interface DisplaySessionState {
  status: DisplayStatus;
  wasMoved: boolean;
  log?: SessionLog;
}

// Completion is never stored directly on a PlannedSession — it is always
// derived from whether a SessionLog referencing it exists. This is the one
// place that derivation happens so every screen agrees on what "done" means.
export function deriveSessionStatus(session: PlannedSession, logs: SessionLog[]): DisplaySessionState {
  const log = logs.find((l) => l.plannedSessionId === session.id);
  if (log) return { status: 'completed', wasMoved: !!session.movedFromDate, log };
  if (session.status === 'skipped') return { status: 'skipped', wasMoved: !!session.movedFromDate };
  if (session.scheduledDate === todayISO()) return { status: 'today', wasMoved: !!session.movedFromDate };
  if (session.status === 'moved') return { status: 'moved', wasMoved: true };
  return { status: 'planned', wasMoved: false };
}

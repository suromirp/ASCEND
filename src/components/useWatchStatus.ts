// ASCEND: reads the stored state of "Trainingen naar je horloge sturen" and
// answers per planned training what its status is (engine/watchStatus.ts).
// It reads the state again when a send happens anywhere in the app
// (WATCH_STATE_EVENT), when the app comes back to the front, and on request,
// so the line on a training and the mark on Week follow the background run.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import { getConnection } from '../storage/externalActivities';
import { getWatchWorkoutState, WATCH_STATE_EVENT, type WatchWorkoutState } from '../storage/watchWorkouts';
import { watchStatusFor, type WatchStatus } from '../engine/watchStatus';
import { racePaces } from '../engine/racePaces';
import { testResults } from '../engine/racePrediction';
import { todayISO } from '../utils/dates';
import type { PlannedSession, SessionTemplate } from '../models/training';

interface Snapshot {
  state: WatchWorkoutState;
  connected: boolean;
}

async function readSnapshot(): Promise<Snapshot | null> {
  try {
    const [state, connection] = await Promise.all([getWatchWorkoutState(), getConnection()]);
    return { state, connected: !!connection };
  } catch {
    // Unreadable storage: no status is better than a wrong one.
    return null;
  }
}

export function useWatchStatuses(): { statusOf: (session: PlannedSession, template: SessionTemplate) => WatchStatus; ready: boolean; reload: () => Promise<void> } {
  const { sessionLogs, program } = useAppData();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);

  const reload = useCallback(() => readSnapshot().then(setSnapshot), []);

  useEffect(() => {
    let alive = true;
    const again = () => {
      if (document.visibilityState === 'hidden') return;
      void readSnapshot().then((next) => {
        if (alive) setSnapshot(next);
      });
    };
    again();
    window.addEventListener(WATCH_STATE_EVENT, again);
    document.addEventListener('visibilitychange', again);
    return () => {
      alive = false;
      window.removeEventListener(WATCH_STATE_EVENT, again);
      document.removeEventListener('visibilitychange', again);
    };
  }, []);

  const paces = useMemo(() => racePaces(testResults(sessionLogs)), [sessionLogs]);
  const logged = useMemo(() => new Set(sessionLogs.map((l) => l.plannedSessionId).filter((id): id is string => !!id)), [sessionLogs]);

  const statusOf = useCallback(
    (session: PlannedSession, template: SessionTemplate): WatchStatus => {
      if (!snapshot) return { kind: 'none' };
      const { state, connected } = snapshot;
      return watchStatusFor(session, template, {
        linked: connected && state.enabled,
        items: state.items,
        syncedAt: state.syncedAt,
        lastError: state.lastError,
        today: todayISO(),
        program,
        paces,
        logged,
      });
    },
    [snapshot, program, paces, logged],
  );

  return { statusOf, ready: snapshot !== null, reload };
}

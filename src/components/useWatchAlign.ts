// ASCEND: the state and the actions behind the "Garmin is leidend" screens
// (components/WatchAlignCard.tsx).

import { useEffect, useMemo, useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import { declineAlignment, getWatchState, onWatchChange, resolveAlignment, type WatchActivityState } from '../storage/externalActivities';
import { isAligned, mergeActivities, planAlignment, type AlignItem } from '../engine/watchAlign';
import type { SessionLog } from '../models/training';

export interface WatchAlign {
  state: WatchActivityState | null;
  // What would change, newest first (the proposal).
  items: AlignItem[];
  // Logs that took over the watch's numbers, newest first.
  aligned: SessionLog[];
}

export function useWatchAlign(): WatchAlign {
  const { sessionLogs } = useAppData();
  const [state, setState] = useState<WatchActivityState | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () => void getWatchState().then((s) => alive && setState(s)).catch(() => undefined);
    load();
    const stop = onWatchChange(load);
    return () => {
      alive = false;
      stop();
    };
  }, []);

  const items = useMemo(
    () => (state?.use.activities ? planAlignment(mergeActivities(state.activities, state.history), sessionLogs, { declined: state.alignDeclined }) : []),
    [state, sessionLogs],
  );
  const aligned = useMemo(() => sessionLogs.filter(isAligned).sort((a, b) => b.completedDate.localeCompare(a.completedDate)), [sessionLogs]);
  return { state, items, aligned };
}

export function useAlignActions(items: AlignItem[]) {
  const { alignWithWatch } = useAppData();
  const [busy, setBusy] = useState(false);

  async function approve() {
    if (busy) return;
    setBusy(true);
    try {
      await alignWithWatch(items.map((i) => ({ logId: i.log.id, activity: i.activity })));
      await resolveAlignment();
    } finally {
      setBusy(false);
    }
  }
  async function decline() {
    if (busy) return;
    setBusy(true);
    try {
      await declineAlignment(items.map((i) => i.activity.externalId));
    } finally {
      setBusy(false);
    }
  }
  return { busy, approve, decline };
}


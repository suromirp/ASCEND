// ASCEND: what the watch said about last night, for the morning check-in.
// Reads the cached sleep, resting heart rate and HRV (storage/wellness.ts) and
// follows the background fetch: the check-in is on screen before the fetch of
// a fresh boot has finished, and the lines appear when it has.

import { useEffect, useMemo, useState } from 'react';
import type { RecoveryMetric } from '../models/metrics';
import { todayWellness, type WellnessReading } from '../engine/wellnessCheck';
import { onWatchChange } from '../storage/externalActivities';
import { getRecoveryMetrics } from '../storage/wellness';

export function useTodayWellness(today: string): WellnessReading | undefined {
  const [metrics, setMetrics] = useState<RecoveryMetric[]>([]);
  useEffect(() => {
    let alive = true;
    const load = () => void getRecoveryMetrics().then((m) => alive && setMetrics(m)).catch(() => undefined);
    load();
    const stop = onWatchChange(load);
    return () => {
      alive = false;
      stop();
    };
  }, []);
  return useMemo(() => todayWellness(today, metrics), [today, metrics]);
}

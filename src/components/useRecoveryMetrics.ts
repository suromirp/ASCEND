// ASCEND: de ochtendgetallen van het horloge (slaap, rusthartslag, HRV) zoals ze zijn
// opgeslagen, voor "Wat speelde er". Wat je bij de koppeling uitzette blijft eruit, net als in
// de ochtendkaart (useWellness.ts). Volgt de achtergrond-ophaling.

import { useEffect, useState } from 'react';
import type { RecoveryMetric } from '../models/metrics';
import { filterRecovery } from '../engine/watchUse';
import { getWatchState, onWatchChange } from '../storage/externalActivities';
import { getRecoveryMetrics } from '../storage/wellness';

export function useRecoveryMetrics(): RecoveryMetric[] {
  const [metrics, setMetrics] = useState<RecoveryMetric[]>([]);
  useEffect(() => {
    let alive = true;
    const load = () =>
      void Promise.all([getRecoveryMetrics(), getWatchState()])
        .then(([m, state]) => {
          if (alive) setMetrics(filterRecovery(m, state.use));
        })
        .catch(() => undefined);
    load();
    const stop = onWatchChange(load);
    return () => {
      alive = false;
      stop();
    };
  }, []);
  return metrics;
}

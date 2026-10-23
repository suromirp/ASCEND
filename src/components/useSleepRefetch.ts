// ASCEND: komt de app in de ochtend weer in beeld en mist de slaap van vandaag nog, dan wordt
// er opnieuw opgehaald (engine/sleepRefetch.ts). Alleen op visibilitychange, nooit bij het
// opstarten, en één controle tegelijk; de ophaalronde zelf houdt de grens van 15 minuten aan.

import { useEffect } from 'react';
import { shouldRefetchSleep } from '../engine/sleepRefetch';
import { filterRecovery } from '../engine/watchUse';
import { todayWellness } from '../engine/wellnessCheck';
import { getConnection, getWatchState, syncWatchActivities } from '../storage/externalActivities';
import { getRecoveryMetrics } from '../storage/wellness';
import { todayISO } from '../utils/dates';

let busy = false;

export function useSleepRefetch(): void {
  useEffect(() => {
    const check = async () => {
      if (document.visibilityState !== 'visible' || busy) return;
      busy = true;
      try {
        const [connection, state, metrics] = await Promise.all([getConnection(), getWatchState(), getRecoveryMetrics()]);
        const reading = todayWellness(todayISO(), filterRecovery(metrics, state.use));
        const due = shouldRefetchSleep({
          now: new Date(),
          linked: !!connection,
          sleepOn: state.use.sleep,
          hasSleepToday: !!reading?.lines.some((l) => l.key === 'sleep'),
          fetchedAt: state.fetchedAt,
          busy: false,
        });
        if (due) await syncWatchActivities();
      } catch {
        // Een mislukte ronde is geen ramp: de volgende keer opnieuw.
      } finally {
        busy = false;
      }
    };
    const handler = () => void check();
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);
}

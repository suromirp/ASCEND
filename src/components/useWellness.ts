// ASCEND: what the watch said about last night, for the morning check-in.
// Reads the cached sleep, resting heart rate and HRV (storage/wellness.ts) and
// follows the background fetch: the check-in is on screen before the fetch of
// a fresh boot has finished, and the lines appear when it has.

import { useEffect, useMemo, useState } from 'react';
import type { RecoveryMetric } from '../models/metrics';
import { todayWellness, type WellnessReading } from '../engine/wellnessCheck';
import { filterRecovery } from '../engine/watchUse';
import { excludedMornings as excludedMorningsOf } from '../engine/influence';
import { getConnection, getWatchState, onWatchChange } from '../storage/externalActivities';
import { getRecoveryMetrics } from '../storage/wellness';
import { useAppData } from '../state/AppDataContext';

// `linked`: a watch is linked; `sleepOn`: sleep is switched on for it. Together
// they make "no sleep from your watch" true to say. Without a link the morning
// card stays quiet about the watch.
export function useTodayWatch(today: string): { reading: WellnessReading | undefined; linked: boolean; sleepOn: boolean } {
  const [metrics, setMetrics] = useState<RecoveryMetric[]>([]);
  const [linked, setLinked] = useState(false);
  const [sleepOn, setSleepOn] = useState(true);
  useEffect(() => {
    let alive = true;
    // What is switched off on the link screen is left out here too, so it is
    // not shown and not used, whatever is still stored.
    const load = () =>
      void Promise.all([getRecoveryMetrics(), getWatchState(), getConnection()])
        .then(([m, state, connection]) => {
          if (!alive) return;
          setMetrics(filterRecovery(m, state.use));
          setLinked(!!connection);
          setSleepOn(state.use.sleep);
        })
        .catch(() => undefined);
    load();
    const stop = onWatchChange(load);
    return () => {
      alive = false;
      stop();
    };
  }, []);
  // Een korte nacht wordt een vraag en jouw oordeel telt mee (engine/shortNight.ts).
  const { settings } = useAppData();
  const ask = settings.askShortNight !== false;
  const judgments = settings.nightJudgments;
  // "Deze nacht niet meetellen" (engine/influence.ts): out of your averages of resting heart rate and HRV.
  const excludedMornings = useMemo(() => excludedMorningsOf(settings.influences), [settings.influences]);
  const reading = useMemo(() => todayWellness(today, metrics, { ask, judgments, excludedMornings }), [today, metrics, ask, judgments, excludedMornings]);
  return { reading, linked, sleepOn };
}

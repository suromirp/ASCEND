// ASCEND: the loopinzicht of one stored training, for the screens that show it.

import { useEffect, useMemo, useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import { useLegFatigueInputs } from './LegFatigueCard';
import { runInsight, type RunInsight, type ShownInsight } from '../engine/runInsight';
import { getWatchState, onWatchChange } from '../storage/externalActivities';
import { getShownInsights, recordShownInsights } from '../storage/runInsightShown';
import { detailsWanted } from '../engine/watchUse';
import { todayISO } from '../utils/dates';
import type { SessionLog } from '../models/training';

// The switch "Details van loopjes en tochten" and the trainings it needs. Until it
// has been read it counts as off, so nothing flashes.
export function useDetailsOn(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let alive = true;
    const load = () => void getWatchState().then((s) => alive && setOn(detailsWanted(s.use))).catch(() => undefined);
    load();
    const stop = onWatchChange(load);
    return () => {
      alive = false;
      stop();
    };
  }, []);
  return on;
}

// What was shown after earlier trainings, for the brake. Undefined until read.
function useShown(): ShownInsight[] | undefined {
  const [shown, setShown] = useState<ShownInsight[] | undefined>();
  useEffect(() => {
    let alive = true;
    void getShownInsights().then((s) => alive && setShown(s)).catch(() => alive && setShown([]));
    return () => {
      alive = false;
    };
  }, []);
  return shown;
}

export function useRunInsight(logId: string | undefined, options: { brake?: boolean } = {}): { log?: SessionLog; insight?: RunInsight } {
  const { sessionLogs, templates, program, settings } = useAppData();
  const legs = useLegFatigueInputs();
  const detailsOn = useDetailsOn();
  const shown = useShown();
  const brake = options.brake !== false;
  const log = useMemo(() => sessionLogs.find((l) => l.id === logId), [sessionLogs, logId]);
  const insight = useMemo(() => {
    if (!log || !log.detail || (brake && shown === undefined)) return undefined;
    return runInsight({
      log, logs: sessionLogs, templates, program, hr: settings.heartRate, legs,
      settings: settings.runInsight, detailsOn, shown: brake ? shown : undefined, today: todayISO(),
    });
  }, [log, sessionLogs, templates, program, settings.heartRate, settings.runInsight, legs, detailsOn, shown, brake]);

  // What the card showed is remembered, so the same line does not come back
  // right away after the next training.
  const key = insight ? [insight.better, insight.watch, insight.fact].filter(Boolean).map((l) => `${l!.topic}:${l!.tone}`).join(',') : '';
  useEffect(() => {
    if (!brake || !log || !insight || !key) return;
    const lines = [insight.better, insight.watch, insight.fact].filter((l): l is NonNullable<typeof l> => !!l);
    void recordShownInsights(log.id, lines, todayISO()).catch(() => undefined);
    // The record is keyed on what was shown, not on every recompute.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, log?.id, brake]);

  return { log, insight };
}

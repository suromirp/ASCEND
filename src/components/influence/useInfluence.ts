// "Wat speelde er": de haakjes tussen de schermen en engine/influence.ts. Geen rekenwerk
// hier: de hooks halen op wat de engine nodig heeft en geven het resultaat terug.

import { useEffect, useMemo, useState } from 'react';
import { useAppData } from '../../state/AppDataContext';
import { useDetailsOn } from '../useRunInsight';
import { useLegFatigueInputs } from '../LegFatigueCard';
import { fatigueEvents } from '../../engine/legFatigue';
import { resolveRunInsight } from '../../engine/runInsightSettings';
import { filterRecovery } from '../../engine/watchUse';
import { getRecoveryMetrics } from '../../storage/wellness';
import { getWatchState, onWatchChange } from '../../storage/externalActivities';
import { excludedLogIds, heartRateDeviation, knownFacts, type FactTarget, type HeartRateDeviation, type InfluenceCause, type KnownFact } from '../../engine/influence';
import { logSport } from '../../engine/sports';
import type { ComparisonContext } from '../../engine/runComparison';
import type { RecoveryMetric } from '../../models/metrics';
import type { SessionLog } from '../../models/training';

// The set of trainings that do not count for heart rate. Kept on a key of the ids, so a change that
// does not touch the exclusion (a reason, a seen mark) does not make every list work again.
export function useExcludedLogIds(): ReadonlySet<string> {
  const { settings } = useAppData();
  const key = useMemo(() => [...excludedLogIds(settings.influences)].sort().join('|'), [settings.influences]);
  return useMemo(() => new Set(key ? key.split('|') : []), [key]);
}

// The same material as the loopinzicht: the same earlier runs, with the trainings you set to
// "Niet meetellen voor hartslag" left out of the comparison.
function useComparisonContext(): ComparisonContext {
  const { sessionLogs, templates, program, settings } = useAppData();
  const legs = useLegFatigueInputs();
  const events = useMemo(() => fatigueEvents(legs), [legs]);
  const excluded = useExcludedLogIds();
  const chestStrap = resolveRunInsight(settings.runInsight).chestStrap;
  return useMemo(
    () => ({ logs: sessionLogs, templates, program, hr: settings.heartRate, legs, chestStrap, excludedLogIds: excluded, events }),
    [sessionLogs, templates, program, settings.heartRate, legs, chestStrap, excluded, events],
  );
}

// Per training the heart rate that stands out, for the lists (only runs with a profile are looked at).
export function useDeviations(logs: readonly SessionLog[]): ReadonlyMap<string, HeartRateDeviation> {
  const ctx = useComparisonContext();
  const detailsOn = useDetailsOn();
  return useMemo(() => {
    const map = new Map<string, HeartRateDeviation>();
    for (const log of logs) {
      if (!log.detail || logSport(log) !== 'running') continue;
      const d = heartRateDeviation(log, ctx, detailsOn);
      if (d) map.set(log.id, d);
    }
    return map;
  }, [logs, ctx, detailsOn]);
}

export function useDeviation(log: SessionLog | undefined): HeartRateDeviation | undefined {
  const list = useMemo(() => (log ? [log] : []), [log]);
  const map = useDeviations(list);
  return log ? map.get(log.id) : undefined;
}

// The nights the watch gave, as far as it is switched on for them (the same filter as the morning card).
function useRecoveryRecords(): RecoveryMetric[] {
  const [records, setRecords] = useState<RecoveryMetric[]>([]);
  useEffect(() => {
    let alive = true;
    const load = () =>
      void Promise.all([getRecoveryMetrics(), getWatchState()])
        .then(([metrics, state]) => alive && setRecords(filterRecovery(metrics, state.use)))
        .catch(() => undefined);
    load();
    const stop = onWatchChange(load);
    return () => {
      alive = false;
      stop();
    };
  }, []);
  return records;
}

export function useKnownFacts(target: FactTarget | undefined): KnownFact[] {
  const { sessionLogs, templates, settings } = useAppData();
  const recovery = useRecoveryRecords();
  const cause: InfluenceCause = settings.influenceCause ?? 'patroon';
  const targetLog = target?.kind === 'log' ? target.log : undefined;
  const targetDate = target?.kind === 'day' ? target.date : undefined;
  return useMemo(() => {
    const t: FactTarget | undefined = targetLog ? { kind: 'log', log: targetLog } : targetDate ? { kind: 'day', date: targetDate } : undefined;
    if (!t) return [];
    return knownFacts({ target: t, logs: sessionLogs, templates, recovery, illness: settings.illnessEpisodes, judgments: settings.nightJudgments, cause });
  }, [targetLog, targetDate, sessionLogs, templates, recovery, settings.illnessEpisodes, settings.nightJudgments, cause]);
}

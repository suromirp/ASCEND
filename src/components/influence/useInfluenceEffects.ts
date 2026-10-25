// ASCEND: de uitkomsten van "Wat speelde er" voor de kaart op Je stand en het blad.
// Leest alleen (settings.influences); schrijft niets. Alle rekenwerk staat in
// engine/influenceEffects.ts.

import { useMemo } from 'react';
import { useAppData } from '../../state/AppDataContext';
import { resolveRunInsight } from '../../engine/runInsightSettings';
import { influenceEffects, looksLike, type InfluenceMeasure, type LooksLike, type ReasonEffect } from '../../engine/influenceEffects';
import type { InfluenceEntry } from '../../models/influence';
import { useLegFatigueInputs } from '../LegFatigueCard';
import { useDetailsOn } from '../useRunInsight';
import { useRecoveryMetrics } from '../useRecoveryMetrics';

const NONE: InfluenceEntry[] = [];

export function useInfluenceEffects(): { entries: InfluenceEntry[]; effects: ReasonEffect[] } {
  const { settings, sessionLogs, templates, program } = useAppData();
  const metrics = useRecoveryMetrics();
  const legs = useLegFatigueInputs();
  const detailsOn = useDetailsOn();
  const entries = settings.influences ?? NONE;
  const chestStrap = resolveRunInsight(settings.runInsight).chestStrap;
  const effects = useMemo(
    () => (entries.some((e) => e.reasons.length > 0)
      ? influenceEffects({
        entries,
        metrics,
        logs: sessionLogs,
        templates,
        program,
        run: detailsOn ? { hr: settings.heartRate, legs, chestStrap } : undefined,
      })
      : []),
    [entries, metrics, sessionLogs, templates, program, detailsOn, settings.heartRate, legs, chestStrap],
  );
  return { entries, effects };
}

// "Lijkt op" voor één dag en meting, alleen als de instelling Mogelijke oorzaak op Ook je patroon
// staat; de voorwaarden staan in engine/influenceEffects.ts#looksLike.
export function useLooksLike(date: string, measure: InfluenceMeasure): LooksLike | undefined {
  const { settings, sessionLogs, templates, program } = useAppData();
  const metrics = useRecoveryMetrics();
  const legs = useLegFatigueInputs();
  const detailsOn = useDetailsOn();
  const entries = settings.influences ?? NONE;
  const cause = settings.influenceCause;
  const chestStrap = resolveRunInsight(settings.runInsight).chestStrap;
  return useMemo(
    () => (entries.some((e) => e.reasons.length > 0) && cause !== 'uit' && cause !== 'weet'
      ? looksLike({
        entries,
        metrics,
        logs: sessionLogs,
        templates,
        program,
        run: detailsOn ? { hr: settings.heartRate, legs, chestStrap } : undefined,
        cause,
        measure,
        date,
      })
      : undefined),
    [entries, cause, metrics, sessionLogs, templates, program, detailsOn, settings.heartRate, legs, chestStrap, measure, date],
  );
}

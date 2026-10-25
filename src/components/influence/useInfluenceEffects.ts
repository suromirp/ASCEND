// ASCEND: de uitkomsten van "Wat speelde er" voor de kaart op Je stand en het blad.
// Leest alleen (settings.influences); schrijft niets. Alle rekenwerk staat in
// engine/influenceEffects.ts.

import { useMemo } from 'react';
import { useAppData } from '../../state/AppDataContext';
import { resolveRunInsight } from '../../engine/runInsightSettings';
import { createFactsCache } from '../../engine/factsCache';
import { influenceEffects, looksLike, type InfluenceMeasure, type LooksLike, type ReasonEffect } from '../../engine/influenceEffects';
import type { InfluenceEntry } from '../../models/influence';
import type { RecoveryMetric } from '../../models/metrics';
import { useLegFatigueInputs } from '../LegFatigueCard';
import { useDetailsOn } from '../useRunInsight';
import { useRecoveryMetrics } from '../useRecoveryMetrics';

const NONE: InfluenceEntry[] = [];

// What ASCEND knows by itself (a heavy leg day, warmth, a short night, illness) as notes that are
// never stored. They count in the overview whatever "Mogelijke oorzaak" says. The 400 days are
// worked out once, shared by the card on Je stand and the sheet of a training, and again only when
// the content changes (engine/factsCache.ts), not when a list is merely rebuilt.
const factsMemo = createFactsCache();

function useFactEntries(metrics: RecoveryMetric[]): InfluenceEntry[] {
  const { settings, sessionLogs, templates } = useAppData();
  return factsMemo.get({ logs: sessionLogs, templates, recovery: metrics, illness: settings.illnessEpisodes, judgments: settings.nightJudgments });
}

// `entries` are your own notes, `all` your notes plus the facts.
export function useInfluenceEffects(): { entries: InfluenceEntry[]; all: InfluenceEntry[]; effects: ReasonEffect[] } {
  const { settings, sessionLogs, templates, program } = useAppData();
  const metrics = useRecoveryMetrics();
  const facts = useFactEntries(metrics);
  const legs = useLegFatigueInputs();
  const detailsOn = useDetailsOn();
  const entries = settings.influences ?? NONE;
  const chestStrap = resolveRunInsight(settings.runInsight).chestStrap;
  const all = useMemo(() => [...entries, ...facts], [entries, facts]);
  const effects = useMemo(
    () => (all.some((e) => e.reasons.length > 0)
      ? influenceEffects({
        entries,
        facts,
        illness: settings.illnessEpisodes,
        metrics,
        nightJudgments: settings.nightJudgments,
        logs: sessionLogs,
        templates,
        program,
        run: detailsOn ? { hr: settings.heartRate, legs, chestStrap } : undefined,
      })
      : []),
    [all, entries, facts, settings.illnessEpisodes, metrics, settings.nightJudgments, sessionLogs, templates, program, detailsOn, settings.heartRate, legs, chestStrap],
  );
  return { entries, all, effects };
}

// "Lijkt op" voor één dag en meting, alleen als de instelling Mogelijke oorzaak op Ook je patroon
// staat; de voorwaarden staan in engine/influenceEffects.ts#looksLike.
export function useLooksLike(date: string, measure: InfluenceMeasure): LooksLike | undefined {
  const { settings, sessionLogs, templates, program } = useAppData();
  const metrics = useRecoveryMetrics();
  const legs = useLegFatigueInputs();
  const detailsOn = useDetailsOn();
  const entries = settings.influences ?? NONE;
  const facts = useFactEntries(metrics);
  const cause = settings.influenceCause;
  const chestStrap = resolveRunInsight(settings.runInsight).chestStrap;
  return useMemo(
    () => ((entries.some((e) => e.reasons.length > 0) || facts.length > 0) && cause !== 'uit' && cause !== 'weet'
      ? looksLike({
        entries,
        facts,
        illness: settings.illnessEpisodes,
        metrics,
        nightJudgments: settings.nightJudgments,
        logs: sessionLogs,
        templates,
        program,
        run: detailsOn ? { hr: settings.heartRate, legs, chestStrap } : undefined,
        cause,
        measure,
        date,
      })
      : undefined),
    [entries, facts, settings.illnessEpisodes, cause, metrics, settings.nightJudgments, sessionLogs, templates, program, detailsOn, settings.heartRate, legs, chestStrap, measure, date],
  );
}

// De korte test in het koppelvoorstel (engine/linkShortTest.ts, backlog I-95): leest de bewaarde reeksen van
// de rustige lopen van die week (alleen lezen) en vraagt de engine of de koppeling verandert welke test telt.
// Drie standen: bezig (de kaart houdt zijn knoppen uit), de zin, of niets. Bezig is het alleen als er iets
// kan verschuiven, en nooit langer dan de grens van de lezing (4 s); een fout of de grens geeft niets.
// Geen rekenwerk hier.

import { useMemo } from 'react';
import type { SessionLog } from '../models/training';
import { useAppData } from '../state/AppDataContext';
import { linkShortTestLogIds, linkShortTestState, type LinkShortTestState } from '../engine/linkShortTest';
import { resolveNoStrapTest } from '../engine/thresholdEstimate';
import { SHORT_TEST_RUN_ID, shortTestOn } from '../engine/shortTest';
import { useShortTestStreams } from './useShortTestStreams';

export function useLinkShortTest(log: SessionLog | undefined, sessionId: string | undefined, today: string): LinkShortTestState {
  const { sessionLogs, settings, plannedSessions, templates } = useAppData();
  const series = settings.shortTestSeries;
  const runName = templates.find((t) => t.id === SHORT_TEST_RUN_ID)?.name ?? 'Rustige loop';
  const ids = useMemo(() => (log && sessionId ? linkShortTestLogIds({ log, sessionId, logs: sessionLogs, series }).join(',') : ''), [log, sessionId, sessionLogs, series]);
  const read = useShortTestStreams(ids);
  return useMemo(
    () => linkShortTestState(
      log && sessionId ? { log, sessionId, logs: sessionLogs, series, noStrap: resolveNoStrapTest(settings.noStrapTest), strapWorn: settings.strapWorn, plan: { sessions: plannedSessions, name: runName, on: shortTestOn(settings.shortTest) } } : undefined,
      read,
      today,
    ),
    [log, sessionId, read, sessionLogs, series, settings.noStrapTest, settings.strapWorn, settings.shortTest, plannedSessions, runName, today],
  );
}

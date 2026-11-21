// De korte test in het koppelvoorstel (engine/linkShortTest.ts, backlog I-95): leest de bewaarde reeksen van
// de rustige lopen van die week (alleen lezen) en vraagt de engine of de koppeling verandert welke test telt.
// Drie standen: bezig (de kaart houdt zijn knoppen uit), de zin, of niets. Bezig is het alleen als er iets
// kan verschuiven, en nooit langer dan de grens van de lezing (4 s); een fout of de grens geeft niets.
// Geen rekenwerk hier.

import { useEffect, useMemo, useState } from 'react';
import type { SessionLog } from '../models/training';
import { useAppData } from '../state/AppDataContext';
import { linkShortTestLogIds, linkShortTestState, type LinkShortTestRead, type LinkShortTestState } from '../engine/linkShortTest';
import { resolveNoStrapTest } from '../engine/thresholdEstimate';
import { streamsForLogs } from '../storage/testStreams';

export function useLinkShortTest(log: SessionLog | undefined, sessionId: string | undefined, today: string): LinkShortTestState {
  const { sessionLogs, settings } = useAppData();
  const series = settings.shortTestSeries;
  const ids = useMemo(() => (log && sessionId ? linkShortTestLogIds({ log, sessionId, logs: sessionLogs, series }).join(',') : ''), [log, sessionId, sessionLogs, series]);
  const [read, setRead] = useState<({ ids: string } & LinkShortTestRead) | undefined>(undefined);
  useEffect(() => {
    if (!ids) return;
    let live = true;
    const wanted = new Set(ids.split(','));
    // streamsForLogs heeft zijn eigen grens in tijd; ook een fout sluit de lezing af, zodat de knoppen aangaan.
    void streamsForLogs(sessionLogs.filter((l) => wanted.has(l.id)))
      .then(({ map, complete }) => ({ streams: map, complete }))
      .catch(() => ({ streams: new Map(), complete: false }))
      .then((done) => {
        if (live) setRead({ ids, ...done });
      });
    return () => {
      live = false;
    };
    // Alleen opnieuw lezen als de lopen veranderen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);
  return useMemo(
    () => linkShortTestState(
      log && sessionId ? { log, sessionId, logs: sessionLogs, series, noStrap: resolveNoStrapTest(settings.noStrapTest), strapWorn: settings.strapWorn } : undefined,
      read && read.ids === ids ? read : undefined,
      today,
    ),
    [log, sessionId, ids, read, sessionLogs, series, settings.noStrapTest, settings.strapWorn, today],
  );
}

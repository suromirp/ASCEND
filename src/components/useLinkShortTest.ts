// De zin over de korte test in het koppelvoorstel (engine/linkShortTest.ts, backlog I-95): leest de bewaarde
// reeksen van de rustige lopen van die week (alleen lezen) en vraagt de engine of de koppeling verandert
// welke test telt. Tot de reeksen er zijn, of als ze niet op tijd of niet allemaal gelezen zijn, is er geen zin.
// Geen rekenwerk hier.

import { useEffect, useMemo, useState } from 'react';
import type { SessionLog } from '../models/training';
import type { StreamSet } from '../models/activityDetail';
import { useAppData } from '../state/AppDataContext';
import { linkShortTestLine, linkShortTestLogIds, linkShortTestShift } from '../engine/linkShortTest';
import { resolveNoStrapTest } from '../engine/thresholdEstimate';
import { streamsForLogs } from '../storage/testStreams';

export function useLinkShortTest(log: SessionLog | undefined, sessionId: string | undefined, today: string): string | undefined {
  const { sessionLogs, settings } = useAppData();
  const series = settings.shortTestSeries;
  const ids = useMemo(() => (log && sessionId ? linkShortTestLogIds({ log, sessionId, logs: sessionLogs, series }).join(',') : ''), [log, sessionId, sessionLogs, series]);
  const [streams, setStreams] = useState<{ ids: string; map: Map<string, StreamSet> } | undefined>(undefined);
  useEffect(() => {
    if (!ids) return;
    let live = true;
    const wanted = new Set(ids.split(','));
    void streamsForLogs(sessionLogs.filter((l) => wanted.has(l.id))).then(({ map, complete }) => {
      if (live && complete) setStreams({ ids, map });
    });
    return () => {
      live = false;
    };
    // Alleen opnieuw lezen als de lopen veranderen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);
  return useMemo(() => {
    if (!log || !sessionId || !ids || !streams || streams.ids !== ids) return undefined;
    const shift = linkShortTestShift({ log, sessionId, logs: sessionLogs, series, streams: streams.map, noStrap: resolveNoStrapTest(settings.noStrapTest), strapWorn: settings.strapWorn });
    return linkShortTestLine(shift, today);
  }, [log, sessionId, ids, streams, sessionLogs, series, settings.noStrapTest, settings.strapWorn, today]);
}

// De bewaarde reeksen van de lopen voor de korte test, één keer geladen voor het logblad (ShortTestCard) en
// het koppelvoorstel (useLinkShortTest). Alleen lezen. streamsForLogs heeft zijn eigen grens in tijd; ook een
// fout sluit de lezing af (`complete: false`), zodat niemand blijft wachten. Undefined zolang hij loopt, of
// als de reeks lopen (`ids`, komma's) een andere is dan die gelezen werd. Geen rekenwerk hier.

import { useEffect, useState } from 'react';
import type { StreamSet } from '../models/activityDetail';
import { useAppData } from '../state/AppDataContext';
import { streamsForLogs } from '../storage/testStreams';

export interface ShortTestStreams {
  ids: string;
  streams: ReadonlyMap<string, StreamSet>;
  complete: boolean;
}

export function useShortTestStreams(ids: string): ShortTestStreams | undefined {
  const { sessionLogs } = useAppData();
  const [read, setRead] = useState<ShortTestStreams | undefined>(undefined);
  useEffect(() => {
    if (!ids) return;
    let live = true;
    const wanted = new Set(ids.split(','));
    void streamsForLogs(sessionLogs.filter((l) => wanted.has(l.id)))
      .then(({ map, complete }) => ({ streams: map as ReadonlyMap<string, StreamSet>, complete }))
      .catch(() => ({ streams: new Map<string, StreamSet>() as ReadonlyMap<string, StreamSet>, complete: false }))
      .then((done) => {
        if (live) setRead({ ids, ...done });
      });
    return () => {
      live = false;
    };
    // Alleen opnieuw lezen als de lopen veranderen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);
  return read && read.ids === ids ? read : undefined;
}

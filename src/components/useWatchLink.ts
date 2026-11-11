// ASCEND: de koppeling met je horloge voor de stand van de Briefing en de knop op Vandaag
// (engine/briefing.ts#missionButton, spoor 5 en 6). Leest storage/sourceWatch.ts#readWatchLink met een
// grens in tijd; zolang er niets gelezen is, of bij een fout of een trage opslag, is de koppeling
// onbekend en kiest de engine de veilige kant: Gedaan en Zelf invullen. Het laatst gelezene blijft in
// het geheugen, zodat een volgende kaart of scherm meteen de goede knop heeft. Leest opnieuw als er iets
// van je horloge binnenkomt of de koppeling verandert.

import { useEffect, useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import { readWatchLink } from '../storage/sourceWatch';
import { onWatchChange } from '../storage/externalActivities';
import { withTimeout } from '../utils/withTimeout';
import { todayISO } from '../utils/dates';
import type { BriefingInput } from '../engine/briefing';

const LINK_LIMIT_MS = 3000;

type Link = Pick<BriefingInput, 'watchLink' | 'watchSource'>;

let last: Link | undefined;

// Alleen voor tests: alsof de app net start.
export function resetWatchLinkCache(): void {
  last = undefined;
}

export function useWatchLink(): Link {
  const { sessionLogs } = useAppData();
  const [found, setFound] = useState<Link>(() => last ?? {});
  useEffect(() => {
    let alive = true;
    const load = () => {
      void withTimeout(readWatchLink(sessionLogs, todayISO()), LINK_LIMIT_MS).then(
        (r) => {
          last = { watchLink: r.link, watchSource: r.source };
          if (alive) setFound(last);
        },
        // Niet gelezen: wat er al stond blijft; was er niets, dan de veilige kant.
        () => undefined,
      );
    };
    load();
    const stop = onWatchChange(load);
    return () => {
      alive = false;
      stop();
    };
  }, [sessionLogs]);
  return found;
}

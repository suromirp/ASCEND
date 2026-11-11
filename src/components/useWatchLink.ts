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
import type { SessionLog } from '../models/training';

const LINK_LIMIT_MS = 3000;

type Link = Pick<BriefingInput, 'watchLink' | 'watchSource'>;

let last: Link | undefined;

// De laatst gelezen stand op dit toestel (localStorage), zodat een koude start niet eerst Gedaan en dan
// Briefing laat zien. Alleen de koppeling en de dagen, geen sleutel en geen logs: die komen van nu.
// Zonder bewaarde stand, of als de opslag niet leest: niets, en dan Gedaan, de veilige kant.
const STORE_KEY = 'ascend.briefingWatchLink';
type Stored = { link: NonNullable<Link['watchLink']>; source: Omit<NonNullable<Link['watchSource']>, 'logs' | 'today'> };

export function readStoredWatchLink(logs: readonly SessionLog[]): Link | undefined {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return undefined;
    const s = JSON.parse(raw) as Stored;
    if (!s?.link || typeof s.link.linked !== 'boolean' || !s.source || !Array.isArray(s.source.activityDays) || !Array.isArray(s.source.morningDays)) return undefined;
    return { watchLink: s.link, watchSource: { ...s.source, logs, today: todayISO() } };
  } catch {
    return undefined;
  }
}

export function storeWatchLink(link: Link | undefined): void {
  try {
    if (!link?.watchLink || !link.watchSource) {
      localStorage.removeItem(STORE_KEY);
      return;
    }
    const { logs: _logs, today: _today, ...source } = link.watchSource;
    localStorage.setItem(STORE_KEY, JSON.stringify({ link: link.watchLink, source } satisfies Stored));
  } catch {
    // Geen opslag: dan bij de volgende start eerst Gedaan.
  }
}

// Alleen voor tests: alsof de app net start.
export function resetWatchLinkCache(): void {
  last = undefined;
}

export function useWatchLink(): Link {
  const { sessionLogs } = useAppData();
  const [found, setFound] = useState<Link>(() => last ?? readStoredWatchLink(sessionLogs) ?? {});
  useEffect(() => {
    let alive = true;
    const load = () => {
      void withTimeout(readWatchLink(sessionLogs, todayISO()), LINK_LIMIT_MS).then(
        (r) => {
          last = { watchLink: r.link, watchSource: r.source };
          storeWatchLink(last);
          if (alive) setFound(last);
        },
        // Niet gelezen of te traag: de veilige kant, Gedaan en Zelf invullen.
        () => {
          last = undefined;
          storeWatchLink(undefined);
          if (alive) setFound({});
        },
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

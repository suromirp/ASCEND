// ASCEND: de stand van de kaart Nieuw begonnen (components/FreshStartCard.tsx, engine/freshStart.ts),
// los van de kaart zelf.

import { useEffect, useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import { MetaRepo } from '../storage/database';
import { shouldOfferRestore } from '../engine/freshStart';
import { todayISO } from '../utils/dates';

// De stand van de kaart, los van waar hij staat (engine/todayCards.ts): `shown` zegt of hij er is.
export function useFreshStart() {
  const { sessionLogs, settings } = useAppData();
  const [seededAt, setSeededAt] = useState<string | undefined>();
  const [importing, setImporting] = useState(false);
  useEffect(() => {
    void MetaRepo.get<string>('seededAt').then(setSeededAt);
  }, []);

  const show = shouldOfferRestore({
    seededAt,
    today: todayISO(),
    logCount: sessionLogs.length,
    lastExportedAt: settings.lastExportedAt,
    dismissedAt: settings.freshStartDismissedAt,
  });
  return { shown: show || importing, importing, setImporting };
}

export type FreshStartState = ReturnType<typeof useFreshStart>;

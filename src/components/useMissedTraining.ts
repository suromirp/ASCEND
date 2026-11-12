// ASCEND: de stand van de kaart Training die niet doorging (components/MissedTrainingCard.tsx,
// engine/missedTraining.ts), los van de kaart zelf.

import { useEffect, useMemo, useRef } from 'react';
import { useAppData } from '../state/AppDataContext';
import { planMissed, resolveMissedSettings } from '../engine/missedTraining';
import { todayISO } from '../utils/dates';
import { useTrainingPlaces } from './useTrainingPlaces';

// Wacht even tot de planning na het openen staat, zoals het vanzelf afvinken.
const AUTO_DELAY_MS = 1500;

// De stand van de kaart, los van waar hij staat: Vandaag vraagt of er een kaart is (engine/todayCards.ts) en
// zet hem op zijn plek. Zelf overslaan loopt hier, ook als de kaart onder de missie staat.
export function useMissedTraining() {
  const { plannedSessions, sessionLogs, templates, settings, advice, skipMissed, missedMemory: memory, rememberMissed } = useAppData();
  const today = todayISO();
  const autoRunning = useRef(false);

  const places = useTrainingPlaces();
  const missedSettings = resolveMissedSettings(settings);
  // Wat al in een advies op Vandaag staat (een gemiste training inhalen of laten vervallen), krijgt geen tweede kaart.
  const busyIds = useMemo(
    () => new Set(advice.flatMap((a) => [a.proposal, ...(a.options?.map((o) => o.proposal) ?? [])]).flatMap((p) => p?.changes ?? []).map((c) => c.plannedSessionId).filter((id): id is string => !!id)),
    [advice],
  );
  const plan = useMemo(
    () => (memory ? planMissed({ plannedSessions, logs: sessionLogs, templates, today, settings: missedSettings, memory, busy: busyIds, illnessEpisodes: settings.illnessEpisodes, places }) : undefined),
    // missedSettings komt uit settings.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [memory, plannedSessions, sessionLogs, templates, today, settings, busyIds, places],
  );

  // Zelf overslaan: eerst overslaan, met de melding; pas als dat lukte onthouden dat ASCEND het deed (dan komt
  // het na Ongedaan maken niet terug).
  const autoIds = plan?.autoSkip.map((m) => m.session.id).join(',') ?? '';
  useEffect(() => {
    if (!autoIds || autoRunning.current) return;
    const ids = autoIds.split(',');
    const timer = setTimeout(() => {
      autoRunning.current = true;
      void skipMissed(ids, 'auto')
        .then((n) => {
          if (n > 0) rememberMissed((m) => ({ ...m, auto: [...m.auto, ...ids] }));
        })
        .catch(() => undefined)
        .finally(() => {
          autoRunning.current = false;
        });
    }, AUTO_DELAY_MS);
    return () => clearTimeout(timer);
  }, [autoIds, skipMissed, rememberMissed]);

  return { item: plan?.item, missedSettings };
}

export type MissedTrainingState = ReturnType<typeof useMissedTraining>;

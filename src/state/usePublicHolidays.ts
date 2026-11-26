// ASCEND: de feestdagen voor een scherm (engine/publicHolidays.ts, storage/publicHolidays.ts). Leest wat er al staat,
// haalt alleen op wat nog ontbreekt (eens per jaar per land, in december ook het volgende jaar) en geeft de uitkomst
// door, zodat een mislukte poging zichtbaar is. Staat Feestdagen voorstellen uit, dan wordt er niets gevraagd.
// Opnieuw proberen heeft dezelfde tijdsgrens als de eerste poging (storage/publicHolidays.ts#HOLIDAYS_LIMIT_MS).

import { useCallback, useEffect, useState } from 'react';
import type { AppSettings } from '../storage/database';
import { refreshPublicHolidays, type HolidayRefresh } from '../storage/publicHolidays';
import { resolveHolidayCountry, resolveHolidayOffers } from '../engine/publicHolidays';

export interface PublicHolidaysState extends HolidayRefresh {
  enabled: boolean;
  country: string;
  // Er loopt een poging voor deze keuze.
  busy: boolean;
  retry: () => void;
}

export function usePublicHolidays(settings: Pick<AppSettings, 'publicHolidayOffers' | 'publicHolidayCountry'>): PublicHolidaysState {
  const enabled = resolveHolidayOffers(settings.publicHolidayOffers);
  const country = resolveHolidayCountry(settings.publicHolidayCountry);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ choice: string; attempt: number; refresh: HolidayRefresh } | null>(null);
  const choice = `${enabled ? 'on' : 'off'}:${country}`;

  useEffect(() => {
    let live = true;
    void refreshPublicHolidays({ enabled, country }).then((refresh) => {
      if (live) setResult({ choice: `${enabled ? 'on' : 'off'}:${country}`, attempt, refresh });
    });
    return () => { live = false; };
  }, [enabled, country, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  // Wat bij een ander land of een uitgezette schakelaar hoorde, telt niet meer; tijdens Opnieuw proberen blijft
  // de vorige uitkomst van dezelfde keuze staan.
  const mine = result && result.choice === choice ? result : null;
  const shown: HolidayRefresh = !enabled ? { status: 'off', holidays: [] } : mine ? mine.refresh : { status: 'ready', holidays: [] };
  return { ...shown, enabled, country, busy: enabled && (!mine || mine.attempt !== attempt), retry };
}

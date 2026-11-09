// ASCEND: de weerwaarschuwingen en het lawinegevaar voor Vandaag (engine/weatherWarnings.ts,
// engine/avalanche.ts). Haalt alleen op als het ertoe doet: de instelling staat aan, er is een tocht of
// een lange training buiten vandaag of morgen, met een plek, en de telefoon is online. Elke vraag heeft
// een grens in tijd (storage/weatherWarnings.ts, storage/avalanche.ts); zonder antwoord is er gewoon
// geen regel en geen foutmelding, en Vandaag blijft staan zoals het was.

import { useEffect, useMemo, useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import { warningLines, warningTargets, type WarningTarget } from '../engine/weatherWarnings';
import { avalancheLine, avalancheTarget, type AvalancheTarget } from '../engine/avalanche';
import { weatherFollowsLocation } from '../engine/locationSetting';
import { refreshWarningForecast } from '../storage/weatherWarnings';
import { refreshAvalancheLevel } from '../storage/avalanche';
import { todayISO } from '../utils/dates';

export interface WeatherWarningsState {
  lines: string[];
  avalanche?: string;
  // Wanneer de oudste gebruikte voorspelling is opgehaald, voor "bijgewerkt om".
  fetchedAt?: string;
  shown: boolean;
}

export function useWeatherWarnings(): WeatherWarningsState {
  const { leavePeriods, plannedSessions, sessionLogs, templateById, settings } = useAppData();
  const today = todayISO();
  const follows = weatherFollowsLocation(settings);
  const place = settings.homeLocation;
  const warningsOn = settings.weatherWarnings !== false;
  const avalancheOn = settings.avalancheBulletin !== false;

  const targets = useMemo<WarningTarget[]>(
    () => (warningsOn ? warningTargets({ periods: leavePeriods, sessions: plannedSessions, logs: sessionLogs, templateById, today, weatherPlace: place, followsLocation: follows }) : []),
    [warningsOn, leavePeriods, plannedSessions, sessionLogs, templateById, today, place, follows],
  );
  const snow = useMemo<AvalancheTarget | undefined>(() => (avalancheOn ? avalancheTarget(leavePeriods, today, place, follows) : undefined), [avalancheOn, leavePeriods, today, place, follows]);
  // Een vaste sleutel, zodat het ophalen alleen opnieuw gaat als doel of plek echt verandert.
  const key = JSON.stringify([targets, snow ?? null]);

  const [state, setState] = useState<{ key: string; lines: string[]; avalanche?: string; fetchedAt?: string }>({ key: '', lines: [] });
  useEffect(() => {
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    const [wanted, snowTarget] = JSON.parse(key) as [WarningTarget[], AvalancheTarget | null];
    if (offline || (wanted.length === 0 && !snowTarget)) return;
    let alive = true;
    void (async () => {
      const lines: string[] = [];
      let fetchedAt: string | undefined;
      for (const t of wanted) {
        const f = await refreshWarningForecast(t.place);
        if (f && (!fetchedAt || f.fetchedAt < fetchedAt)) fetchedAt = f.fetchedAt;
        lines.push(...warningLines(f, t, new Date()));
      }
      const avalanche = snowTarget ? avalancheLine(await refreshAvalancheLevel(snowTarget.place, snowTarget.date), snowTarget) : undefined;
      if (alive) setState({ key, lines, ...(avalanche ? { avalanche } : {}), ...(lines.length > 0 && fetchedAt ? { fetchedAt } : {}) });
    })();
    return () => {
      alive = false;
    };
  }, [key]);

  // Een antwoord voor een ander doel telt niet meer: dan liever even niets dan een verkeerde dag.
  if (state.key !== key) return { lines: [], shown: false };
  return { lines: state.lines, avalanche: state.avalanche, fetchedAt: state.fetchedAt, shown: state.lines.length > 0 || !!state.avalanche };
}

// ASCEND: leest wat De avond ervoor toont (engine/eveningBefore.ts) uit de gegevens van de app. Voor de
// kaart op Vandaag en voor de melding. Het rekenen gebeurt in de engine; dit haalt alleen de bronnen op.

import { useEffect, useMemo, useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import { useWatchStatuses } from './useWatchStatus';
import { eveningBefore, resolveEveningBefore, tomorrowPrep, type EveningInput, type EveningTrainingView } from '../engine/eveningBefore';
import { showClothingAdvice, showWeatherLine } from '../engine/overviewSettings';
import { adjustFor } from '../engine/clothingFeedback';
import { templateSport } from '../engine/sports';
import { sunPlace } from '../engine/sun';
import { judgmentOptions, pacesFromLogs } from '../engine/testJudgment';
import { fuelOn } from '../engine/fuelOnTheGo';
import { loadBodyKg } from '../engine/weightTrend';
import { useTrainingPlaces } from './useTrainingPlaces';
import { usePlaceWeather } from './usePlaceWeather';
import { showPlaceWeather } from '../engine/overviewSettings';
import { eveningPlaceTarget, type StartPlaceChoices } from '../engine/startPlaceChoice';
import { routeShownFor } from '../engine/trainingPlace';
import { peekStartPlaceChoices, readStartPlaceChoices, subscribeStartPlaceChoices } from '../storage/startPlaceChoice';
import { getRouteStartPoint } from '../storage/routeStart';
import type { RoutePoint } from '../models/route';
import { addDays, toISODate } from '../utils/dates';
import { withTimeout } from '../utils/withTimeout';

// Hoe lang De avond ervoor wacht op de opslag voor de onthouden plek en Thuis; daarna het weer van huis.
const READ_LIMIT_MS = 5_000;

// De onthouden plekken van Start bij (storage/startPlaceChoice.ts) en de plek Thuis, en het weer van
// die plek voor de training van morgen. Zolang iets leest of laadt: het weer van huis, zonder plaatsnaam.
function useEveningPlaceWeather(now: Date): EveningInput['placeWeather'] {
  const { plannedSessions, templateById, settings } = useAppData();
  const trainingPlaces = useTrainingPlaces();
  const [choices, setChoices] = useState<StartPlaceChoices | undefined>(() => peekStartPlaceChoices());
  const [home, setHome] = useState<RoutePoint | null | undefined>();
  useEffect(() => {
    let alive = true;
    const read = () => void withTimeout(readStartPlaceChoices(), READ_LIMIT_MS).then((m) => alive && setChoices(m), () => undefined);
    read();
    void withTimeout(getRouteStartPoint(), READ_LIMIT_MS).then((p) => alive && setHome(p ?? null), () => alive && setHome(null));
    const stop = subscribeStartPlaceChoices(() => setChoices(peekStartPlaceChoices()));
    return () => {
      alive = false;
      stop();
    };
  }, []);
  const today = toISODate(now);
  const tomorrow = addDays(today, 1);
  const sessions = plannedSessions
    .filter((s) => s.scheduledDate === tomorrow && s.status !== 'skipped')
    .sort((a, b) => a.order - b.order)
    .map((s) => ({ id: s.id, date: s.scheduledDate, routeShown: routeShownFor(templateById.get(s.templateId), trainingPlaces?.[s.id]) }));
  const found = home === undefined ? undefined : eveningPlaceTarget({
    placeWeatherOn: showPlaceWeather(settings.overviews),
    rememberOn: settings.rememberStartPlace !== false,
    routeOn: settings.routeProposal !== false,
    sessions,
    choices,
    today,
    home: home ?? undefined,
    weatherHome: settings.homeLocation,
  });
  const state = usePlaceWeather(found?.target);
  if (!found || !state || state.status === 'loading') return undefined;
  return state.status === 'ok'
    ? { sessionId: found.sessionId, name: found.target.name, state: 'shown', forecast: state.forecast }
    : { sessionId: found.sessionId, name: found.target.name, state: 'failed' };
}

// De bronnen voor een moment: nu voor de kaart, het moment van de melding voor de melding.
export function useEveningInput(now: Date): EveningInput {
  const { plannedSessions, sessionLogs, templateById, program, leavePeriods, settings, weather } = useAppData();
  const { statusOf, ready } = useWatchStatuses();
  const trainingPlaces = useTrainingPlaces();
  const easyPace = useMemo(() => pacesFromLogs(sessionLogs, judgmentOptions(settings)).paces?.easy, [sessionLogs, settings]);
  const placeWeather = useEveningPlaceWeather(now);
  return {
    placeWeather,
    now,
    settings: resolveEveningBefore(settings),
    planned: plannedSessions,
    logs: sessionLogs,
    templateById,
    program,
    leavePeriods,
    illnessEpisodes: settings.illnessEpisodes,
    forecast: weather.forecast ?? undefined,
    weatherOn: showWeatherLine(settings.overviews),
    clothingOn: showClothingAdvice(settings.overviews),
    clothingAdjust: (t) => adjustFor(settings.clothingAdjust, templateSport(t)),
    place: sunPlace(settings.homeLocation),
    sweatEntries: settings.sweatEntries,
    // Zolang de stand laadt: geen regel over het horloge, de rest staat er al.
    watchStatus: ready ? (s, t) => statusOf(s, t).kind : undefined,
    showWatchStatus: settings.showWatchStatus !== false,
    routeOn: settings.routeProposal !== false,
    easyPace,
    bodyKg: loadBodyKg(settings),
    fuelOn: fuelOn(settings),
    trainingPlaces,
  };
}

// Een klok die op het hele uur meeloopt, zodat de kaart om 20:00 verschijnt en na middernacht weggaat,
// ook als Vandaag open blijft staan. Geen lus die iets laat bewegen: één timer tot het volgende uur.
function useHourClock(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const next = new Date(now);
    next.setHours(now.getHours() + 1, 0, 0, 0);
    const timer = window.setTimeout(() => setNow(new Date()), Math.max(1000, next.getTime() - Date.now() + 500));
    const onVisible = () => {
      if (document.visibilityState === 'visible') setNow(new Date());
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [now]);
  return now;
}

export function useEveningBefore(): EveningTrainingView | undefined {
  const now = useHourClock();
  const input = useEveningInput(now);
  return eveningBefore(input);
}

// Wat de melding van vanavond zegt, uitgerekend voor het moment van de melding.
export function useEveningNoticeView(at: Date | undefined): EveningTrainingView | undefined {
  const input = useEveningInput(at ?? new Date());
  return at && input.settings.on ? tomorrowPrep(input) : undefined;
}

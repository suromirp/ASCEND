// ASCEND: wat de Briefing toont (engine/briefing.ts), met de bronnen van de app: instellingen, logs,
// weer, de koppeling met je horloge en de stand van de workout. Gedeeld door het scherm Briefing en
// het blad van een training in Week, zodat die twee hetzelfde zeggen (de mint knop, de rij Je horloge
// en de regel onder de rij Briefing). Rekent niets zelf.

import { useState } from 'react';
import type { PlannedSession, SessionTemplate } from '../models/training';
import type { Program } from '../models/program';
import { useAppData } from '../state/AppDataContext';
import { briefing, type BriefingInput, type BriefingView } from '../engine/briefing';
import { showClothingAdvice, showWeatherLine } from '../engine/overviewSettings';
import { adjustFor } from '../engine/clothingFeedback';
import { templateSport } from '../engine/sports';
import { judgmentOptions, pacesFromLogs } from '../engine/testJudgment';
import { fuelOn } from '../engine/fuelOnTheGo';
import { recentRunPace } from '../engine/recentRunPace';
import { toISODate } from '../utils/dates';
import { watchFieldsShown, resolveWatchModel } from '../engine/watchFields';
import { getTrainingGuide } from '../data/trainingGuide';
import { useWatchStatuses } from './useWatchStatus';
import { useWatchLink } from './useWatchLink';

interface BriefingSources {
  template: SessionTemplate;
  session?: PlannedSession;
  date: string;
  program: Program | null;
  // De bewaarde keuze Waar train je? (ongelezen); afwezig: de standaard.
  storedPlace?: unknown;
}

export function useBriefingView(sources: BriefingSources): BriefingView | undefined {
  return briefing(useBriefingInput(sources));
}

// De bronnen los van het rekenen: de Briefing zelf rekent een tweede keer met het weer van de gekozen
// plek (engine/placeWeather.ts), want die plek is pas bekend na de regie van de route.
export function useBriefingInput({ template, session, date, program, storedPlace }: BriefingSources): BriefingInput {
  const { settings, sessionLogs, weather } = useAppData();
  const [now] = useState(() => new Date());
  const { watchLink, watchSource } = useWatchLink();
  const { statusOf, ready } = useWatchStatuses();
  const guide = getTrainingGuide(template.id);
  const paces = pacesFromLogs(sessionLogs, judgmentOptions(settings)).paces;
  return {
    template,
    session,
    date,
    now,
    program,
    logs: sessionLogs,
    storedPlace,
    routeOn: settings.routeProposal !== false,
    routeSearch: settings.routeSearch,
    easyPace: paces?.easy,
    paces,
    recentPace: recentRunPace(sessionLogs, template.id, toISODate(now)),
    watchLink,
    watchSource,
    watch: { showStatus: settings.showWatchStatus !== false, fieldsShown: watchFieldsShown(settings), model: resolveWatchModel(settings.watchModel), store: settings.watchFieldVersions, hasZonesNote: !!guide?.garminNote },
    watchStatus: session && ready ? statusOf(session, template) : undefined,
    forecast: weather.forecast ?? undefined,
    weatherOn: showWeatherLine(settings.overviews),
    clothingOn: showClothingAdvice(settings.overviews),
    clothingAdjust: adjustFor(settings.clothingAdjust, templateSport(template)),
    sweatEntries: settings.sweatEntries,
    fuelOn: fuelOn(settings),
  };
}

// ASCEND: bronbewaking. Merkt stil op wanneer er van je horloge niets meer binnenkomt terwijl
// de koppeling met intervals.icu gewoon werkt (docs/beslissingen/2026-10-31-kansen-stap-0.md,
// docs/onderzoek/Kansen met gegevens.md, "Eerst het grote risico").
//
// Garmin scherpte in oktober 2026 zijn voorwaarden aan en intervals.icu verwacht Garmin-gegevens
// via de API te moeten blokkeren. Dat zie je niet aan een foutmelding: het ophalen lukt, er komt
// alleen niets meer mee. Deze regel zegt dat in één zin, en alleen als het duidelijk is:
//
// - de koppeling werkt: het laatste geslaagde ophalen is van vandaag of gisteren;
// - ochtenden: er kwamen eerder ochtendgetallen binnen en de nieuwste is minstens drie dagen oud;
// - trainingen: de nieuwste activiteit is minstens drie dagen oud, en je trainde wel: een training
//   die je zelf invulde (geen kracht, die meet niet iedereen) na die activiteit, terwijl je horloge
//   na die activiteit nog ochtenden stuurde; zonder ochtenden twee zelf ingevulde trainingen.
//
// Puur: geen React, geen IndexedDB. Het zegt niets over de planning en verandert niets.

import type { SessionLog } from '../models/training';
import { addDays, formatDateNL, localDateOf } from '../utils/dates';
import { fromIntervals } from './logSource';

export const SILENT_DAYS = 3;

export type SourceSilenceKind = 'mornings' | 'activities' | 'both';

export interface SourceSilence {
  kind: SourceSilenceKind;
  // De eerste dag zonder (ISO): de dag na de laatste ochtend of activiteit.
  since: string;
  text: string;
}

export interface SourceWatchInput {
  today: string;
  // Een koppeling bestaat en "Melden als je horloge stilvalt" staat aan.
  linked: boolean;
  // Het laatste geslaagde ophalen (ISO-tijdstip).
  fetchedAt?: string;
  // Wat je van het horloge gebruikt: trainingen, en ochtenden (slaap, rusthartslag of HRV).
  activitiesOn: boolean;
  morningsOn: boolean;
  // De dagen (ISO) van wat er van intervals.icu binnenkwam: activiteiten en ochtenden.
  activityDays: readonly string[];
  morningDays: readonly string[];
  // Je trainingen, om te zien of je trainde zonder dat het horloge iets stuurde.
  logs: readonly Pick<SessionLog, 'completedDate' | 'type' | 'externalId' | 'source'>[];
}

const newest = (days: readonly string[]): string | undefined => days.reduce<string | undefined>((a, d) => (a === undefined || d > a ? d : a), undefined);

// Een training die je zelf invulde, die een horloge had kunnen meten.
const typedIn = (l: Pick<SessionLog, 'type' | 'externalId' | 'source'>): boolean =>
  l.type !== 'strength' && !fromIntervals(l as SessionLog) && (l.source === undefined || l.source === 'manual');

export function sourceSilence(input: SourceWatchInput): SourceSilence | undefined {
  const { today } = input;
  if (!input.linked || !input.fetchedAt) return undefined;
  const fetchedDay = localDateOf(input.fetchedAt);
  if (!fetchedDay || fetchedDay < addDays(today, -1)) return undefined;
  const limit = addDays(today, -SILENT_DAYS);

  const lastMorning = input.morningsOn ? newest(input.morningDays.filter((d) => d <= today)) : undefined;
  const morningsSilent = lastMorning !== undefined && lastMorning <= limit;

  let activitiesSilent = false;
  const lastActivity = input.activitiesOn ? newest(input.activityDays.filter((d) => d <= today)) : undefined;
  if (lastActivity !== undefined && lastActivity <= limit) {
    const trained = input.logs.filter((l) => typedIn(l) && l.completedDate.slice(0, 10) > lastActivity && l.completedDate.slice(0, 10) <= today).length;
    const watchStillSent = lastMorning !== undefined && lastMorning > lastActivity;
    activitiesSilent = watchStillSent ? trained >= 1 : trained >= 2;
  }

  if (morningsSilent && activitiesSilent) {
    const since = addDays(lastMorning! < lastActivity! ? lastMorning! : lastActivity!, 1);
    return { kind: 'both', since, text: `Sinds ${formatDateNL(since)} komt er niets meer van je horloge binnen, terwijl de koppeling met intervals.icu werkt.` };
  }
  if (morningsSilent) {
    const since = addDays(lastMorning!, 1);
    return { kind: 'mornings', since, text: `Sinds ${formatDateNL(since)} komen er geen ochtendgetallen van je horloge meer binnen, terwijl de koppeling met intervals.icu werkt.` };
  }
  if (activitiesSilent) {
    const since = addDays(lastActivity!, 1);
    return { kind: 'activities', since, text: `Sinds ${formatDateNL(since)} komt er geen training van je horloge meer binnen, terwijl je wel trainde.` };
  }
  return undefined;
}

// "Begrepen" geldt voor deze stilte: zolang hij op dezelfde dag begon en even breed is, blijft hij
// weg. Komt er weer iets binnen en valt het later opnieuw stil, dan is het een nieuwe.
export const silenceKey = (s: SourceSilence): string => `${s.kind}:${s.since}`;

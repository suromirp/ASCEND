// ASCEND: "Je deed zwemmen. Hoe telt dit?" (docs/visie/Sporten die meetellen.md, 2.5). Een activiteit van
// een sport zonder gekozen rol telt nog niet mee; op Vandaag staat dan een rustige regel met die vraag.
// Afgeleid, nooit opgeslagen: zodra je een rol kiest, is de vraag weg. Puur: geen React, geen IndexedDB.

import { anySportDefinition, type CountedSportId } from '../data/sports';
import type { ExternalActivity } from './activityImport';
import { sportRole, type RoleSettings } from './sportRole';
import type { FeltWord } from './sessionLoad';
import type { SportRole } from '../data/sports';
import type { SessionLog } from '../models/training';
import { sportOfLog } from './sportOfLog';
import { addDays } from '../utils/dates';

export interface SportQuestion {
  sport: CountedSportId;
  // De nieuwste activiteit van die sport: daar gaat de vraag over.
  activity: ExternalActivity;
  // Hoeveel activiteiten van die sport er zijn binnengekomen.
  count: number;
}

// De sporten die op een antwoord wachten, de nieuwste activiteit eerst. Een activiteit in de toekomst
// (een klok die verkeerd staat) telt niet.
export function pendingSports(activities: readonly ExternalActivity[], settings: RoleSettings, today: string): SportQuestion[] {
  const found = new Map<CountedSportId, SportQuestion>();
  for (const a of [...activities].sort((x, y) => y.start.localeCompare(x.start))) {
    if (!a.countedSport || a.start.slice(0, 10) > today) continue;
    if (sportRole(settings, a.countedSport) !== undefined) continue;
    const seen = found.get(a.countedSport);
    if (seen) seen.count++;
    else found.set(a.countedSport, { sport: a.countedSport, activity: a, count: 1 });
  }
  return [...found.values()];
}

// Een log dat je zelf invulde (Losse training) van een sport zonder rol: dezelfde vraag, zonder horlogeactiviteit.
export interface SportLogQuestion {
  sport: CountedSportId;
  // Het nieuwste log van die sport: daar gaat de vraag over.
  log: SessionLog;
  count: number;
}

// Zo ver terug blijft een log een vraag; een oud log zonder rol vraagt niet opeens iets.
export const ASK_LOG_DAYS = 14;

// De sporten waarvan je zelf een log invulde zonder dat de sport een rol heeft, het nieuwste log eerst. Het log
// zelf blijft zoals het is; zonder rol telt het nergens mee. Een log van het horloge heeft zijn eigen vraag
// (pendingSports), en een eigen sport ook.
export function pendingSportLogs(logs: readonly SessionLog[], settings: RoleSettings, today: string): SportLogQuestion[] {
  const since = addDays(today, -ASK_LOG_DAYS);
  const found = new Map<CountedSportId, SportLogQuestion>();
  const sorted = [...logs].sort((x, y) => y.completedAt.localeCompare(x.completedAt));
  for (const log of sorted) {
    const sport = sportOfLog(log).countedSport;
    if (!sport || log.completedDate > today || log.completedDate < since) continue;
    if (log.externalId) continue;
    if (sportRole(settings, sport) !== undefined) continue;
    const seen = found.get(sport);
    if (seen) seen.count++;
    else found.set(sport, { sport, log, count: 1 });
  }
  return [...found.values()];
}

// De regel op Vandaag.
export function sportQuestionLine(q: Pick<SportQuestion, 'sport'>): string {
  return `Je deed ${anySportDefinition(q.sport).label.toLowerCase()}. Hoe telt dit?`;
}

// De keuzes in het blad: zonder Plan dit voor mij, want ASCEND kan deze sporten niet plannen. Telt mee is het
// advies. Vaste dag gaat verder op het scherm Sporten, waar je de dagen kiest.
export const ASK_ROLES: SportRole[] = ['fixed', 'count', 'off'];
export const ASK_ADVICE: SportRole = 'count';

// Het woord dat het blad voorkiest bij Hoe zwaar voelde het: de gebruikelijke zwaarte van de sport.
export function adviceFelt(sport: CountedSportId): FeltWord {
  const typical = anySportDefinition(sport).typicalIntensity;
  return typical === 'high' ? 'zwaar' : typical === 'low' ? 'rustig' : 'pittig';
}

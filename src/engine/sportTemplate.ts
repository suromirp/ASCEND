// ASCEND: een afgeleid sjabloon per sport die ASCEND niet plant maar die meetelt (docs/visie/Sporten die
// meetellen.md, 3.2). Zwemmen, padel en voetbal hebben geen eigen training; hun log hangt aan dit sjabloon,
// zodat de beenindex, de weekcheck en het logboek ze lezen zoals elke andere training. Het sjabloon wordt
// nooit opgeslagen en staat alleen in de lijst zolang de sport meetelt: met Negeren of zonder keuze is het er
// niet, en tellen de logs van die sport nergens mee. Puur: geen React, geen IndexedDB.

import { COUNTED_SPORTS, anySportDefinition, type CountedSportId, type SportDefinition } from '../data/sports';
import type { SessionLog, SessionTemplate } from '../models/training';
import { stressProfileOf, type SportIntensity } from './sportStress';
import { resolveSportCounting, sportCounts } from './sportRole';
import { countingCustomTemplates } from './customSport';

const PREFIX = 'sport_';

export function sportTemplateId(sport: CountedSportId): string {
  return `${PREFIX}${sport}`;
}

// De sport van een afgeleid sjabloon, of undefined voor elk ander sjabloon. Leest het veld van het
// sjabloon zelf; de id is alleen de sleutel om het terug te vinden.
export function countedSportOfTemplate(template: Pick<SessionTemplate, 'countedSport'>): CountedSportId | undefined {
  return template.countedSport;
}

export function sportTemplate(sport: CountedSportId, intensity?: SportIntensity, opts: { restShort?: boolean } = {}): SessionTemplate {
  const def = anySportDefinition(sport) as SportDefinition;
  return {
    id: sportTemplateId(sport),
    name: def.label,
    type: 'cardio',
    roles: ['counted_sport'],
    countedSport: sport,
    durationVariants: { full: 60 },
    baseStressProfile: stressProfileOf(def, intensity ?? def.typicalIntensity),
    ...(opts.restShort ? { restShort: true } : {}),
  };
}

type CountingSettings = Parameters<typeof sportCounts>[0];

// De afgeleide sjablonen van de sporten die nu meetellen (Telt mee of Vaste dag).
export function countingSportTemplates(settings: CountingSettings): SessionTemplate[] {
  const restShort = resolveSportCounting(settings.sportCounting).rest === 'korter';
  return COUNTED_SPORTS.filter((s) => sportCounts(settings, s.id)).map((s) => sportTemplate(s.id, undefined, { restShort }));
}

// De opgeslagen sjablonen met de afgeleide erbij; een opgeslagen sjabloon met dezelfde id gaat voor.
export function withCountingSports(templates: SessionTemplate[], settings: CountingSettings & { customSports?: unknown }): SessionTemplate[] {
  const ids = new Set(templates.map((t) => t.id));
  return [...templates, ...[...countingSportTemplates(settings), ...countingCustomTemplates(settings)].filter((t) => !ids.has(t.id))];
}

// Telt dit log van een sport mee? Alleen een log met een sport die meetelt.
export function countedLogCounts(log: Pick<SessionLog, 'countedSport'>, settings: CountingSettings): boolean {
  return !!log.countedSport && sportCounts(settings, log.countedSport);
}

// Voor weergave: elke sport die kan meetellen bij naam, ook als hij dat nog niet doet (een voorstel dat een
// vaste afspraak toevoegt). Nooit voor de beenindex of de planning: daar telt alleen wat meetelt.
export function withSportNames(templates: SessionTemplate[]): SessionTemplate[] {
  const ids = new Set(templates.map((t) => t.id));
  return [...templates, ...COUNTED_SPORTS.map((s) => sportTemplate(s.id)).filter((t) => !ids.has(t.id))];
}

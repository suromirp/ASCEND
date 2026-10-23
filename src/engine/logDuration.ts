// ASCEND — de duur van een log zoals de app hem leest.
//
// Een krachtworkout die in MacroFactor dagen open bleef staan, komt binnen met
// een duur van dagen (een echte workout van 9 september stond op 11.472 min).
// Het Logboek telde dat op als trainingstijd. Wat opgeslagen is blijft zoals
// het is (een log wordt nooit herschreven); alleen bij het lezen telt zo'n duur
// als de geschatte duur van de training. Dezelfde grens als het leren van de
// duur (engine/durationLearning.ts).
//
// Pure: geen React, geen IndexedDB.

import type { SessionLog, SessionTemplate } from '../models/training';

export const MAX_STRENGTH_MINUTES = 240;

export function plausibleStrengthMinutes(minutes: number | undefined): number | undefined {
  return minutes !== undefined && minutes > 0 && minutes <= MAX_STRENGTH_MINUTES ? minutes : undefined;
}

// De logs met een krachtduur die kan; een log die al klopt blijft hetzelfde object.
export function withPlausibleDurations(logs: SessionLog[], templates: SessionTemplate[]): SessionLog[] {
  const byId = new Map(templates.map((t) => [t.id, t]));
  let changed = false;
  const out = logs.map((log) => {
    if (log.type !== 'strength' || log.durationMinutes <= MAX_STRENGTH_MINUTES) return log;
    changed = true;
    return { ...log, durationMinutes: byId.get(log.templateId)?.durationVariants.full ?? 60 };
  });
  return changed ? out : logs;
}

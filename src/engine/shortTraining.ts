// ASCEND: een korte training (profielen 14 november, punt C). Onder de helft van de geplande werksets of
// van de geplande duur heet een gedane training kort: het oordeel na afronden zegt dan niet "Gedaan zoals
// gepland" en de weekterugblik niet "Alles gedaan wat gepland stond". Alleen tekst: de training telt nog
// steeds als gedaan, want die status komt uit het log (engine/sessionStatus.ts), nooit uit een vlag.
//
// Pure: geen React, geen IndexedDB.

import type { Program } from '../models/program';
import type { SessionLog, SessionTemplate } from '../models/training';
import { exercisesForVariant, resolveVariantDuration } from './substitutions';
import { isWorkSet } from './workSets';
import { loggedMinutes } from './sessionStatus';
import { hasRole } from './templateRoles';

export const SHORT_TRAINING_SHARE = 0.5;
export const SHORT_TRAINING_TEXT = 'Een korte training. Dat telt ook.';

// Sets uit MacroFactor volgen hun eigen programma, niet de sets van de template: die tellen hier niet.
function fromMacroFactor(log: Pick<SessionLog, 'source' | 'externalId' | 'manualMeasured'>): boolean {
  return log.source === 'macrofactor' || !!log.externalId?.startsWith('macrofactor:') || !!log.manualMeasured?.strength;
}

// Werksets: alleen als het log sets heeft (zonder sets is het bewust alleen afgevinkt) en de template sets
// voorschrijft. Duur: alleen een bruikbare duur (engine/sessionStatus.ts#loggedMinutes), een oud log zonder
// duur is nooit kort.
export function isShortTraining(
  log: Pick<SessionLog, 'variant' | 'durationMinutes' | 'completedDate' | 'strengthData' | 'source' | 'externalId' | 'manualMeasured'>,
  template: SessionTemplate,
  program: Program | null | undefined,
): boolean {
  // Een test of wedstrijd heeft zijn eigen oordeel: een afgebroken test is geen korte training.
  if (template.type === 'recovery' || hasRole(template, 'test') || hasRole(template, 'race')) return false;
  const variant = log.variant ?? 'full';
  if (log.strengthData && !fromMacroFactor(log)) {
    const planned = exercisesForVariant(template, variant).reduce((n, e) => n + (e.sets > 0 ? e.sets : 0), 0);
    const done = log.strengthData.reduce((n, e) => n + e.sets.filter(isWorkSet).length, 0);
    if (planned > 0 && done < planned * SHORT_TRAINING_SHARE) return true;
  }
  const minutes = loggedMinutes(log);
  // Een log van je horloge (`custom`) heeft geen eigen versie: hij toetst aan de hele training, zoals gepland
  // (profiel horloge, 14 november).
  const plannedMinutes = resolveVariantDuration(template, variant === 'custom' ? 'full' : variant, log.completedDate, program);
  return minutes !== undefined && plannedMinutes > 0 && minutes < plannedMinutes * SHORT_TRAINING_SHARE;
}

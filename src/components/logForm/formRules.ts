// ASCEND: welke velden het formulier Hoe ging het? vraagt, gedeeld door het oude trainingsscherm en
// het blad Hoe ging het? (LogFormParts.tsx). Ongewijzigd uit components/ExerciseLogger.tsx.

import { createContext } from 'react';
import type { SessionTemplate, SessionVariant } from '../../models/training';
import { isLegHeavyTemplate } from '../../engine/scheduler';
import { getModalities } from '../../data/modalities';
import type { LogForm } from './useLogForm';

export const VARIANT_LABEL: Record<SessionVariant, string> = { full: 'Volledig', short: 'Kort', minimum: 'Minimum', custom: 'Aangepast' };

// Waar train je? (of Wat doe je vandaag?), alleen bij het eigen plan en met meer dan één plek.
export function placeLabel(template: SessionTemplate): string {
  return template.type === 'recovery' ? 'Wat doe je vandaag?' : 'Waar train je?';
}
export function showsPlace(form: Pick<LogForm, 'shape' | 'values'>, template: SessionTemplate): boolean {
  return form.shape.hasModalities && form.values.guidanceMode === 'ascend_guided' && (getModalities(template.id)?.length ?? 0) > 1;
}

// Gedaan op: een geplande training van een dag die voorbij is (die dag of vandaag), of een losse
// training (een datum tot 60 dagen terug).
export function asksDoneOn(form: Pick<LogForm, 'plannedInPast'>, plannedSessionId: string | undefined): boolean {
  return form.plannedInPast || !plannedSessionId;
}

// De pijnvraag: bij elke loop en wandeling, en bij kracht die zwaar is voor de benen.
export function asksPain(template: SessionTemplate): boolean {
  return template.type === 'cardio' || template.type === 'hiking' || (template.type === 'strength' && isLegHeavyTemplate(template));
}

// In het blad Hoe ging het? (regel 5 van het ontwerp): Opslaan is het enige mint, dus een gekozen chip,
// segment of zwaarte is stil, en elk invoerveld is 44 px hoog. Het oude scherm blijft zoals het was.
export const SheetMode = createContext(false);

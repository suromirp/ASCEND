// ASCEND: welke velden het formulier Hoe ging het? vraagt, gedeeld door het oude trainingsscherm en
// het blad Hoe ging het? (LogFormParts.tsx). Ongewijzigd uit components/ExerciseLogger.tsx.

import { createContext } from 'react';
import type { SessionTemplate, SessionVariant } from '../../models/training';
import { isLegHeavyTemplate } from '../../engine/scheduler';
import { getModalities, modalitySport } from '../../data/modalities';
import { isSportEnabled, type EnabledSports } from '../../engine/sports';
import { shortPlaceLabels } from '../../engine/trainingPlace';
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

// De korte vragen in het blad (regel 7). Niets in het blad is verplicht behalve wat er al staat, dus geen
// vraag krijgt "(optioneel)": dan is het overal gelijk.
export const SHORT_TEXT = {
  feel: 'Ten opzichte van normaal',
  rpe: 'Zwaarte, 1 tot 10',
  rpeInfo: 'Hoe zwaar voelde de hele training (RPE)? 1 en 2 is heel rustig, 3 en 4 rustig, 5 en 6 stevig, 8 en 9 hard, 10 alles wat je had.',
  legs: 'Benen bij het inlopen',
} as const;

// De plekken die het blad toont, met hun korte naam, zoals de Briefing: wat op slot zit of een uitgezette
// sport is valt weg, tenzij het al gekozen is. De chip in stap 2 en de kop van stap 1 lezen dit allebei.
export function visiblePlaces(template: SessionTemplate, selected: string | undefined, enabledSports?: Partial<EnabledSports>): { key: string; label: string; short: string }[] {
  const places = (getModalities(template.id) ?? []).filter((m) => m.key === selected || (!m.locked && isSportEnabled(modalitySport(m.key), enabledSports)));
  const short = shortPlaceLabels(places.map((m) => m.label));
  return places.map((m, i) => ({ key: m.key, label: m.label, short: short[i] }));
}

// De korte naam van de gekozen plek ("Buiten", "Loopband"), dezelfde als op de chip in stap 2.
export function chosenPlaceLabel(template: SessionTemplate, modalityKey: string | undefined, enabledSports?: Partial<EnabledSports>): string | undefined {
  return visiblePlaces(template, modalityKey, enabledSports).find((p) => p.key === modalityKey)?.short;
}

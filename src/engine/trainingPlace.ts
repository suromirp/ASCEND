// ASCEND: Waar train je? bij een geplande training (docs/beslissingen/2026-11-11-briefing-sporen-1-3-4.md).
//
// De keuzes per training komen uit data/modalities.ts, ongewijzigd. Dit bestand zegt welke keuzes er
// zijn, wat de standaard is, welke keuze geldt als er een bewaarde is, en of er een route bij hoort.
// De keuze geldt alleen voor die ene geplande training (eigenaar, 11 november); de standaard blijft de
// beste keuze. Puur: geen React, geen IndexedDB. Het plant niets en komt niet in een log; wat er in
// het log komt, bepaalt het formulier zoals altijd.

import type { PlannedSession, SessionTemplate } from '../models/training';
import { ROLE_LABEL, defaultModality, getModalities, type ModalityDefinition } from '../data/modalities';
import { wantsRouteAt } from './routeTarget';
import { capitalize } from '../utils/capitalize';

export interface PlaceChoice {
  key: string;
  label: string;
  // "Beste keuze", "Ook goed", "Als het niet anders kan".
  roleLabel: string;
  environment: ModalityDefinition['environment'];
  // Hoort bij een latere fase: wel te zien, niet te kiezen.
  locked: boolean;
}

export function placeChoices(templateId: string): PlaceChoice[] {
  return (getModalities(templateId) ?? []).map((m) => ({
    key: m.key,
    label: m.label,
    roleLabel: ROLE_LABEL[m.role],
    environment: m.environment,
    locked: !!m.locked,
  }));
}

// "Hardlopen, buiten op een heuvel" -> "Buiten op een heuvel" met "Hardlopen" als sport; een naam
// zonder komma blijft zoals hij is. De keuzes Waar train je? op het trainingsscherm en in de Briefing.
export function splitPlaceLabel(label: string): { name: string; sport?: string } {
  const i = label.indexOf(', ');
  if (i < 0) return { name: label };
  const rest = label.slice(i + 2);
  return { name: capitalize(rest), sport: label.slice(0, i) };
}

// Korte namen voor de chips Waar train je? in de Briefing: de naam na de komma ("Buiten"); delen twee
// keuzes die naam, dan het eerste woord van de sport ("Hardlopen", "Wandelen"), en pas als ook dat gelijk
// is de volle naam. De volle naam staat in de regel eronder; zo passen twee of drie keuzes op 360 px.
export function shortPlaceLabels(labels: readonly string[]): string[] {
  const split = labels.map(splitPlaceLabel);
  const firstWord = (s: string) => capitalize(s.split(' ')[0]);
  return split.map((p, i) => {
    const same = split.filter((o, j) => j !== i && o.name === p.name);
    if (same.length === 0) return p.name;
    const word = p.sport ? firstWord(p.sport) : undefined;
    if (word && same.every((o) => !o.sport || firstWord(o.sport) !== word)) return word;
    return labels[i];
  });
}

// De standaard: de beste keuze. Op een rustdag opent het scherm alleen om een wandeling te loggen.
export function defaultPlace(template: Pick<SessionTemplate, 'id' | 'type'>): string | undefined {
  const list = getModalities(template.id);
  if (template.type === 'recovery' && list?.some((m) => m.key === 'recovery_walk')) return 'recovery_walk';
  return defaultModality(template.id);
}

// De keuze die geldt: de bewaarde als deze training hem kent en hij te kiezen is, anders de standaard.
// Een oude of kapotte waarde (een ander toestel, een sleutel die niet meer bestaat) valt stil terug.
export function resolvePlace(template: Pick<SessionTemplate, 'id' | 'type'>, stored: unknown): string | undefined {
  if (typeof stored === 'string') {
    const found = getModalities(template.id)?.find((m) => m.key === stored);
    if (found && !found.locked) return found.key;
  }
  return defaultPlace(template);
}

// Hoort er bij deze keuze een route? Eén regel voor elk scherm (engine/routeTarget.ts#wantsRouteAt).
export function placeHasRoute(template: SessionTemplate | undefined, key: string | undefined): boolean {
  return wantsRouteAt(template, key);
}

// Staat de route er bij deze training, gegeven de bewaarde keuze (ongelezen)? De regel voor elke plek
// waar Route voorstellen verschijnt: Vandaag, het blad achter de i, De avond ervoor en de Briefing.
// Geen of een kapotte keuze: de standaard, meestal Buiten.
export function routeShownFor(template: SessionTemplate | undefined, stored: unknown): boolean {
  if (!template) return false;
  return placeHasRoute(template, resolvePlace(template, stored));
}

// De geplande training achter een training op een dag, voor een scherm dat alleen de training en de
// dag kent (Vandaag, het blad achter de i). Overgeslagen telt niet; bij twee dezelfde op een dag de eerste.
export function plannedOn(planned: readonly PlannedSession[], templateId: string, date: string): PlannedSession | undefined {
  return planned
    .filter((p) => p.templateId === templateId && p.scheduledDate === date && p.status !== 'skipped')
    .sort((a, b) => a.order - b.order)[0];
}

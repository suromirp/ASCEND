// ASCEND: Waar train je? bij een geplande training (docs/beslissingen/2026-11-11-briefing-sporen-1-3-4.md).
//
// De keuzes per training komen uit data/modalities.ts, ongewijzigd. Dit bestand zegt welke keuzes er
// zijn, wat de standaard is, welke keuze geldt als er een bewaarde is, en of er een route bij hoort.
// De keuze geldt alleen voor die ene geplande training (eigenaar, 11 november); de standaard blijft de
// beste keuze. Puur: geen React, geen IndexedDB. Het plant niets en komt niet in een log; wat er in
// het log komt, bepaalt het formulier zoals altijd.

import type { SessionTemplate } from '../models/training';
import { ROLE_LABEL, defaultModality, getModalities, type ModalityDefinition } from '../data/modalities';
import { wantsRouteAt } from './routeTarget';

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

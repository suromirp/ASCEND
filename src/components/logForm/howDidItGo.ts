// ASCEND: de regels van het blad Hoe ging het? (zelf invullen voor lopen en wandelen), zonder React.
// Spoor 5 van docs/visie/Ontwerp trainingsscherm minimaal.md, besluit
// docs/beslissingen/2026-11-12-hoe-ging-het.md.

import type { SessionLog } from '../../models/training';

export const HOW_TEXT = {
  title: 'Hoe ging het?',
  // De rij naar stap 2, en de kop van stap 2.
  more: 'Afstand, hoogtemeters en notities',
  save: 'Opslaan',
  saving: 'Opslaan…',
  rest: 'Rustdag afvinken',
  restLine: 'Een echte rustdag. Er valt niets in te vullen.',
  confirm: 'Klopt dit?',
  adjust: 'Aanpassen',
  confirmSave: 'Ja, opslaan',
  close: 'Sluiten',
  cancel: 'Annuleren',
  // Na de grens in tijd: het opslaan loopt nog, en je ziet dat.
  slow: 'Opslaan duurt lang. Je invulling blijft staan.',
  failed: 'Opslaan lukte niet. Je invulling staat er nog; probeer het opnieuw.',
  already: 'Deze training staat al als gedaan. Er komt geen tweede log bij.',
} as const;

// De grens in tijd voor Opslaan. Daarna zegt het blad dat het lang duurt; de knop blijft uit tot het
// opslaan klaar is, zodat een tweede tik nooit een tweede log maakt.
export const SAVE_LIMIT_MS = 10_000;

// Is deze geplande training al gedaan? Dan slaat het blad niets op (een log per geplande training).
export function alreadyLogged(plannedSessionId: string | undefined, logs: readonly Pick<SessionLog, 'plannedSessionId'>[]): boolean {
  return !!plannedSessionId && logs.some((l) => l.plannedSessionId === plannedSessionId);
}

export type FootState = 'already' | 'confirm' | 'save';

// Wat onderaan staat: al gedaan (alleen Sluiten), de vraag Klopt dit? bij een heel lange duur, of Opslaan.
export function footState({ alreadyDone, confirmLong }: { alreadyDone: boolean; confirmLong: boolean }): FootState {
  if (alreadyDone) return 'already';
  return confirmLong ? 'confirm' : 'save';
}

// Eén keer opslaan, met een grens in tijd. Na `limitMs` meldt `onSlow` dat het lang duurt; de uitkomst
// is altijd die van het opslaan zelf (alles of niets: logSession schrijft één log of niets).
export async function saveWithLimit(save: () => Promise<boolean>, onSlow: () => void, limitMs = SAVE_LIMIT_MS): Promise<boolean> {
  const timer = setTimeout(onSlow, limitMs);
  try {
    return await save();
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

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
  // Een losse training heeft geen geplande training die een tweede log tegenhoudt, en logSession kan
  // mislukken nadat het log al geschreven is (een stap erna faalde): eerst kijken.
  failedLoose: 'Opslaan lukte niet. Kijk eerst in je logboek of hij er toch staat; je invulling staat er nog.',
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
// is altijd die van het opslaan zelf. Let op: logSession kan false geven nadat het log al geschreven is.
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

export type SubmitResult = 'saved' | 'failed' | 'busy';

// Opslaan vanuit het blad: nooit twee tegelijk, één aanroep met het hele log. Gelukt: `onSaved` (concept
// weg, blad dicht). Mislukt of een fout: `onFailed`, het blad blijft open met alles wat je invulde.
export async function submitLog(deps: { busy: { current: boolean }; save: () => Promise<boolean>; onSlow: () => void; onSaved: () => void; onFailed: () => void; limitMs?: number }): Promise<SubmitResult> {
  if (deps.busy.current) return 'busy';
  deps.busy.current = true;
  let ok: boolean;
  try {
    ok = await saveWithLimit(deps.save, deps.onSlow, deps.limitMs);
  } finally {
    deps.busy.current = false;
  }
  if (ok) deps.onSaved();
  else deps.onFailed();
  return ok ? 'saved' : 'failed';
}

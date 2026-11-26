// ASCEND: de regels van het blad Hoe ging het? (zelf invullen voor lopen en wandelen), zonder React.
// Spoor 5 van docs/visie/Ontwerp trainingsscherm minimaal.md, besluit
// docs/beslissingen/2026-11-12-hoe-ging-het.md.

import type { SessionLog } from '../../models/training';
import { FORM_SAVE_NOTE, STILL_WAITED_NOTE, STILL_WAITING_NOTE, type EarlierSaveOutcome } from '../../state/logSave';

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
  slow: FORM_SAVE_NOTE.slow,
  slowLoose: FORM_SAVE_NOTE.slowLoose,
  // Een eerdere poging voor deze training loopt nog: Opslaan uit tot ze klaar is of faalt, dezelfde woorden als
  // Afronden in Forge (I-135). `waited`: na de grens loopt ze nog, Opslaan staat weer aan.
  stillWaiting: STILL_WAITING_NOTE,
  waited: STILL_WAITED_NOTE,
  failed: FORM_SAVE_NOTE.failed,
  // Een losse training heeft geen geplande training die een tweede log tegenhoudt: eerst kijken. Sinds
  // besluit 2026-11-12-dubbel-log.md zegt logSession ja zodra het log geschreven is; deze regel blijft als voorzorg.
  failedLoose: FORM_SAVE_NOTE.failedLoose,
  already: FORM_SAVE_NOTE.already,
} as const;

// De grens in tijd voor Opslaan. Daarna zegt het blad dat het lang duurt; bij een losse training blijft de knop uit
// tot het opslaan klaar is, zodat een tweede tik nooit een tweede log maakt (saveButton).
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

// De knop Opslaan onderaan. Tijdens het opslaan staat hij uit met "Opslaan…". Na de grens in tijd gaat hij bij een
// geplande training weer aan, zoals Afronden in Forge (I-140): een tweede tik maakt geen tweede log (één log per
// geplande training, SessionLogsRepo.add) en wacht zichtbaar op de eerste poging (`still`, waitForEarlierSave, met
// een grens). Een losse training heeft die sleutel niet zeker: daar blijft hij uit tot het opslaan klaar is.
export function saveButton({ saving, slow, still, loose, blocked }: { saving: boolean; slow: boolean; still: boolean; loose: boolean; blocked: boolean }): { on: boolean; busyLabel: boolean } {
  const afterSlow = saving && slow && !loose;
  return { on: (!saving || afterSlow) && !blocked && !still, busyLabel: saving && !afterSlow && !still };
}

// Eén keer opslaan, met een grens in tijd. Na `limitMs` meldt `onSlow` dat het lang duurt; de uitkomst
// is altijd die van het opslaan zelf. Ja van logSession betekent: het log staat er, ook als een stap erna faalde.
export async function saveWithLimit<T extends boolean | 'already'>(save: () => Promise<T>, onSlow: () => void, limitMs = SAVE_LIMIT_MS): Promise<T | false> {
  const timer = setTimeout(onSlow, limitMs);
  try {
    return await save();
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export type SubmitResult = 'saved' | 'already' | 'failed' | 'busy';

// Opslaan vanuit het blad: nooit twee tegelijk, één aanroep met het hele log. Gelukt: `onSaved` (concept
// weg, blad dicht). Stond er al (`save` geeft 'already', het log staat er zeker): `onAlready`, de zin van al
// gedaan en geen zin voor mislukt (I-32). Mislukt of een fout: `onFailed`, het blad blijft open met alles wat je
// invulde.
export async function submitLog(deps: { busy: { current: boolean }; save: () => Promise<boolean | 'already'>; onSlow: () => void; onSaved: () => void; onAlready?: () => void; onFailed: () => void; limitMs?: number }): Promise<SubmitResult> {
  if (deps.busy.current) return 'busy';
  deps.busy.current = true;
  let result: boolean | 'already';
  try {
    result = await saveWithLimit(deps.save, deps.onSlow, deps.limitMs);
  } finally {
    deps.busy.current = false;
  }
  if (result === true) {
    deps.onSaved();
    return 'saved';
  }
  if (result === 'already' && deps.onAlready) {
    deps.onAlready();
    return 'already';
  }
  deps.onFailed();
  return 'failed';
}

// Hoe het blad dichtgaat. Alleen Annuleren wist een ingevuld concept; een tik naast het blad, wegslepen,
// het kruis of de terugknop van de telefoon laten het staan, zoals het oude scherm (een tik ernaast is snel
// gebeurd). Een leeg concept mag altijd weg; na Opslaan is het al weg. Bij een training die al gedaan is
// valt er niets te bewaren.
export type CloseWay = 'cancel' | 'backdrop' | 'drag' | 'back' | 'cross' | 'already';

export function clearsDraft(way: CloseWay, filled: boolean): boolean {
  return way === 'cancel' || way === 'already' || !filled;
}

// Na "loopt nog" wacht het blad op de eerdere poging (state/logSave.ts#waitForEarlierSave): het log staat er (de zin
// van al gedaan), er staat niets (mislukt, Opslaan weer aan), of ze loopt na de grens nog (Opslaan weer aan, kijk in
// je logboek).
export function afterEarlierSave(outcome: EarlierSaveOutcome): 'already' | 'failed' | 'waited' {
  return outcome === 'stored' ? 'already' : outcome === 'free' ? 'failed' : 'waited';
}

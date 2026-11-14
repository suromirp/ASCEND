// ASCEND: het antwoord van logSession lezen op een scherm, met een grens in tijd. Eén patroon voor het oude
// trainingsscherm, de kaart Van je horloge en de sportvraag. Besluit docs/beslissingen/2026-11-14-nee-van-logsession.md.

import type { LogSessionInput } from './appDataTypes';
import { settleLogOutcome } from './logSession';
import { withTimeout } from '../utils/withTimeout';

type LogSessionFn = (input: LogSessionInput) => Promise<boolean>;

// saved: het log is nu geschreven. already: het stond er al, er is niets dubbel geschreven. failed: er staat
// geen log; alles blijft zoals het was.
export type LogSaveResult = 'saved' | 'already' | 'failed';
// slow: de grens is voorbij en het opslaan loopt nog. Het kan alsnog lukken: gooi dan niets weg.
export type LogSaveOutcome = LogSaveResult | 'slow';

export const LOG_SAVE_LIMIT_MS = 10_000;

// Welke zin een scherm toont als er (nog) geen nieuw log staat.
export type SaveNoteKind = Exclude<LogSaveOutcome, 'saved'>;

// "Stond er al": één zin voor de kaart Van je horloge, het oude trainingsscherm en het blad Hoe ging het?
// (components/logForm/howDidItGo.ts#HOW_TEXT leest hem hier).
export const ALREADY_LOGGED_NOTE = 'Deze training staat al als gedaan. Er komt geen tweede log bij.';

// De zinnen bij een kaart die een activiteit opslaat (dezelfde woorden als elders in de app).
export const LOG_SAVE_NOTE: Record<SaveNoteKind, string> = {
  failed: 'Opslaan lukte niet. Probeer het zo nog eens.',
  slow: 'Opslaan duurt langer dan verwacht. Probeer het zo nog eens.',
  already: ALREADY_LOGGED_NOTE,
};

// Wat het oude trainingsscherm doet bij welke uitkomst. Het concept gaat alleen weg en het scherm sluit alleen
// als het log er staat. Na de grens (slow) blijft de knop uit tot het opslaan klaar is: een losse training
// heeft geen sleutel die een tweede log tegenhoudt.
export interface FormAfterSave {
  clearDraft: boolean;
  close: boolean;
  buttonOff: boolean;
  note?: SaveNoteKind;
}

export function formAfterSave(outcome: LogSaveOutcome): FormAfterSave {
  if (outcome === 'saved') return { clearDraft: true, close: true, buttonOff: true };
  if (outcome === 'slow') return { clearDraft: false, close: false, buttonOff: true, note: 'slow' };
  return { clearDraft: false, close: false, buttonOff: false, note: outcome };
}

// Terug of Annuleren op het oude trainingsscherm wist het concept, behalve zolang er opgeslagen wordt: na de
// grens is weggaan de enige uitweg, en als het late antwoord nee is moet je invulling er nog staan. Lukt het
// alsnog, dan wist die uitkomst het concept zelf.
export function closeClearsDraft(saving: boolean): boolean {
  return !saving;
}

// Wat de kaart Van je horloge doet bij welke uitkomst. Het blad Andere training gaat alleen dicht als het log
// er staat. `earlierStillRunning`: een eerdere poging voor dezelfde activiteit is na de grens nog onderweg; een
// tweede tik krijgt dan nee zonder log, maar mislukt is het niet, dus de zin van de grens blijft staan.
export interface CardAfterSave {
  closeSheet: boolean;
  addDetail: boolean;
  refresh: boolean;
  note?: SaveNoteKind;
}

export function cardAfterSave(outcome: LogSaveOutcome, earlierStillRunning = false): CardAfterSave {
  if (outcome === 'saved') return { closeSheet: true, addDetail: true, refresh: false };
  // Het logboek op het scherm liep achter: opnieuw lezen, dan klopt het voorstel weer.
  if (outcome === 'already') return { closeSheet: true, addDetail: false, refresh: true, note: 'already' };
  return { closeSheet: false, addDetail: false, refresh: false, note: outcome === 'failed' && !earlierStillRunning ? 'failed' : 'slow' };
}

// Een log opslaan en hoogstens `limitMs` wachten. Gooit nooit. Na de grens komt 'slow' terug en meldt `onLate`
// later hoe het afliep, zodat het scherm een log dat alsnog landt niet tegenspreekt.
export async function saveLogWithin(
  logSession: LogSessionFn,
  input: LogSessionInput,
  opts: { limitMs?: number; onLate?: (result: LogSaveResult) => void } = {},
): Promise<LogSaveOutcome> {
  const attempt: Promise<LogSaveResult> = (async () => {
    try {
      return (await settleLogOutcome(await logSession(input), input)) ? 'saved' : 'already';
    } catch {
      return 'failed';
    }
  })();
  try {
    return await withTimeout(attempt, opts.limitMs ?? LOG_SAVE_LIMIT_MS);
  } catch {
    // `attempt` gooit zelf nooit: dit is de grens in tijd.
    void attempt.then((result) => opts.onLate?.(result));
    return 'slow';
  }
}

// Vanzelf afvinken van het horloge: `onStored` (noteren dat ASCEND dit log zelf maakte) loopt alleen voor een
// log dat deze poging schreef, ook als dat pas na de grens lukte. Stond het er al of lukte het niet, dan
// gebeurt er niets en blijft de activiteit een gewoon voorstel.
export async function autoTickLog(logSession: LogSessionFn, input: LogSessionInput, onStored: () => Promise<unknown>, limitMs?: number): Promise<LogSaveOutcome> {
  // Lukt het noteren niet, dan staat het log er nog steeds; alleen de vraag erna blijft weg.
  const stored = (result: LogSaveResult) => (result === 'saved' ? onStored().then(() => undefined, () => undefined) : Promise.resolve());
  const outcome = await saveLogWithin(logSession, input, { limitMs, onLate: (result) => void stored(result) });
  if (outcome !== 'slow') await stored(outcome);
  return outcome;
}

// De sportvraag: eerst het log, dan de keuze. Lukt het log niet of duurt het te lang, dan gooit dit en wordt
// de keuze niet gezet, ook niet als het log daarna alsnog landt. Zonder log (Negeren) alleen de keuze.
export async function saveLogThenChoice(logSession: LogSessionFn, input: LogSessionInput | undefined, choose: () => Promise<unknown>, limitMs: number): Promise<void> {
  let cancelled = false;
  try {
    await withTimeout((async () => {
      // Gooit als er geen log staat; "staat er al" telt als gelukt.
      if (input) await settleLogOutcome(await logSession(input), input);
      if (cancelled) return;
      await choose();
    })(), limitMs);
  } catch (err) {
    cancelled = true;
    throw err;
  }
}

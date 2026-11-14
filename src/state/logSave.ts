// ASCEND: het antwoord van logSession lezen op een scherm, met een grens in tijd. Eén patroon voor het oude
// trainingsscherm, de kaart Van je horloge en de sportvraag. Besluit docs/beslissingen/2026-11-14-nee-van-logsession.md.

import type { LogSessionInput } from './appDataTypes';
import { LogNotSaved, settleLogOutcome } from './logSession';
import { TimeoutError, withTimeout } from '../utils/withTimeout';

type LogSessionFn = (input: LogSessionInput, opts?: { onWriteError?: (err: unknown) => void }) => Promise<boolean>;

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

// Eén woordenset voor elk scherm dat een log opslaat. Mislukt begint met "Opslaan lukte niet.", traag met
// "Opslaan duurt langer dan verwacht.", en daarna wat je kunt doen. De woorden van het blad Hoe ging het? zijn
// leidend (components/logForm/howDidItGo.ts#HOW_TEXT leest FORM_SAVE_NOTE).
const FAILED = 'Opslaan lukte niet.';
const SLOW = 'Opslaan duurt langer dan verwacht.';

// Een kaart of blad waar je na de grens opnieuw mag tikken: Van je horloge en de sportvraag (thrownSaveNote).
export const LOG_SAVE_NOTE: Record<SaveNoteKind, string> = {
  failed: `${FAILED} Probeer het zo nog eens.`,
  slow: `${SLOW} Kijk zo in je logboek of hij er staat. Zo niet, probeer het nog eens.`,
  already: ALREADY_LOGGED_NOTE,
};

// Een formulier met je eigen invulling. Na de grens blijft de knop uit, dus daar staat geen "probeer het nog eens".
// `failedLoose`: een losse training heeft geen geplande training die een tweede log tegenhoudt, dus eerst kijken.
export const FORM_SAVE_NOTE = {
  failed: `${FAILED} Je invulling staat er nog; probeer het opnieuw.`,
  failedLoose: `${FAILED} Kijk eerst in je logboek of hij er toch staat; je invulling staat er nog.`,
  slow: `${SLOW} Je invulling blijft staan.`,
  already: ALREADY_LOGGED_NOTE,
} as const;

// Een scherm dat de uitkomst zelf toont krijgt de melding bovenin niet meer (logSession, `onWriteError`). Wat die
// melding wist (de opslag is vol, maak een back-up) gaat niet verloren: mislukt het schrijven een tweede keer op
// rij, dan komt de reden achter de eigen zin van het scherm. "Op rij" telt over schermen heen en zonder grens in
// tijd: de teller staat hier, en alleen een geslaagde opslag zet hem terug.
let failedInARow = 0;
let lastWriteError: unknown;

type OnWriteError = (err: unknown) => void;

// Alleen een aanroeper die zelf `onWriteError` geeft houdt de melding bovenin tegen. Een scherm dat het vergeet
// is zo nooit stil: zijn schrijffout gaat gewoon naar reportStorageError.
async function settleWithOwnNotice(logSession: LogSessionFn, input: LogSessionInput, onWriteError?: OnWriteError): Promise<boolean> {
  let writeError: unknown;
  const own = onWriteError ? { onWriteError: (err: unknown) => { writeError = err ?? new Error('Opslaan lukte niet.'); } } : undefined;
  try {
    const saved = await settleLogOutcome(await logSession(input, own), input);
    failedInARow = 0;
    lastWriteError = undefined;
    return saved;
  } catch (err) {
    failedInARow += 1;
    lastWriteError = writeError;
    if (writeError !== undefined) onWriteError?.(writeError);
    throw err;
  }
}

// Een scherm dat `onWriteError` meegeeft is zelf verantwoordelijk voor de uitkomst zolang het in beeld is. Is het
// weg als het nee komt (na de grens is weggaan de uitweg), dan gaat de schrijffout alsnog naar de melding bovenin.
// `inView` komt uit een ref die bij unmount omgaat. Alleen vanzelf afvinken is bewust stil.
export function reportIfGone(inView: boolean, writeError: unknown, report: OnWriteError): void {
  if (!inView && writeError !== undefined) report(writeError);
}

const BACKUP_TIP = 'Lukt het weer niet, maak dan een back-up via Instellingen, Gegevens en back-up.';
const STORAGE_FULL = 'De opslag op deze telefoon is vol. Maak een back-up en ruim ruimte op.';

// De zin bij mislukt: `first` de eerste keer; bij een tweede schrijffout op rij dezelfde zin met de reden erachter.
export function failedNote(first: string): string {
  if (failedInARow < 2 || lastWriteError === undefined) return first;
  const full = (lastWriteError as { name?: unknown } | null)?.name === 'QuotaExceededError';
  return `${first} ${full ? STORAGE_FULL : BACKUP_TIP}`;
}

// De sportvraag: eerst het log, dan de keuze. Faalt de keuze, dan zegt het blad dat, niet "Opslaan lukte niet".
export class ChoiceNotSaved extends Error {
  readonly logStored: boolean;
  constructor(logStored: boolean) {
    super('De keuze is niet bewaard.');
    this.name = 'ChoiceNotSaved';
    this.logStored = logStored;
  }
}

export const CHOICE_NOT_SAVED = {
  withLog: 'Je training staat in je logboek. Je keuze is nog niet bewaard; probeer het zo nog eens.',
  alone: 'Je keuze is nog niet bewaard. Probeer het zo nog eens.',
} as const;

// De zin van de sportvraag bij wat saveLogThenChoice gooit, uit LOG_SAVE_NOTE. Mislukt (amber) is alleen een
// schrijffout. Te lang, of nee omdat een eerdere poging nog loopt: de zin van de grens, het log kan nog landen.
export function thrownSaveNote(err: unknown): { kind: 'slow' | 'failed' | 'choice'; text: string } {
  if (err instanceof ChoiceNotSaved) return { kind: 'choice', text: err.logStored ? CHOICE_NOT_SAVED.withLog : CHOICE_NOT_SAVED.alone };
  if (err instanceof TimeoutError || (err instanceof LogNotSaved && lastWriteError === undefined)) return { kind: 'slow', text: LOG_SAVE_NOTE.slow };
  return { kind: 'failed', text: failedNote(LOG_SAVE_NOTE.failed) };
}

// Alleen voor tests: de teller van mislukte pogingen op rij.
export function resetFailedNotes(): void {
  failedInARow = 0;
  lastWriteError = undefined;
}

// Het blad Hoe ging het? leest ja of nee zelf (logForm/howDidItGo.ts#submitLog) en toont zijn eigen zin: ook
// daar geen melding bovenin, en dezelfde teller. `onWriteError`: de fout, voor reportIfGone.
export async function logWithOwnNotice(logSession: LogSessionFn, input: LogSessionInput, onWriteError?: OnWriteError): Promise<boolean> {
  let writeError: unknown;
  const saved = await logSession(input, { onWriteError: (err) => { writeError = err ?? new Error('Opslaan lukte niet.'); } });
  failedInARow = saved ? 0 : failedInARow + 1;
  lastWriteError = saved ? undefined : writeError;
  if (!saved && writeError !== undefined) onWriteError?.(writeError);
  return saved;
}

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
// later hoe het afliep, zodat het scherm een log dat alsnog landt niet tegenspreekt. `onWriteError` krijgt een
// schrijffout vlak voor de uitkomst 'failed' (ook de late), voor reportIfGone; zonder gaat de fout bovenin.
export async function saveLogWithin(
  logSession: LogSessionFn,
  input: LogSessionInput,
  opts: { limitMs?: number; onLate?: (result: LogSaveResult) => void; onWriteError?: OnWriteError } = {},
): Promise<LogSaveOutcome> {
  const attempt: Promise<LogSaveResult> = (async () => {
    try {
      return (await settleWithOwnNotice(logSession, input, opts.onWriteError)) ? 'saved' : 'already';
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
// gebeurt er niets en blijft de activiteit een gewoon voorstel. Er komt dan ook geen melding: je deed zelf niets,
// en Opslaan op het voorstel zegt wat er is.
export async function autoTickLog(
  logSession: LogSessionFn,
  input: LogSessionInput,
  onStored: () => Promise<unknown>,
  opts: { limitMs?: number; onLate?: (result: LogSaveResult) => void } = {},
): Promise<LogSaveOutcome> {
  // Lukt het noteren niet, dan staat het log er nog steeds; alleen de vraag erna blijft weg.
  const stored = (result: LogSaveResult) => (result === 'saved' ? onStored().then(() => undefined, () => undefined) : Promise.resolve());
  // `onLate`: het antwoord na de grens, ook een nee, zodat de aanroeper weet dat deze poging niet meer loopt.
  // Bewust stil bij een schrijffout: de lege `onWriteError` houdt de melding bovenin tegen.
  const outcome = await saveLogWithin(logSession, input, { limitMs: opts.limitMs, onWriteError: () => undefined, onLate: (result) => { opts.onLate?.(result); void stored(result); } });
  if (outcome !== 'slow') await stored(outcome);
  return outcome;
}

// De sportvraag: eerst het log, dan de keuze. Lukt het log niet of duurt het te lang, dan gooit dit en wordt
// de keuze niet gezet, ook niet als het log daarna alsnog landt. Zonder log (Negeren) alleen de keuze. Faalt de
// keuze zelf, dan gooit dit ChoiceNotSaved: het log staat er dan wel.
export async function saveLogThenChoice(
  logSession: LogSessionFn,
  input: LogSessionInput | undefined,
  choose: () => Promise<unknown>,
  limitMs: number,
  // `late`: de schrijffout kwam na de grens. Het blad zei toen al "duurt langer" en hoort dit nee niet meer:
  // de aanroeper meldt het dan altijd bovenin (reportIfGone met inView false).
  onWriteError?: (err: unknown, late: boolean) => void,
): Promise<void> {
  let cancelled = false;
  try {
    await withTimeout((async () => {
      // Gooit als er geen log staat; "staat er al" telt als gelukt.
      if (input) await settleWithOwnNotice(logSession, input, onWriteError && ((err) => onWriteError(err, cancelled)));
      if (cancelled) return;
      try {
        await choose();
      } catch {
        throw new ChoiceNotSaved(!!input);
      }
    })(), limitMs);
  } catch (err) {
    cancelled = true;
    throw err;
  }
}

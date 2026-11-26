import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PlannedSessionsRepo, SessionLogsRepo, wipeAllData } from '../storage/database';
import { runLogSession, LogNotSaved, type LogSessionDeps, type LogSessionOpts } from './logSession';
import { autoTickLog, cardAfterSave, closeClearsDraft, failedNote, formAfterSave, logOrAlready, reportIfGone, resetFailedNotes, saveLogThenChoice, saveLogWithin, saveOnCard, saveOnLogger, formNoteText, loggerNote, loggerShowsClose, tickOff, STILL_RUNNING_HELP, type TickOffNotice, settleWithOwnNotice, thrownSaveNote, ChoiceNotSaved, CHOICE_NOT_SAVED, ALREADY_LOGGED_NOTE, FORM_SAVE_NOTE, LOG_SAVE_NOTE, LOG_STILL_RUNNING_NOTE, type CardSaveUi, type LoggerSaveUi, type LogSaveResult, type ShownSaveNote, waitForEarlierSave } from './logSave';
import { forgeAfterEarlier, forgeExitLabel, forgeFinishNote } from '../components/forge/forgeFinishLog';
import { afterEarlierSave, HOW_TEXT } from '../components/logForm/howDidItGo';
import { TimeoutError } from '../utils/withTimeout';
import { describeWriteError, TICK_OFF_STILL_RUNNING } from '../storage/storageError';
import type { LogSessionInput } from './appDataTypes';

const loggerSrc = Object.values(import.meta.glob('../components/ExerciseLogger.tsx', { query: '?raw', import: 'default', eager: true }))[0] as string;
const watchSrc = Object.values(import.meta.glob('../components/WatchActivityCard.tsx', { query: '?raw', import: 'default', eager: true }))[0] as string;
const howSrc = Object.values(import.meta.glob('../components/HowDidItGoSheet.tsx', { query: '?raw', import: 'default', eager: true }))[0] as string;
const actionSrc = Object.values(import.meta.glob('../components/SessionActionSheet.tsx', { query: '?raw', import: 'default', eager: true }))[0] as string;
const finishSrc = Object.values(import.meta.glob('../components/forge/FinishSheet.tsx', { query: '?raw', import: 'default', eager: true }))[0] as string;
const sportSrc = Object.values(import.meta.glob('../components/sports/SportAskLine.tsx', { query: '?raw', import: 'default', eager: true }))[0] as string;

// Alles nagemaakt.
const planned = { id: 'p1', templateId: 'tpl_easy_run', scheduledDate: '2026-11-10', weekStartDate: '2026-11-09', status: 'planned' as const, order: 0 };
const forPlanned: LogSessionInput = { templateId: 'tpl_easy_run', type: 'cardio', variant: 'full', durationMinutes: 40, plannedSessionId: 'p1' };
const fromWatch: LogSessionInput = { templateId: 'tpl_easy_run', type: 'cardio', variant: 'full', durationMinutes: 40, externalId: 'x1', source: 'garmin' };

// Wat bovenin de app zou komen (reportStorageError): per test leeg begonnen.
let general: unknown[] = [];

function makeLogSession() {
  const deps: LogSessionDeps = {
    settings: {} as LogSessionDeps['settings'],
    loggingInFlight: { current: new Set<string>() },
    reportStorageError: (err) => general.push(err),
    refresh: async () => undefined,
    announceSaved: () => undefined,
  };
  return (input: LogSessionInput, opts?: LogSessionOpts) => runLogSession(input, opts, deps);
}

// Een logSession die pas antwoordt als de test dat zegt.
function gated() {
  let open!: (saved: boolean) => void;
  const gate = new Promise<boolean>((resolve) => (open = resolve));
  return { logSession: () => gate, open };
}

beforeEach(async () => {
  await wipeAllData();
  general = [];
  resetFailedNotes();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('saveLogWithin: het oude trainingsscherm en de kaart Van je horloge', () => {
  it('ja gaat door: saved, een log', async () => {
    await PlannedSessionsRepo.put(planned);
    expect(await saveLogWithin(makeLogSession(), forPlanned)).toBe('saved');
    expect(await SessionLogsRepo.getAll()).toHaveLength(1);
  });

  it('nee door een schrijffout: failed, geen log, en opnieuw proberen kan', async () => {
    await PlannedSessionsRepo.put(planned);
    const put = vi.spyOn(SessionLogsRepo, 'add').mockRejectedValue(new Error('vol'));
    const logSession = makeLogSession();
    expect(await saveLogWithin(logSession, forPlanned)).toBe('failed');
    expect(await SessionLogsRepo.getAll()).toHaveLength(0);
    put.mockRestore();
    expect(await saveLogWithin(logSession, forPlanned)).toBe('saved');
    expect(await SessionLogsRepo.getAll()).toHaveLength(1);
  });

  it('nee omdat het er al staat: already, geen tweede log', async () => {
    const logSession = makeLogSession();
    expect(await saveLogWithin(logSession, fromWatch)).toBe('saved');
    expect(await saveLogWithin(logSession, fromWatch)).toBe('already');
    expect(await SessionLogsRepo.getAll()).toHaveLength(1);
  });

  it('een losse training met een schrijffout: failed, nooit already', async () => {
    vi.spyOn(SessionLogsRepo, 'add').mockRejectedValue(new Error('vol'));
    expect(await saveLogWithin(makeLogSession(), { ...forPlanned, plannedSessionId: undefined })).toBe('failed');
  });

  it('logSession gooit zelf: failed, er wordt niets gegooid', async () => {
    expect(await saveLogWithin(() => Promise.reject(new Error('kapot')), forPlanned)).toBe('failed');
  });

  it('time-out: slow op de grens en niet eerder, en het late antwoord komt apart (ja)', async () => {
    vi.useFakeTimers();
    const { logSession, open } = gated();
    const late: LogSaveResult[] = [];
    let outcome: string | undefined;
    const run = saveLogWithin(logSession, forPlanned, { limitMs: 8000, onLate: (r) => late.push(r) });
    void run.then((o) => (outcome = o));
    await vi.advanceTimersByTimeAsync(7999);
    expect(outcome).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1);
    expect(await run).toBe('slow');
    expect(late).toEqual([]);
    open(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(late).toEqual(['saved']);
  });

  it('time-out en daarna nee zonder log: het late antwoord is failed', async () => {
    vi.useFakeTimers();
    const { logSession, open } = gated();
    const late: LogSaveResult[] = [];
    const run = saveLogWithin(logSession, forPlanned, { limitMs: 8000, onLate: (r) => late.push(r) });
    await vi.advanceTimersByTimeAsync(8000);
    expect(await run).toBe('slow');
    open(false);
    await vi.advanceTimersByTimeAsync(50);
    expect(late).toEqual(['failed']);
  });

  it('een tweede tik terwijl de eerste nog hangt: failed, en maar een log als de eerste landt', async () => {
    let release!: () => void;
    const hold = new Promise<void>((resolve) => (release = resolve));
    const realPut = SessionLogsRepo.add.bind(SessionLogsRepo);
    vi.spyOn(SessionLogsRepo, 'add').mockImplementation(async (log) => {
      await hold;
      return realPut(log);
    });
    const logSession = makeLogSession();
    const first = saveLogWithin(logSession, fromWatch);
    expect(await saveLogWithin(logSession, fromWatch)).toBe('failed');
    release();
    expect(await first).toBe('saved');
    expect(await saveLogWithin(logSession, fromWatch)).toBe('already');
    expect(await SessionLogsRepo.getAll()).toHaveLength(1);
  });

  it('de zinnen bestaan voor elke uitkomst die niet ja is', () => {
    for (const key of ['failed', 'slow', 'already'] as const) expect(LOG_SAVE_NOTE[key].length).toBeGreaterThan(10);
  });
});

describe('autoTickLog: vanzelf afvinken van het horloge', () => {
  it('ja: het log staat er en wordt als vanzelf afgevinkt genoteerd', async () => {
    let noted = 0;
    expect(await autoTickLog(makeLogSession(), fromWatch, async () => void noted++)).toBe('saved');
    expect(noted).toBe(1);
  });

  it('nee door een schrijffout: niets genoteerd, geen log', async () => {
    vi.spyOn(SessionLogsRepo, 'add').mockRejectedValue(new Error('vol'));
    let noted = 0;
    expect(await autoTickLog(makeLogSession(), fromWatch, async () => void noted++)).toBe('failed');
    expect(noted).toBe(0);
    expect(await SessionLogsRepo.getAll()).toHaveLength(0);
  });

  it('nee omdat het er al stond: niet als vanzelf afgevinkt genoteerd (jij sloeg het zelf op)', async () => {
    const logSession = makeLogSession();
    await logSession(fromWatch);
    let noted = 0;
    expect(await autoTickLog(logSession, fromWatch, async () => void noted++)).toBe('already');
    expect(noted).toBe(0);
  });

  it('time-out: de rij gaat verder, en landt het log later dan wordt het alsnog genoteerd', async () => {
    vi.useFakeTimers();
    const { logSession, open } = gated();
    let noted = 0;
    const late: LogSaveResult[] = [];
    const run = autoTickLog(logSession, fromWatch, async () => void noted++, { limitMs: 8000, onLate: (r) => late.push(r) });
    await vi.advanceTimersByTimeAsync(8000);
    expect(await run).toBe('slow');
    expect(noted).toBe(0);
    expect(late).toEqual([]);
    open(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(noted).toBe(1);
    expect(late).toEqual(['saved']);
  });

  it('time-out en dan een laat nee: de aanroeper hoort het (de poging loopt niet meer), er wordt niets genoteerd', async () => {
    vi.useFakeTimers();
    const { logSession, open } = gated();
    let noted = 0;
    const late: LogSaveResult[] = [];
    const run = autoTickLog(logSession, fromWatch, async () => void noted++, { limitMs: 8000, onLate: (r) => late.push(r) });
    await vi.advanceTimersByTimeAsync(8000);
    expect(await run).toBe('slow');
    open(false);
    await vi.advanceTimersByTimeAsync(50);
    expect(late).toEqual(['failed']);
    expect(noted).toBe(0);
  });

  it('het noteren faalt: het log staat er, er wordt niets gegooid', async () => {
    expect(await autoTickLog(makeLogSession(), fromWatch, () => Promise.reject(new Error('kapot')))).toBe('saved');
    expect(await SessionLogsRepo.getAll()).toHaveLength(1);
  });
});

describe('saveLogThenChoice: de sportvraag', () => {
  it('ja: eerst het log, dan de keuze', async () => {
    const order: string[] = [];
    const logSession = makeLogSession();
    await saveLogThenChoice(async (input) => { order.push('log'); return logSession(input); }, fromWatch, async () => void order.push('keuze'), 8000);
    expect(order).toEqual(['log', 'keuze']);
    expect(await SessionLogsRepo.getAll()).toHaveLength(1);
  });

  it('het log stond er al: de keuze wordt gezet, geen tweede log', async () => {
    const logSession = makeLogSession();
    await logSession(fromWatch);
    let chosen = 0;
    await saveLogThenChoice(logSession, fromWatch, async () => void chosen++, 8000);
    expect(chosen).toBe(1);
    expect(await SessionLogsRepo.getAll()).toHaveLength(1);
  });

  it('nee door een schrijffout: gooit LogNotSaved, de keuze wordt niet gezet', async () => {
    vi.spyOn(SessionLogsRepo, 'add').mockRejectedValue(new Error('vol'));
    let chosen = 0;
    await expect(saveLogThenChoice(makeLogSession(), fromWatch, async () => void chosen++, 8000)).rejects.toBeInstanceOf(LogNotSaved);
    expect(chosen).toBe(0);
  });

  it('zonder log (Negeren): alleen de keuze', async () => {
    let chosen = 0;
    await saveLogThenChoice(() => Promise.reject(new Error('hoort niet')), undefined, async () => void chosen++, 8000);
    expect(chosen).toBe(1);
  });

  it('time-out: gooit na de grens, en de keuze wordt niet gezet als het log daarna alsnog landt', async () => {
    vi.useFakeTimers();
    const { logSession, open } = gated();
    let chosen = 0;
    const caught = saveLogThenChoice(logSession, fromWatch, async () => void chosen++, 8000).catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(8000);
    expect(await caught).toBeInstanceOf(TimeoutError);
    open(true);
    await vi.advanceTimersByTimeAsync(50);
    expect(chosen).toBe(0);
  });

  it('de keuze zelf faalt: gooit, het log blijft staan', async () => {
    const caught = await saveLogThenChoice(makeLogSession(), fromWatch, () => Promise.reject(new Error('kapot')), 8000).catch((e: unknown) => e);
    expect(caught).toBeInstanceOf(ChoiceNotSaved);
    // Het log staat er: de zin zegt dat, en niet "Opslaan lukte niet".
    expect(thrownSaveNote(caught)).toEqual({ kind: 'choice', text: CHOICE_NOT_SAVED.withLog });
    const alone = await saveLogThenChoice(makeLogSession(), undefined, () => Promise.reject(new Error('kapot')), 8000).catch((e: unknown) => e);
    expect(thrownSaveNote(alone)).toEqual({ kind: 'choice', text: CHOICE_NOT_SAVED.alone });
    expect(await SessionLogsRepo.getAll()).toHaveLength(1);
  });
});

describe('geen melding bovenin als het scherm de uitkomst zelf toont', () => {
  const full = () => Object.assign(new Error('vol'), { name: 'QuotaExceededError' });
  // Een scherm dat de uitkomst zelf toont.
  const own = { onWriteError: () => undefined };

  it('zonder de optie: een schrijffout gaat naar de melding bovenin (de oude weg blijft)', async () => {
    vi.spyOn(SessionLogsRepo, 'add').mockRejectedValue(new Error('kapot'));
    expect(await makeLogSession()(fromWatch)).toBe(false);
    expect(general).toHaveLength(1);
  });

  it('saveLogWithin, autoTickLog, saveLogThenChoice en logOrAlready: mislukt, en bovenin komt niets', async () => {
    vi.spyOn(SessionLogsRepo, 'add').mockRejectedValue(new Error('kapot'));
    const logSession = makeLogSession();
    expect(await saveLogWithin(logSession, fromWatch, own)).toBe('failed');
    expect(await autoTickLog(logSession, fromWatch, async () => undefined)).toBe('failed');
    await expect(saveLogThenChoice(logSession, fromWatch, async () => undefined, 8000, () => undefined)).rejects.toBeInstanceOf(LogNotSaved);
    expect(await logOrAlready(logSession, fromWatch, () => undefined)).toBe(false);
    expect(general).toEqual([]);
  });

  it('logOrAlready zonder onWriteError houdt de melding bovenin niet tegen: een vergeten scherm is nooit stil', async () => {
    vi.spyOn(SessionLogsRepo, 'add').mockRejectedValue(new Error('kapot'));
    expect(await logOrAlready(makeLogSession(), fromWatch)).toBe(false);
    expect(general).toHaveLength(1);
    // Met onWriteError krijgt het scherm de fout zelf en blijft het bovenin leeg.
    general = [];
    const got: unknown[] = [];
    expect(await logOrAlready(makeLogSession(), fromWatch, (err) => got.push(err))).toBe(false);
    expect(general).toEqual([]);
    expect(got).toHaveLength(1);
  });

  // Een schrijven dat blijft hangen tot de test het laat mislukken.
  function hangingPut() {
    let fail!: (err: Error) => void;
    const hold = new Promise<boolean>((_, reject) => (fail = reject));
    hold.catch(() => undefined);
    vi.spyOn(SessionLogsRepo, 'add').mockImplementation(() => hold);
    return () => fail(new Error('kapot'));
  }

  it('een laat falen na een hang: zolang het scherm in beeld is niets bovenin', async () => {
    const fail = hangingPut();
    const report = (err: unknown) => general.push(err);
    let writeError: unknown;
    const late: LogSaveResult[] = [];
    const inView = true;
    const run = saveLogWithin(makeLogSession(), fromWatch, { limitMs: 20, onWriteError: (err) => { writeError = err; }, onLate: (r) => { late.push(r); if (r === 'failed') reportIfGone(inView, writeError, report); } });
    expect(await run).toBe('slow');
    fail();
    await vi.waitFor(() => expect(late).toEqual(['failed']));
    expect(writeError).toBeInstanceOf(Error);
    expect(general).toEqual([]);
  });

  it('het oude trainingsscherm: traag, weg, laat nee geeft precies een melding bovenin', async () => {
    const fail = hangingPut();
    const report = (err: unknown) => general.push(err);
    let writeError: unknown;
    let inView = true;
    const late: LogSaveResult[] = [];
    const run = saveLogWithin(makeLogSession(), forPlanned, { limitMs: 20, onWriteError: (err) => { writeError = err; }, onLate: (r) => { late.push(r); if (r === 'failed') reportIfGone(inView, writeError, report); } });
    expect(await run).toBe('slow');
    // Na de grens is weggaan de uitweg.
    inView = false;
    fail();
    await vi.waitFor(() => expect(late).toEqual(['failed']));
    expect(general).toHaveLength(1);
    expect((general[0] as Error).message).toBe('kapot');
  });

  it('het blad Hoe ging het?: traag, dicht, laat nee geeft precies een melding bovenin; open blijft het stil', async () => {
    for (const closed of [true, false]) {
      general = [];
      const fail = hangingPut();
      let writeError: unknown;
      const run = logOrAlready(makeLogSession(), { ...fromWatch, externalId: `x-${closed}` }, (err) => { writeError = err; });
      fail();
      expect(await run).toBe(false);
      // onFailed van het blad.
      reportIfGone(!closed, writeError, (err) => general.push(err));
      expect(general).toHaveLength(closed ? 1 : 0);
      vi.restoreAllMocks();
    }
  });

  it('een scherm dat onWriteError vergeet is nooit stil: de schrijffout gaat bovenin', async () => {
    vi.spyOn(SessionLogsRepo, 'add').mockRejectedValue(new Error('kapot'));
    const logSession = makeLogSession();
    expect(await saveLogWithin(logSession, fromWatch)).toBe('failed');
    expect(general).toHaveLength(1);
    await expect(saveLogThenChoice(logSession, fromWatch, async () => undefined, 8000)).rejects.toBeInstanceOf(LogNotSaved);
    expect(general).toHaveLength(2);
  });

  it('de kaart Van je horloge: Opslaan, van tab gewisseld, schrijven faalt geeft precies een melding bovenin; in beeld geen', async () => {
    for (const inView of [false, true]) {
      general = [];
      const put = vi.spyOn(SessionLogsRepo, 'add').mockRejectedValue(new Error('kapot'));
      let writeError: unknown;
      const outcome = await saveLogWithin(makeLogSession(), fromWatch, { onWriteError: (err) => { writeError = err; } });
      // show() van de kaart.
      if (outcome === 'failed') reportIfGone(inView, writeError, (err) => general.push(err));
      expect(outcome).toBe('failed');
      expect(general).toHaveLength(inView ? 0 : 1);
      put.mockRestore();
    }
  });

  it('de sportvraag: blad dicht terwijl het bezig is en dan nee geeft precies een melding bovenin; in beeld geen', async () => {
    for (const alive of [false, true]) {
      general = [];
      const put = vi.spyOn(SessionLogsRepo, 'add').mockRejectedValue(new Error('kapot'));
      let chosen = 0;
      await expect(saveLogThenChoice(makeLogSession(), fromWatch, async () => void chosen++, 8000, (err, late) => reportIfGone(!late && alive, err, (e) => general.push(e)))).rejects.toBeInstanceOf(LogNotSaved);
      expect(general).toHaveLength(alive ? 0 : 1);
      expect(chosen).toBe(0);
      put.mockRestore();
    }
  });

  it('de sportvraag: een laat nee na de grens gaat altijd bovenin, ook als het blad er nog staat', async () => {
    const fail = hangingPut();
    const alive = true;
    const lates: boolean[] = [];
    const caught = await saveLogThenChoice(makeLogSession(), fromWatch, async () => undefined, 20, (err, late) => { lates.push(late); reportIfGone(!late && alive, err, (e) => general.push(e)); }).catch((e: unknown) => e);
    expect(caught).toBeInstanceOf(TimeoutError);
    expect(general).toEqual([]);
    fail();
    await vi.waitFor(() => expect(lates).toEqual([true]));
    expect(general).toHaveLength(1);
  });

  it('vanzelf afvinken is bewust stil, ook bij een laat nee', async () => {
    const fail = hangingPut();
    const late: LogSaveResult[] = [];
    expect(await autoTickLog(makeLogSession(), fromWatch, async () => undefined, { limitMs: 20, onLate: (r) => late.push(r) })).toBe('slow');
    fail();
    await vi.waitFor(() => expect(late).toEqual(['failed']));
    expect(general).toEqual([]);
  });

  it('nee zonder schrijffout (een eerdere poging loopt nog) terwijl het scherm weg is: geen melding', () => {
    reportIfGone(false, undefined, (err) => general.push(err));
    expect(general).toEqual([]);
  });

  it('een fout na het schrijven gaat nog wel bovenin: het log staat er, het scherm zegt opgeslagen', async () => {
    const deps: LogSessionDeps = { settings: {} as LogSessionDeps['settings'], loggingInFlight: { current: new Set<string>() }, reportStorageError: (err) => general.push(err), refresh: () => Promise.reject(new Error('kapot')), announceSaved: () => undefined };
    expect(await saveLogWithin((input, opts) => runLogSession(input, opts, deps), fromWatch)).toBe('saved');
    expect(general).toHaveLength(1);
    expect((general[0] as Error).name).toBe('LogStoredFollowUpFailed');
  });

  it('de back-uptip gaat niet verloren: eerst de gewone zin, bij een tweede schrijffout op rij dezelfde zin met de reden erachter', async () => {
    const put = vi.spyOn(SessionLogsRepo, 'add').mockRejectedValue(new Error('kapot'));
    const logSession = makeLogSession();
    expect(await saveLogWithin(logSession, fromWatch, own)).toBe('failed');
    expect(failedNote(FORM_SAVE_NOTE.failedLoose)).toBe(FORM_SAVE_NOTE.failedLoose);
    expect(await saveLogWithin(logSession, fromWatch, own)).toBe('failed');
    // De eigen zin blijft ("kijk eerst in je logboek", "je invulling staat er nog"), de tip komt erachter.
    expect(failedNote(FORM_SAVE_NOTE.failedLoose).startsWith(`${FORM_SAVE_NOTE.failedLoose} `)).toBe(true);
    expect(failedNote(FORM_SAVE_NOTE.failedLoose)).toContain('back-up via Instellingen, Gegevens en back-up');
    expect(general).toEqual([]);
    put.mockRestore();
  });

  it('"op rij": fout, gelukt, fout geeft weer de gewone zin, ook over schermen heen', async () => {
    const logSession = makeLogSession();
    const fails = () => vi.spyOn(SessionLogsRepo, 'add').mockRejectedValue(new Error('kapot'));
    let put = fails();
    expect(await saveLogWithin(logSession, fromWatch, own)).toBe('failed');
    put.mockRestore();
    expect(await saveLogWithin(logSession, fromWatch, own)).toBe('saved');
    put = fails();
    expect(await saveLogWithin(logSession, { ...fromWatch, externalId: 'x2' }, own)).toBe('failed');
    expect(failedNote(LOG_SAVE_NOTE.failed)).toBe(LOG_SAVE_NOTE.failed);
    // De teller is van de app, niet van een scherm: de volgende fout, op een ander scherm (het blad), is de tweede.
    expect(await logOrAlready(logSession, { ...fromWatch, externalId: 'x3' }, () => undefined)).toBe(false);
    expect(failedNote(FORM_SAVE_NOTE.failed)).not.toBe(FORM_SAVE_NOTE.failed);
    put.mockRestore();
  });

  it('de opslag is vol: de tweede keer zegt het scherm dat erbij', async () => {
    vi.spyOn(SessionLogsRepo, 'add').mockRejectedValue(full());
    const logSession = makeLogSession();
    await saveLogWithin(logSession, fromWatch, own);
    await saveLogWithin(logSession, fromWatch, own);
    expect(failedNote(FORM_SAVE_NOTE.failed)).toBe(`${FORM_SAVE_NOTE.failed} De opslag op deze telefoon is vol. Maak een back-up en ruim ruimte op.`);
  });

  it('twee keer nee zonder schrijffout (een eerdere poging loopt nog): de gewone zin blijft', async () => {
    const never = () => Promise.resolve(false);
    expect(await saveLogWithin(never, fromWatch)).toBe('failed');
    expect(await saveLogWithin(never, fromWatch)).toBe('failed');
    expect(failedNote(LOG_SAVE_NOTE.failed)).toBe(LOG_SAVE_NOTE.failed);
  });

  it('de sportvraag: alleen een schrijffout is mislukt (amber); te lang of een eerdere poging die nog loopt is de zin van de grens', async () => {
    expect(thrownSaveNote(new TimeoutError())).toEqual({ kind: 'slow', text: LOG_SAVE_NOTE.slow });
    // Nee omdat de eerste poging nog loopt: geen schrijffout.
    const running = await saveLogThenChoice(() => Promise.resolve(false), fromWatch, async () => undefined, 8000).catch((e: unknown) => e);
    expect(running).toBeInstanceOf(LogNotSaved);
    // Nog eens tikken helpt dan niet: de zin zegt wat wel helpt, en is niet amber.
    expect(thrownSaveNote(running)).toEqual({ kind: 'slow', text: LOG_STILL_RUNNING_NOTE });
    // Een echte schrijffout.
    resetFailedNotes();
    vi.spyOn(SessionLogsRepo, 'add').mockRejectedValue(new Error('kapot'));
    const failed = await saveLogThenChoice(makeLogSession(), fromWatch, async () => undefined, 8000, () => undefined).catch((e: unknown) => e);
    expect(thrownSaveNote(failed)).toEqual({ kind: 'failed', text: LOG_SAVE_NOTE.failed });
  });

  it('een woordenset: mislukt en traag beginnen overal hetzelfde, en traag met de knop uit zegt niet "probeer"', () => {
    for (const text of [LOG_SAVE_NOTE.failed, FORM_SAVE_NOTE.failed, FORM_SAVE_NOTE.failedLoose]) expect(text.startsWith('Opslaan lukte niet.')).toBe(true);
    for (const text of [LOG_SAVE_NOTE.slow, FORM_SAVE_NOTE.slow]) expect(text.startsWith('Opslaan duurt langer dan verwacht.')).toBe(true);
    expect(FORM_SAVE_NOTE.slow).not.toMatch(/probeer/i);
    // Een losse training: wat je kunt doen, zonder advies dat je invulling kost (het concept overleeft afsluiten niet).
    // Met de uitweg (sluiten en opnieuw) en kort genoeg voor twee regels op 360 px (I-30).
    expect(FORM_SAVE_NOTE.slowLoose.startsWith('Opslaan duurt langer dan verwacht.')).toBe(true);
    expect(FORM_SAVE_NOTE.slowLoose).toMatch(/logboek/);
    expect(FORM_SAVE_NOTE.slowLoose).toMatch(/Sluit en probeer opnieuw/);
    expect(FORM_SAVE_NOTE.slowLoose).toMatch(/je invulling blijft bewaard/);
    expect(FORM_SAVE_NOTE.slowLoose).not.toMatch(/ASCEND|de app/);
    expect(FORM_SAVE_NOTE.slowLoose.length).toBeLessThanOrEqual(110);
    expect(HOW_TEXT.slowLoose).toBe(FORM_SAVE_NOTE.slowLoose);
    expect(howSrc).toMatch(/: still \? HOW_TEXT\.stillWaiting : waited \? HOW_TEXT\.waited : loose \? HOW_TEXT\.slowLoose : HOW_TEXT\.slow\}/);
    // Een eerdere poging loopt nog (I-135): zelfde begin, geen advies om de app af te sluiten, kort genoeg op 360 px.
    for (const text of [HOW_TEXT.stillWaiting, HOW_TEXT.waited]) {
      expect(text.startsWith('Opslaan duurt langer dan verwacht.')).toBe(true);
      expect(text).not.toMatch(/ASCEND|de app/);
      expect(text).toMatch(/je invulling blijft bewaard/i);
    }
    expect(HOW_TEXT.stillWaiting.length).toBeLessThanOrEqual(110);
    expect(HOW_TEXT.slow).toBe(FORM_SAVE_NOTE.slow);
    expect(HOW_TEXT.failed).toBe(FORM_SAVE_NOTE.failed);
    expect(HOW_TEXT.failedLoose).toBe(FORM_SAVE_NOTE.failedLoose);
  });

  it('de schermen: de sportvraag en het blad Hoe ging het? tonen de zin uit de set, niet meer "Dit lukte niet"', () => {
    expect(sportSrc).not.toContain('Dit lukte niet');
    expect(sportSrc.match(/setError\(thrownSaveNote\(err\)\)/g)).toHaveLength(2);
    expect(sportSrc.match(/error\.kind === 'failed' \? 'st-hint warn' : 'st-hint'/g)).toHaveLength(2);
    expect(howSrc).toMatch(/save: \(\) => logOrAlready\(logSession, input, /);
    // De zin wordt vastgelegd bij de uitkomst, niet gelezen in de render; en een blad dat al dicht is meldt bovenin.
    // Vanaf het begin van het sluiten (onLeave van useSheetClose) telt het blad niet meer als in beeld.
    expect(howSrc).toMatch(/reportIfGone\(!leavingRef\.current && !closedRef\.current && !goneRef\.current, writeError, reportStorageError\);[\s\S]*?setFailedText\(failedNote\(/);
    expect(howSrc).toMatch(/\}, 200, canClose, \(\) => \{ leavingRef\.current = true; \}\);/);
    // Twee keer: mislukt bij Opslaan, en mislukt na het wachten op een eerdere poging (I-135).
    expect(howSrc.match(/failedNote\(/g)).toHaveLength(2);
    // De sportvraag: vanaf het begin van het sluiten niet meer in beeld (I-32).
    expect(sportSrc.match(/SAVE_TIMEOUT_MS, \(err, late\) => reportIfGone\(!late && alive\.current && !leaving\.current, err, reportStorageError\)\);/g)).toHaveLength(2);
    expect(sportSrc.match(/onLeave=\{\(\) => \{ leaving\.current = true; \}\}/g)).toHaveLength(2);
    expect(sportSrc.match(/const alive = useAlive\(\);/g)).toHaveLength(2);
    expect(howSrc).toMatch(/goneRef\.current = true;/);
    // Vanzelf afvinken: het late antwoord haalt de activiteit uit de lijst van wat nog loopt.
    expect(watchSrc).toMatch(/\{ onLate: \(\) => lateOutstanding\.current\.delete\(activity\.externalId\) \}/);
  });
});

describe('formAfterSave en closeClearsDraft: wat het oude trainingsscherm doet', () => {
  it('saved: concept weg, scherm dicht', () => {
    expect(formAfterSave('saved')).toMatchObject({ clearDraft: true, close: true });
    expect(formAfterSave('saved').note).toBeUndefined();
  });

  it('nee houdt de invoer: bij failed en already blijft het concept, het scherm open, de knop weer aan, met een zin', () => {
    expect(formAfterSave('failed')).toEqual({ clearDraft: false, close: false, buttonOff: false, note: 'failed' });
    expect(formAfterSave('already')).toEqual({ clearDraft: false, close: false, buttonOff: false, note: 'already' });
  });

  it('na de grens: de zin, het concept blijft, en de knop blijft uit tot het opslaan klaar is', () => {
    expect(formAfterSave('slow')).toEqual({ clearDraft: false, close: false, buttonOff: true, note: 'slow' });
  });

  it('Terug of Annuleren wist het concept, behalve zolang er opgeslagen wordt', () => {
    expect(closeClearsDraft(false)).toBe(true);
    expect(closeClearsDraft(true)).toBe(false);
  });

  it('na de grens weggaan en dan een late nee: het concept is nooit gewist; een late ja wist het zelf', () => {
    // De knop is uit zolang het opslaat, en dat is dezelfde stand waarin weggaan het concept laat staan.
    expect(closeClearsDraft(formAfterSave('slow').buttonOff)).toBe(false);
    expect(formAfterSave('failed').clearDraft).toBe(false);
    expect(formAfterSave('saved').clearDraft).toBe(true);
    // Na een nee die al op het scherm staat is Annuleren weer gewoon weggooien.
    expect(closeClearsDraft(formAfterSave('failed').buttonOff)).toBe(true);
  });

  it('het scherm heeft voor elke zin woorden, en "stond er al" komt uit een bron', () => {
    for (const kind of ['slow', 'failed', 'already'] as const) expect(HOW_TEXT[kind].length).toBeGreaterThan(10);
    expect(HOW_TEXT.already).toBe(ALREADY_LOGGED_NOTE);
    expect(LOG_SAVE_NOTE.already).toBe(ALREADY_LOGGED_NOTE);
  });
});

describe('cardAfterSave: wat de kaart Van je horloge doet', () => {
  it('saved: blad dicht, het profiel wordt opgehaald, geen zin', () => {
    expect(cardAfterSave('saved')).toEqual({ closeSheet: true, addDetail: true, refresh: false });
  });

  it('nee zonder log: het blad Andere training blijft open, met de foutzin', () => {
    expect(cardAfterSave('failed')).toEqual({ closeSheet: false, addDetail: false, refresh: false, note: 'failed' });
  });

  it('na de grens: het blad blijft open, met de zin van de grens', () => {
    expect(cardAfterSave('slow')).toEqual({ closeSheet: false, addDetail: false, refresh: false, note: 'slow' });
  });

  it('een tweede tik terwijl de eerste na de grens nog loopt: niet "lukte niet" en niet nog eens "probeer het nog eens"', () => {
    expect(cardAfterSave('failed', true).note).toBe('stillRunning');
    expect(cardAfterSave('slow', true).note).toBe('slow');
    expect(LOG_STILL_RUNNING_NOTE.startsWith('Opslaan duurt langer dan verwacht.')).toBe(true);
    expect(LOG_STILL_RUNNING_NOTE).not.toMatch(/probeer/i);
    expect(LOG_STILL_RUNNING_NOTE).toMatch(/open hem opnieuw/);
    expect(cardAfterSave('failed', true).closeSheet).toBe(false);
  });

  it('stond er al: blad dicht, logboek opnieuw lezen, geen profiel ophalen', () => {
    expect(cardAfterSave('already')).toEqual({ closeSheet: true, addDetail: false, refresh: true, note: 'already' });
    expect(cardAfterSave('already', true).note).toBe('already');
  });
});

describe('de schermen lezen het antwoord van logSession via state/logSave.ts', () => {
  it('het oude trainingsscherm: alleen via saveOnLogger; het gedrag staat hieronder in saveOnLogger', () => {
    // De enige band met het scherm: hoe het opslaat en dat weggaan het concept alleen buiten het opslaan wist.
    expect(loggerSrc).not.toMatch(/await logSession\(/);
    expect(loggerSrc).toMatch(/await saveOnLogger\(logSession, input, \{/);
    expect(loggerSrc).toMatch(/busy: \(on\) => \{ savingRef\.current = on;/);
    expect(loggerSrc).toContain('const slow = loggerShowsClose(saving, saveNote);');
    expect(loggerSrc).toMatch(/\{slow \? \(\s*\/\/[^\n]*\n\s*<SecondaryButton onClick=\{requestClose\}[^>]*>Sluiten</);
    expect(loggerSrc).toMatch(/if \(closeClearsDraft\(savingRef\.current\)\) form\.clearDraft\(\);/);
  });

  it('de kaart Van je horloge en het blad van een training (MacroFactor): opslaan via saveOnCard, nooit kaal', () => {
    expect(watchSrc).not.toMatch(/await logSession\(/);
    expect(watchSrc).toMatch(/autoTickLog\(logSession,/);
    expect(watchSrc).toMatch(/await saveOnCard\(logSession,/);
    // In beeld is: de kaart toont deze activiteit nog als voorstel.
    expect(watchSrc).toMatch(/showing: \(\) => shownRef\.current === id,/);
    expect(watchSrc).toMatch(/shownRef\.current = proposal\?\.activity\.externalId;/);
    // Het blad gaat verder alleen dicht via zijn eigen Annuleren (onClose).
    expect(watchSrc.match(/setChoosing\(false\)/g)).toHaveLength(2);
    // De zin staat vast onderin het blad, in beeld bij een lange lijst.
    expect(watchSrc).toMatch(/sticky bottom-0[^\n]*\n\s*\{saving \? <SaveNoteLine/);
    expect(actionSrc).not.toMatch(/[^.\w]logSession\(workoutToDraft/);
    expect(actionSrc).toMatch(/void saveOnCard\(logSession, workoutToDraft\(/);
    expect(actionSrc).toMatch(/showing: \(\) => !leavingRef\.current,/);
    expect(actionSrc).toMatch(/useSheetClose\(onClose, 200, undefined, \(\) => \{ leavingRef\.current = true; \}\);/);
    // Forge: het blad telt niet meer als in beeld zodra het begint te sluiten of al zei dat het langer duurt.
    expect(finishSrc).toMatch(/onLeave=\{\(\) => \{ away\.current = true; \}\}/);
    expect(finishSrc).toMatch(/return !late && !away\.current;/);
  });

  it('de sportvraag: beide bladen via saveLogThenChoice', () => {
    expect(sportSrc.match(/saveLogThenChoice\(logSession,/g)).toHaveLength(2);
    expect(sportSrc).not.toMatch(/await logSession\(/);
  });
});

// Gedrag van Opslaan op de kaart Van je horloge en op het blad van een training, zonder scherm: de kaart en het
// blad geven alleen hun toestand door (CardSaveUi). Per pad wat de gebruiker ziet.
describe('saveOnCard: per pad wat je ziet', () => {
  function screen(over: Partial<CardSaveUi> = {}) {
    const seen = { notes: [] as (ShownSaveNote | undefined)[], closed: 0, refreshed: 0, stored: 0, mounted: true, showing: true };
    const ui: CardSaveUi = {
      outstanding: new Set<string>(),
      mounted: () => seen.mounted,
      showing: () => seen.showing,
      report: (err) => general.push(err),
      onStored: () => { seen.stored += 1; },
      apply: (next) => { seen.notes.push(next.note); if (next.closeSheet) seen.closed += 1; if (next.refresh) seen.refreshed += 1; },
      limitMs: 20,
      ...over,
    };
    return { ui, seen };
  }
  // Een schrijven dat hangt tot de test het laat slagen of mislukken.
  function heldPut() {
    const real = SessionLogsRepo.add.bind(SessionLogsRepo);
    let go!: (fail?: Error) => void;
    const hold = new Promise<Error | undefined>((resolve) => (go = resolve));
    vi.spyOn(SessionLogsRepo, 'add').mockImplementation(async (log) => {
      const fail = await hold;
      if (fail) throw fail;
      return real(log);
    });
    return go;
  }

  it('in beeld, gelukt: blad dicht, geen zin, het profiel wordt opgehaald, een log', async () => {
    const { ui, seen } = screen();
    expect(await saveOnCard(makeLogSession(), fromWatch, 'x1', ui)).toBe('saved');
    expect(seen).toMatchObject({ notes: [undefined], closed: 1, stored: 1 });
    expect(await SessionLogsRepo.getAll()).toHaveLength(1);
    expect(general).toEqual([]);
  });

  it('in beeld, een fout halverwege: de amber zin, het blad blijft open, niets bovenin, geen half log', async () => {
    vi.spyOn(SessionLogsRepo, 'add').mockRejectedValue(new Error('kapot'));
    const { ui, seen } = screen();
    expect(await saveOnCard(makeLogSession(), fromWatch, 'x1', ui)).toBe('failed');
    expect(seen.notes).toEqual([{ text: LOG_SAVE_NOTE.failed, warn: true }]);
    expect(seen.closed).toBe(0);
    expect(general).toEqual([]);
    expect(await SessionLogsRepo.getAll()).toHaveLength(0);
  });

  it('de kaart toont intussen een ander voorstel: de fout gaat bovenin, en er blijft geen zin achter die later opduikt', async () => {
    const fail = heldPut();
    const { ui, seen } = screen();
    expect(await saveOnCard(makeLogSession(), fromWatch, 'x1', ui)).toBe('slow');
    expect(seen.notes).toEqual([{ text: LOG_SAVE_NOTE.slow, warn: false }]);
    seen.showing = false;
    fail(new Error('kapot'));
    await vi.waitFor(() => expect(general).toHaveLength(1));
    expect(seen.notes).toEqual([{ text: LOG_SAVE_NOTE.slow, warn: false }, undefined]);
    expect(ui.outstanding.size).toBe(0);
  });

  it('weg (van tab gewisseld) en dan een laat nee: bovenin, en het scherm wordt niet meer aangeraakt', async () => {
    const fail = heldPut();
    const { ui, seen } = screen();
    await saveOnCard(makeLogSession(), fromWatch, 'x1', ui);
    seen.mounted = false;
    fail(new Error('kapot'));
    await vi.waitFor(() => expect(general).toHaveLength(1));
    expect(seen.notes).toHaveLength(1);
  });

  it('laat antwoord in beeld: eerst de zin van de grens, dan ja (blad dicht) of nee (amber), nooit bovenin', async () => {
    let go = heldPut();
    let s = screen();
    await saveOnCard(makeLogSession(), fromWatch, 'x1', s.ui);
    go();
    await vi.waitFor(() => expect(s.seen.closed).toBe(1));
    expect(s.seen.notes).toEqual([{ text: LOG_SAVE_NOTE.slow, warn: false }, undefined]);
    expect(s.seen.stored).toBe(1);
    vi.restoreAllMocks();
    go = heldPut();
    s = screen();
    await saveOnCard(makeLogSession(), { ...fromWatch, externalId: 'x2' }, 'x2', s.ui);
    go(new Error('kapot'));
    await vi.waitFor(() => expect(s.seen.notes).toHaveLength(2));
    expect(s.seen.notes[1]).toEqual({ text: LOG_SAVE_NOTE.failed, warn: true });
    expect(general).toEqual([]);
    expect(await SessionLogsRepo.getAll()).toHaveLength(1);
  });

  it('tweede poging terwijl de eerste na de grens nog loopt: "loopt nog" met wat helpt, en als de eerste landt een log', async () => {
    const go = heldPut();
    const { ui, seen } = screen();
    const logSession = makeLogSession();
    expect(await saveOnCard(logSession, fromWatch, 'x1', ui)).toBe('slow');
    // Opnieuw tikken, ook met een andere keuze (bij een geplande training): geen tweede log, geen "lukte niet".
    await PlannedSessionsRepo.put(planned);
    expect(await saveOnCard(logSession, { ...fromWatch, plannedSessionId: 'p1' }, 'x1', ui)).toBe('failed');
    expect(await saveOnCard(logSession, fromWatch, 'x1', ui)).toBe('failed');
    expect(seen.notes).toEqual([{ text: LOG_SAVE_NOTE.slow, warn: false }, { text: LOG_STILL_RUNNING_NOTE, warn: false }, { text: LOG_STILL_RUNNING_NOTE, warn: false }]);
    expect(general).toEqual([]);
    expect(ui.outstanding.has('x1')).toBe(true);
    go();
    await vi.waitFor(() => expect(seen.closed).toBe(1));
    expect(await SessionLogsRepo.getAll()).toHaveLength(1);
    expect(ui.outstanding.size).toBe(0);
  });

  it('automatisch: een vanzelf afvinken dat nog loopt, dan een tik op Opslaan geeft "loopt nog"', async () => {
    const go = heldPut();
    const { ui, seen } = screen();
    const logSession = makeLogSession();
    // Zoals de kaart: na de grens staat de activiteit bij wat nog loopt, het late antwoord haalt haar weg.
    expect(await autoTickLog(logSession, { ...fromWatch, quiet: true }, async () => undefined, { limitMs: 20, onLate: () => ui.outstanding.delete('x1') })).toBe('slow');
    ui.outstanding.add('x1');
    expect(await saveOnCard(logSession, fromWatch, 'x1', ui)).toBe('failed');
    expect(seen.notes).toEqual([{ text: LOG_STILL_RUNNING_NOTE, warn: false }]);
    go();
    await vi.waitFor(() => expect(ui.outstanding.size).toBe(0));
    expect(await SessionLogsRepo.getAll()).toHaveLength(1);
    expect(general).toEqual([]);
  });

  it('stond er al: de zin, het logboek opnieuw lezen, geen tweede log', async () => {
    const logSession = makeLogSession();
    await logSession(fromWatch);
    const { ui, seen } = screen();
    expect(await saveOnCard(logSession, fromWatch, 'x1', ui)).toBe('already');
    expect(seen).toMatchObject({ notes: [{ text: ALREADY_LOGGED_NOTE, warn: false }], closed: 1, refreshed: 1, stored: 0 });
    expect(await SessionLogsRepo.getAll()).toHaveLength(1);
  });
});

describe('Forge afronden: een van de twee, het blad of de melding bovenin', () => {
  // Zoals forge/ForgeSheets.tsx: settleWithOwnNotice met reportIfGone op `seen` van het blad.
  const forgeSave = (seen: () => boolean) => settleWithOwnNotice(makeLogSession(), forPlanned, (err) => reportIfGone(seen(), err, (e) => general.push(e)));

  it('in beeld: de eigen zin over je sets, niets bovenin; bij de tweede fout op rij de reden erbij', async () => {
    await PlannedSessionsRepo.put(planned);
    vi.spyOn(SessionLogsRepo, 'add').mockRejectedValue(new Error('kapot'));
    await expect(forgeSave(() => true)).rejects.toBeInstanceOf(LogNotSaved);
    expect(general).toEqual([]);
    expect(forgeFinishNote('failed')).toEqual({ text: 'Opslaan lukte niet. Je sets blijven bewaard. Probeer het zo nog eens.', warn: true });
    await expect(forgeSave(() => true)).rejects.toBeInstanceOf(LogNotSaved);
    expect(forgeFinishNote('failed').text).toContain('back-up via Instellingen, Gegevens en back-up');
    expect(general).toEqual([]);
    expect(await SessionLogsRepo.getAll()).toHaveLength(0);
  });

  it('blad weg, aan het sluiten of na de grens: de fout gaat bovenin', async () => {
    await PlannedSessionsRepo.put(planned);
    vi.spyOn(SessionLogsRepo, 'add').mockRejectedValue(new Error('kapot'));
    await expect(forgeSave(() => false)).rejects.toBeInstanceOf(LogNotSaved);
    expect(general).toHaveLength(1);
  });

  it('gelukt en "stond er al": ja en nee zonder fout, een log', async () => {
    await PlannedSessionsRepo.put(planned);
    expect(await forgeSave(() => true)).toBe(true);
    expect(await forgeSave(() => true)).toBe(false);
    expect(await SessionLogsRepo.getAll()).toHaveLength(1);
    expect(general).toEqual([]);
  });

  it('de zinnen: alleen mislukt is amber, en het begin is dat van elk scherm', () => {
    expect(forgeFinishNote('slow')).toEqual({ text: 'Opslaan duurt langer dan verwacht. Je sets blijven bewaard. Probeer het zo nog eens.', warn: false });
    // Dezelfde woorden als Hoe ging het? bij een poging die nog loopt, zonder "sluit de app" (I-135).
    expect(forgeFinishNote('stillRunning')).toEqual({ text: HOW_TEXT.stillWaiting, warn: false });
    expect(forgeFinishNote('waited')).toEqual({ text: HOW_TEXT.waited, warn: false });
    expect(forgeFinishNote('stillRunning').text).not.toMatch(/sluit de app/i);
    expect(forgeFinishNote('already').warn).toBe(false);
  });
});

describe('een losse training met een andere invulling terwijl de eerste hangt', () => {
  const looseA: LogSessionInput = { templateId: 'tpl_hang', type: 'cardio', variant: 'full', durationMinutes: 40, completedDate: '2026-11-09' };

  it('de eerste antwoordt nooit binnen de grens: de tweede zegt ook "duurt langer", schrijft niets, en na het antwoord een log', async () => {
    const real = SessionLogsRepo.add.bind(SessionLogsRepo);
    let go!: () => void;
    const hold = new Promise<void>((resolve) => (go = resolve));
    vi.spyOn(SessionLogsRepo, 'add').mockImplementation(async (log) => { await hold; return real(log); });
    const logSession = makeLogSession();
    const late: LogSaveResult[] = [];
    expect(await saveLogWithin(logSession, looseA, { limitMs: 20, onLate: (r) => late.push(r) })).toBe('slow');
    expect(formAfterSave('slow').note).toBe('slow');
    expect(await saveLogWithin(logSession, { ...looseA, durationMinutes: 55 }, { limitMs: 20, onLate: (r) => late.push(r), onWriteError: (err) => general.push(err) })).toBe('slow');
    expect(await SessionLogsRepo.getAll()).toHaveLength(0);
    go();
    // De eerste landt; de tweede krijgt nee zonder schrijffout: "kijk eerst in je logboek", haar invulling blijft staan.
    await vi.waitFor(() => expect(late).toEqual(['saved', 'failed']));
    const logs = await SessionLogsRepo.getAll();
    expect(logs).toHaveLength(1);
    expect(logs[0].durationMinutes).toBe(40);
    expect(general).toEqual([]);
    expect(formAfterSave('failed')).toMatchObject({ clearDraft: false, close: false, note: 'failed' });
    expect(failedNote(FORM_SAVE_NOTE.failedLoose)).toBe(FORM_SAVE_NOTE.failedLoose);
  });
});

// Gedrag van Opslaan op het oude trainingsscherm (ExerciseLogger.tsx), zonder scherm: het scherm geeft alleen zijn
// toestand door (LoggerSaveUi). Per pad wat je ziet (I-32, bronscans vervangen).
describe('saveOnLogger: het oude trainingsscherm, per pad wat je ziet', () => {
  const loose: LogSessionInput = { templateId: 'tpl_cycling', type: 'cardio', variant: 'full', durationMinutes: 45 };
  function screen(over: Partial<LoggerSaveUi> = {}) {
    const seen = { notes: [] as (ShownSaveNote | null)[], closed: 0, drafts: 0, busy: [] as boolean[], mounted: true, showing: true };
    const ui: LoggerSaveUi = {
      loose: false,
      mounted: () => seen.mounted,
      showing: () => seen.showing,
      busy: (on) => { seen.busy.push(on); },
      clearDraft: () => { seen.drafts += 1; },
      report: (err) => general.push(err),
      apply: (next) => { if (next.close) seen.closed += 1; else seen.notes.push(next.note); },
      limitMs: 20,
      ...over,
    };
    return { ui, seen };
  }
  function heldPut() {
    const real = SessionLogsRepo.add.bind(SessionLogsRepo);
    let go!: (fail?: Error) => void;
    const hold = new Promise<Error | undefined>((resolve) => (go = resolve));
    vi.spyOn(SessionLogsRepo, 'add').mockImplementation(async (log) => {
      const fail = await hold;
      if (fail) throw fail;
      return real(log);
    });
    return go;
  }
  const settle = () => new Promise((r) => setTimeout(r, 60));

  it('bezig staat aan voordat logSession begint: Annuleren tijdens het opslaan wist het concept dan niet', async () => {
    const order: string[] = [];
    const { ui } = screen({ busy: (on) => order.push(`busy ${on}`) });
    await saveOnLogger(async () => { order.push('logSession'); return true; }, forPlanned, ui);
    expect(order[0]).toBe('busy true');
    expect(order.indexOf('busy true')).toBeLessThan(order.indexOf('logSession'));
    expect(closeClearsDraft(true)).toBe(false);
  });

  it('gelukt: concept weg, scherm dicht, geen zin, een log', async () => {
    await PlannedSessionsRepo.put(planned);
    const { ui, seen } = screen();
    expect(await saveOnLogger(makeLogSession(), forPlanned, ui)).toBe('saved');
    expect(seen).toMatchObject({ closed: 1, drafts: 1, notes: [] });
    expect(await SessionLogsRepo.getAll()).toHaveLength(1);
    expect(general).toEqual([]);
  });

  it('in beeld mislukt: de amber zin, concept blijft, knop weer aan, niets bovenin', async () => {
    await PlannedSessionsRepo.put(planned);
    vi.spyOn(SessionLogsRepo, 'add').mockRejectedValue(new Error('kapot'));
    const { ui, seen } = screen();
    expect(await saveOnLogger(makeLogSession(), forPlanned, ui)).toBe('failed');
    expect(seen.notes).toEqual([{ text: FORM_SAVE_NOTE.failed, warn: true }]);
    expect(seen).toMatchObject({ closed: 0, drafts: 0 });
    expect(seen.busy.at(-1)).toBe(false);
    expect(general).toEqual([]);
  });

  it('een losse training die mislukt: eerst in je logboek kijken', async () => {
    vi.spyOn(SessionLogsRepo, 'add').mockRejectedValue(new Error('kapot'));
    const { ui, seen } = screen({ loose: true });
    expect(await saveOnLogger(makeLogSession(), loose, ui)).toBe('failed');
    expect(seen.notes).toEqual([{ text: FORM_SAVE_NOTE.failedLoose, warn: true }]);
  });

  it('stond er al: de zin, niet amber, knop weer aan, concept blijft', async () => {
    await PlannedSessionsRepo.put(planned);
    const logSession = makeLogSession();
    await logSession(forPlanned);
    const { ui, seen } = screen();
    expect(await saveOnLogger(logSession, forPlanned, ui)).toBe('already');
    expect(seen.notes).toEqual([{ text: ALREADY_LOGGED_NOTE, warn: false }]);
    expect(seen).toMatchObject({ closed: 0, drafts: 0 });
    expect(seen.busy.at(-1)).toBe(false);
  });

  it('een losse training na de grens: een wachtzin met uitweg, knop uit; landt hij later, dan dicht en concept weg', async () => {
    const go = heldPut();
    const { ui, seen } = screen({ loose: true });
    expect(await saveOnLogger(makeLogSession(), loose, ui)).toBe('slow');
    expect(seen.notes).toEqual([{ text: FORM_SAVE_NOTE.slowLoose, warn: false }]);
    expect(FORM_SAVE_NOTE.slowLoose).toMatch(/Sluit en probeer opnieuw/);
    expect(seen.busy.at(-1)).toBe(true);
    expect(seen.drafts).toBe(0);
    go();
    await settle();
    expect(seen).toMatchObject({ closed: 1, drafts: 1 });
    expect(await SessionLogsRepo.getAll()).toHaveLength(1);
  });

  it('een geplande training na de grens: de korte wachtzin', async () => {
    await PlannedSessionsRepo.put(planned);
    const go = heldPut();
    const { ui, seen } = screen();
    expect(await saveOnLogger(makeLogSession(), forPlanned, ui)).toBe('slow');
    expect(seen.notes).toEqual([{ text: FORM_SAVE_NOTE.slow, warn: false }]);
    go();
    await settle();
  });

  it('weg na de grens en dan mislukt: de fout bovenin, het concept blijft, geen zin op een scherm dat er niet is', async () => {
    const go = heldPut();
    const { ui, seen } = screen({ loose: true });
    await saveOnLogger(makeLogSession(), loose, ui);
    seen.mounted = false;
    go(new Error('kapot'));
    await settle();
    expect(general).toHaveLength(1);
    expect(seen.notes).toHaveLength(1);
    expect(seen.drafts).toBe(0);
  });

  it('aan het sluiten en dan mislukt: telt als weg, de fout gaat bovenin', async () => {
    const go = heldPut();
    const { ui, seen } = screen({ loose: true });
    await saveOnLogger(makeLogSession(), loose, ui);
    seen.showing = false;
    go(new Error('kapot'));
    await settle();
    expect(general).toHaveLength(1);
  });

  it('formNoteText: zonder uitkomst geen zin; alleen mislukt is amber', () => {
    expect(formNoteText(undefined, true)).toBeNull();
    expect(formNoteText('slow', false)).toEqual({ text: FORM_SAVE_NOTE.slow, warn: false });
    expect(formNoteText('failed', false)?.warn).toBe(true);
    // Oud scherm, tweede tik terwijl de eerste loopt: nooit "sluit de app" (je invulling staat in sessionStorage).
    const still = formNoteText('stillRunning', false);
    expect(still).toEqual({ text: FORM_SAVE_NOTE.slowLoose, warn: false });
    expect(still?.text).not.toMatch(/app/);
  });
});

describe('logOrAlready: het blad Hoe ging het? onderscheidt stond er al van mislukt (I-32)', () => {
  it('ja, stond er al, of mislukt', async () => {
    await PlannedSessionsRepo.put(planned);
    const logSession = makeLogSession();
    expect(await logOrAlready(logSession, forPlanned)).toBe(true);
    expect(await logOrAlready(logSession, forPlanned)).toBe('already');
    vi.spyOn(SessionLogsRepo, 'add').mockRejectedValue(new Error('kapot'));
    expect(await logOrAlready(logSession, { ...forPlanned, plannedSessionId: undefined, templateId: 'tpl_bike' }, () => undefined)).toBe(false);
  });

  it('nee zonder log is mislukt, nooit stond er al', async () => {
    expect(await logOrAlready(async () => false, forPlanned, () => undefined)).toBe(false);
  });
});

describe('tickOff: afvinken met één tik op Vandaag en Week (I-32)', () => {
  function notice() {
    const seen = { reported: [] as unknown[], withdrawn: [] as unknown[], refreshed: 0 };
    const n: TickOffNotice = { report: (e) => seen.reported.push(e), withdraw: (e) => seen.withdrawn.push(e), refresh: () => { seen.refreshed += 1; } };
    return { n, seen };
  }
  function heldPut() {
    const real = SessionLogsRepo.add.bind(SessionLogsRepo);
    let go!: (fail?: Error) => void;
    const hold = new Promise<Error | undefined>((resolve) => (go = resolve));
    vi.spyOn(SessionLogsRepo, 'add').mockImplementation(async (log) => { const fail = await hold; if (fail) throw fail; return real(log); });
    return go;
  }
  const settle = () => new Promise((r) => setTimeout(r, 60));

  it('gelukt: een log, niets bovenin', async () => {
    await PlannedSessionsRepo.put(planned);
    const { n, seen } = notice();
    expect(await tickOff(makeLogSession(), forPlanned, n)).toBe('saved');
    expect(await SessionLogsRepo.getAll()).toHaveLength(1);
    expect(seen.reported).toEqual([]);
    expect(general).toEqual([]);
  });

  it('stond er al: geen tweede log, geen melding, het logboek wordt opnieuw gelezen', async () => {
    await PlannedSessionsRepo.put(planned);
    const logSession = makeLogSession();
    await logSession(forPlanned);
    const { n, seen } = notice();
    expect(await tickOff(logSession, forPlanned, n)).toBe('already');
    expect(await SessionLogsRepo.getAll()).toHaveLength(1);
    expect(seen).toMatchObject({ reported: [], refreshed: 1 });
  });

  it('mislukt: precies een melding bovenin, met de zin van de schrijffout', async () => {
    await PlannedSessionsRepo.put(planned);
    vi.spyOn(SessionLogsRepo, 'add').mockRejectedValue(new Error('kapot'));
    const { n, seen } = notice();
    expect(await tickOff(makeLogSession(), forPlanned, n)).toBe('failed');
    expect(seen.reported).toHaveLength(1);
    expect(general).toEqual([]);
    expect(describeWriteError(seen.reported[0])).not.toBe(TICK_OFF_STILL_RUNNING);
  });

  it('na de grens: langer dan verwacht; landt het toch, dan wordt die melding ingetrokken', async () => {
    await PlannedSessionsRepo.put(planned);
    const go = heldPut();
    const { n, seen } = notice();
    expect(await tickOff(makeLogSession(), forPlanned, n, 10)).toBe('slow');
    expect(seen.reported.map(describeWriteError)).toEqual([TICK_OFF_STILL_RUNNING]);
    go();
    await settle();
    expect(seen.withdrawn.map(describeWriteError)).toEqual([TICK_OFF_STILL_RUNNING]);
    expect(await SessionLogsRepo.getAll()).toHaveLength(1);
  });

  it('na de grens, laat nee: de schrijffout komt bovenin, niets ingetrokken', async () => {
    await PlannedSessionsRepo.put(planned);
    const go = heldPut();
    const { n, seen } = notice();
    await tickOff(makeLogSession(), forPlanned, n, 10);
    go(new Error('kapot'));
    await settle();
    expect(seen.reported).toHaveLength(2);
    expect(describeWriteError(seen.reported[1])).not.toBe(TICK_OFF_STILL_RUNNING);
    expect(seen.withdrawn).toEqual([]);
  });

  it('een tweede tik terwijl de eerste loopt: nooit stil, de zin dat het loopt (Warden M1)', async () => {
    await PlannedSessionsRepo.put(planned);
    const go = heldPut();
    const logSession = makeLogSession();
    const first = notice();
    expect(await tickOff(logSession, forPlanned, first.n, 10)).toBe('slow');
    const second = notice();
    expect(await tickOff(logSession, forPlanned, second.n, 10)).toBe('failed');
    expect(second.seen.reported.map(describeWriteError)).toEqual([TICK_OFF_STILL_RUNNING]);
    expect(general).toEqual([]);
    go();
    await settle();
    expect(await SessionLogsRepo.getAll()).toHaveLength(1);
  });

  it('de zin raadt niet aan nog eens af te vinken: dezelfde uitweg als STILL_RUNNING_HELP', () => {
    expect(TICK_OFF_STILL_RUNNING.endsWith(STILL_RUNNING_HELP)).toBe(true);
    expect(TICK_OFF_STILL_RUNNING).not.toMatch(/nog eens af/);
  });
});

describe('saveOnLogger: een tweede poging terwijl de eerste hangt (Warden M2)', () => {
  function heldPut() {
    const real = SessionLogsRepo.add.bind(SessionLogsRepo);
    let go!: (fail?: Error) => void;
    const hold = new Promise<Error | undefined>((resolve) => (go = resolve));
    vi.spyOn(SessionLogsRepo, 'add').mockImplementation(async (log) => { const fail = await hold; if (fail) throw fail; return real(log); });
    return go;
  }
  const ui = (notes: (ShownSaveNote | null)[], over: Partial<LoggerSaveUi> = {}): LoggerSaveUi => ({
    loose: false, mounted: () => true, showing: () => true, busy: () => undefined, clearDraft: () => undefined,
    report: (e) => general.push(e), apply: (next) => { if (!next.close) notes.push(next.note); }, limitMs: 20, ...over,
  });

  it('gepland, scherm opnieuw open: de zin dat het nog loopt, niet amber mislukt; een log', async () => {
    await PlannedSessionsRepo.put(planned);
    const go = heldPut();
    const logSession = makeLogSession();
    expect(await saveOnLogger(logSession, forPlanned, ui([], { mounted: () => false }))).toBe('slow');
    const notes: (ShownSaveNote | null)[] = [];
    expect(await saveOnLogger(logSession, { ...forPlanned, durationMinutes: 50 }, ui(notes))).toBe('failed');
    expect(notes).toEqual([{ text: FORM_SAVE_NOTE.slowLoose, warn: false }]);
    go();
    await new Promise((r) => setTimeout(r, 60));
    expect(await SessionLogsRepo.getAll()).toHaveLength(1);
    expect(general).toEqual([]);
  });

  it('loggerNote: alleen een geplande training zonder schrijffout is "loopt nog"', () => {
    expect(loggerNote('failed', false, undefined)).toBe('stillRunning');
    expect(loggerNote('failed', false, new Error('kapot'))).toBe('failed');
    expect(loggerNote('failed', true, undefined)).toBe('failed');
    expect(loggerNote('slow', false, undefined)).toBe('slow');
    expect(loggerNote('saved', false, undefined)).toBeUndefined();
  });
});

describe('loggerShowsClose: Sluiten onderaan het oude trainingsscherm', () => {
  it('alleen na de grens, met de wachtzin', () => {
    expect(loggerShowsClose(true, formNoteText('slow', true))).toBe(true);
    expect(loggerShowsClose(true, formNoteText('slow', false))).toBe(true);
    // Voor de grens: nog geen zin. Na een laat nee: knop weer aan, amber.
    expect(loggerShowsClose(true, null)).toBe(false);
    expect(loggerShowsClose(false, formNoteText('failed', true))).toBe(false);
    expect(loggerShowsClose(false, formNoteText('already', false))).toBe(false);
  });

  it('aan het sluiten en dan gelukt: het concept gaat weg, maar het scherm sluit niet nog eens', async () => {
    await PlannedSessionsRepo.put(planned);
    const closes: boolean[] = [];
    let drafts = 0;
    await saveOnLogger(makeLogSession(), forPlanned, {
      loose: false, mounted: () => true, showing: () => false, busy: () => undefined,
      clearDraft: () => { drafts += 1; }, report: () => undefined, apply: (next) => closes.push(next.close), limitMs: 1000,
    });
    expect(drafts).toBe(1);
    expect(closes).toEqual([false]);
  });
});

describe('waitForEarlierSave: Opslaan weer aan zodra de eerdere poging klaar is of faalt (I-135)', () => {
  function heldAdd() {
    const real = SessionLogsRepo.add.bind(SessionLogsRepo);
    let go!: (fail?: Error) => void;
    const hold = new Promise<Error | undefined>((resolve) => (go = resolve));
    vi.spyOn(SessionLogsRepo, 'add').mockImplementation(async (log) => { const fail = await hold; if (fail) throw fail; return real(log); });
    return go;
  }

  it('de eerdere poging lukt: stored, en het blad toont de zin van al gedaan', async () => {
    await PlannedSessionsRepo.put(planned);
    const go = heldAdd();
    const logSession = makeLogSession();
    const first = logSession(forPlanned, { onWriteError: () => undefined });
    expect(await logSession({ ...forPlanned, durationMinutes: 50 }, { onWriteError: () => undefined })).toBe(false);
    const waiting = waitForEarlierSave(forPlanned, 1000);
    go();
    expect(await waiting).toBe('stored');
    expect(await first).toBe(true);
    expect(afterEarlierSave('stored')).toBe('already');
    expect(forgeAfterEarlier('stored')).toBe('already');
  });

  it('de eerdere poging faalt: free, Opslaan weer aan met de zin van mislukt', async () => {
    await PlannedSessionsRepo.put(planned);
    const go = heldAdd();
    const logSession = makeLogSession();
    const first = logSession(forPlanned, { onWriteError: () => undefined });
    const waiting = waitForEarlierSave(forPlanned, 1000);
    go(new Error('kapot'));
    expect(await waiting).toBe('free');
    expect(await first).toBe(false);
    expect(afterEarlierSave('free')).toBe('failed');
    expect(forgeAfterEarlier('free')).toBe('failed');
    vi.restoreAllMocks();
    expect(await logSession(forPlanned, { onWriteError: () => undefined })).toBe(true);
  });

  it('de eerdere poging antwoordt niet binnen de grens: slow, Opslaan weer aan met Sluiten als uitweg', async () => {
    await PlannedSessionsRepo.put(planned);
    const go = heldAdd();
    const logSession = makeLogSession();
    const first = logSession(forPlanned, { onWriteError: () => undefined });
    expect(await waitForEarlierSave(forPlanned, 20)).toBe('slow');
    expect(afterEarlierSave('slow')).toBe('waited');
    expect(forgeAfterEarlier('slow')).toBe('waited');
    expect(forgeExitLabel('waited')).toBe('Sluiten');
    go();
    expect(await first).toBe(true);
  });

  it('niets meer onderweg: meteen kijken in de opslag; een losse training is onbekend', async () => {
    await PlannedSessionsRepo.put(planned);
    expect(await waitForEarlierSave(forPlanned, 1000)).toBe('free');
    expect(await waitForEarlierSave({}, 1000)).toBe('unknown');
    expect(forgeAfterEarlier('unknown')).toBe('waited');
  });

  it('Forge heeft één uitweg met de woorden van Hoe ging het?', () => {
    expect(forgeExitLabel('stillRunning')).toBe(HOW_TEXT.close);
    expect(forgeExitLabel('slow')).toBe(HOW_TEXT.close);
    expect(forgeExitLabel('failed')).toBe(HOW_TEXT.cancel);
    expect(forgeExitLabel(undefined)).toBe(HOW_TEXT.cancel);
    expect(finishSrc).toContain('{forgeExitLabel(outcomeKind)}');
    expect(finishSrc).toContain('disabled={saving || waiting || tooShort}');
    expect(finishSrc).not.toContain('>Annuleren<');
  });
});

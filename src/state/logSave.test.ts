import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PlannedSessionsRepo, SessionLogsRepo, wipeAllData } from '../storage/database';
import { runLogSession, LogNotSaved, type LogSessionDeps, type LogSessionOpts } from './logSession';
import { autoTickLog, cardAfterSave, closeClearsDraft, failedNote, formAfterSave, logWithOwnNotice, reportIfGone, resetFailedNotes, saveLogThenChoice, saveLogWithin, thrownSaveNote, ChoiceNotSaved, CHOICE_NOT_SAVED, ALREADY_LOGGED_NOTE, FORM_SAVE_NOTE, LOG_SAVE_NOTE, type LogSaveResult } from './logSave';
import { HOW_TEXT } from '../components/logForm/howDidItGo';
import { TimeoutError } from '../utils/withTimeout';
import type { LogSessionInput } from './appDataTypes';

const loggerSrc = Object.values(import.meta.glob('../components/ExerciseLogger.tsx', { query: '?raw', import: 'default', eager: true }))[0] as string;
const watchSrc = Object.values(import.meta.glob('../components/WatchActivityCard.tsx', { query: '?raw', import: 'default', eager: true }))[0] as string;
const howSrc = Object.values(import.meta.glob('../components/HowDidItGoSheet.tsx', { query: '?raw', import: 'default', eager: true }))[0] as string;
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
    const put = vi.spyOn(SessionLogsRepo, 'put').mockRejectedValue(new Error('vol'));
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
    vi.spyOn(SessionLogsRepo, 'put').mockRejectedValue(new Error('vol'));
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
    const realPut = SessionLogsRepo.put.bind(SessionLogsRepo);
    vi.spyOn(SessionLogsRepo, 'put').mockImplementation(async (log) => {
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
    vi.spyOn(SessionLogsRepo, 'put').mockRejectedValue(new Error('vol'));
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
    vi.spyOn(SessionLogsRepo, 'put').mockRejectedValue(new Error('vol'));
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
    vi.spyOn(SessionLogsRepo, 'put').mockRejectedValue(new Error('kapot'));
    expect(await makeLogSession()(fromWatch)).toBe(false);
    expect(general).toHaveLength(1);
  });

  it('saveLogWithin, autoTickLog, saveLogThenChoice en logWithOwnNotice: mislukt, en bovenin komt niets', async () => {
    vi.spyOn(SessionLogsRepo, 'put').mockRejectedValue(new Error('kapot'));
    const logSession = makeLogSession();
    expect(await saveLogWithin(logSession, fromWatch, own)).toBe('failed');
    expect(await autoTickLog(logSession, fromWatch, async () => undefined)).toBe('failed');
    await expect(saveLogThenChoice(logSession, fromWatch, async () => undefined, 8000, () => undefined)).rejects.toBeInstanceOf(LogNotSaved);
    expect(await logWithOwnNotice(logSession, fromWatch)).toBe(false);
    expect(general).toEqual([]);
  });

  // Een schrijven dat blijft hangen tot de test het laat mislukken.
  function hangingPut() {
    let fail!: (err: Error) => void;
    const hold = new Promise<string>((_, reject) => (fail = reject));
    hold.catch(() => undefined);
    vi.spyOn(SessionLogsRepo, 'put').mockImplementation(() => hold);
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
      const run = logWithOwnNotice(makeLogSession(), { ...fromWatch, externalId: `x-${closed}` }, (err) => { writeError = err; });
      fail();
      expect(await run).toBe(false);
      // onFailed van het blad.
      reportIfGone(!closed, writeError, (err) => general.push(err));
      expect(general).toHaveLength(closed ? 1 : 0);
      vi.restoreAllMocks();
    }
  });

  it('een scherm dat onWriteError vergeet is nooit stil: de schrijffout gaat bovenin', async () => {
    vi.spyOn(SessionLogsRepo, 'put').mockRejectedValue(new Error('kapot'));
    const logSession = makeLogSession();
    expect(await saveLogWithin(logSession, fromWatch)).toBe('failed');
    expect(general).toHaveLength(1);
    await expect(saveLogThenChoice(logSession, fromWatch, async () => undefined, 8000)).rejects.toBeInstanceOf(LogNotSaved);
    expect(general).toHaveLength(2);
  });

  it('de kaart Van je horloge: Opslaan, van tab gewisseld, schrijven faalt geeft precies een melding bovenin; in beeld geen', async () => {
    for (const inView of [false, true]) {
      general = [];
      const put = vi.spyOn(SessionLogsRepo, 'put').mockRejectedValue(new Error('kapot'));
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
      const put = vi.spyOn(SessionLogsRepo, 'put').mockRejectedValue(new Error('kapot'));
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
    const put = vi.spyOn(SessionLogsRepo, 'put').mockRejectedValue(new Error('kapot'));
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
    const fails = () => vi.spyOn(SessionLogsRepo, 'put').mockRejectedValue(new Error('kapot'));
    let put = fails();
    expect(await saveLogWithin(logSession, fromWatch, own)).toBe('failed');
    put.mockRestore();
    expect(await saveLogWithin(logSession, fromWatch, own)).toBe('saved');
    put = fails();
    expect(await saveLogWithin(logSession, { ...fromWatch, externalId: 'x2' }, own)).toBe('failed');
    expect(failedNote(LOG_SAVE_NOTE.failed)).toBe(LOG_SAVE_NOTE.failed);
    // De teller is van de app, niet van een scherm: de volgende fout, op een ander scherm (het blad), is de tweede.
    expect(await logWithOwnNotice(logSession, { ...fromWatch, externalId: 'x3' })).toBe(false);
    expect(failedNote(FORM_SAVE_NOTE.failed)).not.toBe(FORM_SAVE_NOTE.failed);
    put.mockRestore();
  });

  it('de opslag is vol: de tweede keer zegt het scherm dat erbij', async () => {
    vi.spyOn(SessionLogsRepo, 'put').mockRejectedValue(full());
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
    expect(thrownSaveNote(running)).toEqual({ kind: 'slow', text: LOG_SAVE_NOTE.slow });
    // Een echte schrijffout.
    resetFailedNotes();
    vi.spyOn(SessionLogsRepo, 'put').mockRejectedValue(new Error('kapot'));
    const failed = await saveLogThenChoice(makeLogSession(), fromWatch, async () => undefined, 8000, () => undefined).catch((e: unknown) => e);
    expect(thrownSaveNote(failed)).toEqual({ kind: 'failed', text: LOG_SAVE_NOTE.failed });
  });

  it('een woordenset: mislukt en traag beginnen overal hetzelfde, en traag met de knop uit zegt niet "probeer"', () => {
    for (const text of [LOG_SAVE_NOTE.failed, FORM_SAVE_NOTE.failed, FORM_SAVE_NOTE.failedLoose]) expect(text.startsWith('Opslaan lukte niet.')).toBe(true);
    for (const text of [LOG_SAVE_NOTE.slow, FORM_SAVE_NOTE.slow]) expect(text.startsWith('Opslaan duurt langer dan verwacht.')).toBe(true);
    expect(FORM_SAVE_NOTE.slow).not.toMatch(/probeer/i);
    expect(HOW_TEXT.slow).toBe(FORM_SAVE_NOTE.slow);
    expect(HOW_TEXT.failed).toBe(FORM_SAVE_NOTE.failed);
    expect(HOW_TEXT.failedLoose).toBe(FORM_SAVE_NOTE.failedLoose);
  });

  it('de schermen: de sportvraag en het blad Hoe ging het? tonen de zin uit de set, niet meer "Dit lukte niet"', () => {
    expect(sportSrc).not.toContain('Dit lukte niet');
    expect(sportSrc.match(/setError\(thrownSaveNote\(err\)\)/g)).toHaveLength(2);
    expect(sportSrc.match(/error\.kind === 'failed' \? 'st-hint warn' : 'st-hint'/g)).toHaveLength(2);
    expect(howSrc).toMatch(/save: \(\) => logWithOwnNotice\(logSession, input, /);
    // De zin wordt vastgelegd bij de uitkomst, niet gelezen in de render; en een blad dat al dicht is meldt bovenin.
    expect(howSrc).toMatch(/reportIfGone\(!closedRef\.current && !goneRef\.current, writeError, reportStorageError\);\s*setFailedText\(failedNote\(/);
    expect(howSrc.match(/failedNote\(/g)).toHaveLength(1);
    expect(loggerSrc).toMatch(/if \(outcome === 'failed'\) reportIfGone\(alive\.current, writeError, reportStorageError\);\s*if \(!alive\.current\) return;/);
    expect(watchSrc).toMatch(/if \(outcome === 'failed'\) reportIfGone\(aliveRef\.current, writeError, reportStorageError\);\s*if \(!aliveRef\.current\) return;/);
    expect(watchSrc).toMatch(/onLate: \(result\) => show\(result, true\), onWriteError: \(err\) => \{ writeError = err; \}/);
    expect(sportSrc.match(/SAVE_TIMEOUT_MS, \(err, late\) => reportIfGone\(!late && alive\.current, err, reportStorageError\)\);/g)).toHaveLength(2);
    expect(sportSrc.match(/const alive = useAlive\(\);/g)).toHaveLength(2);
    expect(howSrc).toMatch(/goneRef\.current = true;/);
    // Vanzelf afvinken: het late antwoord haalt de activiteit uit de lijst van wat nog loopt.
    expect(watchSrc).toMatch(/\{ onLate: \(\) => lateOutstanding\.current\.delete\(activity\.externalId\) \}/);
    expect(loggerSrc).toMatch(/failedNote\(plannedSessionId \? HOW_TEXT\.failed : HOW_TEXT\.failedLoose\)/);
    expect(watchSrc).toMatch(/failedNote\(LOG_SAVE_NOTE\.failed\)/);
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

  it('een tweede tik terwijl de eerste na de grens nog loopt: niet "lukte niet", de zin van de grens blijft', () => {
    expect(cardAfterSave('failed', true).note).toBe('slow');
    expect(cardAfterSave('failed', true).closeSheet).toBe(false);
  });

  it('stond er al: blad dicht, logboek opnieuw lezen, geen profiel ophalen', () => {
    expect(cardAfterSave('already')).toEqual({ closeSheet: true, addDetail: false, refresh: true, note: 'already' });
    expect(cardAfterSave('already', true).note).toBe('already');
  });
});

describe('de schermen lezen het antwoord van logSession via state/logSave.ts', () => {
  it('het oude trainingsscherm: geen kale logSession, de beslissing uit formAfterSave, weggaan via closeClearsDraft', () => {
    expect(loggerSrc).not.toMatch(/await logSession\(/);
    expect(loggerSrc).toMatch(/saveLogWithin\(logSession, input/);
    expect(loggerSrc).toMatch(/formAfterSave\(outcome\)/);
    expect(loggerSrc).toMatch(/if \(closeClearsDraft\(savingRef\.current\)\) form\.clearDraft\(\);/);
    // Het concept wordt nergens anders gewist dan bij weggaan en bij een log dat er staat.
    expect(loggerSrc.match(/form\.clearDraft\(\)/g)).toHaveLength(2);
    expect(loggerSrc).toMatch(/if \(next\.clearDraft\) form\.clearDraft\(\);/);
    expect(loggerSrc).toMatch(/setSaving\(next\.buttonOff\)/);
    // Bezig staat aan voor het opslaan begint en volgt daarna de uitkomst: zonder deze twee regels wist
    // Annuleren tijdens het opslaan het concept weer (Warden ronde 2).
    expect(loggerSrc).toMatch(/savingRef\.current = true;\s*setSaving\(true\);[\s\S]*saveLogWithin\(logSession, input/);
    expect(loggerSrc).toMatch(/savingRef\.current = next\.buttonOff;/);
  });

  it('de kaart Van je horloge: beide plekken, de beslissing uit cardAfterSave, het blad sluit alleen daarop', () => {
    expect(watchSrc).not.toMatch(/await logSession\(/);
    expect(watchSrc).toMatch(/autoTickLog\(logSession,/);
    expect(watchSrc).toMatch(/saveLogWithin\(logSession,/);
    expect(watchSrc).toMatch(/cardAfterSave\(outcome,/);
    expect(watchSrc).toMatch(/if \(next\.closeSheet\) setChoosing\(false\);/);
    // Het blad gaat verder alleen dicht via zijn eigen Annuleren (onClose).
    expect(watchSrc.match(/setChoosing\(false\)/g)).toHaveLength(2);
    expect(watchSrc).toMatch(/LOG_SAVE_NOTE\[/);
    // De zin staat vast onderin het blad, in beeld bij een lange lijst.
    expect(watchSrc).toMatch(/sticky bottom-0[^\n]*\n\s*\{saving \? <SaveNoteLine/);
  });

  it('de sportvraag: beide bladen via saveLogThenChoice', () => {
    expect(sportSrc.match(/saveLogThenChoice\(logSession,/g)).toHaveLength(2);
    expect(sportSrc).not.toMatch(/await logSession\(/);
  });
});

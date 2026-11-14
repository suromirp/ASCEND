import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PlannedSessionsRepo, SessionLogsRepo, wipeAllData } from '../storage/database';
import { runLogSession, LogNotSaved, type LogSessionDeps, type LogSessionOpts } from './logSession';
import { autoTickLog, cardAfterSave, closeClearsDraft, failedNote, formAfterSave, logWithOwnNotice, resetFailedNotes, saveLogThenChoice, saveLogWithin, thrownSaveNote, ALREADY_LOGGED_NOTE, FORM_SAVE_NOTE, LOG_SAVE_NOTE, type LogSaveResult } from './logSave';
import { describeWriteError } from '../storage/storageError';
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
    const run = autoTickLog(logSession, fromWatch, async () => void noted++, 8000);
    await vi.advanceTimersByTimeAsync(8000);
    expect(await run).toBe('slow');
    expect(noted).toBe(0);
    open(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(noted).toBe(1);
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
    await expect(saveLogThenChoice(makeLogSession(), fromWatch, () => Promise.reject(new Error('kapot')), 8000)).rejects.toThrow('kapot');
    expect(await SessionLogsRepo.getAll()).toHaveLength(1);
  });
});

describe('geen melding bovenin als het scherm de uitkomst zelf toont', () => {
  const full = () => Object.assign(new Error('vol'), { name: 'QuotaExceededError' });

  it('zonder de optie: een schrijffout gaat naar de melding bovenin (de oude weg blijft)', async () => {
    vi.spyOn(SessionLogsRepo, 'put').mockRejectedValue(new Error('kapot'));
    expect(await makeLogSession()(fromWatch)).toBe(false);
    expect(general).toHaveLength(1);
  });

  it('saveLogWithin, autoTickLog, saveLogThenChoice en logWithOwnNotice: mislukt, en bovenin komt niets', async () => {
    vi.spyOn(SessionLogsRepo, 'put').mockRejectedValue(new Error('kapot'));
    const logSession = makeLogSession();
    expect(await saveLogWithin(logSession, fromWatch)).toBe('failed');
    expect(await autoTickLog(logSession, fromWatch, async () => undefined)).toBe('failed');
    await expect(saveLogThenChoice(logSession, fromWatch, async () => undefined, 8000)).rejects.toBeInstanceOf(LogNotSaved);
    expect(await logWithOwnNotice(logSession, fromWatch)).toBe(false);
    expect(general).toEqual([]);
  });

  it('een laat falen na een hang: ook dan niets bovenin', async () => {
    let fail!: (err: Error) => void;
    const hold = new Promise<string>((_, reject) => (fail = reject));
    vi.spyOn(SessionLogsRepo, 'put').mockImplementation(() => hold);
    const late: LogSaveResult[] = [];
    const run = saveLogWithin(makeLogSession(), fromWatch, { limitMs: 20, onLate: (r) => late.push(r) });
    expect(await run).toBe('slow');
    fail(new Error('kapot'));
    await vi.waitFor(() => expect(late).toEqual(['failed']));
    expect(general).toEqual([]);
  });

  it('een fout na het schrijven gaat nog wel bovenin: het log staat er, het scherm zegt opgeslagen', async () => {
    const deps: LogSessionDeps = { settings: {} as LogSessionDeps['settings'], loggingInFlight: { current: new Set<string>() }, reportStorageError: (err) => general.push(err), refresh: () => Promise.reject(new Error('kapot')), announceSaved: () => undefined };
    expect(await saveLogWithin((input, opts) => runLogSession(input, opts, deps), fromWatch)).toBe('saved');
    expect(general).toHaveLength(1);
    expect((general[0] as Error).name).toBe('LogStoredFollowUpFailed');
  });

  it('de back-uptip gaat niet verloren: de eerste keer de gewone zin, bij een tweede schrijffout op rij de reden', async () => {
    const put = vi.spyOn(SessionLogsRepo, 'put').mockRejectedValue(new Error('kapot'));
    const logSession = makeLogSession();
    expect(await saveLogWithin(logSession, fromWatch)).toBe('failed');
    expect(failedNote(LOG_SAVE_NOTE.failed)).toBe(LOG_SAVE_NOTE.failed);
    expect(await saveLogWithin(logSession, fromWatch)).toBe('failed');
    expect(failedNote(LOG_SAVE_NOTE.failed)).toBe(describeWriteError(new Error('kapot')));
    expect(failedNote(LOG_SAVE_NOTE.failed)).toContain('back-up');
    // Lukt het daarna, dan begint de telling opnieuw.
    put.mockRestore();
    expect(await saveLogWithin(logSession, fromWatch)).toBe('saved');
    expect(failedNote(LOG_SAVE_NOTE.failed)).toBe(LOG_SAVE_NOTE.failed);
    expect(general).toEqual([]);
  });

  it('de opslag is vol: de tweede keer zegt het scherm dat', async () => {
    vi.spyOn(SessionLogsRepo, 'put').mockRejectedValue(full());
    const logSession = makeLogSession();
    await saveLogWithin(logSession, fromWatch);
    await saveLogWithin(logSession, fromWatch);
    expect(failedNote(FORM_SAVE_NOTE.failed)).toContain('vol');
  });

  it('twee keer nee zonder schrijffout (een eerdere poging loopt nog): de gewone zin blijft', async () => {
    const never = () => Promise.resolve(false);
    expect(await saveLogWithin(never, fromWatch)).toBe('failed');
    expect(await saveLogWithin(never, fromWatch)).toBe('failed');
    expect(failedNote(LOG_SAVE_NOTE.failed)).toBe(LOG_SAVE_NOTE.failed);
  });

  it('de sportvraag: te lang is niet mislukt, en mislukt is amber', () => {
    expect(thrownSaveNote(new TimeoutError())).toEqual({ kind: 'slow', text: LOG_SAVE_NOTE.slow });
    expect(thrownSaveNote(new LogNotSaved())).toEqual({ kind: 'failed', text: FORM_SAVE_NOTE.failed });
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
    expect(howSrc).toMatch(/save: \(\) => logWithOwnNotice\(logSession, input\)/);
    expect(howSrc).toMatch(/failedNote\(loose \? HOW_TEXT\.failedLoose : HOW_TEXT\.failed\)/);
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

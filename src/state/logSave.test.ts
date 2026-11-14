import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PlannedSessionsRepo, SessionLogsRepo, wipeAllData } from '../storage/database';
import { runLogSession, LogNotSaved, type LogSessionDeps } from './logSession';
import { autoTickLog, saveLogThenChoice, saveLogWithin, LOG_SAVE_NOTE, type LogSaveResult } from './logSave';
import { TimeoutError } from '../utils/withTimeout';
import type { LogSessionInput } from './appDataTypes';

const loggerSrc = Object.values(import.meta.glob('../components/ExerciseLogger.tsx', { query: '?raw', import: 'default', eager: true }))[0] as string;
const watchSrc = Object.values(import.meta.glob('../components/WatchActivityCard.tsx', { query: '?raw', import: 'default', eager: true }))[0] as string;
const sportSrc = Object.values(import.meta.glob('../components/sports/SportAskLine.tsx', { query: '?raw', import: 'default', eager: true }))[0] as string;

// Alles nagemaakt.
const planned = { id: 'p1', templateId: 'tpl_easy_run', scheduledDate: '2026-11-10', weekStartDate: '2026-11-09', status: 'planned' as const, order: 0 };
const forPlanned: LogSessionInput = { templateId: 'tpl_easy_run', type: 'cardio', variant: 'full', durationMinutes: 40, plannedSessionId: 'p1' };
const fromWatch: LogSessionInput = { templateId: 'tpl_easy_run', type: 'cardio', variant: 'full', durationMinutes: 40, externalId: 'x1', source: 'garmin' };

function makeLogSession() {
  const deps: LogSessionDeps = {
    settings: {} as LogSessionDeps['settings'],
    loggingInFlight: { current: new Set<string>() },
    reportStorageError: () => undefined,
    refresh: async () => undefined,
    announceSaved: () => undefined,
  };
  return (input: LogSessionInput) => runLogSession(input, undefined, deps);
}

// Een logSession die pas antwoordt als de test dat zegt.
function gated() {
  let open!: (saved: boolean) => void;
  const gate = new Promise<boolean>((resolve) => (open = resolve));
  return { logSession: () => gate, open };
}

beforeEach(async () => {
  await wipeAllData();
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

describe('de schermen lezen het antwoord van logSession via state/logSave.ts', () => {
  it('het oude trainingsscherm: geen kale logSession meer, en de zinnen van het blad Hoe ging het?', () => {
    expect(loggerSrc).not.toMatch(/await logSession\(/);
    expect(loggerSrc).toMatch(/saveLogWithin\(logSession, input/);
    for (const key of ['slow', 'failed', 'failedLoose', 'already']) expect(loggerSrc).toContain(`HOW_TEXT.${key}`);
  });

  it('de kaart Van je horloge: beide plekken, en het blad Andere training sluit niet meer in een finally', () => {
    expect(watchSrc).not.toMatch(/await logSession\(/);
    expect(watchSrc).toMatch(/autoTickLog\(logSession,/);
    expect(watchSrc).toMatch(/saveLogWithin\(logSession,/);
    expect(watchSrc).not.toMatch(/finally \{\s*setSaving\(false\);\s*setChoosing\(false\);/);
    expect(watchSrc).toMatch(/LOG_SAVE_NOTE\[/);
  });

  it('de sportvraag: beide bladen via saveLogThenChoice', () => {
    expect(sportSrc.match(/saveLogThenChoice\(logSession,/g)).toHaveLength(2);
    expect(sportSrc).not.toMatch(/await logSession\(/);
  });
});

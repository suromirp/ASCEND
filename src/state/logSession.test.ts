import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GoalMilestonesRepo, PlannedSessionsRepo, SessionLogsRepo, wipeAllData } from '../storage/database';
import { runLogSession, settleLogOutcome, LogNotSaved, type LogSessionDeps } from './logSession';
import type { LogSessionInput } from './appDataTypes';
import type { SavedMoment } from '../engine/savedMoments';
import { todayISO } from '../utils/dates';

const forgeSrc = Object.values(import.meta.glob('../components/forge/ForgeSheets.tsx', { query: '?raw', import: 'default', eager: true }))[0] as string;

// Alles nagemaakt.
const loose = (over: Partial<LogSessionInput> = {}): LogSessionInput => ({ templateId: 'tpl_easy_run', type: 'cardio', variant: 'full', durationMinutes: 40, ...over });

function makeDeps(over: Partial<LogSessionDeps> = {}) {
  const errors: unknown[] = [];
  const announced: SavedMoment[][] = [];
  const deps: LogSessionDeps = {
    settings: {} as LogSessionDeps['settings'],
    loggingInFlight: { current: new Set<string>() },
    reportStorageError: (err) => errors.push(err),
    refresh: async () => undefined,
    announceSaved: (batch) => announced.push([...batch]),
    ...over,
  };
  return { deps, errors, announced };
}

describe('logSession: het log staat er, ook als een stap erna faalt', () => {
  beforeEach(async () => {
    await wipeAllData();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('gaat alles goed: een log, een moment, geen melding', async () => {
    const { deps, errors, announced } = makeDeps();
    expect(await runLogSession(loose(), undefined, deps)).toBe(true);
    const logs = await SessionLogsRepo.getAll();
    expect(logs).toHaveLength(1);
    expect(errors).toEqual([]);
    expect(announced).toHaveLength(1);
    expect(announced[0][0].logId).toBe(logs[0].id);
  });

  it('refresh faalt na het schrijven: toch ja, fout apart gemeld', async () => {
    const { deps, errors } = makeDeps({ refresh: () => Promise.reject(new Error('kapot')) });
    expect(await runLogSession(loose(), undefined, deps)).toBe(true);
    expect(await SessionLogsRepo.getAll()).toHaveLength(1);
    // De fout is apart gemeld, en zegt niet dat er niets bewaard is.
    expect(errors).toHaveLength(1);
    expect((errors[0] as Error).name).toBe('LogStoredFollowUpFailed');
  });

  it('de mijlpalen falen na het schrijven: toch ja, de app leest opnieuw, het moment komt', async () => {
    vi.spyOn(GoalMilestonesRepo, 'getAll').mockRejectedValue(new Error('kapot'));
    let refreshed = 0;
    const { deps, errors, announced } = makeDeps({ refresh: async () => void refreshed++ });
    expect(await runLogSession(loose(), undefined, deps)).toBe(true);
    expect(await SessionLogsRepo.getAll()).toHaveLength(1);
    expect(refreshed).toBe(1);
    expect(errors).toHaveLength(1);
    expect((errors[0] as Error).name).toBe('LogStoredFollowUpFailed');
    expect(announced).toHaveLength(1);
  });

  it('het schrijven zelf faalt: nee, niets bewaard, de gewone melding', async () => {
    vi.spyOn(SessionLogsRepo, 'add').mockRejectedValue(new Error('vol'));
    const { deps, errors } = makeDeps();
    expect(await runLogSession(loose(), undefined, deps)).toBe(false);
    vi.restoreAllMocks();
    expect(await SessionLogsRepo.getAll()).toHaveLength(0);
    expect((errors[0] as Error).message).toBe('vol');
  });

  it('een dubbele tik op een losse training terwijl de eerste nog loopt: een log, beide ja, een moment', async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });
    const { deps, announced } = makeDeps({ refresh: () => gate });
    const first = runLogSession(loose(), undefined, deps);
    const second = runLogSession(loose(), undefined, deps);
    release();
    expect(await Promise.all([first, second])).toEqual([true, true]);
    expect(await SessionLogsRepo.getAll()).toHaveLength(1);
    expect(announced).toHaveLength(1);
  });

  it('twee verschillende losse trainingen tegelijk (een andere training, of een andere dag): twee logs', async () => {
    const { deps } = makeDeps();
    expect(await Promise.all([runLogSession(loose(), undefined, deps), runLogSession(loose({ templateId: 'tpl_long_run' }), undefined, deps)])).toEqual([true, true]);
    expect(await Promise.all([runLogSession(loose({ completedDate: '2026-11-10' }), undefined, deps), runLogSession(loose({ completedDate: '2026-11-11', durationMinutes: 55 }), undefined, deps)])).toEqual([true, true]);
    expect(await SessionLogsRepo.getAll()).toHaveLength(4);
  });

  // Besluit 2026-11-14-opslaan-rest.md: dezelfde losse training is dezelfde training op dezelfde dag, zolang de eerste loopt.
  it('scherm dicht en weer open met een andere invulling terwijl de eerste opslag hangt: een log, de tweede en derde nee', async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });
    const { deps, errors } = makeDeps({ refresh: () => gate });
    const first = runLogSession(loose(), undefined, deps);
    const second = runLogSession(loose({ durationMinutes: 55 }), undefined, deps);
    const third = runLogSession(loose({ durationMinutes: 70, rpe: 6 }), undefined, deps);
    let secondDone = false;
    void second.then(() => { secondDone = true; });
    await new Promise((r) => setTimeout(r, 20));
    // De tweede wacht: ze schrijft niets zolang de eerste loopt.
    expect(secondDone).toBe(false);
    release();
    expect(await Promise.all([first, second, third])).toEqual([true, false, false]);
    const logs = await SessionLogsRepo.getAll();
    expect(logs).toHaveLength(1);
    expect(logs[0].durationMinutes).toBe(40);
    expect(errors).toEqual([]);
    // Daarna is de dag weer vrij: een tweede keer gelopen is een nieuw log.
    expect(await runLogSession(loose({ durationMinutes: 55 }), undefined, deps)).toBe(true);
    expect(await SessionLogsRepo.getAll()).toHaveLength(2);
  });

  it('de eerste losse opslag mislukt terwijl een andere invulling wacht: die schrijft dan zelf, een log en niets kwijt', async () => {
    const { deps } = makeDeps();
    vi.spyOn(SessionLogsRepo, 'add').mockRejectedValueOnce(new Error('kapot'));
    const first = runLogSession(loose(), undefined, deps);
    const second = runLogSession(loose({ durationMinutes: 55 }), undefined, deps);
    expect(await Promise.all([first, second])).toEqual([false, true]);
    const logs = await SessionLogsRepo.getAll();
    expect(logs).toHaveLength(1);
    expect(logs[0].durationMinutes).toBe(55);
  });

  it('de eerste mislukt, de tweede hangt na het schrijven, dan een derde invulling: die wacht op de tweede, een log', async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });
    let refreshing = 0;
    const { deps } = makeDeps({ refresh: () => { refreshing += 1; return gate; } });
    vi.spyOn(SessionLogsRepo, 'add').mockRejectedValueOnce(new Error('kapot'));
    const day = { completedDate: '2026-11-08' };
    const first = runLogSession(loose(day), undefined, deps);
    const second = runLogSession(loose({ ...day, durationMinutes: 55 }), undefined, deps);
    expect(await first).toBe(false);
    await vi.waitFor(() => expect(refreshing).toBe(1));
    // De rij van de eerste is klaar, maar de dag is nu van de tweede: het vrijgeven mag die niet weghalen.
    const third = runLogSession(loose({ ...day, durationMinutes: 70 }), undefined, deps);
    await new Promise((r) => setTimeout(r, 20));
    release();
    expect(await Promise.all([second, third])).toEqual([true, false]);
    expect(await SessionLogsRepo.getAll()).toHaveLength(1);
  });

  it('dezelfde losse training later nog eens, na een geslaagde poging: een nieuw log (twee keer gelopen)', async () => {
    const { deps } = makeDeps();
    await runLogSession(loose(), undefined, deps);
    expect(await runLogSession(loose(), undefined, deps)).toBe(true);
    expect(await SessionLogsRepo.getAll()).toHaveLength(2);
  });

  it('een geplande training: de bestaande vangst blijft (tegelijk en daarna nee, een log)', async () => {
    await PlannedSessionsRepo.put({ id: 'p1', templateId: 'tpl_easy_run', scheduledDate: '2026-11-10', weekStartDate: '2026-11-09', status: 'planned', order: 0 });
    const { deps } = makeDeps();
    const input = loose({ plannedSessionId: 'p1' });
    expect(await Promise.all([runLogSession(input, undefined, deps), runLogSession(input, undefined, deps)])).toEqual([true, false]);
    expect(await runLogSession(input, undefined, deps)).toBe(false);
    expect(await SessionLogsRepo.getAll()).toHaveLength(1);
    expect(deps.loggingInFlight.current.size).toBe(0);
  });

  it('een geplande training waarbij refresh faalt: ja, en de tweede tik geeft nee zonder tweede log', async () => {
    const { deps } = makeDeps({ refresh: () => Promise.reject(new Error('kapot')) });
    const input = loose({ plannedSessionId: 'p1' });
    expect(await runLogSession(input, undefined, deps)).toBe(true);
    expect(await runLogSession(input, undefined, deps)).toBe(false);
    expect(await SessionLogsRepo.getAll()).toHaveLength(1);
  });

  it('een horlogelog met externalId: nooit twee keer, ook niet tegelijk of na een fout erna', async () => {
    const { deps } = makeDeps({ refresh: () => Promise.reject(new Error('kapot')) });
    const input = loose({ externalId: 'intervals.icu:i-1', source: 'garmin', quiet: true });
    const both = await Promise.all([runLogSession(input, undefined, deps), runLogSession(input, undefined, deps)]);
    expect(both).toEqual([true, false]);
    expect(await runLogSession(input, undefined, deps)).toBe(false);
    expect(await SessionLogsRepo.getAll()).toHaveLength(1);
  });

  it('een horloge-activiteit bij een geplande training hangt, daarna dezelfde activiteit los of bij een andere training: een log', async () => {
    await PlannedSessionsRepo.put({ id: 'p1', templateId: 'tpl_easy_run', scheduledDate: '2026-11-10', weekStartDate: '2026-11-09', status: 'planned', order: 0 });
    await PlannedSessionsRepo.put({ id: 'p2', templateId: 'tpl_easy_run', scheduledDate: '2026-11-11', weekStartDate: '2026-11-09', status: 'planned', order: 0 });
    let release!: () => void;
    const hold = new Promise<void>((resolve) => (release = resolve));
    const realPut = SessionLogsRepo.add.bind(SessionLogsRepo);
    vi.spyOn(SessionLogsRepo, 'add').mockImplementation(async (log) => {
      await hold;
      return realPut(log);
    });
    const { deps } = makeDeps();
    const base = loose({ externalId: 'intervals.icu:i-9', source: 'garmin' });
    const first = runLogSession({ ...base, plannedSessionId: 'p1' }, undefined, deps);
    // Opnieuw tikken na de grens met een andere keuze, terwijl de eerste nog onderweg is.
    expect(await runLogSession(base, undefined, deps)).toBe(false);
    expect(await runLogSession({ ...base, plannedSessionId: 'p2' }, undefined, deps)).toBe(false);
    release();
    expect(await first).toBe(true);
    expect(await runLogSession(base, undefined, deps)).toBe(false);
    const logs = await SessionLogsRepo.getAll();
    expect(logs).toHaveLength(1);
    expect(logs[0].plannedSessionId).toBe('p1');
  });

  it('een horloge-activiteit waarvan het schrijven mislukte is daarna weer vrij', async () => {
    const put = vi.spyOn(SessionLogsRepo, 'add').mockRejectedValue(new Error('vol'));
    const { deps } = makeDeps();
    const input = loose({ externalId: 'intervals.icu:i-10', source: 'garmin' });
    expect(await runLogSession(input, undefined, deps)).toBe(false);
    put.mockRestore();
    expect(await runLogSession(input, undefined, deps)).toBe(true);
    expect(await SessionLogsRepo.getAll()).toHaveLength(1);
  });

  it('de dag zelf: zonder datum vandaag, met een datum die dag', async () => {
    const { deps } = makeDeps();
    await runLogSession(loose(), undefined, deps);
    await runLogSession(loose({ completedDate: '2026-11-03', durationMinutes: 30 }), undefined, deps);
    const days = (await SessionLogsRepo.getAll()).map((l) => l.completedDate).sort();
    expect(days).toEqual(['2026-11-03', todayISO()].sort());
  });

  it('in een batch: het moment gaat in de lijst van de aanroeper, ook bij een dubbele tik maar een keer', async () => {
    const { deps, announced } = makeDeps();
    const batch: SavedMoment[] = [];
    await Promise.all([runLogSession(loose(), { batch }, deps), runLogSession(loose(), { batch }, deps)]);
    expect(batch).toHaveLength(1);
    expect(announced).toHaveLength(0);
  });
});

// Forge (concept) en de sportvraag (keuze) leggen pas iets vast of gooien pas iets weg als het log er echt staat.
describe('settleLogOutcome: nee is niet altijd "staat er al"', () => {
  beforeEach(async () => {
    await wipeAllData();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const planned = { id: 'p1', templateId: 'tpl_easy_run', scheduledDate: '2026-11-10', weekStartDate: '2026-11-09', status: 'planned' as const, order: 0 };

  it('schrijffout halverwege: LogNotSaved, geen half log, de keuze wordt niet gezet', async () => {
    await PlannedSessionsRepo.put(planned);
    vi.spyOn(SessionLogsRepo, 'add').mockRejectedValue(new Error('vol'));
    const { deps, errors } = makeDeps();
    const input = loose({ plannedSessionId: 'p1' });
    const saved = await runLogSession(input, undefined, deps);
    expect(saved).toBe(false);
    await expect(settleLogOutcome(saved, input)).rejects.toBeInstanceOf(LogNotSaved);
    vi.restoreAllMocks();
    expect(await SessionLogsRepo.getAll()).toHaveLength(0);
    expect(errors).toHaveLength(1);
    // Opnieuw proberen kan en lukt.
    expect(await settleLogOutcome(await runLogSession(input, undefined, deps), input)).toBe(true);
    expect(await SessionLogsRepo.getAll()).toHaveLength(1);
  });

  it('een losse training (ook een geplande die niet meer bestaat) met een schrijffout: LogNotSaved', async () => {
    vi.spyOn(SessionLogsRepo, 'add').mockRejectedValue(new Error('vol'));
    const { deps } = makeDeps();
    const input = loose({ plannedSessionId: undefined });
    await expect(settleLogOutcome(await runLogSession(input, undefined, deps), input)).rejects.toBeInstanceOf(LogNotSaved);
  });

  it('dubbel log (staat al in je logboek): nee zonder fout, er blijft een log', async () => {
    await PlannedSessionsRepo.put(planned);
    const { deps } = makeDeps();
    const input = loose({ plannedSessionId: 'p1' });
    expect(await settleLogOutcome(await runLogSession(input, undefined, deps), input)).toBe(true);
    expect(await settleLogOutcome(await runLogSession(input, undefined, deps), input)).toBe(false);
    expect(await SessionLogsRepo.getAll()).toHaveLength(1);
  });

  it('een horlogelog dat al staat telt als gelukt, een mislukt schrijven niet', async () => {
    const { deps } = makeDeps();
    const input = loose({ externalId: 'intervals.icu:i-9', source: 'garmin', quiet: true });
    expect(await settleLogOutcome(await runLogSession(input, undefined, deps), input)).toBe(true);
    expect(await settleLogOutcome(await runLogSession(input, undefined, deps), input)).toBe(false);
    await wipeAllData();
    vi.spyOn(SessionLogsRepo, 'add').mockRejectedValue(new Error('vol'));
    await expect(settleLogOutcome(await runLogSession(input, undefined, deps), input)).rejects.toBeInstanceOf(LogNotSaved);
  });

  it('de lezing van het logboek faalt bij nee: veilig LogNotSaved, het concept blijft', async () => {
    vi.spyOn(SessionLogsRepo, 'getAll').mockRejectedValue(new Error('kapot'));
    await expect(settleLogOutcome(false, { plannedSessionId: 'p1' })).rejects.toBeInstanceOf(LogNotSaved);
  });

  // De sportvraag en haar time-out: state/logSave.ts#saveLogThenChoice, getest in logSave.test.ts.
  it('Forge gebruikt settleLogOutcome en weegt nee niet meer als "al opgeslagen"', () => {
    const forge = forgeSrc;
    expect(forge).toMatch(/await settleWithOwnNotice\(logSession, input, \(err\) => reportIfGone\(seen\(\), err, reportStorageError\)\)/);
    expect(forge).not.toMatch(/await logSession\(/);
    expect(forge.indexOf('settleWithOwnNotice(logSession')).toBeLessThan(forge.indexOf('p.dropDraft();\n            if (saved)'));
  });
});

// I-54: twee tabbladen delen de opslag, niet het geheugen. Een tweede tabblad is hier een tweede kopie van de
// modules (vi.resetModules): eigen loggingInFlight, eigen externalInFlight en een eigen verbinding met IndexedDB.
describe('logSession: twee tabbladen tegelijk', () => {
  beforeEach(async () => {
    await wipeAllData();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function secondTab() {
    vi.resetModules();
    const mod = await import('./logSession');
    const db = await import('../storage/database');
    // Beide tabbladen hebben hun verbinding al open, zoals in het echt: anders wacht het tweede op het openen.
    await Promise.all([db.SessionLogsRepo.getAll(), SessionLogsRepo.getAll()]);
    return { runLogSession: mod.runLogSession, settleLogOutcome: mod.settleLogOutcome, SessionLogsRepo: db.SessionLogsRepo };
  }

  it('dezelfde geplande training in twee tabbladen tegelijk: één log, het tweede hoort dat het er al stond', async () => {
    const tab2 = await secondTab();
    const input = loose({ plannedSessionId: 'ps_tab_1' });
    const one = makeDeps();
    const two = makeDeps();
    const [a, b] = await Promise.all([runLogSession(input, undefined, one.deps), tab2.runLogSession(input, undefined, two.deps)]);
    expect(await SessionLogsRepo.getAll()).toHaveLength(1);
    expect(await tab2.SessionLogsRepo.getAll()).toHaveLength(1);
    // Precies één tabblad schreef; het andere krijgt nee, en dat nee betekent "stond er al" (zichtbaar als already).
    expect([a, b].filter(Boolean)).toHaveLength(1);
    expect(await settleLogOutcome(a, input)).toBe(a);
    expect(await tab2.settleLogOutcome(b, input)).toBe(b);
    expect(one.errors).toEqual([]);
    expect(two.errors).toEqual([]);
  });

  it('dezelfde horloge-activiteit in twee tabbladen tegelijk: één log', async () => {
    const tab2 = await secondTab();
    const one = makeDeps();
    const two = makeDeps();
    const [a, b] = await Promise.all([
      runLogSession(loose({ externalId: 'ext_tab_1', source: 'garmin' }), undefined, one.deps),
      tab2.runLogSession(loose({ externalId: 'ext_tab_1', source: 'garmin', plannedSessionId: 'ps_tab_2' }), undefined, two.deps),
    ]);
    expect(await SessionLogsRepo.getAll()).toHaveLength(1);
    expect([a, b].filter(Boolean)).toHaveLength(1);
  });

  it('tweede poging later in hetzelfde tabblad: nee, niets dubbel, het eerste log blijft staan', async () => {
    const { deps } = makeDeps();
    const input = loose({ plannedSessionId: 'ps_tab_3' });
    expect(await runLogSession(input, undefined, deps)).toBe(true);
    const first = (await SessionLogsRepo.getAll())[0];
    expect(await runLogSession({ ...input, durationMinutes: 55 }, undefined, deps)).toBe(false);
    expect(await SessionLogsRepo.getAll()).toEqual([first]);
  });

  it('het schrijven faalt halverwege: niets half, geen ander log weg, en een nieuwe poging schrijft wel', async () => {
    const { deps } = makeDeps();
    await runLogSession(loose({ plannedSessionId: 'ps_other' }), undefined, deps);
    const before = await SessionLogsRepo.getAll();
    const writeErrors: unknown[] = [];
    // Een waarde die IndexedDB niet kan bewaren (een functie) laat de put in de transactie mislukken.
    const bad = loose({ plannedSessionId: 'ps_tab_4', notes: (() => 'x') as unknown as string });
    expect(await runLogSession(bad, { onWriteError: (err) => writeErrors.push(err) }, deps)).toBe(false);
    expect(writeErrors).toHaveLength(1);
    expect(await SessionLogsRepo.getAll()).toEqual(before);
    expect(deps.loggingInFlight.current.size).toBe(0);
    await expect(settleLogOutcome(false, { plannedSessionId: 'ps_tab_4' })).rejects.toBeInstanceOf(LogNotSaved);
    expect(await runLogSession(loose({ plannedSessionId: 'ps_tab_4' }), undefined, deps)).toBe(true);
    expect(await SessionLogsRepo.getAll()).toHaveLength(2);
  });
});

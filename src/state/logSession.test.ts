import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GoalMilestonesRepo, PlannedSessionsRepo, SessionLogsRepo, wipeAllData } from '../storage/database';
import { runLogSession, type LogSessionDeps } from './logSession';
import type { LogSessionInput } from './appDataTypes';
import type { SavedMoment } from '../engine/savedMoments';
import { todayISO } from '../utils/dates';

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
    vi.spyOn(SessionLogsRepo, 'put').mockRejectedValue(new Error('vol'));
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

  it('twee verschillende losse trainingen tegelijk: twee logs', async () => {
    const { deps } = makeDeps();
    expect(await Promise.all([runLogSession(loose(), undefined, deps), runLogSession(loose({ durationMinutes: 55 }), undefined, deps)])).toEqual([true, true]);
    expect(await SessionLogsRepo.getAll()).toHaveLength(2);
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

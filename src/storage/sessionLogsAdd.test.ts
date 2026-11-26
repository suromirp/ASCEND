import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SessionLogsRepo, wipeAllData } from './database';
import type { SessionLog } from '../models/training';

// Alles nagemaakt.
const log = (id: string, over: Partial<SessionLog> = {}): SessionLog => ({
  id, templateId: 'tpl_easy_run', type: 'cardio', sport: 'running', completedDate: '2026-10-28', completedAt: '2026-10-28T08:00:00Z', variant: 'custom', durationMinutes: 42, ...over,
} as SessionLog);

function watchModes() {
  const proto = (globalThis as unknown as { IDBDatabase: { prototype: { transaction: (...a: unknown[]) => unknown } } }).IDBDatabase.prototype;
  const modes: unknown[] = [];
  const original = proto.transaction;
  vi.spyOn(proto, 'transaction').mockImplementation(function (this: unknown, ...args: unknown[]) {
    modes.push(args[1] ?? 'readonly');
    return original.apply(this, args);
  });
  return modes;
}

function countGetAll() {
  const proto = (globalThis as unknown as { IDBObjectStore: { prototype: { getAll: (...a: unknown[]) => unknown } } }).IDBObjectStore.prototype;
  const calls = { n: 0 };
  const original = proto.getAll;
  vi.spyOn(proto, 'getAll').mockImplementation(function (this: unknown, ...args: unknown[]) {
    calls.n++;
    return original.apply(this, args);
  });
  return calls;
}

describe('SessionLogsRepo.add: één keer kijken, in de readwrite-transactie (I-140)', () => {
  beforeEach(async () => {
    await wipeAllData();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('staat het log van dezelfde geplande training er al, dan nee en niets erbij, met één keer lezen', async () => {
    await SessionLogsRepo.put(log('a', { plannedSessionId: 'p1' }));
    const modes = watchModes();
    const reads = countGetAll();
    expect(await SessionLogsRepo.add(log('b', { plannedSessionId: 'p1' }))).toBe(false);
    expect(modes).toEqual(['readwrite']);
    expect(reads.n).toBe(1);
    expect((await SessionLogsRepo.getAll()).map((l) => l.id)).toEqual(['a']);
  });

  it('dezelfde externalId: de eerste ja, de tweede nee, ook met een andere geplande training', async () => {
    const modes = watchModes();
    expect(await SessionLogsRepo.add(log('b', { externalId: 'intervals.icu:i-1' }))).toBe(true);
    expect(modes).toEqual(['readwrite']);
    expect(await SessionLogsRepo.add(log('c', { externalId: 'intervals.icu:i-1', plannedSessionId: 'p9' }))).toBe(false);
    expect((await SessionLogsRepo.getAll()).map((l) => l.id)).toEqual(['b']);
  });

  it('twee keer tegelijk hetzelfde afvinken geeft één log', async () => {
    const results = await Promise.all([
      SessionLogsRepo.add(log('b', { plannedSessionId: 'p1' })),
      SessionLogsRepo.add(log('c', { plannedSessionId: 'p1' })),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await SessionLogsRepo.getAll()).toHaveLength(1);
  });

  it('een losse training wordt zonder te kijken geschreven', async () => {
    const modes = watchModes();
    const reads = countGetAll();
    expect(await SessionLogsRepo.add(log('x'))).toBe(true);
    expect(modes).toEqual(['readwrite']);
    expect(reads.n).toBe(0);
  });

  it('faalt het schrijven halverwege, dan staat er niets en lukt het daarna gewoon', async () => {
    await SessionLogsRepo.put(log('a', { plannedSessionId: 'p0' }));
    // Een functie in het log kan IndexedDB niet bewaren: put faalt na het kijken.
    const broken = log('b', { plannedSessionId: 'p1', notes: (() => 'x') as unknown as string });
    await expect(SessionLogsRepo.add(broken)).rejects.toThrow();
    expect((await SessionLogsRepo.getAll()).map((l) => l.id)).toEqual(['a']);
    expect(await SessionLogsRepo.add(log('b', { plannedSessionId: 'p1' }))).toBe(true);
    expect((await SessionLogsRepo.getAll()).map((l) => l.id).sort()).toEqual(['a', 'b']);
  });
});

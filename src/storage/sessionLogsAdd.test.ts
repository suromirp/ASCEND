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

describe('SessionLogsRepo.add: geen schrijfslot als lezen genoeg is', () => {
  beforeEach(async () => {
    await wipeAllData();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('staat het log er al, dan alleen een readonly-transactie en nee', async () => {
    await SessionLogsRepo.put(log('a', { plannedSessionId: 'p1' }));
    const modes = watchModes();
    expect(await SessionLogsRepo.add(log('b', { plannedSessionId: 'p1' }))).toBe(false);
    expect(modes).not.toContain('readwrite');
    expect(await SessionLogsRepo.getAll()).toHaveLength(1);
  });

  it('staat er nog niets, dan schrijft hij in een readwrite-transactie', async () => {
    const modes = watchModes();
    expect(await SessionLogsRepo.add(log('b', { externalId: 'intervals.icu:i-1' }))).toBe(true);
    expect(modes).toContain('readwrite');
    expect(await SessionLogsRepo.add(log('c', { externalId: 'intervals.icu:i-1' }))).toBe(false);
    expect((await SessionLogsRepo.getAll()).map((l) => l.id)).toEqual(['b']);
  });

  it('een losse training wordt zonder te kijken geschreven', async () => {
    const modes = watchModes();
    expect(await SessionLogsRepo.add(log('x'))).toBe(true);
    expect(modes).toEqual(['readwrite']);
  });
});

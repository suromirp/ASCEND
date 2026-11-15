// Alles wissen is één transactie over elke opslag die er is (backlog I-38): wipeAllData en
// "Alles verwijderen" (resetToDemoData) lopen niet meer uiteen en laten nooit de helft staan.

import { describe, it, expect, beforeEach } from 'vitest';
import { clearAllStores, wipeAllData, resetToDemoData, MetaRepo, SessionLogsRepo, SessionTemplatesRepo, ProgramsRepo } from './database';
import { getDB } from './databaseSchema';

async function fillEveryStore(): Promise<string[]> {
  const db = await getDB();
  const names = [...db.objectStoreNames];
  for (const name of names) {
    const store = db.transaction(name, 'readwrite').objectStore(name);
    if (store.keyPath === null) await store.put('x', 'probe');
    else await store.put({ id: 'probe', logId: 'probe' });
  }
  return names;
}

async function countEveryStore(): Promise<Record<string, number>> {
  const db = await getDB();
  const counts: Record<string, number> = {};
  for (const name of [...db.objectStoreNames]) counts[name] = await db.count(name as never);
  return counts;
}

describe('alles wissen', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  it('wipeAllData leegt elke opslag, ook de kopieën van voor een import', async () => {
    const names = await fillEveryStore();
    expect(names).toContain('backupSnapshots');
    await wipeAllData();
    expect(Object.values(await countEveryStore()).every((n) => n === 0)).toBe(true);
  });

  it('clearAllStores schrijft de vlaggen in dezelfde transactie na het wissen', async () => {
    await fillEveryStore();
    await clearAllStores({ seeded: false });
    expect(await MetaRepo.get('probe')).toBeUndefined();
    expect(await MetaRepo.get('seeded')).toBe(false);
  });

  it('resetToDemoData wist alles en zet alleen de start terug, zonder programma of planning', async () => {
    await fillEveryStore();
    await MetaRepo.set('settings', { marathonRaceType: 'full', marathonTargetDate: '2027-04-01' });
    await resetToDemoData();
    const counts = await countEveryStore();
    expect(await SessionLogsRepo.getAll()).toEqual([]);
    expect(await ProgramsRepo.getAll()).toEqual([]);
    expect(counts.backupSnapshots).toBe(0);
    expect(counts.activityStreams).toBe(0);
    expect(counts.plannedSessions).toBe(0);
    expect((await SessionTemplatesRepo.getAll()).length).toBeGreaterThan(0);
    expect((await SessionTemplatesRepo.getAll()).some((t) => t.id === 'probe')).toBe(false);
    const settings = await MetaRepo.get<Record<string, unknown>>('settings');
    expect(settings?.marathonRaceType).toBeUndefined();
    expect(await MetaRepo.get('goalEngineMigrated')).not.toBe(true);
  });
});

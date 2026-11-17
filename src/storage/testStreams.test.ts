import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ActivityStreamsRepo, wipeAllData } from './database';
import { streamsForLogs } from './testStreams';
import { packStreams } from '../engine/streamPack';
import type { SessionLog } from '../models/training';

// Nagemaakt: twee tests van 7 km in 40 minuten; alleen de eerste heeft een bewaarde reeks.
const log = (id: string) => ({ id, completedDate: '2026-11-10', cardioData: { distanceKm: 7, durationMinutes: 40 }, durationMinutes: 40 }) as unknown as SessionLog;
const timeSec = Array.from({ length: 60 }, (_, i) => i * 40);
const set = { timeSec, heartRate: timeSec.map(() => 170) };

describe('de reeksen van je tests lezen', () => {
  beforeEach(async () => {
    await wipeAllData();
    await ActivityStreamsRepo.put(packStreams(set, { logId: 'a', externalId: 'bron:a', fetchedAt: '2026-11-10T09:00:00.000Z', wholeKm: 7, wholeMinutes: 40 })!);
  });
  afterEach(() => vi.restoreAllMocks());

  it('alles gelezen: ook een test zonder bewaarde reeks is gelezen', async () => {
    const r = await streamsForLogs([log('a'), log('b')]);
    expect(r.complete).toBe(true);
    expect([...r.map.keys()]).toEqual(['a']);
  });

  it('niet op tijd gelezen: niet compleet, dus geen voorstel', async () => {
    vi.spyOn(ActivityStreamsRepo, 'get').mockImplementation(() => new Promise(() => {}));
    const r = await streamsForLogs([log('a')], 20);
    expect(r.complete).toBe(false);
  });

  it('een reeks die niet te lezen is: niet compleet', async () => {
    vi.spyOn(ActivityStreamsRepo, 'get').mockRejectedValue(new Error('kapot'));
    const r = await streamsForLogs([log('a'), log('b')]);
    expect(r.complete).toBe(false);
    expect(r.map.size).toBe(0);
  });
});

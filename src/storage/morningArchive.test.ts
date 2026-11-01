import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RecoveryMetricsRepo, wipeAllData } from './database';
import { clearConnection, saveConnection, syncWatchActivities } from './externalActivities';
import { archivedMornings, clearArchivedMornings, putBackMornings } from './morningArchive';
import { clearWellness, getRecoveryMetrics } from './wellness';
import type { RecoveryMetric } from '../models/metrics';
import { addDays, todayISO } from '../utils/dates';

// Nagemaakte gegevens en een nagemaakte fetch.
const KEY = 'nep-sleutel-0000';
const ATHLETE = 'i99999';
const night = () => ({ id: todayISO(), restingHR: 54, hrv: 47, sleepSecs: 25200, sleepScore: 78 });
const fakeFetch = () => vi.fn(async (url: string) => new Response(JSON.stringify(String(url).includes('/wellness') ? [night()] : []), { status: 200 })) as unknown as typeof fetch;
const hand = (): RecoveryMetric => ({ id: 'hand-1', date: addDays(todayISO(), -3), restingHeartRate: 50, source: 'manual' });

describe('het archief met ochtenden', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  it('blijft na ontkoppelen, en gaat pas weg als je de instelling zonder koppeling uitzet', async () => {
    await saveConnection({ athleteId: ATHLETE, apiKey: KEY });
    await syncWatchActivities({ fetchImpl: fakeFetch() });
    await RecoveryMetricsRepo.putAll([hand()]);
    await clearConnection();
    expect(await archivedMornings()).toHaveLength(1);
    const removed = await clearArchivedMornings();
    expect(removed.map((r) => r.date)).toEqual([todayISO()]);
    expect((await getRecoveryMetrics()).map((r) => r.id)).toEqual(['hand-1']);
  });

  it('ruimt niets op zolang er een koppeling is', async () => {
    await saveConnection({ athleteId: ATHLETE, apiKey: KEY });
    await syncWatchActivities({ fetchImpl: fakeFetch() });
    expect(await archivedMornings()).toEqual([]);
    expect(await clearArchivedMornings()).toEqual([]);
    expect(await getRecoveryMetrics()).toHaveLength(1);
  });

  it('Ongedaan maken zet de opgeruimde ochtenden terug, precies zoals ze waren', async () => {
    const kept: RecoveryMetric = { id: `intervals.icu:${todayISO()}`, date: todayISO(), source: 'import', restingHeartRate: 54, hrv: 47 };
    await RecoveryMetricsRepo.putAll([kept, hand()]);
    const removed = await clearArchivedMornings();
    expect(await getRecoveryMetrics()).toHaveLength(1);
    await putBackMornings(removed);
    expect((await getRecoveryMetrics()).find((r) => r.id === kept.id)).toEqual(kept);
  });

  it('nog een keer ontkoppelen laat een kale ochtend zoals hij is', async () => {
    const bare: RecoveryMetric = { id: `intervals.icu:${todayISO()}`, date: todayISO(), source: 'import', restingHeartRate: 54 };
    await RecoveryMetricsRepo.putAll([bare]);
    const put = vi.spyOn(RecoveryMetricsRepo, 'putAll');
    const del = vi.spyOn(RecoveryMetricsRepo, 'delete');
    await clearWellness();
    expect(put).not.toHaveBeenCalled();
    expect(del).not.toHaveBeenCalled();
    put.mockRestore();
    del.mockRestore();
    expect(await getRecoveryMetrics()).toEqual([bare]);
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RecoveryMetricsRepo, wipeAllData } from './database';
import { clearConnection, onWatchChange, saveConnection, syncWatchActivities } from './externalActivities';
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
    const found = await archivedMornings();
    expect(found).toEqual({ linked: false, list: [expect.objectContaining({ date: todayISO() })] });
    await clearArchivedMornings(found.list);
    expect((await getRecoveryMetrics()).map((r) => r.id)).toEqual(['hand-1']);
  });

  it('met een koppeling alleen wat ouder is dan 400 dagen, want dat haalt de volgende keer ophalen weg', async () => {
    const old = addDays(todayISO(), -450);
    await saveConnection({ athleteId: ATHLETE, apiKey: KEY });
    await syncWatchActivities({ fetchImpl: fakeFetch() });
    await RecoveryMetricsRepo.putAll([{ id: `intervals.icu:${old}`, date: old, source: 'import', restingHeartRate: 49 }]);
    const found = await archivedMornings();
    expect(found.linked).toBe(true);
    expect(found.list.map((r) => r.date)).toEqual([old]);
  });

  it('ruimt alles in een keer op, met deleteMany, en meldt het aan Vandaag', async () => {
    const a: RecoveryMetric = { id: `intervals.icu:${todayISO()}`, date: todayISO(), source: 'import', hrv: 47 };
    const b: RecoveryMetric = { id: `intervals.icu:${addDays(todayISO(), -1)}`, date: addDays(todayISO(), -1), source: 'import', hrv: 45 };
    await RecoveryMetricsRepo.putAll([a, b, hand()]);
    const many = vi.spyOn(RecoveryMetricsRepo, 'deleteMany');
    const one = vi.spyOn(RecoveryMetricsRepo, 'delete');
    const listener = vi.fn();
    const stop = onWatchChange(listener);
    await clearArchivedMornings([a, b]);
    stop();
    expect(many).toHaveBeenCalledTimes(1);
    expect(one).not.toHaveBeenCalled();
    expect(listener).toHaveBeenCalledTimes(1);
    many.mockRestore();
    one.mockRestore();
    expect((await getRecoveryMetrics()).map((r) => r.id)).toEqual(['hand-1']);
  });

  it('deleteMany laat bij een fout alles staan', async () => {
    const a: RecoveryMetric = { id: `intervals.icu:${todayISO()}`, date: todayISO(), source: 'import', hrv: 47 };
    await RecoveryMetricsRepo.putAll([a, hand()]);
    // Een ongeldige sleutel halverwege breekt de hele transactie af.
    await expect(RecoveryMetricsRepo.deleteMany([a.id, null as unknown as string])).rejects.toBeTruthy();
    expect((await getRecoveryMetrics()).map((r) => r.id).sort()).toEqual(['hand-1', a.id].sort());
  });

  it('Ongedaan maken zet de opgeruimde ochtenden terug, precies zoals ze waren, en slaat over wat er al staat', async () => {
    const kept: RecoveryMetric = { id: `intervals.icu:${todayISO()}`, date: todayISO(), source: 'import', restingHeartRate: 54, hrv: 47 };
    const newer: RecoveryMetric = { id: `intervals.icu:${addDays(todayISO(), -1)}`, date: addDays(todayISO(), -1), source: 'import', hrv: 40 };
    await RecoveryMetricsRepo.putAll([kept, newer, hand()]);
    const { list } = await archivedMornings();
    await clearArchivedMornings(list.filter((r) => r.id === kept.id));
    expect(await getRecoveryMetrics()).toHaveLength(2);
    await putBackMornings(list);
    const all = await getRecoveryMetrics();
    expect(all.find((r) => r.id === kept.id)).toEqual(kept);
    expect(all.find((r) => r.id === newer.id)).toEqual(newer);
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

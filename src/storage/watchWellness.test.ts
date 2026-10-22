import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RecoveryMetricsRepo, SessionLogsRepo, wipeAllData } from './database';
import {
  clearConnection,
  getWatchState,
  onWatchChange,
  recordAutoTicked,
  saveConnection,
  setAutoLoggedStatus,
  setAutoTick,
  syncWatchActivities,
} from './externalActivities';
import { getRecoveryMetrics, syncWellness } from './wellness';
import { buildBackupEnvelope } from './backup';
import type { SessionLog } from '../models/training';
import { addDays, todayISO } from '../utils/dates';

// Made-up data and a mocked fetch only: activities for the activities URL,
// wellness records for the wellness URL.
const KEY = 'geheime-sleutel-0123';
const ATHLETE = 'i12345';

function intervalsFetch(wellness: unknown[] = []) {
  const body = [{ id: 'i1', start_date_local: `${todayISO()}T08:00:00`, type: 'Run', source: 'GARMIN_CONNECT', moving_time: 3000, distance: 6500 }];
  return vi.fn(async (url: string) => new Response(JSON.stringify(String(url).includes('/wellness') ? wellness : body), { status: 200 }));
}
const asFetch = (f: unknown) => f as unknown as typeof fetch;

const tonight = () => ({ id: todayISO(), restingHR: 55, hrv: 44.3, sleepSecs: 20400, sleepScore: 72 });
const nightBefore = () => ({ id: addDays(todayISO(), -1), restingHR: 51, hrv: 52, sleepSecs: 26100, sleepScore: 81 });

describe('sleep, resting heart rate and HRV', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  it('are fetched with the activities, for the last four weeks, and kept as RecoveryMetric', async () => {
    await saveConnection({ athleteId: ATHLETE, apiKey: KEY });
    const fetchImpl = intervalsFetch([nightBefore(), tonight()]);
    const result = await syncWatchActivities({ fetchImpl: asFetch(fetchImpl) });
    expect(result).toEqual({ status: 'ok', count: 1, wellness: { days: 2, today: true } });
    const urls = fetchImpl.mock.calls.map((c) => String(c[0]));
    expect(urls.find((u) => u.includes('/wellness.json'))).toContain(`oldest=${addDays(todayISO(), -28)}&newest=${todayISO()}`);
    const metrics = await getRecoveryMetrics();
    expect(metrics).toHaveLength(2);
    expect(metrics.find((m) => m.date === todayISO())).toEqual({
      id: `intervals.icu:${todayISO()}`, date: todayISO(), source: 'import', restingHeartRate: 55, hrv: 44.3, sleepScore: 72, sleepMinutes: 340,
    });
  });

  it('tell the Today card when they arrive', async () => {
    await saveConnection({ athleteId: ATHLETE, apiKey: KEY });
    const listener = vi.fn();
    const stop = onWatchChange(listener);
    await syncWatchActivities({ fetchImpl: asFetch(intervalsFetch([tonight()])) });
    stop();
    // Once for the activities, once for the wellness records.
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('a problem with the wellness records never makes the activity fetch fail', async () => {
    await saveConnection({ athleteId: ATHLETE, apiKey: KEY });
    const body = [{ id: 'i1', start_date_local: `${todayISO()}T08:00:00`, type: 'Run', moving_time: 3000 }];
    const fetchImpl = vi.fn(async (url: string) => (String(url).includes('/wellness') ? new Response('{}', { status: 500 }) : new Response(JSON.stringify(body), { status: 200 })));
    const result = await syncWatchActivities({ fetchImpl: asFetch(fetchImpl) });
    expect(result).toEqual({ status: 'ok', count: 1, wellness: undefined });
    expect((await getWatchState()).activities).toHaveLength(1);
    expect(await getRecoveryMetrics()).toEqual([]);
  });

  it('an account without wellness gives no records, and the check-in has nothing to show', async () => {
    await saveConnection({ athleteId: ATHLETE, apiKey: KEY });
    const result = await syncWatchActivities({ fetchImpl: asFetch(intervalsFetch()) });
    expect(result).toMatchObject({ status: 'ok', wellness: { days: 0, today: false } });
    expect(await getRecoveryMetrics()).toEqual([]);
  });

  it('go when you unlink, except what was entered another way', async () => {
    await saveConnection({ athleteId: ATHLETE, apiKey: KEY });
    await syncWatchActivities({ fetchImpl: asFetch(intervalsFetch([tonight()])) });
    await RecoveryMetricsRepo.putAll([{ id: 'hand-1', date: addDays(todayISO(), -3), restingHeartRate: 50, source: 'manual' }]);
    await clearConnection();
    expect((await getRecoveryMetrics()).map((m) => m.id)).toEqual(['hand-1']);
  });

  it('old days are dropped on the next fetch', async () => {
    const old = addDays(todayISO(), -60);
    await RecoveryMetricsRepo.putAll([{ id: `intervals.icu:${old}`, date: old, restingHeartRate: 50, source: 'import' }]);
    const result = await syncWellness({ athleteId: ATHLETE, apiKey: KEY }, { fetchImpl: asFetch(intervalsFetch([tonight()])) });
    expect(result).toEqual({ status: 'ok', days: 1, today: true });
    expect((await getRecoveryMetrics()).map((m) => m.date)).toEqual([todayISO()]);
  });

  it('gives a message instead of throwing when the key is wrong', async () => {
    const wrong = vi.fn(async () => new Response('{}', { status: 401 }));
    const result = await syncWellness({ athleteId: ATHLETE, apiKey: KEY }, { fetchImpl: asFetch(wrong) });
    expect(result.status).toBe('error');
  });

  it('are a cache and stay out of the export', async () => {
    await saveConnection({ athleteId: ATHLETE, apiKey: KEY });
    await syncWatchActivities({ fetchImpl: asFetch(intervalsFetch([tonight()])) });
    const text = JSON.stringify(await buildBackupEnvelope());
    expect(text).not.toContain('intervals.icu:');
    expect(text).not.toContain('sleepMinutes');
    expect(text).not.toContain('restingHeartRate');
  });
});

describe('Vanzelf afvinken: the switch and the notes', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  const log: SessionLog = {
    id: 'log_auto', templateId: 'tpl_easy_run', type: 'cardio', completedDate: '2026-10-14', completedAt: '2026-10-14T08:30:00.000Z',
    variant: 'custom', durationMinutes: 52, externalId: 'intervals.icu:i1', source: 'garmin',
  };

  it('is on until the user switches it off, and the choice survives unlinking', async () => {
    expect((await getWatchState()).autoTick).toBe(true);
    await setAutoTick(false);
    expect((await getWatchState()).autoTick).toBe(false);
    await saveConnection({ athleteId: ATHLETE, apiKey: KEY });
    await clearConnection();
    expect((await getWatchState()).autoTick).toBe(false);
    await setAutoTick(true);
    expect((await getWatchState()).autoTick).toBe(true);
  });

  it('keeps a note of a tick-off, with the log that was made, and updates its status', async () => {
    await SessionLogsRepo.put(log);
    const now = new Date('2026-10-14T09:00:00.000Z');
    expect(await recordAutoTicked('intervals.icu:i1', now)).toBe(true);
    expect((await getWatchState()).autoLogged).toEqual([{ externalId: 'intervals.icu:i1', logId: 'log_auto', at: now.toISOString(), status: 'asking' }]);
    await setAutoLoggedStatus('intervals.icu:i1', 'rejected');
    expect((await getWatchState()).autoLogged[0].status).toBe('rejected');
    // The note outlives unlinking, so the activity is not ticked off again.
    await clearConnection();
    expect((await getWatchState()).autoLogged).toHaveLength(1);
  });

  it('writes no note when there is no log', async () => {
    expect(await recordAutoTicked('intervals.icu:i9')).toBe(false);
    expect((await getWatchState()).autoLogged).toEqual([]);
  });

  it('switch and notes stay out of the export, like the key', async () => {
    await SessionLogsRepo.put(log);
    await setAutoTick(false);
    await recordAutoTicked('intervals.icu:i1');
    const text = JSON.stringify(await buildBackupEnvelope());
    expect(text).not.toContain('autoLogged');
    expect(text).not.toContain('autoTick');
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RecoveryMetricsRepo, SettingsRepo, wipeAllData } from './database';
import { getWatchState, getWatchState as readState, onWatchChange, saveConnection, setWatchUse, syncWatchActivities } from './externalActivities';
import { getRecoveryMetrics } from './wellness';
import { getWatchWorkoutState } from './watchWorkouts';
import { buildBackupEnvelope, normalizeBackupToCurrentModel } from './backup';
import { DEFAULT_WATCH_USE } from '../engine/watchUse';
import { DEFAULT_OVERVIEWS, resolveOverviews } from '../engine/overviewSettings';
import { addDays, todayISO } from '../utils/dates';

// Made-up data and a mocked fetch only. The switches of the card "Wat ASCEND
// van je horloge gebruikt": what is off is not fetched, not kept, not used.

const KEY = 'geheime-sleutel-0123';
const ATHLETE = 'i12345';
const asFetch = (f: unknown) => f as unknown as typeof fetch;

function intervalsFetch() {
  const activities = [{ id: 'i1', start_date_local: `${todayISO()}T08:00:00`, type: 'Run', source: 'GARMIN_CONNECT', moving_time: 3000, distance: 6500 }];
  const wellness = [
    { id: addDays(todayISO(), -1), restingHR: 51, hrv: 52, sleepSecs: 26100, sleepScore: 81 },
    { id: todayISO(), restingHR: 55, hrv: 44.3, sleepSecs: 20400, sleepScore: 72 },
  ];
  return vi.fn(async (url: string) => new Response(JSON.stringify(String(url).includes('/wellness') ? wellness : activities), { status: 200 }));
}
const wellnessCalls = (f: ReturnType<typeof intervalsFetch>) => f.mock.calls.filter((c) => String(c[0]).includes('/wellness')).length;
const activityCalls = (f: ReturnType<typeof intervalsFetch>) => f.mock.calls.filter((c) => !String(c[0]).includes('/wellness')).length;

describe('the defaults', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  it('are all on for the data and off for sending trainings to the watch', async () => {
    const state = await getWatchState();
    expect(state.use).toEqual(DEFAULT_WATCH_USE);
    expect(state.autoTick).toBe(true);
    expect((await getWatchWorkoutState()).enabled).toBe(false);
  });
});

describe('switching a kind off', () => {
  beforeEach(async () => {
    await wipeAllData();
    await saveConnection({ athleteId: ATHLETE, apiKey: KEY });
  });

  it('trainings off: not fetched, the stored ones gone, and the key is still checked on demand', async () => {
    const f = intervalsFetch();
    await syncWatchActivities({ fetchImpl: asFetch(f) });
    expect((await getWatchState()).activities).toHaveLength(1);

    await setWatchUse({ activities: false });
    expect((await getWatchState()).activities).toEqual([]);

    const g = intervalsFetch();
    const result = await syncWatchActivities({ fetchImpl: asFetch(g), force: true });
    expect(result).toMatchObject({ status: 'ok', count: 0 });
    // The activities request is one small check of the key, and its answer is thrown away.
    expect((await getWatchState()).activities).toEqual([]);
    expect(wellnessCalls(g)).toBe(1);
  });

  it('trainings off, in the background: the activities are not asked for at all', async () => {
    await setWatchUse({ activities: false });
    const f = intervalsFetch();
    await syncWatchActivities({ fetchImpl: asFetch(f) });
    expect(activityCalls(f)).toBe(0);
    expect(wellnessCalls(f)).toBe(1);
  });

  it('trainings back on: the next sync is not held back by the 15-minute pause', async () => {
    await syncWatchActivities({ fetchImpl: asFetch(intervalsFetch()) });
    await setWatchUse({ activities: false });
    await setWatchUse({ activities: true });
    const f = intervalsFetch();
    const result = await syncWatchActivities({ fetchImpl: asFetch(f) });
    expect(result).toMatchObject({ status: 'ok', count: 1 });
  });

  it('sleep off: only the sleep fields leave what is stored and are not stored again', async () => {
    await syncWatchActivities({ fetchImpl: asFetch(intervalsFetch()) });
    expect((await getRecoveryMetrics())[0].sleepMinutes).toBeDefined();

    await setWatchUse({ sleep: false });
    for (const m of await getRecoveryMetrics()) {
      expect(m.sleepMinutes).toBeUndefined();
      expect(m.sleepScore).toBeUndefined();
      expect(m.restingHeartRate).toBeDefined();
      expect(m.hrv).toBeDefined();
    }

    await syncWatchActivities({ fetchImpl: asFetch(intervalsFetch()), force: true });
    for (const m of await getRecoveryMetrics()) expect(m.sleepMinutes).toBeUndefined();
  });

  it('all three wellness kinds off: no wellness request, nothing stored', async () => {
    await syncWatchActivities({ fetchImpl: asFetch(intervalsFetch()) });
    await setWatchUse({ sleep: false, restingHeartRate: false, hrv: false });
    expect(await getRecoveryMetrics()).toEqual([]);

    const f = intervalsFetch();
    await syncWatchActivities({ fetchImpl: asFetch(f), force: true });
    expect(wellnessCalls(f)).toBe(0);
    expect(activityCalls(f)).toBe(1);
    expect(await getRecoveryMetrics()).toEqual([]);
  });

  it('everything off: nothing is fetched in the background', async () => {
    await setWatchUse({ activities: false, sleep: false, restingHeartRate: false, hrv: false });
    const f = intervalsFetch();
    expect(await syncWatchActivities({ fetchImpl: asFetch(f) })).toEqual({ status: 'off' });
    expect(f).not.toHaveBeenCalled();
    // "Verbinding testen" still checks the key, with one small request.
    expect(await syncWatchActivities({ fetchImpl: asFetch(f), force: true })).toMatchObject({ status: 'ok', count: 0 });
    expect(f).toHaveBeenCalledTimes(1);
    expect(await getRecoveryMetrics()).toEqual([]);
  });

  it('leaves what you entered yourself alone when a kind goes off', async () => {
    await RecoveryMetricsRepo.putAll([{ id: 'manual:1', date: addDays(todayISO(), -2), source: 'manual', hrv: 40, sleepMinutes: 400 }]);
    await syncWatchActivities({ fetchImpl: asFetch(intervalsFetch()) });
    await setWatchUse({ sleep: false, hrv: false });
    const mine = (await getRecoveryMetrics()).find((m) => m.id === 'manual:1');
    expect(mine).toMatchObject({ hrv: 40, sleepMinutes: 400 });
  });

  it('tells listeners, so the cards redraw at once', async () => {
    const seen = vi.fn();
    const stop = onWatchChange(seen);
    await setWatchUse({ hrv: false });
    stop();
    expect(seen).toHaveBeenCalled();
    expect((await readState()).use.hrv).toBe(false);
  });
});

describe('a device preference', () => {
  beforeEach(async () => {
    await wipeAllData();
    await saveConnection({ athleteId: ATHLETE, apiKey: KEY });
  });

  it('is not part of an export or the settings', async () => {
    await setWatchUse({ sleep: false, activities: false });
    await SettingsRepo.set({ strengthTrackedExternally: true });
    const text = JSON.stringify(await buildBackupEnvelope());
    expect(text).not.toContain('watchActivities');
    expect(text).not.toContain('restingHeartRate');
    expect(JSON.stringify(await SettingsRepo.get())).not.toContain('"use"');
  });
});

describe('weight and the backup', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  it('weight from MacroFactor and its switch travel in the export, in the settings', async () => {
    await SettingsRepo.set({
      weightEntries: [{ date: '2026-10-18', kg: 85.35, source: 'macrofactor', basis: 'trend', scaleKg: 84.8 }],
      weightFromMacroFactor: false,
    });
    const roundTripped = normalizeBackupToCurrentModel(JSON.parse(JSON.stringify(await buildBackupEnvelope())));
    expect(roundTripped.settings?.weightEntries).toEqual([{ date: '2026-10-18', kg: 85.35, source: 'macrofactor', basis: 'trend', scaleKg: 84.8 }]);
    expect(roundTripped.settings?.weightFromMacroFactor).toBe(false);
  });

  it('an older backup, with weight but without the new fields, still reads', async () => {
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    envelope.payload.settings = { ...envelope.payload.settings, weightEntries: [{ date: '2026-09-01', kg: 87, source: 'manual' }] };
    const normalized = normalizeBackupToCurrentModel(envelope);
    expect(normalized.settings?.weightEntries).toEqual([{ date: '2026-09-01', kg: 87, source: 'manual' }]);
    expect(normalized.settings?.weightFromMacroFactor).toBeUndefined();
  });

  it('drops a damaged entry or switch instead of storing it half', async () => {
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    envelope.payload.settings = {
      ...envelope.payload.settings,
      weightEntries: [{ date: '2026-09-01', kg: 87, source: 'manual' }, { date: '2026-09-02', kg: 86, source: 'macrofactor', basis: 'gok' }],
      weightFromMacroFactor: 'ja',
    };
    const normalized = normalizeBackupToCurrentModel(envelope);
    expect(normalized.settings?.weightEntries).toHaveLength(1);
    expect(normalized.settings?.weightFromMacroFactor).toBeUndefined();
  });
});

describe('the switches of Overzichten en vragen and the backup', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  it('travel in the export, in the settings', async () => {
    await SettingsRepo.set({ overviews: { weekReview: false, weekReviewDay: 'sunday', weatherSwap: false } });
    const roundTripped = normalizeBackupToCurrentModel(JSON.parse(JSON.stringify(await buildBackupEnvelope())));
    expect(roundTripped.settings?.overviews).toEqual({ weekReview: false, weekReviewDay: 'sunday', weatherSwap: false });
  });

  it('an older backup without them still imports, and means how the app always was', async () => {
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    delete envelope.payload.settings.overviews;
    const normalized = normalizeBackupToCurrentModel(envelope);
    expect(normalized.settings?.overviews).toBeUndefined();
    expect(resolveOverviews(normalized.settings?.overviews)).toEqual(DEFAULT_OVERVIEWS);
  });

  it('drops a damaged value instead of storing it', async () => {
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    envelope.payload.settings = { ...envelope.payload.settings, overviews: 'uit' };
    expect(normalizeBackupToCurrentModel(envelope).settings?.overviews).toBeUndefined();
  });
});

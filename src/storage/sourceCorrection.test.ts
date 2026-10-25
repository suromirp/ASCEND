import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SessionLogsRepo, wipeAllData } from './database';
import { getWatchState, saveConnection, setTakeCorrections, syncWatchActivities } from './externalActivities';
import { applySourceCorrections, onSourceCorrected, restoreSourceUpdateStored, takeOverOfferedStored } from './sourceCorrection';
import { buildBackupEnvelope, normalizeBackupToCurrentModel } from './backup';
import { migrateLogSourceSync, migrateSourceSync } from './migrations';
import { activityToDraft, type ExternalActivity } from '../engine/activityImport';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { restoreSourceUpdate } from '../engine/sourceCorrection';
import type { SessionLog, SourceSync } from '../models/training';
import { todayISO } from '../utils/dates';

// Made-up activities, logs and answers only. A correction made at intervals.icu
// arrives with the usual fetch and is written to the log tied to the activity.

const KEY = 'geheime-sleutel-0123';
const ATHLETE = 'i12345';
const NOW = new Date('2026-10-25T08:00:00.000Z');
const template = buildDefaultProgramData().templates.find((t) => t.id === 'tpl_easy_run')!;
const start = `${todayISO()}T08:00:00`;

// The answer of intervals.icu for one run.
function raw(extra: Record<string, unknown> = {}) {
  return { id: 'i1', start_date_local: start, type: 'Run', source: 'GARMIN_CONNECT', moving_time: 3600, distance: 9800, total_elevation_gain: 140, total_elevation_loss: 138, average_heartrate: 128, max_heartrate: 171, average_cadence: 168, ...extra };
}
function fetchOf(activities: unknown[]) {
  return vi.fn(async (url: string) => new Response(JSON.stringify(String(url).includes('/wellness') ? [] : activities), { status: 200 }));
}
const asFetch = (f: unknown) => f as unknown as typeof fetch;

const activity: ExternalActivity = {
  externalId: 'intervals.icu:i1', source: 'garmin', start, kind: 'run', durationSec: 3600, distanceM: 9800,
  elevationGainM: 140, elevationLossM: 138, avgHeartRate: 128, maxHeartRate: 171, avgCadence: 168, treadmill: false,
};
const tied = (extra: Partial<SessionLog> = {}): SessionLog => ({ id: 'log_1', ...activityToDraft(activity, template), rpe: 6, notes: 'Rustig', ...extra });
const plain = (log: SessionLog) => JSON.parse(JSON.stringify(log));

describe('a fetch brings a correction into the log', () => {
  beforeEach(async () => {
    await wipeAllData();
    await saveConnection({ athleteId: ATHLETE, apiKey: KEY });
  });

  it('writes the corrected numbers once, keeps what you filled in, and a second fetch writes nothing', async () => {
    await SessionLogsRepo.put(tied());
    const seen: number[] = [];
    const stop = onSourceCorrected(() => seen.push(1));
    // A stretch cut off at intervals.icu, the climb corrected.
    const corrected = fetchOf([raw({ moving_time: 3000, distance: 8100, total_elevation_gain: 95 })]);
    const first = await syncWatchActivities({ force: true, fetchImpl: asFetch(corrected) });
    expect(first.status).toBe('ok');
    const log = (await SessionLogsRepo.getAll())[0];
    expect(log).toMatchObject({ durationMinutes: 50, rpe: 6, notes: 'Rustig', cardioData: { durationMinutes: 50, distanceKm: 8.1, elevationGainM: 95, elevationLossM: 138, avgHeartRate: 128 } });
    expect(log.sourceSync?.updated?.previous).toEqual({ durationMinutes: 60, distanceKm: 9.8, elevationGainM: 140 });
    expect(seen).toHaveLength(1);

    await syncWatchActivities({ force: true, fetchImpl: asFetch(corrected) });
    expect(plain((await SessionLogsRepo.getAll())[0])).toEqual(plain(log));
    expect(seen).toHaveLength(1);
    stop();
  });

  it('asks for nothing extra: one request for the activities', async () => {
    await SessionLogsRepo.put(tied());
    const f = fetchOf([raw({ distance: 8100 })]);
    await syncWatchActivities({ force: true, fetchImpl: asFetch(f) });
    const urls = f.mock.calls.map((c) => String(c[0]));
    expect(urls.filter((u) => u.includes('/activities')).length).toBeLessThanOrEqual(2);
    expect(urls.some((u) => u.includes('streams'))).toBe(false);
  });

  it('leaves the log alone when the switch is off, and takes the correction when it goes on', async () => {
    await SessionLogsRepo.put(tied());
    await setTakeCorrections(false);
    expect((await getWatchState()).takeCorrections).toBe(false);
    const corrected = fetchOf([raw({ distance: 8100 })]);
    await syncWatchActivities({ force: true, fetchImpl: asFetch(corrected) });
    expect((await SessionLogsRepo.getAll())[0].cardioData?.distanceKm).toBe(9.8);
    await setTakeCorrections(true);
    await syncWatchActivities({ force: true, fetchImpl: asFetch(corrected) });
    expect((await SessionLogsRepo.getAll())[0].cardioData?.distanceKm).toBe(8.1);
  });

  it('does nothing for an activity that was deleted at intervals.icu', async () => {
    const log = tied();
    await SessionLogsRepo.put(log);
    await syncWatchActivities({ force: true, fetchImpl: asFetch(fetchOf([raw({ id: 'i2', start_date_local: start })])) });
    expect(plain((await SessionLogsRepo.getAll())[0])).toEqual(plain(log));
    await syncWatchActivities({ force: true, fetchImpl: asFetch(fetchOf([raw({ deleted: true })])) });
    expect(plain((await SessionLogsRepo.getAll())[0])).toEqual(plain(log));
  });

  it('gives an older log its fingerprint and changes nothing else', async () => {
    const { sourceSync: _x, ...old } = tied();
    void _x;
    await SessionLogsRepo.put(old as SessionLog);
    await syncWatchActivities({ force: true, fetchImpl: asFetch(fetchOf([raw({ distance: 8100 })])) });
    const log = (await SessionLogsRepo.getAll())[0];
    expect(log.cardioData?.distanceKm).toBe(9.8);
    expect(log.sourceSync?.seen.distanceKm).toBe(8.1);
    expect(log.sourceSync?.updated).toBeUndefined();
  });
});

describe('the way back, stored', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  it('puts the previous numbers back in one write and keeps the fingerprint', async () => {
    const log = tied();
    await SessionLogsRepo.put(log);
    const out = await applySourceCorrections([{ ...activity, distanceM: 8100 }], true, NOW);
    expect(out.updated).toBe(1);
    expect(await restoreSourceUpdateStored('log_1')).toBe(true);
    const back = (await SessionLogsRepo.getAll())[0];
    expect(back.cardioData?.distanceKm).toBe(9.8);
    expect(back.sourceSync).toEqual({ seen: { ...log.sourceSync!.seen, distanceKm: 8.1 }, externalId: 'intervals.icu:i1' });
    // The same correction does not come back at the next fetch.
    expect((await applySourceCorrections([{ ...activity, distanceM: 8100 }], true, NOW)).updated).toBe(0);
    expect(await restoreSourceUpdateStored('log_1')).toBe(false);
    expect(await restoreSourceUpdateStored('nope')).toBe(false);
  });

  it('offers the numbers for a cut log and takes them on request', async () => {
    const cut: SessionLog = {
      ...tied(), durationMinutes: 40, cardioData: { ...tied().cardioData!, durationMinutes: 40, distanceKm: 6.5 },
      trim: { at: NOW.toISOString(), startSec: 0, endSec: 2400, totalSec: 3600, block: 'cardioData', original: { durationMinutes: 60, distanceKm: 9.8 } },
    };
    await SessionLogsRepo.put(cut);
    const seen: number[] = [];
    const stop = onSourceCorrected(() => seen.push(1));
    await applySourceCorrections([{ ...activity, elevationGainM: 90 }], true, NOW);
    stop();
    expect(seen).toHaveLength(1);
    const offered = (await SessionLogsRepo.getAll())[0];
    expect(offered.trim).toBeDefined();
    expect(offered.cardioData?.elevationGainM).toBe(140);
    expect(offered.sourceSync?.offered).toEqual({ elevationGainM: 90 });

    expect(await takeOverOfferedStored('log_1', NOW)).toBe(true);
    const taken = (await SessionLogsRepo.getAll())[0];
    expect(taken).not.toHaveProperty('trim');
    expect(taken).toMatchObject({ durationMinutes: 60, rpe: 6, cardioData: { distanceKm: 9.8, elevationGainM: 90 } });
    expect(await takeOverOfferedStored('log_1', NOW)).toBe(false);
  });
});

describe('the stored shape in the back-up', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  it('travels in the back-up and comes back whole, and the undo still works', async () => {
    await SessionLogsRepo.put(tied());
    await applySourceCorrections([{ ...activity, distanceM: 8100 }], true, NOW);
    const stored = (await SessionLogsRepo.getAll())[0];
    const envelope = await buildBackupEnvelope();
    const back = normalizeBackupToCurrentModel(JSON.parse(JSON.stringify(envelope))).sessionLogs.find((l) => l.id === 'log_1')!;
    expect(plain(back)).toEqual(plain(stored));
    expect(restoreSourceUpdate(back).cardioData?.distanceKm).toBe(9.8);
  });

  it('reads a back-up from before the field as it was', () => {
    const { sourceSync: _x, ...old } = tied();
    void _x;
    const file = { backupSchemaVersion: 5, createdAt: '2026-10-01T00:00:00.000Z', payload: { version: 5, sessionLogs: [old], settings: {} } };
    const log = normalizeBackupToCurrentModel(file).sessionLogs[0];
    expect(plain(log)).toEqual(plain(old as SessionLog));
    expect(log).not.toHaveProperty('sourceSync');
  });

  it('drops a damaged field and keeps the log', () => {
    const damaged = { ...tied(), sourceSync: { seen: { distanceKm: 'x' } } } as unknown as SessionLog;
    const file = { backupSchemaVersion: 5, createdAt: '2026-10-01T00:00:00.000Z', payload: { version: 5, sessionLogs: [damaged], settings: {} } };
    const log = normalizeBackupToCurrentModel(file).sessionLogs[0];
    expect(log).not.toHaveProperty('sourceSync');
    expect(log).toMatchObject({ id: 'log_1', rpe: 6, externalId: 'intervals.icu:i1' });
  });
});

describe('reading the field', () => {
  const whole: SourceSync = {
    seen: { durationMinutes: 50, distanceKm: 8.1, elevationGainM: 0, avgHeartRate: 128 },
    updated: { at: NOW.toISOString(), block: 'cardioData', previous: { durationMinutes: 60, distanceKm: 9.8, cadence: null }, blockDurationMinutes: 59 },
    offered: { distanceKm: 7.5 },
  };

  it('keeps a whole field, a climb of 0 m included', () => {
    expect(migrateSourceSync(whole)).toEqual(whole);
    const log = { ...tied(), sourceSync: whole };
    expect(migrateLogSourceSync(log)).toEqual(log);
  });

  it('is a pass-through for a log without it', () => {
    const log = tied();
    const { sourceSync: _x, ...bare } = log;
    void _x;
    expect(migrateLogSourceSync(bare as SessionLog)).toBe(bare);
  });

  it('drops only the part that is damaged', () => {
    expect(migrateSourceSync({ ...whole, updated: { ...whole.updated, previous: { distanceKm: -1 } } })).toEqual({ seen: whole.seen, offered: whole.offered });
    expect(migrateSourceSync({ ...whole, updated: { ...whole.updated, block: 'strengthData' } })?.updated).toBeUndefined();
    expect(migrateSourceSync({ ...whole, updated: { ...whole.updated, at: 5 } })?.updated).toBeUndefined();
    expect(migrateSourceSync({ ...whole, updated: { ...whole.updated, blockDurationMinutes: 0 } })?.updated).toBeUndefined();
    expect(migrateSourceSync({ ...whole, offered: { distanceKm: Number.NaN } })?.offered).toBeUndefined();
  });

  it('keeps the update and the offer when the fingerprint cannot be read, and the fingerprint counts as missing', () => {
    for (const seen of [{ durationMinutes: 0 }, { distanceKm: Infinity }, undefined, {}, { foo: 1 }]) {
      const out = migrateSourceSync({ ...whole, seen })!;
      expect(out.seen).toEqual({});
      expect(out.updated).toEqual(whole.updated);
      expect(out.offered).toEqual(whole.offered);
    }
    // Nothing else to keep: the field goes.
    expect(migrateSourceSync({ seen: {} })).toBeUndefined();
    expect(migrateSourceSync({ seen: { foo: 1 } })).toBeUndefined();
    expect(migrateSourceSync('x')).toBeUndefined();
    expect(migrateSourceSync(null)).toBeUndefined();
    expect(migrateSourceSync([])).toBeUndefined();
  });

  it('keeps the id of the activity, and drops one that is no text', () => {
    expect(migrateSourceSync({ ...whole, externalId: 'intervals.icu:i1' })?.externalId).toBe('intervals.icu:i1');
    expect(migrateSourceSync({ ...whole, externalId: 5 })).not.toHaveProperty('externalId');
  });

  it('does not keep fields it does not know', () => {
    const out = migrateSourceSync({ ...whole, extra: 1, seen: { ...whole.seen, onbekend: 3 } })!;
    expect(out).not.toHaveProperty('extra');
    expect(out.seen).not.toHaveProperty('onbekend');
  });

  it('drops the field on a log that does not come from intervals.icu or has no block, and an update of a block it lacks', () => {
    expect(migrateLogSourceSync({ ...tied(), externalId: undefined, sourceSync: whole }).sourceSync).toBeUndefined();
    const { cardioData: _c, ...noBlock } = tied();
    void _c;
    expect(migrateLogSourceSync({ ...noBlock, sourceSync: whole } as SessionLog).sourceSync).toBeUndefined();
    const other = migrateLogSourceSync({ ...tied(), sourceSync: { ...whole, updated: { ...whole.updated!, block: 'outdoorData' } } });
    expect(other.sourceSync?.updated).toBeUndefined();
    expect(other.sourceSync?.seen).toEqual(whole.seen);
  });
});

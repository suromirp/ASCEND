import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SessionLogsRepo, wipeAllData } from './database';
import { clearConnection, saveConnection, syncWatchActivities } from './externalActivities';
import { applyAlignments, restoreAlignments } from './watchAlign';
import { attachDetailToStoredLog } from './activityDetail';
import { fetchTrimStreams, trimStoredLog, TrimUnavailableError, undoTrimStoredLog } from './trim';
import { buildBackupEnvelope, normalizeBackupToCurrentModel } from './backup';
import { migrateLogTrim, migrateSessionTrim } from './migrations';
import { buildActivityDetail } from '../engine/activityDetail';
import { trimActivity } from '../engine/activityTrim';
import { asProviderAnswer, joinStreams, makeDrive, makeStreams } from '../engine/fixtures/runStreams';
import type { ExternalActivity } from '../engine/activityImport';
import type { SessionLog, SessionTrim } from '../models/training';
import { addDays, todayISO } from '../utils/dates';

// Made-up series, logs and requests only. "Inkorten": a watch activity cut at
// the end, stored on the log with the numbers it replaced, in the back-up, and
// taken back exactly.

const KEY = 'geheime-sleutel-0123';
const ATHLETE = 'i12345';
const day = addDays(todayISO(), -2);
const asFetch = (f: unknown) => f as unknown as typeof fetch;

const streams = joinStreams(
  makeStreams({ minutes: 60, pace: 360, hr: 150, cadence: 170, grade: (m) => (m < 20 ? 0.04 : m < 40 ? 0 : -0.04), startAltitude: 20 }),
  makeDrive({ minutes: 14, kmh: 50, walkSec: 60, standSec: 30, hr: 85 }),
);
const total = streams.timeSec[streams.timeSec.length - 1];
const own = trimActivity(streams, 0, total + 1)!;

function watchLog(extra: Partial<SessionLog> = {}): SessionLog {
  return {
    id: 'log_1', templateId: 'tpl_easy_run', type: 'cardio', sport: 'running', completedDate: day, completedAt: `${day}T09:15:00.000Z`,
    variant: 'custom', durationMinutes: own.durationMinutes, rpe: 5, notes: 'Rustig',
    cardioData: { durationMinutes: own.durationMinutes, distanceKm: own.distanceKm, elevationGainM: 140, elevationLossM: 138, avgHeartRate: 128, maxHeartRate: 171, environment: 'outdoor', source: 'garmin' },
    externalId: 'intervals.icu:a1',
    detail: buildActivityDetail(streams, { source: 'garmin', conditions: { source: 'lookup', tempC: 12 } }),
    source: 'garmin',
    ...extra,
  };
}
const plain = (log: SessionLog) => JSON.parse(JSON.stringify(log));

describe('cutting and putting back, stored', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  it('writes the cut, and the undo gives the log back exactly', async () => {
    const log = watchLog();
    await SessionLogsRepo.put(log);
    expect(await trimStoredLog('log_1', streams, 0, 3600)).toBe(true);
    const stored = (await SessionLogsRepo.getAll())[0];
    expect(stored.durationMinutes).toBe(60);
    expect(stored.trim?.endSec).toBe(3600);
    expect(stored.rpe).toBe(5);

    expect(await undoTrimStoredLog('log_1')).toBe(true);
    expect(plain((await SessionLogsRepo.getAll())[0])).toEqual(plain(log));
    expect(await undoTrimStoredLog('log_1')).toBe(false);
  });

  it('writes nothing when the log is gone, cut already, or there is nothing to cut', async () => {
    expect(await trimStoredLog('nope', streams, 0, 3600)).toBe(false);
    await SessionLogsRepo.put(watchLog());
    expect(await trimStoredLog('log_1', streams, 0, total)).toBe(false);
    expect(await trimStoredLog('log_1', streams, 0, 3600)).toBe(true);
    expect(await trimStoredLog('log_1', streams, 0, 1800)).toBe(false);
    expect((await SessionLogsRepo.getAll())[0].trim?.endSec).toBe(3600);
  });

  it('keeps what you fill in while the sheet is open: only the numbers of the cut are written', async () => {
    await SessionLogsRepo.put(watchLog());
    // The feeling is filled in after the series were fetched, before the cut is written.
    await SessionLogsRepo.put({ ...watchLog(), rpe: 8, notes: 'Later ingevuld' });
    await trimStoredLog('log_1', streams, 0, 3600);
    expect((await SessionLogsRepo.getAll())[0]).toMatchObject({ rpe: 8, notes: 'Later ingevuld', durationMinutes: 60 });
  });

  it('takes the cut back first when the hand-made numbers are put back after the watch took over', async () => {
    const hand: SessionLog = {
      id: 'log_1', templateId: 'tpl_easy_run', type: 'cardio', sport: 'running', completedDate: day, completedAt: `${day}T18:00:00.000Z`,
      variant: 'full', durationMinutes: 55, source: 'manual', cardioData: { durationMinutes: 55, distanceKm: 6.9, source: 'manual' }, rpe: 4, notes: 'Rustig',
    };
    const activity: ExternalActivity = {
      externalId: 'intervals.icu:a1', source: 'garmin', start: `${day}T07:30:00`, kind: 'run', durationSec: 75 * 60,
      distanceM: 21700, elevationGainM: 140, avgHeartRate: 128, maxHeartRate: 171, treadmill: false,
    };
    await SessionLogsRepo.put(hand);
    await applyAlignments([{ logId: 'log_1', activity }], new Date('2026-10-22T08:00:00.000Z'));
    expect(await trimStoredLog('log_1', streams, 0, 3600)).toBe(true);
    const cut = (await SessionLogsRepo.getAll())[0];
    expect(cut.manualMeasured).toBeDefined();
    expect(cut.trim).toBeDefined();
    expect(cut.durationMinutes).toBeLessThan(75);

    expect(await restoreAlignments(['log_1'])).toBe(1);
    const back = (await SessionLogsRepo.getAll())[0];
    expect(back).not.toHaveProperty('trim');
    expect(back).not.toHaveProperty('manualMeasured');
    expect(back).not.toHaveProperty('externalId');
    expect(back).toMatchObject({ durationMinutes: 55, source: 'manual', rpe: 4, notes: 'Rustig', cardioData: { durationMinutes: 55, distanceKm: 6.9, source: 'manual' } });
  });

  it('does not give a cut log the profile of the whole activity', async () => {
    const cut = watchLog();
    delete cut.detail;
    await SessionLogsRepo.put(cut);
    await trimStoredLog('log_1', streams, 0, 3600);
    const detail = buildActivityDetail(streams, { source: 'garmin' })!;
    expect(await attachDetailToStoredLog('log_1', detail)).toBe(false);
    expect((await SessionLogsRepo.getAll())[0]).not.toHaveProperty('detail');
  });
});

describe('fetching the series for the sheet', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  const answer = (set = streams) => vi.fn(async () => new Response(JSON.stringify(asProviderAnswer(set)), { status: 200 }));

  it('says there is no link when there is none', async () => {
    await expect(fetchTrimStreams(watchLog(), { fetchImpl: asFetch(answer()) })).rejects.toThrow(TrimUnavailableError);
    await expect(fetchTrimStreams(watchLog(), { fetchImpl: asFetch(answer()) })).rejects.toThrow(/koppeling/);
  });

  it('says so for a log that did not come from the watch', async () => {
    await saveConnection({ athleteId: ATHLETE, apiKey: KEY });
    await expect(fetchTrimStreams(watchLog({ externalId: undefined }))).rejects.toThrow(/horloge/);
  });

  it('fetches all series for an activity it does not know, and starts the clock at 0', async () => {
    await saveConnection({ athleteId: ATHLETE, apiKey: KEY });
    const fetchImpl = answer();
    const got = await fetchTrimStreams(watchLog(), { fetchImpl: asFetch(fetchImpl) });
    expect(got.timeSec[0]).toBe(0);
    expect(got.timeSec).toHaveLength(streams.timeSec.length);
    expect(got.speedMs).toBeDefined();
    const url = new URL(String((fetchImpl.mock.calls[0] as unknown[])[0]));
    expect(url.pathname).toBe('/api/v1/activity/a1/streams.json');
    expect(url.searchParams.get('types')).toContain('velocity_smooth');
  });

  it('turns an error of the provider into a sentence for the sheet', async () => {
    await saveConnection({ athleteId: ATHLETE, apiKey: KEY });
    const unauthorized = vi.fn(async () => new Response('no', { status: 401 }));
    await expect(fetchTrimStreams(watchLog(), { fetchImpl: asFetch(unauthorized) })).rejects.toThrow(/API-sleutel/);
    const offline = vi.fn(async () => {
      throw new TypeError('offline');
    });
    await expect(fetchTrimStreams(watchLog(), { fetchImpl: asFetch(offline) })).rejects.toThrow(/Geen verbinding/);
  });

  it('refuses series that are no use: too short, or without speed or distance', async () => {
    await saveConnection({ athleteId: ATHLETE, apiKey: KEY });
    const heartOnly = vi.fn(async () => new Response(JSON.stringify([{ type: 'time', data: Array.from({ length: 200 }, (_, i) => i) }, { type: 'heartrate', data: Array.from({ length: 200 }, () => 140) }]), { status: 200 }));
    await expect(fetchTrimStreams(watchLog(), { fetchImpl: asFetch(heartOnly) })).rejects.toThrow(/Inkorten kan dan niet/);
    const empty = vi.fn(async () => new Response('[]', { status: 200 }));
    await expect(fetchTrimStreams(watchLog(), { fetchImpl: asFetch(empty) })).rejects.toThrow(TrimUnavailableError);
    const tiny = makeStreams({ minutes: 1.5, pace: 360, hr: 150 });
    await expect(fetchTrimStreams(watchLog(), { fetchImpl: asFetch(answer(tiny)) })).rejects.toThrow(/te kort/);
  });

  it('asks the provider for the series the stored activity says it has', async () => {
    await saveConnection({ athleteId: ATHLETE, apiKey: KEY });
    const rawFetch = vi.fn(async (url: string) => {
      const u = new URL(String(url));
      if (u.pathname.endsWith('/wellness.json')) return new Response('[]', { status: 200 });
      if (u.pathname.endsWith('/activities')) {
        return new Response(JSON.stringify([{ id: 'a1', start_date_local: `${todayISO()}T07:30:00`, type: 'Run', moving_time: 3600, distance: 10000, stream_types: ['time', 'distance', 'velocity_smooth'] }]), { status: 200 });
      }
      return new Response(JSON.stringify(asProviderAnswer(streams)), { status: 200 });
    });
    await syncWatchActivities({ fetchImpl: asFetch(rawFetch), force: true });
    await fetchTrimStreams(watchLog(), { fetchImpl: asFetch(rawFetch) });
    const streamCall = rawFetch.mock.calls.map((c) => new URL(String(c[0]))).find((u) => u.pathname.includes('/streams.json'))!;
    expect(streamCall.searchParams.get('types')).toBe('time,distance,velocity_smooth');
    await clearConnection();
  });
});

describe('the stored shape in the back-up', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  it('travels in the back-up and comes back whole', async () => {
    const log = watchLog();
    await SessionLogsRepo.put(log);
    await trimStoredLog('log_1', streams, 0, 3600);
    const stored = (await SessionLogsRepo.getAll())[0];

    const envelope = await buildBackupEnvelope();
    const roundTripped = normalizeBackupToCurrentModel(JSON.parse(JSON.stringify(envelope)));
    const back = roundTripped.sessionLogs.find((l) => l.id === 'log_1')!;
    expect(plain(back)).toEqual(plain(stored));
    expect(back.trim?.original.detail).toBeDefined();
    // And the undo still works on what came out of the file.
    expect(plain(await restoreFromFile(back))).toEqual(plain(log));
  });

  it('reads a back-up from before the field as it was', () => {
    const old = { backupSchemaVersion: 5, createdAt: '2026-10-01T00:00:00.000Z', payload: { version: 5, sessionLogs: [watchLog()], settings: {} } };
    const normalized = normalizeBackupToCurrentModel(old);
    expect(plain(normalized.sessionLogs[0])).toEqual(plain(watchLog()));
    expect(normalized.sessionLogs[0]).not.toHaveProperty('trim');
  });

  it('drops a damaged field and keeps the log', () => {
    const damaged = { ...watchLog(), trim: { at: 5, startSec: 'x' } } as unknown as SessionLog;
    const old = { backupSchemaVersion: 5, createdAt: '2026-10-01T00:00:00.000Z', payload: { version: 5, sessionLogs: [damaged], settings: {} } };
    const log = normalizeBackupToCurrentModel(old).sessionLogs[0];
    expect(log).not.toHaveProperty('trim');
    expect(log).toMatchObject({ id: 'log_1', durationMinutes: own.durationMinutes, rpe: 5, externalId: 'intervals.icu:a1' });
  });
});

async function restoreFromFile(log: SessionLog): Promise<SessionLog> {
  const { undoTrim } = await import('../engine/trimLog');
  return undoTrim(log);
}

describe('reading the field', () => {
  const whole: SessionTrim = {
    at: '2026-10-24T10:00:00.000Z', startSec: 0, endSec: 3600, totalSec: 4570, block: 'cardioData',
    original: { durationMinutes: 75, blockDurationMinutes: 74, distanceKm: 21.7, elevationGainM: 0, elevationLossM: 138, avgHeartRate: 128, maxHeartRate: 171 },
  };

  it('keeps a whole field, a climb of 0 m included', () => {
    expect(migrateSessionTrim(whole).trim).toEqual(whole);
    const log = { ...watchLog(), trim: whole };
    expect(migrateLogTrim(log)).toEqual(log);
  });

  it('is a pass-through for a log without it', () => {
    const plainLog = watchLog();
    expect(migrateLogTrim(plainLog)).toBe(plainLog);
  });

  it('drops a field whose numbers are not finite, negative or out of place', () => {
    const bad = (patch: Record<string, unknown>) => migrateSessionTrim({ ...whole, ...patch }).trim;
    expect(bad({ startSec: Number.NaN })).toBeUndefined();
    expect(bad({ startSec: -1 })).toBeUndefined();
    expect(bad({ endSec: Infinity })).toBeUndefined();
    expect(bad({ endSec: 0 })).toBeUndefined();
    expect(bad({ endSec: 5000 })).toBeUndefined();
    expect(bad({ totalSec: 0 })).toBeUndefined();
    expect(bad({ at: 5 })).toBeUndefined();
    expect(bad({ block: 'strengthData' })).toBeUndefined();
    expect(bad({ original: undefined })).toBeUndefined();
    expect(bad({ original: { ...whole.original, durationMinutes: 0 } })).toBeUndefined();
    expect(bad({ original: { ...whole.original, durationMinutes: '75' } })).toBeUndefined();
    expect(bad({ original: { ...whole.original, distanceKm: -3 } })).toBeUndefined();
    expect(bad({ original: { ...whole.original, avgHeartRate: Number.NaN } })).toBeUndefined();
    expect(bad({ original: { ...whole.original, blockDurationMinutes: 0 } })).toBeUndefined();
    expect(migrateSessionTrim('x').trim).toBeUndefined();
    expect(migrateSessionTrim(null).trim).toBeUndefined();
    expect(migrateSessionTrim([]).trim).toBeUndefined();
  });

  it('does not keep fields it does not know', () => {
    const out = migrateSessionTrim({ ...whole, extra: 1, original: { ...whole.original, onbekend: 3 } }).trim!;
    expect(out).not.toHaveProperty('extra');
    expect(out.original).not.toHaveProperty('onbekend');
  });

  it('drops the field and, with it, a profile that cannot be put back right', () => {
    const detail = watchLog().detail!;
    const good = { ...watchLog(), trim: { ...whole, original: { ...whole.original, detail } } };
    expect(migrateLogTrim(good).trim?.original.detail).toEqual(detail);
    // The profile that was replaced is damaged: the profile of the cut piece goes too,
    // so that the undo does not put the wrong one back.
    const broken = { ...watchLog(), trim: { ...whole, original: { ...whole.original, detail: { version: 1, slices: 'x' } } } } as unknown as SessionLog;
    const fixed = migrateLogTrim(broken);
    expect(fixed.trim).toBeDefined();
    expect(fixed.trim?.original).not.toHaveProperty('detail');
    expect(fixed).not.toHaveProperty('detail');
    expect(fixed.cardioData).toBeDefined();
  });
});

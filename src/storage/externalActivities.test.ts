import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MetaRepo, SessionLogsRepo, SettingsRepo, wipeAllData } from './database';
import {
  clearConnection,
  dismissActivity,
  getConnection,
  getWatchState,
  isFetchDue,
  maskKey,
  onWatchChange,
  saveConnection,
  syncWatchActivities,
} from './externalActivities';
import { buildBackupEnvelope, normalizeBackupToCurrentModel } from './backup';
import { CURRENT_SCHEMA_VERSION, migrateExport, migrateV1toV2, type AscendExport } from './migrations';
import type { SessionLog } from '../models/training';
import { todayISO } from '../utils/dates';

const KEY = 'geheime-sleutel-0123';
const ATHLETE = 'i12345';

// The answers of intervals.icu: activities for the activities URL, wellness
// records for the wellness URL (empty unless a test gives some).
function activitiesFetch(status = 200, wellness: unknown[] = []) {
  const start = `${todayISO()}T08:00:00`;
  const body = [{ id: 'i1', start_date_local: start, type: 'Run', source: 'GARMIN_CONNECT', moving_time: 3000, distance: 6500, total_elevation_gain: 30 }];
  return vi.fn(async (url: string) => new Response(JSON.stringify(String(url).includes('/wellness') ? wellness : body), { status }));
}

describe('connection', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  it('is stored locally, trimmed, and can be removed', async () => {
    expect(await getConnection()).toBeNull();
    await saveConnection({ athleteId: ` ${ATHLETE} `, apiKey: ` ${KEY} ` });
    expect(await getConnection()).toEqual({ athleteId: ATHLETE, apiKey: KEY });
    await clearConnection();
    expect(await getConnection()).toBeNull();
  });

  it('refuses an empty id or key', async () => {
    await expect(saveConnection({ athleteId: '', apiKey: KEY })).rejects.toThrow(/athlete-id/);
    await expect(saveConnection({ athleteId: ATHLETE, apiKey: ' ' })).rejects.toThrow(/API-sleutel/);
    expect(await getConnection()).toBeNull();
  });

  it('shows only the end of the key', () => {
    expect(maskKey(KEY)).toBe('••••0123');
    expect(maskKey('abc')).toBe('••••');
  });
});

describe('the key never leaves in an export', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  it('is in neither the backup envelope nor the settings', async () => {
    await saveConnection({ athleteId: ATHLETE, apiKey: KEY });
    await syncWatchActivities({ fetchImpl: activitiesFetch() as unknown as typeof fetch });
    await dismissActivity('intervals.icu:i9');
    await SettingsRepo.set({ strengthTrackedExternally: true });

    const envelope = await buildBackupEnvelope();
    const text = JSON.stringify(envelope);
    expect(text).not.toContain(KEY);
    expect(text).not.toContain(ATHLETE);
    expect(text).not.toContain('intervalsIcu');
    expect(text).not.toContain('watchActivities');
    // The key is still on this device.
    expect((await getConnection())?.apiKey).toBe(KEY);
    expect(JSON.stringify(await SettingsRepo.get())).not.toContain(KEY);
  });
});

describe('externalId in the export', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  it('survives an export and a read-back, and old logs without it still read', async () => {
    const imported: SessionLog = {
      id: 'log_ext', templateId: 'tpl_easy_run', type: 'cardio', completedDate: '2026-10-14', completedAt: '2026-10-14T08:30:00.000Z',
      variant: 'custom', durationMinutes: 55, externalId: 'intervals.icu:i1001', source: 'garmin',
    };
    const manual: SessionLog = { id: 'log_man', templateId: 'tpl_easy_run', type: 'cardio', completedDate: '2026-10-13', completedAt: '2026-10-13T08:30:00.000Z', variant: 'full', durationMinutes: 40, source: 'manual' };
    await SessionLogsRepo.put(imported);
    await SessionLogsRepo.put(manual);

    const envelope = await buildBackupEnvelope();
    const roundTripped = normalizeBackupToCurrentModel(JSON.parse(JSON.stringify(envelope)));
    expect(roundTripped.sessionLogs.find((l) => l.id === 'log_ext')?.externalId).toBe('intervals.icu:i1001');
    expect(roundTripped.sessionLogs.find((l) => l.id === 'log_man')?.externalId).toBeUndefined();
  });
});

describe('migration v1 to v2', () => {
  const v1: AscendExport = {
    schemaVersion: 1, exportDate: '2026-06-01T00:00:00.000Z', program: null, templates: [], plannedSessions: [],
    sessionLogs: [{ id: 'l1', templateId: 't', completedDate: '2026-05-01', completedAt: '2026-05-01T10:00:00.000Z' }],
    objectives: [], milestoneProgress: [], settings: {},
  };

  it('is a pass-through: only the version moves', () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(2);
    const migrated = migrateV1toV2(v1);
    expect(migrated.schemaVersion).toBe(2);
    expect({ ...migrated, schemaVersion: 1 }).toEqual(v1);
    expect(migrateExport(v1).sessionLogs).toEqual(v1.sessionLogs);
  });

  it('still opens a v2 file and refuses a newer one', () => {
    expect(migrateExport({ ...v1, schemaVersion: 2 }).schemaVersion).toBe(2);
    expect(() => migrateExport({ ...v1, schemaVersion: 3 })).toThrow(/nieuwere versie/);
  });

  it('a legacy v1 file still normalizes into the current model', () => {
    const normalized = normalizeBackupToCurrentModel(v1);
    expect(normalized.sessionLogs).toHaveLength(1);
    expect(normalized.sourceBackupSchemaVersion).toBe(0);
  });
});

describe('fetching', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  it('does nothing without a connection', async () => {
    const fetchImpl = activitiesFetch();
    expect(await syncWatchActivities({ fetchImpl: fetchImpl as unknown as typeof fetch })).toEqual({ status: 'not-connected' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('keeps what it fetched for the Today card and asks for the last 7 days', async () => {
    await saveConnection({ athleteId: ATHLETE, apiKey: KEY });
    const fetchImpl = activitiesFetch();
    const now = new Date('2026-10-20T09:00:00.000Z');
    const result = await syncWatchActivities({ fetchImpl: fetchImpl as unknown as typeof fetch, now });
    expect(result).toEqual({ status: 'ok', count: 1, wellness: { days: 0, today: false } });
    const url = (fetchImpl.mock.calls[0] as unknown as [string])[0];
    expect(url).toMatch(/oldest=\d{4}-\d{2}-\d{2}&newest=\d{4}-\d{2}-\d{2}$/);
    const state = await getWatchState();
    expect(state.fetchedAt).toBe(now.toISOString());
    expect(state.activities[0]).toMatchObject({ externalId: 'intervals.icu:i1', kind: 'run', source: 'garmin' });
  });

  it('asks at most once per 15 minutes, unless forced', async () => {
    await saveConnection({ athleteId: ATHLETE, apiKey: KEY });
    const fetchImpl = activitiesFetch();
    const f = fetchImpl as unknown as typeof fetch;
    const t0 = new Date('2026-10-20T09:00:00.000Z');
    expect((await syncWatchActivities({ fetchImpl: f, now: t0 })).status).toBe('ok');
    expect((await syncWatchActivities({ fetchImpl: f, now: new Date(t0.getTime() + 14 * 60_000) })).status).toBe('too-soon');
    // One round is two requests: the activities and the wellness records.
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect((await syncWatchActivities({ fetchImpl: f, now: new Date(t0.getTime() + 15 * 60_000) })).status).toBe('ok');
    expect((await syncWatchActivities({ fetchImpl: f, now: new Date(t0.getTime() + 16 * 60_000), force: true })).status).toBe('ok');
    expect(fetchImpl).toHaveBeenCalledTimes(6);
  });

  it('knows when a fetch is due', () => {
    const now = new Date('2026-10-20T09:00:00.000Z');
    expect(isFetchDue(undefined, now)).toBe(true);
    expect(isFetchDue('geen datum', now)).toBe(true);
    expect(isFetchDue('2026-10-20T08:50:00.000Z', now)).toBe(false);
    expect(isFetchDue('2026-10-20T08:45:00.000Z', now)).toBe(true);
  });

  it('turns a wrong key into a message, keeps the old activities, and does not throw', async () => {
    await saveConnection({ athleteId: ATHLETE, apiKey: KEY });
    await syncWatchActivities({ fetchImpl: activitiesFetch() as unknown as typeof fetch, now: new Date('2026-10-20T09:00:00.000Z') });
    const result = await syncWatchActivities({ fetchImpl: activitiesFetch(401) as unknown as typeof fetch, force: true });
    expect(result.status).toBe('error');
    expect(result.status === 'error' && result.message).toMatch(/API-sleutel/);
    const state = await getWatchState();
    expect(state.lastError).toMatch(/API-sleutel/);
    expect(state.activities).toHaveLength(1);
    // A later success clears the message.
    await syncWatchActivities({ fetchImpl: activitiesFetch() as unknown as typeof fetch, force: true });
    expect((await getWatchState()).lastError).toBeUndefined();
  });

  it('turns a network failure into a message', async () => {
    await saveConnection({ athleteId: ATHLETE, apiKey: KEY });
    const offline = vi.fn(async () => { throw new TypeError('Failed to fetch'); });
    const result = await syncWatchActivities({ fetchImpl: offline as unknown as typeof fetch });
    expect(result).toMatchObject({ status: 'error' });
    expect(result.status === 'error' && result.message).toMatch(/Geen verbinding/);
  });

  it('tests values that are not saved yet without storing a connection', async () => {
    const result = await syncWatchActivities({ connection: { athleteId: ATHLETE, apiKey: KEY }, force: true, fetchImpl: activitiesFetch() as unknown as typeof fetch });
    expect(result.status).toBe('ok');
    expect(await getConnection()).toBeNull();
  });
});

describe('"Niet opslaan"', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  it('is remembered, once, and tells the card', async () => {
    const listener = vi.fn();
    const stop = onWatchChange(listener);
    await dismissActivity('intervals.icu:i1');
    await dismissActivity('intervals.icu:i1');
    stop();
    expect((await getWatchState()).dismissed).toEqual(['intervals.icu:i1']);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('survives unlinking, while the key and the fetched activities go', async () => {
    await saveConnection({ athleteId: ATHLETE, apiKey: KEY });
    await syncWatchActivities({ fetchImpl: activitiesFetch() as unknown as typeof fetch });
    await dismissActivity('intervals.icu:i1');
    await clearConnection();
    const state = await getWatchState();
    expect(state.dismissed).toEqual(['intervals.icu:i1']);
    expect(state.activities).toEqual([]);
    expect(await MetaRepo.get('intervalsIcuConnection')).toBeNull();
  });
});

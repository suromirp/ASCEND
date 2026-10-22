import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SessionLogsRepo, SettingsRepo, wipeAllData } from './database';
import { saveConnection, setWatchUse } from './externalActivities';
import { attachActivityDetail, attachDetailToStoredLog, wantsDetail } from './activityDetail';
import { buildBackupEnvelope, normalizeBackupToCurrentModel, parseBackupText, buildImportPreview, createImportPlan, createPreImportSnapshot, applyImportPlan, defaultActionsForMode, defaultPlanPolicyForMode } from './backup';
import { CURRENT_BACKUP_SCHEMA_VERSION } from './backupTypes';
import { migrateActivityDetail, migrateLogDetail } from './migrations';
import { buildActivityDetail } from '../engine/activityDetail';
import { asProviderAnswer, makeStreams } from '../engine/fixtures/runStreams';
import type { ExternalActivity } from '../engine/activityImport';
import type { ActivityDetail } from '../models/activityDetail';
import type { SessionLog } from '../models/training';
import { addDays, todayISO } from '../utils/dates';

// Made-up data and mocked requests only. The compact profile of a run: fetched
// once after the save, kept on the log, travelling in a backup of schema 5.

const asFetch = (f: unknown) => f as unknown as typeof fetch;
const day = addDays(todayISO(), -2);

const ACTIVITY: ExternalActivity = {
  externalId: 'intervals.icu:i4711',
  source: 'garmin',
  start: `${day}T08:12:03`,
  kind: 'run',
  durationSec: 2400,
  distanceM: 6600,
  elevationGainM: 12,
  treadmill: false,
  streamsAvailable: ['time', 'distance', 'heartRate', 'speed', 'altitude', 'cadence', 'position'],
};

function logFor(activity: ExternalActivity, extra: Partial<SessionLog> = {}): SessionLog {
  return {
    id: 'log_1',
    templateId: 'tpl_easy_run',
    type: 'cardio',
    sport: 'running',
    completedDate: day,
    completedAt: `${day}T08:52:03.000Z`,
    variant: 'custom',
    durationMinutes: 40,
    externalId: activity.externalId,
    source: 'garmin',
    ...extra,
  };
}

const streams = makeStreams({ minutes: 40, pace: 360, hr: 145, cadence: 86, start: { lat: 52.37, lon: 4.9 } });

const WEATHER = {
  hourly: {
    time: [`${day}T08:00`, `${day}T09:00`],
    temperature_2m: [10, 12],
    apparent_temperature: [8, 11],
    relative_humidity_2m: [85, 80],
    precipitation: [0, 0],
    wind_speed_10m: [12, 14],
    wind_gusts_10m: [20, 24],
  },
};

function requests() {
  return vi.fn(async (url: string) => {
    if (String(url).includes('open-meteo')) return new Response(JSON.stringify(WEATHER), { status: 200 });
    return new Response(JSON.stringify(asProviderAnswer(streams)), { status: 200 });
  });
}
const count = (f: ReturnType<typeof requests>, part: string) => f.mock.calls.filter((c) => String(c[0]).includes(part)).length;

describe('which activities get a profile', () => {
  it('a run or tocht with series that ASCEND uses, not a ride or strength or one without series', () => {
    expect(wantsDetail(ACTIVITY)).toBe(true);
    expect(wantsDetail({ ...ACTIVITY, kind: 'hike' })).toBe(true);
    expect(wantsDetail({ ...ACTIVITY, kind: 'ride' })).toBe(false);
    expect(wantsDetail({ ...ACTIVITY, kind: 'strength' })).toBe(false);
    expect(wantsDetail({ ...ACTIVITY, streamsAvailable: ['power'] })).toBe(false);
    expect(wantsDetail({ ...ACTIVITY, streamsAvailable: undefined })).toBe(false);
  });
});

describe('fetching the profile after the save', () => {
  beforeEach(async () => {
    await wipeAllData();
    await saveConnection({ athleteId: 'i12345', apiKey: 'geheime-sleutel-0123' });
    await SessionLogsRepo.put(logFor(ACTIVITY));
  });

  it('makes one request for the series and one for the weather, and keeps a profile of 48 pieces', async () => {
    const f = requests();
    expect(await attachActivityDetail(ACTIVITY, { fetchImpl: asFetch(f) })).toBe('attached');
    expect(count(f, '/streams.json')).toBe(1);
    expect(count(f, 'open-meteo')).toBe(1);
    // The weather lookup only knows a place rounded to two decimals.
    const weatherUrl = String(f.mock.calls.find((c) => String(c[0]).includes('open-meteo'))![0]);
    expect(weatherUrl).toContain('latitude=52.37');
    expect(weatherUrl).toContain('longitude=4.9');

    const log = (await SessionLogsRepo.getAll())[0];
    expect(log.detail?.slices).toHaveLength(48);
    expect(log.detail?.conditions).toMatchObject({ source: 'lookup', tempC: 10 });
    // The log is otherwise exactly as it was.
    expect({ ...log, detail: undefined }).toEqual({ ...logFor(ACTIVITY), detail: undefined });
    // No track in the profile, no key in it.
    const text = JSON.stringify(log.detail);
    expect(text).not.toContain('52.37');
    expect(text).not.toContain('geheime');
  });

  it('a second time does nothing: the log already has its profile', async () => {
    const f = requests();
    await attachActivityDetail(ACTIVITY, { fetchImpl: asFetch(f) });
    const g = requests();
    expect(await attachActivityDetail(ACTIVITY, { fetchImpl: asFetch(g) })).toBe('skipped');
    expect(g).not.toHaveBeenCalled();
  });

  it('without the weather switch it makes no weather request, and keeps the profile', async () => {
    await SettingsRepo.set({ runInsight: { weather: false } });
    const f = requests();
    expect(await attachActivityDetail(ACTIVITY, { fetchImpl: asFetch(f) })).toBe('attached');
    expect(count(f, 'open-meteo')).toBe(0);
    expect((await SessionLogsRepo.getAll())[0].detail?.conditions).toBeUndefined();
  });

  it('on a treadmill there is no weather to look up', async () => {
    const treadmill = { ...ACTIVITY, treadmill: true };
    const f = requests();
    expect(await attachActivityDetail(treadmill, { fetchImpl: asFetch(f) })).toBe('attached');
    expect(count(f, 'open-meteo')).toBe(0);
  });

  it('a weather failure does not cost the profile', async () => {
    const f = vi.fn(async (url: string) => (String(url).includes('open-meteo') ? new Response('{}', { status: 500 }) : new Response(JSON.stringify(asProviderAnswer(streams)), { status: 200 })));
    expect(await attachActivityDetail(ACTIVITY, { fetchImpl: asFetch(f) })).toBe('attached');
    expect((await SessionLogsRepo.getAll())[0].detail?.conditions).toBeUndefined();
  });

  it('a failing request leaves the log as it was', async () => {
    const f = vi.fn(async () => new Response('{}', { status: 500 }));
    expect(await attachActivityDetail(ACTIVITY, { fetchImpl: asFetch(f) })).toBe('failed');
    expect((await SessionLogsRepo.getAll())[0]).toEqual(logFor(ACTIVITY));
  });

  it('with the details switch off nothing is requested', async () => {
    await setWatchUse({ details: false });
    const f = requests();
    expect(await attachActivityDetail(ACTIVITY, { fetchImpl: asFetch(f) })).toBe('skipped');
    expect(f).not.toHaveBeenCalled();
    await setWatchUse({ details: true, activities: false });
    expect(await attachActivityDetail(ACTIVITY, { fetchImpl: asFetch(f) })).toBe('skipped');
    expect(f).not.toHaveBeenCalled();
  });

  it('without a log of that activity there is nothing to attach to', async () => {
    const f = requests();
    expect(await attachActivityDetail({ ...ACTIVITY, externalId: 'intervals.icu:i9' }, { fetchImpl: asFetch(f) })).toBe('skipped');
    expect(f).not.toHaveBeenCalled();
  });
});

describe('the profile never writes back an older copy of the log', () => {
  const detail = buildActivityDetail(streams, { source: 'garmin' })!;
  beforeEach(async () => {
    await wipeAllData();
  });

  it('a feeling given while the series were on their way stays', async () => {
    await SessionLogsRepo.put(logFor(ACTIVITY));
    // Another writer between the fetch and the attach (the feeling in the completion moment).
    const stored = (await SessionLogsRepo.getAll())[0];
    await SessionLogsRepo.put({ ...stored, subjectiveFeel: 'better' });
    expect(await attachDetailToStoredLog(stored.id, detail)).toBe(true);
    const after = (await SessionLogsRepo.getAll())[0];
    expect(after.subjectiveFeel).toBe('better');
    expect(after.detail).toBeTruthy();
  });

  it('a log that already has a profile, or is gone, is left alone', async () => {
    await SessionLogsRepo.put(logFor(ACTIVITY, { detail }));
    expect(await attachDetailToStoredLog('log_1', detail)).toBe(false);
    expect(await attachDetailToStoredLog('log_nope', detail)).toBe(false);
  });
});

describe('the profile in a backup', () => {
  const detail = buildActivityDetail(streams, { source: 'garmin', conditions: { tempC: 11, source: 'lookup' } })!;

  async function importEnvelope(payload: unknown) {
    const backup = normalizeBackupToCurrentModel(payload);
    const selections = { ...defaultActionsForMode('full_restore'), app_settings: 'replace' as const };
    const policy = defaultPlanPolicyForMode('full_restore');
    const preview = await buildImportPreview(backup, selections, policy);
    const snapshot = await createPreImportSnapshot();
    const plan = createImportPlan(backup, 'full_restore', selections, policy, preview.diffByCategory.flatMap((d) => d.conflicts), snapshot.id);
    await applyImportPlan(backup, plan);
  }

  beforeEach(async () => {
    await wipeAllData();
  });

  it('travels with the log and the backup schema stays 5', async () => {
    await SessionLogsRepo.put(logFor(ACTIVITY, { detail }));
    const envelope = await buildBackupEnvelope();
    expect(CURRENT_BACKUP_SCHEMA_VERSION).toBe(5);
    expect(envelope.backupSchemaVersion).toBe(5);
    const file = parseBackupText(JSON.stringify(envelope));
    await wipeAllData();
    await importEnvelope(file);
    const restored = (await SessionLogsRepo.getAll()).find((l) => l.id === 'log_1')!;
    expect(restored.detail).toEqual(detail);
  });

  it('a backup from before the profile imports as it was', async () => {
    await SessionLogsRepo.put(logFor(ACTIVITY));
    const envelope = await buildBackupEnvelope();
    await wipeAllData();
    await importEnvelope(parseBackupText(JSON.stringify(envelope)));
    const restored = (await SessionLogsRepo.getAll()).find((l) => l.id === 'log_1')!;
    expect(restored).toEqual(logFor(ACTIVITY));
  });

  it('a damaged profile is dropped and the rest of the log is kept', async () => {
    await SessionLogsRepo.put(logFor(ACTIVITY, { detail }));
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    const logs = envelope.payload.sessionLogs as { id: string; detail?: { slices: unknown[] } }[];
    logs.find((l) => l.id === 'log_1')!.detail!.slices = logs.find((l) => l.id === 'log_1')!.detail!.slices.slice(0, 10);
    await wipeAllData();
    await importEnvelope(envelope);
    const restored = (await SessionLogsRepo.getAll()).find((l) => l.id === 'log_1')!;
    expect(restored.detail).toBeUndefined();
    expect(restored.durationMinutes).toBe(40);
    expect(restored.externalId).toBe(ACTIVITY.externalId);
  });

  it('the switches of the loopinzicht travel, only valid ones', async () => {
    await SettingsRepo.set({ runInsight: { weather: false, chestStrap: true, topics: { form: false } } });
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    expect(envelope.payload.settings.runInsight).toEqual({ weather: false, chestStrap: true, topics: { form: false } });
    envelope.payload.settings.runInsight = { weather: 'nee', enabled: false, topics: { form: 'x', efficiency: false }, rommel: 1 };
    await wipeAllData();
    await importEnvelope(envelope);
    expect((await SettingsRepo.get()).runInsight).toEqual({ enabled: false, topics: { efficiency: false } });
  });
});

describe('reading a profile from a file', () => {
  const detail = buildActivityDetail(streams, { source: 'garmin' })!;
  const copy = () => JSON.parse(JSON.stringify(detail)) as ActivityDetail & Record<string, unknown>;

  it('keeps a whole profile exactly and forgets what it does not know', () => {
    expect(migrateActivityDetail(copy())).toEqual(detail);
    const extra = { ...copy(), track: [[1, 2]] };
    expect(migrateActivityDetail(extra)).toEqual(detail);
  });

  it('drops a profile that is not whole', () => {
    expect(migrateActivityDetail(undefined)).toBeUndefined();
    expect(migrateActivityDetail('x')).toBeUndefined();
    expect(migrateActivityDetail({ ...copy(), version: 2 })).toBeUndefined();
    expect(migrateActivityDetail({ ...copy(), sliceCount: 47 })).toBeUndefined();
    const bad = copy();
    (bad.slices[3] as unknown as { sec: unknown }).sec = 'veel';
    expect(migrateActivityDetail(bad)).toBeUndefined();
    const noQuality = copy();
    delete (noQuality as { quality?: unknown }).quality;
    expect(migrateActivityDetail(noQuality)).toBeUndefined();
  });

  it('keeps the profile when only its conditions are damaged', () => {
    const odd = { ...copy(), conditions: { tempC: 'warm', source: 'lookup' } };
    const out = migrateActivityDetail(odd)!;
    expect(out.conditions).toBeUndefined();
    expect(out.slices).toHaveLength(48);
  });

  it('leaves a log without the field alone and strips only the field from a damaged one', () => {
    const plain = logFor(ACTIVITY);
    expect(migrateLogDetail(plain)).toBe(plain);
    const damaged = { ...plain, detail: { version: 1 } } as unknown as SessionLog;
    const out = migrateLogDetail(damaged);
    expect('detail' in out).toBe(false);
    expect(out.externalId).toBe(ACTIVITY.externalId);
  });
});

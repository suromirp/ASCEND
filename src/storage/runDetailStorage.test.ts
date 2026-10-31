import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ActivityStreamsRepo, MetaRepo, SessionLogsRepo, SettingsRepo, wipeAllData } from './database';
import { saveConnection } from './externalActivities';
import { attachActivityDetail, ensureOutcomeText, ensureRunDetail, forgetFailures, needsOf } from './activityDetail';
import { resetAllDataAndAgenda } from './watchWorkouts';
import { applyImportPlan, buildBackupEnvelope, buildImportPreview, createImportPlan, createPreImportSnapshot, defaultActionsForMode, defaultPlanPolicyForMode, listSnapshots, normalizeBackupToCurrentModel, parseBackupText } from './backup';
import { migrateActivityStreams, migrateLogRunDetail } from './migrations';
import { asFullAnswer, fastStartTest } from '../engine/fixtures/testRun';
import { streamsBytes, unpackStreams } from '../engine/streamPack';
import { isUsableRunDetail } from '../engine/runDetail';
import type { ExternalActivity } from '../engine/activityImport';
import type { SessionLog } from '../models/training';
import { addDays, todayISO } from '../utils/dates';

// Made-up data and mocked requests only: no network, no real key, nothing of a real person.
// The full series of a run: fetched with the profile, kept in their own store, worked into
// kilometres on the log, and travelling in a backup unless you turned that off.

const asFetch = (f: unknown) => f as unknown as typeof fetch;
const day = addDays(todayISO(), -2);
const route = fastStartTest({ position: true });

const ACTIVITY: ExternalActivity = {
  externalId: 'intervals.icu:i4711',
  source: 'garmin',
  start: `${day}T08:12:03`,
  kind: 'run',
  durationSec: 2290,
  distanceM: 6600,
  elevationGainM: 0,
  treadmill: false,
  streamsAvailable: ['time', 'distance', 'heartRate', 'speed', 'altitude', 'cadence', 'position', 'power', 'stepLength', 'respiration', 'temperature'],
  otherStreams: ['smo2'],
};

function logFor(extra: Partial<SessionLog> = {}): SessionLog {
  return {
    id: 'log_1',
    templateId: 'tpl_test_run',
    type: 'cardio',
    sport: 'running',
    completedDate: day,
    completedAt: `${day}T08:52:03.000Z`,
    variant: 'custom',
    durationMinutes: 38,
    cardioData: { durationMinutes: 38, distanceKm: 6.6, source: 'garmin' },
    externalId: ACTIVITY.externalId,
    source: 'garmin',
    ...extra,
  };
}

const WEATHER = {
  hourly: {
    time: [`${day}T07:00`, `${day}T08:00`, `${day}T09:00`, `${day}T10:00`],
    temperature_2m: [9, 10, 12, 13],
    apparent_temperature: [7, 8, 11, 12],
    relative_humidity_2m: [85, 85, 80, 78],
    precipitation: [0, 0, 0, 0],
    wind_speed_10m: [30, 30, 30, 30],
    wind_gusts_10m: [40, 40, 44, 44],
    wind_direction_10m: [270, 270, 270, 270],
  },
};

const INTERVALS = {
  id: 'i4711',
  icu_intervals: [
    { id: 1, type: 'RECOVERY', label: 'Warming-up', start_time: 0, end_time: 395, distance: 1000, average_heartrate: 128 },
    { id: 2, type: 'WORK', label: 'Test', group_id: 'g1', start_time: 395, end_time: 2120, distance: 5000, average_speed: 2.9, headwind_percent: 40 },
  ],
  icu_groups: [],
};

function requests(over: { streams?: Response; intervals?: Response; weather?: Response } = {}) {
  return vi.fn(async (url: string) => {
    const u = String(url);
    if (u.includes('open-meteo')) return over.weather ?? new Response(JSON.stringify(WEATHER), { status: 200 });
    if (u.includes('/streams.json')) return over.streams ?? new Response(JSON.stringify(asFullAnswer(route)), { status: 200 });
    if (u.endsWith('/intervals')) return over.intervals ?? new Response(JSON.stringify(INTERVALS), { status: 200 });
    return new Response('{}', { status: 404 });
  });
}
// The host is left out: "intervals.icu" is in every address.
const count = (f: ReturnType<typeof requests>, part: string) => f.mock.calls.filter((c) => String(c[0]).replace('https://intervals.icu', '').includes(part)).length;

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
  forgetFailures();
  await wipeAllData();
  await saveConnection({ athleteId: 'i12345', apiKey: 'geheime-sleutel-0123' });
  await SessionLogsRepo.put(logFor());
});

describe('fetching the series with the profile', () => {
  it('asks once for the series, once for the laps and once for the weather, and keeps them', async () => {
    const f = requests();
    expect(await attachActivityDetail(ACTIVITY, { fetchImpl: asFetch(f) })).toBe('attached');
    expect(count(f, '/streams.json')).toBe(1);
    expect(count(f, '/intervals')).toBe(1);
    expect(count(f, 'open-meteo')).toBe(1);
    // The request for the series names the new kinds, only because the activity lists them.
    const streamsUrl = String(f.mock.calls.find((c) => String(c[0]).includes('/streams.json'))![0]);
    expect(streamsUrl).toContain('watts');
    expect(streamsUrl).toContain('respiration');
    expect(streamsUrl).toContain('temp');
    expect(streamsUrl).not.toContain('stance_time');
    // The weather lookup asks for the direction of the wind too.
    expect(String(f.mock.calls.find((c) => String(c[0]).includes('open-meteo'))![0])).toContain('wind_direction_10m');

    const stored = await ActivityStreamsRepo.get('log_1');
    expect(stored).toBeDefined();
    expect(stored!.sampleCount).toBe(route.timeSec.length);
    expect(stored!.wholeKm).toBe(6.6);
    expect(stored!.wholeMinutes).toBe(38);
    expect(Object.keys(stored!.series)).toContain('power');
    expect(stored!.unknownKinds).toEqual(['smo2']);
    expect(stored!.laps).toHaveLength(2);
    expect(stored!.laps![1]).toMatchObject({ label: 'Test', kind: 'work', groupId: 'g1', source: { distanceM: 5000, headwindPct: 40 } });
    // The track is not in the store, nor the coordinates anywhere.
    const text = JSON.stringify(Array.from(Object.keys(stored!.series)));
    expect(text).not.toContain('latlng');
    expect(Object.keys(stored!.series)).not.toContain('position');
    // The wind per kilometre was worked out from the track before it was let go.
    expect(stored!.headwindKmh).toHaveLength(7);
    expect(stored!.headwindKmh![4]).toBeCloseTo(19.5, 0);
  });

  it('puts the kilometres, the laps, the best 5 km and the wind on the log, and nothing else', async () => {
    await attachActivityDetail(ACTIVITY, { fetchImpl: asFetch(requests()) });
    const log = (await SessionLogsRepo.getAll())[0];
    expect(isUsableRunDetail(log.runDetail)).toBe(true);
    const rd = log.runDetail!;
    expect(rd.kms).toHaveLength(7);
    expect(rd.wholeKm).toBe(6.6);
    expect(rd.laps).toHaveLength(2);
    expect(rd.laps![1].label).toBe('Test');
    expect(rd.bestFive!.startM).toBeCloseTo(1000, -1);
    expect(rd.windKnown).toBe(true);
    expect(rd.bestFive!.kms[2].headwindKmh).toBeCloseTo(19.5, 0);
    // No coordinates and no key anywhere in what is kept on the log.
    const text = JSON.stringify(log);
    expect(text).not.toContain('52.0');
    expect(text).not.toContain('geheime');
    // The measured numbers of the log are as they were.
    expect({ ...log, detail: undefined, runDetail: undefined, bestEffort: undefined }).toEqual({ ...logFor(), detail: undefined, runDetail: undefined, bestEffort: undefined });
    expect(log.detail).toBeDefined();
  });

  it('a second time asks for nothing', async () => {
    await attachActivityDetail(ACTIVITY, { fetchImpl: asFetch(requests()) });
    const g = requests();
    expect(await attachActivityDetail(ACTIVITY, { fetchImpl: asFetch(g) })).toBe('skipped');
    expect(g).not.toHaveBeenCalled();
  });

  it('with "Volledige reeks bewaren" off the kilometres still come, the series do not', async () => {
    await SettingsRepo.set({ keepStreams: false });
    expect(await attachActivityDetail(ACTIVITY, { fetchImpl: asFetch(requests()) })).toBe('attached');
    expect(await ActivityStreamsRepo.get('log_1')).toBeUndefined();
    expect(isUsableRunDetail((await SessionLogsRepo.getAll())[0].runDetail)).toBe(true);
  });

  it('works the kilometres out again from the kept series without asking the source', async () => {
    await attachActivityDetail(ACTIVITY, { fetchImpl: asFetch(requests()) });
    const before = (await SessionLogsRepo.getAll())[0];
    const { runDetail: _dropped, ...rest } = before;
    void _dropped;
    await SessionLogsRepo.put(rest);
    const g = requests();
    expect(await attachActivityDetail(ACTIVITY, { fetchImpl: asFetch(g) })).toBe('attached');
    expect(g).not.toHaveBeenCalled();
    const after = (await SessionLogsRepo.getAll())[0];
    expect(after.runDetail!.kms).toHaveLength(7);
    // The wind per kilometre came from what was kept beside the series.
    expect(after.runDetail!.kms[4].headwindKmh).toBeCloseTo(19.5, 0);
    expect(after.runDetail!.laps).toHaveLength(2);
  });

  it('a correction at the source makes both stale, and they are read again', async () => {
    await attachActivityDetail(ACTIVITY, { fetchImpl: asFetch(requests()) });
    const log = (await SessionLogsRepo.getAll())[0];
    expect(needsOf(log, { keepStreams: true, streamsFresh: true, retry: true })).toEqual({ detail: false, effort: false, runDetail: false, streams: false });
    await SessionLogsRepo.put({ ...log, cardioData: { durationMinutes: 38, distanceKm: 6.7, source: 'garmin' } });
    const g = requests();
    expect(await attachActivityDetail(ACTIVITY, { fetchImpl: asFetch(g) })).toBe('attached');
    expect(count(g, '/streams.json')).toBe(1);
    const stored = await ActivityStreamsRepo.get('log_1');
    expect(stored!.wholeKm).toBe(6.7);
    expect((await SessionLogsRepo.getAll())[0].runDetail!.wholeKm).toBe(6.7);
  });

  it('a failed laps request does not cost the kilometres', async () => {
    const f = requests({ intervals: new Response('{}', { status: 500 }) });
    expect(await attachActivityDetail(ACTIVITY, { fetchImpl: asFetch(f) })).toBe('attached');
    const log = (await SessionLogsRepo.getAll())[0];
    expect(log.runDetail!.kms).toHaveLength(7);
    expect(log.runDetail!.laps).toBeUndefined();
  });

  it('without weather there is no wind and nothing is made up', async () => {
    await SettingsRepo.set({ runInsight: { weather: false } });
    await attachActivityDetail(ACTIVITY, { fetchImpl: asFetch(requests()) });
    const log = (await SessionLogsRepo.getAll())[0];
    expect(log.runDetail!.windKnown).toBeUndefined();
    expect(log.runDetail!.kms.every((k) => k.headwindKmh === undefined)).toBe(true);
    expect((await ActivityStreamsRepo.get('log_1'))!.headwindKmh).toBeUndefined();
  });

  it('a run too short for kilometres is tried once and not asked for again', async () => {
    const short = (await import('../engine/fixtures/testRun')).segmentRun([{ m: 600, pace: 360 }], { position: true });
    const f = requests({ streams: new Response(JSON.stringify(asFullAnswer(short)), { status: 200 }) });
    await attachActivityDetail(ACTIVITY, { fetchImpl: asFetch(f) });
    const log = (await SessionLogsRepo.getAll())[0];
    expect(log.runDetail).toBeUndefined();
    expect(log.runDetailTried).toBe('6.60|38.00');
    // The kilometres are not asked for again for the same totals.
    expect(needsOf(log, { keepStreams: true, streamsFresh: true, retry: true }).runDetail).toBe(false);
  });

  it('a log that was cut gets no kilometres, and its series are not fetched', async () => {
    const log = (await SessionLogsRepo.getAll())[0];
    await SessionLogsRepo.put({ ...log, trim: { at: '2026-10-27T10:00:00.000Z', startSec: 0, endSec: 100, original: {} } as never });
    const f = requests();
    expect(await attachActivityDetail(ACTIVITY, { fetchImpl: asFetch(f) })).toBe('skipped');
    expect(f).not.toHaveBeenCalled();
  });
});

describe('an older run: filling in when its sheet opens', () => {
  const state = async (activities: ExternalActivity[] = [ACTIVITY]) => MetaRepo.set('watchActivities', { activities });

  it('fills in once, with a visible outcome, and then says ready', async () => {
    await state();
    const f = requests();
    expect(await ensureRunDetail('log_1', { fetchImpl: asFetch(f) })).toBe('added');
    const again = requests();
    expect(await ensureRunDetail('log_1', { fetchImpl: asFetch(again) })).toBe('ready');
    expect(again).not.toHaveBeenCalled();
  });

  it('says why when it cannot: switch off, no link, not a watch run, no series', async () => {
    await state();
    const { setWatchUse } = await import('./externalActivities');
    await setWatchUse({ details: false });
    expect(await ensureRunDetail('log_1', { fetchImpl: asFetch(requests()) })).toBe('off');
    expect(ensureOutcomeText('off')).toContain('staan uit');
    await setWatchUse({ details: true });
    await SessionLogsRepo.put(logFor({ id: 'log_2', externalId: undefined }));
    expect(await ensureRunDetail('log_2')).toBe('no-link');
    expect(await ensureRunDetail('log_bestaat_niet')).toBe('no-link');
    const short = (await import('../engine/fixtures/testRun')).segmentRun([{ m: 400, pace: 360 }]);
    expect(await ensureRunDetail('log_1', { fetchImpl: asFetch(requests({ streams: new Response(JSON.stringify(asFullAnswer(short)), { status: 200 }) })) })).toBe('no-series');
    expect(ensureOutcomeText('no-series')).toContain('geen reeks per moment');
  });

  it('a request that fails says so and changes nothing; a request that hangs ends in a timeout', async () => {
    await state();
    expect(await ensureRunDetail('log_1', { fetchImpl: asFetch(vi.fn(async () => new Response('{}', { status: 500 }))) })).toBe('failed');
    expect((await SessionLogsRepo.getAll())[0].runDetail).toBeUndefined();
    expect(ensureOutcomeText('failed')).toContain('Er is niets veranderd');
    // New session semantics: a hanging request is cut off by the limit with a visible outcome.
    await SessionLogsRepo.put(logFor({ id: 'log_3', externalId: 'intervals.icu:i99' }));
    await state([{ ...ACTIVITY, externalId: 'intervals.icu:i99' }]);
    const slow = vi.fn(() => new Promise<Response>((resolve) => setTimeout(() => resolve(new Response('{}', { status: 500 })), 300)));
    expect(await ensureRunDetail('log_3', { fetchImpl: asFetch(slow), timeoutMs: 50 })).toBe('timeout');
    // Let the slow request finish, so it does not hold up the next test.
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(ensureOutcomeText('timeout')).toContain('te lang');
    expect(ensureOutcomeText('ready')).toBeUndefined();
  });

  it('rebuilds the activity from the log when the watch list no longer has it, without a weather lookup', async () => {
    await state([]);
    const f = requests();
    expect(await ensureRunDetail('log_1', { fetchImpl: asFetch(f) })).toBe('added');
    expect(count(f, 'open-meteo')).toBe(0);
    expect((await SessionLogsRepo.getAll())[0].runDetail!.kms).toHaveLength(7);
  });
});

describe('the series in the backup', () => {
  beforeEach(async () => {
    await attachActivityDetail(ACTIVITY, { fetchImpl: asFetch(requests()) });
  });

  it('go along by default as base64, and come back after "Alles verwijderen"', async () => {
    const before = (await ActivityStreamsRepo.get('log_1'))!;
    const envelope = await buildBackupEnvelope();
    expect(envelope.backupSchemaVersion).toBe(5);
    const payload = envelope.payload as { activityStreams?: { logId: string; series: Record<string, { data: string }> }[] };
    expect(payload.activityStreams).toHaveLength(1);
    expect(typeof payload.activityStreams![0].series.heartRate.data).toBe('string');
    const file = parseBackupText(JSON.stringify(envelope));
    await wipeAllData();
    expect(await ActivityStreamsRepo.getAll()).toEqual([]);
    await importEnvelope(file);
    const after = (await ActivityStreamsRepo.get('log_1'))!;
    expect(streamsBytes(after)).toBe(streamsBytes(before));
    expect(unpackStreams(after)).toEqual(unpackStreams(before));
    expect(after.headwindKmh).toEqual(before.headwindKmh);
    expect(after.laps).toEqual(before.laps);
    // The log came back with its kilometres.
    expect(isUsableRunDetail((await SessionLogsRepo.getAll())[0].runDetail)).toBe(true);
  });

  it('with "Reeksen in back-up" off the file is small and the restore keeps the kilometres', async () => {
    const full = JSON.stringify(await buildBackupEnvelope()).length;
    await SettingsRepo.set({ streamsInBackup: false });
    const envelope = await buildBackupEnvelope();
    expect((envelope.payload as { activityStreams?: unknown }).activityStreams).toBeUndefined();
    expect(full - JSON.stringify(envelope).length).toBeGreaterThan(50_000);
    await wipeAllData();
    await importEnvelope(parseBackupText(JSON.stringify(envelope)));
    expect(await ActivityStreamsRepo.getAll()).toEqual([]);
    const log = (await SessionLogsRepo.getAll())[0];
    expect(isUsableRunDetail(log.runDetail)).toBe(true);
    // The series are fetched again when the run is opened (the switch is back on).
    await SettingsRepo.set({ streamsInBackup: undefined });
    // The key never travels in a backup: link again, as after any restore.
    await saveConnection({ athleteId: 'i12345', apiKey: 'geheime-sleutel-0123' });
    const again = requests();
    expect(await attachActivityDetail(ACTIVITY, { fetchImpl: asFetch(again) })).toBe('attached');
    expect(count(again, '/streams.json')).toBe(1);
    expect(await ActivityStreamsRepo.get('log_1')).toBeDefined();
  });

  it('the copy taken before an import never holds the series', async () => {
    const snapshot = await createPreImportSnapshot();
    expect((snapshot.envelope.payload as { activityStreams?: unknown }).activityStreams).toBeUndefined();
    expect((await listSnapshots()).some((x) => x.id === snapshot.id)).toBe(true);
    expect(JSON.stringify(snapshot.envelope).length).toBeLessThan(60_000);
  });

  it('a backup from before the series imports as it was', async () => {
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    delete envelope.payload.activityStreams;
    for (const l of envelope.payload.sessionLogs) delete l.runDetail;
    await wipeAllData();
    await importEnvelope(envelope);
    expect(await ActivityStreamsRepo.getAll()).toEqual([]);
    const log = (await SessionLogsRepo.getAll())[0];
    expect(log.runDetail).toBeUndefined();
    expect(log.externalId).toBe(ACTIVITY.externalId);
  });

  it('what the device already has for a log is not written over by the file', async () => {
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    const own = (await ActivityStreamsRepo.get('log_1'))!;
    await ActivityStreamsRepo.put({ ...own, fetchedAt: '2030-01-01T00:00:00.000Z' });
    await importEnvelope(envelope);
    expect((await ActivityStreamsRepo.get('log_1'))!.fetchedAt).toBe('2030-01-01T00:00:00.000Z');
  });

  it('series of a log the file does not have are not restored', async () => {
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    envelope.payload.activityStreams[0].logId = 'log_zonder_log';
    await wipeAllData();
    await importEnvelope(envelope);
    expect(await ActivityStreamsRepo.getAll()).toEqual([]);
  });

  it('a damaged set is dropped and counted, the rest of the file is restored', async () => {
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    envelope.payload.activityStreams.push({ logId: 'x', version: 1 }, 'rommel');
    const backup = normalizeBackupToCurrentModel(envelope);
    expect(backup.activityStreams).toHaveLength(1);
    expect(backup.skippedInvalid).toBe(2);
    expect(backup.sessionLogs).toHaveLength(1);
  });

  it('the choice "Reeksen in back-up": the last 2 years, all or none; the kilometres always go along', async () => {
    const streamsOf = (e: Awaited<ReturnType<typeof buildBackupEnvelope>>) => (e.payload as { activityStreams?: unknown[] }).activityStreams;
    const longAfter = addDays(day, 2 * 366);
    // The advice: the run is older than 2 years seen from longAfter, so its series stays out.
    expect(streamsOf(await buildBackupEnvelope())).toHaveLength(1);
    const old = await buildBackupEnvelope({ today: longAfter });
    expect(streamsOf(old)).toBeUndefined();
    expect(isUsableRunDetail(old.payload.sessionLogs[0].runDetail)).toBe(true);
    await SettingsRepo.set({ streamsBackup: 'all' });
    expect(streamsOf(await buildBackupEnvelope({ today: longAfter }))).toHaveLength(1);
    await SettingsRepo.set({ streamsBackup: 'none' });
    const none = await buildBackupEnvelope();
    expect(streamsOf(none)).toBeUndefined();
    expect(isUsableRunDetail(none.payload.sessionLogs[0].runDetail)).toBe(true);
  });

  it('an older file with the switch off reads as "Geen reeksen", an unknown choice is dropped', async () => {
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    delete envelope.payload.settings.streamsBackup;
    envelope.payload.settings.streamsInBackup = false;
    expect(normalizeBackupToCurrentModel(envelope).settings.streamsBackup).toBe('none');
    envelope.payload.settings.streamsInBackup = true;
    expect(normalizeBackupToCurrentModel(envelope).settings.streamsBackup).toBeUndefined();
    envelope.payload.settings.streamsBackup = 'soms';
    envelope.payload.settings.proposalTidyMonths = 5;
    const backup = normalizeBackupToCurrentModel(envelope);
    expect(backup.settings.streamsBackup).toBeUndefined();
    expect(backup.settings.proposalTidyMonths).toBeUndefined();
    expect(backup.skippedInvalid).toBe(2);
  });

  it('the two switches are yes or no in a file, nothing else', async () => {
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    envelope.payload.settings.keepStreams = 'ja';
    envelope.payload.settings.streamsInBackup = false;
    const backup = normalizeBackupToCurrentModel(envelope);
    expect(backup.settings.keepStreams).toBeUndefined();
    expect(backup.settings.streamsInBackup).toBe(false);
  });
});

describe('reading kilometres from a file', () => {
  it('leaves a log without the field alone, and strips only the field from a damaged one', async () => {
    await attachActivityDetail(ACTIVITY, { fetchImpl: asFetch(requests()) });
    const whole = (await SessionLogsRepo.getAll())[0];
    expect(migrateLogRunDetail(whole)).toBe(whole);
    const plain = logFor();
    expect(migrateLogRunDetail(plain)).toBe(plain);
    const damaged = { ...whole, runDetail: { ...whole.runDetail!, kms: [{ index: 1 }] }, runDetailTried: 'x'.repeat(50) } as unknown as SessionLog;
    const out = migrateLogRunDetail(damaged);
    expect('runDetail' in out).toBe(false);
    expect('runDetailTried' in out).toBe(false);
    expect(out.externalId).toBe(ACTIVITY.externalId);
    expect(out.durationMinutes).toBe(38);
    expect(out.detail).toBeDefined();
  });

  it('reads the series of a file set by set', () => {
    expect(migrateActivityStreams(undefined)).toEqual({ list: undefined, skipped: 0 });
    expect(migrateActivityStreams('nee')).toEqual({ list: undefined, skipped: 1 });
    expect(migrateActivityStreams([null, 5])).toEqual({ list: [], skipped: 2 });
  });
});

describe('what is not a run is not asked for', () => {
  it('a strength log with an external id gets no-link and no request', async () => {
    await SessionLogsRepo.put(logFor({ id: 'log_kracht', templateId: 'tpl_upper_a', type: 'strength', sport: undefined, cardioData: undefined, externalId: 'intervals.icu:i55' }));
    const f = requests();
    expect(await ensureRunDetail('log_kracht', { fetchImpl: asFetch(f) })).toBe('no-link');
    expect(f).not.toHaveBeenCalled();
  });

  it('a ride is no run either, a walk is read as a tocht', async () => {
    await SessionLogsRepo.put(logFor({ id: 'log_fiets', sport: 'cycling', externalId: 'intervals.icu:i56' }));
    const f = requests();
    expect(await ensureRunDetail('log_fiets', { fetchImpl: asFetch(f) })).toBe('no-link');
    expect(f).not.toHaveBeenCalled();
    await SessionLogsRepo.put(logFor({ id: 'log_wandel', templateId: 'tpl_mountain_hike', type: 'adventure', sport: 'hiking', externalId: 'intervals.icu:i57' }));
    const g = requests();
    expect(await ensureRunDetail('log_wandel', { fetchImpl: asFetch(g) })).not.toBe('no-link');
    expect(g).toHaveBeenCalled();
  });
});

describe('a source without a usable series is asked once', () => {
  beforeEach(async () => {
    await MetaRepo.set('watchActivities', { activities: [ACTIVITY] });
  });

  it('an empty answer is written on the log and not fetched again in a new session', async () => {
    const f = requests({ streams: new Response('[]', { status: 200 }) });
    expect(await ensureRunDetail('log_1', { fetchImpl: asFetch(f) })).toBe('no-series');
    expect(count(f, '/streams.json')).toBe(1);
    const log = (await SessionLogsRepo.getAll())[0];
    expect(log.runDetailTried).toBe('6.60|38.00');
    forgetFailures();
    const g = requests();
    expect(await ensureRunDetail('log_1', { fetchImpl: asFetch(g) })).toBe('no-series');
    expect(await attachActivityDetail(ACTIVITY, { fetchImpl: asFetch(g) })).toBe('skipped');
    expect(count(g, '/streams.json')).toBe(0);
  });

  it('a second opening in the same session still says no-series, not failed', async () => {
    const f = requests({ streams: new Response('[]', { status: 200 }) });
    expect(await ensureRunDetail('log_1', { fetchImpl: asFetch(f) })).toBe('no-series');
    const g = requests();
    expect(await ensureRunDetail('log_1', { fetchImpl: asFetch(g) })).toBe('no-series');
    expect(count(g, '/streams.json')).toBe(0);
  });

  it('a series that cannot be packed is remembered too', async () => {
    const onlyTime = new Response(JSON.stringify([{ type: 'time', data: route.timeSec }]), { status: 200 });
    const f = requests({ streams: onlyTime });
    await attachActivityDetail(ACTIVITY, { fetchImpl: asFetch(f) });
    expect(await ActivityStreamsRepo.get('log_1')).toBeUndefined();
    forgetFailures();
    const log = (await SessionLogsRepo.getAll())[0];
    expect(log.runDetailTried).toBe('6.60|38.00');
    expect(needsOf(log, { keepStreams: true, streamsFresh: false, retry: true }).streams).toBe(false);
    const g = requests();
    expect(await attachActivityDetail(ACTIVITY, { fetchImpl: asFetch(g) })).toBe('skipped');
    expect(count(g, '/streams.json')).toBe(0);
  });

  it('a correction at the source (other totals) is tried again', async () => {
    await attachActivityDetail(ACTIVITY, { fetchImpl: asFetch(requests({ streams: new Response('[]', { status: 200 }) })) });
    forgetFailures();
    const log = (await SessionLogsRepo.getAll())[0];
    await SessionLogsRepo.put({ ...log, cardioData: { durationMinutes: 38, distanceKm: 6.7, source: 'garmin' } });
    const g = requests();
    expect(await attachActivityDetail(ACTIVITY, { fetchImpl: asFetch(g) })).toBe('attached');
    expect(count(g, '/streams.json')).toBe(1);
  });
});

describe('"Alles verwijderen" and the series', () => {
  beforeEach(async () => {
    await attachActivityDetail(ACTIVITY, { fetchImpl: asFetch(requests()) });
  });

  it('the function behind the button empties the store', async () => {
    expect(await ActivityStreamsRepo.getAll()).toHaveLength(1);
    await resetAllDataAndAgenda({ fetchImpl: asFetch(requests()) });
    expect(await ActivityStreamsRepo.getAll()).toEqual([]);
  });

  it('the backup holds only series of logs that still exist', async () => {
    const own = (await ActivityStreamsRepo.get('log_1'))!;
    await ActivityStreamsRepo.put({ ...own, logId: 'log_weg' });
    const payload = (await buildBackupEnvelope()).payload as { activityStreams?: { logId: string }[] };
    expect(payload.activityStreams!.map((x) => x.logId)).toEqual(['log_1']);
  });

  it('with "Volledige reeks bewaren" off an import writes no series', async () => {
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    await wipeAllData();
    await SettingsRepo.set({ keepStreams: false });
    await importEnvelope({ ...envelope, payload: { ...envelope.payload, settings: { ...envelope.payload.settings, keepStreams: false } } });
    expect(await ActivityStreamsRepo.getAll()).toEqual([]);
    expect((await SessionLogsRepo.getAll())).toHaveLength(1);
  });
});

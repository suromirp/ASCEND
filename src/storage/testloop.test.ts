import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SessionLogsRepo, SettingsRepo, wipeAllData } from './database';
import { saveConnection } from './externalActivities';
import { acceptBestEffort, attachActivityDetail } from './activityDetail';
import { buildBackupEnvelope, normalizeBackupToCurrentModel, buildImportPreview, createImportPlan, createPreImportSnapshot, applyImportPlan, defaultActionsForMode, defaultPlanPolicyForMode } from './backup';
import { migrateLogBestEffort, migrateTestJudgments } from './migrations';
import { asProviderAnswer, makeStreams } from '../engine/fixtures/runStreams';
import type { ExternalActivity } from '../engine/activityImport';
import type { SessionLog } from '../models/training';
import { addDays, todayISO } from '../utils/dates';

// Made-up data and mocked requests only. The best 5 km of a test run and the verdicts on
// test runs: additive, so an older backup imports as before and a newer one round-trips.

const asFetch = (f: unknown) => f as unknown as typeof fetch;
const day = addDays(todayISO(), -2);

const ACTIVITY: ExternalActivity = {
  externalId: 'intervals.icu:i9001',
  source: 'garmin',
  start: `${day}T08:12:03`,
  kind: 'run',
  durationSec: 2400,
  distanceM: 6667,
  elevationGainM: 5,
  treadmill: false,
  streamsAvailable: ['time', 'distance', 'heartRate', 'speed'],
};

function testLog(extra: Partial<SessionLog> = {}): SessionLog {
  return {
    id: 'log_test',
    templateId: 'tpl_test_run',
    type: 'cardio',
    sport: 'running',
    completedDate: day,
    completedAt: `${day}T08:52:03.000Z`,
    variant: 'custom',
    durationMinutes: 40,
    cardioData: { distanceKm: 6.67, durationMinutes: 40 },
    externalId: ACTIVITY.externalId,
    source: 'garmin',
    ...extra,
  } as SessionLog;
}

const streams = makeStreams({ minutes: 40, pace: 360, hr: 170 });
const answer = () => vi.fn(async () => new Response(JSON.stringify(asProviderAnswer(streams)), { status: 200 }));

async function importEnvelope(payload: unknown) {
  const backup = normalizeBackupToCurrentModel(payload);
  const selections = defaultActionsForMode('full_restore');
  const policy = defaultPlanPolicyForMode('full_restore');
  const preview = await buildImportPreview(backup, selections, policy);
  const snapshot = await createPreImportSnapshot();
  const plan = createImportPlan(backup, 'full_restore', selections, policy, preview.diffByCategory.flatMap((d) => d.conflicts), snapshot.id);
  await applyImportPlan(backup, plan);
}

describe('the best 5 km on a test log', () => {
  beforeEach(async () => {
    await wipeAllData();
    await saveConnection({ athleteId: 'i12345', apiKey: 'geheime-sleutel-0123' });
  });

  it('is added once from the series, and the measured numbers stay as they were', async () => {
    await SessionLogsRepo.put(testLog());
    const f = answer();
    await attachActivityDetail(ACTIVITY, { fetchImpl: asFetch(f), fresh: true, weatherFetchImpl: asFetch(vi.fn(async () => new Response('{}', { status: 500 }))) });
    const log = (await SessionLogsRepo.getAll())[0];
    expect(log.bestEffort?.km).toBe(5);
    // A test that has just come in counts with it at once, tied to the totals it was read for.
    expect(log.bestEffort?.accepted).toBe(true);
    expect(log.bestEffort?.wholeKm).toBe(6.67);
    expect(log.bestEffort?.wholeMinutes).toBe(40);
    // 6 min per km all the way: the best 5 km takes about 30 minutes.
    expect(log.bestEffort?.minutes).toBeGreaterThan(29.5);
    expect(log.bestEffort?.minutes).toBeLessThan(30.5);
    expect(log.cardioData).toEqual({ distanceKm: 6.67, durationMinutes: 40 });
    expect(log.durationMinutes).toBe(40);
  });

  it('is not added to a log that is not a test', async () => {
    await SessionLogsRepo.put(testLog({ templateId: 'tpl_easy_run' }));
    await attachActivityDetail(ACTIVITY, { fetchImpl: asFetch(answer()), weatherFetchImpl: asFetch(vi.fn(async () => new Response('{}', { status: 500 }))) });
    expect((await SessionLogsRepo.getAll())[0].bestEffort).toBeUndefined();
  });

  it('is not added to a log that was cut', async () => {
    await SessionLogsRepo.put(testLog({ trim: { at: day, block: 'cardioData', startSec: 60, endSec: 2300, totalSec: 2400, original: { durationMinutes: 40 } } } as Partial<SessionLog>));
    expect(await attachActivityDetail(ACTIVITY, { fetchImpl: asFetch(answer()) })).toBe('skipped');
  });

  it('is left out when the series does not match the distance of the log', async () => {
    await SessionLogsRepo.put(testLog({ cardioData: { distanceKm: 12, durationMinutes: 40 } } as Partial<SessionLog>));
    await attachActivityDetail(ACTIVITY, { fetchImpl: asFetch(answer()), weatherFetchImpl: asFetch(vi.fn(async () => new Response('{}', { status: 500 }))) });
    expect((await SessionLogsRepo.getAll())[0].bestEffort).toBeUndefined();
  });

  it('is added to a test log that already had its profile, without asking for the weather again', async () => {
    await SessionLogsRepo.put(testLog());
    const weather = vi.fn(async () => new Response('{}', { status: 500 }));
    await attachActivityDetail(ACTIVITY, { fetchImpl: asFetch(answer()), weatherFetchImpl: asFetch(weather) });
    const stored = (await SessionLogsRepo.getAll())[0];
    const { bestEffort: _drop, ...without } = stored;
    void _drop;
    await SessionLogsRepo.put(without as SessionLog);
    weather.mockClear();
    expect(await attachActivityDetail(ACTIVITY, { fetchImpl: asFetch(answer()), weatherFetchImpl: asFetch(weather) })).toBe('attached');
    expect(weather).not.toHaveBeenCalled();
    const after = (await SessionLogsRepo.getAll())[0];
    expect(after.bestEffort).toBeDefined();
    expect(after.detail).toEqual(stored.detail);
  });
});

describe('the best 5 km never changes your paces by itself', () => {
  // The series come in one request; the laps in another that this answer also gives something for.
  const streamCalls = (f: ReturnType<typeof answer>) => f.mock.calls.filter((c) => String((c as unknown[])[0]).includes('/streams.json')).length;
  const quiet = { weatherFetchImpl: asFetch(vi.fn(async () => new Response('{}', { status: 500 }))) };
  beforeEach(async () => {
    await wipeAllData();
    await saveConnection({ athleteId: 'i12345', apiKey: 'geheime-sleutel-0123' });
  });

  it('waits for Akkoord when an older test already sets the paces and counting it would move them', async () => {
    await SessionLogsRepo.put(testLog());
    await attachActivityDetail(ACTIVITY, { fetchImpl: asFetch(answer()), ...quiet });
    const log = (await SessionLogsRepo.getAll())[0];
    expect(log.bestEffort).toBeDefined();
    expect(log.bestEffort?.accepted).toBeUndefined();
    expect(await acceptBestEffort(log.id)).toBe(true);
    expect((await SessionLogsRepo.getAll())[0].bestEffort?.accepted).toBe(true);
    // Twice does nothing.
    expect(await acceptBestEffort(log.id)).toBe(false);
  });

  it('reads the series again after a correction at the source, and not before', async () => {
    await SessionLogsRepo.put(testLog());
    const f = answer();
    await attachActivityDetail(ACTIVITY, { fetchImpl: asFetch(f), fresh: true, ...quiet });
    expect(streamCalls(f)).toBe(1);
    // Nothing changed: no new request.
    await attachActivityDetail(ACTIVITY, { fetchImpl: asFetch(f), ...quiet });
    expect(streamCalls(f)).toBe(1);
    // The source corrected the distance: the old best effort no longer fits and is read again.
    const stored = (await SessionLogsRepo.getAll())[0];
    await SessionLogsRepo.put({ ...stored, cardioData: { distanceKm: 6.6, durationMinutes: 39.5 } } as SessionLog);
    await attachActivityDetail(ACTIVITY, { fetchImpl: asFetch(f), fresh: true, ...quiet });
    expect(streamCalls(f)).toBe(2);
    expect((await SessionLogsRepo.getAll())[0].bestEffort?.wholeKm).toBe(6.6);
  });

  it('remembers that a series gave no best 5 km and does not fetch it again for the same totals', async () => {
    await SessionLogsRepo.put(testLog({ cardioData: { distanceKm: 12, durationMinutes: 40 } } as Partial<SessionLog>));
    const f = answer();
    await attachActivityDetail(ACTIVITY, { fetchImpl: asFetch(f), ...quiet });
    expect((await SessionLogsRepo.getAll())[0].bestEffortTried).toBe('12.00|40.00');
    await attachActivityDetail(ACTIVITY, { fetchImpl: asFetch(f), ...quiet });
    expect(streamCalls(f)).toBe(1);
  });
});

describe('migrating the best effort and the verdicts', () => {
  it('keeps the fingerprint and the acceptance, and drops a damaged tried marker', () => {
    const kept = migrateLogBestEffort(testLog({ bestEffort: { km: 5, minutes: 27.5, wholeKm: 6, wholeMinutes: 34, accepted: true }, bestEffortTried: '6.00|34.00' }));
    expect(kept.bestEffort).toEqual({ km: 5, minutes: 27.5, wholeKm: 6, wholeMinutes: 34, accepted: true });
    expect(kept.bestEffortTried).toBe('6.00|34.00');
    const bad = migrateLogBestEffort(testLog({ bestEffortTried: 42 as unknown as string }));
    expect('bestEffortTried' in bad).toBe(false);
  });

  it('keeps a whole best effort and drops a damaged one, the log keeps everything else', () => {
    const ok = migrateLogBestEffort(testLog({ bestEffort: { km: 5, minutes: 27.5 } }));
    expect(ok.bestEffort).toEqual({ km: 5, minutes: 27.5 });
    const bad = migrateLogBestEffort(testLog({ bestEffort: { km: 5, minutes: -3 } }));
    expect('bestEffort' in bad).toBe(false);
    expect(bad.durationMinutes).toBe(40);
    const none = testLog();
    expect(migrateLogBestEffort(none)).toBe(none);
  });

  it('reads verdicts defensively: a damaged one loses only itself, the last one per log wins', () => {
    const out = migrateTestJudgments([
      { logId: 'a', verdict: 'ignore', date: '2027-01-02' },
      { logId: 'a', verdict: 'counts', date: '2027-01-03' },
      { logId: 'b', verdict: 'misschien', date: '2027-01-02' },
      { logId: '', verdict: 'counts', date: '2027-01-02' },
      { logId: 'c', verdict: 'counts', date: 'nooit' },
    ]);
    expect(out.list).toEqual([{ logId: 'a', verdict: 'counts', date: '2027-01-03' }]);
    expect(out.skipped).toBe(3);
    expect(migrateTestJudgments(undefined)).toEqual({ list: undefined, skipped: 0 });
    expect(migrateTestJudgments('oops')).toEqual({ list: undefined, skipped: 1 });
  });
});

describe('backup of the best effort and the verdicts', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  const verdicts = [{ logId: 'log_test', verdict: 'ignore' as const, date: '2027-02-01' }];

  it('round-trips through export and a full restore, with the setting', async () => {
    await SessionLogsRepo.put(testLog({ bestEffort: { km: 5, minutes: 27.67 } }));
    await SettingsRepo.set({ testJudgments: verdicts, askDoubtTest: false });
    const envelope = await buildBackupEnvelope();
    await wipeAllData();
    await importEnvelope(envelope);
    const settings = await SettingsRepo.get();
    expect(settings.testJudgments).toEqual(verdicts);
    expect(settings.askDoubtTest).toBe(false);
    expect((await SessionLogsRepo.getAll())[0].bestEffort).toEqual({ km: 5, minutes: 27.67 });
  });

  it('an old back-up without them imports as before and leaves the verdicts on the device alone', async () => {
    const envelope = await buildBackupEnvelope();
    await SettingsRepo.set({ testJudgments: verdicts });
    const backup = normalizeBackupToCurrentModel(envelope);
    expect(backup.skippedInvalid).toBe(0);
    expect(backup.settings.testJudgments).toBeUndefined();
    await importEnvelope(envelope);
    expect((await SettingsRepo.get()).testJudgments).toEqual(verdicts);
  });

  it('an old log without a best effort comes through unchanged and counts as the whole run', async () => {
    await SessionLogsRepo.put(testLog());
    const envelope = await buildBackupEnvelope();
    const backup = normalizeBackupToCurrentModel(envelope);
    expect('bestEffort' in backup.sessionLogs[0]).toBe(false);
  });

  it('a restore keeps the device verdict and takes the ones it lacks', async () => {
    await SettingsRepo.set({ testJudgments: [{ logId: 'a', verdict: 'ignore', date: '2027-01-01' }] });
    const envelope = await buildBackupEnvelope();
    await SettingsRepo.set({ testJudgments: [{ logId: 'a', verdict: 'counts', date: '2027-01-05' }, { logId: 'b', verdict: 'ignore', date: '2027-01-06' }] });
    await importEnvelope(envelope);
    expect((await SettingsRepo.get()).testJudgments).toEqual([{ logId: 'a', verdict: 'counts', date: '2027-01-05' }, { logId: 'b', verdict: 'ignore', date: '2027-01-06' }]);
  });

  it('drops damaged verdicts and a damaged setting, and counts them', async () => {
    const envelope = await buildBackupEnvelope();
    const settings = { testJudgments: [verdicts[0], { logId: 'x', verdict: 'rommel', date: '2027-01-01' }], askDoubtTest: 'ja' };
    const backup = normalizeBackupToCurrentModel({ ...envelope, payload: { ...envelope.payload, settings } });
    expect(backup.settings.testJudgments).toEqual(verdicts);
    expect(backup.settings.askDoubtTest).toBeUndefined();
    expect(backup.skippedInvalid).toBe(2);
  });
});

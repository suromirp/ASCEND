import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GoalMilestoneProgressRepo, GoalMilestonesRepo, SessionLogsRepo, TrainingGoalsRepo, wipeAllData } from './database';
import {
  clearConnection,
  declineAlignment,
  getWatchState,
  resolveAlignment,
  saveConnection,
  setGarminLeads,
  syncWatchActivities,
  syncWatchHistory,
} from './externalActivities';
import { applyAlignments, restoreAlignments } from './watchAlign';
import { recordClearedMilestones } from './milestoneClearing';
import { buildBackupEnvelope, normalizeBackupToCurrentModel } from './backup';
import { migrateLogManualMeasured, migrateManualMeasured } from './migrations';
import { planAlignment } from '../engine/watchAlign';
import { pendingProposals, type ExternalActivity } from '../engine/activityImport';
import type { SessionLog } from '../models/training';
import { addDays, todayISO } from '../utils/dates';

// Made-up activities and logs only.
const KEY = 'geheime-sleutel-0123';
const ATHLETE = 'i12345';
const today = todayISO();

function activity(extra: Partial<ExternalActivity> = {}): ExternalActivity {
  return {
    externalId: 'intervals.icu:a1', source: 'garmin', start: `${addDays(today, -3)}T07:30:00`, kind: 'run', durationSec: 55 * 60,
    distanceM: 7100, elevationGainM: 40, avgHeartRate: 152, maxHeartRate: 171, treadmill: false, ...extra,
  };
}

function hand(extra: Partial<SessionLog> = {}): SessionLog {
  return {
    id: 'log_1', templateId: 'tpl_easy_run', type: 'cardio', sport: 'running', completedDate: addDays(today, -3), completedAt: `${addDays(today, -3)}T18:00:00.000Z`,
    variant: 'full', durationMinutes: 55, source: 'manual', cardioData: { durationMinutes: 55, distanceKm: 6.9, source: 'manual' }, rpe: 4, notes: 'Rustig',
    ...extra,
  };
}

// What intervals.icu answers: the raw activities whose day lies in the asked range.
function rawActivity(id: string, daysAgo: number, extra: Record<string, unknown> = {}) {
  return { id, start_date_local: `${addDays(today, -daysAgo)}T07:30:00`, type: 'Run', source: 'GARMIN_CONNECT', moving_time: 3300, distance: 7100, total_elevation_gain: 40, average_heartrate: 152, ...extra };
}
function intervalsFetch(all: ReturnType<typeof rawActivity>[]) {
  return vi.fn(async (url: string) => {
    const u = new URL(String(url));
    if (u.pathname.endsWith('/wellness.json')) return new Response('[]', { status: 200 });
    const oldest = u.searchParams.get('oldest') ?? '';
    const newest = u.searchParams.get('newest') ?? '';
    return new Response(JSON.stringify(all.filter((a) => a.start_date_local.slice(0, 10) >= oldest && a.start_date_local.slice(0, 10) <= newest)), { status: 200 });
  });
}
const asFetch = (f: ReturnType<typeof vi.fn>) => f as unknown as typeof fetch;
const activityCalls = (f: ReturnType<typeof vi.fn>) => f.mock.calls.map((c) => new URL(String(c[0]))).filter((u) => u.pathname.endsWith('/activities'));

describe('the one-time fetch of the past', () => {
  beforeEach(async () => {
    await wipeAllData();
    await saveConnection({ athleteId: ATHLETE, apiKey: KEY });
  });

  it('starts at the oldest typed-in training, keeps the result apart and does it once', async () => {
    await SessionLogsRepo.put(hand({ id: 'old', completedDate: addDays(today, -40) }));
    await SessionLogsRepo.put(hand({ id: 'new' }));
    const fetchImpl = intervalsFetch([rawActivity('i1', 40), rawActivity('i2', 20), rawActivity('i3', 3)]);

    const result = await syncWatchHistory({ fetchImpl: asFetch(fetchImpl) });
    expect(result).toMatchObject({ status: 'ok', count: 3, from: addDays(today, -40) });
    expect(activityCalls(fetchImpl)[0].searchParams.get('oldest')).toBe(addDays(today, -40));

    const state = await getWatchState();
    expect(state.history.map((a) => a.externalId).sort()).toEqual(['intervals.icu:i1', 'intervals.icu:i2', 'intervals.icu:i3']);
    // The old activities are never a proposal: the Today card reads the recent list.
    expect(state.activities).toEqual([]);

    expect(await syncWatchHistory({ fetchImpl: asFetch(fetchImpl) })).toEqual({ status: 'done' });
    expect(activityCalls(fetchImpl)).toHaveLength(1);
    expect((await syncWatchHistory({ fetchImpl: asFetch(fetchImpl), force: true })).status).toBe('ok');
    expect(activityCalls(fetchImpl)).toHaveLength(2);
  });

  it('never looks back further than 120 days', async () => {
    await SessionLogsRepo.put(hand({ completedDate: addDays(today, -300) }));
    const fetchImpl = intervalsFetch([]);
    await syncWatchHistory({ fetchImpl: asFetch(fetchImpl) });
    expect(activityCalls(fetchImpl)[0].searchParams.get('oldest')).toBe(addDays(today, -120));
  });

  it('fetches nothing when nothing was typed in by hand', async () => {
    const fetchImpl = intervalsFetch([]);
    expect(await syncWatchHistory({ fetchImpl: asFetch(fetchImpl) })).toEqual({ status: 'nothing' });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect((await getWatchState()).historyFetchedAt).toBeUndefined();
  });

  it('comes along with the ordinary fetch, next to the usual 7 days', async () => {
    await SessionLogsRepo.put(hand({ completedDate: addDays(today, -30) }));
    const fetchImpl = intervalsFetch([rawActivity('i1', 30), rawActivity('i2', 2)]);
    const result = await syncWatchActivities({ fetchImpl: asFetch(fetchImpl), force: true });
    expect(result).toMatchObject({ status: 'ok', count: 1 });
    const calls = activityCalls(fetchImpl);
    expect(calls).toHaveLength(2);
    expect(calls[0].searchParams.get('oldest')).toBe(addDays(today, -7));
    expect(calls[1].searchParams.get('oldest')).toBe(addDays(today, -30));
    const state = await getWatchState();
    expect(state.activities.map((a) => a.externalId)).toEqual(['intervals.icu:i2']);
    expect(state.history).toHaveLength(2);
  });

  it('does not fail the fetch when only the past fails, and tries again next time', async () => {
    await SessionLogsRepo.put(hand({ completedDate: addDays(today, -30) }));
    let n = 0;
    const fetchImpl = vi.fn(async (url: string) => {
      if (String(url).includes('/wellness')) return new Response('[]');
      n++;
      return n === 2 ? new Response('boom', { status: 500 }) : new Response('[]');
    });
    expect((await syncWatchActivities({ fetchImpl: asFetch(fetchImpl), force: true })).status).toBe('ok');
    expect((await getWatchState()).historyFetchedAt).toBeUndefined();
    await syncWatchActivities({ fetchImpl: asFetch(fetchImpl), force: true });
    expect((await getWatchState()).historyFetchedAt).toBeDefined();
  });

  it('is wiped on unlinking, and the first proposal is a proposal again', async () => {
    await SessionLogsRepo.put(hand({ completedDate: addDays(today, -30) }));
    await syncWatchHistory({ fetchImpl: asFetch(intervalsFetch([rawActivity('i1', 30)])) });
    await resolveAlignment();
    await declineAlignment(['intervals.icu:i1']);
    await clearConnection();
    const state = await getWatchState();
    expect(state.history).toEqual([]);
    expect(state.historyFetchedAt).toBeUndefined();
    expect(state.alignResolved).toBe(false);
    // What was refused stays refused.
    expect(state.alignDeclined).toEqual(['intervals.icu:i1']);
  });

  it('has the switch on until it is switched off', async () => {
    expect((await getWatchState()).garminLeads).toBe(true);
    await setGarminLeads(false);
    expect((await getWatchState()).garminLeads).toBe(false);
  });
});

describe('applyAlignments and restoreAlignments', () => {
  const NOW = new Date('2026-10-22T08:00:00.000Z');

  beforeEach(async () => {
    await wipeAllData();
  });

  it('takes over the numbers, and a second run writes nothing', async () => {
    await SessionLogsRepo.put(hand());
    const a = activity();
    const first = await applyAlignments([{ logId: 'log_1', activity: a }], NOW);
    expect(first.logIds).toEqual(['log_1']);
    expect(first.lines[0]).toMatch(/^Training .*: 55 min blijft, 6,9 km wordt 7,1 km, stijging 40 m komt erbij, hartslag 152 komt erbij, hoogste hartslag 171 komt erbij$/);

    const stored = (await SessionLogsRepo.getAll())[0];
    expect(stored).toMatchObject({ source: 'garmin', externalId: a.externalId, rpe: 4, notes: 'Rustig' });
    expect(stored.cardioData).toMatchObject({ distanceKm: 7.1, avgHeartRate: 152, source: 'garmin' });
    expect(stored.manualMeasured?.values.distanceKm).toBe(6.9);

    // The second start: the plan finds nothing, and nothing is written.
    expect(planAlignment([a], await SessionLogsRepo.getAll())).toEqual([]);
    const put = vi.spyOn(SessionLogsRepo, 'put');
    const second = await applyAlignments([{ logId: 'log_1', activity: a }], NOW);
    expect(second.logIds).toEqual([]);
    expect(put).not.toHaveBeenCalled();
    put.mockRestore();
    expect((await SessionLogsRepo.getAll())[0]).toEqual(stored);
  });

  it('never ties an activity to a second log, and ignores a log that is gone', async () => {
    await SessionLogsRepo.put(hand({ id: 'taken', source: 'garmin', externalId: 'intervals.icu:a1' }));
    await SessionLogsRepo.put(hand({ id: 'other' }));
    const outcome = await applyAlignments([{ logId: 'other', activity: activity() }, { logId: 'gone', activity: activity({ externalId: 'x' }) }], NOW);
    expect(outcome.logIds).toEqual([]);
    expect((await SessionLogsRepo.getAll()).find((l) => l.id === 'other')?.source).toBe('manual');
  });

  it('puts the hand-made numbers back, remembers the refusal and keeps what was added since', async () => {
    const original = hand();
    await SessionLogsRepo.put(original);
    await applyAlignments([{ logId: 'log_1', activity: activity() }], NOW);
    const aligned = (await SessionLogsRepo.getAll())[0];
    await SessionLogsRepo.put({ ...aligned, subjectiveFeel: 'better' });

    expect(await restoreAlignments(['log_1', 'not-aligned'])).toBe(1);
    expect((await SessionLogsRepo.getAll())[0]).toEqual({ ...original, subjectiveFeel: 'better' });
    const state = await getWatchState();
    expect(state.alignDeclined).toEqual(['intervals.icu:a1']);
    expect(planAlignment([activity()], await SessionLogsRepo.getAll(), { declined: state.alignDeclined })).toEqual([]);
    // A second Terugzetten changes nothing.
    expect(await restoreAlignments(['log_1'])).toBe(0);
  });
});

describe('the milestones', () => {
  const NOW = new Date('2026-10-22T08:00:00.000Z');
  const goal = {
    id: 'g1', name: 'Testdoel', requirements: [], createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    status: 'active' as const, targetDate: '2027-06-01',
  };
  const hike = (id: string, km: number): SessionLog => ({
    id, templateId: 't', type: 'hiking', sport: 'hiking', completedDate: addDays(today, -2), completedAt: `${addDays(today, -2)}T10:00:00.000Z`,
    variant: 'full', durationMinutes: 90, source: 'manual', outdoorData: { distanceKm: km, durationMinutes: 90, backpackWeightKg: 8, source: 'manual' },
  });
  const walk = (km: number): ExternalActivity => activity({ externalId: 'intervals.icu:w1', kind: 'hike', start: `${addDays(today, -2)}T09:00:00`, durationSec: 90 * 60, distanceM: km * 1000, elevationGainM: undefined, avgHeartRate: undefined, maxHeartRate: undefined });

  beforeEach(async () => {
    await wipeAllData();
    await TrainingGoalsRepo.put(goal);
    await GoalMilestonesRepo.put({ id: 'm1', goalId: 'g1', order: 1, title: 'Vijf kilometer', requirement: { kind: 'distance', minKm: 5 } });
    await GoalMilestonesRepo.put({ id: 'm2', goalId: 'g1', order: 2, title: 'Tien kilometer', requirement: { kind: 'distance', minKm: 10 } });
  });

  it('records a milestone that only the watch reaches, and takes it away again with the numbers', async () => {
    await SessionLogsRepo.put(hike('h', 4.8));
    const outcome = await applyAlignments([{ logId: 'h', activity: walk(5.2) }], NOW);
    expect(outcome.clearedTitles).toEqual(['Vijf kilometer']);
    const rows = await GoalMilestoneProgressRepo.getAll();
    expect(rows).toEqual([expect.objectContaining({ milestoneId: 'm1', sourceSessionLogId: 'h', clearedDate: addDays(today, -2) })]);
    expect((await SessionLogsRepo.getAll())[0].manualMeasured?.clearedProgressIds).toEqual([rows[0].id]);

    await restoreAlignments(['h']);
    expect(await GoalMilestoneProgressRepo.getAll()).toEqual([]);
    expect((await SessionLogsRepo.getAll())[0].outdoorData?.distanceKm).toBe(4.8);
  });

  it('keeps a milestone the hand-made numbers reached, also when the watch measured less', async () => {
    const typed = hike('h', 6);
    await SessionLogsRepo.put(typed);
    await recordClearedMilestones(typed);
    const before = await GoalMilestoneProgressRepo.getAll();
    expect(before).toHaveLength(1);

    const outcome = await applyAlignments([{ logId: 'h', activity: walk(5.4) }], NOW);
    expect(outcome.logIds).toEqual(['h']);
    expect(outcome.clearedTitles).toEqual([]);
    expect(await GoalMilestoneProgressRepo.getAll()).toEqual(before);

    // Putting back does not take the old milestone away either.
    await restoreAlignments(['h']);
    expect(await GoalMilestoneProgressRepo.getAll()).toEqual(before);
  });

  it('moves on to the next milestone when only the watch reaches that one', async () => {
    const typed = hike('h', 6);
    await SessionLogsRepo.put(typed);
    await recordClearedMilestones(typed);
    const outcome = await applyAlignments([{ logId: 'h', activity: walk(10.6) }], NOW);
    expect(outcome.clearedTitles).toEqual(['Tien kilometer']);
    expect((await GoalMilestoneProgressRepo.getAll()).map((r) => r.milestoneId).sort()).toEqual(['m1', 'm2']);
    await restoreAlignments(['h']);
    expect((await GoalMilestoneProgressRepo.getAll()).map((r) => r.milestoneId)).toEqual(['m1']);
  });

  it('does not count a milestone the hand-made numbers already satisfied but left for later', async () => {
    const typed = hike('h', 11);
    await SessionLogsRepo.put(typed);
    await recordClearedMilestones(typed);
    expect(await GoalMilestoneProgressRepo.getAll()).toHaveLength(1);
    const outcome = await applyAlignments([{ logId: 'h', activity: walk(11.4) }], NOW);
    expect(outcome.clearedTitles).toEqual([]);
    expect(await GoalMilestoneProgressRepo.getAll()).toHaveLength(1);
  });
});

describe('the new stored shape in the export', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  it('travels in the export, and the watch cache does not', async () => {
    await SessionLogsRepo.put(hand());
    await applyAlignments([{ logId: 'log_1', activity: activity() }], new Date('2026-10-22T08:00:00.000Z'));
    await saveConnection({ athleteId: ATHLETE, apiKey: KEY });
    await syncWatchHistory({ fetchImpl: asFetch(intervalsFetch([rawActivity('i1', 3)])) });

    const envelope = await buildBackupEnvelope();
    const text = JSON.stringify(envelope);
    expect(text).not.toContain('historyFrom');
    expect(text).not.toContain('alignDeclined');
    const roundTripped = normalizeBackupToCurrentModel(JSON.parse(text));
    const log = roundTripped.sessionLogs.find((l) => l.id === 'log_1')!;
    expect(log.manualMeasured?.values.distanceKm).toBe(6.9);
    expect(log.externalId).toBe('intervals.icu:a1');
    expect(log.source).toBe('garmin');
  });

  it('is a pass-through for a log without it, and drops only a damaged field', () => {
    const plain = hand();
    expect(migrateLogManualMeasured(plain)).toBe(plain);
    const damaged = { ...hand({ source: 'garmin', externalId: 'x' }), manualMeasured: { at: 5, values: 'kapot', block: 'cardioData' } } as unknown as SessionLog;
    const fixed = migrateLogManualMeasured(damaged);
    expect(fixed.manualMeasured).toBeUndefined();
    expect(fixed).toMatchObject({ id: 'log_1', durationMinutes: 55, externalId: 'x' });
    const whole = { at: '2026-10-22T08:00:00.000Z', block: 'outdoorData', blockAdded: true, values: { distanceKm: 6.9, avgHeartRate: null, estimatedElevation: true }, clearedProgressIds: ['p1'] };
    expect(migrateManualMeasured(whole)).toEqual(whole);
    expect(migrateManualMeasured({ ...whole, values: { distanceKm: 'x' } })).toBeUndefined();
    expect(migrateManualMeasured({ ...whole, values: { onbekend: 1 } })).toBeUndefined();
  });

  it('reads a back-up from before the field as it was', () => {
    const old = { backupSchemaVersion: 5, createdAt: '2026-10-01T00:00:00.000Z', payload: { version: 5, sessionLogs: [hand()], settings: {} } };
    const normalized = normalizeBackupToCurrentModel(old);
    expect(normalized.sessionLogs).toEqual([hand()]);
  });
});

describe('what the proposals read', () => {
  it('hides the activity that is typed in, from the recent list only', async () => {
    const recent = [activity()];
    expect(pendingProposals(recent, [], [], [], [hand()])).toEqual([]);
  });
});

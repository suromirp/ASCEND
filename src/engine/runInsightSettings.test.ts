import { describe, it, expect, vi } from 'vitest';
import { DEFAULT_RUN_INSIGHT, cleanRunInsight, resolveRunInsight } from './runInsightSettings';
import { DEFAULT_WATCH_USE, detailsWanted, filterActivityDetails, normalizeWatchUse } from './watchUse';
import type { ExternalActivity } from './activityImport';
import { syncWatchActivities, saveConnection, setWatchUse, getWatchState } from '../storage/externalActivities';
import { wipeAllData } from '../storage/database';
import { todayISO } from '../utils/dates';

describe('the settings of the loopinzicht', () => {
  it('are the advice when nothing is stored, and read defensively', () => {
    expect(resolveRunInsight(undefined)).toEqual(DEFAULT_RUN_INSIGHT);
    expect(resolveRunInsight(null)).toEqual(DEFAULT_RUN_INSIGHT);
    expect(resolveRunInsight('rommel' as never)).toEqual(DEFAULT_RUN_INSIGHT);
    expect(resolveRunInsight({ enabled: 'nee' as never, topics: 3 as never })).toEqual(DEFAULT_RUN_INSIGHT);
    expect(DEFAULT_RUN_INSIGHT.chestStrap).toBe(true);
    expect(DEFAULT_RUN_INSIGHT.weather).toBe(true);
    expect(DEFAULT_RUN_INSIGHT.enabled).toBe(true);
  });

  it('take only what you changed', () => {
    const r = resolveRunInsight({ weather: false, topics: { form: false } });
    expect(r.weather).toBe(false);
    expect(r.topics).toEqual({ efficiency: true, longDays: true, climbing: true, form: false });
    expect(r.enabled).toBe(true);
  });

  it('keep valid keys in a file and drop the rest, counting what was lost', () => {
    expect(cleanRunInsight({ enabled: false, topics: { form: false, rommel: true }, extra: 1 })).toEqual({ value: { enabled: false, topics: { form: false } }, dropped: 2 });
    expect(cleanRunInsight('x')).toEqual({ value: undefined, dropped: 1 });
    expect(cleanRunInsight({})).toEqual({ value: undefined, dropped: 0 });
  });
});

describe('the settings of Run in detail', () => {
  it('are all on with the balance off when nothing is stored, as in an old backup', () => {
    const d = resolveRunInsight(undefined).detail;
    expect(d).toEqual({ show: true, patterns: true, advice: true, form: { cadence: true, stanceTimeMs: true, stepLengthM: true, oscillationMm: true, stanceBalanceLeftPct: false } });
    expect(resolveRunInsight({ enabled: false }).detail.show).toBe(true);
    expect(resolveRunInsight({ detail: 'rommel' as never }).detail).toEqual(d);
  });

  it('take what you changed and nothing else', () => {
    const d = resolveRunInsight({ detail: { advice: false, form: { stanceBalanceLeftPct: true, cadence: false } } }).detail;
    expect(d.advice).toBe(false);
    expect(d.patterns).toBe(true);
    expect(d.form.stanceBalanceLeftPct).toBe(true);
    expect(d.form.cadence).toBe(false);
    expect(d.form.stepLengthM).toBe(true);
  });

  it('survive a backup and lose only what is broken', () => {
    expect(cleanRunInsight({ detail: { show: false, form: { cadence: false, voet: true }, patterns: 'ja' } })).toEqual({ value: { detail: { show: false, form: { cadence: false } } }, dropped: 2 });
    expect(cleanRunInsight({ detail: 4 })).toEqual({ value: undefined, dropped: 1 });
  });
});

describe('the details switch', () => {
  const activity: ExternalActivity = {
    externalId: 'intervals.icu:i1',
    source: 'garmin',
    start: '2026-10-18T08:00:00',
    kind: 'run',
    durationSec: 2400,
    treadmill: false,
    dynamics: { stanceTimeMs: 240 },
    streamsAvailable: ['time', 'heartRate'],
  };

  it('is on by default, off only when said so, and needs the trainings', () => {
    expect(DEFAULT_WATCH_USE.details).toBe(true);
    expect(normalizeWatchUse(undefined).details).toBe(true);
    expect(normalizeWatchUse({ details: false }).details).toBe(false);
    expect(normalizeWatchUse({ details: 0 }).details).toBe(true);
    expect(detailsWanted(DEFAULT_WATCH_USE)).toBe(true);
    expect(detailsWanted({ ...DEFAULT_WATCH_USE, details: false })).toBe(false);
    expect(detailsWanted({ ...DEFAULT_WATCH_USE, activities: false })).toBe(false);
  });

  it('takes the dynamics and the list of series off the activities when off', () => {
    const list = [activity];
    expect(filterActivityDetails(list, DEFAULT_WATCH_USE)).toBe(list);
    const out = filterActivityDetails(list, { ...DEFAULT_WATCH_USE, details: false });
    expect(out[0].dynamics).toBeUndefined();
    expect('streamsAvailable' in out[0]).toBe(false);
    expect(out[0].externalId).toBe(activity.externalId);
  });

  it('works through the sync: what is off is not kept, and comes back when switched on', async () => {
    await wipeAllData();
    await saveConnection({ athleteId: 'i12345', apiKey: 'geheime-sleutel-0123' });
    const body = [{ id: 'i1', start_date_local: `${todayISO()}T08:00:00`, type: 'Run', source: 'GARMIN_CONNECT', moving_time: 3000, distance: 6500, average_stance_time: 240, stream_types: ['time', 'heartrate'] }];
    const f = vi.fn(async (url: string) => new Response(JSON.stringify(String(url).includes('/wellness') ? [] : body), { status: 200 }));
    await syncWatchActivities({ fetchImpl: f as unknown as typeof fetch });
    expect((await getWatchState()).activities[0].dynamics).toEqual({ stanceTimeMs: 240 });

    await setWatchUse({ details: false });
    expect((await getWatchState()).activities[0].dynamics).toBeUndefined();
    await syncWatchActivities({ fetchImpl: f as unknown as typeof fetch, force: true });
    const off = (await getWatchState()).activities[0];
    expect(off.dynamics).toBeUndefined();
    expect(off.streamsAvailable).toBeUndefined();

    await setWatchUse({ details: true });
    await syncWatchActivities({ fetchImpl: f as unknown as typeof fetch, force: true });
    expect((await getWatchState()).activities[0].dynamics).toEqual({ stanceTimeMs: 240 });
  });
});

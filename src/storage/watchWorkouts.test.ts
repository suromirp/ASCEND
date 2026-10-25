import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MetaRepo, PlannedSessionsRepo, SessionLogsRepo, SettingsRepo, seedIfEmpty, wipeAllData, ProgramsRepo } from './database';
import { saveConnection } from './externalActivities';
import { buildBackupEnvelope } from './backup';
import {
  cleanUpWatchWorkouts,
  getWatchWorkoutState,
  pauseWatchWorkouts,
  removeWatchWorkouts,
  resendWatchWorkouts,
  resetAllDataAndAgenda,
  sendNextWatchWorkout,
  setWatchWorkoutsEnabled,
  syncWatchWorkouts,
  syncWatchWorkoutsAfterPlanChange,
} from './watchWorkouts';
import { selectWatchWorkouts } from '../engine/watchWorkout';
import { addDays } from '../utils/dates';
import type { SessionLog } from '../models/training';

// The default plan starts at the real today, so on a Sunday the first week has hardly
// any trainings left; these tests run on a fixed Wednesday instead.
vi.hoisted(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-21T08:00:00'));
});

const KEY = 'geheime-sleutel-0123';
const ATHLETE = 'i12345';

// A fake intervals.icu agenda: it keeps what was created, by external id, the
// way the real one upserts, and answers the other calls like the real one.
function fakeAgenda(options: { failWith?: number; sport?: { lthr?: number; max_hr?: number } | 'down' } = {}) {
  const events = new Map<string, { id: number; body: Record<string, unknown> }>();
  const calls: { method: string; url: string; body: unknown }[] = [];
  // Things the list returns that are not ASCEND's: the owner's own events, other categories.
  const foreign: unknown[] = [];
  let nextId = 1000;
  const fn = vi.fn(async (url: string, init: RequestInit) => {
    const method = init.method ?? 'GET';
    const body = init.body ? JSON.parse(init.body as string) : undefined;
    calls.push({ method, url, body });
    if (url.endsWith('/sport-settings')) {
      if (!options.sport || options.sport === 'down') return new Response('', { status: 500 });
      return new Response(JSON.stringify([{ id: 1, types: ['Run'], ...options.sport }]), { status: 200 });
    }
    if (options.failWith) return new Response('', { status: options.failWith });
    if (method === 'GET' && url.includes('/events?')) {
      const list = [...events.entries()].map(([ext, v]) => ({ id: v.id, external_id: ext, category: 'WORKOUT', start_date_local: '2026-10-26T00:00:00', ...v.body }));
      return new Response(JSON.stringify([...list, ...(foreign as unknown[])]), { status: 200 });
    }
    if (method === 'POST' && url.endsWith('/events/bulk?upsert=true')) {
      const out = (body as Record<string, unknown>[]).map((e) => {
        const ext = e.external_id as string;
        const had = events.get(ext);
        const id = had?.id ?? nextId++;
        events.set(ext, { id, body: e });
        return { id, external_id: ext };
      });
      return new Response(JSON.stringify(out), { status: 200 });
    }
    const one = url.match(/\/events\/(\d+)$/);
    if (method === 'PUT' && one) {
      const found = [...events.entries()].find(([, v]) => v.id === Number(one[1]));
      if (!found) return new Response('', { status: 404 });
      events.set(found[0], { id: found[1].id, body: body as Record<string, unknown> });
      return new Response(JSON.stringify({ id: found[1].id }), { status: 200 });
    }
    if (method === 'PUT' && url.endsWith('/events/bulk-delete')) {
      let deleted = 0;
      for (const d of body as { id?: number; external_id?: string }[]) {
        for (const [ext, v] of events) {
          if (v.id === d.id || ext === d.external_id) {
            events.delete(ext);
            deleted++;
          }
        }
      }
      return new Response(JSON.stringify({ eventsDeleted: deleted }), { status: 200 });
    }
    return new Response('', { status: 400 });
  });
  return { fn: fn as unknown as typeof fetch, events, calls, foreign };
}

async function setup() {
  await wipeAllData();
  await seedIfEmpty();
  await saveConnection({ athleteId: ATHLETE, apiKey: KEY });
  const [program] = await ProgramsRepo.getAll();
  return { today: program.startDate };
}

const writes = (calls: { method: string }[]) => calls.filter((c) => c.method !== 'GET');

describe('the switch', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  it('is off by default, and then nothing is sent', async () => {
    const { today } = await setup();
    const agenda = fakeAgenda();
    expect((await getWatchWorkoutState()).enabled).toBe(false);
    expect(await syncWatchWorkouts({ fetchImpl: agenda.fn, today, force: true })).toEqual({ status: 'off' });
    expect(agenda.calls).toHaveLength(0);
  });

  it('needs a connection', async () => {
    await wipeAllData();
    await setWatchWorkoutsEnabled(true);
    expect(await syncWatchWorkouts({ force: true })).toEqual({ status: 'not-connected' });
  });
});

describe('syncing the coming week', () => {
  it('creates the trainings that can go to a watch, once each, with ASCEND ids and no strength', async () => {
    const { today } = await setup();
    const agenda = fakeAgenda();
    await setWatchWorkoutsEnabled(true);
    const result = await syncWatchWorkouts({ fetchImpl: agenda.fn, today, force: true });
    expect(result.status).toBe('ok');
    expect(agenda.events.size).toBeGreaterThan(0);
    for (const [ext, v] of agenda.events) {
      expect(ext.startsWith('ascend:')).toBe(true);
      expect(v.body.category).toBe('WORKOUT');
      expect(v.body.external_id).toBe(ext);
    }
    // One request creates them all.
    expect(writes(agenda.calls)).toHaveLength(1);
    const state = await getWatchWorkoutState();
    expect(Object.keys(state.items)).toHaveLength(agenda.events.size);
    expect(state.syncedAt).toBeDefined();
    expect(state.lastError).toBeUndefined();
    // Each event remembers when it was written, for the status on the training screen.
    for (const item of Object.values(state.items)) expect(item.sentAt).toBe(state.syncedAt);
  });

  it('a forced run is not stopped by the 15-minute brake, as the button "Nu versturen" needs', async () => {
    const { today } = await setup();
    const agenda = fakeAgenda();
    await setWatchWorkoutsEnabled(true);
    const t0 = new Date('2026-10-26T08:00:00Z');
    expect((await syncWatchWorkouts({ fetchImpl: agenda.fn, today, now: t0 })).status).toBe('ok');
    const soon = new Date(t0.getTime() + 60_000);
    expect(await syncWatchWorkouts({ fetchImpl: agenda.fn, today, now: soon })).toEqual({ status: 'too-soon' });
    expect((await syncWatchWorkouts({ fetchImpl: agenda.fn, today, now: soon, force: true })).status).toBe('ok');
  });

  it('never makes doubles: a second run sends nothing', async () => {
    const { today } = await setup();
    const agenda = fakeAgenda();
    await setWatchWorkoutsEnabled(true);
    await syncWatchWorkouts({ fetchImpl: agenda.fn, today, force: true });
    const before = agenda.events.size;
    const callsBefore = agenda.calls.length;
    const second = await syncWatchWorkouts({ fetchImpl: agenda.fn, today, force: true });
    expect(second).toEqual({ status: 'ok', created: 0, updated: 0, removed: 0 });
    expect(agenda.events.size).toBe(before);
    expect(agenda.calls).toHaveLength(callsBefore);
  });

  it('runs at most once per 15 minutes', async () => {
    const { today } = await setup();
    const agenda = fakeAgenda();
    await setWatchWorkoutsEnabled(true);
    const t0 = new Date('2026-10-26T08:00:00Z');
    expect((await syncWatchWorkouts({ fetchImpl: agenda.fn, today, now: t0 })).status).toBe('ok');
    expect(await syncWatchWorkouts({ fetchImpl: agenda.fn, today, now: new Date(t0.getTime() + 14 * 60_000) })).toEqual({ status: 'too-soon' });
    expect((await syncWatchWorkouts({ fetchImpl: agenda.fn, today, now: new Date(t0.getTime() + 15 * 60_000) })).status).toBe('ok');
  });

  it('updates an event when ASCEND moved the session, on the same event', async () => {
    const { today } = await setup();
    const agenda = fakeAgenda();
    await setWatchWorkoutsEnabled(true);
    await syncWatchWorkouts({ fetchImpl: agenda.fn, today, force: true });
    const first = [...agenda.events.entries()][0];
    const plannedId = first[0].replace('ascend:', '');
    const planned = (await PlannedSessionsRepo.getAll()).find((s) => s.id === plannedId)!;
    const idBefore = first[1].id;
    await PlannedSessionsRepo.put({ ...planned, scheduledDate: addDays(planned.scheduledDate, 1), status: 'moved' });
    const sizeBefore = agenda.events.size;

    const result = await syncWatchWorkouts({ fetchImpl: agenda.fn, today, force: true });
    expect(result.status === 'ok' && result.updated).toBeGreaterThanOrEqual(1);
    expect(agenda.events.size).toBe(sizeBefore);
    expect(agenda.events.get(first[0])!.id).toBe(idBefore);
    expect(agenda.events.get(first[0])!.body.start_date_local).toBe(`${addDays(planned.scheduledDate, 1)}T00:00:00`);
  });

  it('follows a plan change right away, inside the 15 minutes, and only while the switch is on', async () => {
    const { today } = await setup();
    const agenda = fakeAgenda();
    // Off: nothing goes out.
    expect(await syncWatchWorkoutsAfterPlanChange({ fetchImpl: agenda.fn, today })).toEqual({ status: 'off' });
    expect(agenda.calls).toHaveLength(0);
    await setWatchWorkoutsEnabled(true);
    const t0 = new Date('2026-10-26T08:00:00Z');
    await syncWatchWorkouts({ fetchImpl: agenda.fn, today, now: t0 });
    const ext = [...agenda.events.keys()][0];
    const planned = (await PlannedSessionsRepo.getAll()).find((s) => s.id === ext.replace('ascend:', ''))!;
    await PlannedSessionsRepo.put({ ...planned, scheduledDate: addDays(planned.scheduledDate, 1), status: 'moved' });
    const soon = new Date(t0.getTime() + 60_000);
    // The ordinary run is held back by the brake, the one after a plan change is not.
    expect(await syncWatchWorkouts({ fetchImpl: agenda.fn, today, now: soon })).toEqual({ status: 'too-soon' });
    const result = await syncWatchWorkoutsAfterPlanChange({ fetchImpl: agenda.fn, today, now: soon });
    expect(result.status === 'ok' && result.updated).toBeGreaterThanOrEqual(1);
    expect(agenda.events.get(ext)!.body.start_date_local).toBe(`${addDays(planned.scheduledDate, 1)}T00:00:00`);
  });

  it('removes an event when the session is skipped, and leaves the others', async () => {
    const { today } = await setup();
    const agenda = fakeAgenda();
    await setWatchWorkoutsEnabled(true);
    await syncWatchWorkouts({ fetchImpl: agenda.fn, today, force: true });
    const size = agenda.events.size;
    const ext = [...agenda.events.keys()][0];
    const planned = (await PlannedSessionsRepo.getAll()).find((s) => s.id === ext.replace('ascend:', ''))!;
    await PlannedSessionsRepo.put({ ...planned, status: 'skipped' });

    const result = await syncWatchWorkouts({ fetchImpl: agenda.fn, today, force: true });
    expect(result).toEqual({ status: 'ok', created: 0, updated: 0, removed: 1 });
    expect(agenda.events.has(ext)).toBe(false);
    expect(agenda.events.size).toBe(size - 1);
    expect((await getWatchWorkoutState()).items[planned.id]).toBeUndefined();
  });

  it('takes a finished training out of the agenda and the books, and leaves the rest', async () => {
    const { today } = await setup();
    const agenda = fakeAgenda();
    await setWatchWorkoutsEnabled(true);
    await syncWatchWorkouts({ fetchImpl: agenda.fn, today, force: true });
    const before = agenda.events.size;
    const ext = [...agenda.events.keys()][0];
    const plannedId = ext.replace('ascend:', '');
    const planned = (await PlannedSessionsRepo.getAll()).find((s) => s.id === plannedId)!;
    await SessionLogsRepo.put({ id: 'log1', plannedSessionId: plannedId, templateId: planned.templateId, completedDate: planned.scheduledDate } as SessionLog);

    const result = await syncWatchWorkouts({ fetchImpl: agenda.fn, today, force: true });
    expect(result).toEqual({ status: 'ok', created: 0, updated: 0, removed: 1 });
    expect(agenda.events.has(ext)).toBe(false);
    expect(agenda.events.size).toBe(before - 1);
    expect((await getWatchWorkoutState()).items[plannedId]).toBeUndefined();
  });

  it('keeps a finished training in the agenda when "Gedane trainingen weghalen" is off', async () => {
    const { today } = await setup();
    await SettingsRepo.set({ watchRemoveDone: false });
    const agenda = fakeAgenda();
    await setWatchWorkoutsEnabled(true);
    await syncWatchWorkouts({ fetchImpl: agenda.fn, today, force: true });
    const ext = [...agenda.events.keys()][0];
    const plannedId = ext.replace('ascend:', '');
    const planned = (await PlannedSessionsRepo.getAll()).find((s) => s.id === plannedId)!;
    const log = { id: 'log1', plannedSessionId: plannedId, templateId: planned.templateId, completedDate: planned.scheduledDate } as SessionLog;
    await SessionLogsRepo.put(log);

    await syncWatchWorkouts({ fetchImpl: agenda.fn, today, force: true });
    expect(agenda.events.has(ext)).toBe(true);
    expect((await getWatchWorkoutState()).items[plannedId]).toBeUndefined();
  });

  it('never touches an event the owner put in intervals.icu himself', async () => {
    const { today } = await setup();
    const agenda = fakeAgenda();
    agenda.events.set('mijn-eigen-training', { id: 5, body: { name: 'Zelf gezet' } });
    await setWatchWorkoutsEnabled(true);
    await syncWatchWorkouts({ fetchImpl: agenda.fn, today, force: true });
    // Everything ASCEND falls away: switch off removes only its own.
    await setWatchWorkoutsEnabled(false, { fetchImpl: agenda.fn, today });
    expect([...agenda.events.keys()]).toEqual(['mijn-eigen-training']);
    for (const c of agenda.calls) expect(JSON.stringify(c.body ?? '')).not.toMatch(/"id":5\b/);
  });

  it('turning the switch off takes the coming trainings out of the agenda, and sends nothing afterwards', async () => {
    const { today } = await setup();
    const agenda = fakeAgenda();
    await setWatchWorkoutsEnabled(true);
    await syncWatchWorkouts({ fetchImpl: agenda.fn, today, force: true });
    expect(agenda.events.size).toBeGreaterThan(0);
    const off = await setWatchWorkoutsEnabled(false, { fetchImpl: agenda.fn, today });
    expect(off.status).toBe('ok');
    expect(agenda.events.size).toBe(0);
    expect((await getWatchWorkoutState()).enabled).toBe(false);
    expect(await syncWatchWorkouts({ fetchImpl: agenda.fn, today, force: true })).toEqual({ status: 'off' });
  });

  it('a failure becomes a Dutch message, is kept for the screen, and the next run carries on', async () => {
    const { today } = await setup();
    await setWatchWorkoutsEnabled(true);
    const failing = fakeAgenda({ failWith: 401 });
    const result = await syncWatchWorkouts({ fetchImpl: failing.fn, today, force: true });
    expect(result.status).toBe('error');
    expect(result.status === 'error' && result.message).toMatch(/API-sleutel/);
    expect((await getWatchWorkoutState()).lastError).toMatch(/API-sleutel/);
    expect((await getWatchWorkoutState()).syncedAt).toBeUndefined();

    const working = fakeAgenda();
    expect((await syncWatchWorkouts({ fetchImpl: working.fn, today, force: true })).status).toBe('ok');
    expect(working.events.size).toBeGreaterThan(0);
    expect((await getWatchWorkoutState()).lastError).toBeUndefined();
  });
});

describe('"Eén training testen"', () => {
  it('sends only the next training, also with the switch off, and says which', async () => {
    const { today } = await setup();
    const agenda = fakeAgenda();
    const [sessions, programs] = [await PlannedSessionsRepo.getAll(), await ProgramsRepo.getAll()];
    expect(programs).toHaveLength(1);
    const result = await sendNextWatchWorkout({ fetchImpl: agenda.fn, today });
    expect(result.status).toBe('ok');
    expect(agenda.events.size).toBe(1);
    expect(sessions.length).toBeGreaterThan(0);
    const state = await getWatchWorkoutState();
    expect(state.enabled).toBe(false);
    expect(Object.keys(state.items)).toHaveLength(1);
    // It is the first one by date, and the one the switch would send first.
    const { SessionTemplatesRepo } = await import('./database');
    const first = selectWatchWorkouts({ sessions, logs: [], templates: await SessionTemplatesRepo.getAll(), program: programs[0], today })[0];
    expect(result.status === 'ok' && result.name).toBe(first.name);
    expect(agenda.events.has(first.externalId)).toBe(true);
  });

  it('twice is still one event, and the switch afterwards updates it instead of adding a second', async () => {
    const { today } = await setup();
    const agenda = fakeAgenda();
    await sendNextWatchWorkout({ fetchImpl: agenda.fn, today });
    await sendNextWatchWorkout({ fetchImpl: agenda.fn, today });
    expect(agenda.events.size).toBe(1);
    const [only] = [...agenda.events.values()];
    await setWatchWorkoutsEnabled(true);
    await syncWatchWorkouts({ fetchImpl: agenda.fn, today, force: true });
    const sameEvent = [...agenda.events.values()].filter((v) => v.id === only.id);
    expect(sameEvent).toHaveLength(1);
  });

  it('says so when no training can go to the watch', async () => {
    await setup();
    const agenda = fakeAgenda();
    expect(await sendNextWatchWorkout({ fetchImpl: agenda.fn, today: '2030-01-01' })).toEqual({ status: 'nothing' });
    expect(agenda.calls).toHaveLength(0);
  });

  it('says so when there is no connection', async () => {
    await wipeAllData();
    expect(await sendNextWatchWorkout({ fetchImpl: fakeAgenda().fn })).toEqual({ status: 'not-connected' });
  });

  it('reports a failure in plain Dutch', async () => {
    const { today } = await setup();
    const result = await sendNextWatchWorkout({ fetchImpl: fakeAgenda({ failWith: 403 }).fn, today });
    expect(result.status).toBe('error');
    expect(result.status === 'error' && result.message).toMatch(/geen trainingen in je agenda/);
  });

  it('can be taken away again', async () => {
    const { today } = await setup();
    const agenda = fakeAgenda();
    await sendNextWatchWorkout({ fetchImpl: agenda.fn, today });
    expect(await removeWatchWorkouts({ fetchImpl: agenda.fn, today })).toEqual({ status: 'ok', removed: 1 });
    expect(agenda.events.size).toBe(0);
  });
});

describe('unlinking and the backup', () => {
  it('unlinking switches it off but remembers what was sent', async () => {
    const { today } = await setup();
    const agenda = fakeAgenda();
    await setWatchWorkoutsEnabled(true);
    await syncWatchWorkouts({ fetchImpl: agenda.fn, today, force: true });
    await pauseWatchWorkouts();
    const state = await getWatchWorkoutState();
    expect(state.enabled).toBe(false);
    expect(Object.keys(state.items).length).toBeGreaterThan(0);
  });

  it('is in no backup: not the switch, not the list of what was sent', async () => {
    const { today } = await setup();
    const agenda = fakeAgenda();
    await setWatchWorkoutsEnabled(true);
    await syncWatchWorkouts({ fetchImpl: agenda.fn, today, force: true });
    const text = JSON.stringify(await buildBackupEnvelope());
    expect(text).not.toContain('watchWorkoutsSync');
    expect(text).not.toContain('ascend:');
    expect(text).not.toContain(KEY);
    expect(await MetaRepo.get('watchWorkoutsSync')).toBeDefined();
  });
});

describe('Alles verwijderen', () => {
  it('takes the coming trainings out of the agenda first, so no orphans stay on the watch', async () => {
    const { today } = await setup();
    const agenda = fakeAgenda();
    await setWatchWorkoutsEnabled(true);
    await syncWatchWorkouts({ fetchImpl: agenda.fn, today, force: true });
    expect(agenda.events.size).toBeGreaterThan(0);
    await resetAllDataAndAgenda({ fetchImpl: agenda.fn, today });
    expect(agenda.events.size).toBe(0);
    // And the reset itself went through: the list of what was sent is gone with the rest.
    expect((await getWatchWorkoutState()).items).toEqual({});
  });

  it('still deletes everything when the agenda cannot be reached, and when there is no connection', async () => {
    const { today } = await setup();
    const agenda = fakeAgenda();
    await setWatchWorkoutsEnabled(true);
    await syncWatchWorkouts({ fetchImpl: agenda.fn, today, force: true });
    const broken = fakeAgenda({ failWith: 500 });
    await resetAllDataAndAgenda({ fetchImpl: broken.fn, today });
    expect(broken.calls.length).toBeGreaterThan(0);
    expect(await SessionLogsRepo.getAll()).toEqual([]);
    expect((await getWatchWorkoutState()).items).toEqual({});
    // Nothing connected any more: nothing to call, nothing in the way.
    const none = fakeAgenda();
    await resetAllDataAndAgenda({ fetchImpl: none.fn, today });
    expect(none.calls).toHaveLength(0);
  });
});

describe('the ASCEND prefix on what was already sent', () => {
  it('updates the names at the next round, once, without making doubles', async () => {
    const { today } = await setup();
    await SettingsRepo.set({ watchNamePrefix: 'none' });
    const agenda = fakeAgenda();
    await setWatchWorkoutsEnabled(true);
    await syncWatchWorkouts({ fetchImpl: agenda.fn, today, force: true });
    const n = agenda.events.size;
    expect(n).toBeGreaterThan(0);
    for (const v of agenda.events.values()) expect(String(v.body.name).startsWith('ASC')).toBe(false);

    await SettingsRepo.set({ watchNamePrefix: 'short' });
    const result = await syncWatchWorkouts({ fetchImpl: agenda.fn, today, force: true });
    expect(result).toEqual({ status: 'ok', created: 0, updated: n, removed: 0 });
    expect(agenda.events.size).toBe(n);
    for (const v of agenda.events.values()) {
      expect(String(v.body.name).startsWith('ASC ')).toBe(true);
      expect(String(v.body.description).startsWith('Gepland door ASCEND voor ')).toBe(true);
    }
    // And then it is quiet again.
    expect(await syncWatchWorkouts({ fetchImpl: agenda.fn, today, force: true })).toEqual({ status: 'ok', created: 0, updated: 0, removed: 0 });
  });
});

describe('"Weghalen": cleaning up the agenda', () => {
  it('removes what ASCEND sent, also what its books lost, and nothing else', async () => {
    const { today } = await setup();
    const agenda = fakeAgenda();
    await setWatchWorkoutsEnabled(true);
    await syncWatchWorkouts({ fetchImpl: agenda.fn, today, force: true });
    const own = agenda.events.size;
    // Strays: sent by the test button or an earlier install, not in the books.
    agenda.events.set('ascend:oude-test', { id: 901, body: { name: 'Oude test' } });
    agenda.events.set('ascend:eerdere-installatie', { id: 902, body: { name: 'Eerder' } });
    // The owner's own things, which the list also returns.
    agenda.events.set('mijn-eigen-training', { id: 5, body: { name: 'Zelf gezet' } });
    agenda.events.set('ascendant:geen-van-ons', { id: 6, body: { name: 'Lijkt erop' } });
    agenda.foreign.push({ id: 7, external_id: null, category: 'WORKOUT', name: 'Zonder id' });
    agenda.foreign.push({ id: 8, external_id: 'ascend:maar-geen-workout', category: 'NOTE', name: 'Notitie' });
    agenda.foreign.push({ id: 9, name: 'Zonder external_id' });

    const result = await cleanUpWatchWorkouts({ fetchImpl: agenda.fn, today });
    expect(result).toEqual({ status: 'ok', removed: own + 2, strays: 2 });
    expect([...agenda.events.keys()].sort()).toEqual(['ascendant:geen-van-ons', 'mijn-eigen-training']);
    // The delete request names only ASCEND's events.
    const del = agenda.calls.find((c) => c.url.endsWith('/events/bulk-delete'))!;
    const ids = (del.body as { id?: number }[]).map((d) => d.id);
    for (const id of [5, 6, 7, 8, 9]) expect(ids).not.toContain(id);
    expect(ids).toContain(901);
    expect(ids).toContain(902);
    expect((await getWatchWorkoutState()).items).toEqual({});
    // The list was asked for the coming weeks, workouts only.
    const list = agenda.calls.find((c) => c.method === 'GET')!;
    expect(list.url).toContain('category=WORKOUT');
    expect(list.url).toContain(`oldest=${today}`);
  });

  it('deletes nothing when the agenda cannot be read', async () => {
    const { today } = await setup();
    const agenda = fakeAgenda();
    await setWatchWorkoutsEnabled(true);
    await syncWatchWorkouts({ fetchImpl: agenda.fn, today, force: true });
    const before = (await getWatchWorkoutState()).items;
    const failing = fakeAgenda({ failWith: 500 });
    const result = await cleanUpWatchWorkouts({ fetchImpl: failing.fn, today });
    expect(result.status).toBe('error');
    expect(writes(failing.calls)).toHaveLength(0);
    expect((await getWatchWorkoutState()).items).toEqual(before);
  });

  it('needs a connection', async () => {
    await wipeAllData();
    expect(await cleanUpWatchWorkouts()).toEqual({ status: 'not-connected' });
  });
});

describe('"Opnieuw versturen"', () => {
  it('cleans up first and sends the coming days again, without making doubles', async () => {
    const { today } = await setup();
    const agenda = fakeAgenda();
    await setWatchWorkoutsEnabled(true);
    await syncWatchWorkouts({ fetchImpl: agenda.fn, today, force: true });
    const n = agenda.events.size;
    agenda.events.set('ascend:oude-test', { id: 901, body: { name: 'Oude test' } });
    agenda.events.set('mijn-eigen-training', { id: 5, body: { name: 'Zelf gezet' } });

    const result = await resendWatchWorkouts({ fetchImpl: agenda.fn, today });
    expect(result).toEqual({ status: 'ok', removed: n + 1, sent: n });
    expect(agenda.events.size).toBe(n + 1);
    expect(agenda.events.has('ascend:oude-test')).toBe(false);
    expect(agenda.events.has('mijn-eigen-training')).toBe(true);
    expect(Object.keys((await getWatchWorkoutState()).items)).toHaveLength(n);
  });

  it('does nothing while the switch is off', async () => {
    const { today } = await setup();
    const agenda = fakeAgenda();
    expect(await resendWatchWorkouts({ fetchImpl: agenda.fn, today })).toEqual({ status: 'off' });
    expect(agenda.calls).toHaveLength(0);
  });
});

describe('the heart rate of ASCEND on the watch', () => {
  const descriptions = (agenda: ReturnType<typeof fakeAgenda>) => [...agenda.events.values()].map((v) => String(v.body.description));
  const sportCalls = (agenda: ReturnType<typeof fakeAgenda>) => agenda.calls.filter((c) => c.url.endsWith('/sport-settings')).length;

  it('writes percentages of the threshold of intervals.icu, and follows when it changes', async () => {
    const { today } = await setup();
    await SettingsRepo.set({ heartRate: { lthr: 179 } });
    await setWatchWorkoutsEnabled(true);
    const first = fakeAgenda({ sport: { lthr: 170, max_hr: 190 } });
    await syncWatchWorkouts({ fetchImpl: first.fn, today, force: true });
    expect(descriptions(first).join('\n')).toMatch(/\d+-\d+% LTHR/);
    expect(sportCalls(first)).toBe(1);
    expect((await getWatchWorkoutState()).hrBasis).toMatchObject({ lthr: 170, maxHr: 190 });

    const n = first.events.size;
    const quiet = await syncWatchWorkouts({ fetchImpl: first.fn, today, force: true });
    expect(quiet).toEqual({ status: 'ok', created: 0, updated: 0, removed: 0 });

    const changed = { ...first, fn: fakeAgenda({ sport: { lthr: 165, max_hr: 190 } }).fn };
    const result = await syncWatchWorkouts({ fetchImpl: changed.fn, today, force: true });
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.updated).toBeGreaterThan(0);
    expect(n).toBeGreaterThan(0);
  });

  it('keeps what it knew when intervals.icu cannot be read, and falls back without anything', async () => {
    const { today } = await setup();
    await SettingsRepo.set({ heartRate: { lthr: 179 } });
    await setWatchWorkoutsEnabled(true);
    const agenda = fakeAgenda({ sport: { lthr: 170 } });
    await syncWatchWorkouts({ fetchImpl: agenda.fn, today, force: true });
    const before = descriptions(agenda);
    const down = fakeAgenda({ sport: 'down' });
    await syncWatchWorkouts({ fetchImpl: down.fn, today, force: true });
    expect((await getWatchWorkoutState()).hrBasis).toMatchObject({ lthr: 170, failed: true });
    expect(descriptions(agenda)).toEqual(before);
  });

  it('sends the zone name when nothing was ever read', async () => {
    const { today } = await setup();
    await SettingsRepo.set({ heartRate: { lthr: 179 } });
    await setWatchWorkoutsEnabled(true);
    const agenda = fakeAgenda({ sport: 'down' });
    await syncWatchWorkouts({ fetchImpl: agenda.fn, today, force: true });
    expect(descriptions(agenda).join('\n')).toMatch(/Z\d HR/);
    expect(descriptions(agenda).join('\n')).not.toMatch(/% LTHR/);
  });

  it('does not ask intervals.icu with the old way of working or without a threshold of its own', async () => {
    const { today } = await setup();
    await setWatchWorkoutsEnabled(true);
    const none = fakeAgenda({ sport: { lthr: 170 } });
    await syncWatchWorkouts({ fetchImpl: none.fn, today, force: true });
    expect(sportCalls(none)).toBe(0);
    await SettingsRepo.set({ heartRate: { lthr: 179 }, watchHeartRate: 'intervals' });
    await syncWatchWorkouts({ fetchImpl: none.fn, today, force: true });
    expect(sportCalls(none)).toBe(0);
  });

  it('a changed setting updates what is on the watch', async () => {
    const { today } = await setup();
    await SettingsRepo.set({ heartRate: { lthr: 179 } });
    await setWatchWorkoutsEnabled(true);
    const agenda = fakeAgenda({ sport: { lthr: 170 } });
    await syncWatchWorkouts({ fetchImpl: agenda.fn, today, force: true });
    await SettingsRepo.set({ heartRate: { lthr: 179 }, watchHeartRate: 'intervals' });
    const result = await syncWatchWorkouts({ fetchImpl: agenda.fn, today, force: true });
    expect(result.status === 'ok' && result.updated).toBeGreaterThan(0);
    expect(descriptions(agenda).join('\n')).not.toMatch(/% LTHR/);
  });
});

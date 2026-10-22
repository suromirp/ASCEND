// ASCEND: local state of "Trainingen naar je horloge sturen".
//
// One record under its own meta key, on this device only:
// - the switch (default OFF),
// - which events ASCEND put in the intervals.icu agenda (by the id of the
//   planned session, with the fingerprint of what was sent and the id
//   intervals.icu gave back), so a move becomes an update and a skipped
//   training a delete, and nothing is ever sent twice,
// - when it last ran and what the last attempt said.
//
// Like the connection it is not part of any export (tested in
// watchWorkouts.test.ts): it only describes this phone's link with one
// intervals.icu account.
//
// The decisions (what goes to the watch, what changed) live in
// engine/watchWorkout.ts, the requests in integrations/intervalsIcu.ts. This
// file reads the stored plan, asks them, and keeps the books.

import { MetaRepo, PlannedSessionsRepo, ProgramsRepo, SessionLogsRepo, SessionTemplatesRepo, SettingsRepo, resetToDemoData } from './database';
import { getConnection, isFetchDue, MIN_FETCH_INTERVAL_MINUTES } from './externalActivities';
import {
  createWorkoutEvents,
  deleteWorkoutEvents,
  fetchAscendEvents,
  intervalsErrorMessage,
  updateWorkoutEvent,
  type FetchOptions,
  type IntervalsConnection,
} from '../integrations/intervalsIcu';
import { planWatchSync, selectWatchWorkouts, type TrackedWorkout, type WatchWorkout } from '../engine/watchWorkout';
import { racePaces } from '../engine/racePaces';
import { testResults } from '../engine/racePrediction';
import { addDays, todayISO } from '../utils/dates';

const STATE_KEY = 'watchWorkoutsSync';

export interface WatchWorkoutState {
  enabled: boolean;
  // plannedSessionId -> what ASCEND put in the agenda for it.
  items: Record<string, TrackedWorkout>;
  // The last successful run (ISO timestamp), the throttle's reference.
  syncedAt?: string;
  // What the last attempt said when it failed; cleared by the next success.
  lastError?: string;
}

export async function getWatchWorkoutState(): Promise<WatchWorkoutState> {
  const stored = await MetaRepo.get<Partial<WatchWorkoutState>>(STATE_KEY);
  return {
    enabled: stored?.enabled === true,
    items: stored?.items && typeof stored.items === 'object' ? stored.items : {},
    syncedAt: stored?.syncedAt,
    lastError: stored?.lastError,
  };
}

// Fired after every write, so a screen that shows the status (the training
// screen, the Week list, the Garmin page) reads it again, also when the write
// came from the background run at boot.
export const WATCH_STATE_EVENT = 'ascend-watch-workouts-changed';

async function putState(state: WatchWorkoutState): Promise<void> {
  await MetaRepo.set(STATE_KEY, state);
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') window.dispatchEvent(new Event(WATCH_STATE_EVENT));
}

export interface WorkoutOptions extends FetchOptions {
  connection?: IntervalsConnection;
  now?: Date;
  today?: string;
}

// What should be on the watch right now, from the stored plan, and which of
// the planned sessions are done.
async function loadDesired(today: string): Promise<{ desired: WatchWorkout[]; logged: Set<string>; removeDone: boolean }> {
  const [programs, templates, sessions, logs, settings] = await Promise.all([
    ProgramsRepo.getAll(),
    SessionTemplatesRepo.getAll(),
    PlannedSessionsRepo.getAll(),
    SessionLogsRepo.getAll(),
    SettingsRepo.get(),
  ]);
  const desired = selectWatchWorkouts({ sessions, logs, templates, program: programs[0], paces: racePaces(testResults(logs)), today, options: { namePrefix: settings.watchNamePrefix } });
  const logged = new Set(logs.map((l) => l.plannedSessionId).filter((id): id is string => !!id));
  return { desired, logged, removeDone: settings.watchRemoveDone !== false };
}

export type WorkoutSyncResult =
  | { status: 'off' }
  | { status: 'not-connected' }
  | { status: 'too-soon' }
  | { status: 'ok'; created: number; updated: number; removed: number }
  | { status: 'error'; message: string };

// Puts the coming week in the agenda: creates what is new, updates what
// ASCEND moved or changed, removes what fell away. Never throws: a failure
// becomes a message, and what did get through is remembered, so the next run
// carries on from there.
export async function syncWatchWorkouts(options: WorkoutOptions & { force?: boolean } = {}): Promise<WorkoutSyncResult> {
  const now = options.now ?? new Date();
  const today = options.today ?? todayISO();
  let state: WatchWorkoutState;
  let connection: IntervalsConnection | null;
  try {
    state = await getWatchWorkoutState();
    if (!state.enabled) return { status: 'off' };
    connection = options.connection ?? (await getConnection());
    if (!connection) return { status: 'not-connected' };
    if (!options.force && !isFetchDue(state.syncedAt, now, MIN_FETCH_INTERVAL_MINUTES)) return { status: 'too-soon' };
  } catch {
    return { status: 'error', message: 'ASCEND kan de opgeslagen koppeling niet lezen.' };
  }

  const items = { ...state.items };
  const counts = { created: 0, updated: 0, removed: 0 };
  try {
    const { desired, logged, removeDone } = await loadDesired(today);
    const plan = planWatchSync(desired, items, today, logged, { removeDone });
    const remember = (w: WatchWorkout, eventId: number | undefined, previous?: TrackedWorkout) => {
      items[w.plannedId] = { externalId: w.externalId, date: w.date, fingerprint: w.fingerprint, eventId: eventId ?? previous?.eventId, sentAt: now.toISOString() };
    };

    try {
      if (plan.create.length > 0) {
        const ids = await createWorkoutEvents(connection, plan.create, options);
        for (const w of plan.create) remember(w, ids.get(w.externalId));
        counts.created = plan.create.length;
      }
      for (const { workout, tracked } of plan.update) {
        remember(workout, await updateWorkoutEvent(connection, workout, tracked.eventId, options), tracked);
        counts.updated++;
      }
      if (plan.remove.length > 0) {
        await deleteWorkoutEvents(connection, plan.remove.map((r) => r.tracked), options);
        for (const r of plan.remove) delete items[r.plannedId];
        counts.removed = plan.remove.length;
      }
      for (const id of plan.forget) delete items[id];
    } catch (err) {
      await putState({ ...state, items, lastError: intervalsErrorMessage(err) });
      return { status: 'error', message: intervalsErrorMessage(err) };
    }
    // An empty run still counts as a run: the next one waits 15 minutes.
    await putState({ ...state, items, syncedAt: now.toISOString(), lastError: undefined });
    return { status: 'ok', ...counts };
  } catch {
    const message = 'ASCEND kan je planning niet lezen om trainingen te sturen.';
    try {
      await putState({ ...state, items, lastError: message });
    } catch {
      // Storage trouble on top of it: the message still reaches the caller.
    }
    return { status: 'error', message };
  }
}

// After a plan change you agreed to (a move, a skip, an undo) the agenda follows
// right away instead of at the next opening of the app: the 15-minute brake is
// skipped for this one run. Does nothing while the switch is off. Never throws.
export function syncWatchWorkoutsAfterPlanChange(options: WorkoutOptions = {}): Promise<WorkoutSyncResult> {
  return syncWatchWorkouts({ ...options, force: true });
}

export type TestSendResult =
  | { status: 'ok'; name: string; date: string }
  | { status: 'nothing' }
  | { status: 'not-connected' }
  | { status: 'error'; message: string };

// "Eén training testen": sends only the next training that would go to the
// watch, whatever the switch says, and remembers it like any other (so the
// switch later updates it instead of adding a second one).
export async function sendNextWatchWorkout(options: WorkoutOptions = {}): Promise<TestSendResult> {
  const today = options.today ?? todayISO();
  let connection: IntervalsConnection | null;
  try {
    connection = options.connection ?? (await getConnection());
  } catch {
    return { status: 'error', message: 'ASCEND kan de opgeslagen koppeling niet lezen.' };
  }
  if (!connection) return { status: 'not-connected' };
  try {
    const { desired } = await loadDesired(today);
    const next = desired[0];
    if (!next) return { status: 'nothing' };
    const state = await getWatchWorkoutState();
    const tracked = state.items[next.plannedId];
    const eventId = tracked
      ? await updateWorkoutEvent(connection, next, tracked.eventId, options)
      : (await createWorkoutEvents(connection, [next], options)).get(next.externalId);
    await putState({
      ...state,
      items: { ...state.items, [next.plannedId]: { externalId: next.externalId, date: next.date, fingerprint: next.fingerprint, eventId: eventId ?? tracked?.eventId, sentAt: (options.now ?? new Date()).toISOString() } },
    });
    return { status: 'ok', name: next.name, date: next.date };
  } catch (err) {
    return { status: 'error', message: intervalsErrorMessage(err) };
  }
}

// Takes ASCEND's own events out of the agenda again (the ones that are still
// to come; what is past stays next to its activity). Only what ASCEND has
// written down is removed.
export async function removeWatchWorkouts(options: WorkoutOptions = {}): Promise<{ status: 'ok'; removed: number } | { status: 'not-connected' } | { status: 'error'; message: string }> {
  const today = options.today ?? todayISO();
  try {
    const connection = options.connection ?? (await getConnection());
    if (!connection) return { status: 'not-connected' };
    const state = await getWatchWorkoutState();
    const entries = Object.entries(state.items);
    const upcoming = entries.filter(([, t]) => t.date >= today);
    try {
      await deleteWorkoutEvents(connection, upcoming.map(([, t]) => t), options);
    } catch (err) {
      return { status: 'error', message: intervalsErrorMessage(err) };
    }
    const items = Object.fromEntries(entries.filter(([, t]) => t.date < today));
    await putState({ ...state, items });
    return { status: 'ok', removed: upcoming.length };
  } catch {
    return { status: 'error', message: 'ASCEND kan de opgeslagen koppeling niet lezen.' };
  }
}

// The switch. Turning it off also takes the coming trainings out of the
// agenda (best effort: when that fails, the switch is off anyway and the
// message says what is left). Turning it on does not send by itself; the
// caller runs a sync.
export async function setWatchWorkoutsEnabled(enabled: boolean, options: WorkoutOptions = {}): Promise<{ status: 'ok'; removed: number } | { status: 'error'; message: string }> {
  try {
    if (enabled) {
      await putState({ ...(await getWatchWorkoutState()), enabled: true, lastError: undefined });
      return { status: 'ok', removed: 0 };
    }
    await putState({ ...(await getWatchWorkoutState()), enabled: false });
    const removal = await removeWatchWorkouts(options);
    if (removal.status === 'ok') return { status: 'ok', removed: removal.removed };
    if (removal.status === 'not-connected') return { status: 'ok', removed: 0 };
    return { status: 'error', message: `${removal.message} De schakelaar staat uit, maar de al verstuurde trainingen staan nog in intervals.icu.` };
  } catch {
    return { status: 'error', message: 'ASCEND kan de instelling niet opslaan.' };
  }
}

// Unlinking: the key goes, so nothing can be sent or removed any more. The
// switch goes off; the list of what was sent stays, so linking again does not
// double anything (the same external ids are recognised).
export async function pauseWatchWorkouts(): Promise<void> {
  await putState({ ...(await getWatchWorkoutState()), enabled: false });
}

// "Alles verwijderen": the coming trainings leave the intervals.icu agenda
// first, while the connection and the list of what was sent still exist (the
// reset wipes both), so no orphans stay behind on the watch. Best effort: when
// that fails, or there is no connection, the reset goes ahead anyway.
export async function resetAllDataAndAgenda(options: WorkoutOptions = {}): Promise<void> {
  try {
    await removeWatchWorkouts(options);
  } catch {
    // Never in the way of deleting.
  }
  await resetToDemoData();
}

// How far ahead the clean-up looks in the agenda for events ASCEND once sent
// (a test, an earlier install): about four months.
export const CLEANUP_DAYS = 120;

export type CleanUpResult =
  | { status: 'ok'; removed: number; strays: number }
  | { status: 'not-connected' }
  | { status: 'error'; message: string };

// "Weghalen": takes every coming training ASCEND sent out of the intervals.icu
// agenda. That is what ASCEND has written down, plus what the agenda itself
// still holds with an external_id that starts with "ascend:" (from the test
// button or an earlier install that the books lost). Nothing else is ever
// asked for by id, so an event of your own stays. The agenda is read first:
// when that fails, nothing is deleted.
export async function cleanUpWatchWorkouts(options: WorkoutOptions = {}): Promise<CleanUpResult> {
  const today = options.today ?? todayISO();
  let connection: IntervalsConnection | null;
  let state: WatchWorkoutState;
  try {
    connection = options.connection ?? (await getConnection());
    if (!connection) return { status: 'not-connected' };
    state = await getWatchWorkoutState();
  } catch {
    return { status: 'error', message: 'ASCEND kan de opgeslagen koppeling niet lezen.' };
  }
  try {
    const found = await fetchAscendEvents(connection, { from: today, to: addDays(today, CLEANUP_DAYS) }, options);
    const entries = Object.entries(state.items);
    const upcoming = entries.filter(([, t]) => t.date >= today).map(([, t]) => t);
    const known = new Set(upcoming.map((t) => t.externalId));
    const strays: TrackedWorkout[] = found
      .filter((e) => !known.has(e.externalId))
      .map((e) => ({ externalId: e.externalId, date: e.date, fingerprint: '', eventId: e.id }));
    // Events the agenda knows by id: delete by that id, also for tracked ones whose id was lost.
    const byExternal = new Map(found.map((e) => [e.externalId, e.id]));
    const all = [...upcoming.map((t) => ({ ...t, eventId: t.eventId ?? byExternal.get(t.externalId) })), ...strays];
    await deleteWorkoutEvents(connection, all, options);
    await putState({ ...state, items: Object.fromEntries(entries.filter(([, t]) => t.date < today)) });
    return { status: 'ok', removed: all.length, strays: strays.length };
  } catch (err) {
    return { status: 'error', message: intervalsErrorMessage(err) };
  }
}

export type ResendResult =
  | { status: 'ok'; removed: number; sent: number }
  | { status: 'off' }
  | { status: 'not-connected' }
  | { status: 'error'; message: string };

// "Opnieuw versturen": clean up first (so nothing is doubled), then send the
// coming 7 days again, without the 15-minute brake.
export async function resendWatchWorkouts(options: WorkoutOptions = {}): Promise<ResendResult> {
  try {
    if (!(await getWatchWorkoutState()).enabled) return { status: 'off' };
  } catch {
    return { status: 'error', message: 'ASCEND kan de opgeslagen koppeling niet lezen.' };
  }
  const cleaned = await cleanUpWatchWorkouts(options);
  if (cleaned.status !== 'ok') return cleaned;
  const sent = await syncWatchWorkouts({ ...options, force: true });
  if (sent.status === 'ok') return { status: 'ok', removed: cleaned.removed, sent: sent.created + sent.updated };
  if (sent.status === 'error') return { status: 'error', message: sent.message };
  if (sent.status === 'off') return { status: 'off' };
  if (sent.status === 'not-connected') return { status: 'not-connected' };
  return { status: 'error', message: 'Versturen is niet gelukt.' };
}

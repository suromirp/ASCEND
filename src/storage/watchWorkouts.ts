// ASCEND — local state of "Trainingen naar je horloge sturen".
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

import { MetaRepo, PlannedSessionsRepo, ProgramsRepo, SessionLogsRepo, SessionTemplatesRepo } from './database';
import { getConnection, isFetchDue, MIN_FETCH_INTERVAL_MINUTES } from './externalActivities';
import {
  createWorkoutEvents,
  deleteWorkoutEvents,
  intervalsErrorMessage,
  updateWorkoutEvent,
  type FetchOptions,
  type IntervalsConnection,
} from '../integrations/intervalsIcu';
import { planWatchSync, selectWatchWorkouts, type TrackedWorkout, type WatchWorkout } from '../engine/watchWorkout';
import { racePaces } from '../engine/racePaces';
import { testResults } from '../engine/racePrediction';
import { todayISO } from '../utils/dates';

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

async function putState(state: WatchWorkoutState): Promise<void> {
  await MetaRepo.set(STATE_KEY, state);
}

export interface WorkoutOptions extends FetchOptions {
  connection?: IntervalsConnection;
  now?: Date;
  today?: string;
}

// What should be on the watch right now, from the stored plan, and which of
// the planned sessions are done.
async function loadDesired(today: string): Promise<{ desired: WatchWorkout[]; logged: Set<string> }> {
  const [programs, templates, sessions, logs] = await Promise.all([
    ProgramsRepo.getAll(),
    SessionTemplatesRepo.getAll(),
    PlannedSessionsRepo.getAll(),
    SessionLogsRepo.getAll(),
  ]);
  const desired = selectWatchWorkouts({ sessions, logs, templates, program: programs[0], paces: racePaces(testResults(logs)), today });
  const logged = new Set(logs.map((l) => l.plannedSessionId).filter((id): id is string => !!id));
  return { desired, logged };
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
    const { desired, logged } = await loadDesired(today);
    const plan = planWatchSync(desired, items, today, logged);
    const remember = (w: WatchWorkout, eventId: number | undefined, previous?: TrackedWorkout) => {
      items[w.plannedId] = { externalId: w.externalId, date: w.date, fingerprint: w.fingerprint, eventId: eventId ?? previous?.eventId };
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
      items: { ...state.items, [next.plannedId]: { externalId: next.externalId, date: next.date, fingerprint: next.fingerprint, eventId: eventId ?? tracked?.eventId } },
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

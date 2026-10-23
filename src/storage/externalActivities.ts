// ASCEND — local state of the watch connection (intervals.icu).
//
// Two small records, each under its own meta key, on this device only:
// - the connection (athlete id and API key),
// - the activities of the last fetch (so the Today card survives a restart),
//   the ones the user said "Niet opslaan" to, the switch "Vanzelf afvinken"
//   and the note of every training ASCEND ticked off by itself
//   (engine/autoTick.ts),
// - for "Garmin is leidend": the older activities fetched once to match typed-in
//   trainings with (engine/watchAlign.ts), the switch, and what the owner
//   refused or took back.
//
// None of it is part of the export. The connection is a secret, and the rest
// is a cache of someone else's data plus a reminder of a choice;
// buildBackupEnvelope (storage/backup.ts) names what it exports one by one
// and never reads these keys (tested in externalActivities.test.ts).

import { MetaRepo, SessionLogsRepo } from './database';
import type { ExternalActivity } from '../engine/activityImport';
import { upsertAutoLogged, withAutoStatus, type AutoLogged, type AutoLoggedStatus } from '../engine/autoTick';
import { clearWellness, pruneWellness, syncWellness } from './wellness';
import { filterActivityDetails, nothingWanted, normalizeWatchUse, wellnessWanted, type WatchUse } from '../engine/watchUse';
import { historyStart } from '../engine/watchAlign';
import { addDays, todayISO } from '../utils/dates';
import {
  createIntervalsIcuAdapter,
  intervalsErrorMessage,
  normalizeConnection,
  type FetchOptions,
  type IntervalsConnection,
} from '../integrations/intervalsIcu';

const CONNECTION_KEY = 'intervalsIcuConnection';
const STATE_KEY = 'watchActivities';

// How far back one fetch looks, and how often at most it asks.
export const FETCH_DAYS = 7;
export const MIN_FETCH_INTERVAL_MINUTES = 15;

export interface WatchActivityState {
  // The last successful fetch (ISO timestamp), the throttle's reference.
  fetchedAt?: string;
  // What the last attempt said when it failed; cleared by the next success.
  lastError?: string;
  activities: ExternalActivity[];
  // externalIds the user chose not to save: never asked again.
  dismissed: string[];
  // "Vanzelf afvinken": on unless the user switched it off.
  autoTick: boolean;
  // Trainings ASCEND ticked off by itself, and whether "Hoe ging het?" is
  // still open (engine/autoTick.ts).
  autoLogged: AutoLogged[];
  // Which kinds of watch data ASCEND uses (engine/watchUse.ts): the trainings,
  // sleep, resting heart rate and HRV. All on until the user switches one off.
  use: WatchUse;
  // "Garmin is leidend": the activities of the past, fetched once (and on
  // request) only to match typed-in trainings with. They are never offered as
  // new trainings. `historyFrom` is the first day the fetch looked at.
  history: ExternalActivity[];
  historyFetchedAt?: string;
  historyFrom?: string;
  // The switch: a typed-in training of the last 7 days takes over the watch's
  // numbers by itself, once the first proposal has been answered. On unless
  // the user switched it off.
  garminLeads: boolean;
  // The first proposal ("N trainingen gelijktrekken") has been answered, with
  // Akkoord or Liever niet, or there was nothing to propose. Until then nothing
  // happens by itself.
  alignResolved: boolean;
  // externalIds the user refused or took back: not proposed again, not done
  // by itself.
  alignDeclined: string[];
}

// --- the connection ---------------------------------------------------------------

export async function getConnection(): Promise<IntervalsConnection | null> {
  return (await MetaRepo.get<IntervalsConnection | null>(CONNECTION_KEY)) ?? null;
}

export async function saveConnection(raw: { athleteId: string; apiKey: string }): Promise<IntervalsConnection> {
  const connection = normalizeConnection(raw);
  await MetaRepo.set(CONNECTION_KEY, connection);
  return connection;
}

// Unlink: the key goes, and so does everything fetched with it (activities,
// sleep and heart rate). What the user said no to, the switch and the notes of
// what was ticked off stay remembered, in case the same watch is linked again.
export async function clearConnection(): Promise<void> {
  const state = await getWatchState();
  await MetaRepo.set(CONNECTION_KEY, null);
  await MetaRepo.set(STATE_KEY, {
    ...state,
    activities: [],
    history: [],
    historyFetchedAt: undefined,
    historyFrom: undefined,
    alignResolved: false,
    fetchedAt: undefined,
    lastError: undefined,
  } satisfies WatchActivityState);
  await clearWellness();
  notifyWatchChange();
}

// "••••k3f9": enough to recognise the key, not enough to use it.
export function maskKey(apiKey: string): string {
  return apiKey.length <= 4 ? '••••' : `••••${apiKey.slice(-4)}`;
}

// --- the state --------------------------------------------------------------------

export async function getWatchState(): Promise<WatchActivityState> {
  const stored = await MetaRepo.get<Partial<WatchActivityState>>(STATE_KEY);
  return {
    fetchedAt: stored?.fetchedAt,
    lastError: stored?.lastError,
    activities: Array.isArray(stored?.activities) ? stored.activities : [],
    dismissed: Array.isArray(stored?.dismissed) ? stored.dismissed : [],
    autoTick: stored?.autoTick !== false,
    autoLogged: Array.isArray(stored?.autoLogged) ? stored.autoLogged : [],
    use: normalizeWatchUse(stored?.use),
    history: Array.isArray(stored?.history) ? stored.history : [],
    historyFetchedAt: stored?.historyFetchedAt,
    historyFrom: stored?.historyFrom,
    garminLeads: stored?.garminLeads !== false,
    alignResolved: stored?.alignResolved === true,
    alignDeclined: Array.isArray(stored?.alignDeclined) ? stored.alignDeclined : [],
  };
}

async function putWatchState(state: WatchActivityState): Promise<void> {
  await MetaRepo.set(STATE_KEY, state);
  notifyWatchChange();
}

// "Niet opslaan": remembered, so it is not asked again.
export async function dismissActivity(externalId: string): Promise<void> {
  const state = await getWatchState();
  if (state.dismissed.includes(externalId)) return;
  await putWatchState({ ...state, dismissed: [...state.dismissed, externalId] });
}

// The switch on the link screen.
export async function setAutoTick(on: boolean): Promise<void> {
  const state = await getWatchState();
  await putWatchState({ ...state, autoTick: on });
}

// The switch "Garmin is leidend".
export async function setGarminLeads(on: boolean): Promise<void> {
  const state = await getWatchState();
  await putWatchState({ ...state, garminLeads: on });
}

// "Liever niet" on the proposal, or a training put back: these activities are
// not matched again. Either answers the first proposal.
export async function declineAlignment(externalIds: string[]): Promise<void> {
  const state = await getWatchState();
  const declined = [...new Set([...state.alignDeclined, ...externalIds])];
  await putWatchState({ ...state, alignDeclined: declined, alignResolved: true });
}

// "Akkoord" on the first proposal, or nothing was left to propose.
export async function resolveAlignment(): Promise<void> {
  const state = await getWatchState();
  if (state.alignResolved) return;
  await putWatchState({ ...state, alignResolved: true });
}

// Show what was refused or put back again as a proposal.
export async function forgetDeclinedAlignments(): Promise<void> {
  const state = await getWatchState();
  await putWatchState({ ...state, alignDeclined: [] });
}

// A switch of the card "Wat ASCEND van je horloge gebruikt". What goes off
// leaves the phone at once (the fetched trainings, or that kind of wellness
// value), so nothing keeps using it. What comes on is fetched by the next
// sync; the caller asks for one right away.
export async function setWatchUse(patch: Partial<WatchUse>): Promise<WatchUse> {
  const state = await getWatchState();
  const use = normalizeWatchUse({ ...state.use, ...patch });
  await putWatchState({
    ...state,
    use,
    activities: use.activities ? filterActivityDetails(state.activities, use) : [],
    history: use.activities ? filterActivityDetails(state.history, use) : [],
    historyFetchedAt: use.activities ? state.historyFetchedAt : undefined,
    fetchedAt: use.activities && !state.use.activities ? undefined : state.fetchedAt,
  });
  await pruneWellness(use);
  notifyWatchChange();
  return use;
}

// ASCEND ticked a training off by itself: the note of it, with the log it made
// (found by the activity's id). Without a log there is no note, and so no
// question; a failed tick-off simply stays an ordinary proposal.
export async function recordAutoTicked(externalId: string, now: Date = new Date()): Promise<boolean> {
  const log = (await SessionLogsRepo.getAll()).find((l) => l.externalId === externalId);
  if (!log) return false;
  const state = await getWatchState();
  await putWatchState({ ...state, autoLogged: upsertAutoLogged(state.autoLogged, { externalId, logId: log.id, at: now.toISOString(), status: 'asking' }) });
  return true;
}

export async function setAutoLoggedStatus(externalId: string, status: AutoLoggedStatus): Promise<void> {
  const state = await getWatchState();
  await putWatchState({ ...state, autoLogged: withAutoStatus(state.autoLogged, externalId, status) });
}

// Simple change signal for the Today card: the fetch runs as a background job
// at boot and the card has to notice when it has finished.
const listeners = new Set<() => void>();
export function onWatchChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function notifyWatchChange(): void {
  listeners.forEach((l) => l());
}

// --- fetching ---------------------------------------------------------------------

// At most once per 15 minutes since the last success.
export function isFetchDue(fetchedAt: string | undefined, now: Date, minMinutes = MIN_FETCH_INTERVAL_MINUTES): boolean {
  if (!fetchedAt) return true;
  const last = Date.parse(fetchedAt);
  if (!Number.isFinite(last)) return true;
  return now.getTime() - last >= minMinutes * 60_000;
}

export type SyncResult =
  | { status: 'not-connected' }
  | { status: 'too-soon' }
  // Every kind of watch data is switched off: nothing to fetch.
  | { status: 'off' }
  | { status: 'ok'; count: number; wellness?: { days: number; today: boolean } }
  | { status: 'error'; message: string };

export interface SyncOptions extends FetchOptions {
  // Skip the 15-minute pause (the user pressed "Verbinding testen").
  force?: boolean;
  // Use these values instead of the stored connection (testing before saving).
  connection?: IntervalsConnection;
  now?: Date;
}

export type HistoryResult =
  | { status: 'not-connected' | 'off' | 'nothing' | 'done' }
  | { status: 'ok'; count: number; from: string }
  | { status: 'error'; message: string };

// The one-time fetch of the past, to match typed-in trainings with what the
// watch measured (engine/watchAlign.ts): from the oldest training typed in by
// hand, at most 120 days back, next to the usual 7 days. Once; `force` (the
// user asks) does it again. Nothing typed in, nothing to fetch. The result is
// kept apart from the recent activities, so an old unlogged activity never
// turns into a proposal. Never throws.
export async function syncWatchHistory(options: SyncOptions = {}): Promise<HistoryResult> {
  const now = options.now ?? new Date();
  try {
    const connection = options.connection ?? (await getConnection());
    if (!connection) return { status: 'not-connected' };
    const state = await getWatchState();
    if (!state.use.activities) return { status: 'off' };
    if (state.historyFetchedAt && !options.force) return { status: 'done' };
    const today = todayISO();
    const from = historyStart(await SessionLogsRepo.getAll(), today);
    if (!from) return { status: 'nothing' };
    const adapter = createIntervalsIcuAdapter(connection, { fetchImpl: options.fetchImpl });
    const history = filterActivityDetails(await adapter.fetchExternalActivities!({ from, to: addDays(today, 1) }), state.use);
    await putWatchState({ ...(await getWatchState()), history, historyFetchedAt: now.toISOString(), historyFrom: from });
    return { status: 'ok', count: history.length, from };
  } catch (err) {
    return { status: 'error', message: intervalsErrorMessage(err) };
  }
}

// Reads the last 7 days from intervals.icu and keeps them for the Today card,
// and the last four weeks of sleep and heart rate (storage/wellness.ts).
// Never throws: a failure becomes a message and the app carries on.
// One round at a time: a second call while one is running (the boot step, the
// morning refetch, a button) gets the same round instead of a parallel one.
let inflight: Promise<SyncResult> | undefined;
// When a round last started, also when it failed: a failed round does not move
// `fetchedAt`, and the morning refetch must still wait 15 minutes after it.
let lastAttemptAt: string | undefined;
export const lastWatchAttemptAt = (): string | undefined => lastAttemptAt;

export function syncWatchActivities(options: SyncOptions = {}): Promise<SyncResult> {
  if (inflight) return inflight;
  lastAttemptAt = (options.now ?? new Date()).toISOString();
  inflight = runWatchSync(options).finally(() => {
    inflight = undefined;
  });
  return inflight;
}

async function runWatchSync(options: SyncOptions = {}): Promise<SyncResult> {
  const now = options.now ?? new Date();
  let connection: IntervalsConnection | null;
  let use: WatchUse;
  try {
    connection = options.connection ?? (await getConnection());
    if (!connection) return { status: 'not-connected' };
    const state = await getWatchState();
    use = state.use;
    // Everything switched off: nothing is fetched in the background. Only
    // "Verbinding testen" still asks one small question, to check the key.
    if (nothingWanted(use) && !options.force) return { status: 'off' };
    if (!options.force && !isFetchDue(state.fetchedAt, now)) return { status: 'too-soon' };
  } catch {
    return { status: 'error', message: 'ASCEND kan de opgeslagen koppeling niet lezen.' };
  }

  try {
    const today = todayISO();
    const adapter = createIntervalsIcuAdapter(connection, { fetchImpl: options.fetchImpl });
    let activities: ExternalActivity[] = [];
    if (use.activities) {
      activities = filterActivityDetails(await adapter.fetchExternalActivities!({ from: addDays(today, -FETCH_DAYS), to: addDays(today, 1) }), use);
    } else if (options.force) {
      // Trainings are switched off: this only checks that the key works, and
      // what comes back is thrown away.
      await adapter.fetchExternalActivities!({ from: today, to: addDays(today, 1) });
    }
    const state = await getWatchState();
    await putWatchState({ ...state, activities, fetchedAt: now.toISOString(), lastError: undefined });
    // Last night's sleep, resting heart rate and HRV for the morning check-in,
    // as far as they are switched on. They never decide whether this fetch
    // counts as a success.
    const wellness = wellnessWanted(use) ? await syncWellness(connection, { fetchImpl: options.fetchImpl, today, use }) : undefined;
    // The past, once, for "Garmin is leidend". A failure here is no failure of
    // this fetch: it is tried again at the next one.
    if (use.activities) await syncWatchHistory({ connection, fetchImpl: options.fetchImpl, now });
    if (wellness?.status === 'ok') notifyWatchChange();
    return { status: 'ok', count: activities.length, wellness: wellness?.status === 'ok' ? { days: wellness.days, today: wellness.today } : undefined };
  } catch (err) {
    const message = intervalsErrorMessage(err);
    try {
      const state = await getWatchState();
      await putWatchState({ ...state, lastError: message });
    } catch {
      // Storage trouble on top of a fetch problem: the message still reaches the caller.
    }
    return { status: 'error', message };
  }
}

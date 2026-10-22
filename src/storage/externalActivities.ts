// ASCEND — local state of the watch connection (intervals.icu).
//
// Two small records, each under its own meta key, on this device only:
// - the connection (athlete id and API key),
// - the activities of the last fetch (so the Today card survives a restart)
//   and the ones the user said "Niet opslaan" to.
//
// None of it is part of the export. The connection is a secret, and the rest
// is a cache of someone else's data plus a reminder of a choice;
// buildBackupEnvelope (storage/backup.ts) names what it exports one by one
// and never reads these keys (tested in externalActivities.test.ts).

import { MetaRepo } from './database';
import type { ExternalActivity } from '../engine/activityImport';
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

// Unlink: the key goes, and so does everything fetched with it. What the user
// said no to stays remembered, in case the same watch is linked again.
export async function clearConnection(): Promise<void> {
  const state = await getWatchState();
  await MetaRepo.set(CONNECTION_KEY, null);
  await MetaRepo.set(STATE_KEY, { activities: [], dismissed: state.dismissed } satisfies WatchActivityState);
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
  | { status: 'ok'; count: number }
  | { status: 'error'; message: string };

export interface SyncOptions extends FetchOptions {
  // Skip the 15-minute pause (the user pressed "Verbinding testen").
  force?: boolean;
  // Use these values instead of the stored connection (testing before saving).
  connection?: IntervalsConnection;
  now?: Date;
}

// Reads the last 7 days from intervals.icu and keeps them for the Today card.
// Never throws: a failure becomes a message and the app carries on.
export async function syncWatchActivities(options: SyncOptions = {}): Promise<SyncResult> {
  const now = options.now ?? new Date();
  let connection: IntervalsConnection | null;
  try {
    connection = options.connection ?? (await getConnection());
    if (!connection) return { status: 'not-connected' };
    const state = await getWatchState();
    if (!options.force && !isFetchDue(state.fetchedAt, now)) return { status: 'too-soon' };
  } catch {
    return { status: 'error', message: 'ASCEND kan de opgeslagen koppeling niet lezen.' };
  }

  try {
    const today = todayISO();
    const adapter = createIntervalsIcuAdapter(connection, { fetchImpl: options.fetchImpl });
    const activities = await adapter.fetchExternalActivities!({ from: addDays(today, -FETCH_DAYS), to: addDays(today, 1) });
    const state = await getWatchState();
    await putWatchState({ ...state, activities, fetchedAt: now.toISOString(), lastError: undefined });
    return { status: 'ok', count: activities.length };
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

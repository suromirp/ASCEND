// ASCEND: the compact profile of a stored run or tocht.
//
// When a run or tocht from the watch is stored, one request fetches its series
// (the adapter, integrations/intervalsIcu.ts), the weather of that day is looked
// up for a place rounded to two decimals, engine/activityDetail.ts makes the
// profile of 48 pieces, and the profile is put on the log as `detail`. The
// series themselves are not kept, and the track is not kept at all.
//
// Only a log that has no profile yet gets one, and only that field is added:
// the log is not otherwise touched. The work never throws and never blocks the
// save; a failure leaves the log as it was, and the profile can be fetched
// another time (docs/beslissingen/2026-10-22-loopinzicht.md). One log at a time:
// background jobs run after each other.

import { getDB, SessionLogsRepo, SettingsRepo } from './database';
import type { ActivityDetail } from '../models/activityDetail';
import type { BestEffort, SessionLog } from '../models/training';
import { bestEffortFromStream } from '../engine/bestEffort';
import { TEST_TEMPLATE_ID } from '../engine/raceBlock';
import { TEST_DISTANCE_KM } from '../engine/racePrediction';
import { getConnection, getWatchState } from './externalActivities';
import type { ExternalActivity } from '../engine/activityImport';
import { buildActivityDetail } from '../engine/activityDetail';
import { resolveRunInsight } from '../engine/runInsightSettings';
import { detailsWanted } from '../engine/watchUse';
import { createIntervalsIcuAdapter, streamsToRequest } from '../integrations/intervalsIcu';
import { fetchPastConditions, type FetchOptions } from '../integrations/openMeteo';
import type { DetailConditions } from '../models/activityDetail';
import { daysBetween, todayISO } from '../utils/dates';

export type AttachResult = 'attached' | 'skipped' | 'failed';

export interface AttachOptions extends FetchOptions {
  // The weather lookup may use its own fetch in a test.
  weatherFetchImpl?: typeof fetch;
  today?: string;
}

// Which activities have a profile at all: runs and tochten that say they have
// series ASCEND can use, and that are not strength or a ride.
export function wantsDetail(activity: Pick<ExternalActivity, 'kind' | 'streamsAvailable'>): boolean {
  return (activity.kind === 'run' || activity.kind === 'hike') && streamsToRequest(activity.streamsAvailable).length > 0;
}

let chain: Promise<unknown> = Promise.resolve();

export function attachActivityDetail(activity: ExternalActivity, options: AttachOptions = {}): Promise<AttachResult> {
  const job = chain.then(() => attachNow(activity, options));
  chain = job.catch(() => undefined);
  return job.catch(() => 'failed' as const);
}

async function attachNow(activity: ExternalActivity, options: AttachOptions): Promise<AttachResult> {
  if (!wantsDetail(activity)) return 'skipped';
  const state = await getWatchState();
  if (!detailsWanted(state.use)) return 'skipped';
  const log = (await SessionLogsRepo.getAll()).find((l) => l.externalId === activity.externalId);
  // A log that was cut has the profile of what is kept (or none): never of the whole.
  if (!log || log.trim) return 'skipped';
  // A test run also wants its best 5 km (engine/bestEffort.ts), once.
  const wantsEffort = log.templateId === TEST_TEMPLATE_ID && !log.bestEffort;
  if (log.detail && !wantsEffort) return 'skipped';
  const connection = await getConnection();
  if (!connection) return 'skipped';

  try {
    const adapter = createIntervalsIcuAdapter(connection, { fetchImpl: options.fetchImpl });
    const streams = await adapter.fetchActivityStreams!(activity);
    if (!streams) return 'skipped';

    const logKm = (log.cardioData ?? log.outdoorData)?.distanceKm;
    const bestEffort = wantsEffort ? bestEffortFromStream(streams, TEST_DISTANCE_KM, logKm) : undefined;
    if (log.detail) return bestEffort && (await attachDerivedToStoredLog(log.id, { bestEffort })) ? 'attached' : 'skipped';

    const settings = await SettingsRepo.get();
    let conditions: DetailConditions | undefined;
    if (resolveRunInsight(settings.runInsight).weather && !activity.treadmill) {
      const place = streams.start ?? (settings.homeLocation ? { lat: settings.homeLocation.lat, lon: settings.homeLocation.lon } : undefined);
      if (place) {
        try {
          conditions = await fetchPastConditions(
            { name: '', lat: place.lat, lon: place.lon },
            activity.start,
            activity.durationSec,
            daysBetween(activity.start.slice(0, 10), options.today ?? todayISO()),
            { fetchImpl: options.weatherFetchImpl ?? options.fetchImpl },
          );
        } catch {
          // No weather is no reason to lose the profile: it compares without it.
        }
      }
    }

    const detail = buildActivityDetail(streams, { source: activity.source, treadmill: activity.treadmill, reportedGainM: activity.elevationGainM, conditions });
    if (!detail && !bestEffort) return 'skipped';
    // Read and write in one transaction: the log may have changed while the
    // series were on their way (your feeling, a putting back), and this only
    // adds `detail` and `bestEffort`, never writes back an older copy of the rest.
    return (await attachDerivedToStoredLog(log.id, { detail, bestEffort })) ? 'attached' : 'skipped';
  } catch {
    return 'failed';
  }
}

// Adds what is derived from the series (the profile, the best effort of a test) to the log as
// it is stored now, in one readwrite transaction, and only what the log does not have yet.
// Nothing measured is touched. Returns whether anything was added.
export async function attachDerivedToStoredLog(logId: string, derived: { detail?: ActivityDetail; bestEffort?: BestEffort }): Promise<boolean> {
  const db = await getDB();
  const tx = db.transaction('sessionLogs', 'readwrite');
  const current = await tx.store.get(logId);
  if (!current || current.trim) {
    await tx.done;
    return false;
  }
  const add: Partial<SessionLog> = {};
  if (derived.detail && !current.detail) add.detail = derived.detail;
  if (derived.bestEffort && !current.bestEffort) add.bestEffort = derived.bestEffort;
  if (Object.keys(add).length === 0) {
    await tx.done;
    return false;
  }
  await tx.store.put({ ...current, ...add });
  await tx.done;
  return true;
}

// A test run that was linked before the best 5 km existed: look for its activity in what
// the watch last gave, and read the series once. Never throws.
export async function ensureBestEffort(logId: string, options: AttachOptions = {}): Promise<AttachResult> {
  try {
    const log = (await SessionLogsRepo.getAll()).find((l) => l.id === logId);
    if (!log || !log.externalId || log.bestEffort || log.trim || log.templateId !== TEST_TEMPLATE_ID) return 'skipped';
    const activity = (await getWatchState()).activities.find((a) => a.externalId === log.externalId);
    return activity ? await attachActivityDetail(activity, options) : 'skipped';
  } catch {
    return 'failed';
  }
}

// Adds the profile to the log as it is stored now, in one readwrite
// transaction, and only when it has none yet. Returns whether it was added.
export async function attachDetailToStoredLog(logId: string, detail: ActivityDetail): Promise<boolean> {
  const db = await getDB();
  const tx = db.transaction('sessionLogs', 'readwrite');
  const current = await tx.store.get(logId);
  if (!current || current.detail || current.trim) {
    await tx.done;
    return false;
  }
  await tx.store.put({ ...current, detail });
  await tx.done;
  return true;
}

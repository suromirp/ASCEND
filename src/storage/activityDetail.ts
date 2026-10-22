// ASCEND — the compact profile of a stored run or tocht.
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

import { SessionLogsRepo, SettingsRepo } from './database';
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
  if (!log || log.detail) return 'skipped';
  const connection = await getConnection();
  if (!connection) return 'skipped';

  try {
    const adapter = createIntervalsIcuAdapter(connection, { fetchImpl: options.fetchImpl });
    const streams = await adapter.fetchActivityStreams!(activity);
    if (!streams) return 'skipped';

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
    if (!detail) return 'skipped';
    // Read again: the log may have changed while the series were on their way.
    const fresh = (await SessionLogsRepo.getAll()).find((l) => l.id === log.id);
    if (!fresh || fresh.detail) return 'skipped';
    await SessionLogsRepo.put({ ...fresh, detail });
    return 'attached';
  } catch {
    return 'failed';
  }
}

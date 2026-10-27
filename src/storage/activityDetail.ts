// ASCEND: the compact profile of a stored run or tocht, and its full series.
//
// When a run or tocht from the watch is stored, one request fetches its series
// (the adapter, integrations/intervalsIcu.ts), the weather of that day is looked
// up for a place rounded to two decimals, engine/activityDetail.ts makes the
// profile of 48 pieces, and the profile is put on the log as `detail`. The same request
// gives the full series, which are packed and kept in their own store (`activityStreams`,
// engine/streamPack.ts) unless "Volledige reeks bewaren" is off, and the kilometres and
// laps (`runDetail`, engine/runDetail.ts) go on the log. The track is not kept at all: it
// is used for the heading per kilometre (the wind) and let go.
//
// Only a log that lacks something gets it, and only that field is added: the log is not
// otherwise touched. The work never throws and never blocks the save; a failure leaves the
// log as it was, and it can be fetched another time
// (docs/beslissingen/2026-10-22-loopinzicht.md,
// docs/beslissingen/2026-10-27-run-in-detail-gegevens.md). One log at a time: background
// jobs run after each other.

import { ActivityStreamsRepo, getDB, SessionLogsRepo, SettingsRepo } from './database';
import type { ActivityDetail } from '../models/activityDetail';
import type { BestEffort, SessionLog } from '../models/training';
import type { RunDetail } from '../models/runDetail';
import type { StoredLap } from '../models/activityStreams';
import { bestEffortFromStream, effortFingerprint, isStaleEffort, isUsableBestEffort } from '../engine/bestEffort';
import { TEST_DISTANCE_KM, testTotals } from '../engine/racePrediction';
import { mayAcceptAtOnce, wantsBestEffort } from '../engine/testJudgment';
import { getConnection, getWatchState } from './externalActivities';
import type { ExternalActivity, ExternalActivityKind } from '../engine/activityImport';
import { buildActivityDetail } from '../engine/activityDetail';
import { resolveRunInsight } from '../engine/runInsightSettings';
import { detailsWanted } from '../engine/watchUse';
import { createIntervalsIcuAdapter, streamsToRequest, WANTED_STREAMS } from '../integrations/intervalsIcu';
import { fetchPastWeather, type FetchOptions, type HourlyWindPoint } from '../integrations/openMeteo';
import { buildRunDetail, isStaleRunDetail, isUsableRunDetail, runDetailFingerprint, windAgainstFn, windFromStored, windPerKm } from '../engine/runDetail';
import { packStreams, unpackStreams } from '../engine/streamPack';
import { isWalkOrTripLog, logSport } from '../engine/sports';
import type { DetailConditions } from '../models/activityDetail';
import { daysBetween, todayISO } from '../utils/dates';

export type AttachResult = 'attached' | 'skipped' | 'failed';

export interface AttachOptions extends FetchOptions {
  // The weather lookup may use its own fetch in a test.
  weatherFetchImpl?: typeof fetch;
  today?: string;
  // The test has just come in (linked right after it was saved): its best stretch may count at
  // once. Left out when an older test is opened later: then it counts at once only when it
  // changes no pace, and otherwise waits for your Akkoord in the log sheet.
  fresh?: boolean;
  // The start of the activity is not known exactly (rebuilt from the log): no weather lookup.
  skipWeather?: boolean;
  // How long ensureRunDetail waits before it says so (a test makes it short).
  timeoutMs?: number;
}

// A series that could not be fetched this session (no connection, no stream): not asked again
// until the app is opened anew. A series that was fetched but gave no best stretch is kept on
// the log instead (SessionLog.bestEffortTried), and one that gave no kilometres on
// SessionLog.runDetailTried.
const failedThisSession = new Set<string>();

// Forgets which logs failed this session (a new session, or a test).
export function forgetFailures(): void {
  failedThisSession.clear();
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

// What a log still lacks of what the series can give.
export interface DetailNeeds {
  detail: boolean;
  effort: boolean;
  runDetail: boolean;
  streams: boolean;
}

export function needsOf(log: SessionLog, opts: { keepStreams: boolean; streamsFresh: boolean; retry: boolean }): DetailNeeds {
  const { km, minutes } = testTotals(log);
  const rd = log.runDetail;
  // Series that gave nothing for these totals (runDetailTried) are not fetched again for the
  // profile either; a correction at the source changes the totals and tries once more.
  const gaveNothing = log.runDetailTried === runDetailFingerprint(km, minutes);
  return {
    detail: !log.detail && !gaveNothing,
    effort: wantsBestEffort(log) && opts.retry,
    runDetail: opts.retry && (!isUsableRunDetail(rd) || isStaleRunDetail(rd, km, minutes)) && !gaveNothing,
    // A set that gave nothing (or could not be packed) for these totals is not asked for again.
    streams: opts.retry && opts.keepStreams && !opts.streamsFresh && !gaveNothing,
  };
}

const anyNeed = (n: DetailNeeds) => n.detail || n.effort || n.runDetail || n.streams;

async function streamsAreFresh(log: SessionLog): Promise<boolean> {
  const stored = await ActivityStreamsRepo.get(log.id);
  if (!stored) return false;
  const { km, minutes } = testTotals(log);
  return !isStaleRunDetail(stored, km, minutes);
}

async function attachNow(activity: ExternalActivity, options: AttachOptions): Promise<AttachResult> {
  if (!wantsDetail(activity)) return 'skipped';
  const state = await getWatchState();
  if (!detailsWanted(state.use)) return 'skipped';
  const log = (await SessionLogsRepo.getAll()).find((l) => l.externalId === activity.externalId);
  // A log that was cut has the profile of what is kept (or none): never of the whole.
  if (!log || log.trim) return 'skipped';
  const settings = await SettingsRepo.get();
  const needs = needsOf(log, { keepStreams: settings.keepStreams !== false, streamsFresh: await streamsAreFresh(log), retry: !failedThisSession.has(log.id) });
  if (!anyNeed(needs)) return 'skipped';
  const connection = await getConnection();
  if (!connection) return 'skipped';

  try {
    const { km: logKm, minutes: logMinutes } = testTotals(log);
    // The kilometres can be worked out again from a set that is kept, without asking the source.
    const stored = needs.runDetail && !needs.detail && !needs.effort && !needs.streams ? await ActivityStreamsRepo.get(log.id) : undefined;
    const storedSet = stored && !isStaleRunDetail(stored, logKm, logMinutes) ? unpackStreams(stored) : undefined;

    const adapter = createIntervalsIcuAdapter(connection, { fetchImpl: options.fetchImpl });
    const streams = storedSet ?? (await adapter.fetchActivityStreams!(activity));
    if (!streams) {
      // The source has no series for it: written on the log for these totals, so it is not
      // asked again at every opening (a correction at the source changes the totals). Not a
      // failure: the fingerprint does the work, so a second opening says "no-series".
      await attachDerivedToStoredLog(log.id, {
        runTried: runDetailFingerprint(logKm, logMinutes),
        tried: needs.effort ? effortFingerprint(logKm, logMinutes) : undefined,
      });
      return 'skipped';
    }
    // The laps come in a request of their own; without them the kilometres still work.
    let laps: StoredLap[] = stored?.laps ?? [];
    if (!storedSet && (needs.runDetail || needs.streams)) {
      try {
        laps = (await adapter.fetchActivityLaps?.(activity, streams.timeSec)) ?? [];
      } catch {
        laps = [];
      }
    }

    let bestEffort: BestEffort | undefined;
    let tried: string | undefined;
    if (needs.effort) {
      bestEffort = bestEffortFromStream(streams, TEST_DISTANCE_KM, logKm, logMinutes);
      if (bestEffort) {
        const logs = (await SessionLogsRepo.getAll()).map((l) => (l.id === log.id ? { ...l, bestEffort } : l));
        // A new test counts at once; an older one only when no pace changes, else it waits for Akkoord.
        if (mayAcceptAtOnce(logs, settings, log.id, options.fresh === true)) bestEffort = { ...bestEffort, accepted: true };
      } else {
        tried = effortFingerprint(logKm, logMinutes);
      }
    }

    // The weather of the day: the conditions for the profile, the wind of each hour for the
    // wind against you. One request; no weather is no reason to lose the rest.
    let conditions: DetailConditions | undefined;
    let hourlyWind: HourlyWindPoint[] = [];
    if ((needs.detail || (needs.runDetail && !storedSet)) && resolveRunInsight(settings.runInsight).weather && !activity.treadmill && !options.skipWeather) {
      const place = streams.start ?? (settings.homeLocation ? { lat: settings.homeLocation.lat, lon: settings.homeLocation.lon } : undefined);
      if (place) {
        try {
          const weather = await fetchPastWeather(
            { name: '', lat: place.lat, lon: place.lon },
            activity.start,
            activity.durationSec,
            daysBetween(activity.start.slice(0, 10), options.today ?? todayISO()),
            { fetchImpl: options.weatherFetchImpl ?? options.fetchImpl },
          );
          conditions = weather?.conditions;
          hourlyWind = weather?.wind ?? [];
        } catch {
          // No weather is no reason to lose the profile: it compares without it.
        }
      }
    }

    const detail = needs.detail ? buildActivityDetail(streams, { source: activity.source, treadmill: activity.treadmill, reportedGainM: activity.elevationGainM, conditions }) : undefined;

    // The kilometres. The wind per kilometre is worked out while the track is still in memory
    // and kept as numbers; the track itself goes with the StreamSet.
    let runDetail: RunDetail | undefined;
    let runTried: string | undefined;
    let perKm: (number | null)[] | undefined = stored?.headwindKmh;
    if (needs.runDetail) {
      const wind = storedSet ? windFromStored(stored?.headwindKmh) : windAgainstFn(streams, hourlyWind);
      if (!storedSet) perKm = windPerKm(streams, wind);
      runDetail = buildRunDetail(streams, {
        logKm,
        logMinutes,
        builtAt: new Date().toISOString(),
        laps,
        wind,
        bestKm: activity.kind === 'run' ? TEST_DISTANCE_KM : null,
      });
      if (!runDetail) runTried = runDetailFingerprint(logKm, logMinutes);
    }

    // The full series in their own store. Packed before the StreamSet is let go.
    let streamsKept = false;
    if (needs.streams && !storedSet) {
      const packed = packStreams(streams, {
        logId: log.id,
        externalId: activity.externalId,
        fetchedAt: new Date().toISOString(),
        wholeKm: logKm,
        wholeMinutes: logMinutes,
        headwindKmh: perKm,
        laps,
        unknownKinds: activity.otherStreams,
      });
      if (packed) {
        await ActivityStreamsRepo.put(packed);
        streamsKept = true;
      } else {
        // Series that cannot be packed: remembered for these totals, not tried at every opening.
        runTried = runDetailFingerprint(logKm, logMinutes);
      }
    }

    if (!detail && !bestEffort && !tried && !runDetail && !runTried) return streamsKept ? 'attached' : 'skipped';
    // Read and write in one transaction: the log may have changed while the
    // series were on their way (your feeling, a putting back), and this only
    // adds the derived fields, never writes back an older copy of the rest.
    const added = await attachDerivedToStoredLog(log.id, { detail, bestEffort, tried, runDetail, runTried });
    return added || streamsKept ? 'attached' : 'skipped';
  } catch {
    failedThisSession.add(log.id);
    return 'failed';
  }
}

// Adds what is derived from the series (the profile, the best effort of a test, the
// kilometres) to the log as it is stored now, in one readwrite transaction, and only what the
// log does not have yet. Nothing measured is touched. Returns whether anything was added.
export async function attachDerivedToStoredLog(
  logId: string,
  derived: { detail?: ActivityDetail; bestEffort?: BestEffort; tried?: string; runDetail?: RunDetail; runTried?: string },
): Promise<boolean> {
  const db = await getDB();
  const tx = db.transaction('sessionLogs', 'readwrite');
  const current = await tx.store.get(logId);
  if (!current || current.trim) {
    await tx.done;
    return false;
  }
  const add: Partial<SessionLog> = {};
  if (derived.detail && !current.detail) add.detail = derived.detail;
  if (derived.bestEffort) {
    // Added when there is none, or when the one there was read for other totals (a correction at
    // the source). One that is still good is never written over.
    const { km, minutes } = testTotals(current);
    if (!isUsableBestEffort(current.bestEffort) || isStaleEffort(current.bestEffort, km, minutes)) add.bestEffort = derived.bestEffort;
  }
  if (derived.tried && !derived.bestEffort && current.bestEffortTried !== derived.tried) add.bestEffortTried = derived.tried;
  if (derived.runDetail) {
    // Added when there is none, or when the one there was read for other totals. One that is
    // still good is never written over.
    const { km, minutes } = testTotals(current);
    if (!isUsableRunDetail(current.runDetail) || isStaleRunDetail(current.runDetail, km, minutes)) add.runDetail = derived.runDetail;
  }
  if (derived.runTried && current.runDetailTried !== derived.runTried) add.runDetailTried = derived.runTried;
  if (Object.keys(add).length === 0) {
    await tx.done;
    return false;
  }
  await tx.store.put({ ...current, ...add });
  await tx.done;
  return true;
}

// Your Akkoord: from now on the test counts with its best stretch. Only the flag on the derived
// best effort is set, and only when it is still good for the totals the log has now.
export async function acceptBestEffort(logId: string): Promise<boolean> {
  const db = await getDB();
  const tx = db.transaction('sessionLogs', 'readwrite');
  const current = await tx.store.get(logId);
  const b = current?.bestEffort;
  if (!current || current.trim || !isUsableBestEffort(b) || b.accepted === true) {
    await tx.done;
    return false;
  }
  const { km, minutes } = testTotals(current);
  if (isStaleEffort(b, km, minutes)) {
    await tx.done;
    return false;
  }
  await tx.store.put({ ...current, bestEffort: { ...b, accepted: true } });
  await tx.done;
  return true;
}

// A test run that was linked before the best 5 km existed: look for its activity in what
// the watch last gave, and read the series once. Never throws.
export async function ensureBestEffort(logId: string, options: AttachOptions = {}): Promise<AttachResult> {
  try {
    const log = (await SessionLogsRepo.getAll()).find((l) => l.id === logId);
    if (!log || !log.externalId || !wantsBestEffort(log)) return 'skipped';
    const activity = (await getWatchState()).activities.find((a) => a.externalId === log.externalId);
    return activity ? await attachActivityDetail(activity, options) : 'skipped';
  } catch {
    return 'failed';
  }
}

// --- an older run: fill in the kilometres and the series when its sheet opens ------------------

// How long the whole fetch may take before the sheet says so (the requests each have their own
// limit of 15 seconds).
export const ENSURE_TIMEOUT_MS = 25_000;

export type EnsureOutcome =
  // Nothing to do: the log has its kilometres and, if wanted, its series.
  | 'ready'
  // Fetched and stored.
  | 'added'
  // The switch "Details van loopjes en tochten" is off.
  | 'off'
  // Not a watch run, or no connection with the source.
  | 'no-link'
  // The source gave no usable series for it (tried once; not asked again for the same totals).
  | 'no-series'
  | 'failed'
  | 'timeout';

// The sentence to show for an outcome; undefined when there is nothing to say.
export function ensureOutcomeText(outcome: EnsureOutcome): string | undefined {
  switch (outcome) {
    case 'ready':
    case 'added':
      return undefined;
    case 'off':
      return 'Details van loopjes en tochten staan uit, dus er zijn geen kilometers opgehaald.';
    case 'no-link':
      return 'Voor kilometer na kilometer heb je de gegevens van je horloge nodig, via intervals.icu.';
    case 'no-series':
      return 'Van deze training heeft intervals.icu geen reeks per moment. Er is niets veranderd.';
    case 'failed':
      return 'Het ophalen lukte niet. Er is niets veranderd; de volgende keer dat je de app opent probeert hij het opnieuw.';
    case 'timeout':
      return 'Het ophalen duurde te lang. Er is niets veranderd; de volgende keer dat je de app opent probeert hij het opnieuw.';
  }
}

// Only a run is read as a run and a walk, tocht or bergtocht as a hike; strength, a ride or
// anything else has no series ASCEND uses, so nothing is fetched for it.
function kindOfLog(log: SessionLog): ExternalActivityKind | undefined {
  if (logSport(log) === 'running') return 'run';
  if (isWalkOrTripLog(log)) return 'hike';
  return undefined;
}

// Called when the sheet or the detail screen of a run opens: once per log (and per set of
// totals), fills in the kilometres and the series of a run that has none. Never throws and
// always answers within ENSURE_TIMEOUT_MS with something to show.
export async function ensureRunDetail(logId: string, options: AttachOptions = {}): Promise<EnsureOutcome> {
  const work = async (): Promise<EnsureOutcome> => {
    const log = (await SessionLogsRepo.getAll()).find((l) => l.id === logId);
    if (!log || !log.externalId || log.trim) return 'no-link';
    const kind = kindOfLog(log);
    if (!kind) return 'no-link';
    const state = await getWatchState();
    if (!detailsWanted(state.use)) return 'off';
    const settings = await SettingsRepo.get();
    const needs = needsOf(log, { keepStreams: settings.keepStreams !== false, streamsFresh: await streamsAreFresh(log), retry: !failedThisSession.has(log.id) });
    // The best 5 km of a test and the profile have their own routes; here it is about the new parts.
    if (!needs.runDetail && !needs.streams) {
      const { km, minutes } = testTotals(log);
      if (!isUsableRunDetail(log.runDetail) && log.runDetailTried === runDetailFingerprint(km, minutes)) return 'no-series';
      return failedThisSession.has(log.id) ? 'failed' : 'ready';
    }
    if (!(await getConnection())) return 'no-link';
    // What is known of the activity from the last fetches; else everything ASCEND uses.
    const known = [...state.activities, ...state.history].find((a) => a.externalId === log.externalId);
    const activity: ExternalActivity = known ?? {
      externalId: log.externalId,
      source: log.source === 'garmin' ? 'garmin' : 'import',
      start: `${log.completedDate}T00:00:00`,
      kind,
      durationSec: Math.max(60, Math.round(testTotals(log).minutes * 60)),
      treadmill: (log.cardioData ?? log.outdoorData)?.environment === 'treadmill',
      streamsAvailable: WANTED_STREAMS,
    };
    const result = await attachActivityDetail(activity, known ? options : { ...options, skipWeather: true });
    if (result === 'failed') return 'failed';
    const after = (await SessionLogsRepo.getAll()).find((l) => l.id === logId);
    if (result === 'attached') return 'added';
    return after?.runDetail ? 'ready' : 'no-series';
  };
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work(),
      new Promise<EnsureOutcome>((resolve) => {
        timer = setTimeout(() => resolve('timeout'), options.timeoutMs ?? ENSURE_TIMEOUT_MS);
      }),
    ]);
  } catch {
    return 'failed';
  } finally {
    if (timer) clearTimeout(timer);
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

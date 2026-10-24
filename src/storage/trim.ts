// ASCEND: "Inkorten" in storage: a watch activity cut at the end and/or the
// beginning, or put back (engine/trimLog.ts,
// docs/beslissingen/2026-10-24-activiteit-inkorten.md).
//
// The series of the activity are fetched when the sheet opens and are only held
// in memory; they are not kept. The write itself reads the log fresh and writes
// it in one transaction, so a feeling you filled in while the sheet was open is
// never overwritten by an older copy, and it waits for the other steps that
// replace numbers of a log (the queue it shares with storage/watchAlign.ts).

import { getDB } from './database';
import { getConnection, getWatchState } from './externalActivities';
import { inTurn } from './watchAlign';
import type { StreamSet } from '../models/activityDetail';
import type { SessionLog } from '../models/training';
import { zeroBased } from '../engine/activityTrim';
import { trimLog, undoTrim } from '../engine/trimLog';
import { logSport } from '../engine/sports';
import type { ExternalActivityKind } from '../engine/activityImport';
import { createIntervalsIcuAdapter, intervalsErrorMessage, WANTED_STREAMS, type FetchOptions } from '../integrations/intervalsIcu';

// An error whose message is a sentence for the sheet.
export class TrimUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TrimUnavailableError';
  }
}

export const MIN_TRIM_SAMPLES = 30;
export const MIN_TRIM_SEC = 120;

function kindOfLog(log: SessionLog): ExternalActivityKind {
  const sport = logSport(log);
  if (sport === 'cycling') return 'ride';
  if (sport === 'hiking' || log.type === 'recovery') return 'hike';
  return 'run';
}

// The series of the activity a log is tied to, with the clock starting at 0.
// Throws a TrimUnavailableError with the sentence to show when there is no
// connection, the provider does not answer or the activity has no usable series.
export async function fetchTrimStreams(log: SessionLog, options: FetchOptions = {}): Promise<StreamSet> {
  const externalId = log.externalId;
  if (!externalId) throw new TrimUnavailableError('Deze training komt niet van je horloge, dus er zijn geen reeksen om in te korten.');
  const connection = await getConnection();
  if (!connection) {
    throw new TrimUnavailableError('Er is geen koppeling met intervals.icu. Koppel je horloge bij Instellingen, Koppelingen, dan kun je inkorten.');
  }
  // What is known of the activity from the last fetches; else everything ASCEND uses.
  const state = await getWatchState();
  const known = [...state.activities, ...state.history].find((a) => a.externalId === externalId);
  let streams: StreamSet | undefined;
  try {
    const adapter = createIntervalsIcuAdapter(connection, options);
    streams = await adapter.fetchActivityStreams!({
      externalId,
      kind: known?.kind ?? kindOfLog(log),
      streamsAvailable: known?.streamsAvailable ?? WANTED_STREAMS,
    });
  } catch (err) {
    throw new TrimUnavailableError(intervalsErrorMessage(err));
  }
  if (!streams || streams.timeSec.length < MIN_TRIM_SAMPLES || (!streams.speedMs && !streams.distanceM)) {
    throw new TrimUnavailableError('Van deze training heeft intervals.icu geen tijd en snelheid of afstand per moment. Inkorten kan dan niet.');
  }
  const zeroed = zeroBased(streams);
  if (zeroed.timeSec[zeroed.timeSec.length - 1] < MIN_TRIM_SEC) {
    throw new TrimUnavailableError('Deze training is te kort om in te korten.');
  }
  return zeroed;
}

// Cuts the log. Resolves to whether anything was written: false when the log is
// gone, cannot be trimmed, is trimmed already, or the stretch has no movement.
export function trimStoredLog(logId: string, streams: StreamSet, startSec: number, endSec: number, now: Date = new Date()): Promise<boolean> {
  return inTurn(async () => {
    const db = await getDB();
    const tx = db.transaction('sessionLogs', 'readwrite');
    const current = await tx.store.get(logId);
    const next = current ? trimLog(current, streams, startSec, endSec, now) : undefined;
    if (next) await tx.store.put(next);
    await tx.done;
    return !!next;
  });
}

// "Inkorten ongedaan maken": the numbers (and the profile) from before the cut.
// Resolves to whether anything was put back. Needs no connection.
export function undoTrimStoredLog(logId: string): Promise<boolean> {
  return inTurn(async () => {
    const db = await getDB();
    const tx = db.transaction('sessionLogs', 'readwrite');
    const current = await tx.store.get(logId);
    const restored = current?.trim ? undoTrim(current) : undefined;
    if (restored) await tx.store.put(restored);
    await tx.done;
    return !!restored;
  });
}

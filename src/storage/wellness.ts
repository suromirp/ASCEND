// ASCEND: sleep, resting heart rate and HRV from intervals.icu, kept on this
// device as RecoveryMetric (the shape every source fills; no vendor fields).
//
// The values are a cache of someone else's data, re-fetched from intervals.icu
// whenever the watch is synchronised, so (like the activities and the key in
// storage/externalActivities.ts) they are not part of an export. The records
// carry the id "intervals.icu:<date>", which is how unlinking finds exactly
// these and leaves anything entered another way alone.

import { RecoveryMetricsRepo } from './database';
import { BASELINE_DAYS } from '../engine/wellnessCheck';
import { fetchIntervalsWellness, INTERVALS_ADAPTER_ID, intervalsErrorMessage, type FetchOptions, type IntervalsConnection } from '../integrations/intervalsIcu';
import type { RecoveryMetric } from '../models/metrics';
import { addDays, todayISO } from '../utils/dates';

// The four weeks that make "your own average", plus today. Older records are
// dropped on the next fetch: nothing needs them.
const KEEP_DAYS = BASELINE_DAYS + 7;

export type WellnessSyncResult =
  | { status: 'ok'; days: number; today: boolean }
  | { status: 'error'; message: string };

export async function getRecoveryMetrics(): Promise<RecoveryMetric[]> {
  return RecoveryMetricsRepo.getAll();
}

// Never throws: wellness is a bonus on top of the activities, and a hiccup
// here must not make the activity fetch look like it failed.
export async function syncWellness(connection: IntervalsConnection, options: FetchOptions & { today?: string } = {}): Promise<WellnessSyncResult> {
  try {
    const today = options.today ?? todayISO();
    const metrics = await fetchIntervalsWellness(connection, { from: addDays(today, -BASELINE_DAYS), to: today }, { fetchImpl: options.fetchImpl });
    const cutoff = addDays(today, -KEEP_DAYS);
    const existing = await RecoveryMetricsRepo.getAll();
    for (const old of existing) {
      if (old.id.startsWith(`${INTERVALS_ADAPTER_ID}:`) && old.date < cutoff) await RecoveryMetricsRepo.delete(old.id);
    }
    if (metrics.length > 0) await RecoveryMetricsRepo.putAll(metrics);
    return { status: 'ok', days: metrics.length, today: metrics.some((m) => m.date === today) };
  } catch (err) {
    return { status: 'error', message: intervalsErrorMessage(err) };
  }
}

// Unlinking: what came from intervals.icu goes, what you entered yourself stays.
export async function clearWellness(): Promise<void> {
  for (const m of await RecoveryMetricsRepo.getAll()) {
    if (m.id.startsWith(`${INTERVALS_ADAPTER_ID}:`)) await RecoveryMetricsRepo.delete(m.id);
  }
}

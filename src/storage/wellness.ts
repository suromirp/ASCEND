// ASCEND: sleep, resting heart rate and HRV from intervals.icu, kept on this
// device as RecoveryMetric (the shape every source fills; no vendor fields).
//
// The values are a cache of someone else's data, re-fetched from intervals.icu
// whenever the watch is synchronised, so (like the activities and the key in
// storage/externalActivities.ts) they are not part of an export. The records
// carry the id "intervals.icu:<date>", which is how unlinking finds exactly
// these and leaves anything entered another way alone.

import { MetaRepo, RecoveryMetricsRepo, SettingsRepo } from './database';
import { KEEP_DAYS, wellnessPlan, type DateSpan } from '../engine/wellnessRange';
import { morningOf } from '../engine/influenceEffects';
import { fetchIntervalsWellness, INTERVALS_ADAPTER_ID, intervalsErrorMessage, type FetchOptions, type IntervalsConnection } from '../integrations/intervalsIcu';
import { DEFAULT_WATCH_USE, filterRecovery, wellnessWanted, type WatchUse } from '../engine/watchUse';
import type { RecoveryMetric } from '../models/metrics';
import { addDays, todayISO } from '../utils/dates';

// Records are kept for KEEP_DAYS (engine/wellnessRange.ts): "Wat speelde er" compares a noted
// morning with the 28 days before it, which can lie months back. Everything that reads them picks
// its own window (engine/wellnessCheck.ts#baselineValues), so keeping more changes nothing there.
// The earliest day the fetches have covered is remembered, so the long stretch is fetched once
// (a new note, a restored backup) and not at every sync.
const COVERED_KEY = 'wellnessCoveredFrom';
const TRIED_KEY = 'wellnessLongTriedOn';

export type WellnessSyncResult =
  | { status: 'ok'; days: number; today: boolean }
  | { status: 'error'; message: string };

export async function getRecoveryMetrics(): Promise<RecoveryMetric[]> {
  return RecoveryMetricsRepo.getAll();
}

// Never throws: wellness is a bonus on top of the activities, and a hiccup
// here must not make the activity fetch look like it failed.
//
// `use` says which kinds of watch data are wanted (engine/watchUse.ts): what is
// switched off is not asked for when all three are off, and is left out of what
// is stored otherwise.
export async function syncWellness(connection: IntervalsConnection, options: FetchOptions & { today?: string; use?: WatchUse } = {}): Promise<WellnessSyncResult> {
  try {
    const today = options.today ?? todayISO();
    const use = options.use ?? DEFAULT_WATCH_USE;
    if (!wellnessWanted(use)) return { status: 'ok', days: 0, today: false };
    const settings = await SettingsRepo.get();
    const plan = wellnessPlan({
      today,
      mornings: (settings.influences ?? []).filter((e) => e.reasons.length > 0).map(morningOf),
      coveredFrom: await MetaRepo.get<string>(COVERED_KEY),
    });
    // First the usual four weeks, stored at once: this decides whether the sync worked.
    const metrics = filterRecovery(await fetchIntervalsWellness(connection, plan.normal, { fetchImpl: options.fetchImpl }), use);
    const cutoff = addDays(today, -KEEP_DAYS);
    const existing = await RecoveryMetricsRepo.getAll();
    for (const old of existing) {
      if (old.id.startsWith(`${INTERVALS_ADAPTER_ID}:`) && old.date < cutoff) await RecoveryMetricsRepo.delete(old.id);
    }
    if (metrics.length > 0) await RecoveryMetricsRepo.putAll(metrics);
    const covered = await MetaRepo.get<string>(COVERED_KEY);
    if (covered === undefined || covered > plan.normal.from) await MetaRepo.set(COVERED_KEY, plan.normal.from);
    await fetchLongStretch(connection, plan.long, use, today, options.fetchImpl);
    return { status: 'ok', days: metrics.length, today: metrics.some((m) => m.date === today) };
  } catch (err) {
    return { status: 'error', message: intervalsErrorMessage(err) };
  }
}

// The older stretch for "Wat speelde er": best effort, newest part first, tried once a day at most.
// A part that fails changes nothing about the sync; what was fetched stays and is remembered.
async function fetchLongStretch(connection: IntervalsConnection, parts: DateSpan[], use: WatchUse, today: string, fetchImpl: FetchOptions['fetchImpl']): Promise<void> {
  if (parts.length === 0) return;
  try {
    if ((await MetaRepo.get<string>(TRIED_KEY)) === today) return;
    await MetaRepo.set(TRIED_KEY, today);
    for (const part of parts) {
      const records = filterRecovery(await fetchIntervalsWellness(connection, part, { fetchImpl }), use);
      if (records.length > 0) await RecoveryMetricsRepo.putAll(records);
      await MetaRepo.set(COVERED_KEY, part.from);
    }
  } catch {
    // The next day tries again from where this stopped.
  }
}

// Unlinking: what came from intervals.icu goes, what you entered yourself stays.
export async function clearWellness(): Promise<void> {
  await MetaRepo.set(COVERED_KEY, undefined);
  await MetaRepo.set(TRIED_KEY, undefined);
  for (const m of await RecoveryMetricsRepo.getAll()) {
    if (m.id.startsWith(`${INTERVALS_ADAPTER_ID}:`)) await RecoveryMetricsRepo.delete(m.id);
  }
}

// A kind was switched off: it leaves what is stored, so nothing keeps using it.
// Records of other origin are not touched. Switching it on again fetches it anew.
export async function pruneWellness(use: WatchUse): Promise<void> {
  await MetaRepo.set(COVERED_KEY, undefined);
  await MetaRepo.set(TRIED_KEY, undefined);
  const ours = (await RecoveryMetricsRepo.getAll()).filter((m) => m.id.startsWith(`${INTERVALS_ADAPTER_ID}:`));
  const kept = filterRecovery(ours, use);
  const keptIds = new Set(kept.map((m) => m.id));
  for (const m of ours) if (!keptIds.has(m.id)) await RecoveryMetricsRepo.delete(m.id);
  if (kept.length > 0 && kept !== ours) await RecoveryMetricsRepo.putAll(kept);
}

// ASCEND: which kinds of watch data ASCEND uses (the card "Wat ASCEND van je
// horloge gebruikt" on the link screen).
//
// Four kinds come from intervals.icu: the trainings (the card "Van je horloge"
// on Today), sleep, resting heart rate and HRV. What is switched off is not
// fetched, not shown and not used in the morning check-in or any calculation.
// "Vanzelf afvinken" and "Trainingen naar je horloge" are two more switches in
// the same card, but they have their own records (storage/externalActivities.ts
// and storage/watchWorkouts.ts). Body weight is not in this list on purpose:
// it never comes from the watch (it comes from MacroFactor, engine/
// macrofactorWeight.ts).
//
// Pure: no React, no IndexedDB. A device preference, never part of an export.

import type { RecoveryMetric } from '../models/metrics';

export interface WatchUse {
  activities: boolean;
  sleep: boolean;
  restingHeartRate: boolean;
  hrv: boolean;
}

export type WatchUseKey = keyof WatchUse;

export const DEFAULT_WATCH_USE: WatchUse = { activities: true, sleep: true, restingHeartRate: true, hrv: true };

// Tolerant: anything that is not an explicit "false" is on, so an older or
// damaged record never switches something off by accident.
export function normalizeWatchUse(raw: unknown): WatchUse {
  const r = raw && typeof raw === 'object' ? (raw as Partial<Record<WatchUseKey, unknown>>) : {};
  return {
    activities: r.activities !== false,
    sleep: r.sleep !== false,
    restingHeartRate: r.restingHeartRate !== false,
    hrv: r.hrv !== false,
  };
}

// Is there any reason to ask intervals.icu for wellness records at all?
export function wellnessWanted(use: WatchUse): boolean {
  return use.sleep || use.restingHeartRate || use.hrv;
}

export function nothingWanted(use: WatchUse): boolean {
  return !use.activities && !wellnessWanted(use);
}

// A record without the fields that are switched off. A record that has
// nothing left is dropped. The list is returned as it is when everything is on.
export function filterRecovery(metrics: RecoveryMetric[], use: WatchUse): RecoveryMetric[] {
  if (use.sleep && use.restingHeartRate && use.hrv) return metrics;
  const kept: RecoveryMetric[] = [];
  for (const m of metrics) {
    const copy: RecoveryMetric = { ...m };
    if (!use.sleep) {
      delete copy.sleepMinutes;
      delete copy.sleepScore;
    }
    if (!use.restingHeartRate) delete copy.restingHeartRate;
    if (!use.hrv) delete copy.hrv;
    const hasData = copy.sleepMinutes !== undefined || copy.sleepScore !== undefined || copy.restingHeartRate !== undefined || copy.hrv !== undefined;
    if (hasData) kept.push(copy);
  }
  return kept;
}

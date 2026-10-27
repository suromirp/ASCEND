// ASCEND — Integration adapter interface
//
// V1 ships no live integrations. This interface exists so that
// /integrations/garmin.ts and /integrations/healthConnect.ts can be dropped
// in later without touching a single screen or engine function — everything
// downstream (readiness.ts, History, the Ascend dashboard) consumes these
// shapes, never a vendor's API response directly.

import type { RecoveryMetric, BodyMetric, NutritionMetric } from '../models/metrics';
import type { SessionLog } from '../models/training';
import type { ExternalActivity } from '../engine/activityImport';
import type { StreamSet } from '../models/activityDetail';
import type { StoredLap } from '../models/activityStreams';

export interface DateRange {
  from: string; // ISO date
  to: string; // ISO date
}

export interface DataSourceAdapter {
  id: string;
  label: string;
  isConnected: () => boolean;
  fetchRecoveryMetrics?: (range: DateRange) => Promise<RecoveryMetric[]>;
  fetchBodyMetrics?: (range: DateRange) => Promise<BodyMetric[]>;
  fetchNutritionMetrics?: (range: DateRange) => Promise<NutritionMetric[]>;
  // Activities a wearable recorded outside the app (e.g. a run started
  // directly on a Garmin watch) surface as SessionLogs with source set to
  // the adapter id, exactly like a manually logged session would.
  fetchActivities?: (range: DateRange) => Promise<SessionLog[]>;
  // The same activities as the general ExternalActivity shape, not yet a log:
  // engine/activityImport.ts turns one into a draft log and proposes the
  // planned session it belongs to, and the user decides on the Today card.
  // This is the route intervals.icu uses (integrations/intervalsIcu.ts).
  fetchExternalActivities?: (range: DateRange) => Promise<ExternalActivity[]>;
  // The series of one activity (heart rate, speed, altitude, the running
  // dynamics...) in ASCEND's units, one request. engine/activityDetail.ts turns
  // them into the compact profile that is kept; the series themselves are not.
  fetchActivityStreams?: (activity: Pick<ExternalActivity, 'externalId' | 'kind' | 'streamsAvailable'>) => Promise<StreamSet | undefined>;
  // The laps or intervals of one activity, with their boundaries in seconds since the start
  // (`timeSec` of the series lets an adapter turn indexes into seconds).
  fetchActivityLaps?: (activity: Pick<ExternalActivity, 'externalId'>, timeSec?: readonly number[]) => Promise<StoredLap[]>;
}

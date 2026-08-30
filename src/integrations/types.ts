// ASCEND — Integration adapter interface
//
// V1 ships no live integrations. This interface exists so that
// /integrations/garmin.ts and /integrations/healthConnect.ts can be dropped
// in later without touching a single screen or engine function — everything
// downstream (readiness.ts, History, the Ascend dashboard) consumes these
// shapes, never a vendor's API response directly.

import type { RecoveryMetric, BodyMetric, NutritionMetric } from '../models/metrics';
import type { SessionLog } from '../models/training';

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
}

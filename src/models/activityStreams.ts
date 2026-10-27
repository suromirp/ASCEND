// ASCEND: the full series of one run or tocht, kept on this device.
//
// Provider-free like models/activityDetail.ts: nothing in here names a service. A series is
// kept at the moments the watch wrote it, packed as binary numbers (docs/onderzoek/Run in
// detail.md, hoofdstuk 8). The track is never kept: it is used while the run is processed
// (the heading per kilometre for the wind) and then let go.
//
// This is a store of its own (`activityStreams`, key `logId`), apart from the logs, so
// loading the logs at every start stays as fast as it was and a series can be dropped
// without a log losing anything.

// The series that are kept. 'position' is not among them, on purpose.
export type StreamKindStored =
  | 'time'
  | 'distance'
  | 'heartRate'
  | 'speed'
  | 'altitude'
  | 'cadence'
  | 'power'
  | 'stanceTime'
  | 'stanceBalance'
  | 'verticalOscillation'
  | 'verticalRatio'
  | 'stepLength'
  | 'respiration'
  | 'temperature'
  | 'verticalSpeed';

export type PackType = 'u8' | 'u16' | 'i16' | 'u32' | 'f32';

// How the numbers are packed: the value is raw * scale, and `missing` marks a gap.
export interface StoredSeries {
  type: PackType;
  scale: number;
  // The raw number that stands for "no reading" (NaN for a float).
  missing: number;
  data: ArrayBuffer;
}

// A lap or interval of the source: where it lies in time, what the source called it and,
// for comparison, what the source computed. ASCEND shows its own numbers from the series.
export interface StoredLap {
  // Seconds since the start, as the series have it.
  startSec: number;
  endSec: number;
  kind?: 'work' | 'recovery';
  label?: string;
  groupId?: string;
  source?: StoredLapSource;
}

// Only finite numbers; every field is absent when the source did not give it.
export interface StoredLapSource {
  distanceM?: number;
  movingSec?: number;
  avgSpeedMs?: number;
  gapMs?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  avgCadence?: number;
  avgWatts?: number;
  avgStepLengthM?: number;
  gainM?: number;
  decouplingPct?: number;
  avgRespiration?: number;
  avgTempC?: number;
  zone?: number;
  intensity?: number;
  // The weather the source worked out (supporters only at the source).
  headwindPct?: number;
  tailwindPct?: number;
  avgWindMs?: number;
}

export interface ActivityStreams {
  // The key of the store: the id of the log the series belong to.
  logId: string;
  externalId: string;
  version: 1;
  fetchedAt: string;
  // The totals of the log the series were read for, so a correction at the source makes
  // them stale (the same fingerprint as BestEffort).
  wholeKm: number;
  wholeMinutes: number;
  sampleCount: number;
  series: Partial<Record<StreamKindStored, StoredSeries>>;
  // Per kilometre, worked out once while the track was still there; the track itself is not kept.
  headwindKmh?: (number | null)[];
  laps?: StoredLap[];
  // The names (not the values) of series the source has that ASCEND does not know.
  unknownKinds?: string[];
}

// The same, as it travels in a backup file: the binary data as base64 text.
export interface SerializedSeries {
  type: PackType;
  scale: number;
  missing: number | null;
  data: string;
}

export interface SerializedActivityStreams extends Omit<ActivityStreams, 'series'> {
  series: Partial<Record<StreamKindStored, SerializedSeries>>;
}

// ASCEND: what is known about one activity beyond its totals.
//
// Provider-free (docs/onderzoek/Loopgegevens en vooruitgang.md, hoofdstuk 4):
// nothing in here names a vendor or a service. `source` stays the existing
// MetricSource on the log. An adapter (integrations/intervalsIcu.ts today)
// turns whatever the provider calls these things into the shapes below.

import type { MetricSource } from './training';

// Running dynamics, averages over a whole activity (or over one slice of it),
// whatever device measured them. Every field is simply absent when the source
// did not measure it. Units are fixed here: milliseconds, millimetres, metres,
// percent, metres per second.
export interface RunDynamics {
  // Ground contact time.
  stanceTimeMs?: number;
  // Ground contact time as a share of a full stride (two steps), percent.
  stanceTimePercent?: number;
  // Share of the contact time spent on the left foot, percent; 50 is even.
  stanceBalanceLeftPct?: number;
  verticalOscillationMm?: number;
  verticalRatioPct?: number;
  stepLengthM?: number;
  // Rate of climb or descent as the device reports it, metres per second.
  verticalSpeedMs?: number;
  // The two figures a running pod adds. Stored as the source gives them, for
  // the card that shows what arrives; no calculation reads them.
  legSpringStiffness?: number;
  impactLoadingRate?: number;
}

// The kinds of series an activity can have, in ASCEND's own words. The adapter
// translates the names of its provider into these, and only asks for what the
// activity says it has.
export type StreamKind =
  | 'time'
  | 'distance'
  | 'heartRate'
  | 'speed'
  | 'altitude'
  | 'cadence'
  | 'position'
  | 'power'
  | 'stanceTime'
  | 'stanceBalance'
  | 'verticalOscillation'
  | 'verticalRatio'
  | 'stepLength'
  | 'respiration'
  | 'temperature'
  | 'verticalSpeed';

// --- the series of one activity, in ASCEND's units -----------------------------------
//
// What an adapter hands to engine/activityDetail.ts. Every series is aligned to
// `timeSec` (the same length) and holds null where the source had a gap. Only
// the first position survives (rounded for the weather lookup); the track
// itself is never kept.
export interface StreamSet {
  // Seconds since the start, as the source recorded them (pauses included).
  timeSec: number[];
  distanceM?: (number | null)[];
  heartRate?: (number | null)[];
  speedMs?: (number | null)[];
  altitudeM?: (number | null)[];
  // Steps per minute.
  cadence?: (number | null)[];
  stanceTimeMs?: (number | null)[];
  stanceBalanceLeftPct?: (number | null)[];
  verticalOscillationMm?: (number | null)[];
  verticalRatioPct?: (number | null)[];
  stepLengthM?: (number | null)[];
  // Running power, watts.
  powerW?: (number | null)[];
  // Breaths per minute.
  respirationRpm?: (number | null)[];
  // The temperature the watch sensor read, degrees Celsius. Not the weather.
  temperatureC?: (number | null)[];
  // Rate of climb or descent, metres per second.
  verticalSpeedMs?: (number | null)[];
  start?: { lat: number; lon: number };
  // The track, only while a run is being processed (the heading per kilometre for the
  // wind). It is never stored, never put on a log and never packed: whoever has read what
  // they need from it lets the StreamSet go (engine/streamPack.ts keeps no position).
  position?: { lat: (number | null)[]; lon: (number | null)[] };
}

// --- the compact profile that is kept on a log -----------------------------------------

// One piece of the activity, in order. A piece is the same amount of moving
// time as every other piece of that activity.
export interface DetailSlice {
  // Moving seconds in this piece.
  sec: number;
  distanceM: number;
  gainM: number;
  lossM: number;
  heartRate?: number;
  // Steps per minute.
  cadence?: number;
  dynamics?: RunDynamics;
}

// A continuous climb or descent.
export interface TerrainStretch {
  kind: 'climb' | 'descent';
  // Moving seconds from the start of the activity to the start of the stretch.
  startSec: number;
  sec: number;
  distanceM: number;
  // Metres gained or lost (always positive).
  metres: number;
  // Average gradient, percent, always positive.
  gradientPct: number;
  heartRate?: number;
  cadence?: number;
  // The same stretch cut in thirds: the last third against the first says how
  // the legs held (engine/runMetrics.ts). Metres per hour, heart rate, cadence.
  thirds?: { metresPerHour: number; heartRate?: number; cadence?: number }[];
}

export interface DetailConditions {
  tempC?: number;
  feelsC?: number;
  windKmh?: number;
  gustKmh?: number;
  humidityPct?: number;
  rainMm?: number;
  // 'lookup': found by place and hour; 'manual': typed in; 'import': came
  // along with the activity.
  source: 'lookup' | 'manual' | 'import';
}

export interface ActivityDetail {
  version: 1;
  source: MetricSource;
  sliceCount: number;
  slices: DetailSlice[];
  stretches: TerrainStretch[];
  conditions?: DetailConditions;
  // Moving seconds of the whole profile (the sum of the slices).
  movingSec: number;
  quality: {
    // Share of the moving time that has a heart rate, 0 to 100.
    heartRateCoveragePct: number;
    // Own climb against the climb the source reports, 100 is the same.
    gainAgreementPct?: number;
    // The heart rate came with a signal that only a chest strap or a pod gives
    // (the ground contact balance): an indication, not a promise.
    chestStrapSeen?: boolean;
  };
}

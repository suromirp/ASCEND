// ASCEND: what a run says per kilometre and per lap, derived from its full series.
//
// Kept on the log as `SessionLog.runDetail`, like `detail` and `bestEffort`: derived,
// optional, added once and tied to the totals it was read for (`wholeKm`, `wholeMinutes`),
// so a correction at the source makes it stale and it is read again. The log's measured
// numbers are never touched. Small enough (a few KB) to open a list without loading the
// series (docs/onderzoek/Run in detail.md, docs/visie/Run in detail.md).

// One kilometre, or the shorter piece at the end (`partial`).
export interface RunKm {
  // 1 for the first kilometre.
  index: number;
  // Metres from the start of the run (the first distance reading).
  startM: number;
  endM: number;
  distanceM: number;
  // Moving seconds: a pause of more than 20 seconds does not count.
  sec: number;
  // Seconds a pause of more than 20 seconds took in this kilometre.
  pauseSec?: number;
  // Seconds per kilometre over the moving seconds.
  paceSecKm: number;
  // Pace corrected for the slope; only when the kilometre has 10 metres of climb or descent.
  gapSecKm?: number;
  hrAvg?: number;
  hrMax?: number;
  cadence?: number;
  stepLengthM?: number;
  oscillationMm?: number;
  verticalRatioPct?: number;
  stanceTimeMs?: number;
  stanceBalanceLeftPct?: number;
  powerW?: number;
  respirationRpm?: number;
  // Metres up and down; absent when the run has no altitude.
  gainM?: number;
  lossM?: number;
  // The wind against you at chest height, km/h; negative is a tailwind. Only with weather.
  headwindKmh?: number;
  // The last piece, shorter than a kilometre.
  partial?: boolean;
}

// A lap of the watch (or an interval of the source), worked out again from the series.
export interface RunLap {
  index: number;
  startSec: number;
  endSec: number;
  startM: number;
  endM: number;
  distanceM: number;
  sec: number;
  kind?: 'work' | 'recovery';
  label?: string;
  paceSecKm?: number;
  gapSecKm?: number;
  hrAvg?: number;
  hrMax?: number;
  // Beats the heart rate fell in the first minute after the lap ended (to read a recovery).
  hrDropFirstMinute?: number;
  cadence?: number;
  stepLengthM?: number;
  powerW?: number;
  // Metres up and down; absent when the run has no altitude.
  gainM?: number;
  lossM?: number;
}

// The reduced line for the charts: about 150 points over the distance. Every array has
// `n` entries; a value is null where there was no reading.
export interface RunLine {
  n: number;
  distM: number[];
  // Seconds since the start of the run at each point.
  timeSec: number[];
  paceSecKm: (number | null)[];
  hr: (number | null)[];
  altitudeM: (number | null)[];
  cadence?: (number | null)[];
  stepLengthM?: (number | null)[];
  stanceTimeMs?: (number | null)[];
  oscillationMm?: (number | null)[];
  powerW?: (number | null)[];
}

export interface RunDetail {
  version: 1;
  // The totals of the log it was read for (its fingerprint).
  wholeKm: number;
  wholeMinutes: number;
  builtAt: string;
  // Metres the run covers according to the series.
  totalM: number;
  movingSec: number;
  // Seconds standing still (pauses of more than 20 seconds).
  pauseSec: number;
  kms: RunKm[];
  laps?: RunLap[];
  line: RunLine;
  // Where the best 5 km lies, in metres from the start.
  // `kms` are its own five kilometres (it rarely starts on a kilometre mark of the run).
  bestFive?: { startM: number; endM: number; startSec: number; sec: number; kms: RunKm[] };
  // Whether the wind against you per kilometre was worked out (the weather was there).
  windKnown?: boolean;
}

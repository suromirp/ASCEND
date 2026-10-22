// ASCEND — what is known about one activity beyond its totals.
//
// Provider-free (docs/onderzoek/Loopgegevens en vooruitgang.md, hoofdstuk 4):
// nothing in here names a vendor or a service. `source` stays the existing
// MetricSource on the log. An adapter (integrations/intervalsIcu.ts today)
// turns whatever the provider calls these things into the shapes below.

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
  | 'stepLength';

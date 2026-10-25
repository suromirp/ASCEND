// ASCEND — Metric domain models
//
// Architectural rule (spec §26): domain data is never coupled to a service.
// We model "RecoveryMetric", not "garminHeartRate". Every measurement
// carries a `source` so the UI/engine can reason about provenance without
// caring where the number came from. V1 only ever writes source: 'manual'
// (or leaves these stores empty) — Garmin/Health Connect/MacroFactor adapters
// arrive later and populate the exact same shapes.

import type { MetricSource } from './training';

export interface RecoveryMetric {
  id: string;
  date: string; // ISO date
  restingHeartRate?: number;
  hrv?: number;
  sleepScore?: number;
  // How long the night was, in minutes (generic: the source decides how it
  // measured it; a watch counts sleep, it does not see it).
  sleepMinutes?: number;
  bodyBattery?: number;
  stress?: number;
  source: MetricSource;
}

export interface BodyMetric {
  id: string;
  date: string;
  weightKg?: number;
  bodyFatPct?: number;
  source: MetricSource;
}

export interface NutritionMetric {
  id: string;
  date: string;
  calories?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  source: MetricSource;
}

// A trend-weight reading (engine/bodyWeight.ts). The trend, not one
// morning on the scale: MacroFactor's trend weight is the intended input.
//
// `kg` is the number ASCEND uses. From MacroFactor (engine/macrofactorWeight.ts)
// it is the trend weight when the export has one, else the scale weight;
// `basis` says which, and `scaleKg` keeps the weighing of that day when the
// trend was used. `fatPct` is the fat percentage of that weighing. All are optional, so older entries and backups stay valid.
export interface WeightEntry {
  date: string; // ISO date
  kg: number;
  source: MetricSource;
  basis?: 'trend' | 'scale';
  scaleKg?: number;
  // Het vetpercentage van de weging van die dag (3 tot en met 60), uit de weegschaal
  // via MacroFactor. Optioneel en alleen toegevoegd (storage/migrations.ts#migrateWeightEntries).
  fatPct?: number;
}

// The 1RM of one exercise as another source reports it, one reading per day
// (MacroFactor's sheet "Exercises - 1-RM", engine/macrofactorOneRm.ts). ASCEND's
// own estimate is not stored: it is calculated from the logs
// (engine/strengthOneRm.ts), so the two stay next to each other and neither
// overwrites the other (docs/beslissingen/2026-10-24-1rm-uit-macrofactor.md).
//
// `exerciseName` is the name as the source writes it (without the unit); which
// ASCEND exercise it is, is worked out when it is read (engine/externalOneRm.ts),
// so a later change in the exercise list does not leave a stale key behind.
// There is one series per exercise and source. The shape carries `source` like
// every metric, so a later provider fills the same record. Optional on the
// settings, so an older device or backup simply has none.
export interface OneRmReading {
  date: string; // ISO date
  kg: number;
}

export interface ExternalOneRm {
  exerciseName: string;
  source: MetricSource;
  // Oldest first, one per day.
  points: OneRmReading[];
}

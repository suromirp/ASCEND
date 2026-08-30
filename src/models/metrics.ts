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

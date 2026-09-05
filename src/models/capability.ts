// ASCEND — Capability & Demand domain models
//
// Algorithm Contract v0.2 LOCKED v2 ("Capability & Demand") + Technical
// Architecture v0.3.1 REVISED, Phase 2. Three concepts kept explicitly
// separate (v0.2 §2): Capability ("what can you demonstrably do" — slow-
// changing, evidence-derived), Readiness ("how available is that capacity
// today" — engine/readiness.ts, untouched, never referenced from here),
// and Confidence ("how sure are we"). Capability never references
// Readiness or its state (v0.2 §2.2, §36).

import type { MeasuredValue } from './units';
import type { TerrainContext } from './goals';
import type { RuleClass } from './evidence';

// A fixed, meaningful set (v0.2 §9) — not every goal uses every dimension.
// Environment/terrain is deliberately NOT a dimension of its own (§9.11) —
// it's a context layer on evidence and demand instead (TerrainContext,
// carried on CapabilityEvidence/CapabilityGap below).
export type CapabilityDimension =
  | 'aerobic_engine'
  | 'sustainable_output'
  | 'endurance_duration'
  | 'mechanical_tolerance'
  | 'ascent_capacity'
  | 'descent_tolerance'
  | 'load_carriage'
  | 'multi_day_durability'
  | 'fatigue_resistance'
  | 'strength';

// discipline is free-form (matches GoalRequirement.discipline, models/goals.ts
// — v0.3.6 §E1: mirrors ActivityModality, content not domain structure).
// Left undefined for dimensions that are NOT discipline-specific
// (ascent_capacity, descent_tolerance, load_carriage, multi_day_durability,
// fatigue_resistance, strength — v0.2 §9.5-§9.10); required in practice for
// sustainable_output/endurance_duration/mechanical_tolerance, which are
// explicitly discipline-specific (§9.2-§9.4) — a cycling output is never
// stored as a running pace.
export interface CapabilityKey {
  dimension: CapabilityDimension;
  discipline?: string;
}

// Not all data counts equally (v0.2 §5). A proxy must never be silently
// equated 1:1 with the specific thing it's supporting evidence for.
export type EvidenceType = 'direct' | 'derived' | 'proxy' | 'manual';

export interface CapabilityEvidence {
  id: string;
  key: CapabilityKey;
  measured: MeasuredValue;
  context?: TerrainContext;
  date: string; // ISO date
  evidenceType: EvidenceType;
  source: 'sessionLog' | 'manualEntry';
  sourceId?: string; // SessionLog.id when source is 'sessionLog'
  completionQuality?: 'as_expected' | 'harder' | 'easier' | 'partial' | 'aborted';
  rpe?: number;
}

export type Confidence = 'high' | 'medium' | 'low' | 'unknown';

// Discrete recency bands used directly (v0.2 §6.2, v0.3.1 REVISED review
// point 21) — no continuous decay curve. Band boundaries are one more
// ASCEND_HEURISTIC, versionable per dimension later, not a universal
// "last 28 days" rule (v0.2 §3).
export type RecencyBand = 'current' | 'supporting' | 'historical' | 'older';

export interface CapabilityEstimate {
  key: CapabilityKey;
  // Peak demonstrated exposure — the best single evidenced value ever
  // recorded, regardless of recency (v0.2 §7). Never conflated with
  // repeatableAnchor.
  peakExposure?: MeasuredValue;
  // A robust "currently repeatable" estimate — corroborated by more than
  // one recent/supporting-band data point, not a single outlier (v0.2 §7).
  repeatableAnchor?: MeasuredValue;
  confidence: Confidence;
  trend?: 'rising' | 'stable' | 'declining' | 'unknown';
  // True when peakExposure exists but nothing else corroborates it —
  // e.g. one exceptional session with no supporting repeat (v0.2 §7).
  unconfirmedPeak: boolean;
  evidenceRefs: string[]; // CapabilityEvidence.id[]
  asOf: string; // ISO datetime
}

// No schijnprecisie (v0.2 §22) — a coarse, explainable category, not a
// synthetic percentage.
export type GapStatus = 'exceeds' | 'meets' | 'near' | 'gap' | 'major_gap' | 'unknown';

export type Criticality = 'critical' | 'important' | 'supporting' | 'not_relevant';

// Demand Engine output (v0.2 §15-§18) — "what does the goal ask of this
// capability dimension" — before it's compared against any estimate.
export interface CapabilityDemand {
  key: CapabilityKey;
  demand: MeasuredValue;
  criticality: Criticality;
}

// Gap Engine output (v0.2 §21-§23). Missing data is NEVER interpreted as
// zero capability (v0.2 §23) — an absent currentEstimate reads as
// status: 'unknown', confidence: 'unknown'/'low', never as a gap.
export interface CapabilityGap {
  key: CapabilityKey;
  demand: MeasuredValue;
  currentEstimate?: MeasuredValue;
  status: GapStatus;
  confidence: Confidence;
  criticality: Criticality;
  explanation: string;
}

// Preparation Target Engine output (v0.2 §7, v0.3.1 REVISED engine map) —
// a trainable range, deliberately not required to equal the raw event
// demand 1:1 (e.g. a multi-day trek's full distance need not be literally
// replicated in training).
export interface PreparationTarget {
  key: CapabilityKey;
  targetRange: { min: MeasuredValue; max: MeasuredValue };
  context?: TerrainContext;
  criticality: Criticality;
  confidence: Confidence;
  ruleClass: RuleClass;
  evidenceRefs: string[];
  explanation: string;
}

// ASCEND — Capability Engine
//
// Algorithm Contract v0.2 LOCKED v2 §3-§9. Extracts CapabilityEvidence from
// what was actually done (SessionLog[]) — never from templates or planned
// sessions — and turns it into a CapabilityEstimate per CapabilityKey.
// Deliberately independent of engine/readiness.ts (v0.2 §2.2, §36):
// Readiness answers "how available is this today", Capability answers
// "what can you demonstrably do" — this file never imports readiness.ts
// and never reads a ReadinessState.
//
// V1 heuristics only, same spirit as readiness.ts: every threshold below
// (recency bands, the "second-best of 2+ recent points" repeatable-anchor
// rule, the confidence ladder) is a versionable ASCEND_HEURISTIC (v0.2
// §69), not hidden science — isolated here so a formula can be swapped
// later without touching extraction or the Demand/Gap engines.

import type { SessionLog } from '../models/training';
import type { CapabilityEvidence, CapabilityKey, CapabilityEstimate, RecencyBand, Confidence } from '../models/capability';
import type { MeasuredValue } from '../models/units';
import { UNIT_COMPARISON_DIRECTION } from '../models/units';
import { daysBetween } from '../utils/dates';

function keyId(key: CapabilityKey): string {
  return key.discipline ? `${key.dimension}:${key.discipline}` : key.dimension;
}

// discipline inference is a deliberate v1 simplification: the app's own
// SessionType already distinguishes 'cardio' (running sessions, e.g. Easy
// Run) from 'hiking' (real hikes and outdoor long runs alike — see
// data/defaultProgram.ts, where tpl_long_run is type 'hiking'). Good enough
// for direct/proxy dimension mapping without inventing a full
// modality-classification system on top of the free-form ActivityModality
// string.
function inferDiscipline(log: SessionLog): string | undefined {
  if (log.type === 'cardio') return 'running';
  if (log.type === 'hiking') return 'hiking';
  return undefined;
}

// --- Evidence extraction from SessionLog (v0.2 §4-§5) -----------------------

export function extractEvidenceFromLog(log: SessionLog): CapabilityEvidence[] {
  const evidence: CapabilityEvidence[] = [];
  const discipline = inferDiscipline(log);

  function push(key: CapabilityKey, measured: MeasuredValue, evidenceType: CapabilityEvidence['evidenceType']): void {
    evidence.push({
      id: `${log.id}:${keyId(key)}`,
      key,
      measured,
      date: log.completedDate,
      evidenceType,
      source: 'sessionLog',
      sourceId: log.id,
      rpe: log.rpe,
    });
  }

  // aerobic_engine: any non-recovery training session with a duration is
  // DIRECT evidence of general cardiorespiratory endurance (v0.2 §9.1) —
  // deliberately discipline-agnostic ("deels overdraagbaar tussen sporten").
  if (log.type !== 'recovery' && log.durationMinutes > 0) {
    push({ dimension: 'aerobic_engine' }, { amount: log.durationMinutes, unit: 'min' }, 'direct');
  }

  if (log.type === 'hiking' || log.type === 'cardio') {
    // endurance_duration & mechanical_tolerance are discipline-specific
    // (v0.2 §9.3-§9.4) — direct evidence from time actually spent training
    // in that discipline.
    if (discipline && log.durationMinutes > 0) {
      push({ dimension: 'endurance_duration', discipline }, { amount: log.durationMinutes, unit: 'min' }, 'direct');
      push({ dimension: 'mechanical_tolerance', discipline }, { amount: log.durationMinutes, unit: 'min' }, 'direct');
    }

    const outdoor = log.outdoorData;
    const cardio = log.cardioData;
    const distanceKm = outdoor?.distanceKm ?? cardio?.distanceKm;
    const elevationGainM = outdoor?.elevationGainM ?? cardio?.elevationGainM;
    const elevationLossM = outdoor?.elevationLossM;
    const backpackWeightKg = outdoor?.backpackWeightKg;
    const isEstimatedElevation = outdoor?.estimatedElevation ?? cardio?.estimatedElevation ?? false;

    // ascent_capacity: real outdoor D+ is DIRECT; an incline-treadmill/
    // simulated estimate is still relevant ascent evidence, but only PROXY
    // — never conflated with a real outdoor measurement (v0.2 §9.5).
    if (elevationGainM !== undefined && elevationGainM > 0) {
      push({ dimension: 'ascent_capacity' }, { amount: elevationGainM, unit: 'm_elevation_gain' }, isEstimatedElevation ? 'proxy' : 'direct');
    }

    // descent_tolerance stays fully independent of ascent (v0.2 §9.6) —
    // only ever derived from a real elevationLossM (outdoor only; there is
    // no treadmill equivalent for descent).
    if (elevationLossM !== undefined && elevationLossM > 0) {
      push({ dimension: 'descent_tolerance' }, { amount: elevationLossM, unit: 'm_elevation_loss' }, 'direct');
    }

    // load_carriage: pack weight actually carried, DIRECT (v0.2 §9.7).
    if (backpackWeightKg !== undefined && backpackWeightKg > 0) {
      push({ dimension: 'load_carriage' }, { amount: backpackWeightKg, unit: 'kg' }, 'direct');
    }

    // sustainable_output (pace) — discipline-specific, and only derived for
    // running: v0.2 §18.2 explicitly warns a cycling target speed without
    // route/wind/equipment context is unreliable, so no cycling pace
    // evidence is derived here either.
    if (discipline === 'running' && distanceKm !== undefined && distanceKm > 0 && log.durationMinutes > 0) {
      push({ dimension: 'sustainable_output', discipline }, { amount: log.durationMinutes / distanceKm, unit: 'min_per_km' }, 'derived');
    }
  }

  // strength: only when actual set/weight data exists — deliberately
  // produces NO evidence when strength is tracked externally (Strength
  // Program Strategy Addendum v0.1 §1/§4: ASCEND must not assume missing
  // exercise-level data means no strength training happened). Absence of
  // evidence here is never read as zero — computeCapabilityEstimate below
  // reads it as confidence: 'unknown', matching v0.2 §23's "missing data
  // is never interpreted as bad capability".
  if (log.type === 'strength' && log.strengthData && log.strengthData.length > 0) {
    const heaviestSet = log.strengthData
      .flatMap((exercise) => exercise.sets)
      .reduce<number>((max, set) => (set.weightKg !== undefined && set.weightKg > max ? set.weightKg : max), 0);
    if (heaviestSet > 0) {
      push({ dimension: 'strength' }, { amount: heaviestSet, unit: 'kg' }, 'direct');
    }
  }

  return evidence;
}

export function extractEvidenceFromLogs(logs: SessionLog[]): CapabilityEvidence[] {
  return logs.flatMap(extractEvidenceFromLog);
}

// --- Capability Engine: estimate from evidence (v0.2 §3, §6, §7) -----------

// Day thresholds are one more ASCEND_HEURISTIC (v0.2 §3: "no universal 28-
// day rule for capability", but a starting default is still needed until
// per-dimension windows are tuned later).
const RECENCY_BAND_MAX_DAYS: Record<'current' | 'supporting' | 'historical', number> = {
  current: 21,
  supporting: 56,
  historical: 120,
};

export function recencyBand(evidenceDate: string, asOf: string): RecencyBand {
  const ageDays = daysBetween(evidenceDate, asOf);
  if (ageDays <= RECENCY_BAND_MAX_DAYS.current) return 'current';
  if (ageDays <= RECENCY_BAND_MAX_DAYS.supporting) return 'supporting';
  if (ageDays <= RECENCY_BAND_MAX_DAYS.historical) return 'historical';
  return 'older';
}

// Direction-aware "is a more capable than b" — the single place this
// question is answered, reused by peak/repeatable-anchor/trend below.
function isBetter(a: MeasuredValue, b: MeasuredValue): boolean {
  return UNIT_COMPARISON_DIRECTION[a.unit] === 'higher_is_more' ? a.amount > b.amount : a.amount < b.amount;
}

function bestOf(values: MeasuredValue[]): MeasuredValue | undefined {
  return values.reduce<MeasuredValue | undefined>((acc, v) => (acc === undefined || isBetter(v, acc) ? v : acc), undefined);
}

function average(values: number[]): number | undefined {
  return values.length === 0 ? undefined : values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function computeCapabilityEstimate(key: CapabilityKey, allEvidence: CapabilityEvidence[], asOf: string): CapabilityEstimate {
  const matching = allEvidence.filter((e) => e.key.dimension === key.dimension && e.key.discipline === key.discipline);

  // No evidence at all: UNKNOWN, never a computed zero (v0.2 §23 — this is
  // the guarantee the Strength Program Strategy Addendum v0.1 leans on for
  // externally-tracked strength work).
  if (matching.length === 0) {
    return { key, confidence: 'unknown', unconfirmedPeak: false, evidenceRefs: [], asOf };
  }

  const withBand = matching.map((e) => ({ evidence: e, band: recencyBand(e.date, asOf) }));
  const peakExposure = bestOf(matching.map((e) => e.measured));

  // Repeatable anchor: corroborated by more than one current/supporting
  // data point, not a single outlier (v0.2 §7). Sorted best-first; the
  // SECOND-best of 2+ recent points is the anchor — deliberately not the
  // single best, which is exactly what peakExposure already captures.
  const recentOrSupporting = withBand.filter((e) => e.band === 'current' || e.band === 'supporting');
  const recentSortedBest = [...recentOrSupporting].sort((a, b) => (isBetter(a.evidence.measured, b.evidence.measured) ? -1 : 1));
  const repeatableAnchor: MeasuredValue | undefined =
    recentSortedBest.length >= 2 ? recentSortedBest[1].evidence.measured : recentSortedBest[0]?.evidence.measured;

  // Unconfirmed when the all-time peak isn't corroborated by that anchor —
  // e.g. one exceptional session weeks ago vs. several controlled recent
  // ones (v0.2 §7's "30 km once vs. 18-20 km repeatedly" example).
  const unconfirmedPeak =
    peakExposure !== undefined && (repeatableAnchor === undefined || peakExposure.amount !== repeatableAnchor.amount);

  const hasSubstantiveRecent = recentOrSupporting.some((e) => e.evidence.evidenceType === 'direct' || e.evidence.evidenceType === 'derived');
  const confidence: Confidence =
    recentOrSupporting.length >= 2 && hasSubstantiveRecent ? 'high' : recentOrSupporting.length >= 1 ? 'medium' : 'low';

  const currentAvg = average(withBand.filter((e) => e.band === 'current').map((e) => e.evidence.measured.amount));
  const supportingAvg = average(withBand.filter((e) => e.band === 'supporting').map((e) => e.evidence.measured.amount));
  let trend: CapabilityEstimate['trend'] = 'unknown';
  if (currentAvg !== undefined && supportingAvg !== undefined && supportingAvg !== 0) {
    const direction = UNIT_COMPARISON_DIRECTION[matching[0].measured.unit];
    const diff = direction === 'higher_is_more' ? currentAvg - supportingAvg : supportingAvg - currentAvg;
    const relativeDiff = diff / Math.abs(supportingAvg);
    trend = relativeDiff > 0.1 ? 'rising' : relativeDiff < -0.1 ? 'declining' : 'stable';
  }

  return {
    key,
    peakExposure,
    repeatableAnchor,
    confidence,
    trend,
    unconfirmedPeak,
    evidenceRefs: matching.map((e) => e.id),
    asOf,
  };
}

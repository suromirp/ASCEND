// ASCEND — Evidence-registry maintenance workflow (Technical Architecture
// v0.3.1 REVISED, Phase 6).
//
// Neither the Algorithm Contract nor the Technical Architecture specifies
// a concrete review cadence for this — it's named only as a roadmap bullet
// ("Evidence-registry maintenance workflow"). A one-year interval is one
// more ASCEND_HEURISTIC calibration value (versionable, like every other
// heuristic parameter in this codebase), not a claim about how fast
// exercise-science evidence actually goes stale. This module only
// identifies which entries are due — it never edits, removes, or
// re-classifies an entry itself; a human always makes that call.

import type { AlgorithmRuleMetadata, EvidenceSource } from '../models/evidence';
import { ALGORITHM_RULES } from '../data/algorithmRules';
import { EVIDENCE_REGISTRY } from '../data/evidenceRegistry';
import { daysBetween } from '../utils/dates';

const DEFAULT_REVIEW_INTERVAL_DAYS = 365;

export interface EvidenceReviewFlag {
  kind: 'rule' | 'evidence';
  id: string;
  lastReviewed: string;
  daysSinceReview: number;
}

export function findRulesDueForReview(
  asOf: string,
  intervalDays: number = DEFAULT_REVIEW_INTERVAL_DAYS,
  rules: AlgorithmRuleMetadata[] = ALGORITHM_RULES,
): EvidenceReviewFlag[] {
  return rules
    .map((r) => ({ kind: 'rule' as const, id: r.ruleId, lastReviewed: r.lastReviewed, daysSinceReview: daysBetween(r.lastReviewed, asOf) }))
    .filter((f) => f.daysSinceReview >= intervalDays);
}

export function findEvidenceDueForReview(
  asOf: string,
  intervalDays: number = DEFAULT_REVIEW_INTERVAL_DAYS,
  sources: EvidenceSource[] = EVIDENCE_REGISTRY,
): EvidenceReviewFlag[] {
  return sources
    .map((s) => ({ kind: 'evidence' as const, id: s.id, lastReviewed: s.lastReviewed, daysSinceReview: daysBetween(s.lastReviewed, asOf) }))
    .filter((f) => f.daysSinceReview >= intervalDays);
}

// Both registries at once, most-overdue first — the one entry point a
// maintenance check actually calls.
export function findEvidenceRegistryDueForReview(asOf: string, intervalDays: number = DEFAULT_REVIEW_INTERVAL_DAYS): EvidenceReviewFlag[] {
  return [...findRulesDueForReview(asOf, intervalDays), ...findEvidenceDueForReview(asOf, intervalDays)].sort(
    (a, b) => b.daysSinceReview - a.daysSinceReview,
  );
}

// ASCEND — algorithm rule metadata registry
//
// Seeded from Algorithm Contract v0.2c FINAL. `RULE-RUN-SPIKE-001` is the
// one rule the contract assigns a formal id to directly (§8, §60); every
// other entry here corresponds to an item from §69 ("What remains
// deliberately heuristic") — the contract names these as plain parameters,
// not formal rule ids, so this file assigns each a stable slug. None of
// these were consumed by any engine logic in Phase 1 ("no new training
// intelligence yet", Technical Architecture v0.3.1 REVISED) — this module
// exists so later phases have one place to look rule provenance up by id,
// never restated inline. Phase 3's Progression Orchestrator was the first
// consumer: `HEURISTIC-POOR-RESPONSE-2-OF-3` and
// `HEURISTIC-ACCUMULATION-REVIEW-3-PROGRESSIONS` (both already seeded here)
// plus five new entries added for that engine. Phase 4 (Feasibility Engine,
// Goal Focus, Goal Arbiter) consumes three more that were seeded here since
// Phase 1 but unused until now: `HEURISTIC-FEASIBILITY-CATEGORY-SIMULATION`,
// `HEURISTIC-GOAL-FOCUS-WEIGHTS`, and `HEURISTIC-ADVENTURE-FRESHEN` (the
// taper/freshen trigger) — no new rule entries were needed for Phase 4.

import type { AlgorithmRuleMetadata } from '../models/evidence';

const REVIEWED = '2026-09-05';

export const ALGORITHM_RULES: AlgorithmRuleMetadata[] = [
  {
    ruleId: 'RULE-RUN-SPIKE-001',
    ruleClass: 'evidence_backed',
    evidenceStrength: 'moderate',
    populationDirectness: 'medium',
    evidenceRefs: ['E-RUN-PROG-001'],
    limitations: ['observational; not the general capability window — uses longest running session in preceding 30 days, matching the studied exposure definition'],
    lastReviewed: REVIEWED,
    ruleVersion: 1,
  },
  // --- §69: deliberately heuristic, versionable calibration parameters ---
  {
    ruleId: 'HEURISTIC-RECENCY-BANDS',
    ruleClass: 'ascend_heuristic',
    evidenceStrength: 'heuristic',
    populationDirectness: 'low',
    evidenceRefs: [],
    limitations: ['discrete bands (current/supporting/historical/older) used directly — no continuous decay curve'],
    lastReviewed: REVIEWED,
    ruleVersion: 1,
  },
  {
    ruleId: 'HEURISTIC-REPEATABLE-ANCHOR-FORMULA',
    ruleClass: 'ascend_heuristic',
    evidenceStrength: 'heuristic',
    populationDirectness: 'low',
    evidenceRefs: [],
    limitations: [],
    lastReviewed: REVIEWED,
    ruleVersion: 1,
  },
  {
    ruleId: 'HEURISTIC-PEAK-CONFIRMATION-TOLERANCE',
    ruleClass: 'ascend_heuristic',
    evidenceStrength: 'heuristic',
    populationDirectness: 'low',
    evidenceRefs: [],
    limitations: ['±5% peak-confirmation tolerance'],
    lastReviewed: REVIEWED,
    ruleVersion: 1,
  },
  {
    ruleId: 'HEURISTIC-RUNNING-PROGRESSION-BANDS',
    ruleClass: 'ascend_heuristic',
    evidenceStrength: 'heuristic',
    populationDirectness: 'low',
    evidenceRefs: ['E-MARATHON-001', 'E-MARATHON-002'],
    limitations: [],
    lastReviewed: REVIEWED,
    ruleVersion: 1,
  },
  {
    ruleId: 'HEURISTIC-CYCLING-PROGRESSION-BANDS',
    ruleClass: 'ascend_heuristic',
    evidenceStrength: 'heuristic',
    populationDirectness: 'low',
    evidenceRefs: ['E-CYCLE-001', 'E-CYCLE-002'],
    limitations: [],
    lastReviewed: REVIEWED,
    ruleVersion: 1,
  },
  {
    ruleId: 'HEURISTIC-ELEVATION-PROGRESSION-BANDS',
    ruleClass: 'ascend_heuristic',
    evidenceStrength: 'heuristic',
    populationDirectness: 'low',
    evidenceRefs: [],
    limitations: ['D+/D- progression bands'],
    lastReviewed: REVIEWED,
    ruleVersion: 1,
  },
  {
    ruleId: 'HEURISTIC-VERTICAL-SWITCH-300M',
    ruleClass: 'ascend_heuristic',
    evidenceStrength: 'heuristic',
    populationDirectness: 'low',
    evidenceRefs: [],
    limitations: ['~300 m vertical switch — corrected for low vertical baselines'],
    lastReviewed: REVIEWED,
    ruleVersion: 1,
  },
  {
    ruleId: 'HEURISTIC-PACK-WEIGHT-BANDS',
    ruleClass: 'ascend_heuristic',
    evidenceStrength: 'heuristic',
    populationDirectness: 'low',
    evidenceRefs: ['E-PACK-001'],
    limitations: ['pack percentage bands and absolute caps — all exact caps are ASCEND_HEURISTIC; corrected for heavy pack jumps'],
    lastReviewed: REVIEWED,
    ruleVersion: 1,
  },
  {
    ruleId: 'HEURISTIC-POOR-RESPONSE-2-OF-3',
    ruleClass: 'ascend_heuristic',
    evidenceStrength: 'heuristic',
    populationDirectness: 'low',
    evidenceRefs: [],
    limitations: ['2-of-3 poor-response rule'],
    lastReviewed: REVIEWED,
    ruleVersion: 1,
  },
  {
    ruleId: 'HEURISTIC-ACCUMULATION-REVIEW-3-PROGRESSIONS',
    ruleClass: 'ascend_heuristic',
    evidenceStrength: 'heuristic',
    populationDirectness: 'low',
    evidenceRefs: [],
    limitations: ['3-progression accumulation review'],
    lastReviewed: REVIEWED,
    ruleVersion: 1,
  },
  {
    ruleId: 'HEURISTIC-TID-SAMPLE-SIZE',
    ruleClass: 'ascend_heuristic',
    evidenceStrength: 'heuristic',
    populationDirectness: 'low',
    evidenceRefs: ['E-RUN-TID-001', 'E-RUN-TID-002', 'E-RUN-TID-005'],
    limitations: ['TID sample-size rule — corrected for sparse TID data'],
    lastReviewed: REVIEWED,
    ruleVersion: 1,
  },
  {
    ruleId: 'HEURISTIC-LEG-HEAVY-SPACING-PRESETS',
    ruleClass: 'ascend_heuristic',
    evidenceStrength: 'heuristic',
    populationDirectness: 'low',
    evidenceRefs: ['E-CONCURRENT-001', 'E-CONCURRENT-004'],
    limitations: ['leg-heavy spacing presets — corrected for easy-session leg-spacing false positives; not a universal 48-hour separation law'],
    lastReviewed: REVIEWED,
    ruleVersion: 1,
  },
  {
    ruleId: 'HEURISTIC-ADVENTURE-FRESHEN',
    ruleClass: 'ascend_heuristic',
    evidenceStrength: 'heuristic',
    populationDirectness: 'low',
    evidenceRefs: ['E-TAPER-001', 'E-TAPER-002'],
    limitations: ['adventure freshen'],
    lastReviewed: REVIEWED,
    ruleVersion: 1,
  },
  {
    ruleId: 'HEURISTIC-GOAL-FOCUS-WEIGHTS',
    ruleClass: 'ascend_heuristic',
    evidenceStrength: 'heuristic',
    populationDirectness: 'low',
    evidenceRefs: [],
    limitations: ['Goal Focus weights'],
    lastReviewed: REVIEWED,
    ruleVersion: 1,
  },
  {
    ruleId: 'HEURISTIC-FEASIBILITY-CATEGORY-SIMULATION',
    ruleClass: 'ascend_heuristic',
    evidenceStrength: 'heuristic',
    populationDirectness: 'low',
    evidenceRefs: [],
    limitations: ['feasibility category simulation — corrected for impossible-goal Focus inflation'],
    lastReviewed: REVIEWED,
    ruleVersion: 1,
  },
  // --- Phase 3: Progression Orchestrator (engine/progressionOrchestrator.ts) ---
  {
    ruleId: 'HEURISTIC-PROGRESSION-READINESS-GATE',
    ruleClass: 'ascend_heuristic',
    evidenceStrength: 'heuristic',
    populationDirectness: 'low',
    evidenceRefs: ['E-RECOVERY-001', 'E-RECOVERY-002', 'E-RECOVERY-003', 'E-RECOVERY-004'],
    limitations: ['the underlying "readiness is multi-signal" principle is evidence-backed (RULE-RECOVERY-MULTI-001); the specific cutoff percentages this rule applies to engine/readiness.ts\'s existing 0-100 scores are ASCEND\'s own calibration, not derived from those sources'],
    lastReviewed: REVIEWED,
    ruleVersion: 1,
  },
  {
    ruleId: 'HEURISTIC-PROGRESSION-TREND-GATE',
    ruleClass: 'ascend_heuristic',
    evidenceStrength: 'heuristic',
    populationDirectness: 'low',
    evidenceRefs: [],
    limitations: ['a declining CapabilityEstimate trend caps the decision at consolidate — a safety default, not a formula (v0.2b REVISED §12: one bad session never wipes capability, but a declining trend is a different, stronger signal)'],
    lastReviewed: REVIEWED,
    ruleVersion: 1,
  },
  {
    ruleId: 'HEURISTIC-PROGRESSION-CONFIDENCE-GATE',
    ruleClass: 'ascend_heuristic',
    evidenceStrength: 'heuristic',
    populationDirectness: 'low',
    evidenceRefs: [],
    limitations: ['maps CapabilityEstimate.confidence (low/medium/high) to a progression state — ASCEND\'s own calibration, not a validated confidence-to-load-progression formula'],
    lastReviewed: REVIEWED,
    ruleVersion: 1,
  },
  {
    ruleId: 'PRODUCT-ASSESS-INSUFFICIENT-DATA',
    ruleClass: 'product_rule',
    evidenceStrength: 'heuristic',
    populationDirectness: 'low',
    evidenceRefs: [],
    limitations: ['product policy, not a physiological claim: confidence "unknown" always resolves to the assess state, never a guessed progression (v0.2 §23 — missing data is never interpreted as bad capability)'],
    lastReviewed: REVIEWED,
    ruleVersion: 1,
  },
  {
    ruleId: 'PRODUCT-GUARDRAIL-BLOCK',
    ruleClass: 'product_rule',
    evidenceStrength: 'heuristic',
    populationDirectness: 'low',
    evidenceRefs: [],
    limitations: ['product policy: a user-configured block guardrail caps an intended progress decision down to consolidate, never silently overridden (v0.2b REVISED §1.3 — a deadline does not overrule a guardrail silently)'],
    lastReviewed: REVIEWED,
    ruleVersion: 1,
  },
];

export function findAlgorithmRule(ruleId: string): AlgorithmRuleMetadata | undefined {
  return ALGORITHM_RULES.find((r) => r.ruleId === ruleId);
}

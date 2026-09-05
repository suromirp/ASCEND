// ASCEND — evidence & rule provenance (Technical Architecture v0.3.1
// REVISED, review point 12). Every numerical threshold ASCEND ever enforces
// must either reference an entry here or be explicitly labelled
// 'ascend_heuristic' (Algorithm Contract v0.2c §9/§69) — this file only
// defines the shape; the actual seeded content lives in
// data/evidenceRegistry.ts and data/algorithmRules.ts, one static module
// referenced everywhere by id, never restated inline.

export type RuleClass = 'evidence_backed' | 'evidence_informed' | 'ascend_heuristic' | 'product_rule';
export type EvidenceStrength = 'strong' | 'moderate' | 'limited' | 'heuristic';
export type PopulationDirectness = 'high' | 'medium' | 'low';
export type PublicationType =
  | 'systematic_review' | 'meta_analysis' | 'rct' | 'cohort_study'
  | 'cross_sectional' | 'case_series' | 'consensus_statement' | 'other';

export interface EvidenceSource {
  id: string;
  title: string;
  authors: string;
  year?: number;
  publicationType: PublicationType;
  url: string;
  population?: string;
  supports: string[];
  limitations: string[];
  lastReviewed: string;
}

export interface AlgorithmRuleMetadata {
  ruleId: string;
  ruleClass: RuleClass;
  evidenceStrength: EvidenceStrength;
  populationDirectness: PopulationDirectness;
  evidenceRefs: string[];
  limitations: string[];
  lastReviewed: string;
  ruleVersion: number;
}

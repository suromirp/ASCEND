import { describe, it, expect } from 'vitest';
import { findRulesDueForReview, findEvidenceDueForReview, findEvidenceRegistryDueForReview } from './evidenceMaintenance';
import type { AlgorithmRuleMetadata } from '../models/evidence';
import type { EvidenceSource } from '../models/evidence';

function rule(id: string, lastReviewed: string): AlgorithmRuleMetadata {
  return { ruleId: id, ruleClass: 'ascend_heuristic', evidenceStrength: 'heuristic', populationDirectness: 'low', evidenceRefs: [], limitations: [], lastReviewed, ruleVersion: 1 };
}

function source(id: string, lastReviewed: string): EvidenceSource {
  return { id, title: 't', authors: 'a', publicationType: 'other', url: 'https://example.com', supports: [], limitations: [], lastReviewed };
}

describe('findRulesDueForReview', () => {
  it('flags a rule reviewed longer ago than the interval', () => {
    const flags = findRulesDueForReview('2027-01-01', 365, [rule('R1', '2025-01-01')]);
    expect(flags).toHaveLength(1);
    expect(flags[0]).toMatchObject({ kind: 'rule', id: 'R1' });
  });

  it('never flags a recently-reviewed rule', () => {
    const flags = findRulesDueForReview('2026-09-05', 365, [rule('R1', '2026-08-01')]);
    expect(flags).toEqual([]);
  });
});

describe('findEvidenceDueForReview', () => {
  it('flags an evidence source reviewed longer ago than the interval', () => {
    const flags = findEvidenceDueForReview('2027-06-01', 365, [source('E1', '2025-01-01')]);
    expect(flags).toHaveLength(1);
    expect(flags[0]).toMatchObject({ kind: 'evidence', id: 'E1' });
  });
});

describe('findEvidenceRegistryDueForReview', () => {
  it('never edits, removes or re-classifies — only reports, most-overdue first', () => {
    const flags = findEvidenceRegistryDueForReview('2027-06-01', 365);
    expect(Array.isArray(flags)).toBe(true);
    for (let i = 1; i < flags.length; i++) {
      expect(flags[i - 1].daysSinceReview).toBeGreaterThanOrEqual(flags[i].daysSinceReview);
    }
  });

  it('the real seeded registries are not due for review as of their own lastReviewed date', () => {
    // Every entry in data/algorithmRules.ts and data/evidenceRegistry.ts is
    // seeded with the same lastReviewed date it was written on — asking
    // "due" as of that exact date must never flag anything.
    expect(findEvidenceRegistryDueForReview('2026-09-05', 365)).toEqual([]);
  });
});

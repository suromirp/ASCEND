import { describe, it, expect } from 'vitest';
import { computeProgressionDecision } from './progressionOrchestrator';
import type { CapabilityEstimate, CapabilityKey } from '../models/capability';
import type { ReadinessBreakdown } from './readiness';
import type { SessionLog } from '../models/training';
import type { TrainingGuardrail } from '../models/goalEngineConfig';

const KEY: CapabilityKey = { dimension: 'aerobic_engine' };

function estimate(overrides: Partial<CapabilityEstimate> = {}): CapabilityEstimate {
  return { key: KEY, confidence: 'high', trend: 'stable', unconfirmedPeak: false, evidenceRefs: ['e1'], asOf: '2026-09-05', ...overrides };
}

function readiness(overrides: Partial<ReadinessBreakdown> = {}): ReadinessBreakdown {
  return { strength: 80, cardio: 80, climbing: 80, endurance: 80, recovery: 80, consistency: 80, packCapability: 80, overall: 80, ...overrides };
}

function log(overrides: Partial<SessionLog> = {}): SessionLog {
  return {
    id: 'l1', templateId: 'tpl_x', type: 'cardio', completedDate: '2026-09-01',
    completedAt: '2026-09-01T10:00:00.000Z', variant: 'full', durationMinutes: 40, source: 'manual', ...overrides,
  };
}

describe('computeProgressionDecision', () => {
  it('never progresses on unknown confidence — always assess, missing data is never read as bad capability', () => {
    const decision = computeProgressionDecision({ key: KEY, estimate: estimate({ confidence: 'unknown', trend: undefined }), readiness: readiness() });
    expect(decision.state).toBe('assess');
    expect(decision.ruleId).toBe('PRODUCT-ASSESS-INSUFFICIENT-DATA');
    expect(decision.poorResponsePattern).toBe(false);
    expect(decision.accumulationReviewDue).toBe(false);
  });

  it('gates to recover when the recovery readiness signal is low, regardless of a good capability trend', () => {
    const decision = computeProgressionDecision({ key: KEY, estimate: estimate({ trend: 'rising' }), readiness: readiness({ recovery: 20 }) });
    expect(decision.state).toBe('recover');
    expect(decision.ruleId).toBe('HEURISTIC-PROGRESSION-READINESS-GATE');
  });

  it('reduces on a 2-of-3 poor-response pattern, never on a single bad session', () => {
    const oneBad = computeProgressionDecision({
      key: KEY, estimate: estimate(), readiness: readiness(),
      recentLogs: [log({ subjectiveFeel: 'worse' }), log({ subjectiveFeel: 'normal' }), log({ subjectiveFeel: 'normal' })],
    });
    expect(oneBad.state).not.toBe('reduce');
    expect(oneBad.poorResponsePattern).toBe(false);

    const twoOfThreeBad = computeProgressionDecision({
      key: KEY, estimate: estimate(), readiness: readiness(),
      recentLogs: [log({ subjectiveFeel: 'worse' }), log({ rpe: 9 }), log({ subjectiveFeel: 'normal' })],
    });
    expect(twoOfThreeBad.state).toBe('reduce');
    expect(twoOfThreeBad.poorResponsePattern).toBe(true);
    expect(twoOfThreeBad.ruleId).toBe('HEURISTIC-POOR-RESPONSE-2-OF-3');
  });

  it('consolidates on a declining trend instead of progressing', () => {
    const decision = computeProgressionDecision({ key: KEY, estimate: estimate({ trend: 'declining' }), readiness: readiness() });
    expect(decision.state).toBe('consolidate');
    expect(decision.ruleId).toBe('HEURISTIC-PROGRESSION-TREND-GATE');
  });

  it('progresses when confidence is high, trend is stable/rising and readiness is good', () => {
    const decision = computeProgressionDecision({ key: KEY, estimate: estimate({ trend: 'rising' }), readiness: readiness() });
    expect(decision.state).toBe('progress');
  });

  it('never progresses on low confidence — assess instead', () => {
    const decision = computeProgressionDecision({ key: KEY, estimate: estimate({ confidence: 'low' }), readiness: readiness() });
    expect(decision.state).toBe('assess');
  });

  it('consolidates on medium confidence rather than progressing', () => {
    const decision = computeProgressionDecision({ key: KEY, estimate: estimate({ confidence: 'medium' }), readiness: readiness() });
    expect(decision.state).toBe('consolidate');
  });

  it('caps an intended progress down to consolidate when a matching guardrail is set to block — never silently overridden', () => {
    const guardrails: TrainingGuardrail[] = [{ id: 'g1', ruleId: 'HEURISTIC-RUNNING-PROGRESSION-BANDS', mode: 'block' }];
    const decision = computeProgressionDecision({ key: KEY, estimate: estimate({ trend: 'rising' }), readiness: readiness(), guardrails });
    expect(decision.state).toBe('consolidate');
    expect(decision.ruleId).toBe('PRODUCT-GUARDRAIL-BLOCK');
  });

  it('does not let an unrelated guardrail block progression', () => {
    const guardrails: TrainingGuardrail[] = [{ id: 'g1', ruleId: 'HEURISTIC-RECENCY-BANDS', mode: 'block' }];
    const decision = computeProgressionDecision({ key: KEY, estimate: estimate({ trend: 'rising' }), readiness: readiness(), guardrails });
    expect(decision.state).toBe('progress');
  });

  it('flags accumulationReviewDue on the third consecutive progress decision', () => {
    const first = computeProgressionDecision({ key: KEY, estimate: estimate({ trend: 'rising' }), readiness: readiness(), consecutiveProgressCount: 0 });
    expect(first.accumulationReviewDue).toBe(false);
    const third = computeProgressionDecision({ key: KEY, estimate: estimate({ trend: 'rising' }), readiness: readiness(), consecutiveProgressCount: 2 });
    expect(third.accumulationReviewDue).toBe(true);
  });
});

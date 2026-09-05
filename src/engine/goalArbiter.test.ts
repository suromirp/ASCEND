import { describe, it, expect } from 'vitest';
import { detectContestedSlots, arbitrateContestedSlot, applyTaperOverride, preserveStrengthRole, TAPER_WINDOW_DAYS } from './goalArbiter';
import type { SessionContribution, GoalFocus } from '../models/feasibility';
import type { ProgressionDecision } from '../models/progression';

function contribution(overrides: Partial<SessionContribution> = {}): SessionContribution {
  return { plannedSessionId: 'ps1', goalId: 'gr5', capabilityKeys: [{ dimension: 'ascent_capacity' }], ...overrides };
}

function focus(goalId: string, normalizedPct: number): GoalFocus {
  return { goalId, score: normalizedPct, normalizedPct, reasons: [], asOf: '2026-09-05' };
}

function decision(overrides: Partial<ProgressionDecision> = {}): ProgressionDecision {
  return {
    key: { dimension: 'ascent_capacity' },
    state: 'progress',
    reason: 'test reason',
    ruleId: 'HEURISTIC-PROGRESSION-CONFIDENCE-GATE',
    poorResponsePattern: false,
    accumulationReviewDue: false,
    ...overrides,
  };
}

describe('detectContestedSlots', () => {
  it('finds no contested slot when every session serves only one goal', () => {
    const slots = detectContestedSlots([contribution({ plannedSessionId: 'ps1', goalId: 'gr5' }), contribution({ plannedSessionId: 'ps2', goalId: 'marathon' })]);
    expect(slots).toEqual([]);
  });

  it('detects one session covering multiple goals — the real tpl_long_run case', () => {
    const slots = detectContestedSlots([
      contribution({ plannedSessionId: 'ps1', goalId: 'gr5' }),
      contribution({ plannedSessionId: 'ps1', goalId: 'marathon' }),
    ]);
    expect(slots).toHaveLength(1);
    expect(slots[0].goalIds.sort()).toEqual(['gr5', 'marathon']);
  });
});

describe('arbitrateContestedSlot', () => {
  it('the goal with the highest Goal Focus wins, the other is deprioritized but never removed', () => {
    const goalFocusById = new Map([['gr5', focus('gr5', 70)], ['marathon', focus('marathon', 30)]]);
    const result = arbitrateContestedSlot({ plannedSessionId: 'ps1', goalIds: ['marathon', 'gr5'] }, goalFocusById);
    expect(result.winningGoalId).toBe('gr5');
    expect(result.deprioritizedGoalIds).toEqual(['marathon']);
  });

  it('breaks ties deterministically by goalId — same input always produces the same output', () => {
    const goalFocusById = new Map([['a', focus('a', 50)], ['b', focus('b', 50)]]);
    const r1 = arbitrateContestedSlot({ plannedSessionId: 'ps1', goalIds: ['b', 'a'] }, goalFocusById);
    const r2 = arbitrateContestedSlot({ plannedSessionId: 'ps1', goalIds: ['b', 'a'] }, goalFocusById);
    expect(r1.winningGoalId).toBe('a');
    expect(r1).toEqual(r2);
  });
});

describe('applyTaperOverride', () => {
  it('overrides a non-recover decision to taper within the taper window', () => {
    const result = applyTaperOverride(decision({ state: 'progress' }), 10);
    expect(result.state).toBe('taper');
    expect(result.ruleId).toBe('HEURISTIC-ADVENTURE-FRESHEN');
  });

  it('never overrides a genuine recover decision — a real recovery need is never masked by tapering', () => {
    const result = applyTaperOverride(decision({ state: 'recover' }), 5);
    expect(result.state).toBe('recover');
  });

  it('leaves the decision untouched outside the taper window', () => {
    const result = applyTaperOverride(decision({ state: 'progress' }), TAPER_WINDOW_DAYS + 5);
    expect(result.state).toBe('progress');
  });

  it('leaves the decision untouched when there is no goal date at all', () => {
    const result = applyTaperOverride(decision({ state: 'progress' }), undefined);
    expect(result.state).toBe('progress');
  });

  it('does not re-taper a decision already in taper', () => {
    const already = decision({ state: 'taper', ruleId: 'some-other-rule' });
    const result = applyTaperOverride(already, 5);
    expect(result).toEqual(already);
  });
});

describe('preserveStrengthRole', () => {
  it('never demotes strength below maintenance when protection is normal or high', () => {
    expect(preserveStrengthRole('optional', 'normal')).toBe('maintenance');
    expect(preserveStrengthRole('optional', 'high')).toBe('maintenance');
  });

  it('leaves the role untouched when protection is explicitly low', () => {
    expect(preserveStrengthRole('optional', 'low')).toBe('optional');
  });

  it('never touches a role that is already at or above maintenance', () => {
    expect(preserveStrengthRole('key', 'high')).toBe('key');
    expect(preserveStrengthRole('maintenance', 'high')).toBe('maintenance');
  });
});

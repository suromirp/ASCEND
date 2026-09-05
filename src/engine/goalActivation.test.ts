import { describe, it, expect } from 'vitest';
import { computeGoalActivationPlan, computeInputStateHash, isGoalActivationPlanStale, applyGoalActivationPlan } from './goalActivation';
import type { TrainingGoal } from '../models/goals';
import type { CapabilityEvidence } from '../models/capability';
import type { PlannedSession, SessionTemplate } from '../models/training';
import type { TrainingAvailability } from '../models/goalEngineConfig';

const ASOF = '2026-09-09';

function availability(): TrainingAvailability {
  return { allowedDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], maxSessionDurationMin: {}, longSessionDays: ['sun'], temporaryExceptions: [] };
}

function goalDraft(overrides: Partial<TrainingGoal> = {}): TrainingGoal {
  return {
    id: 'g1',
    name: 'Test Goal',
    status: 'active',
    targetDate: '2026-12-01',
    requirements: [{ id: 'r1', kind: 'elevationGain', scope: 'SINGLE_EVENT', target: { amount: 1000, unit: 'm_elevation_gain' } }],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as TrainingGoal;
}

const tplLongRun: SessionTemplate = { id: 'tpl_long_run', name: 'Lange Duurloop', type: 'hiking', durationVariants: { full: 75 }, outdoorTarget: { targetElevationM: 300 } };

function committedSession(id: string, weekStartDate: string): PlannedSession {
  return { id, templateId: 'tpl_long_run', scheduledDate: weekStartDate, weekStartDate, status: 'planned', order: 0 };
}

describe('computeGoalActivationPlan — INSUFFICIENT_DATA is a real blocker', () => {
  it('proposes NO committed-range changes when there is zero capability evidence, even if a matching session exists in the committed range', () => {
    const plan = computeGoalActivationPlan({
      goalDraft: goalDraft(),
      allEvidence: [],
      availability: availability(),
      guardrails: [],
      plannedSessions: [committedSession('ps1', '2026-09-07')],
      templates: [tplLongRun],
      asOf: ASOF,
    });
    expect(plan.feasibility.status).toBe('insufficient_data');
    expect(plan.committedWeekChanges.changes).toEqual([]);
  });

  it('proposes real "keep" entries once real evidence makes the goal assessable and a committed-range session genuinely contributes', () => {
    const evidence: CapabilityEvidence[] = [
      { id: 'e1', key: { dimension: 'ascent_capacity' }, measured: { amount: 950, unit: 'm_elevation_gain' }, date: '2026-08-20', evidenceType: 'manual', source: 'manualEntry' },
      { id: 'e2', key: { dimension: 'ascent_capacity' }, measured: { amount: 900, unit: 'm_elevation_gain' }, date: '2026-08-25', evidenceType: 'manual', source: 'manualEntry' },
    ];
    const plan = computeGoalActivationPlan({
      goalDraft: goalDraft(),
      allEvidence: evidence,
      availability: availability(),
      guardrails: [],
      plannedSessions: [committedSession('ps1', '2026-09-07')],
      templates: [tplLongRun],
      asOf: ASOF,
    });
    expect(plan.feasibility.status).not.toBe('insufficient_data');
    expect(plan.committedWeekChanges.changes).toEqual([{ plannedSessionId: 'ps1', action: 'keep' }]);
  });

  it('never proposes a change for a session outside the committed range, regardless of feasibility', () => {
    const evidence: CapabilityEvidence[] = [
      { id: 'e1', key: { dimension: 'ascent_capacity' }, measured: { amount: 950, unit: 'm_elevation_gain' }, date: '2026-08-20', evidenceType: 'manual', source: 'manualEntry' },
      { id: 'e2', key: { dimension: 'ascent_capacity' }, measured: { amount: 900, unit: 'm_elevation_gain' }, date: '2026-08-25', evidenceType: 'manual', source: 'manualEntry' },
    ];
    const forecastSession = committedSession('ps_forecast', '2026-09-28'); // three weeks out
    const plan = computeGoalActivationPlan({
      goalDraft: goalDraft(),
      allEvidence: evidence,
      availability: availability(),
      guardrails: [],
      plannedSessions: [forecastSession],
      templates: [tplLongRun],
      asOf: ASOF,
    });
    expect(plan.committedWeekChanges.changes).toEqual([]);
    expect(plan.forecastChanges.changes).toEqual([]);
  });

  it('forecastChanges is always summary-level (no concrete changes) — the live Adaptive Replanner is Phase 6', () => {
    const plan = computeGoalActivationPlan({
      goalDraft: goalDraft(), allEvidence: [], availability: availability(), guardrails: [],
      plannedSessions: [], templates: [tplLongRun], asOf: ASOF,
    });
    expect(plan.forecastChanges.changes).toEqual([]);
  });

  it('includes preparationTargets/gaps/strategyOptions from the existing engines, never recomputed ad hoc', () => {
    const plan = computeGoalActivationPlan({
      goalDraft: goalDraft(), allEvidence: [], availability: availability(), guardrails: [],
      plannedSessions: [], templates: [tplLongRun], asOf: ASOF,
    });
    expect(plan.gaps.length).toBeGreaterThan(0);
    expect(plan.strategyOptions.length).toBeGreaterThan(0);
  });
});

describe('computeInputStateHash / isGoalActivationPlanStale', () => {
  it('is stable for identical input', () => {
    const inputs = { goalDraft: goalDraft(), allEvidence: [], plannedSessions: [] };
    expect(computeInputStateHash(inputs)).toBe(computeInputStateHash(inputs));
  });

  it('changes when the goal draft requirements change', () => {
    const a = computeInputStateHash({ goalDraft: goalDraft(), allEvidence: [], plannedSessions: [] });
    const b = computeInputStateHash({ goalDraft: goalDraft({ requirements: [] }), allEvidence: [], plannedSessions: [] });
    expect(a).not.toBe(b);
  });

  it('changes when new capability evidence arrives', () => {
    const a = computeInputStateHash({ goalDraft: goalDraft(), allEvidence: [], plannedSessions: [] });
    const b = computeInputStateHash({
      goalDraft: goalDraft(), plannedSessions: [],
      allEvidence: [{ id: 'e1', key: { dimension: 'ascent_capacity' }, measured: { amount: 900, unit: 'm_elevation_gain' }, date: '2026-08-25', evidenceType: 'manual', source: 'manualEntry' }],
    });
    expect(a).not.toBe(b);
  });

  it('isGoalActivationPlanStale detects a hash mismatch', () => {
    const plan = computeGoalActivationPlan({ goalDraft: goalDraft(), allEvidence: [], availability: availability(), guardrails: [], plannedSessions: [], templates: [], asOf: ASOF });
    expect(isGoalActivationPlanStale(plan, plan.inputStateHash)).toBe(false);
    expect(isGoalActivationPlanStale(plan, 'some-other-hash')).toBe(true);
  });
});

describe('applyGoalActivationPlan — the single-transaction activation flow', () => {
  it('refuses to apply a stale plan (input changed since the plan was shown)', () => {
    const plan = computeGoalActivationPlan({ goalDraft: goalDraft(), allEvidence: [], availability: availability(), guardrails: [], plannedSessions: [], templates: [], asOf: ASOF });
    const result = applyGoalActivationPlan(plan, 'a-different-hash', []);
    expect(result).toEqual({ applied: false, reason: 'stale' });
  });

  it('applies a fresh plan and never mutates the schedule when feasibility was insufficient_data', () => {
    const sessions = [committedSession('ps1', '2026-09-07')];
    const plan = computeGoalActivationPlan({
      goalDraft: goalDraft(), allEvidence: [], availability: availability(), guardrails: [],
      plannedSessions: sessions, templates: [tplLongRun], asOf: ASOF,
    });
    const result = applyGoalActivationPlan(plan, plan.inputStateHash, sessions);
    expect(result.applied).toBe(true);
    expect(result.updatedSessions).toEqual(sessions); // unchanged — no unfounded replanning
  });
});

import { describe, it, expect } from 'vitest';
import { inferCapabilityKeysForTemplate, resolveSessionContributions, type GoalDemand } from './sessionContribution';
import { computeDemand } from './demand';
import { computeActiveGoalOverviews } from './goalOverview';
import type { SessionTemplate, PlannedSession } from '../models/training';
import type { CapabilityDemand } from '../models/capability';
import type { TrainingGoal } from '../models/goals';
import type { TrainingAvailability } from '../models/goalEngineConfig';

function template(overrides: Partial<SessionTemplate> = {}): SessionTemplate {
  return { id: 'tpl_x', name: 'Test', type: 'cardio', durationVariants: { full: 30 }, ...overrides };
}

function planned(overrides: Partial<PlannedSession> = {}): PlannedSession {
  return { id: 'ps1', templateId: 'tpl_x', scheduledDate: '2026-09-05', weekStartDate: '2026-09-01', status: 'planned', order: 0, ...overrides };
}

describe('inferCapabilityKeysForTemplate', () => {
  it('infers running-discipline keys for a cardio template', () => {
    const keys = inferCapabilityKeysForTemplate(template({ type: 'cardio' }));
    expect(keys).toContainEqual({ dimension: 'endurance_duration', discipline: 'running' });
    expect(keys).toContainEqual({ dimension: 'sustainable_output', discipline: 'running' });
  });

  it('infers hiking-discipline keys plus descent_tolerance only for a real hike with elevation', () => {
    const hike = inferCapabilityKeysForTemplate(template({ type: 'hiking', outdoorTarget: { targetElevationM: 300 } }));
    expect(hike).toContainEqual({ dimension: 'endurance_duration', discipline: 'hiking' });
    expect(hike).toContainEqual({ dimension: 'ascent_capacity' });
    expect(hike).toContainEqual({ dimension: 'descent_tolerance' });
  });

  it('never infers descent_tolerance for a non-hiking template even with an elevation target', () => {
    const inclineRun = inferCapabilityKeysForTemplate(template({ type: 'cardio', outdoorTarget: { targetElevationM: 200 } }));
    expect(inclineRun).not.toContainEqual({ dimension: 'descent_tolerance' });
  });

  it('infers no aerobic_engine for a recovery session', () => {
    const keys = inferCapabilityKeysForTemplate(template({ type: 'recovery' }));
    expect(keys).not.toContainEqual({ dimension: 'aerobic_engine' });
  });

  it('infers strength for a strength template', () => {
    const keys = inferCapabilityKeysForTemplate(template({ type: 'strength' }));
    expect(keys).toContainEqual({ dimension: 'strength' });
  });
});

describe('resolveSessionContributions', () => {
  // Grounded in this repo's real data/defaultProgram.ts: tpl_long_run is a
  // 'hiking' template with real outdoor D+ — the actual session that serves
  // both an active GR5 goal (elevationGain/distance demand) and an active
  // marathon goal (endurance_duration/running demand) at once.
  const tplLongRun = template({
    id: 'tpl_long_run', type: 'hiking', outdoorTarget: { targetElevationM: 300 },
  });

  it('detects one session covering multiple goals when their demands overlap its inferred keys', () => {
    const gr5Demands: CapabilityDemand[] = [{ key: { dimension: 'ascent_capacity' }, demand: { amount: 1000, unit: 'm_elevation_gain' }, criticality: 'critical' }];
    const marathonDemands: CapabilityDemand[] = [{ key: { dimension: 'endurance_duration', discipline: 'hiking' }, demand: { amount: 42, unit: 'km' }, criticality: 'critical' }];

    const contributions = resolveSessionContributions(
      [planned({ id: 'ps1', templateId: 'tpl_long_run' })],
      [tplLongRun],
      [{ goalId: 'gr5', demands: gr5Demands }, { goalId: 'marathon', demands: marathonDemands }],
    );

    const goalIds = contributions.filter((c) => c.plannedSessionId === 'ps1').map((c) => c.goalId);
    expect(goalIds.sort()).toEqual(['gr5', 'marathon']);
  });

  it('produces no contribution for a goal whose demand does not overlap the session at all', () => {
    const unrelatedDemands: CapabilityDemand[] = [{ key: { dimension: 'strength' }, demand: { amount: 80, unit: 'kg' }, criticality: 'critical' }];
    const contributions = resolveSessionContributions(
      [planned({ id: 'ps1', templateId: 'tpl_long_run' })],
      [tplLongRun],
      [{ goalId: 'unrelated', demands: unrelatedDemands }],
    );
    expect(contributions).toEqual([]);
  });

  it('skips a planned session whose template cannot be found', () => {
    const contributions = resolveSessionContributions(
      [planned({ id: 'ps1', templateId: 'tpl_missing' })],
      [tplLongRun],
      [{ goalId: 'gr5', demands: [{ key: { dimension: 'ascent_capacity' }, demand: { amount: 1000, unit: 'm_elevation_gain' }, criticality: 'critical' }] }],
    );
    expect(contributions).toEqual([]);
  });

  // Production incident regression: a user reported an Easy Run session
  // being flagged as contributing to no active goal ("draagt momenteel
  // niet aantoonbaar bij") despite an active Marathon goal — root cause
  // turned out to be the Marathon TrainingGoal itself sitting at
  // status:'paused' (no targetDate), not a key mismatch here. This proves
  // the mapping itself is sound end-to-end (computeDemand ->
  // resolveSessionContributions -> computeActiveGoalOverviews's
  // normalizedPct) for a genuinely ACTIVE goal, so a future regression in
  // either half is caught immediately instead of being mis-diagnosed again.
  it('an active Marathon goal (distance + discipline:running) gives Easy Run a real, positive Goal Focus contribution', () => {
    const tplEasyRun = template({ id: 'tpl_easy_run', type: 'cardio' });
    const marathon: TrainingGoal = {
      id: 'marathon',
      name: 'Marathon',
      requirements: [{ id: 'r1', kind: 'distance', scope: 'SINGLE_EVENT', target: { amount: 21.1, unit: 'km' }, discipline: 'running' }],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      status: 'active',
      targetDate: '2027-04-01',
    };
    const availability: TrainingAvailability = { allowedDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], dailyTimeBudget: {}, longSessionDays: ['sun'], temporaryExceptions: [] };

    const overviews = computeActiveGoalOverviews([marathon], [], availability, [], '2026-09-09');
    expect(overviews).toHaveLength(1); // status:'active' — this is the exact filter a paused goal fails

    const goalDemands: GoalDemand[] = [{ goalId: marathon.id, demands: computeDemand(marathon.requirements) }];
    const contributions = resolveSessionContributions([planned({ id: 'ps1', templateId: 'tpl_easy_run' })], [tplEasyRun], goalDemands);
    expect(contributions.map((c) => c.goalId)).toEqual(['marathon']);

    // Mirrors weekReconciliation.ts#pickSwapCandidate's own relevancePct
    // computation — the score that decides whether a session is "free to
    // swap out".
    const relevancePct = contributions
      .filter((c) => c.plannedSessionId === 'ps1')
      .reduce((sum, c) => sum + (overviews.find((o) => o.goal.id === c.goalId)?.focus.normalizedPct ?? 0), 0);
    expect(relevancePct).toBeGreaterThan(0);
  });
});

import { describe, it, expect } from 'vitest';
import { inferCapabilityKeysForTemplate, resolveSessionContributions } from './sessionContribution';
import type { SessionTemplate, PlannedSession } from '../models/training';
import type { CapabilityDemand } from '../models/capability';

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
});

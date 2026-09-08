// ASCEND — Weekly Prescription Builder worked example (architecture pass,
// Fase 8). Encodes three GR5 snapshots (~140/~40/~10 days out) as one
// coherent end-to-end story through buildWeeklyPrescription, the same way
// candidatePlacement.ts's own Fase 5-9 header cross-references its test
// labels. Every assertion here is load-bearing evidence for a guarantee
// already unit-tested in isolation elsewhere:
//   - specificityWeight values (1.0/1.15/1.35) and the specific/taper
//     freeze: engine/specificityRamp.test.ts's band-boundary and
//     SPECIFICITY-FREEZE tests; reaffirmed at this layer by
//     weeklyPrescriptionBuilder.test.ts's own SPECIFICITY-TAPER-
//     COMPOSITION-FREEZE test.
//   - KEEP-STABILITY / KEEP-BREAKS-ON-REAL-CHANGE: weeklyPrescriptionBuilder.test.ts.
//   - the bounded planned-trajectory multiplier (never compounding off a
//     prior forecast week's own output): weeklyPrescriptionBuilder.test.ts's
//     FORECAST-NO-RUNAWAY-COMPOUNDING; weeklyPrescriptionEngine.test.ts's
//     own version of the same guarantee across a real multi-week fold.
//   - CRITICAL-FLOOR, ASSESS-NEVER-GROWS-OR-SHRINKS: weeklyPrescriptionBuilder.test.ts.
//
// Not modeled here: the plan's aspirational "candidateTemplateIds shifts
// to a pack-loaded variant as the goal nears" flourish. In the actual
// implementation, candidate-template ranking (rankCandidateTemplates,
// weeklyPrescriptionBuilder.ts) is driven purely by which CapabilityKeys
// are structurally covered and currently in resolvedDemand — never by
// SpecificityRampBand directly — so a template shift only happens when the
// resolved demand's key set itself changes, not from proximity to the goal
// alone. Asserting a band-driven template shift here would test behavior
// that was never actually built; this file sticks to what the system
// genuinely guarantees.

import { describe, it, expect } from 'vitest';
import { buildWeeklyPrescription, type WeeklyPrescriptionBuildInputs, type ResolvedCapabilityDemand } from './weeklyPrescriptionBuilder';
import { keyId } from './capability';
import type { SessionTemplate } from '../models/training';
import type { CapabilityGap } from '../models/capability';
import type { ProgressionDecision } from '../models/progression';
import type { TrainingGoal } from '../models/goals';
import type { GoalFocus, FeasibilityAssessment } from '../models/feasibility';
import type { GoalOverview } from './goalOverview';

const ASOF = '2026-09-08';
const WEEK1 = '2026-09-21';

const ASCENT_KEY = { dimension: 'ascent_capacity' as const };
const ASCENT_KEY_ID = keyId(ASCENT_KEY);

// GR5's own "beladen heuveltraining" — a real, structurally multi-
// capability template (ascent_capacity, aerobic_engine, hiking endurance),
// matching data/defaultProgram.ts's own tpl_long_run shape.
const tplGr5Hike: SessionTemplate = {
  id: 'tpl_gr5_hike',
  name: 'GR5 Beladen Heuveltraining',
  type: 'hiking',
  durationVariants: { full: 150 },
  outdoorTarget: { targetElevationM: 900, targetDistanceKm: 18, backpackWeightKg: 10 },
};

function gr5Goal(targetDate: string): TrainingGoal {
  return {
    id: 'goal-gr5', name: 'GR5', requirements: [], createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    status: 'active', targetDate,
  };
}

function gap(overrides: Partial<CapabilityGap> = {}): CapabilityGap {
  return { key: ASCENT_KEY, demand: { amount: 1500, unit: 'm_elevation_gain' }, status: 'gap', confidence: 'medium', criticality: 'critical', explanation: '', ...overrides };
}

function focus(overrides: Partial<GoalFocus> = {}): GoalFocus {
  return { goalId: 'goal-gr5', score: 50, normalizedPct: 100, reasons: [], asOf: ASOF, ...overrides };
}

function feasibility(overrides: Partial<FeasibilityAssessment> = {}): FeasibilityAssessment {
  return { goalId: 'goal-gr5', status: 'on_track', confidence: 'medium', explanation: '', ...overrides };
}

function overview(targetDate: string, gapOverrides: Partial<CapabilityGap> = {}): GoalOverview {
  const goal = gr5Goal(targetDate);
  return { goal, gaps: [gap(gapOverrides)], feasibility: feasibility(), focus: focus() };
}

function decision(overrides: Partial<ProgressionDecision> = {}): ProgressionDecision {
  return { key: ASCENT_KEY, state: 'consolidate', reason: 'GR5 ascent capacity', ruleId: 'TEST', poorResponsePattern: false, accumulationReviewDue: false, ...overrides };
}

function baseInputs(overrides: Partial<WeeklyPrescriptionBuildInputs>): WeeklyPrescriptionBuildInputs {
  return {
    weekStartDate: WEEK1,
    weeksIntoForecast: 1,
    goalOverviews: [],
    resolvedDemand: new Map(),
    anchorBaselineCoverage: new Map([[ASCENT_KEY_ID, { count: 1, sessionIds: ['s1'] }]]),
    plannedSessions: [],
    templates: [tplGr5Hike],
    previousWeekPrescription: null,
    strengthStrategy: null,
    asOf: ASOF,
    ...overrides,
  };
}

function resolvedDemand(state: ProgressionDecision['state']): Map<string, ResolvedCapabilityDemand> {
  return new Map([[ASCENT_KEY_ID, { decision: decision({ state }), goalIds: ['goal-gr5'] }]]);
}

describe('Weekly Prescription Builder — GR5 worked example', () => {
  it('~140 days out (band base): consolidate, flat specificityWeight, and KEEP on the very next unchanged call', () => {
    const goalOverview = overview('2027-01-26'); // ~140 days from ASOF
    const inputs = baseInputs({ goalOverviews: [goalOverview], resolvedDemand: resolvedDemand('consolidate') });

    const first = buildWeeklyPrescription(inputs);
    expect(first.specificityRampBand).toBe('base');
    const line = first.lines[0];
    // Fase 2's own base-band value (1.0) for a critical key, +0.1 since GR5
    // is genuinely still behind on this key (gapStatus: 'gap' in the fixture).
    expect(line.specificityWeight).toBeCloseTo(1.1, 5);
    expect(line.targetSessionCount).toBe(1); // consolidate never grows/shrinks
    expect(line.decision).toBe('consolidate'); // nothing to compare against yet

    const second = buildWeeklyPrescription({ ...inputs, previousWeekPrescription: first });
    expect(second.lines[0].decision).toBe('keep'); // KEEP-STABILITY, reaffirmed at this layer
  });

  it('~40 days out (band specific): progress grows session count and volume, specificityWeight jumps to 1.35', () => {
    const goalOverview = overview('2026-10-18'); // ~40 days from ASOF
    const inputs = baseInputs({ goalOverviews: [goalOverview], resolvedDemand: resolvedDemand('progress'), weeksIntoForecast: 1 });

    const result = buildWeeklyPrescription(inputs);
    expect(result.specificityRampBand).toBe('specific');
    const line = result.lines[0];
    expect(line.specificityWeight).toBeCloseTo(1.45, 5); // 1.35 specific-band + 0.1 gap bump
    expect(line.targetSessionCount).toBe(2); // baseline 1 + 1, band allows growth
    expect(line.decision).toBe('progress');
    // Volume genuinely grew off the real template's own duration (150 min), never fabricated.
    expect(line.targetDuration!.max.amount).toBeGreaterThan(150);
  });

  it('~10 days out (band taper): composition freezes exactly where the specific-band snapshot left it — only volume shrinks', () => {
    const specificOverview = overview('2026-10-18');
    const specificResult = buildWeeklyPrescription(baseInputs({ goalOverviews: [specificOverview], resolvedDemand: resolvedDemand('progress'), weeksIntoForecast: 1 }));

    // The goal enters its taper window — decisionsByKey would already carry
    // 'taper' here in production (engine/progressionDecisions.ts#applyTaperOverride,
    // same TAPER_WINDOW_DAYS=21 boundary the specificity band itself uses).
    const taperOverview = overview('2026-09-18'); // ~10 days from ASOF
    const taperInputs = baseInputs({
      goalOverviews: [taperOverview],
      resolvedDemand: new Map([[ASCENT_KEY_ID, { decision: decision({ state: 'taper', taperReductionFactor: 0.3 }), goalIds: ['goal-gr5'] }]]),
      previousWeekPrescription: specificResult,
    });
    const taperResult = buildWeeklyPrescription(taperInputs);

    expect(taperResult.specificityRampBand).toBe('taper');
    const line = taperResult.lines[0];
    // WELKE plekken bestaan is bevroren op de specific-snapshot — nooit
    // opnieuw herzien eenmaal in taper (invariant uit het goedgekeurde plan).
    expect(line.targetSessionCount).toBe(specificResult.lines[0].targetSessionCount);
    expect(line.candidateTemplateIds).toEqual(specificResult.lines[0].candidateTemplateIds);
    expect(line.specificityWeight).toBe(specificResult.lines[0].specificityWeight); // specific/taper share the same value
    // ...but the numeric volume genuinely shrank.
    expect(line.targetDuration!.max.amount).toBeLessThan(specificResult.lines[0].targetDuration!.max.amount);
    expect(line.decision).toBe('taper');
  });

  it('Test CRITICAL-FLOOR reaffirmed at this layer: even deep in the block, a critical GR5 key never drops to zero sessions', () => {
    const goalOverview = overview('2026-10-18', { criticality: 'critical' });
    const inputs = baseInputs({
      goalOverviews: [goalOverview],
      resolvedDemand: new Map([[ASCENT_KEY_ID, { decision: decision({ state: 'reduce' }), goalIds: ['goal-gr5'] }]]),
      anchorBaselineCoverage: new Map([[ASCENT_KEY_ID, { count: 1, sessionIds: ['s1'] }]]),
    });
    const result = buildWeeklyPrescription(inputs);
    expect(result.lines[0].targetSessionCount).toBe(1); // would be 0 without the floor
  });

  it('Test FORECAST-NO-RUNAWAY-COMPOUNDING reaffirmed: the planned trajectory never compounds across the GR5 forecast batch', () => {
    const goalOverview = overview('2026-10-18');
    const week6 = buildWeeklyPrescription(baseInputs({
      goalOverviews: [goalOverview],
      resolvedDemand: resolvedDemand('progress'),
      weeksIntoForecast: 6, // min(1 + 0.12*6, 1.3) = 1.3, capped — never 1.12^6
    }));
    // 150 min baseline * 1.3 multiplier, ±10% range spread.
    expect(week6.lines[0].targetDuration!.max.amount).toBeCloseTo(150 * 1.3 * 1.1, 1);
  });
});

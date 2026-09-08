import { describe, it, expect } from 'vitest';
import {
  computeBaselineCoverage,
  slotIdFor,
  dedupeDesiredSlots,
  resolveWeeklyCapabilityDemand,
  computePlannedTrajectoryMultiplier,
  buildWeeklyPrescription,
  type WeeklyPrescriptionBuildInputs,
  type CoverageEntry,
  type ResolvedCapabilityDemand,
} from './weeklyPrescriptionBuilder';
import { keyId } from './capability';
import { inferCapabilityKeysForTemplate } from './sessionContribution';
import type { PlannedSession, SessionTemplate } from '../models/training';
import type { CapabilityKey, CapabilityGap } from '../models/capability';
import type { ProgressionDecision } from '../models/progression';
import type { TrainingGoal } from '../models/goals';
import type { GoalFocus, FeasibilityAssessment } from '../models/feasibility';
import type { GoalOverview } from './goalOverview';
import type { WeeklyPrescription, WeeklyPrescriptionLine } from '../models/weeklyPrescription';

const ASOF = '2026-09-08';
const WEEK1 = '2026-09-21';

function goal(overrides: Partial<TrainingGoal> = {}): TrainingGoal {
  return {
    id: 'goal-gr5',
    name: 'GR5',
    requirements: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    status: 'active',
    targetDate: '2026-10-18', // ~40 days from ASOF — band 'specific'
    ...overrides,
  } as TrainingGoal;
}

function gap(overrides: Partial<CapabilityGap> = {}): CapabilityGap {
  return {
    key: { dimension: 'ascent_capacity' },
    demand: { amount: 1000, unit: 'm_elevation_gain' },
    status: 'meets',
    confidence: 'medium',
    criticality: 'critical',
    explanation: '',
    ...overrides,
  };
}

function focus(overrides: Partial<GoalFocus> = {}): GoalFocus {
  return { goalId: 'goal-gr5', score: 50, normalizedPct: 100, reasons: [], asOf: ASOF, ...overrides };
}

function feasibility(overrides: Partial<FeasibilityAssessment> = {}): FeasibilityAssessment {
  return { goalId: 'goal-gr5', status: 'on_track', confidence: 'medium', explanation: '', ...overrides };
}

function overview(overrides: Partial<GoalOverview> = {}): GoalOverview {
  const g = overrides.goal ?? goal();
  return {
    goal: g,
    gaps: overrides.gaps ?? [gap()],
    feasibility: overrides.feasibility ?? feasibility({ goalId: g.id }),
    focus: overrides.focus ?? focus({ goalId: g.id }),
  };
}

function decision(overrides: Partial<ProgressionDecision> = {}): ProgressionDecision {
  return {
    key: { dimension: 'ascent_capacity' },
    state: 'consolidate',
    reason: 'test reason',
    ruleId: 'TEST',
    poorResponsePattern: false,
    accumulationReviewDue: false,
    ...overrides,
  };
}

function template(overrides: Partial<SessionTemplate> = {}): SessionTemplate {
  return {
    id: 'tpl_hike',
    name: 'Berghike',
    type: 'hiking',
    durationVariants: { full: 120 },
    outdoorTarget: { targetElevationM: 800, targetDistanceKm: 15 },
    ...overrides,
  };
}

function session(id: string, templateId: string, scheduledDate: string, weekStartDate: string): PlannedSession {
  return { id, templateId, scheduledDate, weekStartDate, status: 'planned', order: 0 };
}

const ASCENT_KEY: CapabilityKey = { dimension: 'ascent_capacity' };
const ASCENT_KEY_ID = keyId(ASCENT_KEY);

function baseInputs(overrides: Partial<WeeklyPrescriptionBuildInputs> = {}): WeeklyPrescriptionBuildInputs {
  const tpl = template();
  const goalOverviews = overrides.goalOverviews ?? [overview()];
  return {
    weekStartDate: WEEK1,
    weeksIntoForecast: 1,
    goalOverviews,
    resolvedDemand: overrides.resolvedDemand ?? new Map([[ASCENT_KEY_ID, { decision: decision(), goalIds: ['goal-gr5'] } as ResolvedCapabilityDemand]]),
    anchorBaselineCoverage: overrides.anchorBaselineCoverage ?? new Map([[ASCENT_KEY_ID, { count: 1, sessionIds: ['s1'] } as CoverageEntry]]),
    plannedSessions: overrides.plannedSessions ?? [],
    templates: overrides.templates ?? [tpl],
    previousWeekPrescription: overrides.previousWeekPrescription ?? null,
    strengthStrategy: overrides.strengthStrategy ?? null,
    asOf: overrides.asOf ?? ASOF,
    ...overrides,
  };
}

describe('computeBaselineCoverage', () => {
  it('matches inferCapabilityKeysForTemplate\'s own structural reading (the same signal resolveSessionContributions uses)', () => {
    const tpl = template();
    const sessions = [session('s1', tpl.id, '2026-09-21', WEEK1), session('s2', tpl.id, '2026-09-24', WEEK1)];
    const coverage = computeBaselineCoverage(WEEK1, sessions, [tpl]);

    for (const key of inferCapabilityKeysForTemplate(tpl)) {
      const entry = coverage.get(keyId(key));
      expect(entry?.count).toBe(2);
      expect(entry?.sessionIds).toEqual(['s1', 's2']);
    }
  });

  it('never counts a skipped session', () => {
    const tpl = template();
    const sessions = [session('s1', tpl.id, '2026-09-21', WEEK1), { ...session('s2', tpl.id, '2026-09-24', WEEK1), status: 'skipped' as const }];
    const coverage = computeBaselineCoverage(WEEK1, sessions, [tpl]);
    expect(coverage.get(ASCENT_KEY_ID)?.count).toBe(1);
  });

  it('PLACEHOLDER-WEEK-STRUCTURAL-PARITY — a structurally identical week reads identical coverage regardless of which week it is', () => {
    const tpl = template();
    const weekA = '2026-09-21';
    const weekB = '2027-01-04'; // a far-future, "placeholder" forecast week — structurally identical composition
    const sessionsA = [session('a1', tpl.id, weekA, weekA), session('a2', tpl.id, '2026-09-24', weekA)];
    const sessionsB = [session('b1', tpl.id, weekB, weekB), session('b2', tpl.id, '2027-01-07', weekB)];

    const coverageA = computeBaselineCoverage(weekA, sessionsA, [tpl]);
    const coverageB = computeBaselineCoverage(weekB, sessionsB, [tpl]);

    expect(coverageB.get(ASCENT_KEY_ID)?.count).toBe(coverageA.get(ASCENT_KEY_ID)?.count);
  });
});

describe('slotIdFor', () => {
  it('is order-independent in goalIds — identity is the sorted set, never call order', () => {
    expect(slotIdFor(ASCENT_KEY, ['a', 'b'])).toBe(slotIdFor(ASCENT_KEY, ['b', 'a']));
  });

  it('differs for a different key or a different goalIds set', () => {
    expect(slotIdFor(ASCENT_KEY, ['a'])).not.toBe(slotIdFor({ dimension: 'load_carriage' }, ['a']));
    expect(slotIdFor(ASCENT_KEY, ['a'])).not.toBe(slotIdFor(ASCENT_KEY, ['a', 'b']));
  });
});

describe('dedupeDesiredSlots — Test TEMPLATE-DEDUP-ACROSS-LINES (invariant b)', () => {
  it('collapses lines that share one dominant multi-capability template into a single physical request, taking the max count', () => {
    const loadedHill: SessionTemplate = {
      id: 'tpl_loaded_hill',
      name: 'Beladen Heuveltraining',
      type: 'hiking',
      durationVariants: { full: 90 },
      outdoorTarget: { targetElevationM: 500, targetDistanceKm: 10, backpackWeightKg: 12 },
    };
    // Confirm, against the real function, that this one template genuinely
    // covers all three keys used below — never assumed.
    const coveredKeyIds = new Set(inferCapabilityKeysForTemplate(loadedHill).map(keyId));
    expect(coveredKeyIds.has('aerobic_engine')).toBe(true);
    expect(coveredKeyIds.has('ascent_capacity')).toBe(true);
    expect(coveredKeyIds.has('load_carriage')).toBe(true);

    function lineFor(dimension: string, targetSessionCount: number): WeeklyPrescriptionLine {
      return {
        id: `line-${dimension}`,
        slotId: `${dimension}::goal-gr5`,
        primaryKey: { dimension: dimension as CapabilityKey['dimension'] },
        goalIds: ['goal-gr5'],
        targetSessionCount,
        candidateTemplateIds: [loadedHill.id],
        decision: 'progress',
        reason: '',
        ruleId: 'TEST',
        sourceProgressionState: 'progress',
        specificityWeight: 1.0,
      };
    }

    const lines = [lineFor('aerobic_engine', 2), lineFor('ascent_capacity', 3), lineFor('load_carriage', 2)];
    const result = dedupeDesiredSlots(lines, [loadedHill]);

    expect(result).toHaveLength(1);
    expect(result[0].templateId).toBe(loadedHill.id);
    expect(result[0].count).toBe(3); // the highest of the three, never the sum (would be 7)
    expect(result[0].satisfiesSlotIds.sort()).toEqual(['aerobic_engine::goal-gr5', 'ascent_capacity::goal-gr5', 'load_carriage::goal-gr5']);
  });

  it('never requests a keep-decision line, and skips a line with no usable candidate template', () => {
    const tpl = template();
    const keepLine: WeeklyPrescriptionLine = {
      id: 'l1', slotId: 's1', primaryKey: ASCENT_KEY, goalIds: [], targetSessionCount: 2, candidateTemplateIds: [tpl.id],
      decision: 'keep', reason: '', ruleId: 'TEST', sourceProgressionState: 'consolidate', specificityWeight: 1.0,
    };
    const noCandidateLine: WeeklyPrescriptionLine = {
      id: 'l2', slotId: 's2', primaryKey: { dimension: 'strength' }, goalIds: [], targetSessionCount: 1, candidateTemplateIds: [],
      decision: 'progress', reason: '', ruleId: 'TEST', sourceProgressionState: 'progress', specificityWeight: 1.0,
    };
    expect(dedupeDesiredSlots([keepLine, noCandidateLine], [tpl])).toEqual([]);
  });
});

describe('resolveWeeklyCapabilityDemand — Test MULTI-GOAL-ARBITRATION-BEFORE-PRESCRIPTION (invariant c)', () => {
  it('resolves a contested key to exactly one decision (the single decisionsByKey value, never altered), with goalIds ordered by Goal Focus', () => {
    const marathon = overview({
      goal: goal({ id: 'goal-marathon', name: 'Marathon' }),
      gaps: [gap({ key: { dimension: 'endurance_duration', discipline: 'running' } })],
      focus: focus({ goalId: 'goal-marathon', normalizedPct: 70 }),
    });
    const gr5 = overview({
      goal: goal({ id: 'goal-gr5' }),
      gaps: [gap({ key: { dimension: 'endurance_duration', discipline: 'running' } })],
      focus: focus({ goalId: 'goal-gr5', normalizedPct: 30 }),
    });

    const sharedKeyId = keyId({ dimension: 'endurance_duration', discipline: 'running' });
    const sharedDecision = decision({ key: { dimension: 'endurance_duration', discipline: 'running' }, state: 'progress' });
    const decisionsByKey = new Map<string, ProgressionDecision>([[sharedKeyId, sharedDecision]]);

    const resolved = resolveWeeklyCapabilityDemand([marathon, gr5], decisionsByKey);

    expect(resolved.size).toBe(1);
    const entry = resolved.get(sharedKeyId)!;
    expect(entry.decision).toBe(sharedDecision); // never a second, invented decision — the exact same object
    expect(entry.goalIds).toEqual(['goal-marathon', 'goal-gr5']); // higher Goal Focus (70% > 30%) wins attribution order
  });

  it('never emits a demand for a key no active goal currently asks for, even if decisionsByKey still tracks it', () => {
    const decisionsByKey = new Map<string, ProgressionDecision>([['strength', decision({ key: { dimension: 'strength' } })]]);
    const resolved = resolveWeeklyCapabilityDemand([overview()], decisionsByKey);
    expect(resolved.has('strength')).toBe(false);
  });

  it('never emits a resolution for a key decisionsByKey has no tracked decision for', () => {
    const resolved = resolveWeeklyCapabilityDemand([overview()], new Map());
    expect(resolved.size).toBe(0);
  });
});

describe('buildWeeklyPrescription — decision table', () => {
  it('progress: grows session count by one (band specific, baseline under cap) and applies the bounded trajectory multiplier', () => {
    const inputs = baseInputs({
      resolvedDemand: new Map([[ASCENT_KEY_ID, { decision: decision({ state: 'progress' }), goalIds: ['goal-gr5'] }]]),
      weeksIntoForecast: 1,
    });
    const result = buildWeeklyPrescription(inputs);
    const line = result.lines[0];
    expect(line.targetSessionCount).toBe(2); // baseline 1 + 1
    expect(line.decision).toBe('progress');
    expect(line.sourceProgressionState).toBe('progress');
    const multiplier = computePlannedTrajectoryMultiplier(1);
    expect(line.targetDuration!.min.amount).toBeCloseTo(120 * multiplier * 0.9, 1);
    expect(line.targetDuration!.max.amount).toBeCloseTo(120 * multiplier * 1.1, 1);
  });

  it('progress: withholds session-count growth once the per-key cap is reached', () => {
    const inputs = baseInputs({
      resolvedDemand: new Map([[ASCENT_KEY_ID, { decision: decision({ state: 'progress' }), goalIds: ['goal-gr5'] }]]),
      anchorBaselineCoverage: new Map([[ASCENT_KEY_ID, { count: 2, sessionIds: ['s1', 's2'] }]]), // already at the cap
    });
    const line = buildWeeklyPrescription(inputs).lines[0];
    expect(line.targetSessionCount).toBe(2); // unchanged — no further growth
  });

  it('consolidate: session count and volume stay exactly at baseline', () => {
    const inputs = baseInputs({ resolvedDemand: new Map([[ASCENT_KEY_ID, { decision: decision({ state: 'consolidate' }), goalIds: ['goal-gr5'] }]]) });
    const line = buildWeeklyPrescription(inputs).lines[0];
    expect(line.targetSessionCount).toBe(1);
    expect(line.decision).toBe('consolidate');
    expect(line.targetDuration!.min.amount).toBeCloseTo(120 * 0.9, 1);
  });

  it('assess (Test ASSESS-NEVER-GROWS-OR-SHRINKS): baseline passes through unchanged regardless of its value', () => {
    for (const baseline of [0, 1, 3]) {
      const inputs = baseInputs({
        resolvedDemand: new Map([[ASCENT_KEY_ID, { decision: decision({ state: 'assess' }), goalIds: ['goal-gr5'] }]]),
        anchorBaselineCoverage: new Map([[ASCENT_KEY_ID, { count: baseline, sessionIds: [] }]]),
      });
      const line = buildWeeklyPrescription(inputs).lines[0];
      expect(line.targetSessionCount).toBe(baseline);
      expect(line.decision).toBe('consolidate'); // insufficient data never grows/shrinks anything
      expect(line.sourceProgressionState).toBe('assess');
    }
  });

  it('reduce: drops session count by one and scales volume down, for a non-critical key', () => {
    const inputs = baseInputs({
      resolvedDemand: new Map([[ASCENT_KEY_ID, { decision: decision({ state: 'reduce' }), goalIds: ['goal-gr5'] }]]),
      anchorBaselineCoverage: new Map([[ASCENT_KEY_ID, { count: 2, sessionIds: ['s1', 's2'] }]]),
      goalOverviews: [overview({ gaps: [gap({ criticality: 'important' })] })],
    });
    const line = buildWeeklyPrescription(inputs).lines[0];
    expect(line.targetSessionCount).toBe(1);
    expect(line.decision).toBe('reduce');
    expect(line.targetDuration!.min.amount).toBeCloseTo(120 * 0.8 * 0.9, 1);
  });

  it('recover: maps identically to reduce (same precedent as adaptiveReplanner.ts)', () => {
    const inputs = baseInputs({
      resolvedDemand: new Map([[ASCENT_KEY_ID, { decision: decision({ state: 'recover' }), goalIds: ['goal-gr5'] }]]),
      anchorBaselineCoverage: new Map([[ASCENT_KEY_ID, { count: 2, sessionIds: ['s1', 's2'] }]]),
      goalOverviews: [overview({ gaps: [gap({ criticality: 'important' })] })],
    });
    const line = buildWeeklyPrescription(inputs).lines[0];
    expect(line.targetSessionCount).toBe(1);
    expect(line.decision).toBe('reduce');
    expect(line.sourceProgressionState).toBe('recover');
  });

  it('Test CRITICAL-FLOOR: reduce never drops a critical key below 1 session', () => {
    const inputs = baseInputs({
      resolvedDemand: new Map([[ASCENT_KEY_ID, { decision: decision({ state: 'reduce' }), goalIds: ['goal-gr5'] }]]),
      anchorBaselineCoverage: new Map([[ASCENT_KEY_ID, { count: 1, sessionIds: ['s1'] }]]), // criticality: 'critical' by default fixture
    });
    const line = buildWeeklyPrescription(inputs).lines[0];
    expect(line.targetSessionCount).toBe(1); // would be 0 without the floor
  });

  it('taper: freezes session count and composition, only scales volume down via the reused taperReductionFactor', () => {
    const taperGoal = goal({ targetDate: '2026-09-18' }); // ~10 days out — band 'taper'
    const inputs = baseInputs({
      goalOverviews: [overview({ goal: taperGoal, focus: focus({ goalId: taperGoal.id }) })],
      resolvedDemand: new Map([[ASCENT_KEY_ID, { decision: decision({ state: 'taper', taperReductionFactor: 0.3 }), goalIds: ['goal-gr5'] }]]),
      anchorBaselineCoverage: new Map([[ASCENT_KEY_ID, { count: 2, sessionIds: ['s1', 's2'] }]]),
    });
    const result = buildWeeklyPrescription(inputs);
    expect(result.specificityRampBand).toBe('taper');
    const line = result.lines[0];
    expect(line.targetSessionCount).toBe(2); // unchanged — composition never touched by taper
    expect(line.decision).toBe('taper');
    expect(line.targetDuration!.max.amount).toBeLessThan(120); // volume genuinely shrank (×0.7)
  });
});

describe('buildWeeklyPrescription — KEEP stability', () => {
  it('Test KEEP-STABILITY: identical input across two calls in a row produces decision keep with zero drift', () => {
    const inputs = baseInputs({ resolvedDemand: new Map([[ASCENT_KEY_ID, { decision: decision({ state: 'consolidate' }), goalIds: ['goal-gr5'] }]]) });
    const first = buildWeeklyPrescription(inputs);
    expect(first.lines[0].decision).toBe('consolidate'); // nothing to compare against yet
    expect(first.consecutiveKeepWeeks).toBe(0);

    const second = buildWeeklyPrescription({ ...inputs, previousWeekPrescription: first });
    expect(second.lines[0].decision).toBe('keep');
    expect(second.lines[0].targetSessionCount).toBe(first.lines[0].targetSessionCount);
    expect(second.lines[0].candidateTemplateIds).toEqual(first.lines[0].candidateTemplateIds);
    expect(second.consecutiveKeepWeeks).toBe(1);
  });

  it('Test KEEP-BREAKS-ON-REAL-CHANGE: only the line whose state actually changed loses keep', () => {
    const loadKey: CapabilityKey = { dimension: 'load_carriage' };
    const loadKeyId = keyId(loadKey);
    const templates = [template({ id: 'tpl_hike', outdoorTarget: { targetElevationM: 800, targetDistanceKm: 15, backpackWeightKg: 10 } })];

    const stableInputs = baseInputs({
      templates,
      goalOverviews: [overview({ gaps: [gap(), gap({ key: loadKey })] })],
      resolvedDemand: new Map([
        [ASCENT_KEY_ID, { decision: decision({ state: 'consolidate' }), goalIds: ['goal-gr5'] }],
        [loadKeyId, { decision: decision({ key: loadKey, state: 'consolidate' }), goalIds: ['goal-gr5'] }],
      ]),
      anchorBaselineCoverage: new Map([
        [ASCENT_KEY_ID, { count: 1, sessionIds: ['s1'] }],
        [loadKeyId, { count: 1, sessionIds: ['s1'] }],
      ]),
    });
    const first = buildWeeklyPrescription(stableInputs);

    const changedInputs: WeeklyPrescriptionBuildInputs = {
      ...stableInputs,
      previousWeekPrescription: first,
      resolvedDemand: new Map([
        [ASCENT_KEY_ID, { decision: decision({ state: 'progress' }), goalIds: ['goal-gr5'] }], // changed
        [loadKeyId, { decision: decision({ key: loadKey, state: 'consolidate' }), goalIds: ['goal-gr5'] }], // unchanged
      ]),
    };
    const second = buildWeeklyPrescription(changedInputs);

    const ascentLine = second.lines.find((l) => l.primaryKey.dimension === 'ascent_capacity')!;
    const loadLine = second.lines.find((l) => l.primaryKey.dimension === 'load_carriage')!;
    expect(ascentLine.decision).not.toBe('keep');
    expect(loadLine.decision).toBe('keep');
  });

  it('Test REVIEW-DUE-AT-4: reviewDue flips true once the skeleton has been unchanged for 4 consecutive weeks', () => {
    const inputs = baseInputs({ resolvedDemand: new Map([[ASCENT_KEY_ID, { decision: decision({ state: 'consolidate' }), goalIds: ['goal-gr5'] }]]) });
    const fresh = buildWeeklyPrescription(inputs);

    const fabricatedPrevious: WeeklyPrescription = { ...fresh, consecutiveKeepWeeks: 3, reviewDue: false };
    const result = buildWeeklyPrescription({ ...inputs, previousWeekPrescription: fabricatedPrevious });

    expect(result.consecutiveKeepWeeks).toBe(4);
    expect(result.reviewDue).toBe(true);
    // Never forces anything by itself — count/decision stay exactly what they'd otherwise be.
    expect(result.lines[0].targetSessionCount).toBe(fresh.lines[0].targetSessionCount);
  });
});

describe('buildWeeklyPrescription — Test SPECIFICITY-TAPER-COMPOSITION-FREEZE', () => {
  it('a taper-state line never touches session count or candidateTemplateIds — only the numeric volume shrinks', () => {
    const specificGoal = goal({ targetDate: '2026-10-18' }); // band 'specific'
    const specificInputs = baseInputs({
      goalOverviews: [overview({ goal: specificGoal })],
      resolvedDemand: new Map([[ASCENT_KEY_ID, { decision: decision({ state: 'consolidate' }), goalIds: ['goal-gr5'] }]]),
      anchorBaselineCoverage: new Map([[ASCENT_KEY_ID, { count: 2, sessionIds: ['s1', 's2'] }]]),
    });
    const specificResult = buildWeeklyPrescription(specificInputs);
    expect(specificResult.specificityRampBand).toBe('specific');

    const taperGoal = goal({ targetDate: '2026-09-18' }); // band 'taper'
    const taperInputs = baseInputs({
      goalOverviews: [overview({ goal: taperGoal })],
      resolvedDemand: new Map([[ASCENT_KEY_ID, { decision: decision({ state: 'taper', taperReductionFactor: 0.3 }), goalIds: ['goal-gr5'] }]]),
      anchorBaselineCoverage: new Map([[ASCENT_KEY_ID, { count: 2, sessionIds: ['s1', 's2'] }]]),
    });
    const taperResult = buildWeeklyPrescription(taperInputs);
    expect(taperResult.specificityRampBand).toBe('taper');

    expect(taperResult.lines[0].targetSessionCount).toBe(specificResult.lines[0].targetSessionCount);
    expect(taperResult.lines[0].candidateTemplateIds).toEqual(specificResult.lines[0].candidateTemplateIds);
    // specific and taper share the same specificityWeight (Fase 2's SPECIFICITY-FREEZE) — reaffirmed at this layer.
    expect(taperResult.lines[0].specificityWeight).toBe(specificResult.lines[0].specificityWeight);
    // ...but the numeric volume genuinely shrank.
    expect(taperResult.lines[0].targetDuration!.max.amount).toBeLessThan(specificResult.lines[0].targetDuration!.max.amount);
  });
});

describe('buildWeeklyPrescription — Test FORECAST-NO-RUNAWAY-COMPOUNDING (invariant a)', () => {
  it('the planned trajectory multiplier is a bounded function of weeksIntoForecast, always applied to the fixed anchorBaselineCoverage', () => {
    expect(computePlannedTrajectoryMultiplier(1)).toBeCloseTo(1.12, 5);
    expect(computePlannedTrajectoryMultiplier(2)).toBeCloseTo(1.24, 5);
    expect(computePlannedTrajectoryMultiplier(6)).toBe(1.3); // capped — NOT 1.12^6 ≈ 1.97
    expect(computePlannedTrajectoryMultiplier(20)).toBe(1.3);
  });

  it('never uses the previous forecast week\'s own speculative output as the volume basis — only the fixed anchor baseline', () => {
    // A deliberately inflated, wrong "previous" prescription — if the
    // implementation ever accidentally compounded off of a prior week's own
    // output, this fixture would leak into the new result's numbers.
    const inflatedPreviousLine: WeeklyPrescriptionLine = {
      id: 'inflated', slotId: slotIdFor(ASCENT_KEY, ['goal-gr5']), primaryKey: ASCENT_KEY, goalIds: ['goal-gr5'],
      targetSessionCount: 99, candidateTemplateIds: ['some-other-template'],
      decision: 'progress', reason: '', ruleId: 'TEST', sourceProgressionState: 'progress', specificityWeight: 1.0,
      targetDuration: { min: { amount: 9000, unit: 'min' }, max: { amount: 9999, unit: 'min' } },
    };
    const inflatedPrevious: WeeklyPrescription = {
      id: 'prev', weekStartDate: '2026-09-14', lines: [inflatedPreviousLine], skeletonSignature: 'inflated',
      consecutiveKeepWeeks: 0, reviewDue: false, specificityRampBand: 'specific', goalSnapshot: [], generatedBy: [], computedAt: ASOF,
    };

    const inputs = baseInputs({
      weeksIntoForecast: 6,
      resolvedDemand: new Map([[ASCENT_KEY_ID, { decision: decision({ state: 'progress' }), goalIds: ['goal-gr5'] }]]),
      previousWeekPrescription: inflatedPrevious,
    });
    const line = buildWeeklyPrescription(inputs).lines[0];

    const multiplier = computePlannedTrajectoryMultiplier(6);
    expect(line.targetDuration!.max.amount).toBeCloseTo(120 * multiplier * 1.1, 1);
    expect(line.targetSessionCount).toBeLessThan(10); // never anywhere near the inflated fixture's 99
    expect(line.candidateTemplateIds).not.toContain('some-other-template');
  });
});

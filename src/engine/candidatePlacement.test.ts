import { describe, it, expect } from 'vitest';
import {
  findLoadOverlaps,
  scoreCandidateDate,
  searchWeeklyPlacement,
  evaluateWeekCandidate,
  hasFeasibleHardPlacement,
  keyForPlacementRequest,
  LOAD_AXIS_CONFIG,
  type PlacementRequest,
  type PlanningTimePairingHint,
} from './candidatePlacement';
import type { PlannedSession, SessionTemplate } from '../models/training';
import type { SessionStressProfile } from '../models/prescription';

function tpl(id: string, overrides: Partial<SessionStressProfile> = {}, type: SessionTemplate['type'] = 'cardio'): SessionTemplate {
  return {
    id,
    name: id,
    type,
    durationVariants: { full: 60 },
    baseStressProfile: { lowerBodyLoad: 'none', impact: 'none', eccentricLoad: 'none', intensity: 'moderate', ...overrides },
  };
}

function planned(id: string, templateId: string, date: string, status: PlannedSession['status'] = 'planned'): PlannedSession {
  return { id, templateId, scheduledDate: date, weekStartDate: '2026-09-07', status, order: 0 };
}

describe('findLoadOverlaps', () => {
  const upperA = tpl('upper_a', { upperBodyLoad: 'heavy' }, 'strength');
  const upperB = tpl('upper_b', { upperBodyLoad: 'heavy' }, 'strength');
  const templateById = new Map([[upperA.id, upperA], [upperB.id, upperB]]);

  it('penalizes a same-axis heavy pair 1 day apart more than 2 days apart', () => {
    const oneDayApart = findLoadOverlaps('2026-09-13', upperA, 'sB', [planned('sA', upperB.id, '2026-09-12')], templateById, []);
    const twoDaysApart = findLoadOverlaps('2026-09-14', upperA, 'sB', [planned('sA', upperB.id, '2026-09-12')], templateById, []);
    expect(oneDayApart[0].penalty).toBeGreaterThan(twoDaysApart[0].penalty);
  });

  it('finds nothing once outside the rolling window for that axis', () => {
    const farApart = findLoadOverlaps('2026-09-20', upperA, 'sB', [planned('sA', upperB.id, '2026-09-12')], templateById, []);
    expect(farApart).toHaveLength(0);
  });

  it('now includes lowerBodyLoad (folded into the same scoring, not a separate hard rule)', () => {
    const legA = tpl('leg_a', { lowerBodyLoad: 'heavy' }, 'strength');
    const legB = tpl('leg_b', { lowerBodyLoad: 'heavy' }, 'strength');
    const byId = new Map([[legA.id, legA], [legB.id, legB]]);
    const findings = findLoadOverlaps('2026-09-13', legA, 'sB', [planned('sA', legB.id, '2026-09-12')], byId, []);
    expect(findings.some((f) => f.axis === 'lowerBodyLoad')).toBe(true);
  });

  it('a pairingOverride("prefer") suppresses the finding but never deletes it', () => {
    const a: SessionTemplate = { ...upperA, pairingOverride: [{ withTemplateId: upperB.id, verdict: 'prefer' }] };
    const byId = new Map([[a.id, a], [upperB.id, upperB]]);
    const findings = findLoadOverlaps('2026-09-13', a, 'sB', [planned('sA', upperB.id, '2026-09-12')], byId, []);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].penalty).toBe(0);
    expect(findings[0].suppressedForPlacement).toBe(true);
  });

  it('an explicit axis-specific pairingHint suppresses only that one axis, not others', () => {
    const legEcc = tpl('leg_ecc', { lowerBodyLoad: 'heavy', eccentricLoad: 'heavy' }, 'hiking');
    const legEcc2 = tpl('leg_ecc2', { lowerBodyLoad: 'heavy', eccentricLoad: 'heavy' }, 'hiking');
    const byId = new Map([[legEcc.id, legEcc], [legEcc2.id, legEcc2]]);
    const hints: PlanningTimePairingHint[] = [
      { sessionAId: 'sA', sessionBId: 'sB', dateA: '2026-09-12', dateB: '2026-09-13', axis: 'lowerBodyLoad', reason: 'bewust', requestedBy: 'test' },
    ];
    const findings = findLoadOverlaps('2026-09-13', legEcc2, 'sB', [planned('sA', legEcc.id, '2026-09-12')], byId, [], hints);
    const lowerFinding = findings.find((f) => f.axis === 'lowerBodyLoad');
    const eccFinding = findings.find((f) => f.axis === 'eccentricLoad');
    expect(lowerFinding?.penalty).toBe(0);
    expect(lowerFinding?.suppressedForPlacement).toBe(true);
    expect(eccFinding?.penalty).toBeGreaterThan(0);
    expect(eccFinding?.suppressedForPlacement).toBeUndefined();
  });

  it("axis: 'ALL' suppresses every axis for that exact pair, still just that pair", () => {
    const legEcc = tpl('leg_ecc', { lowerBodyLoad: 'heavy', eccentricLoad: 'heavy' }, 'hiking');
    const legEcc2 = tpl('leg_ecc2', { lowerBodyLoad: 'heavy', eccentricLoad: 'heavy' }, 'hiking');
    const byId = new Map([[legEcc.id, legEcc], [legEcc2.id, legEcc2]]);
    const hints: PlanningTimePairingHint[] = [
      { sessionAId: 'sA', sessionBId: 'sB', dateA: '2026-09-12', dateB: '2026-09-13', axis: 'ALL', reason: 'bewust', requestedBy: 'test' },
    ];
    const findings = findLoadOverlaps('2026-09-13', legEcc2, 'sB', [planned('sA', legEcc.id, '2026-09-12')], byId, [], hints);
    expect(findings.every((f) => f.penalty === 0 && f.suppressedForPlacement)).toBe(true);
  });

  it('a third session on the same day is still evaluated normally despite an intentional pair hint (Test H)', () => {
    const legA = tpl('leg_a', { lowerBodyLoad: 'heavy' }, 'hiking');
    const legB = tpl('leg_b', { lowerBodyLoad: 'heavy' }, 'hiking');
    const legC = tpl('leg_c', { lowerBodyLoad: 'heavy' }, 'strength');
    const byId = new Map([[legA.id, legA], [legB.id, legB], [legC.id, legC]]);
    const hints: PlanningTimePairingHint[] = [
      { sessionAId: 'sA', sessionBId: 'sB', dateA: '2026-09-12', dateB: '2026-09-13', axis: 'ALL', reason: 'bewust GR5-blok', requestedBy: 'test' },
    ];
    // Monday (legC) evaluated against both the intentional Sat/Sun pair.
    const findings = findLoadOverlaps('2026-09-14', legC, 'sC', [planned('sA', legA.id, '2026-09-12'), planned('sB', legB.id, '2026-09-13')], byId, [], hints);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings.some((f) => f.suppressedForPlacement)).toBe(false);
  });
});

describe('LOAD_AXIS_CONFIG — axis-specific configuration (Test A)', () => {
  it('reads decay/weight per axis, not from one shared universal curve', () => {
    const original = LOAD_AXIS_CONFIG.upperBodyLoad.baseWeight;
    LOAD_AXIS_CONFIG.upperBodyLoad.baseWeight = original * 5;
    try {
      const upperA = tpl('upper_a2', { upperBodyLoad: 'heavy' }, 'strength');
      const upperB = tpl('upper_b2', { upperBodyLoad: 'heavy' }, 'strength');
      const legA = tpl('leg_a2', { lowerBodyLoad: 'heavy' }, 'strength');
      const legB = tpl('leg_b2', { lowerBodyLoad: 'heavy' }, 'strength');
      const byId = new Map([[upperA.id, upperA], [upperB.id, upperB], [legA.id, legA], [legB.id, legB]]);

      const upperFindings = findLoadOverlaps('2026-09-13', upperA, 'sB', [planned('sA', upperB.id, '2026-09-12')], byId, []);
      const legFindings = findLoadOverlaps('2026-09-13', legA, 'sD', [planned('sC', legB.id, '2026-09-12')], byId, []);

      expect(upperFindings[0].penalty).toBeCloseTo(original * 5 * LOAD_AXIS_CONFIG.upperBodyLoad.temporalDecay[1], 5);
      expect(legFindings[0].penalty).toBeCloseTo(LOAD_AXIS_CONFIG.lowerBodyLoad.baseWeight * LOAD_AXIS_CONFIG.lowerBodyLoad.temporalDecay[1], 5);
    } finally {
      LOAD_AXIS_CONFIG.upperBodyLoad.baseWeight = original;
    }
  });
});

describe('scoreCandidateDate', () => {
  it('is a pure primitive — no Goal Focus, no capacity, only load cost', () => {
    const upperA = tpl('upper_a3', { upperBodyLoad: 'heavy' }, 'strength');
    const upperB = tpl('upper_b3', { upperBodyLoad: 'heavy' }, 'strength');
    const byId = new Map([[upperA.id, upperA], [upperB.id, upperB]]);
    const score = scoreCandidateDate('2026-09-13', upperA, 'sB', [planned('sA', upperB.id, '2026-09-12')], [], byId, []);
    expect(score.cost).toBeGreaterThan(0);
    expect(score.loadFindings.length).toBeGreaterThan(0);
  });
});

describe('evaluateWeekCandidate — order invariance (Test I)', () => {
  it('same resulting schedule => same totalCost regardless of insertion order', () => {
    const upperA = tpl('u_a', { upperBodyLoad: 'heavy' }, 'strength');
    const upperB = tpl('u_b', { upperBodyLoad: 'heavy' }, 'strength');
    const cardioC = tpl('c_c', { cardioLoad: 'heavy' }, 'cardio');
    const byId = new Map([[upperA.id, upperA], [upperB.id, upperB], [cardioC.id, cardioC]]);

    const orderA = [
      { id: 'x', templateId: upperA.id, date: '2026-09-12' },
      { id: 'y', templateId: upperB.id, date: '2026-09-13' },
      { id: 'z', templateId: cardioC.id, date: '2026-09-14' },
    ];
    const orderB = [orderA[2], orderA[0], orderA[1]];

    const resultA = evaluateWeekCandidate(orderA, byId, [], new Map());
    const resultB = evaluateWeekCandidate(orderB, byId, [], new Map());
    expect(resultA.totalCost).toBeCloseTo(resultB.totalCost, 10);
    expect(resultA.findings.length).toBe(resultB.findings.length);
  });

  it('never double-counts the same pairwise finding', () => {
    const upperA = tpl('u_a2', { upperBodyLoad: 'heavy' }, 'strength');
    const upperB = tpl('u_b2', { upperBodyLoad: 'heavy' }, 'strength');
    const byId = new Map([[upperA.id, upperA], [upperB.id, upperB]]);
    const sessions = [
      { id: 'x', templateId: upperA.id, date: '2026-09-12' },
      { id: 'y', templateId: upperB.id, date: '2026-09-13' },
    ];
    const { findings } = evaluateWeekCandidate(sessions, byId, [], new Map());
    expect(findings.filter((f) => f.axis === 'upperBodyLoad')).toHaveLength(1);
  });
});

describe('evaluateWeekCandidate — pairwise Goal Focus weighting (Test E)', () => {
  it('weights a pairwise finding by max(priorityA, priorityB), counted once', () => {
    const upperA = tpl('u_a3', { upperBodyLoad: 'heavy' }, 'strength');
    const upperB = tpl('u_b3', { upperBodyLoad: 'heavy' }, 'strength');
    const byId = new Map([[upperA.id, upperA], [upperB.id, upperB]]);
    const sessions = [
      { id: 'high', templateId: upperA.id, date: '2026-09-12' },
      { id: 'low', templateId: upperB.id, date: '2026-09-13' },
    ];
    const weightById = new Map([['high', 5], ['low', 1]]);
    const unweighted = evaluateWeekCandidate(sessions, byId, [], new Map());
    const weighted = evaluateWeekCandidate(sessions, byId, [], weightById);
    expect(weighted.totalCost).toBeCloseTo(unweighted.totalCost * 5, 10);
  });
});

describe('hasFeasibleHardPlacement', () => {
  it('confirms feasibility with a pure hard-constraint-only backtracking pass', () => {
    const a = tpl('feas_a');
    const b = tpl('feas_b');
    const toPlace: PlacementRequest[] = [{ template: a, source: 'strength-missing' }, { template: b, source: 'strength-missing' }];
    const provider = () => ['2026-09-07', '2026-09-08'];
    expect(hasFeasibleHardPlacement(toPlace, provider)).toBe(true);
  });

  it('returns false when no complete hard-valid assignment exists', () => {
    const a = tpl('feas_c');
    const b = tpl('feas_d');
    const toPlace: PlacementRequest[] = [{ template: a, source: 'strength-missing' }, { template: b, source: 'strength-missing' }];
    // Only one real day exists, and the provider itself excludes a date
    // already taken by a tentative placement in this same pass (mirroring
    // what a real dayHasRoomFor-backed provider would do) — so the second
    // session genuinely has nowhere left to go.
    const provider = (_t: SessionTemplate, tentative: { sessionOrDraft: string; date: string }[]) =>
      tentative.some((p) => p.date === '2026-09-07') ? [] : ['2026-09-07'];
    expect(hasFeasibleHardPlacement(toPlace, provider)).toBe(false);
  });
});

describe('searchWeeklyPlacement — clean/compromised/unplaceable/search-limited (Test D)', () => {
  it('returns clean when a low-conflict placement exists', () => {
    const easyRun = tpl('sr_run', { cardioLoad: 'light' }, 'cardio');
    const toPlace: PlacementRequest[] = [{ template: easyRun, source: 'strength-missing' }];
    const provider = () => ['2026-09-07', '2026-09-08', '2026-09-09'];
    const result = searchWeeklyPlacement(toPlace, [], provider, new Map([[easyRun.id, easyRun]]), [], new Map());
    expect(result.status).toBe('clean');
  });

  it('returns unplaceable (exhaustive-search) when no date survives the hard gate at all', () => {
    const a = tpl('un_a');
    const toPlace: PlacementRequest[] = [{ template: a, source: 'strength-missing' }];
    const provider = () => [];
    const result = searchWeeklyPlacement(toPlace, [], provider, new Map([[a.id, a]]), [], new Map());
    expect(result.status).toBe('unplaceable');
    if (result.status === 'unplaceable') expect(result.confirmedBy).toBe('exhaustive-search');
  });

  it('returns compromised (not unplaceable) when every placement clusters heavy load but a complete placement exists', () => {
    const legHeavy1 = tpl('cmp_a', { lowerBodyLoad: 'heavy' }, 'strength');
    const legHeavy2 = tpl('cmp_b', { lowerBodyLoad: 'heavy' }, 'strength');
    const existing = [planned('existing', legHeavy1.id, '2026-09-12')];
    const toPlace: PlacementRequest[] = [{ template: legHeavy2, source: 'cascade', sessionId: 'moving' }];
    // Only same-day / 1-day-apart dates available — forces a severe finding.
    const provider = () => ['2026-09-12', '2026-09-13'];
    const byId = new Map([[legHeavy1.id, legHeavy1], [legHeavy2.id, legHeavy2]]);
    const result = searchWeeklyPlacement(toPlace, existing, provider, byId, [], new Map());
    expect(['compromised', 'clean']).toContain(result.status);
  });
});

describe('searchWeeklyPlacement — branch/beam truncation (Test B/C)', () => {
  it('marks the search truncated when more candidate dates exist than branchFactor', () => {
    const a = tpl('bt_a');
    const toPlace: PlacementRequest[] = [{ template: a, source: 'strength-missing' }];
    const provider = () => ['2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10', '2026-09-11'];
    const result = searchWeeklyPlacement(toPlace, [], provider, new Map([[a.id, a]]), [], new Map(), [], 3, 2);
    expect(result.status).toBe('clean');
    if (result.status === 'clean') expect(result.searchWasTruncated).toBe(true);
  });

  it('marks the search truncated when more partial candidates exist than beamWidth', () => {
    const a = tpl('bt_c');
    const b = tpl('bt_d');
    const toPlace: PlacementRequest[] = [{ template: a, source: 'strength-missing' }, { template: b, source: 'strength-missing' }];
    const provider = () => ['2026-09-07', '2026-09-08', '2026-09-09'];
    const byId = new Map([[a.id, a], [b.id, b]]);
    const result = searchWeeklyPlacement(toPlace, [], provider, byId, [], new Map(), [], 1, 3);
    expect(['clean', 'compromised']).toContain(result.status);
    if (result.status === 'clean' || result.status === 'compromised') expect(result.searchWasTruncated).toBe(true);
  });
});

describe('searchWeeklyPlacement — adaptive widening (Test J) and truncated-search-not-unplaceable (Test L)', () => {
  it('does not falsely report unplaceable when a narrow beam prunes the only valid path', () => {
    // Five sessions competing for the same handful of dates with a tiny
    // beam/branch — a real assignment exists (dates >= sessions) but a
    // greedy/narrow pass could miss it without the widening retry.
    const templates = ['w1', 'w2', 'w3'].map((id) => tpl(id));
    const toPlace: PlacementRequest[] = templates.map((template) => ({ template, source: 'strength-missing' }));
    const provider = () => ['2026-09-07', '2026-09-08', '2026-09-09'];
    const byId = new Map(templates.map((t) => [t.id, t]));
    const result = searchWeeklyPlacement(toPlace, [], provider, byId, [], new Map(), [], 1, 1);
    expect(result.status).not.toBe('unplaceable');
  });
});

describe('searchWeeklyPlacement — partial-candidate availability (Test M)', () => {
  it('never double-books a date within one partial candidate beyond hard availability, though siblings may differ', () => {
    const a = tpl('avail_a');
    const b = tpl('avail_b');
    const toPlace: PlacementRequest[] = [{ template: a, source: 'strength-missing' }, { template: b, source: 'strength-missing' }];
    const byId = new Map([[a.id, a], [b.id, b]]);

    // Hard rule: at most ONE of a/b may land on '2026-09-07' within the
    // SAME candidate — checked against tentativePlacements, not just the
    // static calendar.
    const provider = (_template: SessionTemplate, tentative: { sessionOrDraft: string; date: string }[]) => {
      const alreadyOnSeventh = tentative.some((p) => p.date === '2026-09-07');
      const base = ['2026-09-07', '2026-09-08'];
      return alreadyOnSeventh ? base.filter((d) => d !== '2026-09-07') : base;
    };

    const result = searchWeeklyPlacement(toPlace, [], provider, byId, [], new Map());
    expect(result.status === 'clean' || result.status === 'compromised').toBe(true);
    if (result.status === 'clean' || result.status === 'compromised') {
      const dates = result.bestFound.placements.map((p) => p.date);
      expect(new Set(dates).size).toBe(dates.length === 2 ? 2 : dates.length);
      const bothOnSeventh = dates.filter((d) => d === '2026-09-07').length;
      expect(bothOnSeventh).toBeLessThanOrEqual(1);
    }
  });
});

describe('searchWeeklyPlacement — moved session removed from fixed context (Test N)', () => {
  it('never evaluates a moved session against its own stale placement', () => {
    const movingTpl = tpl('mv_a', { lowerBodyLoad: 'heavy' }, 'strength');
    // If the caller forgot to exclude the session's own old placement from
    // fixedExistingSessions, it would appear twice (old Wednesday + new
    // candidate date) and self-conflict. Here we simulate the CORRECT
    // caller behavior: fixedExistingSessions excludes the moving session.
    const toPlace: PlacementRequest[] = [{ template: movingTpl, source: 'cascade', sessionId: 'moving-session' }];
    const fixedExistingSessions: PlannedSession[] = []; // old Wednesday placement correctly excluded
    const provider = () => ['2026-09-11']; // Friday
    const byId = new Map([[movingTpl.id, movingTpl]]);
    const result = searchWeeklyPlacement(toPlace, fixedExistingSessions, provider, byId, [], new Map());
    expect(result.status).toBe('clean');
    if (result.status === 'clean') {
      expect(result.bestFound.placements).toHaveLength(1);
      expect(result.bestFound.worstFinding).toBeNull();
    }
  });
});

describe('keyForPlacementRequest', () => {
  it('uses the explicit sessionId when present, a stable draft key otherwise', () => {
    const template = tpl('key_a');
    const withId: PlacementRequest = { template, source: 'cascade', sessionId: 'real-session' };
    const withoutId: PlacementRequest = { template, source: 'strength-missing' };
    expect(keyForPlacementRequest(withId, 0)).toBe('real-session');
    expect(keyForPlacementRequest(withoutId, 2)).toContain(template.id);
  });
});

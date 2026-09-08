import { describe, it, expect } from 'vitest';
import { computeWeeklyPrescriptionPlan } from './weeklyPrescriptionEngine';
import { keyId } from './capability';
import type { PlannedSession, SessionTemplate } from '../models/training';
import type { CapabilityGap } from '../models/capability';
import type { ProgressionDecision } from '../models/progression';
import type { TrainingGoal } from '../models/goals';
import type { GoalFocus, FeasibilityAssessment } from '../models/feasibility';
import type { TrainingAvailability } from '../models/goalEngineConfig';
import type { GoalOverview } from './goalOverview';
import type { WeeklyPrescription } from '../models/weeklyPrescription';

const ASOF = '2026-09-07'; // a Monday — committed = [09-07, 09-14], forecast starts 09-21
const ANCHOR_WEEK = '2026-09-14';
const FORECAST_WEEK_1 = '2026-09-21'; // week+2, weeksIntoForecast = 1
const FORECAST_WEEK_2 = '2026-09-28'; // week+3, weeksIntoForecast = 2

const ASCENT_KEY = { dimension: 'ascent_capacity' as const };
const ASCENT_KEY_ID = keyId(ASCENT_KEY);

function availability(overrides: Partial<TrainingAvailability> = {}): TrainingAvailability {
  return { allowedDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], dailyTimeBudget: {}, longSessionDays: ['sun'], temporaryExceptions: [], ...overrides };
}

function goal(overrides: Partial<TrainingGoal> = {}): TrainingGoal {
  return {
    id: 'goal-gr5', name: 'GR5', requirements: [], createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    status: 'active', targetDate: '2026-10-18', // ~specific band — irrelevant to the fixtures below, none depend on growth gating
    ...overrides,
  } as TrainingGoal;
}

function gap(overrides: Partial<CapabilityGap> = {}): CapabilityGap {
  return { key: ASCENT_KEY, demand: { amount: 1000, unit: 'm_elevation_gain' }, status: 'meets', confidence: 'medium', criticality: 'critical', explanation: '', ...overrides };
}

function focus(overrides: Partial<GoalFocus> = {}): GoalFocus {
  return { goalId: 'goal-gr5', score: 50, normalizedPct: 100, reasons: [], asOf: ASOF, ...overrides };
}

function feasibility(overrides: Partial<FeasibilityAssessment> = {}): FeasibilityAssessment {
  return { goalId: 'goal-gr5', status: 'on_track', confidence: 'medium', explanation: '', ...overrides };
}

function overview(overrides: Partial<GoalOverview> = {}): GoalOverview {
  const g = overrides.goal ?? goal();
  return { goal: g, gaps: overrides.gaps ?? [gap()], feasibility: overrides.feasibility ?? feasibility({ goalId: g.id }), focus: overrides.focus ?? focus({ goalId: g.id }) };
}

function decision(overrides: Partial<ProgressionDecision> = {}): ProgressionDecision {
  return { key: ASCENT_KEY, state: 'progress', reason: 'test reason', ruleId: 'TEST', poorResponsePattern: false, accumulationReviewDue: false, ...overrides };
}

const tplHike: SessionTemplate = {
  id: 'tpl_hike', name: 'Berghike', type: 'hiking', durationVariants: { full: 120 },
  outdoorTarget: { targetElevationM: 800, targetDistanceKm: 15 },
};
const tplStrength: SessionTemplate = { id: 'tpl_strength', name: 'Kracht A', type: 'strength', durationVariants: { full: 60 } };

function session(id: string, templateId: string, scheduledDate: string, weekStartDate: string): PlannedSession {
  return { id, templateId, scheduledDate, weekStartDate, status: 'planned', order: 0 };
}

describe('computeWeeklyPrescriptionPlan', () => {
  it('folds multi-week sequentially: week+3 grows off week+2\'s freshly computed row when no persisted history exists yet, and every item stays in the forecast range', () => {
    const plannedSessions = [
      // Anchor (latest committed) week — baseline coverage of 1 for ascent_capacity.
      session('anchor1', tplHike.id, '2026-09-16', ANCHOR_WEEK),
      // Forecast week+2 already has one matching session; week+3 has none yet.
      session('fw1-1', tplHike.id, '2026-09-23', FORECAST_WEEK_1),
    ];

    const result = computeWeeklyPrescriptionPlan(
      [FORECAST_WEEK_1, FORECAST_WEEK_2], [goal()], [overview()], new Map([[ASCENT_KEY_ID, decision({ state: 'progress' })]]),
      plannedSessions, [tplHike], availability(), null, [], [], undefined, undefined, ASOF,
    );

    expect(result.prescriptions).toHaveLength(2);
    expect(result.prescriptions.map((p) => p.weekStartDate)).toEqual([FORECAST_WEEK_1, FORECAST_WEEK_2]);
    expect(result.prescriptions[0].lines[0].targetSessionCount).toBe(2); // baseline 1 + 1 (progress, under cap)
    expect(result.prescriptions[1].lines[0].targetSessionCount).toBe(2); // driven by the fixed anchor baseline, not week+2's own output

    // Every emitted item lands on/after the first forecast week — never inside the committed range (09-07..09-20).
    // A 'replace' item (content-only, Stap 3) carries no date fields of its
    // own — checked instead via which planned session it points at.
    const plannedById = new Map(plannedSessions.map((s) => [s.id, s]));
    for (const item of result.proposal.changes) {
      const date = item.newSessionDraft?.scheduledDate ?? item.toDate ?? item.fromDate;
      if (date !== undefined) {
        expect(date >= FORECAST_WEEK_1).toBe(true);
      } else if (item.plannedSessionId) {
        expect(plannedById.get(item.plannedSessionId)?.weekStartDate).not.toBe(ANCHOR_WEEK);
      }
    }

    expect(result.proposal.trigger).toBe('weekly_prescription_computed');
  });

  it('Test CANDIDATE-NUMBERS-ACTUALLY-SUPPLIED: a progress line whose session count didn\'t change still gets a real, non-undefined targetDistance/elevationGain on its TrainingPrescription', () => {
    const plannedSessions = [
      // Anchor week already at the progress session-count cap (2) — so
      // growth is withheld this run, but the volume multiplier still
      // applies: exactly the "count unchanged, content changed" gap this
      // step exists to close.
      session('anchor1', tplHike.id, '2026-09-16', ANCHOR_WEEK),
      session('anchor2', tplHike.id, '2026-09-18', ANCHOR_WEEK),
      session('fw1-1', tplHike.id, '2026-09-21', FORECAST_WEEK_1),
      session('fw1-2', tplHike.id, '2026-09-24', FORECAST_WEEK_1),
    ];

    const result = computeWeeklyPrescriptionPlan(
      [FORECAST_WEEK_1], [goal()], [overview()], new Map([[ASCENT_KEY_ID, decision({ state: 'progress' })]]),
      plannedSessions, [tplHike], availability(), null, [], [], undefined, undefined, ASOF,
    );

    const line = result.prescriptions[0].lines[0];
    expect(line.targetSessionCount).toBe(2); // unchanged — at cap
    expect(line.decision).toBe('progress'); // but the state genuinely is progress, not consolidate

    // No add/remove needed for this template this week (already 2 present) —
    // the update must come through the "count unchanged, content changed" path.
    expect(result.proposal.changes.some((i) => i.action === 'add' || i.action === 'remove')).toBe(false);

    const replaceItems = result.proposal.changes.filter((i) => i.action === 'replace' && (i.plannedSessionId === 'fw1-1' || i.plannedSessionId === 'fw1-2'));
    expect(replaceItems.length).toBeGreaterThan(0);

    const writtenIds = new Set(replaceItems.map((i) => i.newPrescriptionId));
    const written = result.newTrainingPrescriptions.filter((p) => writtenIds.has(p.id));
    expect(written.length).toBeGreaterThan(0);
    for (const prescription of written) {
      expect(prescription.elevationGain).toBeDefined();
      expect(prescription.elevationGain!.amount).toBeGreaterThan(0);
    }
  });

  it('Test STRENGTH-OCCUPANCY-NEVER-BYPASSED: a week already fully booked with strength sessions never gets a session silently double-booked onto an occupied day', () => {
    // Strength is not a protected type here (only 'recovery' is — same
    // precedent as engine/strengthScheduling.ts) and engine/demand.ts never
    // produces a CapabilityDemand for 'strength'/'aerobic_engine', so a
    // pure-strength session has no honestly computable Goal Focus relevance
    // — it IS a legitimate, AUDITED swap candidate when a goal needs the
    // day more (the same goal-relevance-ranked swap strengthScheduling.ts's
    // own reconciliation already uses). "Never bypassed" means never a
    // SILENT double-booking on an already-occupied day — every 'add' must
    // be paired with an explicit 'remove' item freeing that exact date
    // first, fully visible in the audit trail, never two sessions silently
    // sharing one day.
    const fullWeek = ['2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25', '2026-09-26', '2026-09-27'];
    const plannedSessions = [
      session('anchor1', tplHike.id, '2026-09-16', ANCHOR_WEEK), // baseline 1 — under the progress cap, so growth is genuinely requested
      ...fullWeek.map((d, i) => session(`str${i}`, tplStrength.id, d, FORECAST_WEEK_1)),
    ];

    const result = computeWeeklyPrescriptionPlan(
      [FORECAST_WEEK_1], [goal()], [overview()], new Map([[ASCENT_KEY_ID, decision({ state: 'progress' })]]),
      plannedSessions, [tplHike, tplStrength], availability(), null, [], [], undefined, undefined, ASOF,
    );

    // The line genuinely wanted growth (baseline 1 -> target 2)...
    expect(result.prescriptions[0].lines[0].targetSessionCount).toBe(2);

    const adds = result.proposal.changes.filter((i) => i.action === 'add');
    const removes = result.proposal.changes.filter((i) => i.action === 'remove');
    expect(adds.length).toBeGreaterThan(0); // the growth request was honored...

    // ...but never as a silent double-booking: every add's date was freed
    // by an explicit, audited remove of whatever strength session sat
    // there — the mechanism (goal-relevance-ranked swap), never a bypass.
    for (const add of adds) {
      const date = add.newSessionDraft!.scheduledDate;
      const freed = removes.find((r) => r.toDate === date);
      expect(freed).toBeDefined();
      expect(fullWeek.some((_d, idx) => freed!.plannedSessionId === `str${idx}`)).toBe(true);
      expect(freed!.reason?.length).toBeGreaterThan(0); // never an unexplained removal
    }
  });

  it('week-over-week KEEP: a matching skeleton keeps from the second forecast week onward (the first forecast week has no computed predecessor to compare against), and stays keep on re-run with no new items', () => {
    const FORECAST_WEEK_3 = '2026-10-05'; // week+4, weeksIntoForecast = 3
    const plannedSessions = [
      session('anchor1', tplHike.id, '2026-09-16', ANCHOR_WEEK),
      session('fw1-1', tplHike.id, '2026-09-21', FORECAST_WEEK_1),
      session('fw2-1', tplHike.id, '2026-09-28', FORECAST_WEEK_2),
      session('fw3-1', tplHike.id, '2026-10-05', FORECAST_WEEK_3),
    ];
    const decisionsByKey = new Map([[ASCENT_KEY_ID, decision({ state: 'consolidate' })]]);
    const weekStarts = [FORECAST_WEEK_1, FORECAST_WEEK_2, FORECAST_WEEK_3];

    const first = computeWeeklyPrescriptionPlan(
      weekStarts, [goal()], [overview()], decisionsByKey, plannedSessions, [tplHike], availability(), null, [], [], undefined, undefined, ASOF,
    );

    // week+2 has no predecessor (week+1, committed, is never itself a
    // WeeklyPrescription) — it's always freshly stated, never silently 'keep'.
    expect(first.prescriptions[0].lines[0].decision).toBe('consolidate');
    // week+3 and week+4 match the immediately preceding week's freshly
    // folded row within this same run — the sequential-fold contract.
    expect(first.prescriptions[1].lines[0].decision).toBe('keep');
    expect(first.prescriptions[2].lines[0].decision).toBe('keep');
    expect(first.proposal.changes).toEqual([]); // nothing to place — every week already matches its target

    const second = computeWeeklyPrescriptionPlan(
      weekStarts, [goal()], [overview()], decisionsByKey, plannedSessions, [tplHike], availability(), null, first.prescriptions, [], undefined, undefined, ASOF,
    );

    // Re-running with the exact same inputs (nothing genuinely changed):
    // deterministic, same-input-same-output — consecutiveKeepWeeks is a
    // snapshot of how far the repeating pattern currently extends across
    // THIS batch, not a counter that keeps accumulating across identical
    // re-runs (that would violate "same input -> same output").
    expect(second.prescriptions[1].lines[0].decision).toBe('keep');
    expect(second.prescriptions[1].consecutiveKeepWeeks).toBe((first.prescriptions[1] as WeeklyPrescription).consecutiveKeepWeeks);
    expect(second.proposal.changes).toEqual([]);
  });

  it('a persisted row for a week no longer in the current batch (the horizon rolled forward) still extends the keep chain — never just the freshly-recomputed sibling', () => {
    const FORECAST_WEEK_3 = '2026-10-05'; // week+4 relative to FORECAST_WEEK_1
    const plannedSessions = [
      session('anchor1', tplHike.id, '2026-09-16', ANCHOR_WEEK),
      session('fw1-1', tplHike.id, '2026-09-21', FORECAST_WEEK_1),
      session('fw2-1', tplHike.id, '2026-09-28', FORECAST_WEEK_2),
      session('fw3-1', tplHike.id, '2026-10-05', FORECAST_WEEK_3),
    ];
    const decisionsByKey = new Map([[ASCENT_KEY_ID, decision({ state: 'consolidate' })]]);

    // Batch 1 (today): [week+2, week+3] — week+3 keeps with consecutiveKeepWeeks 1.
    const batch1 = computeWeeklyPrescriptionPlan(
      [FORECAST_WEEK_1, FORECAST_WEEK_2], [goal()], [overview()], decisionsByKey, plannedSessions, [tplHike], availability(), null, [], [], undefined, undefined, ASOF,
    );
    expect(batch1.prescriptions[1].consecutiveKeepWeeks).toBe(1);

    // Batch 2 (a later boot): the horizon shifted — week+2 is no longer
    // computed at all, only [week+3, week+4]. week+3's predecessor
    // (week+2) is NOT in this run's own fresh output — it must be found in
    // the persisted history from batch 1, or the chain silently breaks.
    const batch2 = computeWeeklyPrescriptionPlan(
      [FORECAST_WEEK_2, FORECAST_WEEK_3], [goal()], [overview()], decisionsByKey, plannedSessions, [tplHike], availability(), null, batch1.prescriptions, [], undefined, undefined, ASOF,
    );

    expect(batch2.prescriptions[0].weekStartDate).toBe(FORECAST_WEEK_2);
    expect(batch2.prescriptions[0].lines[0].decision).toBe('keep'); // chain continues via the persisted week+2 row
    expect(batch2.prescriptions[0].consecutiveKeepWeeks).toBe(1); // same as batch 1 — deterministic given identical inputs
    // week+4, brand new to any batch, folds off week+3's fresh row within this same run.
    expect(batch2.prescriptions[1].lines[0].decision).toBe('keep');
    expect(batch2.prescriptions[1].consecutiveKeepWeeks).toBe(2);
  });
});

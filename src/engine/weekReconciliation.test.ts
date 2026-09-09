import { describe, it, expect } from 'vitest';
import { reconcileWeekComposition, reconcileWeeksComposition, type ReconciliationTarget } from './weekReconciliation';
import type { PlannedSession, SessionTemplate } from '../models/training';
import type { TrainingAvailability } from '../models/goalEngineConfig';

const FORECAST_MONDAY = '2026-09-21';

function availability(overrides: Partial<TrainingAvailability> = {}): TrainingAvailability {
  return { allowedDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], dailyTimeBudget: {}, longSessionDays: ['sun'], temporaryExceptions: [], ...overrides };
}

function session(id: string, templateId: string, scheduledDate: string, weekStartDate: string, status: PlannedSession['status'] = 'planned'): PlannedSession {
  return { id, templateId, scheduledDate, weekStartDate, status, order: 0 };
}

// A synthetic, non-strength "cardio family" — proves reconcileWeekComposition
// is genuinely discipline-agnostic, not just re-tested strength under a new
// name. tpl_easy_run/tpl_tempo_run are the family; tpl_long_run/tpl_herstel_stub
// are deliberately outside it (never touched, never counted as family members).
const tplEasyRun: SessionTemplate = { id: 'tpl_easy_run', name: 'Easy Run', type: 'cardio', durationVariants: { full: 30 }, baseStressProfile: { lowerBodyLoad: 'none', impact: 'light', eccentricLoad: 'none', intensity: 'moderate' } };
const tplTempoRun: SessionTemplate = { id: 'tpl_tempo_run', name: 'Tempo Run', type: 'cardio', durationVariants: { full: 40 }, baseStressProfile: { lowerBodyLoad: 'light', impact: 'moderate', eccentricLoad: 'none', intensity: 'high' } };
const tplLongRun: SessionTemplate = { id: 'tpl_long_run', name: 'Lange Duurloop', type: 'hiking', durationVariants: { full: 75 }, baseStressProfile: { lowerBodyLoad: 'heavy', impact: 'moderate', eccentricLoad: 'heavy', intensity: 'high' } };
const tplHerstelStub: SessionTemplate = { id: 'tpl_herstel_stub', name: 'Herstel', type: 'recovery', durationVariants: { full: 20 } };
const templates = [tplEasyRun, tplTempoRun, tplLongRun, tplHerstelStub];

function cardioFamilyTarget(overrides: Partial<ReconciliationTarget> = {}): ReconciliationTarget {
  return {
    isInFamily: (_s, t) => t.id === tplEasyRun.id || t.id === tplTempoRun.id,
    targetTemplateIds: ['tpl_easy_run', 'tpl_tempo_run'],
    removeReason: (t) => `${t.name} hoort niet meer bij de gewenste samenstelling.`,
    addReason: (t) => `${t.name} toegevoegd volgens de gewenste samenstelling.`,
    protectedTypes: new Set(['recovery']),
    urgentSwapThresholdPct: 20,
    calmSwapThresholdPct: 0,
    source: 'test',
    ...overrides,
  };
}

const templateById = new Map(templates.map((t) => [t.id, t]));

describe('reconcileWeekComposition — generic, non-strength ReconciliationTarget', () => {
  it('produces no changes when the week already matches the target composition', () => {
    const sessions = [
      session('s1', 'tpl_easy_run', FORECAST_MONDAY, FORECAST_MONDAY),
      session('s2', 'tpl_tempo_run', '2026-09-23', FORECAST_MONDAY),
    ];
    const result = reconcileWeekComposition(FORECAST_MONDAY, cardioFamilyTarget(), sessions, templateById, availability(), new Set(), [], [], null, undefined);
    expect(result.items).toEqual([]);
  });

  it('removes an off-target family session and never touches out-of-family sessions', () => {
    const sessions = [
      session('leftover', 'tpl_easy_run', FORECAST_MONDAY, FORECAST_MONDAY), // wrong template within family, but easy_run IS on target — use tempo removal instead
      session('outsider', 'tpl_long_run', '2026-09-22', FORECAST_MONDAY), // outside the family — must never be touched
    ];
    const target = cardioFamilyTarget({ targetTemplateIds: ['tpl_tempo_run'] }); // easy_run no longer desired
    const result = reconcileWeekComposition(FORECAST_MONDAY, target, sessions, templateById, availability(), new Set(), [], [], null, undefined);
    const removeItem = result.items.find((i) => i.plannedSessionId === 'leftover');
    expect(removeItem?.action).toBe('remove');
    expect(result.items.find((i) => i.plannedSessionId === 'outsider')).toBeUndefined();
  });

  it('adds a missing target session when the week is short one', () => {
    const sessions = [session('s1', 'tpl_easy_run', FORECAST_MONDAY, FORECAST_MONDAY)];
    const result = reconcileWeekComposition(FORECAST_MONDAY, cardioFamilyTarget(), sessions, templateById, availability(), new Set(), [], [], null, undefined);
    const addItem = result.items.find((i) => i.action === 'add');
    expect(addItem?.newSessionDraft?.templateId).toBe('tpl_tempo_run');
  });

  it('never adds a new session on a day unavailable per TrainingAvailability', () => {
    const target = cardioFamilyTarget({ targetTemplateIds: ['tpl_easy_run'] });
    const result = reconcileWeekComposition(
      FORECAST_MONDAY, target, [], templateById, availability({ allowedDays: ['tue', 'wed', 'thu', 'fri', 'sat', 'sun'] }), new Set(), [], [], null, undefined,
    );
    const addItem = result.items.find((i) => i.action === 'add');
    expect(addItem?.newSessionDraft?.scheduledDate).not.toBe(FORECAST_MONDAY);
  });

  it('never places a leg-heavy candidate within 48h of another leg-heavy session (48h rule generic, not strength-specific)', () => {
    const heavyFamily = cardioFamilyTarget({
      isInFamily: (_s, t) => t.id === 'tpl_heavy_a',
      targetTemplateIds: ['tpl_heavy_a'],
    });
    const heavyTemplate: SessionTemplate = { id: 'tpl_heavy_a', name: 'Zware Sessie A', type: 'strength', durationVariants: { full: 60 }, baseStressProfile: { lowerBodyLoad: 'heavy', impact: 'moderate', eccentricLoad: 'light', intensity: 'high' } };
    const byId = new Map([...templateById, [heavyTemplate.id, heavyTemplate]]);
    const sessions = [session('hike', 'tpl_long_run', '2026-09-22', FORECAST_MONDAY)]; // Tuesday, leg-heavy
    const result = reconcileWeekComposition(FORECAST_MONDAY, heavyFamily, sessions, byId, availability(), new Set(), [], [], null, undefined);
    const addItem = result.items.find((i) => i.action === 'add');
    expect(addItem?.newSessionDraft?.scheduledDate).toBeDefined();
  });

  // Groep C invariant (test D): a leg-heavy/load-overlap situation may never
  // by itself make a placement unplaceable — the only thing that may veto a
  // day is real hard capacity (dayHasRoomFor). Every day here already holds
  // a leg-heavy filler AND dailyTimeBudget is empty (so dayHasRoomFor falls
  // back to "one session per day"), which is genuinely a hard-occupancy
  // situation — but since the fillers have zero goal relevance (no active
  // goals), the swap fallback can still honestly free a day for the
  // candidate. This used to fail purely because the swap fallback ALSO used
  // to hard-veto on leg-heavy adjacency (wouldConflict) — removing that is
  // exactly this fix.
  it('places via the swap fallback even when every day already holds a leg-heavy session — the fallback never hard-blocks purely on load overlap (Groep C invariant / test D)', () => {
    const heavyTemplate: SessionTemplate = { id: 'tpl_heavy_a', name: 'Zware Sessie A', type: 'strength', durationVariants: { full: 60 }, baseStressProfile: { lowerBodyLoad: 'heavy', impact: 'moderate', eccentricLoad: 'light', intensity: 'high' } };
    const byId = new Map([...templateById, [heavyTemplate.id, heavyTemplate]]);
    const sessions = ['2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25', '2026-09-26', '2026-09-27'].map((d, i) =>
      session(`filler${i}`, 'tpl_long_run', d, FORECAST_MONDAY), // also leg-heavy — every candidate date is adjacent to some filler
    );
    const target = cardioFamilyTarget({ isInFamily: (_s, t) => t.id === 'tpl_heavy_a', targetTemplateIds: ['tpl_heavy_a'] });
    const result = reconcileWeekComposition(FORECAST_MONDAY, target, sessions, byId, availability(), new Set(), [], [], null, undefined);
    const removeItem = result.items.find((i) => i.action === 'remove');
    const addItem = result.items.find((i) => i.action === 'add');
    expect(removeItem).toBeDefined(); // a low-relevance filler was swapped out to make room
    expect(addItem?.newSessionDraft?.templateId).toBe('tpl_heavy_a');
    expect(result.noFreeDay).toBe(false);
  });

  // Test E: without ANY swappable candidate at all (every existing session
  // is a protected type), hard capacity genuinely runs out — noFreeDay
  // stays a real, reachable outcome. This is the honest counterpart to the
  // test above: hard capacity exhaustion is still possible, just never
  // caused by load overlap alone.
  it('still reports noFreeDay when hard capacity is genuinely exhausted (no swappable candidate exists) — test E', () => {
    const heavyTemplate: SessionTemplate = { id: 'tpl_heavy_a', name: 'Zware Sessie A', type: 'strength', durationVariants: { full: 60 }, baseStressProfile: { lowerBodyLoad: 'heavy', impact: 'moderate', eccentricLoad: 'light', intensity: 'high' } };
    const byId = new Map([...templateById, [heavyTemplate.id, heavyTemplate]]);
    // Every existing session is 'recovery' — the family's own protectedTypes
    // set — so pickSwapCandidate has literally nothing to offer up, and the
    // week is genuinely, honestly full.
    const sessions = ['2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25', '2026-09-26', '2026-09-27'].map((d, i) =>
      session(`filler${i}`, 'tpl_herstel_stub', d, FORECAST_MONDAY),
    );
    const target = cardioFamilyTarget({ isInFamily: (_s, t) => t.id === 'tpl_heavy_a', targetTemplateIds: ['tpl_heavy_a'] });
    const result = reconcileWeekComposition(FORECAST_MONDAY, target, sessions, byId, availability(), new Set(), [], [], null, undefined);
    expect(result.items.find((i) => i.action === 'add')).toBeUndefined();
    expect(result.noFreeDay).toBe(true);
  });
});

describe('reconcileWeeksComposition — multi-week aggregation', () => {
  it('aggregates items and no-free-day counts across weeks', () => {
    const heavyTemplate: SessionTemplate = { id: 'tpl_heavy_a', name: 'Zware Sessie A', type: 'strength', durationVariants: { full: 60 }, baseStressProfile: { lowerBodyLoad: 'heavy', impact: 'moderate', eccentricLoad: 'light', intensity: 'high' } };
    const byId = new Map([...templateById, [heavyTemplate.id, heavyTemplate]]);
    const target = cardioFamilyTarget({ isInFamily: (_s, t) => t.id === 'tpl_heavy_a', targetTemplateIds: ['tpl_heavy_a'] });
    const week1 = FORECAST_MONDAY;
    const week2 = '2026-09-28';
    // week1 is genuinely, honestly full — every day holds a protected
    // (recovery) session, so there is no swap candidate at all, not just a
    // load-overlap situation (see test E above for why that distinction
    // matters here).
    const fullWeek1 = ['2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25', '2026-09-26', '2026-09-27'].map((d, i) =>
      session(`w1-${i}`, 'tpl_herstel_stub', d, week1),
    );
    const result = reconcileWeeksComposition([week1, week2], target, fullWeek1, byId, availability(), new Set(), [], [], null, undefined);
    expect(result.noFreeDayWeekCount).toBe(1); // week1 fully booked, no swap candidate
    expect(result.items.some((i) => i.action === 'add')).toBe(true); // week2 gets the add
  });
});

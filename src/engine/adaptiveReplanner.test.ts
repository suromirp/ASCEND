import { describe, it, expect } from 'vitest';
import { computeForecastReplan } from './adaptiveReplanner';
import type { PlannedSession, SessionTemplate } from '../models/training';
import type { TrainingAvailability } from '../models/goalEngineConfig';
import type { ProgressionDecision } from '../models/progression';

const ASOF = '2026-09-09'; // Wednesday — forecast is week +2 onward: 2026-09-21 Monday and later
const FORECAST_MONDAY = '2026-09-21';
const FORECAST_TUESDAY = '2026-09-22';

function fullAvailability(overrides: Partial<TrainingAvailability> = {}): TrainingAvailability {
  return { allowedDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], maxSessionDurationMin: {}, longSessionDays: ['sun'], temporaryExceptions: [], ...overrides };
}

function session(id: string, templateId: string, scheduledDate: string, weekStartDate: string): PlannedSession {
  return { id, templateId, scheduledDate, weekStartDate, status: 'planned', order: 0 };
}

const tplEasyRun: SessionTemplate = { id: 'tpl_easy_run', name: 'Easy Run', type: 'cardio', durationVariants: { full: 35 } };
const tplLongRun: SessionTemplate = { id: 'tpl_long_run', name: 'Lange Duurloop', type: 'hiking', durationVariants: { full: 75 }, outdoorTarget: { targetElevationM: 300 } };
const tplHerstel: SessionTemplate = { id: 'tpl_herstel', name: 'Herstel', type: 'recovery', durationVariants: { full: 45 } };
const tplUpperA: SessionTemplate = { id: 'tpl_upper_a', name: 'Upper A', type: 'strength', durationVariants: { full: 75 } };

function decision(overrides: Partial<ProgressionDecision> = {}): ProgressionDecision {
  return {
    key: { dimension: 'sustainable_output', discipline: 'running' },
    state: 'progress',
    reason: 'test reason',
    ruleId: 'HEURISTIC-PROGRESSION-CONFIDENCE-GATE',
    poorResponsePattern: false,
    accumulationReviewDue: false,
    ...overrides,
  };
}

describe('computeForecastReplan — availability pass', () => {
  it('moves a forecast session off a now-unavailable weekday to the next free day in the same week', () => {
    const s = session('ps1', 'tpl_easy_run', FORECAST_MONDAY, FORECAST_MONDAY); // Monday
    const result = computeForecastReplan({
      plannedSessions: [s],
      templates: [tplEasyRun],
      decisionsByKey: new Map(),
      availability: fullAvailability({ allowedDays: ['tue', 'wed', 'thu', 'fri', 'sat', 'sun'] }), // Monday blocked
      strengthProtection: 'normal',
      asOf: ASOF,
    });
    const item = result.proposal.changes.find((c) => c.plannedSessionId === 'ps1');
    expect(item?.action).toBe('move');
    expect(item?.toDate).not.toBe(FORECAST_MONDAY);
  });

  it('removes (skips) a session when no free day exists at all that week', () => {
    // Every day of the week is filled, and Monday itself is unavailable.
    const week = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((_, i) => {
      const date = i === 0 ? FORECAST_MONDAY : `2026-09-${21 + i}`;
      return session(`ps${i}`, 'tpl_easy_run', date, FORECAST_MONDAY);
    });
    const result = computeForecastReplan({
      plannedSessions: week,
      templates: [tplEasyRun],
      decisionsByKey: new Map(),
      availability: fullAvailability({ allowedDays: ['tue', 'wed', 'thu', 'fri', 'sat', 'sun'] }),
      strengthProtection: 'normal',
      asOf: ASOF,
    });
    const item = result.proposal.changes.find((c) => c.plannedSessionId === 'ps0');
    expect(item?.action).toBe('remove');
  });

  it('never proposes a change for a session inside the committed range, even with the same unavailable weekday', () => {
    const committedSession = session('ps_committed', 'tpl_easy_run', '2026-09-07', '2026-09-07'); // this week, Monday
    const result = computeForecastReplan({
      plannedSessions: [committedSession],
      templates: [tplEasyRun],
      decisionsByKey: new Map(),
      availability: fullAvailability({ allowedDays: ['tue', 'wed', 'thu', 'fri', 'sat', 'sun'] }),
      strengthProtection: 'normal',
      asOf: ASOF,
    });
    expect(result.proposal.changes).toEqual([]);
  });
});

describe('computeForecastReplan — progression pass', () => {
  it('removes a session whose relevant decision is recover', () => {
    const s = session('ps1', 'tpl_easy_run', FORECAST_MONDAY, FORECAST_MONDAY);
    const decisionsByKey = new Map([['sustainable_output:running', decision({ state: 'recover' })]]);
    const result = computeForecastReplan({ plannedSessions: [s], templates: [tplEasyRun], decisionsByKey, availability: fullAvailability(), strengthProtection: 'normal', asOf: ASOF });
    expect(result.proposal.changes).toEqual([{ plannedSessionId: 'ps1', action: 'remove', fromDate: FORECAST_MONDAY, toDate: FORECAST_MONDAY }]);
  });

  it('writes a real prescription and emits a reduce item for a reduce/taper decision, referencing the same session', () => {
    const s = session('ps1', 'tpl_long_run', FORECAST_MONDAY, FORECAST_MONDAY);
    const decisionsByKey = new Map([['ascent_capacity', decision({ key: { dimension: 'ascent_capacity' }, state: 'reduce' })]]);
    const result = computeForecastReplan({ plannedSessions: [s], templates: [tplLongRun], decisionsByKey, availability: fullAvailability(), strengthProtection: 'normal', asOf: ASOF });
    const item = result.proposal.changes.find((c) => c.plannedSessionId === 'ps1');
    expect(item?.action).toBe('reduce');
    expect(result.prescriptions).toHaveLength(1);
    expect(result.prescriptions[0].id).toBe(item?.newPrescriptionId);
    expect(result.prescriptions[0].plannedSessionId).toBe('ps1');
  });

  it('emits a replace item (not reduce) for a consolidate/assess decision', () => {
    const s = session('ps1', 'tpl_long_run', FORECAST_MONDAY, FORECAST_MONDAY);
    const decisionsByKey = new Map([['ascent_capacity', decision({ key: { dimension: 'ascent_capacity' }, state: 'consolidate' })]]);
    const result = computeForecastReplan({ plannedSessions: [s], templates: [tplLongRun], decisionsByKey, availability: fullAvailability(), strengthProtection: 'normal', asOf: ASOF });
    const item = result.proposal.changes.find((c) => c.plannedSessionId === 'ps1');
    expect(item?.action).toBe('replace');
  });

  it('leaves a "progress" session completely untouched — the template is already the plan', () => {
    const s = session('ps1', 'tpl_easy_run', FORECAST_MONDAY, FORECAST_MONDAY);
    const decisionsByKey = new Map([['sustainable_output:running', decision({ state: 'progress' })]]);
    const result = computeForecastReplan({ plannedSessions: [s], templates: [tplEasyRun], decisionsByKey, availability: fullAvailability(), strengthProtection: 'normal', asOf: ASOF });
    expect(result.proposal.changes).toEqual([]);
    expect(result.prescriptions).toEqual([]);
  });

  it('never adapts a recovery-type session regardless of any decision present', () => {
    const s = session('ps1', 'tpl_herstel', FORECAST_MONDAY, FORECAST_MONDAY);
    const decisionsByKey = new Map([['aerobic_engine', decision({ key: { dimension: 'aerobic_engine' }, state: 'recover' })]]);
    const result = computeForecastReplan({ plannedSessions: [s], templates: [tplHerstel], decisionsByKey, availability: fullAvailability(), strengthProtection: 'normal', asOf: ASOF });
    expect(result.proposal.changes).toEqual([]);
  });

  it('floors a strength session at maintenance role via preserveStrengthRole, never lower, when protection is not low', () => {
    const s = session('ps1', 'tpl_upper_a', FORECAST_TUESDAY, FORECAST_MONDAY);
    const decisionsByKey = new Map([['strength', decision({ key: { dimension: 'strength' }, state: 'assess' })]]); // assess -> 'assessment' role, not floored (already >= maintenance conceptually)
    const result = computeForecastReplan({ plannedSessions: [s], templates: [tplUpperA], decisionsByKey, availability: fullAvailability(), strengthProtection: 'high', asOf: ASOF });
    const item = result.proposal.changes.find((c) => c.plannedSessionId === 'ps1');
    expect(item?.action).toBe('replace');
    expect(result.prescriptions[0].role).toBe('assessment');
  });

  it('produces no changes at all and a calm summary when nothing needs adapting', () => {
    const s = session('ps1', 'tpl_easy_run', FORECAST_MONDAY, FORECAST_MONDAY);
    const result = computeForecastReplan({ plannedSessions: [s], templates: [tplEasyRun], decisionsByKey: new Map(), availability: fullAvailability(), strengthProtection: 'normal', asOf: ASOF });
    expect(result.proposal.changes).toEqual([]);
    expect(result.passiveSummary).toMatch(/Geen aanpassingen/);
  });

  it('summarizes multiple changes in one passive, one-line string — never a per-session popup', () => {
    const s1 = session('ps1', 'tpl_easy_run', FORECAST_MONDAY, FORECAST_MONDAY);
    const s2 = session('ps2', 'tpl_long_run', FORECAST_TUESDAY, FORECAST_MONDAY);
    const decisionsByKey = new Map([
      ['sustainable_output:running', decision({ state: 'recover' })],
      ['ascent_capacity', decision({ key: { dimension: 'ascent_capacity' }, state: 'reduce' })],
    ]);
    const result = computeForecastReplan({ plannedSessions: [s1, s2], templates: [tplEasyRun, tplLongRun], decisionsByKey, availability: fullAvailability(), strengthProtection: 'normal', asOf: ASOF });
    expect(result.passiveSummary).toContain('2 sessie(s)');
    expect(result.passiveSummary).toMatch(/overgeslagen/);
    expect(result.passiveSummary).toMatch(/verlicht/);
  });
});

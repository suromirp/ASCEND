import { describe, it, expect } from 'vitest';
import { computeForecastReplan } from './adaptiveReplanner';
import type { PlannedSession, SessionTemplate } from '../models/training';
import type { TrainingAvailability } from '../models/goalEngineConfig';

const ASOF = '2026-09-09'; // Wednesday — forecast is week +2 onward: 2026-09-21 Monday and later
const FORECAST_MONDAY = '2026-09-21';

function fullAvailability(overrides: Partial<TrainingAvailability> = {}): TrainingAvailability {
  return { allowedDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], dailyTimeBudget: {}, longSessionDays: ['sun'], temporaryExceptions: [], ...overrides };
}

function session(id: string, templateId: string, scheduledDate: string, weekStartDate: string): PlannedSession {
  return { id, templateId, scheduledDate, weekStartDate, status: 'planned', order: 0 };
}

const tplEasyRun: SessionTemplate = { id: 'tpl_easy_run', name: 'Easy Run', type: 'cardio', durationVariants: { full: 35 } };

describe('computeForecastReplan — availability pass', () => {
  it('moves a forecast session off a now-unavailable weekday to the next free day in the same week', () => {
    const s = session('ps1', 'tpl_easy_run', FORECAST_MONDAY, FORECAST_MONDAY); // Monday
    const result = computeForecastReplan({
      plannedSessions: [s],
      templates: [tplEasyRun],
      availability: fullAvailability({ allowedDays: ['tue', 'wed', 'thu', 'fri', 'sat', 'sun'] }), // Monday blocked
      asOf: ASOF,
    });
    const item = result.proposal.changes.find((c) => c.plannedSessionId === 'ps1');
    expect(item?.action).toBe('move');
    expect(item?.toDate).not.toBe(FORECAST_MONDAY);
  });

  it('stamps a specific, durable reason/generatedBy on an availability-driven item too', () => {
    const s = session('ps1', 'tpl_easy_run', FORECAST_MONDAY, FORECAST_MONDAY);
    const result = computeForecastReplan({
      plannedSessions: [s],
      templates: [tplEasyRun],
      availability: fullAvailability({ allowedDays: ['tue', 'wed', 'thu', 'fri', 'sat', 'sun'] }),
      asOf: ASOF,
    });
    const item = result.proposal.changes.find((c) => c.plannedSessionId === 'ps1');
    expect(item?.reason).toMatch(/Beschikbaarheid/);
    expect(item?.generatedBy).toEqual(['engine/adaptiveReplanner.ts#availability-pass', 'engine/scheduler.ts#proposeNoTimeToday']);
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
      availability: fullAvailability({ allowedDays: ['tue', 'wed', 'thu', 'fri', 'sat', 'sun'] }),
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
      availability: fullAvailability({ allowedDays: ['tue', 'wed', 'thu', 'fri', 'sat', 'sun'] }),
      asOf: ASOF,
    });
    expect(result.proposal.changes).toEqual([]);
  });

  it('produces no changes at all and a calm summary when nothing needs adapting', () => {
    const s = session('ps1', 'tpl_easy_run', FORECAST_MONDAY, FORECAST_MONDAY);
    const result = computeForecastReplan({ plannedSessions: [s], templates: [tplEasyRun], availability: fullAvailability(), asOf: ASOF });
    expect(result.proposal.changes).toEqual([]);
    expect(result.passiveSummary).toMatch(/Geen aanpassingen/);
  });

  it('summarizes multiple changes in one passive, one-line string — never a per-session popup', () => {
    // Every day is filled, and Monday itself is unavailable — ps1 has
    // nowhere left to go this week and gets removed (skipped).
    const filledWeek = ['tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((_, i) => session(`filler${i}`, 'tpl_easy_run', `2026-09-${22 + i}`, FORECAST_MONDAY));
    const s1 = session('ps1', 'tpl_easy_run', FORECAST_MONDAY, FORECAST_MONDAY);
    const result = computeForecastReplan({
      plannedSessions: [s1, ...filledWeek],
      templates: [tplEasyRun],
      availability: fullAvailability({ allowedDays: ['tue', 'wed', 'thu', 'fri', 'sat', 'sun'] }),
      asOf: ASOF,
    });
    expect(result.passiveSummary).toContain('1 sessie(s)');
    expect(result.passiveSummary).toMatch(/overgeslagen/);
  });

  // Weekly Prescription Builder architecture pass, Fase 6 — the pass-2
  // regression: computeForecastReplan structurally can no longer write a
  // TrainingPrescription at all (ForecastReplanResult carries no such
  // field any more — enforced at compile time, not just at runtime), so a
  // 'progress'-decision session (or any session) is never touched for
  // content/role reasons here. engine/weeklyPrescriptionEngine.ts is now
  // the only place that responsibility lives.
  it('never touches a session for content/role reasons — only availability ever produces an item here', () => {
    const s = session('ps1', 'tpl_easy_run', FORECAST_MONDAY, FORECAST_MONDAY);
    const result = computeForecastReplan({ plannedSessions: [s], templates: [tplEasyRun], availability: fullAvailability(), asOf: ASOF });
    expect(result.proposal.changes).toEqual([]);
    expect('prescriptions' in result).toBe(false);
  });
});

import { describe, it, expect } from 'vitest';
import { classifyChangeImpact, needsConfirmation, describeChanges } from './changeImpact';
import { computeScheduleFit } from './scheduleFit';
import type { PlannedSession, SessionTemplate } from '../models/training';

const asOf = '2026-09-29'; // Tuesday; committed = this + next week, forecast from 2026-10-12
const session = (id: string, date: string, weekStart: string, templateId = 'tpl_a', order = 0): PlannedSession => ({ id, templateId, scheduledDate: date, weekStartDate: weekStart, status: 'planned', order });
const tpl = (id: string, name: string, minutes = 45): SessionTemplate => ({ id, name, type: 'cardio', durationVariants: { full: minutes } });

describe('classifyChangeImpact', () => {
  const sessions = [session('near', '2026-10-01', '2026-09-28'), session('far', '2026-10-21', '2026-10-19')];

  it('nothing to change is only a hint', () => {
    expect(classifyChangeImpact([], sessions, asOf)).toBe('hint');
  });

  it('a forecast-only move is a notice', () => {
    expect(classifyChangeImpact([{ plannedSessionId: 'far', action: 'move', fromDate: '2026-10-21', toDate: '2026-10-22' }], sessions, asOf)).toBe('notice');
  });

  it('anything in this or next week, or any removal, is a decision', () => {
    expect(classifyChangeImpact([{ plannedSessionId: 'near', action: 'move', fromDate: '2026-10-01', toDate: '2026-10-02' }], sessions, asOf)).toBe('decision');
    expect(classifyChangeImpact([{ plannedSessionId: 'far', action: 'remove' }], sessions, asOf)).toBe('decision');
  });
});

describe('needsConfirmation', () => {
  it('follows the "Wijzigingen toepassen" setting', () => {
    expect(needsConfirmation('notice', 'always_ask')).toBe(true);
    expect(needsConfirmation('notice', 'auto_small')).toBe(false);
    expect(needsConfirmation('decision', 'auto_small')).toBe(true);
    expect(needsConfirmation('decision', 'auto_all')).toBe(false);
    expect(needsConfirmation('hint', 'always_ask')).toBe(false);
  });
});

describe('computeScheduleFit', () => {
  const templates = [tpl('tpl_a', 'Easy Run', 45), tpl('tpl_b', 'Upper A', 60)];
  const week = '2026-10-19';
  const planned = [session('s1', '2026-10-20', week, 'tpl_a', 0), session('s2', '2026-10-20', week, 'tpl_b', 1)];

  it('a stricter pairing preference moves only the session that no longer fits, within its week', () => {
    const { proposal } = computeScheduleFit({ plannedSessions: planned, templates, sessionLogs: [], program: null, dailyTimeBudget: {}, sameDayPairingPreference: 'never', asOf, settingLabel: 'Meerdere trainingen op één dag' });
    expect(proposal.changes).toHaveLength(1);
    expect(proposal.changes[0]).toMatchObject({ plannedSessionId: 's2', action: 'move', fromDate: '2026-10-20' });
    expect(proposal.changes[0].toDate).not.toBe('2026-10-20');
    expect(describeChanges(proposal.changes, planned, templates)[0]).toMatch(/^Upper A: di 20 oktober → /);
  });

  it('a relaxed setting changes nothing that is already planned, and says so', () => {
    const { proposal } = computeScheduleFit({ plannedSessions: planned, templates, sessionLogs: [], program: null, dailyTimeBudget: { tue: { preferredMinutes: 120, softFlexMinutes: 18 } }, sameDayPairingPreference: 'always', asOf, settingLabel: 'Meerdere trainingen op één dag' });
    expect(proposal.changes).toEqual([]);
    expect(proposal.consequences).toContain('past al');
  });
});

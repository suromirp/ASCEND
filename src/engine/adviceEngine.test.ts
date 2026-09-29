import { describe, it, expect } from 'vitest';
import { computeAdvice, type AdviceInputs } from './adviceEngine';
import { adjustedSessionReasons, buildChangeLog, nextWeekChangeLines } from './changeLog';
import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import type { PlanChangeProposal } from '../models/planChange';

const asOf = '2026-09-30'; // Wednesday, week of 2026-09-28
const week = '2026-09-28';
const heavy = { lowerBodyLoad: 'heavy', impact: 'moderate', eccentricLoad: 'moderate', intensity: 'moderate' } as const;
const light = { lowerBodyLoad: 'none', impact: 'none', eccentricLoad: 'none', intensity: 'low' } as const;
const tpl = (id: string, name: string, type: SessionTemplate['type'], stress: typeof heavy | typeof light): SessionTemplate => ({ id, name, type, durationVariants: { full: 45 }, baseStressProfile: stress });
const templates = [tpl('run', 'Easy Run', 'cardio', light), tpl('lower', 'Lower A', 'strength', heavy), tpl('hike', 'Lange Duurloop', 'hiking', heavy), tpl('upper', 'Upper A', 'strength', light)];
const ps = (id: string, templateId: string, date: string, weekStart = week): PlannedSession => ({ id, templateId, scheduledDate: date, weekStartDate: weekStart, status: 'planned', order: 0 });
const log = (id: string, templateId: string, date: string, extra: Partial<SessionLog> = {}): SessionLog => ({
  id, templateId, plannedSessionId: extra.plannedSessionId, type: templates.find((t) => t.id === templateId)!.type, completedDate: date, completedAt: `${date}T10:00:00.000Z`, variant: 'full', durationMinutes: 45, source: 'manual', ...extra,
});

function inputs(overrides: Partial<AdviceInputs>): AdviceInputs {
  return { logs: [], plannedSessions: [], templates, injuries: [], program: null, dailyTimeBudget: {}, sameDayPairingPreference: 'automatic', respondedIds: new Set(), asOf, ...overrides };
}

describe('MISSED-CATCH-UP', () => {
  it('proposes catching up on a free day later this week', () => {
    const advice = computeAdvice(inputs({ plannedSessions: [ps('m', 'run', '2026-09-29')] }));
    expect(advice[0]).toMatchObject({ ruleId: 'MISSED-CATCH-UP', id: 'missed:m' });
    expect(advice[0].proposal?.changes[0]).toMatchObject({ action: 'move', plannedSessionId: 'm', toDate: '2026-09-30' });
  });

  it('never stacks: with every remaining day taken it proposes letting it go', () => {
    const full = ['2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'].map((d, i) => ps(`f${i}`, 'upper', d));
    const advice = computeAdvice(inputs({ plannedSessions: [ps('m', 'run', '2026-09-29'), ...full], sameDayPairingPreference: 'never' }));
    expect(advice.find((a) => a.id === 'missed:m')?.proposal?.changes[0].action).toBe('remove');
  });

  it('never catches up a leg-heavy session within 48 hours of another one', () => {
    const advice = computeAdvice(inputs({ plannedSessions: [ps('m', 'lower', '2026-09-29'), ps('h', 'hike', '2026-10-01')] }));
    const date = advice.find((a) => a.id === 'missed:m')?.proposal?.changes[0].toDate;
    expect(date).not.toBe('2026-09-30');
    expect(date).not.toBe('2026-10-02');
  });

  it('an answered piece of advice does not come back', () => {
    expect(computeAdvice(inputs({ plannedSessions: [ps('m', 'run', '2026-09-29')], respondedIds: new Set(['missed:m']) }))).toEqual([]);
  });
});

describe('HARD-THEN-SPACE', () => {
  it('gives the next leg-heavy session within a day an extra day after an RPE 8+ session', () => {
    const planned = [ps('done', 'run', '2026-09-30'), ps('next', 'lower', '2026-10-01')];
    const advice = computeAdvice(inputs({ plannedSessions: planned, logs: [log('l1', 'run', '2026-09-30', { plannedSessionId: 'done', rpe: 9 })] }));
    const hard = advice.find((a) => a.ruleId === 'HARD-THEN-SPACE');
    expect(hard?.relatedLogId).toBe('l1');
    expect(hard?.proposal?.changes[0]).toMatchObject({ plannedSessionId: 'next', action: 'move', toDate: '2026-10-02' });
  });

  it('gives no load feedback on strength sessions (MacroFactor owns those)', () => {
    const advice = computeAdvice(inputs({ plannedSessions: [ps('s', 'lower', '2026-09-30')], logs: [log('l1', 'lower', '2026-09-30', { plannedSessionId: 's', rpe: 10 })] }));
    expect(advice.find((a) => a.ruleId === 'HARD-THEN-SPACE')).toBeUndefined();
  });
});

describe('STRENGTH-REGULARITY', () => {
  it('only looks at whether strength sessions happened, as a hint', () => {
    const planned = [ps('a', 'upper', '2026-09-22', '2026-09-21'), ps('b', 'lower', '2026-09-24', '2026-09-21'), ps('c', 'upper', '2026-09-29')];
    const advice = computeAdvice(inputs({ plannedSessions: planned, logs: [log('l', 'upper', '2026-09-29', { plannedSessionId: 'c' })] }));
    const s = advice.find((a) => a.ruleId === 'STRENGTH-REGULARITY');
    expect(s?.title).toBe('Kracht: 1 van 3 sessies afgevinkt');
    expect(s?.proposal).toBeUndefined();
  });
});

describe('change log', () => {
  const planned = [ps('x', 'run', '2026-10-06', '2026-10-05')];
  const accepted: PlanChangeProposal = {
    id: 'p1', trigger: 'strength_program_changed', issue: 'Krachtblok-plaatsing', alternatives: [], consequences: '', explanation: 'uitleg', createdAt: '2026-09-29T08:00:00.000Z', resolvedAt: '2026-09-29T08:00:00.000Z', resolution: 'accepted',
    changes: [{ plannedSessionId: 'x', action: 'move', fromDate: '2026-10-05', toDate: '2026-10-06', reason: 'Betere spreiding.' }],
  };

  it('reads the audit trail as entries with lines and reasons, and marks what was undone', () => {
    const undo: PlanChangeProposal = { ...accepted, id: 'p2', changes: [], resolution: 'rejected', issue: 'Ongedaan gemaakt: x', revertsProposalId: 'p1', createdAt: '2026-09-29T09:00:00.000Z' };
    const entries = buildChangeLog([accepted, undo], planned, templates, '2026-09-20');
    expect(entries.map((e) => [e.id, e.undone])).toEqual([['p2', true], ['p1', true]]);
    expect(entries[1].lines[0]).toContain('Easy Run');
    expect(entries[1].reasons).toEqual(['Betere spreiding.']);
    expect(adjustedSessionReasons([accepted, undo], asOf).size).toBe(0);
  });

  it('badges and "volgende week verandert" only for changes that still stand', () => {
    expect(adjustedSessionReasons([accepted], asOf).get('x')).toBe('Betere spreiding.');
    expect(nextWeekChangeLines([accepted], planned, templates, asOf)).toEqual(['Easy Run: ma 5 oktober → di 6 oktober']);
  });
});

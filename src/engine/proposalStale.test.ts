import { describe, it, expect } from 'vitest';
import { staleItems } from './proposalEngine';
import { planLeaveChange } from './leaveProposal';
import type { PlanPassContext } from './planPass';
import { applyPlanChangeItems } from './proposalEngine';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { LeavePeriod } from '../models/leave';
import type { PlanChangeItem } from '../models/planChange';
import type { PlannedSession } from '../models/training';
import { addDays } from '../utils/dates';

// Nagemaakt: het weekpatroon van de demo, rustdag donderdag.
const { templates } = buildDefaultProgramData();
const TODAY = '2026-10-21';
const MONDAY = '2026-10-26';
const DAYS = ['tpl_easy_run', 'tpl_upper_a', 'tpl_lower_a', 'tpl_herstel', 'tpl_upper_b', 'tpl_hill_intervals', 'tpl_long_run'];
const week = (monday: string): PlannedSession[] => DAYS.map((templateId, i) => ({ id: `${monday}-${i}`, templateId, scheduledDate: addDays(monday, i), weekStartDate: monday, status: 'planned', order: i }));
const plan = [0, 7, 14].flatMap((o) => week(addDays(MONDAY, o)));
const context = (leave: LeavePeriod[]): PlanPassContext => {
  let n = 0;
  return { today: TODAY, logs: [], templates, program: null, blocks: [], restDay: 4, goalDay: '2027-08-01', newId: () => `n${n++}`, leave };
};
const holiday: LeavePeriod = { id: 'v', kind: 'no_training', startDate: '2026-10-27', endDate: '2026-10-29' };
const propose = (mode: 'add' | 'remove', p: LeavePeriod, existing: LeavePeriod[], sessions: PlannedSession[], replaces?: LeavePeriod) =>
  planLeaveChange({ mode, period: p, existing, sessions, logs: [], templates, today: TODAY, ...(replaces ? { replaces } : {}), context });

describe('a proposal that no longer fits the stored plan', () => {
  it('fits the plan it was made on', () => {
    const p = propose('add', holiday, [], plan);
    expect(p.proposal.changes.length).toBeGreaterThan(0);
    expect(staleItems(p.proposal.changes, plan)).toEqual([]);
  });

  it('does not fit once a row it moves or lets go has moved or gone in the meantime', () => {
    const p = propose('add', holiday, [], plan);
    const item = p.proposal.changes.find((c) => c.plannedSessionId)!;
    const moved = plan.map((s) => (s.id === item.plannedSessionId ? { ...s, scheduledDate: '2026-10-30' } : s));
    expect(staleItems(p.proposal.changes, moved).map((c) => c.plannedSessionId)).toEqual([item.plannedSessionId]);
    const gone = plan.filter((s) => s.id !== item.plannedSessionId);
    expect(staleItems(p.proposal.changes, gone)).toHaveLength(1);
  });

  it('does not fit when a row it brings back is already back', () => {
    const stored = applyPlanChangeItems(propose('add', holiday, [], plan).proposal.changes, plan, () => 'x', { by: 'proposal', at: 'test' }).sessions;
    const shorter = { ...holiday, endDate: '2026-10-27' };
    const p = propose('add', shorter, [holiday], stored, holiday);
    const back = p.proposal.changes.find((c) => c.action === 'add' && c.plannedSessionId)!;
    expect(staleItems(p.proposal.changes, stored)).toEqual([]);
    // Meanwhile the let go row came back some other way.
    const already = stored.map((s) => (s.id === back.plannedSessionId ? { ...s, status: 'planned' as const } : s));
    expect(staleItems(p.proposal.changes, already).map((c) => c.plannedSessionId)).toContain(back.plannedSessionId);
  });

  it('a new row of its own never makes it stale', () => {
    const add: PlanChangeItem = { action: 'add', newSessionDraft: { templateId: 'tpl_ruck_walk', scheduledDate: '2026-10-31', weekStartDate: MONDAY } };
    expect(staleItems([add], plan)).toEqual([]);
  });
});

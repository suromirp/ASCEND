import { describe, it, expect } from 'vitest';
import { planPass, type PlanPassContext } from './planPass';
import { planLeaveChange, type LeavePlan } from './leaveProposal';
import { applyPlanChangeItems } from './proposalEngine';
import { editedPeriod, leaveEditScope, leaveKey, leaveWordsChange, withNote } from './leaveEdit';
import { validateWeeks } from './weekValidator';
import { dragEligibility } from './weekDrag';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { LeavePeriod } from '../models/leave';
import type { PlannedSession } from '../models/training';
import { addDays, daysBetween } from '../utils/dates';

// Nagemaakt: het vaste weekpatroon van de demo met de rustdag op donderdag.
const { templates } = buildDefaultProgramData();
const TODAY = '2026-10-21';
const MONDAY = '2026-10-26';
const GOAL_DAY = '2027-08-01';
const DAYS = ['tpl_easy_run', 'tpl_upper_a', 'tpl_lower_a', 'tpl_herstel', 'tpl_upper_b', 'tpl_hill_intervals', 'tpl_long_run'];
const week = (monday: string): PlannedSession[] => DAYS.map((templateId, i) => ({ id: `${monday}-${i}`, templateId, scheduledDate: addDays(monday, i), weekStartDate: monday, status: 'planned', order: i }));
const plan: PlannedSession[] = Array.from({ length: 8 }, (_, i) => addDays(MONDAY, i * 7)).flatMap(week);
const id = (monday: string, i: number) => `${monday}-${i}`;
const budget = { preferredMinutes: 90, softFlexMinutes: 15 };
const big = { preferredMinutes: 200, softFlexMinutes: 30 };
const dailyTimeBudget = { mon: budget, tue: budget, wed: budget, thu: { preferredMinutes: 10, softFlexMinutes: 15 }, fri: budget, sat: big, sun: big };

const holiday: LeavePeriod = { id: 'vakantie', kind: 'no_training', startDate: '2026-10-27', endDate: '2026-10-29', note: 'Weekje weg' };

function context(leave: LeavePeriod[], over: Partial<PlanPassContext> = {}): PlanPassContext {
  let n = 0;
  return { today: TODAY, logs: [], templates, program: null, blocks: [], restDay: 4, goalDay: GOAL_DAY, newId: () => `new-${n++}`, leave, dailyTimeBudget, ...over };
}
const open = (list: PlannedSession[]) => list.filter((s) => s.status !== 'skipped');
const on = (list: PlannedSession[], date: string) => open(list).filter((s) => s.scheduledDate === date).map((s) => s.templateId).sort();
const shape = (list: PlannedSession[]) => open(list).map((s) => `${s.scheduledDate} ${s.templateId}`).sort();

const propose = (mode: 'add' | 'remove', p: LeavePeriod, existing: LeavePeriod[], sessions: PlannedSession[], replaces?: LeavePeriod, over: Partial<PlanPassContext> = {}) =>
  planLeaveChange({ mode, period: p, existing, sessions, logs: [], templates, today: TODAY, ...(replaces ? { replaces } : {}), context: (periods) => context(periods, { until: addDays(p.endDate, 21), ...over }) });
let accepted = 0;
const accept = (p: LeavePlan, sessions: PlannedSession[]) => {
  const r = applyPlanChangeItems(p.proposal.changes, sessions, () => `accepted-${accepted++}`, { by: 'proposal', proposalId: p.proposal.id, at: '2026-10-21T08:00:00.000Z' });
  expect(r.unsupported).toEqual([]);
  return r.sessions;
};
// The plan with the holiday as it was stored after its first Akkoord.
const withHoliday = accept(propose('add', holiday, [], plan), plan);
// Editing: the new period with the same id, and the stored one as `replaces`.
const edit = (draft: Partial<LeavePeriod>, over: Partial<PlanPassContext> = {}) => {
  const after = editedPeriod(holiday, { kind: holiday.kind, startDate: holiday.startDate, endDate: holiday.endDate, note: holiday.note ?? '', ...draft });
  return { after, plan: propose('add', after, [holiday], withHoliday, holiday, over) };
};
// After Akkoord the planning is quiet: what the preview showed is what you get.
const settled = (sessions: PlannedSession[], periods: LeavePeriod[]) => {
  const again = planPass(sessions, context(periods));
  expect(again.repairs).toEqual([]);
};

describe('what an edit of a period touches', () => {
  it('only another note does not touch the planning', () => {
    expect(leaveEditScope(holiday, { ...holiday, note: 'Naar zee' })).toBe('note');
    expect(leaveEditScope(holiday, { ...holiday, note: '  Weekje weg ' })).toBe('none');
    expect(leaveEditScope(holiday, { ...holiday })).toBe('none');
    expect(leaveEditScope(holiday, { ...holiday, endDate: '2026-10-30' })).toBe('plan');
    expect(leaveEditScope(holiday, { ...holiday, kind: 'free_days' })).toBe('plan');
    expect(leaveEditScope(holiday, { ...holiday, startDate: '2026-10-26', note: 'Naar zee' })).toBe('plan');
  });

  it('a new note is stored on the same period, the rest stays, an empty note goes', () => {
    const other: LeavePeriod = { id: 'ander', kind: 'free_days', startDate: '2026-12-01', endDate: '2026-12-02' };
    const after = withNote([holiday, other], holiday.id, '  Naar zee ');
    expect(after).toEqual([{ ...holiday, note: 'Naar zee' }, other]);
    expect(withNote([holiday], holiday.id, '   ')[0]).toEqual({ id: 'vakantie', kind: 'no_training', startDate: '2026-10-27', endDate: '2026-10-29' });
  });

  it('Heuvels in de buurt on a period without a gym changes the planning, so it is a proposal (one run per week is a hill training)', () => {
    const away: LeavePeriod = { id: 'weg', kind: 'no_gym', startDate: '2026-10-27', endDate: '2026-10-29', noGym: { amount: 'light', strength: 'bodyweight', hills: false } };
    const hillsOn = editedPeriod(away, { kind: 'no_gym', startDate: away.startDate, endDate: away.endDate, note: '', noGym: { amount: 'light', strength: 'bodyweight', hills: true } });
    expect(leaveEditScope(away, hillsOn)).toBe('plan');
    expect(JSON.stringify(leaveKey([hillsOn]))).not.toBe(JSON.stringify(leaveKey([away])));
    expect(leaveEditScope(away, { ...away, note: 'Bergen' })).toBe('note');
    expect(leaveWordsChange(away, { ...away, note: 'Bergen' }).title).toBe('Notitie bewaard');
    // How much or the strength goes through a proposal too.
    expect(leaveEditScope(away, { ...away, noGym: { amount: 'normal', strength: 'bodyweight', hills: false } })).toBe('plan');
    expect(leaveEditScope(away, { ...away, noGym: { amount: 'light', strength: 'drop', hills: false } })).toBe('plan');
    // A period of another kind gets no choices for hills.
    expect(withNote([holiday], holiday.id, 'Weekje weg', true)).toEqual([holiday]);
  });

  it('a new note leaves the key of the planning the same, other days or kind do not', () => {
    const key = (p: LeavePeriod[]) => JSON.stringify(leaveKey(p));
    expect(key(withNote([holiday], holiday.id, 'Naar zee'))).toBe(key([holiday]));
    expect(key([{ ...holiday, endDate: '2026-10-30' }])).not.toBe(key([holiday]));
    expect(key([{ ...holiday, kind: 'free_days' }])).not.toBe(key([holiday]));
    expect(leaveKey(undefined)).toEqual([]);
  });

  it('the edited period keeps its id; a tocht keeps its details only while it stays a tocht', () => {
    const trek: LeavePeriod = { id: 't', kind: 'trek', startDate: '2026-11-07', endDate: '2026-11-08', trek: { name: 'Nagemaakte tocht', terrain: 'mountain', tent: false, importance: 'training' } };
    expect(editedPeriod(trek, { kind: 'trek', startDate: '2026-11-07', endDate: '2026-11-09', note: '' })).toEqual({ ...trek, endDate: '2026-11-09' });
    expect(editedPeriod(trek, { kind: 'no_training', startDate: '2026-11-07', endDate: '2026-11-08', note: 'x' })).toEqual({ id: 't', kind: 'no_training', startDate: '2026-11-07', endDate: '2026-11-08', note: 'x' });
  });
});

describe('editing a holiday is one proposal with Akkoord', () => {
  it('first: the holiday takes Upper A, Lower A and the rest walk off the week', () => {
    for (const d of ['2026-10-27', '2026-10-28', '2026-10-29']) expect(on(withHoliday, d)).toEqual([]);
  });

  it('longer: the extra days are emptied too, and nothing comes back on the old ones', () => {
    const { after, plan: p } = edit({ endDate: '2026-10-31' });
    expect(p.proposal.trigger).toBe('leave_added');
    expect(p.proposal.issue).toMatch(/gewijzigd/);
    expect(p.replaces).toEqual(holiday);
    const next = accept(p, withHoliday);
    for (const d of ['2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31']) expect(on(next, d)).toEqual([]);
    // Upper B on Friday and the hills on Saturday are in the proposal as what falls away or moves.
    const touched = p.proposal.changes.map((c) => c.plannedSessionId);
    expect(touched).toContain(id(MONDAY, 4));
    expect(touched).toContain(id(MONDAY, 5));
    settled(next, [after]);
  });

  it('shorter: what the lost days held comes back on its own day, as its own row', () => {
    const { after, plan: p } = edit({ endDate: '2026-10-27' });
    const back = p.proposal.changes.filter((c) => c.action === 'add' && c.plannedSessionId);
    expect(back.map((c) => c.plannedSessionId).sort()).toEqual([id(MONDAY, 2), id(MONDAY, 3)]);
    expect(back.every((c) => c.leave === null && !!c.reason)).toBe(true);
    const next = accept(p, withHoliday);
    expect(on(next, '2026-10-28')).toEqual(['tpl_lower_a']);
    expect(on(next, '2026-10-29')).toEqual(['tpl_herstel']);
    expect(on(next, '2026-10-27')).toEqual([]);
    // No second row next to the skipped one.
    expect(next.length).toBe(withHoliday.length);
    settled(next, [after]);
  });

  it('moved: the old days are as they were, the new days are empty', () => {
    const { after, plan: p } = edit({ startDate: '2026-11-03', endDate: '2026-11-05' });
    const next = accept(p, withHoliday);
    expect(shape(next).filter((x) => x < '2026-11-02')).toEqual(shape(plan).filter((x) => x < '2026-11-02'));
    for (const d of ['2026-11-03', '2026-11-04', '2026-11-05']) expect(on(next, d)).toEqual([]);
    expect(p.proposal.changes.every((c) => !!c.reason)).toBe(true);
    settled(next, [after]);
  });

  it('another kind: free days instead of a holiday give the week back', () => {
    const { after, plan: p } = edit({ kind: 'free_days' });
    expect(after.kind).toBe('free_days');
    const next = accept(p, withHoliday);
    // What stood there is back; on a free day an easy backpack walk may come along.
    for (const d of ['2026-10-27', '2026-10-28', '2026-10-29']) expect(on(next, d).filter((t) => t !== 'tpl_ruck_walk')).toEqual(on(plan, d));
    expect(p.proposal.changes.filter((c) => c.action === 'add' && !c.plannedSessionId).every((c) => c.leave?.role === 'placed')).toBe(true);
    expect(p.proposal.consequences).not.toMatch(/geen training meer/);
    settled(next, [after]);
  });

  it('Liever niet: the proposal changed nothing, the period and the plan stay exactly as they were', () => {
    const storedPlan = JSON.stringify(withHoliday);
    const storedPeriods = JSON.stringify([holiday]);
    const { plan: p } = edit({ endDate: '2026-11-01' });
    expect(p.proposal.changes.length).toBeGreaterThan(0);
    expect(JSON.stringify(withHoliday)).toBe(storedPlan);
    expect(JSON.stringify([holiday])).toBe(storedPeriods);
    // Without Akkoord the next planning run reads the stored period and finds nothing to do.
    settled(withHoliday, [holiday]);
  });
});

// Een nagemaakt voorbeeld: vrij van zaterdag 5 tot en met woensdag 9 december.
describe('a made-up holiday from Saturday to Wednesday', () => {
  const december: LeavePeriod = { id: 'december', kind: 'no_training', startDate: '2026-12-05', endDate: '2026-12-09' };
  const upperA = id('2026-12-07', 1); // dinsdag 8 december

  it('used to put Upper A on Sunday 13, two days before the next Upper A on Tuesday 15', () => {
    const p = propose('add', december, [], plan, undefined, { leaveCrowding: 'shift' });
    const next = accept(p, plan);
    expect(next.find((s) => s.id === upperA)?.scheduledDate).toBe('2026-12-13');
  });

  it('now lets it go: no upper body training right before its own next time', () => {
    const p = propose('add', december, [], plan);
    const next = accept(p, plan);
    const item = p.proposal.changes.find((c) => c.plannedSessionId === upperA);
    expect(item?.action).toBe('remove');
    expect(open(next).some((s) => s.id === upperA)).toBe(false);
    // Every Upper A that stays keeps four days from the next one.
    const days = open(next).filter((s) => s.templateId === 'tpl_upper_a').map((s) => s.scheduledDate).sort();
    for (let i = 1; i < days.length; i++) expect(daysBetween(days[i - 1], days[i])).toBeGreaterThanOrEqual(4);
    // And no two heavy leg days within 48 hours.
    const findings = validateWeeks({ sessions: next, logs: [], templates, today: TODAY, restDay: 4, goalDay: GOAL_DAY, leave: [december], dailyTimeBudget });
    expect(findings.filter((f) => f.rule === 'LEG-SPACING')).toEqual([]);
    settled(next, [december]);
  });
});

describe('a training you moved yourself after the holiday', () => {
  const shift = { leaveCrowding: 'shift' as const };
  const first = accept(propose('add', holiday, [], plan, undefined, shift), plan);
  const upperA = id(MONDAY, 1);
  // The holiday put Upper A on Sunday; you moved it to Friday yourself.
  const youMoved = first.map((s) => (s.id === upperA ? { ...s, scheduledDate: '2026-10-30', lock: { by: 'user' as const, at: '2026-10-22T08:00:00.000Z' } } : s));

  it('keeps the mark of the holiday until the holiday goes', () => {
    expect(youMoved.find((s) => s.id === upperA)?.leave).toEqual({ periodId: holiday.id, role: 'moved', from: '2026-10-27' });
  });

  it('removing the holiday clears the mark, leaves the day and your own lock, and stops asking for Akkoord', () => {
    const p = propose('remove', holiday, [holiday], youMoved, undefined, shift);
    const item = p.proposal.changes.find((c) => c.plannedSessionId === upperA);
    expect(item).toMatchObject({ action: 'keep', leave: null });
    const next = accept(p, youMoved);
    const row = next.find((s) => s.id === upperA)!;
    expect(row.leave).toBeUndefined();
    expect(row.scheduledDate).toBe('2026-10-30');
    expect(row.lock).toEqual({ by: 'user', at: '2026-10-22T08:00:00.000Z' });
    const t = templates.find((x) => x.id === row.templateId)!;
    expect(dragEligibility(row, t, { logged: false, today: TODAY })).toEqual({ ok: true, askAlways: false });
    // A second removal finds nothing of it any more.
    expect(propose('remove', holiday, [holiday], next, undefined, shift).proposal.changes.some((c) => c.plannedSessionId === upperA)).toBe(false);
  });

  it('changing the holiday clears it too', () => {
    const later = { ...holiday, startDate: '2026-11-10', endDate: '2026-11-11' };
    const p = propose('add', later, [holiday], youMoved, holiday, shift);
    expect(p.proposal.changes.find((c) => c.plannedSessionId === upperA)).toMatchObject({ action: 'keep', leave: null });
  });
});

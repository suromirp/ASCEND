import { describe, it, expect } from 'vitest';
import { planPass, type PlanPassContext } from './planPass';
import { validateWeeks, type CheckInput } from './weekValidator';
import { planLeaveChange, type LeavePlan } from './leaveProposal';
import { applyPlanChangeItems } from './proposalEngine';
import { previewProposal } from './proposalPreview';
import {
  describePeriodDates, isLeaveBlockedDay, isLeavePeriod, leaveDays, leaveLabelOn, lightDays, periodsInWeek, validateLeaveDraft,
} from './leave';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { LeavePeriod } from '../models/leave';
import type { TrainingGoal } from '../models/goals';
import { raceBlocks } from './raceBlock';
import type { PlannedSession, SessionLog } from '../models/training';
import { addDays, isoWeekday } from '../utils/dates';

const { templates } = buildDefaultProgramData();
const TODAY = '2026-10-21'; // a Wednesday
const MONDAY = '2026-10-26';
const GOAL_DAY = '2027-08-01';
// The pattern with the rest day on Thursday, as in production.
const DAYS = ['tpl_easy_run', 'tpl_upper_a', 'tpl_lower_a', 'tpl_herstel', 'tpl_upper_b', 'tpl_hill_intervals', 'tpl_long_run'];
const week = (monday: string): PlannedSession[] => DAYS.map((templateId, i) => ({ id: `${monday}-${i}`, templateId, scheduledDate: addDays(monday, i), weekStartDate: monday, status: 'planned', order: i }));
const WEEKS = Array.from({ length: 6 }, (_, i) => addDays(MONDAY, i * 7));
const plan: PlannedSession[] = WEEKS.flatMap(week);
const id = (monday: string, i: number) => `${monday}-${i}`;

// A 10 km race on Saturday 20 March 2027 as tussendoel: tests on the easy run's place in the weeks before it.
const RACE = {
  id: 'race', name: 'Hardloopwedstrijd', status: 'active', targetDate: '2027-03-20', createdAt: '', updatedAt: '',
  requirements: [
    { id: 'r1', kind: 'distance', scope: 'SINGLE_EVENT', target: { amount: 10, unit: 'km' }, discipline: 'running' },
    { id: 'r2', kind: 'targetTime', scope: 'SINGLE_EVENT', target: { amount: 45, unit: 'min' }, discipline: 'running' },
  ],
} as TrainingGoal;
const BLOCKS = raceBlocks([RACE], 'gr5', GOAL_DAY, TODAY);
// The weeks around the first test, settled by the race block first, as the stored plan is.
const januaryPlan = () => planPass(['2026-12-28', '2027-01-04', '2027-01-11', '2027-01-18', '2027-01-25'].flatMap(week), context([], { blocks: BLOCKS })).sessions;

const budget = { preferredMinutes: 90, softFlexMinutes: 15 };
const dailyTimeBudget = { mon: budget, tue: budget, wed: budget, thu: { preferredMinutes: 10, softFlexMinutes: 15 }, fri: budget, sat: { preferredMinutes: 200, softFlexMinutes: 30 }, sun: { preferredMinutes: 200, softFlexMinutes: 30 } };

const period = (kind: LeavePeriod['kind'], startDate: string, endDate: string, extra: Partial<LeavePeriod> = {}): LeavePeriod => ({ id: `leave-${kind}-${startDate}`, kind, startDate, endDate, ...extra });

function context(leave: LeavePeriod[], over: Partial<PlanPassContext> = {}): PlanPassContext {
  let n = 0;
  return { today: TODAY, logs: [], templates, program: null, blocks: [], restDay: 4, goalDay: GOAL_DAY, newId: () => `new-${n++}`, leave, ...over };
}
const run = (sessions: PlannedSession[], leave: LeavePeriod[], over: Partial<PlanPassContext> = {}) => planPass(sessions, context(leave, over));
const check = (sessions: PlannedSession[], leave: LeavePeriod[], over: Partial<CheckInput> = {}): CheckInput => ({ sessions, logs: [], templates, today: TODAY, restDay: 4, goalDay: GOAL_DAY, leave, ...over });
const open = (list: PlannedSession[]) => list.filter((s) => s.status !== 'skipped');
const on = (list: PlannedSession[], date: string) => open(list).filter((s) => s.scheduledDate === date).map((s) => s.templateId).sort();
const byId = (list: PlannedSession[], sessionId: string) => list.find((s) => s.id === sessionId);
const set = (list: PlannedSession[], sessionId: string, patch: Partial<PlannedSession>) => list.map((s) => (s.id === sessionId ? { ...s, ...patch } : s));

describe('the periods themselves', () => {
  const holiday = period('no_training', '2026-10-27', '2026-10-29');
  const trek = period('trek', '2026-10-28', '2026-10-30');
  const free = period('free_days', '2026-10-29', '2026-10-31');

  it('where periods overlap the strictest wins, and a trek has light days around it', () => {
    const days = leaveDays([free, trek, holiday]);
    expect(days.get('2026-10-27')?.kind).toBe('off');
    expect(days.get('2026-10-29')?.kind).toBe('off');
    expect(days.get('2026-10-30')?.kind).toBe('trek');
    expect(days.get('2026-10-31')?.kind).toBe('free');
    // The day before the trek is a holiday day itself; the day after is a free day, and stays light.
    const light = lightDays([free, trek, holiday]);
    expect([...light.keys()]).toEqual(['2026-10-31']);
    expect(light.get('2026-10-31')?.side).toBe('after');
  });

  it('reads as a band in the week: holiday, trek, free day, light day', () => {
    expect(leaveLabelOn('2026-10-27', [holiday])).toMatchObject({ kind: 'off', title: 'Vakantie', line: 'Geen training' });
    expect(leaveLabelOn('2026-10-29', [trek])).toMatchObject({ kind: 'trek', title: 'Tochtdag' });
    expect(leaveLabelOn('2026-10-29', [free])).toMatchObject({ kind: 'free', title: 'Vrije dag' });
    expect(leaveLabelOn('2026-10-27', [trek])).toMatchObject({ kind: 'light', title: 'Dag voor je tocht' });
    expect(leaveLabelOn('2026-10-31', [trek])).toMatchObject({ kind: 'light', title: 'Dag na je tocht' });
    expect(leaveLabelOn('2026-11-05', [trek, holiday, free])).toBeUndefined();
    expect(describePeriodDates(holiday)).toBe('di 27 oktober t/m do 29 oktober');
  });

  it('is blocked for the weekly planning on holiday and trek days only', () => {
    expect(isLeaveBlockedDay([holiday], '2026-10-28')).toBe(true);
    expect(isLeaveBlockedDay([trek], '2026-10-28')).toBe(true);
    expect(isLeaveBlockedDay([free], '2026-10-30')).toBe(false);
    expect(isLeaveBlockedDay(undefined, '2026-10-30')).toBe(false);
  });

  it('knows which periods touch a week', () => {
    expect(periodsInWeek([holiday, trek, free], MONDAY).map((p) => p.kind)).toEqual(['no_training', 'trek', 'free_days']);
    expect(periodsInWeek([holiday], addDays(MONDAY, 7))).toEqual([]);
  });

  it('checks what you fill in', () => {
    expect(validateLeaveDraft({ kind: 'trek', startDate: '2026-10-28', endDate: '2026-10-30' }, TODAY)).toBeUndefined();
    expect(validateLeaveDraft({ startDate: '2026-10-28', endDate: '2026-10-30' }, TODAY)).toMatch(/soort/);
    expect(validateLeaveDraft({ kind: 'trek', startDate: '2026-10-30', endDate: '2026-10-28' }, TODAY)).toMatch(/voor de begindatum/);
    expect(validateLeaveDraft({ kind: 'trek', startDate: '2026-10-01', endDate: '2026-10-05' }, TODAY)).toMatch(/voorbij/);
    expect(validateLeaveDraft({ kind: 'trek', startDate: '2026-10-28', endDate: '2027-03-30' }, TODAY)).toMatch(/Langer dan/);
    expect(validateLeaveDraft({ kind: 'trek', startDate: '', endDate: '' }, TODAY)).toMatch(/datum/);
  });

  it('only complete, sane records count as a period', () => {
    expect(isLeavePeriod(holiday)).toBe(true);
    expect(isLeavePeriod({ ...holiday, kind: 'spa' })).toBe(false);
    expect(isLeavePeriod({ ...holiday, endDate: '2026-10-01' })).toBe(false);
    expect(isLeavePeriod({ ...holiday, id: '' })).toBe(false);
    expect(isLeavePeriod(null)).toBe(false);
    expect(isLeavePeriod([])).toBe(false);
  });
});

describe('vacation without training', () => {
  const holiday = period('no_training', '2026-10-27', '2026-10-29'); // Tuesday to Thursday: Upper A, Lower A, the rest day

  it('plans no training on those days', () => {
    for (const budgets of [undefined, dailyTimeBudget]) {
      const r = run(plan, [holiday], { dailyTimeBudget: budgets });
      for (const d of ['2026-10-27', '2026-10-28', '2026-10-29']) expect(on(r.sessions, d)).toEqual([]);
      // Nothing in the rest of the plan is a different training: only things that were already there.
      expect(open(r.sessions).every((s) => plan.some((p) => p.id === s.id))).toBe(true);
    }
  });

  it('moves what fits to another day of that week, lets go of what does not', () => {
    const r = run(plan, [holiday], { dailyTimeBudget });
    // Upper A fits another day of the week; Lower A has no day that keeps 48 hours from the hills and the long run.
    expect(byId(r.sessions, id(MONDAY, 1))).toBeDefined();
    expect(open(r.sessions).some((s) => s.id === id(MONDAY, 1))).toBe(true);
    expect(isoWeekday(byId(r.sessions, id(MONDAY, 1))!.scheduledDate)).not.toBe(2);
    expect(open(r.sessions).some((s) => s.id === id(MONDAY, 2))).toBe(false);
    expect(r.repairs.filter((x) => x.rule === 'LEAVE-OFF').map((x) => !!x.removed)).toEqual([false, true, true]);
  });

  it('never stacks a session on a day without a time budget: it takes an empty day or goes', () => {
    const r = run(plan, [holiday]);
    const perDay = new Map<string, number>();
    for (const s of open(r.sessions).filter((x) => x.templateId !== 'tpl_herstel')) perDay.set(s.scheduledDate, (perDay.get(s.scheduledDate) ?? 0) + 1);
    expect(Math.max(...perDay.values())).toBe(1);
  });

  it('the weeks around it keep every rule, also the 48 hours between heavy leg days', () => {
    for (const budgets of [undefined, dailyTimeBudget]) {
      const r = run(plan, [period('no_training', '2026-10-28', '2026-11-03')], { dailyTimeBudget: budgets });
      const findings = validateWeeks(check(r.sessions, [period('no_training', '2026-10-28', '2026-11-03')], { dailyTimeBudget: budgets }));
      expect(findings.filter((f) => f.level === 3)).toEqual([]);
      expect(findings.filter((f) => f.rule === 'LEG-SPACING' || f.rule === 'TWO-HARD-RUNS' || f.rule === 'DUPLICATE')).toEqual([]);
    }
  });

  it('a holiday over a leg day does not push the leg day against the hills', () => {
    // Lower A on Wednesday is in the holiday. Friday is the only free day, and Friday is next to the hills on Saturday.
    const r = run(plan, [period('no_training', '2026-10-28', '2026-10-28')], { dailyTimeBudget });
    expect(open(r.sessions).some((s) => s.id === id(MONDAY, 2))).toBe(false);
    const legDays = open(r.sessions).filter((s) => ['tpl_lower_a', 'tpl_hill_intervals', 'tpl_long_run'].includes(s.templateId) && s.weekStartDate === MONDAY).map((s) => s.scheduledDate).sort();
    expect(legDays).toEqual(['2026-10-31', '2026-11-01']);
  });

  it('a whole week off: the week is empty, the weeks around are untouched', () => {
    const r = run(plan, [period('no_training', MONDAY, addDays(MONDAY, 6))]);
    expect(open(r.sessions).filter((s) => s.weekStartDate === MONDAY)).toEqual([]);
    for (const m of WEEKS.slice(1)) expect(open(r.sessions).filter((s) => s.weekStartDate === m).map((s) => [s.id, s.scheduledDate])).toEqual(week(m).map((s) => [s.id, s.scheduledDate]));
  });

  it('history is never touched: logged and past sessions stay as they are', () => {
    const past = { id: 'past', templateId: 'tpl_upper_a', scheduledDate: '2026-10-19', weekStartDate: '2026-10-19', status: 'planned' as const, order: 0 };
    const logs: SessionLog[] = [{ id: 'l1', plannedSessionId: id(MONDAY, 1), templateId: 'tpl_upper_a', type: 'strength', completedDate: '2026-10-27', completedAt: '2026-10-27T09:00:00.000Z', variant: 'full', durationMinutes: 60, source: 'manual' }];
    const list = [past, ...plan];
    const r = run(list, [period('no_training', '2026-10-19', '2026-10-30')], { logs });
    expect(byId(r.sessions, 'past')).toEqual(past);
    expect(byId(r.sessions, id(MONDAY, 1))).toEqual(byId(plan, id(MONDAY, 1)));
    // The rest of that stretch is gone, but the logged one remains on its day.
    expect(on(r.sessions, '2026-10-27')).toEqual(['tpl_upper_a']);
    expect(on(r.sessions, '2026-10-28')).toEqual([]);
  });

  it('what you locked yourself stays, and is reported', () => {
    const locked = set(plan, id(MONDAY, 1), { lock: { by: 'user', at: '2026-10-20T08:00:00.000Z' }, status: 'moved' });
    const r = run(locked, [holiday]);
    expect(byId(r.sessions, id(MONDAY, 1))).toEqual(byId(locked, id(MONDAY, 1)));
    expect(r.remaining.some((f) => f.rule === 'LEAVE-OFF' && f.level === 1 && f.sessionIds.includes(id(MONDAY, 1)))).toBe(true);
  });

  it('a test or a race is reported, never moved', () => {
    // The test of 11 January 2027 is on the easy run's place (Monday); the holiday covers it.
    const r = run(januaryPlan(), [period('no_training', '2027-01-11', '2027-01-12')], { blocks: BLOCKS });
    const test = open(r.sessions).find((s) => s.templateId === 'tpl_test_run' && s.weekStartDate === '2027-01-11');
    expect(test?.scheduledDate).toBe('2027-01-11');
    expect(r.remaining.some((f) => f.rule === 'LEAVE-OFF' && f.level === 2)).toBe(true);
  });

  it('a second planning run writes nothing', () => {
    for (const budgets of [undefined, dailyTimeBudget]) {
      const first = run(plan, [holiday, period('no_training', addDays(MONDAY, 12), addDays(MONDAY, 21))], { dailyTimeBudget: budgets });
      const again = run(first.sessions, [holiday, period('no_training', addDays(MONDAY, 12), addDays(MONDAY, 21))], { dailyTimeBudget: budgets });
      expect(again.repairs).toEqual([]);
      expect(again.sessions).toEqual(first.sessions);
    }
  });

  it('nothing happens without periods or when the period lies before today', () => {
    expect(run(plan, []).sessions).toEqual(plan);
    const over = run(plan, [period('no_training', '2026-10-01', '2026-10-05')]);
    expect(over.sessions).toEqual(plan);
  });
});

describe('free days', () => {
  it('puts an easy backpack walk on a free day when nothing key sits next to it', () => {
    const free = period('free_days', '2026-10-27', '2026-10-28'); // Tuesday and Wednesday
    const r = run(plan, [free]);
    const walks = open(r.sessions).filter((s) => s.templateId === 'tpl_ruck_walk');
    expect(walks).toHaveLength(1); // once per week and period
    expect(walks[0].scheduledDate).toBe('2026-10-27');
    expect(walks[0].leave).toEqual({ periodId: free.id, role: 'placed', from: '2026-10-27' });
    // Nothing else changed.
    expect(open(r.sessions).filter((s) => s.templateId !== 'tpl_ruck_walk')).toEqual(open(plan));
  });

  it('takes nothing out of the plan', () => {
    const r = run(plan, [period('free_days', '2026-10-27', '2026-11-13')]);
    for (const s of open(plan)) expect(byId(r.sessions, s.id)?.scheduledDate).toBe(s.scheduledDate);
  });

  it('not when a long training or a hike sits next to it', () => {
    const r = run(plan, [period('free_days', '2026-10-30', '2026-10-30')]); // Friday: hills on Saturday, long run on Sunday
    expect(open(r.sessions).some((s) => s.templateId === 'tpl_ruck_walk')).toBe(false);
    const sat = run(plan, [period('free_days', '2026-10-31', '2026-10-31')]);
    expect(open(sat.sessions).some((s) => s.templateId === 'tpl_ruck_walk')).toBe(false);
  });

  it('not on the rest day, not where hiking is switched off, not in the week of the goal', () => {
    expect(open(run(plan, [period('free_days', '2026-10-29', '2026-10-29')]).sessions).some((s) => s.templateId === 'tpl_ruck_walk')).toBe(false);
    expect(open(run(plan, [period('free_days', '2026-10-27', '2026-10-28')], { hikingEnabled: false }).sessions).some((s) => s.templateId === 'tpl_ruck_walk')).toBe(false);
    const late = run([...plan, ...week('2027-07-26')], [period('free_days', '2027-07-27', '2027-07-28')], { today: '2027-07-20' });
    expect(open(late.sessions).filter((s) => s.templateId === 'tpl_ruck_walk').length).toBeLessThanOrEqual(1);
    expect(open(late.sessions).every((s) => s.scheduledDate < GOAL_DAY)).toBe(true);
  });

  it('the long training moves to the free day when its own day is tight', () => {
    // The long run shares Sunday with a strength training; the free day is Tuesday. Hills on Saturday, Lower A on Wednesday.
    const crowded = [...plan, { id: 'extra', templateId: 'tpl_upper_b', scheduledDate: '2026-11-01', weekStartDate: MONDAY, status: 'planned' as const, order: 9 }];
    const free = period('free_days', '2026-10-27', '2026-10-27');
    const r = run(crowded, [free]);
    const long = byId(r.sessions, id(MONDAY, 6))!;
    expect(long.scheduledDate).toBe('2026-10-27');
    expect(long.leave).toEqual({ periodId: free.id, role: 'moved', from: '2026-11-01' });
    expect(r.repairs).toContainEqual({ sessionId: id(MONDAY, 6), rule: 'LEAVE-PLACE', from: '2026-11-01', to: '2026-10-27' });
    // Whatever it chose, a second run is quiet and nothing breaks the leg rules.
    expect(run(r.sessions, [free]).repairs).toEqual([]);
    expect(validateWeeks(check(r.sessions, [free])).filter((f) => f.level === 3)).toEqual([]);
  });

  it('is quiet the second time', () => {
    const free = period('free_days', '2026-10-27', '2026-11-13');
    const first = run(plan, [free]);
    const again = run(first.sessions, [free]);
    expect(again.repairs).toEqual([]);
    expect(again.sessions).toEqual(first.sessions);
  });
});

describe('a trek', () => {
  const trek = period('trek', '2026-10-28', '2026-10-30'); // Wednesday to Friday; Thursday is the rest day

  it('a mountain hike with the backpack on every day of the trek, rest day included', () => {
    const r = run(plan, [trek]);
    for (const d of ['2026-10-28', '2026-10-29', '2026-10-30']) {
      expect(on(r.sessions, d)).toEqual(['tpl_mountain_hike']);
      expect(open(r.sessions).find((s) => s.scheduledDate === d)!.leave).toEqual({ periodId: trek.id, role: 'placed', from: d });
    }
    expect(r.repairs.filter((x) => x.rule === 'LEAVE-PLACE' && x.added)).toHaveLength(3);
  });

  it('the day before and after stay light, and the legs get their rest around it', () => {
    const r = run(plan, [trek], { dailyTimeBudget });
    // Tuesday (before): Upper A is fine. Saturday (after): the hills are let go. Sunday: the long run keeps 72 hours or goes.
    expect(on(r.sessions, '2026-10-27')).toEqual(['tpl_upper_a']);
    expect(on(r.sessions, '2026-10-31')).not.toContain('tpl_hill_intervals');
    const hard = open(r.sessions).filter((s) => ['tpl_hill_intervals', 'tpl_long_run', 'tpl_lower_a'].includes(s.templateId) && s.weekStartDate === MONDAY);
    for (const s of hard) {
      const gap = (a: string, b: string) => Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 86400000;
      expect(gap(s.scheduledDate, '2026-10-30')).toBeGreaterThan(2);
    }
    expect(validateWeeks(check(r.sessions, [trek], { dailyTimeBudget })).filter((f) => f.level === 3)).toEqual([]);
  });

  it('a heavy leg day the day before is moved or let go', () => {
    const r = run(plan, [period('trek', '2026-10-29', '2026-10-30')], { dailyTimeBudget });
    // Wednesday (Lower A) is the day before the trek.
    expect(on(r.sessions, '2026-10-28')).not.toContain('tpl_lower_a');
  });

  it('adopts a hike that is already there instead of adding a second one', () => {
    const withHike = set(plan, id(MONDAY, 6), { templateId: 'tpl_mountain_hike' });
    const r = run(withHike, [period('trek', '2026-11-01', '2026-11-02')]);
    expect(on(r.sessions, '2026-11-01')).toEqual(['tpl_mountain_hike']);
    expect(on(r.sessions, '2026-11-02')).toEqual(['tpl_mountain_hike']);
    expect(byId(r.sessions, id(MONDAY, 6))).toEqual(byId(withHike, id(MONDAY, 6)));
  });

  it('days that are history, the goal day and a race day get no walk', () => {
    const r = run(plan, [period('trek', '2026-10-19', '2026-10-22')]);
    expect(open(r.sessions).filter((s) => s.templateId === 'tpl_mountain_hike').map((s) => s.scheduledDate)).toEqual(['2026-10-21', '2026-10-22']);
    const toGoal = run([...plan], [period('trek', '2027-07-30', '2027-08-03')]);
    expect(open(toGoal.sessions).filter((s) => s.templateId === 'tpl_mountain_hike').map((s) => s.scheduledDate)).toEqual(['2027-07-30', '2027-07-31']);
    const withRace = set(plan, id(MONDAY, 0), { templateId: 'tpl_race' });
    const rr = run(withRace, [trek], { blocks: [{ goalId: 'g', name: 'Race', raceDate: MONDAY, blockStart: addDays(MONDAY, -56), raceWeek: MONDAY }] });
    expect(on(rr.sessions, MONDAY)).toEqual(['tpl_race']);
  });

  it('a walk you skipped or moved yourself is not put back', () => {
    const first = run(plan, [trek]);
    const walk = open(first.sessions).find((s) => s.scheduledDate === '2026-10-29')!;
    const skipped = first.sessions.map((s) => (s.id === walk.id ? { ...s, status: 'skipped' as const, lock: { by: 'user' as const, at: '' } } : s));
    expect(run(skipped, [trek]).repairs).toEqual([]);
    const moved = first.sessions.map((s) => (s.id === walk.id ? { ...s, scheduledDate: '2026-11-03', weekStartDate: addDays(MONDAY, 7), status: 'moved' as const, lock: { by: 'user' as const, at: '' } } : s));
    const again = run(moved, [trek]);
    expect(open(again.sessions).filter((s) => s.leave?.periodId === trek.id)).toHaveLength(3);
    expect(again.repairs.filter((x) => x.added)).toEqual([]);
  });

  it('is quiet the second time', () => {
    const first = run(plan, [trek], { dailyTimeBudget });
    const again = run(first.sessions, [trek], { dailyTimeBudget });
    expect(again.repairs).toEqual([]);
    expect(again.sessions).toEqual(first.sessions);
  });

  it('the days of one trek follow each other without findings; other sessions on a trek day are let go', () => {
    const r = run(plan, [period('trek', '2026-10-27', '2026-10-31')], { dailyTimeBudget });
    const findings = validateWeeks(check(r.sessions, [period('trek', '2026-10-27', '2026-10-31')], { dailyTimeBudget }));
    expect(findings.filter((f) => ['LEG-SPACING', 'ONE-LONG', 'REST-DAY', 'DAY-FULL', 'LEAVE-OFF'].includes(f.rule))).toEqual([]);
    for (const d of ['2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31']) expect(on(r.sessions, d)).toEqual(['tpl_mountain_hike']);
  });
});

describe('the weekly planning stays off these days', () => {
  it('does not add to a holiday or a trek day, but may to a free day', () => {
    const periods = [period('no_training', '2026-11-02', '2026-11-03'), period('trek', '2026-11-04', '2026-11-05'), period('free_days', '2026-11-06', '2026-11-06')];
    expect(isLeaveBlockedDay(periods, '2026-11-03')).toBe(true);
    expect(isLeaveBlockedDay(periods, '2026-11-05')).toBe(true);
    expect(isLeaveBlockedDay(periods, '2026-11-06')).toBe(false);
  });

  it('a session that ends up on a holiday day anyway is taken off by the next planning run', () => {
    const stray = [...plan, { id: 'stray', templateId: 'tpl_ruck_walk', scheduledDate: '2026-10-28', weekStartDate: MONDAY, status: 'planned' as const, order: 9 }];
    const r = run(stray, [period('no_training', '2026-10-28', '2026-10-28')]);
    expect(open(r.sessions).some((s) => s.id === 'stray')).toBe(false);
  });
});

describe('as a proposal with Akkoord', () => {
  const holiday = period('no_training', '2026-10-27', '2026-10-29');
  const input = (mode: 'add' | 'remove', p: LeavePeriod, existing: LeavePeriod[], sessions: PlannedSession[], over: Partial<PlanPassContext> = {}, logs: SessionLog[] = []) =>
    planLeaveChange({ mode, period: p, existing, sessions, logs, templates, today: TODAY, context: (periods) => context(periods, { logs, until: addDays(p.endDate, 21), ...over }) });

  // What Akkoord does: the items applied the way commitPlanChange applies them.
  let accepted = 0;
  const accept = (p: LeavePlan, sessions: PlannedSession[]) =>
    applyPlanChangeItems(p.proposal.changes, sessions, () => `accepted-${accepted++}`, { by: 'proposal', proposalId: p.proposal.id, at: '2026-10-21T08:00:00.000Z' });

  it('adding a holiday: the proposal holds what moves and what falls away, and changes nothing yet', () => {
    const before = JSON.stringify(plan);
    const p = input('add', holiday, [], plan);
    expect(JSON.stringify(plan)).toBe(before);
    expect(p.proposal.trigger).toBe('leave_added');
    expect(p.proposal.changes.map((c) => c.action).sort()).toEqual(['remove', 'remove', 'remove']);
    expect(p.proposal.changes.every((c) => c.leave && c.leave.periodId === holiday.id)).toBe(true);
    expect(p.proposal.changes.every((c) => !!c.reason)).toBe(true);
    expect(p.periodsAfter).toEqual([holiday]);
  });

  it('what the preview shows is what Akkoord gives, and the planning is quiet afterwards', () => {
    for (const budgets of [undefined, dailyTimeBudget]) {
      const long = period('no_training', '2026-10-27', '2026-11-04');
      const p = input('add', long, [], plan, { dailyTimeBudget: budgets });
      const preview = previewProposal(p.proposal.changes, plan, templates, (s) => planPass(s, context(p.periodsAfter, { dailyTimeBudget: budgets, until: '2026-11-30' })).sessions, p.periodsAfter);
      const applied = accept(p, plan);
      expect(applied.unsupported).toEqual([]);
      // Every day of the holiday is empty in the week the preview shows, and carries the band.
      const days = preview.weeks.flatMap((w) => w.days);
      for (const d of days.filter((x) => x.date >= long.startDate && x.date <= long.endDate)) {
        expect(d.entries.filter((e) => e.change !== 'vervalt' && e.change !== 'weg')).toEqual([]);
        expect(d.leave?.kind).toBe('off');
      }
      const again = planPass(applied.sessions, context(p.periodsAfter, { dailyTimeBudget: budgets }));
      expect(again.repairs).toEqual([]);
      expect(again.sessions).toEqual(applied.sessions);
      for (const d of ['2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04']) expect(on(applied.sessions, d)).toEqual([]);
    }
  });

  it('moved and let go sessions keep a mark with the period and their old day; what you accept is locked', () => {
    const p = input('add', holiday, [], plan, { dailyTimeBudget });
    const applied = accept(p, plan).sessions;
    const moved = byId(applied, id(MONDAY, 1))!;
    expect(moved.leave).toEqual({ periodId: holiday.id, role: 'moved', from: '2026-10-27' });
    expect(moved.lock?.by).toBe('proposal');
    expect(byId(applied, id(MONDAY, 2))).toMatchObject({ status: 'skipped', leave: { periodId: holiday.id, role: 'dropped', from: '2026-10-28' } });
    // History and untouched weeks are the same rows.
    for (const m of WEEKS.slice(1)) expect(applied.filter((s) => s.weekStartDate === m)).toEqual(plan.filter((s) => s.weekStartDate === m));
  });

  it('a trek: the walks come in as new sessions with the period on them', () => {
    const trek = period('trek', '2026-10-28', '2026-10-30');
    const p = input('add', trek, [], plan);
    const adds = p.proposal.changes.filter((c) => c.action === 'add');
    expect(adds.map((c) => c.newSessionDraft)).toEqual(['2026-10-28', '2026-10-29', '2026-10-30'].map((d) => ({ templateId: 'tpl_mountain_hike', scheduledDate: d, weekStartDate: MONDAY })));
    expect(adds.every((c) => c.leave?.role === 'placed')).toBe(true);
    const applied = accept(p, plan).sessions;
    expect(open(applied).filter((s) => s.leave?.role === 'placed' && s.lock?.by === 'proposal')).toHaveLength(3);
    expect(planPass(applied, context(p.periodsAfter)).repairs).toEqual([]);
  });

  it('what you locked yourself and a test come back as plain sentences, not as changes', () => {
    const settled = januaryPlan();
    const upperA = settled.find((s) => s.templateId === 'tpl_upper_a' && s.scheduledDate === '2027-01-12')!;
    const test = settled.find((s) => s.templateId === 'tpl_test_run' && s.scheduledDate === '2027-01-11')!;
    const locked = settled.map((s) => (s.id === upperA.id ? { ...s, lock: { by: 'user' as const, at: '2026-10-20T08:00:00.000Z' }, status: 'moved' as const } : s));
    const p = input('add', period('no_training', '2027-01-11', '2027-01-12'), [], locked, { blocks: BLOCKS });
    expect(p.proposal.changes.some((c) => c.plannedSessionId === upperA.id || c.plannedSessionId === test.id)).toBe(false);
    expect(p.notes.some((n) => n.includes('Bovenlichaam A') && n.includes('zelf vastgezet'))).toBe(true);
    expect(p.notes.some((n) => n.includes('Testloop 5 km') && n.includes('verplaats ik niet zomaar'))).toBe(true);
  });

  it('a test the day before a trek stays, the walk stays too, and the notes say so', () => {
    const settled = januaryPlan();
    const p = input('add', period('trek', '2027-01-12', '2027-01-13'), [], settled, { blocks: BLOCKS });
    const applied = accept(p, settled).sessions;
    expect(on(applied, '2027-01-11')).toContain('tpl_test_run');
    expect(on(applied, '2027-01-12')).toEqual(['tpl_mountain_hike']);
    expect(p.notes.some((n) => n.includes('Testloop 5 km') && n.includes('verplaats ik niet zomaar'))).toBe(true);
  });

  it('history and logged sessions are never in the proposal', () => {
    const logs: SessionLog[] = [{ id: 'l1', plannedSessionId: id(MONDAY, 1), templateId: 'tpl_upper_a', type: 'strength', completedDate: '2026-10-27', completedAt: '2026-10-27T09:00:00.000Z', variant: 'full', durationMinutes: 60, source: 'manual' }];
    const past = { id: 'past', templateId: 'tpl_upper_a', scheduledDate: '2026-10-19', weekStartDate: '2026-10-19', status: 'planned' as const, order: 0 };
    const p = input('add', period('no_training', '2026-10-19', '2026-10-29'), [], [past, ...plan], {}, logs);
    const touched = p.proposal.changes.map((c) => c.plannedSessionId);
    expect(touched).not.toContain('past');
    expect(touched).not.toContain(id(MONDAY, 1));
  });

  it('a period that changes nothing still gives a proposal, with no items', () => {
    const p = input('add', period('no_training', '2026-12-20', '2026-12-20'), [], plan.slice(0, 7));
    expect(p.proposal.changes).toEqual([]);
    expect(p.proposal.consequences).toMatch(/hoefde niet te veranderen/);
  });

  it('removing a period brings back what it moved and let go, and takes away what it placed', () => {
    const add = input('add', holiday, [], plan, { dailyTimeBudget });
    const afterAdd = accept(add, plan).sessions;
    const remove = input('remove', holiday, [holiday], afterAdd, { dailyTimeBudget });
    expect(remove.proposal.trigger).toBe('leave_removed');
    expect(remove.periodsAfter).toEqual([]);
    const afterRemove = accept(remove, afterAdd).sessions;
    // The days are back to what they were: the same trainings on the same days.
    const shape = (list: PlannedSession[]) => open(list).map((s) => `${s.scheduledDate} ${s.templateId}`).sort();
    expect(shape(afterRemove)).toEqual(shape(plan));
    // And the planning is quiet.
    expect(planPass(afterRemove, context([], { dailyTimeBudget })).repairs).toEqual([]);
  });

  it('removing a trek takes its walks away again', () => {
    const trek = period('trek', '2026-10-28', '2026-10-30');
    const afterAdd = accept(input('add', trek, [], plan), plan).sessions;
    const remove = input('remove', trek, [trek], afterAdd);
    expect(remove.proposal.changes.filter((c) => c.action === 'remove').map((c) => c.fromDate)).toEqual(['2026-10-28', '2026-10-29', '2026-10-30']);
    const afterRemove = accept(remove, afterAdd).sessions;
    expect(open(afterRemove).some((s) => s.templateId === 'tpl_mountain_hike')).toBe(false);
    expect(open(afterRemove).filter((s) => s.weekStartDate === MONDAY).map((s) => `${s.scheduledDate} ${s.templateId}`).sort()).toEqual(open(plan).filter((s) => s.weekStartDate === MONDAY).map((s) => `${s.scheduledDate} ${s.templateId}`).sort());
  });

  it('removing a period leaves what you moved yourself since alone', () => {
    const add = input('add', holiday, [], plan, { dailyTimeBudget });
    const afterAdd = accept(add, plan).sessions;
    const youMoved = afterAdd.map((s) => (s.id === id(MONDAY, 1) ? { ...s, scheduledDate: '2026-11-03', weekStartDate: addDays(MONDAY, 7), lock: { by: 'user' as const, at: '2026-10-22T08:00:00.000Z' } } : s));
    const remove = input('remove', holiday, [holiday], youMoved, { dailyTimeBudget });
    expect(remove.proposal.changes.some((c) => c.plannedSessionId === id(MONDAY, 1))).toBe(false);
  });
});

// Many combinations of periods over a plan with a race block, with and without time budgets: the planning
// run is quiet the second time, nothing unlogged stays on a holiday day, and the past and what is logged
// never change. A fixed generator, so a failure repeats.
describe('whatever periods you add', () => {
  const rand = (seed: number) => () => { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; return ((seed >>> 0) % 10000) / 10000; };
  const weeks = ['2026-10-19', ...Array.from({ length: 12 }, (_, i) => addDays(MONDAY, i * 7))];
  const base = planPass(weeks.flatMap(week), context([], { blocks: BLOCKS })).sessions;
  const logs: SessionLog[] = [{ id: 'l1', plannedSessionId: id('2026-10-19', 2), templateId: 'tpl_lower_a', type: 'strength', completedDate: '2026-10-21', completedAt: '2026-10-21T09:00:00.000Z', variant: 'full', durationMinutes: 60, source: 'manual' }];

  for (let seed = 1; seed <= 30; seed++) {
    it(`seed ${seed}`, () => {
      const r = rand(seed);
      const kinds: LeavePeriod['kind'][] = ['no_training', 'trek', 'free_days'];
      const periods = Array.from({ length: 1 + Math.floor(r() * 3) }, (_, i) => {
        const start = addDays(TODAY, Math.floor(r() * 60));
        return period(kinds[Math.floor(r() * 3)], start, addDays(start, Math.floor(r() * 9)), { id: `p${seed}-${i}` });
      });
      const budgets = r() < 0.5 ? undefined : dailyTimeBudget;
      const ctx = { blocks: BLOCKS, logs, dailyTimeBudget: budgets };
      const first = planPass(base, context(periods, ctx));
      const again = planPass(first.sessions, context(periods, ctx));
      expect(again.repairs).toEqual([]);
      expect(again.sessions).toEqual(first.sessions);
      // History: the past and what is logged are the same rows.
      const same = (list: PlannedSession[]) => list.filter((s) => s.scheduledDate < TODAY || s.id === id('2026-10-19', 2));
      expect(same(first.sessions)).toEqual(same(base));
      // Nothing of the system's stays on a holiday day, and a trek day holds nothing but walks.
      const days = leaveDays(periods);
      for (const s of open(first.sessions).filter((x) => x.scheduledDate >= TODAY && !['tpl_test_run', 'tpl_race'].includes(x.templateId))) {
        const kind = days.get(s.scheduledDate)?.kind;
        if (kind === 'off') throw new Error(`${s.templateId} on a holiday day ${s.scheduledDate} (seed ${seed})`);
        if (kind === 'trek') expect(['tpl_mountain_hike', 'tpl_ruck_walk', 'tpl_hike_day_one', 'tpl_bergconditie']).toContain(s.templateId);
      }
      // The rules hold for everything the system planned.
      expect(validateWeeks(check(first.sessions, periods, { logs, dailyTimeBudget: budgets })).filter((f) => f.level === 3 && f.rule !== 'TEST-FRESH' && f.rule !== 'ONE-LONG')).toEqual([]);
    });
  }
});

import { describe, it, expect } from 'vitest';
import { planPass, type PlanPassContext } from './planPass';
import { planLeaveChange, type LeavePlan } from './leaveProposal';
import { applyPlanChangeItems } from './proposalEngine';
import { describeRepair, validateWeeks } from './weekValidator';
import { isLegHeavyTemplate } from './scheduler';
import { hasRole } from './templateRoles';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { LeavePeriod } from '../models/leave';
import type { PlannedSession, SessionLog } from '../models/training';
import { addDays, daysBetween } from '../utils/dates';

// Nagemaakt: een vakantie van za 14 en zo 15 november en een van ma 16 tot en met wo 18 november,
// de week erna weer gewoon. Een lange duurloop op zondag 8 november is gelogd.
const { templates } = buildDefaultProgramData();
const TODAY = '2026-11-09';
const GOAL_DAY = '2027-08-01';
const big = { preferredMinutes: 200, softFlexMinutes: 30 };
const dailyTimeBudget = { mon: big, tue: big, wed: big, thu: big, fri: big, sat: big, sun: big };
const mk = (monday: string, list: [number, string][]): PlannedSession[] =>
  list.map(([d, templateId], i) => ({ id: `${monday}-${i}`, templateId, scheduledDate: addDays(monday, d), weekStartDate: monday, status: 'planned', order: i }));
const WEEK_A: [number, string][] = [[0, 'tpl_herstel'], [1, 'tpl_upper_a'], [2, 'tpl_lower_a'], [3, 'tpl_easy_run'], [4, 'tpl_upper_b'], [5, 'tpl_hill_intervals'], [6, 'tpl_long_run']];
const WEEK_B: [number, string][] = [[0, 'tpl_herstel'], [1, 'tpl_upper_a'], [1, 'tpl_lower_b'], [2, 'tpl_lower_a'], [3, 'tpl_easy_run'], [4, 'tpl_upper_b'], [5, 'tpl_hill_intervals'], [6, 'tpl_long_run']];
const plan: PlannedSession[] = [...mk('2026-11-02', [[6, 'tpl_long_run']]), ...mk('2026-11-09', WEEK_A), ...mk('2026-11-16', WEEK_B), ...mk('2026-11-23', WEEK_A)];
const v1: LeavePeriod = { id: 'v1', kind: 'no_training', startDate: '2026-11-14', endDate: '2026-11-15' };
const v2: LeavePeriod = { id: 'v2', kind: 'no_training', startDate: '2026-11-16', endDate: '2026-11-18' };
const both = [v1, v2];
const log = { id: 'l1', plannedSessionId: '2026-11-02-0', templateId: 'tpl_long_run', type: 'cardio', completedDate: '2026-11-08', completedAt: '2026-11-08T09:00:00.000Z', variant: 'full', durationMinutes: 90 } as SessionLog;

function context(leave: LeavePeriod[], over: Partial<PlanPassContext> = {}): PlanPassContext {
  let n = 0;
  return { today: TODAY, logs: [log], templates, program: null, blocks: [], restDay: 0, goalDay: GOAL_DAY, newId: () => `new-${n++}`, leave, dailyTimeBudget, leaveAround: 'wide', ...over };
}
const nameOf = (id: string) => templates.find((t) => t.id === id)!.name;
const byTemplate = new Map(templates.map((t) => [t.id, t]));
const open = (list: PlannedSession[]) => list.filter((s) => s.status !== 'skipped' && s.scheduledDate >= '2026-11-08');
// Up to the Tuesday after the holidays: the weekend of the week after keeps its deliberate hills and long run.
const heavyLegs = (list: PlannedSession[]) => open(list).filter((s) => s.scheduledDate <= '2026-11-24').filter((s) => { const t = byTemplate.get(s.templateId)!; return isLegHeavyTemplate(t) || hasRole(t, 'long'); });
const training = (list: PlannedSession[]) => open(list).filter((s) => byTemplate.get(s.templateId)!.type !== 'recovery');
const gaps = (list: PlannedSession[]) => {
  const h = heavyLegs(list).sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
  return h.slice(1).map((s, i) => daysBetween(h[i].scheduledDate, s.scheduledDate));
};
const doubleDays = (list: PlannedSession[]) => {
  const count = new Map<string, number>();
  for (const s of training(list)) if (s.scheduledDate >= TODAY) count.set(s.scheduledDate, (count.get(s.scheduledDate) ?? 0) + 1);
  return [...count.entries()].filter(([, n]) => n > 1).map(([d]) => d);
};
const workableEmpty = (list: PlannedSession[]) =>
  Array.from({ length: 15 }, (_, i) => addDays(TODAY, i)).filter((d) => d !== v1.startDate && d !== v1.endDate && !(d >= v2.startDate && d <= v2.endDate) && !training(list).some((s) => s.scheduledDate === d));
const findings = (list: PlannedSession[]) => validateWeeks({ sessions: list, logs: [log], templates, today: TODAY, restDay: 0, goalDay: GOAL_DAY, leave: both, dailyTimeBudget });

describe('planning around two holidays', () => {
  // The proposal for a holiday: the whole stretch is arranged again.
  const wide = planPass(plan, context(both, { leaveReshuffle: true }));

  it('keeps 48 hours between heavy leg days, also after the long run you logged and over the week border', () => {
    expect(gaps(wide.sessions).every((g) => g >= 2)).toBe(true);
    expect(findings(wide.sessions)).toEqual([]);
    // Nothing stands on a holiday day.
    expect(open(wide.sessions).filter((s) => (s.scheduledDate >= '2026-11-14' && s.scheduledDate <= '2026-11-18'))).toEqual([]);
  });

  it('has one long run a week and none within five days of the one you logged; leg strength is not dropped for a second one', () => {
    const longs = open(wide.sessions).filter((s) => hasRole(byTemplate.get(s.templateId)!, 'long')).map((s) => s.scheduledDate).sort();
    expect(longs.filter((d) => d >= TODAY && d <= '2026-11-22')).toEqual(['2026-11-22']);
    for (const d of longs) expect(daysBetween('2026-11-08', d) > 5 || d === '2026-11-08').toBe(true);
    const week1 = (id: string) => open(wide.sessions).some((s) => s.templateId === id && s.scheduledDate >= TODAY && s.scheduledDate <= '2026-11-13');
    expect(week1('tpl_lower_a')).toBe(true);
    // Leg strength stays in the week after the holidays too.
    expect(open(wide.sessions).some((s) => s.templateId === 'tpl_lower_a' && s.scheduledDate >= '2026-11-19')).toBe(true);
    const lowerDays = open(wide.sessions).filter((s) => s.templateId === 'tpl_lower_a').map((s) => s.scheduledDate);
    expect(lowerDays).toContain('2026-11-11');
    const dropped = wide.repairs.filter((r) => r.removed && r.rule === 'LEAVE-AROUND').map((r) => plan.find((s) => s.id === r.sessionId)!.templateId);
    expect(dropped).toContain('tpl_long_run');
  });

  it('puts two trainings on one day only when no workable day is empty', () => {
    expect(workableEmpty(wide.sessions).length === 0 || doubleDays(wide.sessions).length === 0).toBe(true);
  });

  it('says in one sentence what drops', () => {
    const dropped = wide.repairs.filter((r) => r.removed && r.rule === 'LEAVE-AROUND');
    expect(dropped.length).toBeGreaterThan(0);
    for (const r of dropped) {
      const line = describeRepair(r, nameOf(plan.find((s) => s.id === r.sessionId)!.templateId));
      expect(line).toMatch(/eruit \(Rond je vakantie/);
    }
  });

  it('a second run changes nothing, the proposal again and the daily run after it', () => {
    for (const reshuffle of [true, false]) {
      const again = planPass(wide.sessions, context(both, { leaveReshuffle: reshuffle }));
      expect(again.repairs).toEqual([]);
      expect(again.sessions).toEqual(wide.sessions);
    }
  });

  it('the daily run, without a proposal, only finds a day for what stands on a holiday day', () => {
    const daily = planPass(plan, context(both));
    const moved = daily.repairs.filter((r) => r.rule === 'LEAVE-AROUND').map((r) => r.sessionId);
    for (const id of moved) expect(both.some((p) => plan.find((s) => s.id === id)!.scheduledDate >= p.startDate && plan.find((s) => s.id === id)!.scheduledDate <= p.endDate)).toBe(true);
    expect(planPass(daily.sessions, context(both)).repairs).toEqual([]);
  });

  it('leaves history alone', () => {
    const past = plan.filter((s) => s.scheduledDate < TODAY);
    expect(wide.sessions.filter((s) => s.scheduledDate < TODAY)).toEqual(past);
  });

  it('with Weinig the week check keeps its old, greedy way: it shows the faults of this plan', () => {
    const little = planPass(plan, context(both, { leaveAround: 'little', leaveReshuffle: true }));
    const faults = doubleDays(little.sessions).length > 0 && workableEmpty(little.sessions).length > 0;
    const crowded = gaps(little.sessions).some((g) => g < 2);
    const silent = little.repairs.some((r) => r.removed && !r.reason);
    expect(faults || crowded || silent).toBe(true);
  });
});

describe('the same two holidays, one after the other, each a proposal with Akkoord', () => {
  let accepted = 0;
  const propose = (p: LeavePeriod, existing: LeavePeriod[], sessions: PlannedSession[]): LeavePlan =>
    planLeaveChange({
      mode: 'add', period: p, existing, sessions, logs: [log], templates, today: TODAY,
      context: (periods) => context(periods, { until: addDays(p.endDate, 21), leaveReshuffle: true }),
    });
  const accept = (p: LeavePlan, sessions: PlannedSession[]) => {
    const r = applyPlanChangeItems(p.proposal.changes, sessions, () => `accepted-${accepted++}`, { by: 'proposal', proposalId: p.proposal.id, at: '2026-11-09T08:00:00.000Z' });
    expect(r.unsupported).toEqual([]);
    return r.sessions;
  };

  it('the second holiday may arrange the first one again, and every drop carries its sentence', () => {
    const first = propose(v1, [], plan);
    const afterFirst = accept(first, plan);
    const second = propose(v2, [v1], afterFirst);
    const afterSecond = accept(second, afterFirst);
    const seen = afterSecond.filter((s) => s.status !== 'skipped');
    expect(gaps(seen)).toSatisfy((g: number[]) => g.every((x) => x >= 2));
    // The rest walk on a holiday day just goes ("Vakantie: geen training op ..."); a training that drops says why.
    const removed = second.proposal.changes.filter((c) => c.action === 'remove' && afterFirst.find((s) => s.id === c.plannedSessionId)?.templateId !== 'tpl_herstel');
    expect(removed.length).toBeGreaterThan(0);
    for (const item of removed) expect(item.reason).toMatch(/Rond je vakantie/);
    // After Akkoord the planning is quiet.
    expect(planPass(afterSecond, context(both)).repairs).toEqual([]);
  });
});

describe('what the arrangement never touches', () => {
  const mine = (id: string, templateId: string, date: string, extra: Partial<PlannedSession> = {}): PlannedSession => ({ id, templateId, scheduledDate: date, weekStartDate: '2026-11-09', status: 'planned', order: 0, ...extra });
  const guarded: PlannedSession[] = [
    mine('yours', 'tpl_lower_a', '2026-11-11', { lock: { by: 'user', at: 'x' } as never }),
    mine('race-block', 'tpl_easy_run', '2026-11-10', { raceBlock: true } as never),
    mine('skipped-by-you', 'tpl_upper_a', '2026-11-13', { status: 'skipped', lock: { by: 'user', at: 'x' } as never }),
    mine('other-proposal', 'tpl_upper_b', '2026-11-10', { lock: { by: 'proposal', proposalId: 'p-ander', at: 'x' } as never, leave: { periodId: 'ander', role: 'moved', from: '2026-11-12' } }),
  ];
  for (const reshuffle of [true, false]) {
    it(`a lock of yours, a race block, a skip of yours and another proposal's row stay (reshuffle ${reshuffle})`, () => {
      const r = planPass([...plan, ...guarded], context(both, { leaveReshuffle: reshuffle, leaveLimit: '2026-11-30' }));
      expect(r.repairs.filter((x) => guarded.some((g) => g.id === x.sessionId) && x.rule === 'LEAVE-AROUND')).toEqual([]);
      for (const g of guarded) expect(r.sessions.find((s) => s.id === g.id)).toEqual(g);
    });
  }
  it('stays inside the window of the proposal', () => {
    const edge = planPass(plan, context(both, { leaveReshuffle: true, leaveLimit: '2026-11-22' }));
    const after = edge.sessions.filter((s) => s.scheduledDate > '2026-11-22');
    expect(after).toEqual(plan.filter((s) => s.scheduledDate > '2026-11-22'));
  });
  it('a long plan up to the goal day stays fast', () => {
    const weeks = Array.from({ length: 37 }, (_, i) => mk(addDays('2026-11-09', i * 7), WEEK_A)).flat();
    const started = Date.now();
    planPass([...plan.filter((s) => s.scheduledDate < TODAY), ...weeks], context(both, { leaveReshuffle: true, leaveLimit: '2026-12-02' }));
    expect(Date.now() - started).toBeLessThan(4000);
  });
});

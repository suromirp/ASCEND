import { describe, it, expect } from 'vitest';
import { planPass, type PlanPassContext } from './planPass';
import { planLeaveChange, type LeavePlan } from './leaveProposal';
import { applyPlanChangeItems } from './proposalEngine';
import { leaveDays, leaveLabelOn, lightDays, isLeavePeriod } from './leave';
import { trekLightDaysBefore } from './trekTaper';
import {
  MAX_TREK_DAYS, nextTrek, periodToTrekDraft, trekFacts, trekToPeriod, validateTrekDraft, whenText, type TrekDraft,
} from './trek';
import { migrateLeavePeriods } from '../storage/migrations';
import { raceBlocks } from './raceBlock';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { LeavePeriod } from '../models/leave';
import type { TrainingGoal } from '../models/goals';
import type { PlannedSession, SessionLog } from '../models/training';
import { addDays } from '../utils/dates';

const { templates } = buildDefaultProgramData();
const TODAY = '2026-10-21'; // a Wednesday
const GOAL_DAY = '2027-08-01';
// The weekly pattern with the rest day on Thursday, as in the leave tests.
const DAYS = ['tpl_easy_run', 'tpl_upper_a', 'tpl_lower_a', 'tpl_herstel', 'tpl_upper_b', 'tpl_hill_intervals', 'tpl_long_run'];
const week = (monday: string): PlannedSession[] => DAYS.map((templateId, i) => ({ id: `${monday}-${i}`, templateId, scheduledDate: addDays(monday, i), weekStartDate: monday, status: 'planned', order: i }));
const sid = (monday: string, i: number) => `${monday}-${i}`;

const RACE = {
  id: 'race', name: 'Hardloopwedstrijd', status: 'active', targetDate: '2027-03-20', createdAt: '', updatedAt: '',
  requirements: [
    { id: 'r1', kind: 'distance', scope: 'SINGLE_EVENT', target: { amount: 10, unit: 'km' }, discipline: 'running' },
    { id: 'r2', kind: 'targetTime', scope: 'SINGLE_EVENT', target: { amount: 45, unit: 'min' }, discipline: 'running' },
  ],
} as TrainingGoal;
const BLOCKS = raceBlocks([RACE], 'gr5', GOAL_DAY, TODAY);

const draft = (over: Partial<TrekDraft> = {}): TrekDraft => ({ name: 'Sneeuwhike', startDate: '2026-11-14', days: 2, terrain: 'snow', packKg: 9, tent: true, importance: 'goal', ...over });

function context(leave: LeavePeriod[], over: Partial<PlanPassContext> = {}): PlanPassContext {
  let n = 0;
  return { today: TODAY, logs: [], templates, program: null, blocks: [], restDay: 4, goalDay: GOAL_DAY, newId: () => `new-${n++}`, leave, ...over };
}
const open = (list: PlannedSession[]) => list.filter((s) => s.status !== 'skipped');
const on = (list: PlannedSession[], date: string) => open(list).filter((s) => s.scheduledDate === date).map((s) => s.templateId).sort();

describe('de afbouw voor een tocht', () => {
  it('twee dagen bij een tocht van een dag, drie bij twee of drie dagen, vier bij langer', () => {
    expect([1, 2, 3, 4, 5, 9].map((d) => trekLightDaysBefore(d, 'goal'))).toEqual([2, 3, 3, 4, 4, 4]);
  });
  it('training onderweg: geen afbouw, alleen de gewone lichte dag ervoor', () => {
    expect([1, 3, 6].map((d) => trekLightDaysBefore(d, 'training'))).toEqual([1, 1, 1]);
    expect(trekLightDaysBefore(2, undefined)).toBe(1);
  });
  it('de lichte dagen staan in de planning en op de dagbalk', () => {
    const goal = trekToPeriod(draft(), 'trek-a');
    const light = lightDays([goal]);
    expect([...light.keys()].sort()).toEqual(['2026-11-11', '2026-11-12', '2026-11-13', '2026-11-16']);
    expect(light.get('2026-11-16')?.side).toBe('after');
    expect(leaveLabelOn('2026-11-11', [goal])).toMatchObject({ kind: 'light', title: 'Drie dagen voor je tocht', note: 'Sneeuwhike' });
    expect(leaveLabelOn('2026-11-12', [goal])?.title).toBe('Twee dagen voor je tocht');
    expect(leaveLabelOn('2026-11-13', [goal])?.title).toBe('Dag voor je tocht');
    expect(leaveLabelOn('2026-11-16', [goal])?.title).toBe('Dag na je tocht');
    const training = trekToPeriod(draft({ importance: 'training' }), 'trek-b');
    expect([...lightDays([training]).keys()].sort()).toEqual(['2026-11-13', '2026-11-16']);
  });
});

describe('een tocht als periode', () => {
  it('maakt een tochtperiode met de gegevens erop, en andersom', () => {
    const p = trekToPeriod(draft({ name: '  Sneeuwhike ' }), 'trek-a');
    expect(p).toEqual({ id: 'trek-a', kind: 'trek', startDate: '2026-11-14', endDate: '2026-11-15', trek: { name: 'Sneeuwhike', terrain: 'snow', packKg: 9, tent: true, importance: 'goal' } });
    expect(isLeavePeriod(p)).toBe(true);
    expect(periodToTrekDraft(p)).toEqual(draft());
    expect(leaveDays([p]).get('2026-11-15')?.kind).toBe('trek');
    expect(trekFacts(p)).toBe('Sneeuw, 2 dagen, rugzak 9 kg, met tent');
  });
  it('controleert wat je invult', () => {
    expect(validateTrekDraft(draft(), TODAY)).toBeUndefined();
    expect(validateTrekDraft(draft({ name: ' ' }), TODAY)).toMatch(/naam/);
    expect(validateTrekDraft(draft({ days: 0 }), TODAY)).toMatch(/minstens/);
    expect(validateTrekDraft(draft({ days: MAX_TREK_DAYS + 1 }), TODAY)).toMatch(/Langer/);
    expect(validateTrekDraft(draft({ startDate: '2026-10-01', days: 2 }), TODAY)).toMatch(/voorbij/);
    expect(validateTrekDraft(draft({ packKg: 80 }), TODAY)).toMatch(/kg/);
  });
});

describe('de eerstvolgende tocht', () => {
  const a = trekToPeriod(draft({ startDate: '2026-12-20', name: 'Later' }), 'a');
  const b = trekToPeriod(draft({ startDate: '2026-11-14', name: 'Eerst' }), 'b');
  const plain: LeavePeriod = { id: 'c', kind: 'trek', startDate: '2026-10-23', endDate: '2026-10-24' };
  const after = trekToPeriod(draft({ startDate: '2027-09-01', name: 'Na de GR5' }), 'd');

  it('kiest de vroegste die nog niet voorbij is; een gewone tochtperiode telt niet als tocht', () => {
    const next = nextTrek([a, b, plain], TODAY, GOAL_DAY)!;
    expect(next.trek.name).toBe('Eerst');
    expect(next.daysUntil).toBe(24);
    expect(whenText(next)).toBe('over 24 dagen');
  });
  it('een tocht na de dag van de GR5 is niet "eerder"; een bezige tocht blijft de eerstvolgende', () => {
    expect(nextTrek([after], TODAY, GOAL_DAY)).toBeUndefined();
    expect(nextTrek([], TODAY, GOAL_DAY)).toBeUndefined();
    const underway = nextTrek([b], '2026-11-15', GOAL_DAY)!;
    expect(underway.underway).toBe(true);
    expect(whenText(underway)).toBe('bezig');
    expect(nextTrek([b], '2026-11-16', GOAL_DAY)).toBeUndefined();
    expect(whenText({ daysUntil: 0, underway: false })).toBe('vandaag');
    expect(whenText({ daysUntil: 1, underway: false })).toBe('morgen');
  });
});

describe('de hele planningsronde met een tocht', () => {
  const logs: SessionLog[] = [{ id: 'l1', plannedSessionId: sid('2026-10-19', 2), templateId: 'tpl_lower_a', type: 'strength', completedDate: '2026-10-21', completedAt: '2026-10-21T09:00:00.000Z', variant: 'full', durationMinutes: 60, source: 'manual' }];
  // A race block (10 km on 20 March 2027) puts a real test on Monday 11 January; the long run of Sunday
  // 10 January is locked by the owner. The tocht is Wednesday 13 and Thursday 14 January, so the three
  // days before it hold both.
  const settled = planPass(['2026-10-19', '2026-12-28', '2027-01-04', '2027-01-11', '2027-01-18'].flatMap(week), context([], { blocks: BLOCKS, logs })).sessions;
  const mine = settled.find((s) => s.scheduledDate === '2027-01-10')!.id;
  const test = settled.find((s) => s.templateId === 'tpl_test_run' && s.scheduledDate === '2027-01-11')!.id;
  const base: PlannedSession[] = settled.map((s) => (s.id === mine ? { ...s, lock: { by: 'user' as const, at: '2026-10-22T08:00:00.000Z' } } : s));
  const trek = trekToPeriod(draft({ startDate: '2027-01-13' }), 'trek-a');

  it('historie, eigen vastgezette sessies en de test bewegen niet, en een tweede ronde verandert niets', () => {
    const first = planPass(base, context([trek], { logs, blocks: BLOCKS }));
    const again = planPass(first.sessions, context([trek], { logs, blocks: BLOCKS }));
    expect(again.repairs).toEqual([]);
    expect(again.sessions).toEqual(first.sessions);

    const same = (list: PlannedSession[], ids: string[]) => ids.map((i) => list.find((s) => s.id === i));
    // The logged one and the past week, the one you locked and the test.
    const past = base.filter((s) => s.scheduledDate < TODAY).map((s) => s.id);
    expect(same(first.sessions, [...past, sid('2026-10-19', 2), mine, test])).toEqual(same(base, [...past, sid('2026-10-19', 2), mine, test]));
    // Both tocht days have their walk; the days before are light (no hard, long or leg-heavy training of the system's).
    expect(on(first.sessions, '2027-01-13')).toEqual(['tpl_mountain_hike']);
    expect(on(first.sessions, '2027-01-14')).toEqual(['tpl_mountain_hike']);
    for (const d of ['2027-01-10', '2027-01-11', '2027-01-12']) {
      const names = open(first.sessions).filter((s) => s.scheduledDate === d && s.id !== mine && s.id !== test).map((s) => s.templateId);
      expect(names.filter((t) => ['tpl_lower_a', 'tpl_lower_b', 'tpl_hill_intervals', 'tpl_long_run', 'tpl_intervals'].includes(t))).toEqual([]);
    }
  });

  it('het voorstel laat eigen sessies en de test als notitie staan, en Akkoord geeft precies wat het toont', () => {
    let accepted = 0;
    const plan: LeavePlan = planLeaveChange({
      mode: 'add', period: trek, existing: [], sessions: base, logs, templates, today: TODAY,
      context: (periods) => context(periods, { logs, blocks: BLOCKS, newId: () => `draft-${accepted++}` }),
    });
    expect(plan.proposal.issue).toBe('Tocht Sneeuwhike: wo 13 januari 2027 t/m do 14 januari 2027');
    expect(plan.proposal.changes.some((c) => c.plannedSessionId === mine || c.plannedSessionId === test)).toBe(false);
    expect(plan.notes.join(' ')).toMatch(/vastgezet/);
    expect(plan.proposal.changes.filter((c) => c.action === 'add').every((c) => c.leave?.periodId === 'trek-a')).toBe(true);
    const applied = applyPlanChangeItems(plan.proposal.changes, base, () => `acc-${accepted++}`, { by: 'proposal', proposalId: plan.proposal.id, at: '2026-10-22T08:00:00.000Z' });
    expect(applied.unsupported).toEqual([]);
    const next = planPass(applied.sessions, context(plan.periodsAfter, { logs, blocks: BLOCKS }));
    expect(next.repairs).toEqual([]);
  });

  it('een tocht wijzigen neemt de oude dagen mee: geen losse wandeling achtergelaten, en verwijderen zet alles terug', () => {
    let n = 0;
    const input = (mode: 'add' | 'remove', period: LeavePeriod, existing: LeavePeriod[], sessions: PlannedSession[], replaces?: LeavePeriod) =>
      planLeaveChange({ mode, period, replaces, existing, sessions, logs, templates, today: TODAY, context: (periods) => context(periods, { logs, blocks: BLOCKS, newId: () => `d-${n++}` }) });
    const accept = (p: LeavePlan, sessions: PlannedSession[]) =>
      applyPlanChangeItems(p.proposal.changes, sessions, () => `acc-${n++}`, { by: 'proposal', proposalId: p.proposal.id, at: '2026-10-22T08:00:00.000Z' }).sessions;

    const added = accept(input('add', trek, [], base), base);
    expect(on(added, '2027-01-13')).toEqual(['tpl_mountain_hike']);

    // One week later, one day longer, now only training on the way.
    const moved = trekToPeriod(draft({ startDate: '2027-01-20', days: 3, importance: 'training' }), 'trek-a');
    const change = input('add', moved, [trek], added, trek);
    expect(change.proposal.issue).toContain('gewijzigd');
    const after = accept(change, added);
    expect(on(after, '2027-01-13')).not.toContain('tpl_mountain_hike');
    expect(on(after, '2027-01-14')).not.toContain('tpl_mountain_hike');
    for (const d of ['2027-01-20', '2027-01-21', '2027-01-22']) expect(on(after, d)).toEqual(['tpl_mountain_hike']);
    expect(planPass(after, context([moved], { logs, blocks: BLOCKS })).repairs).toEqual([]);
    // Logged and past stay the same rows.
    expect(after.filter((s) => s.scheduledDate < TODAY)).toEqual(base.filter((s) => s.scheduledDate < TODAY));
    expect(after.find((s) => s.id === mine)).toEqual(base.find((s) => s.id === mine));
    expect(after.find((s) => s.id === test)).toEqual(base.find((s) => s.id === test));

    // Removing it: no walk of the tocht left, the week is as it was.
    const gone = accept(input('remove', moved, [moved], after), after);
    expect(open(gone).some((s) => s.leave?.role === 'placed' && s.leave.periodId === 'trek-a')).toBe(false);
    expect(open(gone).filter((s) => s.templateId === 'tpl_mountain_hike').length).toBe(0);
    expect(planPass(gone, context([], { logs, blocks: BLOCKS })).repairs).toEqual([]);
  });
});

describe('een tocht meerdere keer wijzigen', () => {
  const weeks = ['2026-11-02', '2026-11-09', '2026-11-16', '2026-11-23', '2026-11-30', '2026-12-07'];
  const start = planPass(weeks.flatMap(week), context([])).sessions;
  const t1 = trekToPeriod(draft({ startDate: '2026-11-15' }), 't1');
  const t2 = trekToPeriod(draft({ startDate: '2026-12-06' }), 't1'); // same id: the same tocht, changed
  let n = 0;
  const plan = (mode: 'add' | 'remove', period: LeavePeriod, existing: LeavePeriod[], sessions: PlannedSession[], replaces?: LeavePeriod) =>
    planLeaveChange({ mode, period, replaces, existing, sessions, logs: [], templates, today: TODAY, context: (periods) => context(periods, { newId: () => `d-${n++}` }) });
  const accept = (p: LeavePlan, sessions: PlannedSession[]) =>
    applyPlanChangeItems(p.proposal.changes, sessions, () => `acc-${n++}`, { by: 'proposal', proposalId: p.proposal.id, at: '2026-10-22T08:00:00.000Z' }).sessions;
  const shape = (list: PlannedSession[]) => open(list).map((s) => `${s.scheduledDate} ${s.templateId}`).sort();
  const calm = (list: PlannedSession[], periods: LeavePeriod[]) => expect(planPass(list, context(periods)).repairs).toEqual([]);

  it('aanmaken, wijzigen, verwijderen: de open planning is weer de beginplanning, zonder dubbelen', () => {
    const s1 = accept(plan('add', t1, [], start), start);
    calm(s1, [t1]);
    const s2 = accept(plan('add', t2, [t1], s1, t1), s1);
    calm(s2, [t2]);
    const s3 = accept(plan('remove', t2, [t2], s2), s2);
    expect(shape(s3)).toEqual(shape(start));
    // Also the length: a leg day the tocht made short is as long as before.
    expect(s3.filter((x) => x.status !== 'skipped').map((x) => x.plannedMinutes ?? 0).every((m) => m === 0 || m >= 70)).toBe(true);
    calm(s3, []);
  });

  it('aanmaken, wijzigen, terugwijzigen, verwijderen: ook dan precies de beginplanning', () => {
    const s1 = accept(plan('add', t1, [], start), start);
    const s2 = accept(plan('add', t2, [t1], s1, t1), s1);
    const s3 = accept(plan('add', t1, [t2], s2, t2), s2);
    expect(shape(s3)).toEqual(shape(s1));
    calm(s3, [t1]);
    const s4 = accept(plan('remove', t1, [t1], s3), s3);
    expect(shape(s4)).toEqual(shape(start));
    expect(new Set(shape(s4)).size).toBe(shape(s4).length);
    calm(s4, []);
  });

  it('wat een tocht liet vervallen komt terug op zijn eigen rij, zonder merk, en met de goede reden', () => {
    const s1 = accept(plan('add', t1, [], start), start);
    const dropped = s1.filter((s) => s.status === 'skipped' && s.leave?.periodId === 't1' && s.leave.role === 'dropped');
    expect(dropped.length).toBeGreaterThan(0);
    const change = plan('add', t2, [t1], s1, t1);
    const back = change.proposal.changes.filter((c) => c.action === 'add' && c.plannedSessionId);
    expect(back.length).toBeGreaterThan(0);
    for (const c of back) {
      expect(c.reason).toMatch(/^Terug naar .*, de tocht ligt nu anders\.$/);
      expect(c.reason).not.toMatch(/Vrije dag/);
    }
    const s2 = accept(change, s1);
    for (const d of dropped.filter((x) => back.some((c) => c.plannedSessionId === x.id))) {
      const row = s2.find((s) => s.id === d.id)!;
      expect(row.status).toBe('planned');
      expect(row.leave).toBeUndefined();
    }
    expect(s2.length).toBeLessThanOrEqual(s1.length + 6);
  });

  it('ongedaan maken zet de oude rijen terug zoals ze waren', () => {
    const s1 = accept(plan('add', t1, [], start), start);
    const change = plan('add', t2, [t1], s1, t1);
    const s2 = accept(change, s1);
    // The same undo as the app: the touched rows as they were, the added ones gone.
    const touched = new Set(change.proposal.changes.map((c) => c.plannedSessionId).filter(Boolean));
    const originalIds = new Set(s1.map((s) => s.id));
    const undone = s2.filter((s) => originalIds.has(s.id)).map((s) => (touched.has(s.id) ? s1.find((o) => o.id === s.id)! : s));
    expect(undone).toEqual(s1);
  });
});

describe('het terrein van een tocht kiest de wandeling', () => {
  const walks = (terrain: TrekDraft['terrain']) => {
    const period = trekToPeriod(draft({ terrain, startDate: '2026-11-14', days: 2 }), 'trek-t');
    const run = planPass(['2026-11-09', '2026-11-16'].flatMap(week), context([period]));
    return [on(run.sessions, '2026-11-14'), on(run.sessions, '2026-11-15'), run] as const;
  };
  it('vlak een rugzakwandeling, heuvels, bergen en sneeuw de bergtocht', () => {
    expect(walks('flat_trail').slice(0, 2)).toEqual([['tpl_ruck_walk'], ['tpl_ruck_walk']]);
    expect(walks('uneven_trail').slice(0, 2)).toEqual([['tpl_mountain_hike'], ['tpl_mountain_hike']]);
    expect(walks('mountain').slice(0, 2)).toEqual([['tpl_mountain_hike'], ['tpl_mountain_hike']]);
    expect(walks('snow').slice(0, 2)).toEqual([['tpl_mountain_hike'], ['tpl_mountain_hike']]);
  });
  it('een tweede ronde verandert niets, ook niet bij een rugzakwandeling', () => {
    const [, , run] = walks('flat_trail');
    const period = trekToPeriod(draft({ terrain: 'flat_trail', startDate: '2026-11-14', days: 2 }), 'trek-t');
    expect(planPass(run.sessions, context([period])).repairs).toEqual([]);
  });
});

describe('een zware beendag vlak na een tocht', () => {
  // Tocht on Saturday 14 and Sunday 15 November. Benen A stands on Tuesday 17, two days after: too close
  // (72 hours after a mountain hike). Wednesday has Boven A, Friday to Sunday are taken.
  const monday = '2026-11-16';
  const plan7 = (['tpl_herstel', 'tpl_lower_a', 'tpl_upper_a', 'tpl_herstel', 'tpl_upper_b', 'tpl_hill_intervals', 'tpl_long_run']).map((templateId, i): PlannedSession => ({ id: `w-${i}`, templateId, scheduledDate: addDays(monday, i), weekStartDate: monday, status: 'planned', order: i }));
  const trekWeekend = trekToPeriod(draft({ startDate: '2026-11-14', importance: 'training' }), 'trek-w');
  const legDay = 'w-1';
  const budget = (minutes: number) => Object.fromEntries(['wed'].map((d) => [d, { preferredMinutes: minutes, softFlexMinutes: 0 }])) as PlanPassContext['dailyTimeBudget'];

  it('streng en zonder dag die past: hij valt weg, met een concrete reden in het voorstel', () => {
    const base = planPass(plan7, context([])).sessions;
    const change = planLeaveChange({ mode: 'add', period: trekWeekend, existing: [], sessions: base, logs: [], templates, today: TODAY, context: (p) => context(p, { trekRest: 'strict' }) });
    const item = change.proposal.changes.find((c) => c.plannedSessionId === legDay);
    expect(item?.action).toBe('remove');
    expect(item?.reason).toBe('Te dicht na je tocht: na een bergtocht houdt ASCEND 72 uur tot de volgende zware beendag, en deze week is er geen dag voor.');
  });

  it('soepel (standaard): de korte versie blijft 48 uur na de tocht staan, met een zin die het uitlegt', () => {
    const base = planPass(plan7, context([])).sessions;
    const change = planLeaveChange({ mode: 'add', period: trekWeekend, existing: [], sessions: base, logs: [], templates, today: TODAY, context: (p) => context(p) });
    const item = change.proposal.changes.find((c) => c.plannedSessionId === legDay);
    expect(item).toMatchObject({ action: 'move', fromDate: '2026-11-17', toDate: '2026-11-17', plannedMinutes: 45, reason: 'Iets eerder dan ASCEND graag ziet na je tocht, daarom de korte versie.' });
    const applied = applyPlanChangeItems(change.proposal.changes, base, () => 'x', { by: 'proposal', proposalId: change.proposal.id, at: '2026-10-22T08:00:00.000Z' }).sessions;
    expect(applied.find((s) => s.id === legDay)).toMatchObject({ scheduledDate: '2026-11-17', plannedMinutes: 45 });
    expect(planPass(applied, context(change.periodsAfter)).repairs).toEqual([]);
  });

  it('soepel verandert niets voor de volle versie of buiten een tocht', () => {
    // 24 hours after the tocht nothing is soft: the day goes, also on soft.
    const near = trekToPeriod(draft({ startDate: '2026-11-15', days: 2, importance: 'training' }), 'trek-n'); // Sun 15 and Mon 16
    const run = planPass(plan7, context([near]));
    // The leg day goes (the day after a tocht stays light), it is not made short: no soft step here.
    expect(run.repairs.find((r) => r.sessionId === legDay)).toMatchObject({ removed: true, rule: 'LEAVE-LIGHT' });
    expect(run.sessions.find((s) => s.id === legDay)).toBeUndefined();
    // Without a tocht the same week is left alone.
    expect(planPass(plan7, context([])).repairs).toEqual([]);
  });

  it('past de korte versie op een andere dag van de week, dan gaat hij daarheen in plaats van te vervallen', () => {
    // Wednesday holds 120 minutes, the other days have no limit but are taken: the full Benen A (75) does not fit next to another training, the short one (45) does.
    const ctx = (periods: LeavePeriod[]) => context(periods, { dailyTimeBudget: budget(120) });
    const run = planPass(plan7, ctx([trekWeekend]));
    const repair = run.repairs.find((r) => r.sessionId === legDay);
    expect(repair).toMatchObject({ rule: 'LEG-SPACING', from: '2026-11-17', to: '2026-11-18', plannedMinutes: 45 });
    expect(repair?.removed).toBeUndefined();
    expect(run.sessions.some((s) => s.id === legDay)).toBe(true);
  });

  it('buiten tochten verandert er niets: dezelfde week zonder tocht blijft zoals hij was', () => {
    const base = planPass(plan7, context([])).sessions;
    expect(base.map((s) => `${s.scheduledDate} ${s.templateId} ${s.plannedMinutes ?? ''}`)).toEqual(plan7.map((s) => `${s.scheduledDate} ${s.templateId} `));
  });
});

describe('oude back-ups en de opgeslagen vorm', () => {
  it('een back-up van voor de tochten (geen trek op de periode) importeert zoals eerst', () => {
    const old = [{ id: 'p1', kind: 'trek', startDate: '2026-11-14', endDate: '2026-11-15', note: 'Weekend' }, { id: 'p2', kind: 'no_training', startDate: '2026-12-24', endDate: '2026-12-31' }];
    expect(migrateLeavePeriods(old)).toEqual({ periods: old, skipped: 0 });
    expect(migrateLeavePeriods(undefined)).toEqual({ periods: undefined, skipped: 0 });
  });
  it('een tocht reist mee en komt er hetzelfde uit', () => {
    const p = trekToPeriod(draft(), 'trek-a');
    expect(migrateLeavePeriods(JSON.parse(JSON.stringify([p])))).toEqual({ periods: [p], skipped: 0 });
  });
  it('beschadigde tochtgegevens: de periode blijft, alleen de gegevens vervallen, en dat wordt geteld', () => {
    const bad = [{ id: 'p1', kind: 'trek', startDate: '2026-11-14', endDate: '2026-11-15', trek: { name: 'X', terrain: 'lava', tent: true, importance: 'goal' } }];
    expect(migrateLeavePeriods(bad)).toEqual({ periods: [{ id: 'p1', kind: 'trek', startDate: '2026-11-14', endDate: '2026-11-15' }], skipped: 1 });
  });
});

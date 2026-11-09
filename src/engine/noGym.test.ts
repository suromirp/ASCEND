import { describe, it, expect } from 'vitest';
import { planPass, type PlanPassContext } from './planPass';
import { planLeaveChange, type LeavePlan } from './leaveProposal';
import { applyPlanChangeItems, staleItems } from './proposalEngine';
import { isLeavePeriod, leaveDays, leaveLabelOn, lightDays } from './leave';
import { BODYWEIGHT_TEMPLATE_ID, applyNoGymDays } from './noGym';
import { NO_GYM_ADVICE, resolveNoGym } from './noGymDetails';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { LeavePeriod, NoGymDetails } from '../models/leave';
import type { PlannedSession, SessionLog } from '../models/training';
import { addDays } from '../utils/dates';
import { templateSport } from './sports';
import { migrateLeavePeriods } from '../storage/migrationsPlanning';
import { editedPeriod, leaveEditScope, leaveKey } from './leaveEdit';

// Nagemaakte week, zoals in engine/leave.test.ts: ma rustige loop, di Bovenlichaam A, wo Benen A,
// do Herstel (rustdag), vr Bovenlichaam B, za heuvelintervallen, zo lange duurloop.
const { templates } = buildDefaultProgramData();
const TODAY = '2026-10-21'; // een woensdag
const MONDAY = '2026-10-26';
const GOAL_DAY = '2027-08-01';
const DAYS = ['tpl_easy_run', 'tpl_upper_a', 'tpl_lower_a', 'tpl_herstel', 'tpl_upper_b', 'tpl_hill_intervals', 'tpl_long_run'];
const week = (monday: string): PlannedSession[] => DAYS.map((templateId, i) => ({ id: `${monday}-${i}`, templateId, scheduledDate: addDays(monday, i), weekStartDate: monday, status: 'planned', order: i }));
const WEEKS = Array.from({ length: 5 }, (_, i) => addDays(MONDAY, i * 7));
const plan: PlannedSession[] = WEEKS.flatMap(week);
const NEXT = addDays(MONDAY, 7); // maandag 2 november

const noGym = (startDate: string, endDate: string, details?: Partial<NoGymDetails>): LeavePeriod => ({
  id: `leave-nogym-${startDate}`, kind: 'no_gym', startDate, endDate, ...(details ? { noGym: { ...NO_GYM_ADVICE, ...details } } : {}),
});

function context(leave: LeavePeriod[], over: Partial<PlanPassContext> = {}): PlanPassContext {
  let n = 0;
  return { today: TODAY, logs: [], templates, program: null, blocks: [], restDay: 4, goalDay: GOAL_DAY, newId: () => `new-${n++}`, leave, until: '2026-12-31', ...over };
}
const run = (sessions: PlannedSession[], leave: LeavePeriod[], over: Partial<PlanPassContext> = {}) => planPass(sessions, context(leave, over));
const open = (list: PlannedSession[]) => list.filter((s) => s.status !== 'skipped');
const on = (list: PlannedSession[], date: string) => open(list).filter((s) => s.scheduledDate === date).map((s) => s.templateId).sort();
const runsIn = (list: PlannedSession[], from: string, to: string) =>
  open(list).filter((s) => s.scheduledDate >= from && s.scheduledDate <= to && templateSport(templates.find((t) => t.id === s.templateId)!) === 'running');

const input = (mode: 'add' | 'remove', p: LeavePeriod, existing: LeavePeriod[], sessions: PlannedSession[], over: Partial<PlanPassContext> = {}, logs: SessionLog[] = [], replaces?: LeavePeriod, mountainGoal?: boolean) =>
  planLeaveChange({ mode, period: p, existing, sessions, logs, templates, today: over.today ?? TODAY, ...(replaces ? { replaces } : {}), ...(mountainGoal ? { mountainGoal } : {}), context: (periods) => context(periods, { logs, ...over }) });
let accepted = 0;
const accept = (p: LeavePlan, sessions: PlannedSession[]) =>
  applyPlanChangeItems(p.proposal.changes, sessions, () => `accepted-${accepted++}`, { by: 'proposal', proposalId: p.proposal.id, at: '2026-10-21T08:00:00.000Z' });

describe('de periode zelf', () => {
  it('is een vierde soort, met het advies als de keuzes ontbreken', () => {
    const p = noGym('2026-11-02', '2026-11-08');
    expect(isLeavePeriod(p)).toBe(true);
    expect(resolveNoGym(p)).toEqual({ amount: 'light', strength: 'bodyweight', hills: false });
    expect(isLeavePeriod({ ...p, noGym: { amount: 'veel' } })).toBe(false);
    expect(leaveLabelOn('2026-11-03', [p])).toMatchObject({ kind: 'nogym', title: 'Zonder sportschool', line: 'Lopen en eigen gewicht' });
    expect(leaveLabelOn('2026-11-03', [noGym('2026-11-02', '2026-11-08', { hills: true })])?.line).toBe('Lopen, rustig heuvels op');
  });

  it('een tocht, een vakantie en een vrije dag in dezelfde periode: de strengste telt', () => {
    const p = noGym('2026-11-02', '2026-11-08');
    const trek: LeavePeriod = { id: 'trek', kind: 'trek', startDate: '2026-11-06', endDate: '2026-11-07' };
    const free: LeavePeriod = { id: 'free', kind: 'free_days', startDate: '2026-11-02', endDate: '2026-11-03' };
    const days = leaveDays([p, trek, free]);
    expect(days.get('2026-11-02')?.kind).toBe('nogym');
    expect(days.get('2026-11-06')?.kind).toBe('trek');
    // De dag voor en na de tocht blijft licht, ook zonder sportschool.
    expect([...lightDays([p, trek, free], days).keys()].sort()).toEqual(['2026-11-05', '2026-11-08']);
  });

  it('een back-up zonder het nieuwe soort leest gewoon; kapotte keuzes vallen weg en tellen mee', () => {
    const old = [{ id: 'a', kind: 'no_training', startDate: '2026-11-02', endDate: '2026-11-04' }];
    expect(migrateLeavePeriods(old)).toEqual({ periods: old, skipped: 0 });
    const ok = noGym('2026-11-02', '2026-11-08', { amount: 'normal' });
    expect(migrateLeavePeriods([ok])).toEqual({ periods: [ok], skipped: 0 });
    const damaged = { ...noGym('2026-11-02', '2026-11-08'), noGym: { amount: 'veel', strength: 'drop', hills: true } };
    const read = migrateLeavePeriods([damaged]);
    expect(read.periods).toEqual([noGym('2026-11-02', '2026-11-08')]);
    expect(read.skipped).toBe(1);
    // Keuzes op een ander soort periode horen er niet bij.
    expect(migrateLeavePeriods([{ ...old[0], noGym: NO_GYM_ADVICE }]).periods).toEqual(old);
  });
});

describe('de planning in een periode zonder sportschool', () => {
  it('een hele week, Licht: twee keer lopen, kort; kracht wordt eigen gewicht', () => {
    const p = noGym(NEXT, addDays(NEXT, 6));
    const result = run(plan, [p]);
    const runs = runsIn(result.sessions, NEXT, addDays(NEXT, 6));
    expect(runs.map((s) => s.templateId).sort()).toEqual(['tpl_easy_run', 'tpl_long_run']);
    // Korter dan thuis: de korte versie.
    for (const s of runs) expect(s.plannedMinutes).toBe(templates.find((t) => t.id === s.templateId)!.durationVariants.short);
    // Geen sportschool: alle drie de krachttrainingen zijn eigen gewicht geworden.
    expect(open(result.sessions).filter((s) => s.scheduledDate >= NEXT && s.scheduledDate <= addDays(NEXT, 6) && ['tpl_upper_a', 'tpl_lower_a', 'tpl_upper_b'].includes(s.templateId))).toEqual([]);
    expect(on(result.sessions, addDays(NEXT, 1))).toContain(BODYWEIGHT_TEMPLATE_ID);
    expect(on(result.sessions, addDays(NEXT, 4))).toContain(BODYWEIGHT_TEMPLATE_ID);
    // Geen wandeling of tocht erbij.
    expect(open(result.sessions).some((s) => ['tpl_mountain_hike', 'tpl_hike_day_one', 'tpl_ruck_walk'].includes(s.templateId))).toBe(false);
    // De weken eromheen blijven zoals ze waren.
    for (const m of [MONDAY, addDays(NEXT, 7)]) expect(result.sessions.filter((s) => s.weekStartDate === m)).toEqual(plan.filter((s) => s.weekStartDate === m));
  });

  it('Gewoon: alle loopjes blijven, de harde wordt rustig; zonder eigen gewicht vervalt kracht', () => {
    const p = noGym(NEXT, addDays(NEXT, 6), { amount: 'normal', strength: 'drop' });
    const result = run(plan, [p]);
    const runs = runsIn(result.sessions, NEXT, addDays(NEXT, 6));
    expect(runs.map((s) => s.templateId).sort()).toEqual(['tpl_easy_run', 'tpl_easy_run', 'tpl_long_run']);
    expect(on(result.sessions, addDays(NEXT, 5))).toEqual(['tpl_easy_run']);
    expect(open(result.sessions).some((s) => s.templateId === BODYWEIGHT_TEMPLATE_ID)).toBe(false);
    expect(open(result.sessions).filter((s) => s.scheduledDate >= NEXT && s.scheduledDate <= addDays(NEXT, 6) && templates.find((t) => t.id === s.templateId)?.type === 'strength')).toEqual([]);
  });

  it('over een weekgrens: per week hoogstens twee keer lopen', () => {
    // Vrijdag 30 oktober tot en met dinsdag 3 november.
    const p = noGym('2026-10-30', '2026-11-03');
    const result = run(plan, [p]);
    expect(runsIn(result.sessions, '2026-10-30', '2026-11-01').length).toBe(2);
    expect(runsIn(result.sessions, '2026-11-02', '2026-11-03').length).toBe(1);
    // De heuvelintervallen van zaterdag worden een rustige loop.
    expect(on(result.sessions, '2026-10-31')).toEqual(['tpl_easy_run']);
    expect(on(result.sessions, '2026-11-03')).toEqual([BODYWEIGHT_TEMPLATE_ID]);
  });

  it('vandaag telt nog niet als voorbij; gisteren blijft zoals het was', () => {
    const today = '2026-11-03'; // dinsdag
    const p = noGym('2026-11-02', '2026-11-04');
    const result = run(plan, [p], { today });
    expect(on(result.sessions, '2026-11-02')).toEqual(['tpl_easy_run']);
    expect(result.sessions.find((s) => s.id === `${NEXT}-0`)?.plannedMinutes).toBeUndefined();
    expect(on(result.sessions, today)).toEqual([BODYWEIGHT_TEMPLATE_ID]);
  });

  it('een sessie met een log blijft staan en telt mee voor de twee keer lopen', () => {
    const logs: SessionLog[] = [{ id: 'log1', plannedSessionId: `${NEXT}-0`, templateId: 'tpl_easy_run', type: 'cardio', completedDate: NEXT, completedAt: `${NEXT}T08:00:00.000Z`, variant: 'full', durationMinutes: 35, source: 'manual' }];
    const today = NEXT;
    const p = noGym(NEXT, addDays(NEXT, 6));
    const result = run(plan, [p], { today, logs });
    expect(result.sessions.find((s) => s.id === `${NEXT}-0`)).toEqual(plan.find((s) => s.id === `${NEXT}-0`));
    // De lange duurloop blijft erbij, de heuvelintervallen vallen weg.
    expect(runsIn(result.sessions, NEXT, addDays(NEXT, 6)).map((s) => s.templateId).sort()).toEqual(['tpl_easy_run', 'tpl_long_run']);
  });

  it('een test blijft staan en telt mee voor de twee keer lopen', () => {
    // De stap zelf: zonder raceblok maakt de planning van een losse test weer een gewone loop.
    const withTest = plan.map((s) => (s.id === `${NEXT}-5` ? { ...s, templateId: 'tpl_test_run' } : s));
    const r = applyNoGymDays({ sessions: withTest, days: leaveDays([noGym(NEXT, addDays(NEXT, 6))]), today: TODAY, goalDay: GOAL_DAY, templates, logged: new Set(), newId: () => 'x' });
    expect(r.sessions.find((s) => s.id === `${NEXT}-5`)).toEqual(withTest.find((s) => s.id === `${NEXT}-5`));
    expect(runsIn(r.sessions, NEXT, addDays(NEXT, 6)).map((s) => s.templateId).sort()).toEqual(['tpl_long_run', 'tpl_test_run']);
  });

  it('een tocht en een vrije dag in dezelfde periode', () => {
    const p = noGym(NEXT, addDays(NEXT, 6));
    const trek: LeavePeriod = { id: 'trek', kind: 'trek', startDate: addDays(NEXT, 5), endDate: addDays(NEXT, 6) };
    const free: LeavePeriod = { id: 'free', kind: 'free_days', startDate: addDays(NEXT, 2), endDate: addDays(NEXT, 2) };
    const result = run(plan, [p, trek, free]);
    // De tochtdagen hebben alleen hun wandeling.
    expect(on(result.sessions, addDays(NEXT, 5))).toEqual(['tpl_mountain_hike']);
    expect(on(result.sessions, addDays(NEXT, 6))).toEqual(['tpl_mountain_hike']);
    // Op de vrije dag geldt zonder sportschool: geen rugzakwandeling erbij, geen beenkracht in de sportschool.
    expect(on(result.sessions, addDays(NEXT, 2))).not.toContain('tpl_ruck_walk');
    expect(on(result.sessions, addDays(NEXT, 2))).not.toContain('tpl_lower_a');
    const again = run(result.sessions, [p, trek, free]);
    expect(again.repairs).toEqual([]);
  });

  it('is stil bij een tweede ronde', () => {
    for (const details of [undefined, { amount: 'normal' as const }, { strength: 'drop' as const }]) {
      const p = noGym('2026-10-30', '2026-11-08', details);
      const first = run(plan, [p]);
      const again = run(first.sessions, [p]);
      expect(again.repairs).toEqual([]);
      expect(again.sessions).toEqual(first.sessions);
    }
  });

  it('zonder doel: geen bergtocht, wandeldag of rugzak erbij', () => {
    const result = run(plan, [noGym(NEXT, addDays(NEXT, 6))], { goalDay: undefined, program: null });
    const added = result.sessions.filter((s) => !plan.some((o) => o.id === s.id));
    expect(added.length).toBeGreaterThan(0);
    for (const s of added) expect([BODYWEIGHT_TEMPLATE_ID, 'tpl_easy_run']).toContain(s.templateId);
  });

  it('de stap zelf raakt niets zonder periode', () => {
    const r = applyNoGymDays({ sessions: plan, days: leaveDays([]), today: TODAY, templates, logged: new Set(), newId: () => 'x' });
    expect(r.sessions).toBe(plan);
    expect(r.repairs).toEqual([]);
  });
});

describe('als voorstel met Akkoord', () => {
  it('verandert niets voor Akkoord, en na Akkoord is de planning stil', () => {
    const p = noGym(NEXT, addDays(NEXT, 6), { hills: true });
    const before = JSON.stringify(plan);
    const proposal = input('add', p, [], plan);
    expect(JSON.stringify(plan)).toBe(before);
    expect(proposal.proposal.trigger).toBe('leave_added');
    expect(proposal.proposal.issue).toMatch(/^Zonder sportschool, /);
    expect(proposal.proposal.changes.every((c) => !!c.reason)).toBe(true);
    expect(proposal.notes.some((n) => n.startsWith('Heuvels in de buurt'))).toBe(true);
    const applied = accept(proposal, plan);
    expect(applied.unsupported).toEqual([]);
    // De korte rustige loop houdt zijn lengte na Akkoord.
    const easy = applied.sessions.find((s) => s.scheduledDate === addDays(NEXT, 5) && s.status !== 'skipped');
    expect(easy).toBeUndefined(); // Licht: de heuvelintervallen vallen weg
    const again = run(applied.sessions, proposal.periodsAfter);
    expect(again.repairs).toEqual([]);
    expect(again.sessions).toEqual(applied.sessions);
  });

  it('weghalen zet alles terug zoals het was', () => {
    const p = noGym('2026-10-30', '2026-11-08', { amount: 'normal' });
    const added = accept(input('add', p, [], plan), plan).sessions;
    const removed = accept(input('remove', p, [p], added), added).sessions;
    const back = open(removed).map((s) => [s.id, s.templateId, s.scheduledDate, s.plannedMinutes ?? null]);
    expect(back.sort()).toEqual(plan.map((s) => [s.id, s.templateId, s.scheduledDate, null]).sort());
    expect(open(removed).every((s) => !s.leave)).toBe(true);
  });

  it('een vakantie omzetten in zonder sportschool: één voorstel', () => {
    const holiday: LeavePeriod = { id: 'h1', kind: 'no_training', startDate: NEXT, endDate: addDays(NEXT, 6) };
    const withHoliday = accept(input('add', holiday, [], plan), plan).sessions;
    const changed: LeavePeriod = { ...holiday, kind: 'no_gym' };
    const proposal = input('add', changed, [holiday], withHoliday, {}, [], holiday);
    expect(proposal.periodsAfter).toEqual([changed]);
    const applied = accept(proposal, withHoliday).sessions;
    expect(runsIn(applied, NEXT, addDays(NEXT, 6)).length).toBe(2);
    expect(open(applied).some((s) => s.templateId === BODYWEIGHT_TEMPLATE_ID)).toBe(true);
  });

  it('alles of niets: is de planning intussen veranderd, dan past het voorstel niet meer', () => {
    const p = noGym(NEXT, addDays(NEXT, 6));
    const proposal = input('add', p, [], plan);
    const meanwhile = plan.map((s) => (s.id === `${NEXT}-1` ? { ...s, scheduledDate: addDays(NEXT, 2) } : s));
    expect(staleItems(proposal.proposal.changes, meanwhile).length).toBeGreaterThan(0);
    // De berekening zelf schrijft niets: de lijst is ongewijzigd.
    expect(staleItems(proposal.proposal.changes, plan)).toEqual([]);
  });
});

describe('bijwerken', () => {
  it('een andere keuze is een voorstel, en de sleutel van de planning ziet hem', () => {
    const p = noGym(NEXT, addDays(NEXT, 6));
    const normal = editedPeriod(p, { kind: 'no_gym', startDate: p.startDate, endDate: p.endDate, note: '', noGym: { ...NO_GYM_ADVICE, amount: 'normal' } });
    expect(leaveEditScope(p, normal)).toBe('plan');
    expect(JSON.stringify(leaveKey([p]))).not.toBe(JSON.stringify(leaveKey([normal])));
    // Alleen heuvels: woorden, de planning rekent niet anders.
    const hills = editedPeriod(p, { kind: 'no_gym', startDate: p.startDate, endDate: p.endDate, note: '', noGym: { ...NO_GYM_ADVICE, hills: true } });
    expect(JSON.stringify(leaveKey([p]))).toBe(JSON.stringify(leaveKey([hills])));
    // Een vakantie die zonder sportschool wordt, krijgt het advies.
    const holiday: LeavePeriod = { id: 'h', kind: 'no_training', startDate: NEXT, endDate: NEXT };
    expect(editedPeriod(holiday, { kind: 'no_gym', startDate: NEXT, endDate: NEXT, note: '' }).noGym).toEqual(NO_GYM_ADVICE);
  });
});

describe('na de review', () => {
  const USER = { by: 'user' as const, at: '2026-10-21T08:00:00.000Z' };

  it('een korter gemaakte loop die je zelf verplaatste krijgt bij weghalen zijn eigen lengte terug, ook de lange duurloop', () => {
    const p = noGym(NEXT, addDays(NEXT, 6), { amount: 'normal' });
    const added = accept(input('add', p, [], plan), plan).sessions;
    const easy = added.find((s) => s.id === `${NEXT}-0`)!;
    const long = added.find((s) => s.id === `${NEXT}-6`)!;
    expect(easy.plannedMinutes).toBe(20);
    expect(long.leave?.shortened).toBe(true);
    // Jij verplaatst ze daarna zelf.
    const moved = added.map((s) => (s.id === easy.id ? { ...s, scheduledDate: addDays(NEXT, 1), status: 'moved' as const, lock: USER } : s.id === long.id ? { ...s, scheduledDate: addDays(NEXT, 5), status: 'moved' as const, lock: USER } : s));
    const removal = input('remove', p, [p], moved);
    const removed = accept(removal, moved).sessions;
    for (const [sid, day] of [[easy.id, addDays(NEXT, 1)], [long.id, addDays(NEXT, 5)]] as const) {
      const s = removed.find((o) => o.id === sid)!;
      expect(s.scheduledDate).toBe(day);
      expect(s.plannedMinutes).toBeUndefined();
      expect(s.leave).toBeUndefined();
      expect(s.lock?.by).toBe('user');
    }
    expect(removal.proposal.changes.filter((c) => c.action === 'keep' && c.restore).length).toBe(2);
  });

  it('wat vaststaat in de periode staat als regel in het voorstel', () => {
    const locked = plan.map((s) => (s.id === `${NEXT}-1` || s.id === `${NEXT}-0` ? { ...s, lock: USER } : s));
    const proposal = input('add', noGym(NEXT, addDays(NEXT, 6)), [], locked);
    const upper = templates.find((t) => t.id === 'tpl_upper_a')!.name;
    expect(proposal.notes.some((n) => n.startsWith(`${upper} op `) && n.endsWith('staat vast. Die blijft staan, ook zonder sportschool.'))).toBe(true);
    expect(proposal.notes.some((n) => n.includes('staat vast. Die blijft staan en telt mee voor je twee keer lopen.'))).toBe(true);
  });

  it('een loop in het verleden van de periode zonder log telt niet mee voor de twee keer lopen', () => {
    const today = addDays(NEXT, 2); // woensdag; maandag liep je niet
    const result = run(plan, [noGym(NEXT, addDays(NEXT, 6))], { today });
    expect(runsIn(result.sessions, today, addDays(NEXT, 6)).length).toBe(2);
    expect(on(result.sessions, addDays(NEXT, 5))).toEqual(['tpl_easy_run']);
  });

  it('staat er al een rustige loop op die dag, dan vervalt de harde loop en zegt de reden dat', () => {
    const extra: PlannedSession = { id: 'extra-easy', templateId: 'tpl_easy_run', scheduledDate: addDays(NEXT, 5), weekStartDate: NEXT, status: 'planned', order: 9 };
    const r = applyNoGymDays({ sessions: [...plan, extra], days: leaveDays([noGym(NEXT, addDays(NEXT, 6), { amount: 'normal' })]), today: TODAY, goalDay: GOAL_DAY, templates, logged: new Set(), newId: () => 'x' });
    expect(r.repairs.find((x) => x.sessionId === `${NEXT}-5`)?.reason).toMatch(/vervalt, er staat die dag al een rustige loop/);
    expect(r.repairs.some((x) => x.added && x.from === addDays(NEXT, 5) && r.sessions.find((s) => s.id === x.sessionId)?.templateId === 'tpl_easy_run')).toBe(false);
  });

  it('heuvels: goed voor de bergen alleen met een bergdoel als hoofddoel', () => {
    const p = noGym(NEXT, addDays(NEXT, 6), { hills: true });
    const hillLine = (mountain: boolean) => input('add', p, [], plan, {}, [], undefined, mountain).notes.find((n) => n.startsWith('Heuvels in de buurt'));
    expect(hillLine(false)).not.toMatch(/bergen/);
    expect(hillLine(true)).toMatch(/Goed voor je benen in de bergen\./);
  });
});

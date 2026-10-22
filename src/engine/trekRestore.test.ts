import { describe, it, expect } from 'vitest';
import { planPass, type PlanPassContext } from './planPass';
import { planLeaveChange, type LeavePlan } from './leaveProposal';
import { applyPlanChangeItems } from './proposalEngine';
import { trekToPeriod } from './trek';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { LeavePeriod } from '../models/leave';
import type { PlanChangeItem } from '../models/planChange';
import type { PlannedSession, SessionLog } from '../models/training';
import { addDays } from '../utils/dates';

// Terugzetten is geen vastzetten: een sessie die na een tocht weer staat zoals
// ze vanzelf stond, krijgt geen slot en geen vaste minuten. Anders mag de
// weekcontrole hem bij een volgende wijziging niet meer aanraken.

const { templates } = buildDefaultProgramData();
const TODAY = '2026-10-21';
const DAYS = ['tpl_easy_run', 'tpl_upper_a', 'tpl_lower_a', 'tpl_herstel', 'tpl_upper_b', 'tpl_hill_intervals', 'tpl_long_run'];
const week = (monday: string): PlannedSession[] => DAYS.map((templateId, i) => ({ id: `${monday}-${i}`, templateId, scheduledDate: addDays(monday, i), weekStartDate: monday, status: 'planned', order: i }));
const WEEKS = ['2026-11-02', '2026-11-09', '2026-11-16', '2026-11-23', '2026-11-30', '2026-12-07'];
const LEG_WEEK_A = '2026-11-16-2';
const LEG_WEEK_B = '2026-12-07-2';

function context(leave: LeavePeriod[], over: Partial<PlanPassContext> = {}): PlanPassContext {
  let n = 0;
  return { today: TODAY, logs: [], templates, program: null, blocks: [], restDay: 4, goalDay: '2027-08-01', newId: () => `n${n++}`, leave, ...over };
}
const trek = (start: string, id = 'trek-a', over: Partial<Parameters<typeof trekToPeriod>[0]> = {}) =>
  trekToPeriod({ name: 'Sneeuwhike', startDate: start, days: 2, terrain: 'snow', packKg: 9, tent: true, importance: 'goal', ...over }, id);

let counter = 0;
function change(mode: 'add' | 'remove', period: LeavePeriod, existing: LeavePeriod[], sessions: PlannedSession[], replaces?: LeavePeriod, logs: SessionLog[] = []): LeavePlan {
  return planLeaveChange({ mode, period, replaces, existing, sessions, logs, templates, today: TODAY, context: (p) => context(p, { logs }) });
}
const accept = (plan: LeavePlan, sessions: PlannedSession[]) =>
  applyPlanChangeItems(plan.proposal.changes, sessions, () => `acc-${counter++}`, { by: 'proposal', proposalId: plan.proposal.id, at: '2026-10-22T08:00:00.000Z' }).sessions;
const row = (list: PlannedSession[], id: string) => list.find((s) => s.id === id)!;
// What matters for the planning of a session: where, how long, locked, marked.
const state = (s: PlannedSession) => ({ date: s.scheduledDate, status: s.status === 'skipped' ? 'skipped' : 'open', minutes: s.plannedMinutes, lock: s.lock?.by, leave: s.leave?.periodId });
const open = (list: PlannedSession[]) => list.filter((s) => s.status !== 'skipped').map((s) => `${s.scheduledDate} ${s.templateId} ${s.plannedMinutes ?? 'vol'} ${s.lock?.by ?? '-'}`).sort();

describe('een tocht aanmaken, wijzigen, terugwijzigen en verwijderen (soepele rust)', () => {
  const base = planPass(WEEKS.flatMap(week), context([])).sessions;
  const t1 = trek('2026-11-15');
  const t2 = trek('2026-12-06');

  it('laat na terugwijzigen en verwijderen niets vast staan en niets over', () => {
    const s1 = accept(change('add', t1, [], base), base);
    // Benen A, 48 uur na de bergtocht: de korte versie, met het merk van de tocht.
    expect(row(s1, LEG_WEEK_A)).toMatchObject({ scheduledDate: '2026-11-18', plannedMinutes: 45, leave: { periodId: 'trek-a', role: 'moved', shortened: true } });
    expect(planPass(s1, context([t1])).remaining).toEqual([]);

    const s2 = accept(change('add', t2, [t1], s1, t1), s1);
    // De tocht ligt nu elders: Benen A staat weer zoals hij vanzelf stond.
    expect(state(row(s2, LEG_WEEK_A))).toEqual(state(row(base, LEG_WEEK_A)));
    expect(planPass(s2, context([t2])).remaining).toEqual([]);

    const s3 = accept(change('add', t1, [t2], s2, t2), s2);
    // Terug naar de eerste dagen: gelijk aan na het aanmaken, en niets blijft over.
    expect(state(row(s3, LEG_WEEK_A))).toEqual(state(row(s1, LEG_WEEK_A)));
    expect(state(row(s3, LEG_WEEK_B))).toEqual(state(row(s1, LEG_WEEK_B)));
    expect(open(s3)).toEqual(open(s1));
    expect(planPass(s3, context([t1])).remaining).toEqual([]);

    const s4 = accept(change('remove', t1, [t1], s3), s3);
    // Verwijderd: gelijk aan de beginplanning, geen vaste minuten, geen slot.
    expect(open(s4)).toEqual(open(base));
    expect(s4.filter((s) => s.status !== 'skipped' && s.lock)).toEqual([]);
    expect(s4.filter((s) => s.leave)).toEqual([]);
    expect(planPass(s4, context([])).remaining).toEqual([]);
  });

  it('zet de terugzetting zelf niet vast: een volgende wijziging mag hem weer verkorten', () => {
    const s1 = accept(change('add', t1, [], base), base);
    const s2 = accept(change('add', t2, [t1], s1, t1), s1);
    const back = change('add', t1, [t2], s2, t2).proposal.changes.find((c) => c.plannedSessionId === LEG_WEEK_A);
    // Hij stond al op de vanzelf-planning, dus er is voor deze sessie niets te doen of ze wordt verkort.
    expect(back).toMatchObject({ action: 'move', plannedMinutes: 45 });
    const toBase = change('remove', t2, [t2], s2).proposal.changes.find((c) => c.plannedSessionId === LEG_WEEK_B);
    expect(toBase?.restore).toBe(true);
  });

  it('een terugzetting is gemerkt als terugzetting en wist de vaste minuten', () => {
    const s1 = accept(change('add', t1, [], base), base);
    const remove = change('remove', t1, [t1], s1);
    const item = remove.proposal.changes.find((c) => c.plannedSessionId === LEG_WEEK_A) as PlanChangeItem;
    expect(item).toMatchObject({ action: 'move', toDate: '2026-11-18', restore: true, leave: null });
    expect(item.plannedMinutes).toBeUndefined();
    const s2 = accept(remove, s1);
    expect(row(s2, LEG_WEEK_A).lock).toBeUndefined();
    expect(row(s2, LEG_WEEK_A).plannedMinutes).toBeUndefined();
    expect(row(s2, LEG_WEEK_A).status).toBe('planned');
  });

  it('meldt een overgebleven beenregel als notitie in het voorstel', () => {
    // Benen A staat door jou vastgezet op dinsdag, te dicht na de tocht: de planning mag hem niet aanraken, dus het blijft staan en het voorstel zegt het.
    const locked = base.map((s) => (s.id === LEG_WEEK_A ? { ...s, scheduledDate: '2026-11-17', weekStartDate: '2026-11-16', lock: { by: 'user' as const, at: 'x' } } : s));
    const plan = change('add', trek('2026-11-14', 'trek-n', { days: 2, importance: 'training' }), [], locked);
    expect(plan.notes.join(' ')).toMatch(/te dicht op elkaar/);
  });
});

describe('een voorstel dat een rij laat terugkomen die al terug is', () => {
  it('maakt geen nieuwe rij maar meldt het als niet uitvoerbaar', () => {
    const rows: PlannedSession[] = [{ id: 'a', templateId: 'tpl_easy_run', scheduledDate: '2026-11-17', weekStartDate: '2026-11-16', status: 'planned', order: 0 }];
    const item: PlanChangeItem = { plannedSessionId: 'a', action: 'add', newSessionDraft: { templateId: 'tpl_easy_run', scheduledDate: '2026-11-18', weekStartDate: '2026-11-16' }, toDate: '2026-11-18', reason: 'x', generatedBy: ['test'] };
    const result = applyPlanChangeItems([item], rows, () => 'new', { by: 'proposal', proposalId: 'p', at: 'x' });
    expect(result.sessions).toEqual(rows);
    expect(result.unsupported).toEqual([item]);
  });
  it('een add zonder rij blijft een nieuwe rij maken', () => {
    const item: PlanChangeItem = { action: 'add', newSessionDraft: { templateId: 'tpl_easy_run', scheduledDate: '2026-11-18', weekStartDate: '2026-11-16' }, toDate: '2026-11-18', reason: 'x', generatedBy: ['test'] };
    const result = applyPlanChangeItems([item], [], () => 'new');
    expect(result.sessions.map((s) => s.id)).toEqual(['new']);
    expect(result.unsupported).toEqual([]);
  });
});

describe('alleen een sessie die de tocht verkortte gaat terug naar vol', () => {
  it('een sessie die om een andere reden kort was, blijft kort als een vakantie weggaat', () => {
    const holiday: LeavePeriod = { id: 'vakantie', kind: 'no_training', startDate: '2026-11-17', endDate: '2026-11-17' };
    const start = planPass(WEEKS.flatMap(week), context([])).sessions.map((s) => (s.id === '2026-11-16-1' ? { ...s, plannedMinutes: 45 } : s));
    const added = accept(change('add', holiday, [], start), start);
    const moved = row(added, '2026-11-16-1');
    expect(moved.leave).toMatchObject({ periodId: 'vakantie' });
    expect(moved.leave?.shortened).toBeUndefined();
    const removed = accept(change('remove', holiday, [holiday], added), added);
    expect(row(removed, '2026-11-16-1')).toMatchObject({ scheduledDate: '2026-11-17', plannedMinutes: 45 });
  });
  it('een beendag die de tocht verkortte (merk verkort) gaat terug naar de volle lengte', () => {
    const t1 = trek('2026-11-15');
    const base = planPass(WEEKS.flatMap(week), context([])).sessions;
    const s1 = accept(change('add', t1, [], base), base);
    expect(row(s1, LEG_WEEK_A).leave?.shortened).toBe(true);
    const full = accept(change('remove', t1, [t1], s1), s1);
    expect(row(full, LEG_WEEK_A).plannedMinutes).toBeUndefined();
  });
});

describe('een meerdaagse heuveltocht met rugzak', () => {
  it('krijgt de bergtocht, zodat de beenrust ervoor en erna geldt', () => {
    const hills = trek('2026-11-14', 'trek-h', { terrain: 'uneven_trail', importance: 'training' });
    const base = planPass(WEEKS.flatMap(week), context([])).sessions;
    const plan = change('add', hills, [], base);
    const walks = plan.proposal.changes.filter((c) => c.action === 'add' && c.newSessionDraft?.scheduledDate && ['2026-11-14', '2026-11-15'].includes(c.newSessionDraft.scheduledDate));
    expect(walks.map((c) => c.newSessionDraft?.templateId)).toEqual(['tpl_mountain_hike', 'tpl_mountain_hike']);
    // Beenregel: Benen A op dinsdag 17 november ligt 48 uur na de tocht en wordt verkort of verschoven.
    const after = accept(plan, base);
    expect(planPass(after, context([hills])).remaining).toEqual([]);
    const leg = row(after, LEG_WEEK_A);
    expect(leg.scheduledDate !== '2026-11-17' || leg.plannedMinutes === 45).toBe(true);
  });
  it('een vlakke tocht blijft de rugzakwandeling', () => {
    const flat = trek('2026-11-14', 'trek-f', { terrain: 'flat_trail', importance: 'training' });
    const base = planPass(WEEKS.flatMap(week), context([])).sessions;
    const walks = change('add', flat, [], base).proposal.changes.filter((c) => c.action === 'add').map((c) => c.newSessionDraft?.templateId);
    expect(walks).toEqual(['tpl_ruck_walk', 'tpl_ruck_walk']);
  });
});

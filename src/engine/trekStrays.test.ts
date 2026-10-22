import { describe, it, expect } from 'vitest';
import { planPass, type PlanPassContext } from './planPass';
import { planLeaveChange, type LeavePlan } from './leaveProposal';
import { applyPlanChangeItems } from './proposalEngine';
import { trekToPeriod } from './trek';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { LeavePeriod } from '../models/leave';
import type { PlannedSession, SessionLog } from '../models/training';
import { strayTrekRows } from './leaveStrays';
import { addDays } from '../utils/dates';

// Doorloop, punt 1: een tocht wijzigen of verwijderen liet per tochtdag een
// overgeslagen Bergtocht achter, en bij elke volgende wijziging een rij meer.
// Een tochtdag die de tocht zelf plaatste gaat met de tocht mee weg.

const { templates } = buildDefaultProgramData();
const TODAY = '2026-10-22';
const DAYS = ['tpl_easy_run', 'tpl_upper_a', 'tpl_lower_a', 'tpl_herstel', 'tpl_upper_b', 'tpl_hill_intervals', 'tpl_long_run'];
const week = (monday: string): PlannedSession[] => DAYS.map((templateId, i) => ({ id: `${monday}-${i}`, templateId, scheduledDate: addDays(monday, i), weekStartDate: monday, status: 'planned', order: i }));
const WEEKS = ['2026-10-26', '2026-11-02', '2026-11-09', '2026-11-16', '2026-11-23'];

function context(leave: LeavePeriod[]): PlanPassContext {
  let n = 0;
  return { today: TODAY, logs: [], templates, program: null, blocks: [], restDay: 4, goalDay: '2027-08-01', newId: () => `n${n++}`, leave };
}
const trek = (days: number) => trekToPeriod({ name: 'Ardennen', startDate: '2026-11-07', days, terrain: 'mountain', tent: false, importance: 'goal' }, 'trek-ardennen');

let counter = 0;
function change(mode: 'add' | 'remove', period: LeavePeriod, existing: LeavePeriod[], sessions: PlannedSession[], replaces?: LeavePeriod): LeavePlan {
  return planLeaveChange({ mode, period, replaces, existing, sessions, logs: [], templates, today: TODAY, context: (p) => context(p) });
}
const accept = (plan: LeavePlan, sessions: PlannedSession[]) =>
  applyPlanChangeItems(plan.proposal.changes, sessions, () => `acc-${counter++}`, { by: 'proposal', proposalId: plan.proposal.id, at: '2026-10-22T08:00:00.000Z' }).sessions;
const skippedHikes = (list: PlannedSession[]) => list.filter((s) => s.status === 'skipped' && s.templateId === 'tpl_mountain_hike');
const hikesOn = (list: PlannedSession[], date: string) => list.filter((s) => s.scheduledDate === date && s.templateId === 'tpl_mountain_hike');

describe('een tocht wijzigen en verwijderen laat geen overgeslagen tochtdagen achter', () => {
  const base = planPass(WEEKS.flatMap(week), context([])).sessions;
  const t3 = trek(3);
  const t4 = trek(4);
  const t2 = trek(2);

  it('na wijzigen staan alleen de nieuwe tochtdagen er, zonder overgeslagen rij ernaast', () => {
    const s1 = accept(change('add', t3, [], base), base);
    expect(hikesOn(s1, '2026-11-07')).toHaveLength(1);
    const s2 = accept(change('add', t4, [t3], s1, t3), s1);
    expect(skippedHikes(s2)).toEqual([]);
    for (const day of ['2026-11-07', '2026-11-08', '2026-11-09', '2026-11-10']) expect(hikesOn(s2, day)).toHaveLength(1);
  });

  it('twee keer wijzigen en daarna verwijderen geeft de beginplanning terug, zonder rij te veel', () => {
    const s1 = accept(change('add', t3, [], base), base);
    const s2 = accept(change('add', t4, [t3], s1, t3), s1);
    const s3 = accept(change('add', t2, [t4], s2, t4), s2);
    expect(skippedHikes(s3)).toEqual([]);
    const s4 = accept(change('remove', t2, [t2], s3), s3);
    expect(skippedHikes(s4)).toEqual([]);
    expect(s4.length).toBe(base.length);
    expect(s4.filter((s) => s.status === 'skipped').length).toBe(base.filter((s) => s.status === 'skipped').length);
  });

  it('het verwijdervoorstel haalt een geplaatste tochtdag weg in plaats van hem over te slaan', () => {
    const s1 = accept(change('add', t3, [], base), base);
    const placed = s1.filter((s) => s.leave?.role === 'placed').map((s) => s.id);
    expect(placed.length).toBeGreaterThan(0);
    const items = change('remove', t3, [t3], s1).proposal.changes.filter((c) => placed.includes(c.plannedSessionId ?? ''));
    expect(items.length).toBe(placed.length);
    for (const item of items) expect(item).toMatchObject({ action: 'remove', discard: true });
  });
});

describe('het tochtvoorstel zet geen twee zware beendagen achter elkaar (Doorloop, punt 13)', () => {
  it('na Akkoord vindt de weekcontrole geen beendagen te dicht op elkaar rond de tocht', () => {
    const layout = ['tpl_easy_run', 'tpl_upper_a', 'tpl_lower_a', 'tpl_herstel', 'tpl_upper_b', 'tpl_hills_descent', 'tpl_long_run'];
    const weekOf = (monday: string): PlannedSession[] => layout.map((templateId, i) => ({ id: `${monday}-${i}`, templateId, scheduledDate: addDays(monday, i), weekStartDate: monday, status: 'planned', order: i }));
    const base = planPass(WEEKS.flatMap(weekOf), context([])).sessions;
    const t = trek(3);
    const after = accept(change('add', t, [], base), base);
    const spacing = planPass(after, context([t])).remaining.filter((f) => f.rule === 'LEG-SPACING' && f.date >= '2026-10-26' && f.date <= '2026-11-22');
    expect(spacing).toEqual([]);
  });
});

describe('rijen die een oudere versie al achterliet', () => {
  const base = planPass(WEEKS.flatMap(week), context([])).sessions;
  // Zoals de oude versie het deed: een geplaatste tochtdag werd een overgeslagen rij zonder merk.
  const oldStyle = (plan: LeavePlan): LeavePlan => ({ ...plan, proposal: { ...plan.proposal, resolution: 'accepted', changes: plan.proposal.changes.map(({ discard, ...c }) => (discard ? { ...c, leave: null } : c)) } });

  it('vindt precies de achtergelaten tochtdagen, en niets anders', () => {
    const addAccepted = oldStyle(change('add', trek(3), [], base));
    const s1 = accept(addAccepted, base);
    const edit = oldStyle(change('add', trek(4), [trek(3)], s1, trek(3)));
    const s2 = accept(edit, s1);
    const strays = s2.filter((s) => s.status === 'skipped' && !s.leave && s.templateId === 'tpl_mountain_hike');
    expect(strays.length).toBe(3);
    // Een overslag van jezelf en een gelogde rij blijven staan.
    const own = { ...base[0], status: 'skipped' as const, lock: { by: 'user' as const, at: 'x' } };
    const found = strayTrekRows([...s2, own], [addAccepted.proposal, edit.proposal], []);
    expect(found.sort()).toEqual(strays.map((s) => s.id).sort());
    const log = { id: 'log', plannedSessionId: strays[0].id } as unknown as SessionLog;
    expect(strayTrekRows(s2, [addAccepted.proposal, edit.proposal], [log])).not.toContain(strays[0].id);
    // Zonder een geaccepteerd voorstel dat hem plaatste is het niet aantoonbaar: blijft staan.
    expect(strayTrekRows(s2, [edit.proposal, { ...addAccepted.proposal, resolution: 'rejected' as const }].map((p) => ({ ...p, changes: p.changes.filter((c) => c.action !== 'add') })), [])).toEqual([]);
  });
});

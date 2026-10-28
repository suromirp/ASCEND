import { describe, it, expect } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession } from '../models/training';
import { addDays } from '../utils/dates';
import { applyPlanChangeItems } from './proposalEngine';
import { weekConcerns } from './weekConcerns';
import { adviceSessionIds, planWeekFix, weekNotice } from './weekFixProposal';
import { repairWeeks, validateWeeks, type CheckInput } from './weekValidator';

const { templates } = buildDefaultProgramData();
const TODAY = '2026-10-21';
const MONDAY = '2026-10-26';
const lock = { by: 'proposal' as const, at: '2026-10-20T10:00:00.000Z' };
const week = (ids: string[]): PlannedSession[] => ids.map((templateId, i) => ({ id: `w-${i}`, templateId, scheduledDate: addDays(MONDAY, i), weekStartDate: MONDAY, status: 'moved', order: i, lock }));
const input = (sessions: PlannedSession[], over: Partial<CheckInput> = {}): CheckInput => ({ sessions, logs: [], templates, today: TODAY, restDay: 4, goalDay: '2027-08-01', ...over });
// Het nagemaakte geval: elke dag een training, alles vastgezet door een geaccepteerd voorstel, de rustdag is donderdag.
const FULL = ['tpl_long_run', 'tpl_upper_a', 'tpl_lower_a', 'tpl_easy_run', 'tpl_upper_b', 'tpl_hills_descent', 'tpl_long_run'];

describe('mayMove', () => {
  it('zonder de optie raakt de controle jouw training niet aan', () => {
    expect(repairWeeks(input(week(FULL), { reportYours: true })).repairs).toEqual([]);
  });
  it('met de optie herstelt ze alleen die training, en alleen die van jou', () => {
    const list = week(FULL).map((s) => (s.id === 'w-3' ? { ...s, scheduledDate: '2026-10-29' } : s));
    const r = repairWeeks(input(list, { reportYours: true, mayMove: ['w-3'] }));
    expect(r.repairs.every((x) => x.sessionId === 'w-3')).toBe(true);
    expect(r.repairs.length).toBeGreaterThan(0);
    const past = repairWeeks(input(week(FULL), { reportYours: true, mayMove: ['w-3'], today: '2026-10-30' }));
    expect(past.repairs).toEqual([]);
  });
});

describe('planWeekFix, een week zonder rustdag', () => {
  const sessions = week(FULL);
  const concerns = weekConcerns(input(sessions), MONDAY);
  const rest = concerns.find((c) => c.rule === 'REST-DAY')!;

  it('stelt voor de Rustige duurloop op donderdag te laten vervallen, met Akkoord en zonder iets te verplaatsen', () => {
    const advice = planWeekFix(input(sessions), rest, MONDAY)!;
    expect(advice).toMatchObject({ ruleId: 'WEEK-CHECK', trigger: 'plan_update', title: 'Je week heeft geen rustdag' });
    expect(advice.id).toBe('weekfix:REST-DAY:w-3:2026-10-29');
    expect(advice.effect).toBe('Laat Rustige duurloop op donderdag 29 gaan. Dan heb je donderdag vrij.');
    expect(advice.proposal!.changes).toEqual([expect.objectContaining({ plannedSessionId: 'w-3', action: 'remove', fromDate: '2026-10-29' })]);
    expect(advice.proposal!.changes[0].restore).toBeUndefined();
  });

  it('na Akkoord is er geen rustdagmelding meer', () => {
    const advice = planWeekFix(input(sessions), rest, MONDAY)!;
    const after = applyPlanChangeItems(advice.proposal!.changes, sessions, () => 'x', { by: 'proposal', at: 'nu' }).sessions;
    expect(validateWeeks({ ...input(after), reportYours: true }).some((f) => f.rule === 'REST-DAY')).toBe(false);
    expect(weekConcerns(input(after), MONDAY).some((c) => c.rule === 'REST-DAY')).toBe(false);
  });

  it('laat de planning zelf ongemoeid: zonder Akkoord blijft alles staan', () => {
    const copy = JSON.stringify(sessions);
    planWeekFix(input(sessions), rest, MONDAY);
    expect(JSON.stringify(sessions)).toBe(copy);
  });

  it('een lange duurloop, harde loop of beendag op de rustdag wordt nooit zomaar laten vervallen', () => {
    const hard = week(['tpl_easy_run', 'tpl_upper_a', 'tpl_lower_a', 'tpl_hills_descent', 'tpl_upper_b', 'tpl_easy_run', 'tpl_easy_run']);
    const c = weekConcerns(input(hard), MONDAY).find((x) => x.rule === 'REST-DAY')!;
    const advice = planWeekFix(input(hard), c, MONDAY);
    for (const o of advice?.options ?? [advice!]) {
      const removed = (o.proposal ?? advice!.proposal)!.changes.filter((x) => x.action === 'remove').map((x) => x.plannedSessionId);
      expect(removed).not.toContain('w-3');
      expect(removed).not.toContain('w-2');
    }
  });

  it('twee volle lange duurlopen: de latere wordt de korte versie', () => {
    const long = concerns.find((c) => c.rule === 'ONE-LONG')!;
    const advice = planWeekFix(input(sessions), long, MONDAY)!;
    expect(advice.proposal!.changes).toEqual([expect.objectContaining({ plannedSessionId: 'w-6', action: 'move', fromDate: '2026-11-01', toDate: '2026-11-01', plannedMinutes: expect.any(Number) })]);
    expect(advice.effect).toMatch(/^Lange duurloop op zondag 1 wordt de korte versie, \d+ minuten\.$/);
  });

  it('een week zonder oplossing geeft geen voorstel', () => {
    const noShort = templates.map((t) => (t.id === 'tpl_long_run' ? { ...t, durationVariants: { ...t.durationVariants, short: undefined } } : t));
    const long = weekConcerns(input(sessions, { templates: noShort }), MONDAY).find((c) => c.rule === 'ONE-LONG')!;
    expect(planWeekFix(input(sessions, { templates: noShort }), long, MONDAY)).toBeNull();
  });
});

describe('weekNotice naast de voorstellen van Vandaag', () => {
  const sessions = week(FULL);
  const advice = (id: string, changeId: string) => ({
    id, trigger: 'plan_update' as const, ruleId: 'TEST-RETRY', title: 't', effect: 'e', why: 'w', priority: 1,
    proposal: { id: 'p', trigger: 'plan_check' as const, issue: 'i', changes: [{ plannedSessionId: changeId, action: 'move' as const, fromDate: '2026-10-29', toDate: '2026-10-30', reason: 'r', generatedBy: [] }], alternatives: [], consequences: '', explanation: '', createdAt: '' },
  });

  it('verzamelt de ids uit wijzigingen, opties en de test van TEST-MAKE-ROOM', () => {
    const a = { ...advice('testroom:t-9', 'w-1'), options: [{ label: 'x', effect: 'y', proposal: advice('x', 'w-2').proposal }] };
    expect([...adviceSessionIds([a])].sort()).toEqual(['t-9', 'w-1', 'w-2']);
  });

  it('geeft geen eigen voorstel als Vandaag er al een heeft voor dezelfde training', () => {
    const open = weekNotice(input(sessions), MONDAY, true);
    expect(Object.keys(open.fixes)).toContain('REST-DAY:w-3');
    const taken = adviceSessionIds([advice('a', 'w-3')]);
    const n = weekNotice(input(sessions), MONDAY, true, taken);
    expect(n.fixes['REST-DAY:w-3']).toBeUndefined();
    expect(n.covered).toContain('REST-DAY:w-3');
    expect(n.concerns.length).toBe(open.concerns.length);
  });

  it('laat een voorstel staan als het een andere training betreft', () => {
    const n = weekNotice(input(sessions), MONDAY, true, adviceSessionIds([advice('a', 'ander')]));
    expect(n.covered).toEqual([]);
    expect(n.fixes['REST-DAY:w-3']).toBeDefined();
  });

  it('de test van TEST-MAKE-ROOM telt ook als de test zelf niet verschuift', () => {
    const n = weekNotice(input(sessions), MONDAY, true, adviceSessionIds([advice('testroom:w-3', 'w-0')]));
    expect(n.covered).toContain('REST-DAY:w-3');
  });
});

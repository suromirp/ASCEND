import { describe, expect, it } from 'vitest';
import type { PlannedSession, SessionTemplate } from '../models/training';
import { applyPlanChangeItems } from './proposalEngine';
import { planShorter, resolveShorterToday, SHORTER_RULE, shorterAdvice, shorterChoices, TEST_NOT_SHORTER } from './shorterToday';

// Nagemaakte trainingen.
const easy: SessionTemplate = { id: 'tpl_easy_run', name: 'Rustige duurloop', type: 'cardio', roles: ['easy_pace'], durationVariants: { full: 50 } };
const tempo: SessionTemplate = { id: 'tpl_tempo_run', name: 'Tempoloop', type: 'cardio', roles: ['blocks', 'hard_run'], durationVariants: { full: 60 } };
const test: SessionTemplate = { id: 'tpl_test_run', name: 'Testloop 5 km', type: 'cardio', roles: ['test'], durationVariants: { full: 45 } };
const race: SessionTemplate = { id: 'tpl_race', name: 'Wedstrijd', type: 'cardio', roles: ['race'], durationVariants: { full: 70 } };
const strength: SessionTemplate = {
  id: 'tpl_upper', name: 'Bovenlichaam A', type: 'strength', durationVariants: { full: 75 },
  exercises: [
    { id: 'e1', exerciseName: 'Bankdrukken', sets: 4, reps: '6-8', priority: 'core' },
    { id: 'e2', exerciseName: 'Roeien', sets: 4, reps: '8', priority: 'core' },
    { id: 'e3', exerciseName: 'Schouderdrukken', sets: 3, reps: '10', priority: 'accessory' },
    { id: 'e4', exerciseName: 'Biceps', sets: 3, reps: '12', priority: 'optional' },
  ],
};
const session: PlannedSession = { id: 'p1', templateId: 'tpl_upper', scheduledDate: '2026-11-04', weekStartDate: '2026-11-02', status: 'planned', order: 0 };

describe('minder tijd vandaag', () => {
  it('biedt alleen de tijden die korter zijn dan de training', () => {
    expect(shorterChoices(75)).toEqual([30, 45, 60]);
    expect(shorterChoices(50)).toEqual([30, 45]);
    expect(shorterChoices(45)).toEqual([30]);
    expect(shorterChoices(30)).toEqual([]);
  });

  it('de instelling: kernsets als advies, een onbekende waarde telt als advies', () => {
    expect(resolveShorterToday(undefined)).toBe('kern');
    expect(resolveShorterToday('volume')).toBe('volume');
    expect(resolveShorterToday('off')).toBe('off');
    expect(resolveShorterToday('rommel')).toBe('kern');
  });

  it('een test of wedstrijd kan niet korter', () => {
    expect(planShorter({ template: test, fullMinutes: 45, available: 30, how: 'kern' })).toEqual({ kind: 'test' });
    expect(planShorter({ template: race, fullMinutes: 70, available: 45, how: 'volume' })).toEqual({ kind: 'test' });
    expect(TEST_NOT_SHORTER).toContain('Verplaatsen kan wel');
  });

  it('niets korter als de gekozen tijd niet korter is', () => {
    expect(planShorter({ template: easy, fullMinutes: 30, available: 30, how: 'kern' })).toEqual({ kind: 'none' });
    expect(planShorter({ template: easy, fullMinutes: 50, available: 0, how: 'kern' })).toEqual({ kind: 'none' });
  });

  it('kracht met kernsets: de kernoefeningen bij naam, de rest blijft liggen', () => {
    const r = planShorter({ template: strength, fullMinutes: 75, available: 45, how: 'kern' });
    expect(r.kind).toBe('ok');
    if (r.kind !== 'ok') return;
    expect(r.minutes).toBe(45);
    expect(r.lines).toEqual(['Duur: 75 min wordt 45 min.', 'Je doet de kernoefeningen: Bankdrukken en Roeien. Schouderdrukken en Biceps laat je vandaag liggen.']);
  });

  it('kracht met minder volume: alle oefeningen, minder sets', () => {
    const r = planShorter({ template: strength, fullMinutes: 75, available: 60, how: 'volume' });
    expect(r.kind === 'ok' && r.lines[1]).toBe('Alle oefeningen, met een set minder per oefening; de extra oefeningen laat je liggen.');
  });

  it('kracht zonder kernoefeningen valt terug op minder volume', () => {
    const plain: SessionTemplate = { ...strength, exercises: strength.exercises!.map((e) => ({ ...e, priority: 'accessory' as const })) };
    const r = planShorter({ template: plain, fullMinutes: 75, available: 45, how: 'kern' });
    expect(r.kind === 'ok' && r.how).toBe('volume');
  });

  it('een loop met blokken: de kern blijft, of minder herhalingen', () => {
    const kern = planShorter({ template: tempo, fullMinutes: 60, available: 45, how: 'kern' });
    expect(kern.kind === 'ok' && kern.lines[1]).toBe('De kern blijft zoals hij is; het inlopen en uitlopen worden korter.');
    const vol = planShorter({ template: tempo, fullMinutes: 60, available: 45, how: 'volume' });
    expect(vol.kind === 'ok' && vol.lines[1]).toBe('Minder herhalingen of een korter blok, in hetzelfde tempo.');
    const calm = planShorter({ template: easy, fullMinutes: 50, available: 30, how: 'kern' });
    expect(calm.kind === 'ok' && calm.lines[1]).toBe('Hetzelfde tempo en dezelfde zone, alleen korter.');
  });

  it('het voorstel: dezelfde training op dezelfde dag, alleen een kortere lengte; Akkoord zet alleen die lengte', () => {
    const plan = planShorter({ template: strength, fullMinutes: 75, available: 45, how: 'kern' });
    if (plan.kind !== 'ok') throw new Error('geen plan');
    const advice = shorterAdvice({ session, template: strength, plan, now: '2026-11-04T06:00:00.000Z' });
    expect(advice.ruleId).toBe(SHORTER_RULE);
    expect(advice.id).toBe('shorter:p1:2026-11-04:45');
    const item = advice.proposal!.changes[0];
    expect(item).toMatchObject({ plannedSessionId: 'p1', action: 'move', fromDate: '2026-11-04', toDate: '2026-11-04', plannedMinutes: 45 });
    expect(advice.proposal!.changes).toHaveLength(1);
    expect(advice.proposal!.trigger).toBe('no_time_today');
    const { sessions } = applyPlanChangeItems(advice.proposal!.changes, [session], undefined, { by: 'proposal', proposalId: advice.proposal!.id, at: '2026-11-04T06:00:00.000Z' });
    expect(sessions[0]).toMatchObject({ templateId: 'tpl_upper', scheduledDate: '2026-11-04', plannedMinutes: 45 });
  });
});

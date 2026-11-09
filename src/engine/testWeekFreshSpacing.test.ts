// Een testweek waarin "frisse benen voor de test" en "genoeg ruimte tussen zware dagen" elkaar raakten (backlog,
// 5 november): de weekcontrole maakte Benen A kort voor de test, het raceblok zag dat als een oude ruil en zette
// hem vol en een dag later terug, en zo om de beurt bij elke ronde. Nu kiest de planner één oplossing die beide
// regels haalt en houdt die vast; wat niet op te lossen is blijft een zorg in Week. Alle data is nagemaakt.
import { describe, it, expect, afterEach } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession, SessionLog } from '../models/training';
import { addDays, mondayOfWeek } from '../utils/dates';
import { planPass, type PlanPassContext } from './planPass';
import { applyRaceBlocks } from './raceBlock';
import { setFreshnessContext } from './scheduler';
import { repairWeeks, validateWeeks, type CheckInput } from './weekValidator';
import { weekConcerns } from './weekConcerns';
import { planWeekFix } from './weekFixProposal';
import { applyPlanChangeItems } from './proposalEngine';

const { templates, program } = buildDefaultProgramData();
const byId = new Map(templates.map((t) => [t.id, t]));
const MONDAY = '2026-10-26';
const TODAY = MONDAY;
// Rustdag maandag: di Benen A, wo Bovenlichaam A, do Bovenlichaam B, vr Heuvels, za Rustige duurloop, zo Lange duurloop.
const DAYS = ['tpl_herstel', 'tpl_lower_a', 'tpl_upper_a', 'tpl_upper_b', 'tpl_hill_intervals', 'tpl_easy_run', 'tpl_long_run'];
const TEST_ID = '7-1'; // de testloop op dinsdag 3 november, door jou gezet

function plan(withLogs: boolean) {
  const sessions: PlannedSession[] = [];
  const logs: SessionLog[] = [];
  for (const w of [-14, -7, 0, 7, 14]) DAYS.forEach((templateId, i) => {
    const date = addDays(MONDAY, w + i);
    const id = `${w}-${i}`;
    sessions.push({ id, templateId, scheduledDate: date, weekStartDate: addDays(MONDAY, w), status: 'planned', order: i });
    if (withLogs && date < TODAY) logs.push({ id: `log-${id}`, plannedSessionId: id, templateId, type: byId.get(templateId)!.type, completedDate: date, completedAt: `${date}T10:00:00Z`, variant: 'full', durationMinutes: 60, rpe: 7, source: 'manual' } as SessionLog);
  });
  const list = sessions.map((s) => (s.id === TEST_ID ? { ...s, templateId: 'tpl_test_run', lock: { by: 'user' as const, at: '2026-10-20T08:00:00Z' } } : s));
  return { list, logs };
}
const ctxOf = (logs: SessionLog[]): PlanPassContext => ({ today: TODAY, logs, templates, program, blocks: [], restDay: 1, goalDay: '2027-08-01', newId: () => 'nieuw' });
const checkOf = (sessions: PlannedSession[], logs: SessionLog[]): CheckInput => ({ sessions, logs, templates, today: TODAY, restDay: 1, goalDay: '2027-08-01' });
// Rijen die de ronde aanraakte en die precies eindigden zoals ze stonden: heen en weer geschoven.
const backAndForth = (before: PlannedSession[], after: PlannedSession[], repaired: string[]) => {
  const now = new Map(after.map((s) => [s.id, s]));
  return [...new Set(repaired)].filter((id) => { const was = before.find((s) => s.id === id); return !!was && JSON.stringify(was) === JSON.stringify(now.get(id)); });
};

afterEach(() => setFreshnessContext(undefined));

const contexts = [
  ['zonder frisheidscontext', () => setFreshnessContext(undefined)],
  ['met frisheidscontext zoals de app', () => setFreshnessContext({ today: TODAY, bodyKg: 86, minutesOf: (_s, t) => t.durationVariants.full })],
] as const;

describe.each(contexts)('testweek met frisse benen en ruimte tussen zware dagen (%s)', (_name, setup) => {
  it('kiest één oplossing die beide regels haalt: Benen A kort op zijn eigen dinsdag', () => {
    setup();
    const { list, logs } = plan(true);
    const pass = planPass(list, ctxOf(logs));
    const legs = pass.sessions.find((s) => s.id === '0-1')!;
    expect(legs).toMatchObject({ scheduledDate: '2026-10-27', plannedMinutes: byId.get('tpl_lower_a')!.durationVariants.short });
    const left = validateWeeks(checkOf(pass.sessions, logs)).map((f) => f.rule);
    expect(left).not.toContain('TEST-FRESH');
    expect(left).not.toContain('LEG-SPACING');
  });

  it('schuift niets heen en terug binnen één ronde', () => {
    setup();
    const { list, logs } = plan(true);
    const pass = planPass(list, ctxOf(logs));
    expect(backAndForth(list, pass.sessions, pass.repairs.map((r) => r.sessionId))).toEqual([]);
    // Elke training hoogstens één keer verplaatst of korter gemaakt.
    const perSession = new Map<string, number>();
    for (const r of pass.repairs) perSession.set(r.sessionId, (perSession.get(r.sessionId) ?? 0) + 1);
    expect([...perSession.values()].every((n) => n === 1)).toBe(true);
  });

  it('een tweede ronde verandert niets', () => {
    setup();
    const { list, logs } = plan(true);
    const first = planPass(list, ctxOf(logs));
    const second = planPass(first.sessions, ctxOf(logs));
    expect(second.repairs).toEqual([]);
    expect(second.sessions).toEqual(first.sessions);
  });
});

describe('het raceblok laat een korte beendag voor een test staan', () => {
  it('de beendag die de weekcontrole kort maakte voor de test gaat niet terug naar woensdag', () => {
    const { list, logs } = plan(true);
    const repaired = repairWeeks(checkOf(list, logs)).sessions;
    const logged = new Set(logs.map((l) => l.plannedSessionId));
    const open = repaired.filter((s) => s.scheduledDate >= TODAY && !logged.has(s.id));
    const race = applyRaceBlocks(open, [], templates, () => 'nieuw', program, repaired);
    expect(race.update.find((u) => u.id === '0-1')).toBeUndefined();
    expect(race.update.find((u) => u.id === '0-2')).toBeUndefined();
  });

  it('een oude ruil zonder test in de week erna gaat nog wel terug', () => {
    // Benen A kort op dinsdag, Bovenlichaam A op woensdag, de test pas 9 dagen na woensdag.
    const week = DAYS.map((templateId, i): PlannedSession => ({ id: `w-${i}`, templateId, scheduledDate: addDays(MONDAY, i), weekStartDate: MONDAY, status: 'planned', order: i }));
    const swapped = week.map((s) => (s.templateId === 'tpl_lower_a' ? { ...s, plannedMinutes: 45 } : s));
    const test: PlannedSession = { id: 'test', templateId: 'tpl_test_run', scheduledDate: '2026-11-06', weekStartDate: mondayOfWeek('2026-11-06'), status: 'planned', order: 0 };
    const race = applyRaceBlocks([...swapped, test], [], templates, () => 'nieuw', program);
    expect(race.update).toContainEqual(expect.objectContaining({ id: 'w-1', scheduledDate: '2026-10-28' }));
    expect(race.update.find((u) => u.id === 'w-1')?.plannedMinutes).toBeUndefined();
  });

  it('een test die jij oversloeg houdt de oude ruil niet tegen', () => {
    const week = DAYS.map((templateId, i): PlannedSession => ({ id: `w-${i}`, templateId, scheduledDate: addDays(MONDAY, i), weekStartDate: MONDAY, status: 'planned', order: i }));
    const swapped = week.map((s) => (s.templateId === 'tpl_lower_a' ? { ...s, plannedMinutes: 45 } : s));
    const test: PlannedSession = { id: 'test', templateId: 'tpl_test_run', scheduledDate: '2026-11-03', weekStartDate: mondayOfWeek('2026-11-03'), status: 'skipped', order: 0 };
    const race = applyRaceBlocks([...swapped, test], [], templates, () => 'nieuw', program);
    expect(race.update).toContainEqual(expect.objectContaining({ id: 'w-1', scheduledDate: '2026-10-28' }));
  });
});

describe('wat de planner niet zelf kan oplossen, blijft een zorg in Week met een voorstel', () => {
  // Zonder logs en met de frisheidscontext van de app helpt een korte beendag niet genoeg: de lange duurloop van
  // zondag en de heuvels van vrijdag wegen ook. De planner raakt de test die jij zette niet aan.
  const setup = () => {
    setFreshnessContext({ today: TODAY, bodyKg: 86, minutesOf: (_s, t) => t.durationVariants.full });
    const { list, logs } = plan(false);
    return { pass: planPass(list, ctxOf(logs)), logs };
  };

  it('de ronde laat het staan en een tweede ronde blijft stil', () => {
    const { pass, logs } = setup();
    expect(pass.remaining.map((f) => f.rule)).toContain('TEST-FRESH');
    expect(pass.sessions.find((s) => s.id === TEST_ID)!.scheduledDate).toBe('2026-11-03');
    expect(planPass(pass.sessions, ctxOf(logs)).repairs).toEqual([]);
  });

  it('Week meldt de test en stelt voor hem een dag later te doen, met Akkoord', () => {
    const { pass, logs } = setup();
    const input = checkOf(pass.sessions, logs);
    const fresh = weekConcerns(input, '2026-11-02').find((c) => c.rule === 'TEST-FRESH')!;
    expect(fresh).toBeDefined();
    const advice = planWeekFix(input, fresh, '2026-11-02')!;
    expect(advice.proposal!.changes).toEqual([
      expect.objectContaining({ plannedSessionId: TEST_ID, action: 'move', fromDate: '2026-11-03', toDate: '2026-11-04' }),
      expect.objectContaining({ plannedSessionId: '7-2', action: 'move', fromDate: '2026-11-04', toDate: '2026-11-03' }),
    ]);
    expect(advice.effect).toBe('Testloop 5 km gaat van dinsdag 3 naar woensdag 4. Bovenlichaam A gaat van woensdag 4 naar dinsdag 3.');
  });

  it('na Akkoord zijn de benen fris, en de ronde zet niets terug', () => {
    const { pass, logs } = setup();
    const input = checkOf(pass.sessions, logs);
    const fresh = weekConcerns(input, '2026-11-02').find((c) => c.rule === 'TEST-FRESH')!;
    const advice = planWeekFix(input, fresh, '2026-11-02')!;
    const accepted = applyPlanChangeItems(advice.proposal!.changes, pass.sessions, () => 'nieuw', { by: 'proposal', at: '2026-11-01T08:00:00Z' }).sessions;
    const after = planPass(accepted, ctxOf(logs));
    expect(after.repairs).toEqual([]);
    expect(after.sessions.find((s) => s.id === TEST_ID)!.scheduledDate).toBe('2026-11-04');
    expect(validateWeeks({ ...checkOf(after.sessions, logs), reportYours: true }, new Set(['2026-11-02'])).map((f) => f.rule)).not.toContain('TEST-FRESH');
  });

  it('een wedstrijd verschuift nooit, ook niet via een voorstel', () => {
    const { pass, logs } = setup();
    const withRace = pass.sessions.map((s) => (s.id === TEST_ID ? { ...s, templateId: 'tpl_race' } : s));
    const input = checkOf(withRace, logs);
    const fresh = weekConcerns(input, '2026-11-02').find((c) => c.rule === 'TEST-FRESH');
    expect(fresh).toBeDefined();
    const advice = planWeekFix(input, fresh!, '2026-11-02');
    expect(advice?.proposal?.changes.some((c) => c.plannedSessionId === TEST_ID) ?? false).toBe(false);
  });
});

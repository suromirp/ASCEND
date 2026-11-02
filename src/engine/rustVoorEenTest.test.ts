import { describe, it, expect } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession, SessionLog } from '../models/training';
import type { DailyTimeBudget, Weekday } from '../models/goalEngineConfig';
import { computeAdvice, type AdviceInputs } from './adviceEngine';
import { applyPlanChangeItems } from './proposalEngine';
import { respectsHeavySpacing, setTestRestHours, testRestHours, withTestRestHours } from './scheduler';
import { resolveTestRest } from './testRest';
import { weekConcerns } from './weekConcerns';
import { weekNotice } from './weekFixProposal';
import { repairWeeks, validateWeeks, type CheckInput } from './weekValidator';
import { dayVerdicts, type DragContext } from './weekDrag';
import { checkSwap } from './weekSwap';

// Besluiten van 2 november 2026: rust voor een test (72 uur, of 48 met de instelling) en een lange duurloop die
// vervalt bij een nieuwe testpoging als de week erna al een eigen lange duurloop heeft. Alle gegevens zijn
// nagemaakt, met datums in maart 2027.
const { templates, program } = buildDefaultProgramData();
const byId = new Map(templates.map((t) => [t.id, t]));
const row = (id: string, templateId: string, scheduledDate: string, weekStartDate: string, over: Partial<PlannedSession> = {}): PlannedSession => ({ id, templateId, scheduledDate, weekStartDate, status: 'planned', order: 0, ...over });
const userLock = { by: 'user' as const, at: '2027-03-10T08:00:00Z' };

describe('TEST-RETRY: de lange duurloop vervalt of schuift', () => {
  // Een testloop met veel stilstand op dinsdag 9 maart; vandaag is woensdag 10 maart.
  const testLog: SessionLog = {
    id: 'log-test-mrt', templateId: 'tpl_test_run', type: 'cardio', completedDate: '2027-03-09', completedAt: '2027-03-09T07:30:00Z', variant: 'full', durationMinutes: 35, rpe: 9, source: 'manual',
    cardioData: { durationMinutes: 35, distanceKm: 6, source: 'manual' },
    bestEffort: { km: 5, minutes: 26.5, wholeKm: 6, wholeMinutes: 35, accepted: true, v: 2, stops: 6, stoppedSec: 150 },
  } as SessionLog;
  // Heuvels op zaterdag 13 maart worden de test; de lange duurloop staat de dag erna.
  const base = (): PlannedSession[] => [
    row('heuvels', 'tpl_hill_intervals', '2027-03-13', '2027-03-08'),
    row('lang', 'tpl_long_run', '2027-03-14', '2027-03-08'),
    row('boven', 'tpl_upper_a', '2027-03-16', '2027-03-15'),
    row('rustig', 'tpl_easy_run', '2027-03-18', '2027-03-15'),
  ];
  const inputs = (plannedSessions: PlannedSession[]): AdviceInputs => ({
    logs: [testLog], plannedSessions, templates, injuries: [], program: null, dailyTimeBudget: {}, sameDayPairingPreference: 'automatic', respondedIds: new Set(), asOf: '2027-03-10',
  });
  const retry = (plannedSessions: PlannedSession[]) => computeAdvice(inputs(plannedSessions)).find((a) => a.ruleId === 'TEST-RETRY');

  it('laat de lange duurloop vervallen als de week erna al een eigen lange duurloop heeft, ook niet ingekort', () => {
    const a = retry([...base(), row('lang2', 'tpl_long_run', '2027-03-21', '2027-03-15')])!;
    expect(a).toBeDefined();
    const all = [a.proposal!, ...(a.options ?? []).map((o) => o.proposal)];
    for (const p of all) {
      const long = p.changes.find((c) => c.plannedSessionId === 'lang')!;
      expect(long).toMatchObject({ action: 'remove' });
      expect(long.plannedMinutes).toBeUndefined();
      expect(p.changes.find((c) => c.plannedSessionId === 'lang2')).toBeUndefined();
    }
    expect(a.proposal!.changes.find((c) => c.plannedSessionId === 'heuvels')).toMatchObject({ action: 'move', templateId: 'tpl_test_run', toDate: '2027-03-13' });
    expect(a.effect).toContain('Lange duurloop van zo 14 maart 2027 vervalt. Je houdt de lange duurloop van zo 21 maart 2027 in die week.');
    expect(a.effect).not.toMatch(/[\u2013\u2014]/);
    // Na Akkoord staat de lange duurloop van die week er nog, de verschoven niet.
    const lock = { by: 'proposal' as const, at: 'x' };
    const { sessions } = applyPlanChangeItems(a.proposal!.changes, [...base(), row('lang2', 'tpl_long_run', '2027-03-21', '2027-03-15')], undefined, lock);
    expect(sessions.find((s) => s.id === 'lang')!.status).toBe('skipped');
    expect(sessions.find((s) => s.id === 'lang2')).toMatchObject({ scheduledDate: '2027-03-21', status: 'planned' });
  });

  it('schuift de lange duurloop nog wel als die week er geen heeft', () => {
    const a = retry(base())!;
    expect(a).toBeDefined();
    const long = a.proposal!.changes.find((c) => c.plannedSessionId === 'lang')!;
    expect(long).toMatchObject({ action: 'move', fromDate: '2027-03-14' });
    expect(long.toDate! >= '2027-03-15').toBe(true);
    expect(a.effect).not.toContain('vervalt. Je houdt');
  });

  it('een lange duurloop die je zelf vastzette vervalt nooit: dan geen testpoging op die dag', () => {
    const own = [...base().map((s) => (s.id === 'lang' ? { ...s, lock: userLock } : s)), row('lang2', 'tpl_long_run', '2027-03-21', '2027-03-15')];
    const a = retry(own);
    const touched = [a?.proposal, ...(a?.options ?? []).map((o) => o.proposal)].flatMap((p) => p?.changes ?? []);
    expect(touched.find((c) => c.plannedSessionId === 'lang')).toBeUndefined();
    expect(touched.find((c) => c.plannedSessionId === 'heuvels')).toBeUndefined();
  });
});

describe('rust voor een test: 72 uur, of 48 met de instelling', () => {
  const MON = '2027-03-15';
  // De testloop op donderdag 18 maart; de zware dag zette je zelf neer (de melding gaat over wat van jou is).
  const mine = { status: 'moved' as const, lock: userLock, movedFromDate: '2027-03-21' };
  const week = (longDay: string, over: Partial<PlannedSession> = mine): PlannedSession[] => [
    row('lang', 'tpl_long_run', longDay, MON, over),
    row('test', 'tpl_test_run', '2027-03-18', MON),
    row('boven', 'tpl_upper_b', '2027-03-20', MON),
  ];
  const input = (sessions: PlannedSession[], over: Partial<CheckInput> = {}): CheckInput => ({ sessions, logs: [], templates, today: MON, restDay: 7, goalDay: '2027-09-01', ...over });
  const rest = (sessions: PlannedSession[], over: Partial<CheckInput> = {}) => weekConcerns(input(sessions, over), MON).filter((c) => c.rule === 'TEST-REST');

  it('het advies is 72 uur; alleen 48 telt als 48', () => {
    expect(resolveTestRest(undefined)).toBe(72);
    expect(resolveTestRest(48)).toBe(72 - 24);
    expect(resolveTestRest(24)).toBe(72);
    expect(resolveTestRest('48')).toBe(72);
    expect(testRestHours()).toBe(72);
  });

  it('een test 48 uur na een lange duurloop geeft een melding bij 72 uur', () => {
    const list = rest(week('2027-03-16'));
    expect(list).toHaveLength(1);
    const c = list[0];
    expect(c.headline).toBe('Je testloop staat 48 uur na een zware dag.');
    expect(c.fact).toBe('Lange duurloop op dinsdag 16 en je testloop op donderdag 18. Liefst 72 uur ertussen.');
    expect(c.notes).toEqual({ lang: '48 uur voor je testloop', test: '48 uur na Lange duurloop' });
    expect(c.finding.subjectId).toBe('lang');
    expect(`${c.headline}${c.fact}${c.why}${c.title}`).not.toMatch(/[\u2013\u2014]/);
  });

  it('en niet met de instelling op 48 uur', () => {
    expect(withTestRestHours(48, () => rest(week('2027-03-16')))).toEqual([]);
    // De instelling geldt alleen binnen de aanroep.
    expect(testRestHours()).toBe(72);
  });

  it('een test op 72 uur geeft niets', () => {
    expect(rest(week('2027-03-15'))).toEqual([]);
  });

  it('telt een zware beendag en heuvels die zwaar zijn voor de benen, via het profiel, en een gelogde dag', () => {
    const legs = [row('benen', 'tpl_lower_a', '2027-03-16', MON, mine), row('test', 'tpl_test_run', '2027-03-18', MON)];
    expect(rest(legs)).toHaveLength(1);
    const hills = [row('heuvels', 'tpl_hill_intervals', '2027-03-17', MON, mine), row('test', 'tpl_test_run', '2027-03-18', MON)];
    expect(rest(hills).map((c) => c.finding.rest?.hours)).toEqual([24]);
    // Een rustige loop en bovenlichaam tellen niet.
    const easy = [row('rustig', 'tpl_easy_run', '2027-03-16', MON, mine), row('boven', 'tpl_upper_a', '2027-03-17', MON, mine), row('test', 'tpl_test_run', '2027-03-18', MON)];
    expect(rest(easy)).toEqual([]);
    // Een lange duurloop die al gedaan is: dan schuift de test, de historie niet.
    const done = week('2027-03-16', {});
    const log = { id: 'log-lang', templateId: 'tpl_long_run', plannedSessionId: 'lang', type: 'cardio', completedDate: '2027-03-16', completedAt: '2027-03-16T08:00:00Z', variant: 'full', durationMinutes: 80, source: 'manual' } as SessionLog;
    const list = rest(done, { logs: [log], today: '2027-03-17' });
    expect(list).toHaveLength(1);
    expect(list[0].finding.subjectId).toBe('test');
    // Een gemiste lange duurloop in het verleden telde niet: niet gedaan, geen rust nodig.
    expect(rest(done, { today: '2027-03-17' })).toEqual([]);
  });

  it('wat alleen van het systeem is, meldt Week niet: dat houdt het wedstrijdblok zelf uit elkaar', () => {
    expect(rest(week('2027-03-16', {}))).toEqual([]);
    // Een test die jij vastzette, naast een zware dag van het systeem, wel.
    const ownTest = week('2027-03-16', {}).map((x) => (x.id === 'test' ? { ...x, lock: userLock } : x));
    const list = rest(ownTest);
    expect(list).toHaveLength(1);
    expect(list[0].why).toContain('Jij of een voorstel zette dit zo neer');
  });

  it('een wedstrijd valt er niet onder, die heeft zijn eigen taper', () => {
    const race = [row('lang', 'tpl_long_run', '2027-03-16', MON), row('race', 'tpl_race', '2027-03-18', MON)];
    expect(rest(race)).toEqual([]);
  });

  it('de planning zelf verzet niets: zonder reportYours geen bevinding en geen herstelling', () => {
    const own = week('2027-03-16', { status: 'moved', lock: userLock, movedFromDate: '2027-03-21' });
    expect(validateWeeks(input(own)).filter((f) => f.rule === 'TEST-REST')).toEqual([]);
    expect(repairWeeks(input(own)).repairs.filter((r) => r.sessionId === 'lang' || r.sessionId === 'test')).toEqual([]);
    expect(repairWeeks(input(week('2027-03-16'))).repairs.filter((r) => r.rule === 'TEST-REST')).toEqual([]);
  });

  it('Week geeft een voorstel met Akkoord: de zware dag of de test verschuift, niets vervalt', () => {
    const own = week('2027-03-16', { status: 'moved', lock: userLock, movedFromDate: '2027-03-21' });
    const notice = weekNotice(input(own), MON, true);
    const concern = notice.concerns.find((c) => c.rule === 'TEST-REST')!;
    expect(concern).toBeDefined();
    const fix = notice.fixes[concern.key]!;
    expect(fix).toBeDefined();
    expect(fix.ruleId).toBe('WEEK-CHECK');
    const changes = [fix.proposal!, ...(fix.options ?? []).map((o) => o.proposal)].flatMap((p) => p.changes);
    expect(changes.every((c) => c.action === 'move')).toBe(true);
    expect(changes.every((c) => c.plannedSessionId === 'lang' || c.plannedSessionId === 'test')).toBe(true);
    // Na Akkoord staat de test minstens 72 uur na de lange duurloop.
    const { sessions } = applyPlanChangeItems(fix.proposal!.changes, own, undefined, { by: 'proposal', at: 'x' });
    expect(weekConcerns(input(sessions), MON).filter((c) => c.rule === 'TEST-REST')).toEqual([]);
  });
});

describe('rust voor een test bij verplaatsen, ruilen en het zoeken van een testdag', () => {
  const MON = '2027-03-15';
  const day = (m: number): DailyTimeBudget => ({ preferredMinutes: m, softFlexMinutes: 15 });
  const roomy: Partial<Record<Weekday, DailyTimeBudget>> = { mon: day(300), tue: day(300), wed: day(300), thu: day(300), fri: day(300), sat: day(300), sun: day(300) };
  const ctx = (sessions: PlannedSession[]): DragContext => ({ sessions, templates, logs: [], program, dailyTimeBudget: roomy, sameDayPairingPreference: 'automatic', asOf: MON, move: {} });
  const sessions = () => [row('lang', 'tpl_long_run', '2027-03-15', MON), row('test', 'tpl_test_run', '2027-03-20', MON), row('rustig', 'tpl_easy_run', '2027-03-17', MON)];

  it('een test slepen naar 48 uur na de lange duurloop vraagt eerst, met de uren erbij', () => {
    const verdicts = dayVerdicts(ctx(sessions()), 'test', MON);
    const wed = verdicts.find((v) => v.date === '2027-03-17')!;
    expect(wed.kind).toBe('clash');
    expect(wed.line).toContain('Liefst 72 uur tussen een zware dag en je test.');
    // Op 72 uur past hij gewoon.
    expect(verdicts.find((v) => v.date === '2027-03-18')!.kind).not.toBe('clash');
    // Met de instelling op 48 uur is woensdag geen botsing meer om de rust.
    const at48 = withTestRestHours(48, () => dayVerdicts(ctx(sessions()), 'test', MON)).find((v) => v.date === '2027-03-17')!;
    expect(at48.line).not.toContain('uur tussen een zware dag en je test');
  });

  it('een zware dag slepen naar vlak voor een test vraagt ook eerst', () => {
    const list = [row('lang', 'tpl_long_run', '2027-03-21', MON), row('test', 'tpl_test_run', '2027-03-18', MON)];
    const tue = dayVerdicts(ctx(list), 'lang', MON).find((v) => v.date === '2027-03-16')!;
    expect(tue.kind).toBe('clash');
    expect(tue.line).toContain('Liefst 72 uur tussen een zware dag en je test.');
  });

  it('ruilen dat de test 48 uur na de lange duurloop zet, zegt het droog', () => {
    const list = [row('lang', 'tpl_long_run', '2027-03-15', MON), row('test', 'tpl_test_run', '2027-03-20', MON), row('rustig', 'tpl_easy_run', '2027-03-17', MON)];
    const check = checkSwap(ctx(list), 'test', 'rustig');
    expect(check.ok).toBe(true);
    if (check.ok) expect(check.asks.join(' ')).toContain('Liefst 72 uur tussen een zware dag en je test.');
  });

  it('de zoektocht naar een testdag houdt de rust aan', () => {
    const long = [row('lang', 'tpl_long_run', '2027-03-15', MON)];
    const test = byId.get('tpl_test_run')!;
    expect(respectsHeavySpacing('2027-03-17', test, long, byId)).toBe(false);
    expect(respectsHeavySpacing('2027-03-18', test, long, byId)).toBe(true);
    setTestRestHours(48);
    try {
      expect(testRestHours()).toBe(48);
    } finally {
      setTestRestHours(undefined);
    }
    expect(testRestHours()).toBe(72);
  });
});

describe('TEST-MAKE-ROOM zonder dag met 72 uur rust', () => {
  // Een gemiste testloop op do 11 maart; vandaag is za 13 maart. Elke dag binnen negen dagen ligt binnen 72 uur
  // na de lange duurloop of een zware beendag, of de dag erna is zwaar.
  const plan = (): PlannedSession[] => [
    row('benen', 'tpl_lower_a', '2027-03-10', '2027-03-08'),
    row('test', 'tpl_test_run', '2027-03-11', '2027-03-08'),
    row('lang', 'tpl_long_run', '2027-03-14', '2027-03-08'),
    row('herstel', 'tpl_herstel', '2027-03-15', '2027-03-15'),
    row('boven', 'tpl_upper_a', '2027-03-16', '2027-03-15'),
    row('benen2', 'tpl_lower_a', '2027-03-17', '2027-03-15'),
    row('rustig', 'tpl_easy_run', '2027-03-18', '2027-03-15'),
    row('lang2', 'tpl_long_run', '2027-03-21', '2027-03-15'),
    row('herstel2', 'tpl_herstel', '2027-03-22', '2027-03-22'),
    row('boven2', 'tpl_upper_a', '2027-03-23', '2027-03-22'),
  ];
  const room = () => computeAdvice({ logs: [], plannedSessions: plan(), templates, injuries: [], program: null, dailyTimeBudget: {}, sameDayPairingPreference: 'automatic', respondedIds: new Set(), asOf: '2027-03-13' }).find((a) => a.ruleId === 'TEST-MAKE-ROOM');

  it('zegt het droog en stelt de beste dag op 48 uur voor, met de uren erbij', () => {
    const a = room()!;
    expect(a.effect.startsWith('Binnen 9 dagen is er geen dag met 72 uur rust na een zware dag. Op 48 uur kan het wel: doe hem di 16 maart')).toBe(true);
    expect(a.effect).toContain('Dan staat de test 48 uur na Lange duurloop, niet de 72 uur van het advies.');
    expect(a.proposal!.changes.find((c) => c.plannedSessionId === 'test')).toMatchObject({ action: 'move', toDate: '2027-03-16' });
    expect(a.proposal!.consequences.startsWith('Binnen 9 dagen is er geen dag met 72 uur rust na een zware dag.')).toBe(true);
    expect(a.effect).not.toMatch(/[\u2013\u2014]/);
  });

  it('met de instelling op 48 uur is dat gewoon het voorstel, zonder die zin', () => {
    const a = withTestRestHours(48, room)!;
    expect(a.proposal!.changes.find((c) => c.plannedSessionId === 'test')).toMatchObject({ toDate: '2027-03-16' });
    expect(a.effect).not.toContain('72 uur');
  });
});

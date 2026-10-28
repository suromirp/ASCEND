import { describe, it, expect } from 'vitest';
import { computeAdvice, type AdviceInputs } from './adviceEngine';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { applyPlanChangeItems } from './proposalEngine';
import { planPass } from './planPass';
import type { LeavePeriod } from '../models/leave';
import type { PlannedSession, SessionLog } from '../models/training';

const { templates } = buildDefaultProgramData();

// Made-up test: 5 km on Tuesday 27 October 2026, read with standing still.
const testLog = (over: Partial<NonNullable<SessionLog['bestEffort']>> = {}, date = '2026-10-27'): SessionLog => ({
  id: 'log-test', templateId: 'tpl_test_run', type: 'cardio', completedDate: date, completedAt: `${date}T10:00:00Z`, variant: 'full', durationMinutes: 36, rpe: 9, source: 'manual',
  cardioData: { durationMinutes: 36, distanceKm: 6, source: 'manual' },
  bestEffort: { km: 5, minutes: 27.67, wholeKm: 6, wholeMinutes: 36, accepted: true, v: 2, stops: 5, stoppedSec: 136, ...over },
} as SessionLog);

const planned = (id: string, templateId: string, scheduledDate: string, weekStartDate: string): PlannedSession => ({ id, templateId, scheduledDate, weekStartDate, status: 'planned', order: 0 });
// Wednesday the 28th is today. Saturday the 31st has the hill intervals.
const plan = (): PlannedSession[] => [
  planned('hills', 'tpl_hill_intervals', '2026-10-31', '2026-10-26'),
  planned('upper', 'tpl_upper_b', '2026-10-30', '2026-10-26'),
  planned('tempo', 'tpl_tempo_run', '2026-11-04', '2026-11-02'),
];
const inputs = (over: Partial<AdviceInputs> = {}): AdviceInputs => ({
  logs: [testLog()], plannedSessions: plan(), templates, injuries: [], program: null, dailyTimeBudget: {}, sameDayPairingPreference: 'automatic', respondedIds: new Set(), asOf: '2026-10-28', ...over,
});
const retry = (over: Partial<AdviceInputs> = {}) => computeAdvice(inputs(over)).find((a) => a.ruleId === 'TEST-RETRY');

describe('TEST-RETRY: a new attempt after a test with a lot of standing still', () => {
  it('turns the first hard run at least 3 days later into a 5 km test, with a dry sentence first', () => {
    const a = retry()!;
    expect(a.id).toBe('retest:2026-10-27');
    expect(a.title).toBe('Nieuwe testpoging op za 31 oktober');
    expect(a.effect).toContain('Je testloop van di 27 oktober had 2:16 stilstand, dus hij is iets te gunstig.');
    expect(a.effect).toContain('Met Akkoord wordt Heuvelintervallen op za 31 oktober een testloop van 5 km.');
    expect(a.effect).toContain('Kies een route zonder stoplichten en zet auto-pauze uit.');
    expect(a.effect).toContain('Liever niet');
    expect(a.lead).toBe('Je testloop van di 27 oktober had 2:16 stilstand, dus hij is iets te gunstig.');
    expect(a.tip).toBe('Kies een route zonder stoplichten en zet auto-pauze uit.');
    expect(a.brief).toBe('Di 27 okt: 2:16 stilgestaan');
    expect(`${a.title}${a.effect}${a.why}`).not.toMatch(/[\u2013\u2014]/);
    expect(a.proposal!.changes).toHaveLength(1);
    expect(a.proposal!.changes[0]).toMatchObject({ plannedSessionId: 'hills', action: 'move', fromDate: '2026-10-31', toDate: '2026-10-31', templateId: 'tpl_test_run' });
  });

  it('applies as a replacement on the same row and day, locked by the Akkoord', () => {
    const a = retry()!;
    const lock = { by: 'proposal' as const, at: 'x' };
    const { sessions } = applyPlanChangeItems(a.proposal!.changes, plan(), undefined, lock);
    expect(sessions.find((s) => s.id === 'hills')).toMatchObject({ templateId: 'tpl_test_run', scheduledDate: '2026-10-31' });
    expect(sessions).toHaveLength(plan().length);
  });

  it('says how many stops when the standing still is short but frequent', () => {
    const a = retry({ logs: [testLog({ stops: 4, stoppedSec: 40 })] })!;
    expect(a.effect).toContain('had 4 keer stilstand');
  });

  it('stays quiet without much standing still', () => {
    expect(retry({ logs: [testLog({ stops: 3, stoppedSec: 60 })] })).toBeUndefined();
    expect(retry({ logs: [testLog({ stops: undefined, stoppedSec: undefined })] })).toBeUndefined();
  });

  it('speaks for a doubtful test that waits for an answer', () => {
    const earlier = { ...testLog({ stops: undefined, stoppedSec: undefined }), id: 'log-old', completedDate: '2026-10-06', completedAt: '2026-10-06T10:00:00Z', cardioData: { durationMinutes: 27, distanceKm: 5, source: 'manual' as const }, bestEffort: undefined, durationMinutes: 27 } as SessionLog;
    const slow = { ...testLog(), bestEffort: undefined, durationMinutes: 33, cardioData: { durationMinutes: 33, distanceKm: 5, source: 'manual' as const } } as SessionLog;
    const a = retry({ logs: [earlier, slow] })!;
    expect(a.effect).toContain('wacht nog op je antwoord');
    expect(a.id).toBe('retest:2026-10-27');
    // After "Telt mee" nothing waits and it has no stops, so no advice.
    expect(retry({ logs: [earlier, slow], testJudgments: [{ logId: 'log-test', verdict: 'counts', date: '2026-10-28' }] })).toBeUndefined();
  });

  it('stays quiet when the last test is older than 21 days', () => {
    expect(retry({ asOf: '2026-11-18' })).toBeUndefined();
  });

  it('stays quiet when another test is already planned in the next 14 days', () => {
    expect(retry({ plannedSessions: [...plan(), planned('again', 'tpl_test_run', '2026-11-08', '2026-11-02')] })).toBeUndefined();
  });

  it('has no advice without a suitable day within 10 days or less than 3 days after the test', () => {
    expect(retry({ plannedSessions: plan().filter((s) => s.id !== 'hills' && s.id !== 'tempo') })).toBeUndefined();
    expect(retry({ plannedSessions: [planned('far', 'tpl_tempo_run', '2026-11-09', '2026-11-09')] })).toBeUndefined();
    expect(retry({ plannedSessions: [planned('close', 'tpl_tempo_run', '2026-10-29', '2026-10-26')] })).toBeUndefined();
  });

  it('skips a day when a long run follows the next day (the day after a test stays easy) and takes the next hard run', () => {
    const a = retry({ plannedSessions: [...plan(), planned('long', 'tpl_long_run', '2026-11-01', '2026-10-26')] })!;
    expect(a.proposal!.changes[0].plannedSessionId).toBe('tempo');
  });

  it('skips a day right after a heavy leg day and takes the next hard run', () => {
    const legs = planned('legs', 'tpl_lower_a', '2026-10-30', '2026-10-26');
    const a = retry({ plannedSessions: [...plan().filter((s) => s.id !== 'upper'), legs] })!;
    expect(a.proposal!.changes[0].plannedSessionId).toBe('tempo');
    expect(a.title).toContain('wo 4 november');
  });

  it('is not asked again after Liever niet for the same test, but a newer test may ask', () => {
    expect(retry({ respondedIds: new Set(['retest:2026-10-27']) })).toBeUndefined();
  });

  it('stays quiet when the setting is off, when ill, or in the taper of a race', () => {
    expect(retry({ newTestOnStops: false })).toBeUndefined();
    expect(retry({ illnessEpisodes: [{ id: 'i', kind: 'above_neck', startDate: '2026-10-27' }] })).toBeUndefined();
    expect(retry({ plannedSessions: [...plan(), planned('race', 'tpl_race', '2026-11-07', '2026-11-02')] })).toBeUndefined();
  });

  it('does not touch a session that is logged or skipped', () => {
    const skipped = plan().map((s) => (s.id === 'hills' ? { ...s, status: 'skipped' as const } : s));
    expect(retry({ plannedSessions: skipped })!.proposal!.changes[0].plannedSessionId).toBe('tempo');
  });
});

describe('TEST-RETRY: ruimte maken in een gewone week', () => {
  const lockUser = { by: 'user' as const, at: '2026-10-20T08:00:00Z' };
  // Nagemaakte standaardweek: harde loop op za, lange duurloop op zo, zware beendag op do (door jou vastgezet).
  const normalWeek = (legsLock?: typeof lockUser): PlannedSession[] => [
    planned('upA', 'tpl_upper_a', '2026-10-28', '2026-10-26'),
    { ...planned('legs', 'tpl_lower_a', '2026-10-29', '2026-10-26'), lock: legsLock },
    planned('upB', 'tpl_upper_b', '2026-10-30', '2026-10-26'),
    planned('hills', 'tpl_hill_intervals', '2026-10-31', '2026-10-26'),
    planned('long', 'tpl_long_run', '2026-11-01', '2026-10-26'),
    planned('walk', 'tpl_herstel', '2026-11-02', '2026-11-02'),
    planned('upA2', 'tpl_upper_a', '2026-11-03', '2026-11-02'),
    planned('legs2', 'tpl_lower_a', '2026-11-04', '2026-11-02'),
    planned('easy', 'tpl_easy_run', '2026-11-05', '2026-11-02'),
    planned('upB2', 'tpl_upper_b', '2026-11-06', '2026-11-02'),
    planned('sprints', 'tpl_hills_descent', '2026-11-07', '2026-11-02'),
    planned('long2', 'tpl_long_run', '2026-11-08', '2026-11-02'),
  ];
  const week = (legsLock?: typeof lockUser, drop: string[] = []) => normalWeek(legsLock).filter((s) => !drop.includes(s.id));

  it('geeft in een gewone week een voorstel voor za: de lange duurloop schuift en Benen A van do wordt genoemd', () => {
    const a = retry({ plannedSessions: week(lockUser) })!;
    expect(a).toBeDefined();
    expect(a.title).toBe('Nieuwe testpoging op za 31 oktober');
    const ids = a.proposal!.changes.map((c) => c.plannedSessionId);
    expect(ids).toContain('hills');
    expect(a.proposal!.changes.find((c) => c.plannedSessionId === 'hills')).toMatchObject({ templateId: 'tpl_test_run' });
    const long = a.proposal!.changes.find((c) => c.plannedSessionId === 'long')!;
    expect(long).toMatchObject({ action: 'move', fromDate: '2026-11-01' });
    expect(long.toDate).toBe('2026-11-02');
    expect(long.plannedMinutes).toBeGreaterThan(0);
    expect(a.effect).toContain('Lange duurloop van zo 1 november doe je op ma 2 november in plaats van je rustdag, korter (45 minuten). De herstelwandeling van die dag vervalt.');
    expect(a.proposal!.changes.find((c) => c.plannedSessionId === 'walk')).toMatchObject({ action: 'remove' });
    expect(a.effect).toContain('Benen A (zwaar) van do 29 oktober, die je zelf vastzette, laat je deze week gaan, zodat je benen zaterdag fris zijn.');
    expect(a.effect).toContain('Kies een route zonder stoplichten en zet auto-pauze uit.');
    expect(`${a.title}${a.effect}${a.why}`).not.toMatch(/[\u2013\u2014]/);
    // De zelf vastgezette beendag vervalt alleen met Akkoord en staat er met naam in.
    expect(a.proposal!.changes.find((c) => c.plannedSessionId === 'legs')).toMatchObject({ action: 'remove' });
  });

  it('past toe: de lange duurloop staat op de nieuwe dag, Benen A van do vervalt', () => {
    const a = retry({ plannedSessions: week(lockUser) })!;
    const { sessions } = applyPlanChangeItems(a.proposal!.changes, week(lockUser), undefined, { by: 'proposal' as const, at: 'x' });
    expect(sessions.find((s) => s.id === 'legs')!.status).toBe('skipped');
    expect(sessions.find((s) => s.id === 'hills')).toMatchObject({ templateId: 'tpl_test_run', scheduledDate: '2026-10-31' });
    expect(sessions.find((s) => s.id === 'long')!.scheduledDate).not.toBe('2026-11-01');
  });

  it('verschuift een beendag die niet vastgezet is alleen naar een dag die geen nieuw advies geeft', () => {
    const a = retry({ plannedSessions: week(undefined, ['upA2', 'legs2']) })!;
    const legs = a.proposal!.changes.find((c) => c.plannedSessionId === 'legs')!;
    const long = a.proposal!.changes.find((c) => c.plannedSessionId === 'long');
    // De lange duurloop gaat naar ma 2 november. Benen A mag er een dag na staan: een rustige lange loop en
    // beenkracht mogen op twee dagen achter elkaar, in de planning en in het advies (scheduler.ts#legSpacingDays).
    expect(long).toMatchObject({ action: 'move', toDate: '2026-11-02' });
    expect(['move', 'remove']).toContain(legs.action);
  });

  it('verschuift een beendag naar na de test als daar een dag voor is, in hetzelfde voorstel', () => {
    const a = retry({ plannedSessions: week(undefined, ['upA2', 'legs2', 'walk', 'long']) })!;
    const legs = a.proposal!.changes.find((c) => c.plannedSessionId === 'legs')!;
    expect(legs).toMatchObject({ action: 'move', fromDate: '2026-10-29' });
    expect(legs.toDate! >= '2026-10-31').toBe(true);
    expect(a.effect).toContain('na de test');
  });

  it('blijft bij één item als het zonder extra veranderingen past', () => {
    const a = retry({ plannedSessions: week(undefined, ['legs', 'long']) })!;
    expect(a.proposal!.changes).toHaveLength(1);
  });

  it('beweegt een gelogde sessie nooit', () => {
    const doneLegs: SessionLog = { ...testLog(), id: 'log-legs', templateId: 'tpl_lower_a', plannedSessionId: 'legs', type: 'strength', completedDate: '2026-10-29', completedAt: '2026-10-29T10:00:00Z', bestEffort: undefined } as SessionLog;
    const a = retry({ plannedSessions: week(undefined), logs: [testLog(), doneLegs] });
    const ids = a?.proposal!.changes.map((c) => c.plannedSessionId) ?? [];
    expect(ids).not.toContain('legs');
  });

  it('zet een eigen vastgezette lange duurloop nooit stil op een andere dag', () => {
    const locked = week(undefined, ['legs']).map((s) => (s.id === 'long' ? { ...s, lock: lockUser } : s));
    const a = retry({ plannedSessions: locked });
    expect(a?.proposal!.changes.map((c) => c.plannedSessionId) ?? []).not.toContain('long');
    expect(a?.proposal!.changes.find((c) => c.plannedSessionId === 'hills')).toBeUndefined();
  });
});

describe('TEST-RETRY: herstel na de review', () => {
  const lockUser = { by: 'user' as const, at: '2026-10-20T08:00:00Z' };
  const lockProposal = { by: 'proposal' as const, at: '2026-10-28T08:00:00Z' };
  const standard = (): PlannedSession[] => [
    planned('upA', 'tpl_upper_a', '2026-10-28', '2026-10-26'),
    { ...planned('legs', 'tpl_lower_a', '2026-10-29', '2026-10-26'), lock: lockUser },
    planned('upB', 'tpl_upper_b', '2026-10-30', '2026-10-26'),
    planned('hills', 'tpl_hill_intervals', '2026-10-31', '2026-10-26'),
    planned('long', 'tpl_long_run', '2026-11-01', '2026-10-26'),
    planned('walk', 'tpl_herstel', '2026-11-02', '2026-11-02'),
    planned('upA2', 'tpl_upper_a', '2026-11-03', '2026-11-02'),
  ];
  const ask = (over: Partial<AdviceInputs> = {}) => computeAdvice(inputs({ plannedSessions: standard(), ...over }));
  const retryOf = (over: Partial<AdviceInputs> = {}) => ask(over).find((a) => a.ruleId === 'TEST-RETRY');
  const period = (kind: LeavePeriod['kind'], startDate: string, endDate: string): LeavePeriod => ({ id: `p-${kind}`, kind, startDate, endDate });
  const touchesTest = (a: ReturnType<typeof retryOf>) => a?.proposal?.changes.find((c) => c.plannedSessionId === 'hills');

  it('simulatie: na Akkoord geen tegenspraak van TEST-MAKE-ROOM en geen stille extra verschuiving', () => {
    const a = retryOf()!;
    expect(a).toBeDefined();
    const applied = applyPlanChangeItems(a.proposal!.changes, standard(), undefined, lockProposal).sessions;
    const pass = planPass(applied, { today: '2026-10-28', logs: [testLog()], templates, program: null, blocks: [], restDay: 1, newId: () => 'new' });
    const strip = (list: PlannedSession[]) => list.map((x) => ({ id: x.id, t: x.templateId, d: x.scheduledDate, st: x.status })).sort((x, y) => x.id.localeCompare(y.id));
    expect(strip(pass.sessions)).toEqual(strip(applied));
    expect(pass.repairs).toEqual([]);
    const after = computeAdvice(inputs({ plannedSessions: pass.sessions }));
    expect(after.filter((x) => x.ruleId === 'TEST-MAKE-ROOM' || x.ruleId === 'TEST-INFLUENCE')).toEqual([]);
    expect(after.filter((x) => x.ruleId === 'TEST-RETRY')).toEqual([]);
  });

  it('noemt in de standaardweek de beendag die met Akkoord vervalt', () => {
    const a = retryOf()!;
    expect(a.effect).toContain('Benen A (zwaar) van do 29 oktober, die je zelf vastzette, laat je deze week gaan, zodat je benen zaterdag fris zijn.');
    expect(a.effect).toContain('De herstelwandeling van die dag vervalt.');
  });

  it('is geen kandidaat als zelfs zonder de beendag de benen niet fris worden', () => {
    const heavyLog = (date: string, id: string): SessionLog => ({ ...testLog(), id, templateId: 'tpl_lower_a', type: 'strength', completedDate: date, completedAt: `${date}T10:00:00Z`, durationMinutes: 60, bestEffort: undefined } as SessionLog);
    const a = retryOf({ logs: [testLog(), heavyLog('2026-10-28', 'g1'), heavyLog('2026-10-27', 'g2'), heavyLog('2026-10-26', 'g3')] });
    expect(touchesTest(a)).toBeUndefined();
  });

  it('slaat vrije dagen, tochten en lichte dagen over, voor de testdag en voor een verschuiving', () => {
    const noTrain = retryOf({ leave: [period('no_training', '2026-11-02', '2026-11-02')] });
    expect(noTrain?.proposal?.changes.some((c) => c.action === 'move' && c.toDate === '2026-11-02' && c.plannedSessionId !== 'hills')).toBeFalsy();
    expect(touchesTest(retryOf({ leave: [period('no_training', '2026-10-31', '2026-10-31')] }))).toBeUndefined();
    const trek = retryOf({ leave: [period('trek', '2026-11-03', '2026-11-04')] });
    expect(trek?.proposal?.changes.some((c) => c.plannedSessionId === 'long' && ['2026-11-02', '2026-11-03', '2026-11-04'].includes(c.toDate ?? ''))).toBeFalsy();
    // Zaterdag is de lichte dag voor een tocht die zondag begint.
    expect(touchesTest(retryOf({ leave: [period('trek', '2026-11-01', '2026-11-02')] }))).toBeUndefined();
  });

  it('neemt een harde loop die jij vastzette of verplaatste niet als testdag', () => {
    expect(touchesTest(retryOf({ plannedSessions: standard().map((x) => (x.id === 'hills' ? { ...x, lock: lockUser } : x)) }))).toBeUndefined();
    expect(touchesTest(retryOf({ plannedSessions: standard().map((x) => (x.id === 'hills' ? { ...x, status: 'moved' as const } : x)) }))).toBeUndefined();
  });

  it('zwijgt als TEST-MAKE-ROOM al over een test spreekt', () => {
    const list = ask({ plannedSessions: [...standard(), planned('missed', 'tpl_test_run', '2026-10-24', '2026-10-19')] });
    expect(list.some((x) => x.ruleId === 'TEST-MAKE-ROOM')).toBe(true);
    expect(list.some((x) => x.ruleId === 'TEST-RETRY')).toBe(false);
  });

  it('raakt een beendag van vandaag niet aan waar de kaart Benen voor spreekt', () => {
    const today = [...standard().filter((x) => x.id !== 'upA' && x.id !== 'legs'), planned('todayLegs', 'tpl_lower_a', '2026-10-28', '2026-10-26')];
    const checkIns = [{ date: '2026-10-28', legs: 'spierpijn' as const, energy: 'gewoon' as const, sleep: 'goed' as const }];
    // De dag na een harde test heeft een eigen voorstel (HARD-THEN-SPACE); dat telt hier niet mee.
    const own = new Set(['hard:log-test']);
    expect(retryOf({ plannedSessions: today, respondedIds: own })?.proposal?.changes.some((c) => c.plannedSessionId === 'todayLegs')).toBe(true);
    expect(retryOf({ plannedSessions: today, checkIns, legEase: 'voorstel' })?.proposal?.changes.some((c) => c.plannedSessionId === 'todayLegs')).toBeFalsy();
  });

  it('toetst het dagbudget voor de testloop op de testdag', () => {
    const budget = { saturday: { preferredMinutes: 30, softFlexMinutes: 0, hardMaximumMinutes: 30 } } as AdviceInputs['dailyTimeBudget'];
    const crowded = [...standard(), planned('extraUpper', 'tpl_upper_b', '2026-10-31', '2026-10-26')];
    expect(touchesTest(retryOf({ plannedSessions: crowded, dailyTimeBudget: budget }))).toBeUndefined();
  });

  it('rekent het dagbudget van de verschoven lange duurloop met zijn korte lengte', () => {
    const full = templates.find((t) => t.id === 'tpl_long_run')!.durationVariants.full;
    const generous = { monday: { preferredMinutes: 60, softFlexMinutes: 0, hardMaximumMinutes: 60 } } as AdviceInputs['dailyTimeBudget'];
    expect(full).toBeGreaterThan(60);
    const a = retryOf({ plannedSessions: standard().filter((x) => x.id !== 'walk'), dailyTimeBudget: generous });
    expect(a?.proposal?.changes.find((c) => c.plannedSessionId === 'long')).toMatchObject({ toDate: '2026-11-02' });
  });

  it('herkent een test of wedstrijd aan de rol, niet aan vaste id\'s', () => {
    const renamed = templates.map((t) => (t.id === 'tpl_race' ? { ...t, id: 'tpl_eigen_wedstrijd' } : t));
    const withRace = [...standard(), planned('race', 'tpl_eigen_wedstrijd', '2026-11-07', '2026-11-02')];
    expect(retryOf({ plannedSessions: withRace, templates: renamed })).toBeUndefined();
  });
});

describe('TEST-RETRY next to the morning check', () => {
  it('does not turn a hard run into a test when the morning check already moves it', () => {
    // Test on the 25th, the hill intervals tomorrow (the 29th), soreness this morning: MORNING-CHECK moves them.
    const hillsTomorrow = [planned('hills', 'tpl_hill_intervals', '2026-10-29', '2026-10-26'), planned('upper', 'tpl_upper_b', '2026-10-30', '2026-10-26')];
    const sore = [{ date: '2026-10-28', legs: 'spierpijn' as const, energy: 'gewoon' as const, sleep: 'goed' as const }];
    const all = computeAdvice(inputs({ logs: [testLog({}, '2026-10-25')], plannedSessions: hillsTomorrow, checkIns: sore }));
    const touches = (rule: string) => all.filter((a) => a.ruleId === rule).flatMap((a) => [a.proposal, ...(a.options ?? []).map((o) => o.proposal)]).flatMap((p) => p?.changes ?? []).map((c) => c.plannedSessionId);
    expect(touches('MORNING-CHECK')).toContain('hills');
    expect(touches('TEST-RETRY')).not.toContain('hills');
  });
});

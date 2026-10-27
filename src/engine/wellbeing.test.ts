import { describe, it, expect } from 'vitest';
import { morningSignals, recentPainSpot, shouldAskCheckIn, tiredStreak } from './wellbeing';
import { hasSignificantPain, isStopPain, painReports } from './pain';
import { computeAdvice, describeMorningPreview, legEaseMoveAdvice, previewLegCard, previewMorningAdvice, type AdviceInputs } from './adviceEngine';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession, SessionLog } from '../models/training';
import { legEaseCardSession, morningRestDay } from './legDayEase';

const { templates } = buildDefaultProgramData();
const log = (date: string, extra: Partial<SessionLog> = {}): SessionLog => ({ id: `l-${date}`, templateId: 'tpl_easy_run', type: 'cardio', completedDate: date, completedAt: `${date}T10:00:00Z`, variant: 'full', durationMinutes: 40, source: 'manual', ...extra });
const ps = (id: string, templateId: string, date: string): PlannedSession => ({ id, templateId, scheduledDate: date, weekStartDate: '2026-11-02', status: 'planned', order: 0 });

describe('pain on a spot', () => {
  it('1 or 2 holds nothing back, 3 or more does; older logs without a score count as 4', () => {
    expect(hasSignificantPain(log('2026-11-01', { painReports: [{ area: 'Knie', score: 2 }] }))).toBe(false);
    expect(hasSignificantPain(log('2026-11-01', { painReports: [{ area: 'Knie', score: 3 }] }))).toBe(true);
    expect(painReports(log('2026-11-01', { painAreas: ['Kuit'] }))).toEqual([{ area: 'Kuit', score: 4 }]);
    // Worse while going on, or on a bone: never acceptable pain.
    expect(hasSignificantPain(log('2026-11-01', { painReports: [{ area: 'Scheen', score: 2, onBone: true }] }))).toBe(true);
    expect(isStopPain({ area: 'Knie', score: 6 })).toBe(true);
    expect(isStopPain({ area: 'Knie', score: 4 })).toBe(false);
  });
});

describe('the morning check-in', () => {
  it('is asked on a training day and the day after heavy legs or pain, once a day', () => {
    expect(shouldAskCheckIn('2026-11-03', [], [], [ps('a', 'tpl_easy_run', '2026-11-03')], templates)).toBe(true);
    expect(shouldAskCheckIn('2026-11-03', [], [], [], templates)).toBe(false);
    expect(shouldAskCheckIn('2026-11-03', [], [log('2026-11-02', { templateId: 'tpl_lower_a', type: 'strength' })], [], templates)).toBe(true);
    expect(shouldAskCheckIn('2026-11-03', [{ date: '2026-11-03', allNormal: true }], [], [ps('a', 'tpl_easy_run', '2026-11-03')], templates)).toBe(false);
  });

  it('reads soreness, fatigue and a worse pain spot apart', () => {
    expect(morningSignals({ date: 'd', legs: 'spierpijn', energy: 'gewoon', sleep: 'goed' }, [])).toMatchObject({ sore: 'spierpijn', negatives: 0, rest: false });
    expect(morningSignals({ date: 'd', legs: 'fris', energy: 'moe', sleep: 'slecht' }, []).rest).toBe(true);
    expect(morningSignals({ date: 'd', legs: 'fris', energy: 'op', sleep: 'goed' }, []).rest).toBe(true);
    const logs = [log('2026-11-02', { painReports: [{ area: 'Knie', score: 3 }] })];
    expect(recentPainSpot('2026-11-03', logs)).toMatchObject({ area: 'Knie', lastScore: 3 });
    expect(morningSignals({ date: '2026-11-03', legs: 'fris', energy: 'fit', sleep: 'goed', spot: { area: 'Knie', score: 5 } }, logs).spotWorse).toMatchObject({ score: 5, lastScore: 3 });
    expect(morningSignals({ date: '2026-11-03', legs: 'fris', energy: 'fit', sleep: 'goed', spot: { area: 'Knie', score: 3 } }, logs).spotWorse).toBeUndefined();
  });

  it('counts tired mornings in a row', () => {
    const c = (date: string, energy: 'moe' | 'fit') => ({ date, legs: 'fris' as const, energy, sleep: 'goed' as const });
    expect(tiredStreak('2026-11-05', [c('2026-11-03', 'moe'), c('2026-11-04', 'moe'), c('2026-11-05', 'moe')])).toBe(3);
    expect(tiredStreak('2026-11-05', [c('2026-11-03', 'moe'), c('2026-11-04', 'fit'), c('2026-11-05', 'moe')])).toBe(1);
  });
});

describe('MORNING-CHECK: how the planning reacts', () => {
  const planned = [ps('legs', 'tpl_lower_a', '2026-11-04'), ps('easy', 'tpl_easy_run', '2026-11-05'), ps('upper', 'tpl_upper_b', '2026-11-06')];
  const inputs = (over: Partial<AdviceInputs>): AdviceInputs => ({ logs: [], plannedSessions: planned, templates, injuries: [], program: null, dailyTimeBudget: {}, sameDayPairingPreference: 'automatic', respondedIds: new Set(), asOf: '2026-11-03', ...over });
  const morning = (over: Partial<AdviceInputs>) => computeAdvice(inputs(over)).filter((a) => a.ruleId === 'MORNING-CHECK');

  it('soreness moves the heavy legs of tomorrow on, as a proposal', () => {
    const [a] = morning({ checkIns: [{ date: '2026-11-03', legs: 'spierpijn', energy: 'gewoon', sleep: 'goed' }] });
    expect(a.title).toContain('Benen A');
    expect(a.proposal!.changes[0]).toMatchObject({ plannedSessionId: 'legs', action: 'move' });
  });

  it('more than one good day: options to choose from, the nearest first', () => {
    const roomy = [ps('legs', 'tpl_lower_a', '2026-11-04'), ps('upper', 'tpl_upper_b', '2026-11-06')];
    const [a] = morning({ plannedSessions: roomy, checkIns: [{ date: '2026-11-03', legs: 'spierpijn', energy: 'gewoon', sleep: 'goed' }] });
    expect(a.options!.length).toBeGreaterThan(1);
    expect(a.options![0].proposal).toBe(a.proposal);
    const dates = a.options!.map((o) => o.proposal.changes[0].toDate!);
    expect([...dates].sort()).toEqual(dates);
    expect(a.options!.every((o) => o.label.startsWith('Benen A'))).toBe(true);
  });

  it('all normal, or one tired signal without a hard session today: nothing', () => {
    expect(morning({ checkIns: [{ date: '2026-11-03', allNormal: true }] })).toEqual([]);
    expect(morning({ checkIns: [{ date: '2026-11-03', legs: 'fris', energy: 'moe', sleep: 'goed' }] })).toEqual([]);
  });

  it('a calm day with an easy run on the card says why the run stays', () => {
    const today = [ps('easy', 'tpl_easy_run', '2026-11-03')];
    const [a] = morning({ plannedSessions: today, checkIns: [{ date: '2026-11-03', legs: 'flink', energy: 'op', sleep: 'slecht' }] });
    expect(a.title).toBe('Een rustige dag');
    expect(a.effect).toContain('blijft op je kaart staan');
    expect(a.effect).not.toMatch(/^Er staat vandaag niets zwaars\. Houd het zo/);
    // Without a session today the plain advice stays.
    const [b] = morning({ plannedSessions: [], checkIns: [{ date: '2026-11-03', legs: 'flink', energy: 'op', sleep: 'slecht' }] });
    expect(b.effect).toContain('een wandeling of rustig fietsen is genoeg');
  });

  it('a pain spot worse this morning: two to three days without running on it', () => {
    const logs = [log('2026-11-02', { painReports: [{ area: 'Achillespees', score: 2 }] })];
    const [a] = morning({ logs, checkIns: [{ date: '2026-11-03', legs: 'fris', energy: 'fit', sleep: 'goed', spot: { area: 'Achillespees', score: 4 } }] });
    expect(a.title).toContain('Achillespees vanochtend 4');
    expect(a.effect).toContain('2 tot 3 dagen');
  });
});

describe('wat je antwoord doet, voor je opslaat', () => {
  const planned = [ps('legs', 'tpl_lower_a', '2026-11-04'), ps('easy', 'tpl_easy_run', '2026-11-05'), ps('upper', 'tpl_upper_b', '2026-11-06')];
  const inputs = (over: Partial<AdviceInputs>): AdviceInputs => ({ logs: [], plannedSessions: planned, templates, injuries: [], program: null, dailyTimeBudget: {}, sameDayPairingPreference: 'automatic', respondedIds: new Set(), asOf: '2026-11-03', ...over });
  const same = (over: Partial<AdviceInputs>) => {
    const preview = previewMorningAdvice(inputs(over));
    expect(preview.map((a) => a.id)).toEqual(computeAdvice(inputs(over)).filter((a) => a.ruleId === 'MORNING-CHECK').map((a) => a.id));
    return describeMorningPreview(preview);
  };
  const tired = (date: string) => ({ date, legs: 'fris' as const, energy: 'moe' as const, sleep: 'goed' as const });

  it('is precies het advies dat Vandaag daarna toont', () => {
    expect(same({ checkIns: [{ date: '2026-11-03', legs: 'fris', energy: 'gewoon', sleep: 'goed' }] })).toBe('Je planning blijft zoals hij is.');
    expect(same({ checkIns: [{ date: '2026-11-03', legs: 'spierpijn', energy: 'gewoon', sleep: 'goed' }] })).toContain('Benen A');
    // Niets zwaars vandaag of morgen: spierpijn verschuift dan niets.
    expect(same({ plannedSessions: [ps('upper', 'tpl_upper_b', '2026-11-06')], checkIns: [{ date: '2026-11-03', legs: 'spierpijn', energy: 'gewoon', sleep: 'goed' }] })).toBe('Je planning blijft zoals hij is.');
    // Eén signaal zonder zware training vandaag: niets.
    expect(same({ checkIns: [tired('2026-11-03')] })).toBe('Je planning blijft zoals hij is.');
    // De derde moeie ochtend wel.
    expect(same({ checkIns: [tired('2026-11-01'), tired('2026-11-02'), tired('2026-11-03')] })).toContain('Drie ochtenden op rij moe');
  });
  it('neemt een pijnplek mee die erger is dan na de training', () => {
    const logs = [log('2026-11-02', { painReports: [{ area: 'Knie', score: 3 }] })];
    expect(same({ logs, checkIns: [{ date: '2026-11-03', legs: 'fris', energy: 'gewoon', sleep: 'goed', spot: { area: 'Knie', score: 6 } }] })).toContain('Knie vanochtend 6 van 10');
  });
});

describe('LEG-EASE: een dag later voor een zware beendag van vandaag', () => {
  const today = [ps('legs', 'tpl_lower_a', '2026-11-03'), ps('upper', 'tpl_upper_b', '2026-11-04'), ps('easy', 'tpl_easy_run', '2026-11-05')];
  const inputs = (over: Partial<AdviceInputs> = {}): AdviceInputs => ({ logs: [], plannedSessions: today, templates, injuries: [], program: null, dailyTimeBudget: {}, sameDayPairingPreference: 'automatic', respondedIds: new Set(), asOf: '2026-11-03', ...over });
  const sore = [{ date: '2026-11-03', legs: 'spierpijn' as const, energy: 'gewoon' as const, sleep: 'goed' as const }];

  it('geeft een voorstel met Akkoord naar de eerste goede dag, met een keuze als er meer zijn', () => {
    const a = legEaseMoveAdvice(inputs(), 'legs', 'Spierpijn', 1)!;
    expect(a.ruleId).toBe('LEG-EASE');
    expect(a.proposal!.changes[0]).toMatchObject({ plannedSessionId: 'legs', action: 'move' });
    expect(a.proposal!.changes[0].toDate! > '2026-11-03').toBe(true);
    const dates = (a.options ?? [{ proposal: a.proposal! }]).map((o) => o.proposal.changes[0].toDate!);
    expect([...dates].sort()).toEqual(dates);
  });

  it('na spierpijn begint het een dag later dan anders (een tot twee dagen geen zware benen)', () => {
    const one = legEaseMoveAdvice(inputs(), 'legs', 'Een harde loop eerder vandaag', 1)!.proposal!.changes[0].toDate!;
    const two = legEaseMoveAdvice(inputs(), 'legs', 'Spierpijn', 2)!.proposal!.changes[0].toDate!;
    expect(two >= one).toBe(true);
    expect(two >= '2026-11-05').toBe(true);
  });

  it('zonder goede dag deze week: geen voorstel, de kaart biedt dan alleen Lichter', () => {
    const crowded = [ps('legs', 'tpl_lower_a', '2026-11-03'), ps('a', 'tpl_hill_intervals', '2026-11-04'), ps('b', 'tpl_long_run', '2026-11-05'), ps('c', 'tpl_intervals', '2026-11-06'), ps('d', 'tpl_lower_b', '2026-11-07'), ps('e', 'tpl_test_run', '2026-11-08'), ps('f', 'tpl_upper_a', '2026-11-09')];
    expect(legEaseMoveAdvice(inputs({ plannedSessions: crowded }), 'legs', 'Spierpijn', 2)).toBeUndefined();
  });

  it('MORNING-CHECK zwijgt over deze training zodra de kaart van LEG-EASE het overneemt', () => {
    const morning = (legEase?: 'voorstel' | 'regel' | 'uit') => computeAdvice(inputs({ checkIns: sore, legEase })).filter((a) => a.ruleId === 'MORNING-CHECK');
    expect(morning().length).toBe(1);
    expect(morning('regel').length).toBe(1);
    expect(morning('uit').length).toBe(1);
    expect(morning('voorstel')).toEqual([]);
  });

  it('een rustige dag (op) blijft van MORNING-CHECK, ook met de kaart', () => {
    const op = [{ date: '2026-11-03', legs: 'spierpijn' as const, energy: 'op' as const, sleep: 'slecht' as const }];
    expect(computeAdvice(inputs({ checkIns: op, legEase: 'voorstel' })).some((a) => a.ruleId === 'MORNING-CHECK')).toBe(true);
    // En de kaart Benen zwijgt dan, zodat er geen Lichter naast een rustige dag staat.
    const i = inputs({ checkIns: op, legEase: 'voorstel' });
    expect(legEaseCardSession({ mode: 'voorstel', today: i.asOf, plannedSessions: i.plannedSessions, templates: i.templates, logs: i.logs, injuries: i.injuries, checkIns: op })).toBeUndefined();
    expect(morningRestDay(i.asOf, op, i.logs)).toBe(true);
    expect(morningRestDay(i.asOf, sore, i.logs)).toBe(false);
  });

  const names = (list: { title: string }[]) => list.map((a) => a.title).join(' | ');
  const morningOf = (over: Partial<AdviceInputs>) => computeAdvice(inputs({ checkIns: sore, legEase: 'voorstel', ...over })).filter((a) => a.ruleId === 'MORNING-CHECK');

  it('spierpijn met een kwaliteitsloop vandaag: de kaart spreekt, MORNING-CHECK zwijgt', () => {
    const quality = [ps('q', 'tpl_intervals', '2026-11-03'), ps('easy', 'tpl_easy_run', '2026-11-05')];
    expect(morningOf({ plannedSessions: quality })).toEqual([]);
    // Zonder de kaart (instelling Regel) spreekt MORNING-CHECK zelf.
    expect(morningOf({ plannedSessions: quality, legEase: 'regel' }).length).toBe(1);
  });

  it('een beendag en een loop op één dag: de kaart dekt de beendag, de loop blijft van MORNING-CHECK', () => {
    const both = [ps('legs', 'tpl_lower_a', '2026-11-03'), ps('q', 'tpl_intervals', '2026-11-03'), ps('easy', 'tpl_easy_run', '2026-11-08')];
    const list = morningOf({ plannedSessions: both });
    expect(list.length).toBe(1);
    expect(list[0].id).toContain(':q');
    expect(names(list)).not.toContain('Benen A');
  });

  it('pijn op een beenplek: de kaart zwijgt, dus spreekt MORNING-CHECK', () => {
    const pain = [{ id: 'n1', date: '2026-11-02', bodyPart: 'Knie links', severity: 'matig' as const, kind: 'pijn' as const }];
    expect(morningOf({ injuries: pain }).length).toBe(1);
    const spierpijn = [{ ...pain[0], kind: 'spierpijn' as const }];
    expect(morningOf({ injuries: spierpijn })).toEqual([]);
  });

  it('het voorbeeld onder de ochtendcheck noemt de kaart Benen in plaats van "Je planning blijft zoals hij is"', () => {
    const i = inputs({ checkIns: sore, legEase: 'voorstel' });
    const card = previewLegCard(i);
    expect(card).toContain('Benen A');
    const line = describeMorningPreview(previewMorningAdvice(i), card);
    expect(line).toContain('de kaart Benen voor');
    expect(line).not.toBe('Je planning blijft zoals hij is.');
    // Zonder de kaart (Regel) blijft het voorbeeld bij het gewone advies.
    expect(previewLegCard(inputs({ checkIns: sore, legEase: 'regel' }))).toBeUndefined();
  });

  it('een beendag van morgen blijft van MORNING-CHECK', () => {
    const tomorrow = [ps('legs', 'tpl_lower_a', '2026-11-04'), ps('easy', 'tpl_easy_run', '2026-11-05')];
    expect(computeAdvice(inputs({ plannedSessions: tomorrow, checkIns: sore, legEase: 'voorstel' })).some((a) => a.ruleId === 'MORNING-CHECK')).toBe(true);
  });
});

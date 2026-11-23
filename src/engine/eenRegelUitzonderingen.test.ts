// Eén regel voor alle uitzonderingen (I-67): een toets per gat uit het ontwerp (docs/visie/Ontwerp een regel voor
// uitzonderingen.md, hoofdstuk 2), elk op de weg die vroeger zelf toetste. Alles nagemaakt.

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { IllnessEpisode } from '../models/illness';
import type { LeavePeriod } from '../models/leave';
import type { PlannedSession, SessionLog } from '../models/training';
import { addDays, mondayOfWeek } from '../utils/dates';
import type { Program } from '../models/program';
import { calibrationBlock } from './calibration';
import { dayRules, mayPropose } from './dayRules';
import { extraRunEarned, proposeExtraSession, type ExtraAdviceInputs } from './extraRun';
import { morningProposalCause } from './morningProposal';
import { layoutPhasesForGoal, PHASE_BASIS } from './programLayout';
import { catchUpEligibility } from './catchUp';
import { quietWeeks } from './quietWeeks';
import { keptAsk, keptDayReason, keptRefusal, suggestMoveDates } from './moveSuggestions';
import { proposeMove } from './scheduler';
import { deriveSessionStatus } from './sessionStatus';
import { computeCurrentStreak } from './streak';
import { dayVerdicts, decideMove, PLACED_ASK_REASON, TEST_ASK_REASON, type DragContext } from './weekDrag';
import { checkSwap } from './weekSwap';
import { weekConcerns } from './weekConcerns';
import { planWeekFix } from './weekFixProposal';
import { repairWeeks, validateWeeks, type CheckInput } from './weekValidator';
import { leftOutOfCount } from './weekLogs';

const { templates, program: base } = buildDefaultProgramData();
const program = { ...base, startDate: '2026-10-05' };
const byId = new Map(templates.map((t) => [t.id, t]));
const TODAY = '2026-11-16'; // maandag

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(`${TODAY}T12:00:00`));
});
afterAll(() => vi.useRealTimers());

const period = (kind: LeavePeriod['kind'], startDate: string, endDate: string, id: string = kind): LeavePeriod => ({ id, kind, startDate, endDate });
const ill = (kind: IllnessEpisode['kind'], startDate: string, endDate?: string): IllnessEpisode => ({ id: `ill-${startDate}`, kind, startDate, ...(endDate ? { endDate } : {}) });
const ps = (id: string, templateId: string, d: string, over: Partial<PlannedSession> = {}): PlannedSession => ({
  id, templateId, scheduledDate: d, weekStartDate: mondayOfWeek(d), status: 'planned', order: 0, ...over,
});
const LOCK = { by: 'user' as const, at: '2026-11-01T08:00:00.000Z' };
const log = (s: PlannedSession): SessionLog => ({
  id: `l-${s.id}`, templateId: s.templateId, plannedSessionId: s.id, type: byId.get(s.templateId)!.type,
  completedDate: s.scheduledDate, completedAt: `${s.scheduledDate}T08:00:00.000Z`, variant: 'full', durationMinutes: 40, source: 'manual',
} as SessionLog);

describe('gat 7: de reeks telt zoals Week', () => {
  // Zoals Stand hem maakt (components/stand/useStandData.ts): dezelfde telling als Week via leftOutOfCount.
  const streak = (plan: PlannedSession[], logs: SessionLog[], leave: LeavePeriod[], illness: IllnessEpisode[] = []) => computeCurrentStreak(plan, logs, {
    templateById: byId, illnessEpisodes: illness,
    leftOut: leftOutOfCount(plan, [], illness, TODAY, undefined, { periods: leave, templates: byId, loggedIds: new Set(logs.map((l) => l.plannedSessionId)) }),
  });

  it('een vastgezette training op een vakantiedag is in Week weg en breekt de reeks niet', () => {
    const done1 = ps('a', 'tpl_easy_run', addDays(TODAY, -4));
    const mine = ps('m', 'tpl_upper_a', addDays(TODAY, -2), { lock: LOCK, status: 'moved', movedFromDate: addDays(TODAY, -3) });
    const done2 = ps('b', 'tpl_easy_run', addDays(TODAY, -1));
    const leave = [period('no_training', addDays(TODAY, -2), addDays(TODAY, -2))];
    const plan = [done1, mine, done2];
    expect(deriveSessionStatus(mine, [], false, { leave, templates: byId }).status).toBe('away');
    expect(streak(plan, [log(done1), log(done2)], leave)).toBe(2);
    // Zonder de vakantie is hij gemist en breekt hij de reeks.
    expect(streak(plan, [log(done1), log(done2)], [])).toBe(1);
  });

  it('zonder sportschool: een sportschooltraining breekt niet, een loop wel', () => {
    const done = ps('a', 'tpl_easy_run', addDays(TODAY, -3));
    const gym = ps('g', 'tpl_upper_a', addDays(TODAY, -2));
    const run = ps('r', 'tpl_easy_run', addDays(TODAY, -1));
    const leave = [period('no_gym', addDays(TODAY, -2), addDays(TODAY, -1))];
    expect(streak([done, gym], [log(done)], leave)).toBe(1);
    expect(streak([done, gym, run], [log(done)], leave)).toBe(0);
  });

  it('ziek: een dag in je ziekte breekt niet, ook met neus of keel', () => {
    const done = ps('a', 'tpl_easy_run', addDays(TODAY, -3));
    const sick = ps('s', 'tpl_easy_run', addDays(TODAY, -2));
    expect(streak([done, sick], [log(done)], [], [ill('above_neck', addDays(TODAY, -2), addDays(TODAY, -1))])).toBe(1);
  });
});

// --- stap 2: wat jij verplaatst, en Let op ----------------------------------------------------------------------------

const MONDAY = TODAY;
const week = (): PlannedSession[] => [
  ps('er17', 'tpl_easy_run', addDays(MONDAY, 1)),
  ps('ua18', 'tpl_upper_a', addDays(MONDAY, 2)),
  ps('hi19', 'tpl_hill_intervals', addDays(MONDAY, 3)),
  ps('lr21', 'tpl_long_run', addDays(MONDAY, 5)),
];
const drag = (sessions: PlannedSession[], move: DragContext['move']): DragContext => ({ sessions, templates, logs: [], program, asOf: TODAY, sameDayPairingPreference: 'automatic', move });
const verdictOn = (ctx: DragContext, id: string, date: string) => dayVerdicts(ctx, id, MONDAY).find((v) => v.date === date)!;
const check = (sessions: PlannedSession[], over: Partial<CheckInput> = {}): CheckInput => ({ sessions, logs: [], templates, today: TODAY, restDay: 7, program, ...over });

describe('gat 1: zonder sportschool bij slepen, verplaatsen en ruilen', () => {
  const NOGYM = [period('no_gym', addDays(MONDAY, 3), addDays(MONDAY, 4))];
  it('de voorgestelde dagen slaan de periode over, slepen vraagt eerst', () => {
    const days = suggestMoveDates(week(), templates, 'ua18', [], program, undefined, 'automatic', TODAY, 7, { leave: NOGYM });
    expect(days.map((d) => d.date)).not.toContain(addDays(MONDAY, 4));
    expect(verdictOn(drag(week(), { leave: NOGYM }), 'ua18', addDays(MONDAY, 4))).toMatchObject({ kind: 'nogym', ask: true, askReason: 'Sportschool nodig, en je zit zonder sportschool.' });
    expect(keptAsk({ leave: NOGYM }, byId.get('tpl_upper_a'), addDays(MONDAY, 4), TODAY)).toBe('Sportschool nodig, en je zit zonder sportschool.');
    expect(keptAsk({ leave: NOGYM }, byId.get('tpl_easy_run'), addDays(MONDAY, 4), TODAY)).toBeUndefined();
  });
  it('ruilen naar de periode vraagt eerst', () => {
    const c = checkSwap(drag(week(), { leave: NOGYM }), 'ua18', 'hi19');
    expect(c.ok && c.asks.some((a) => a.includes('sportschool nodig'))).toBe(true);
  });
});

describe('gat 2: zonder sportschool in Let op', () => {
  it('een vastgezette sportschooltraining in de periode staat in Let op', () => {
    const sessions = week().map((s) => (s.id === 'ua18' ? { ...s, lock: LOCK, status: 'moved' as const, movedFromDate: MONDAY } : s));
    const c = weekConcerns(check(sessions, { leave: [period('no_gym', addDays(MONDAY, 2), addDays(MONDAY, 2))] }), MONDAY);
    expect(c.map((x) => x.rule)).toContain('NO-GYM');
  });
});

describe('gat 5: ziek in één versie', () => {
  const COLD = [ill('above_neck', TODAY)];
  it('met neus of keel mag een rustige loop naar morgen, een zware vraagt eerst', () => {
    expect(keptDayReason({ illness: COLD }, byId.get('tpl_easy_run')!, addDays(TODAY, 1), TODAY)).toBeUndefined();
    expect(verdictOn(drag(week(), { illness: COLD }), 'er17', TODAY)).toMatchObject({ kind: 'free', ask: false });
    expect(verdictOn(drag(week(), { illness: COLD }), 'hi19', addDays(TODAY, 1))).toMatchObject({ kind: 'ask', ask: true, askReason: 'Je bent verkouden, dus niets zwaars.', skipRules: ['ILL'] });
    // De voorgestelde dagen van ASCEND zetten er niets zwaars neer.
    const days = suggestMoveDates(week(), templates, 'hi19', [], program, undefined, 'automatic', TODAY, 7, { illness: COLD }).map((d) => d.date);
    expect(days).not.toContain(TODAY);
    expect(days).not.toContain(addDays(TODAY, 1));
  });
  it('met koorts blijft vandaag en morgen dicht, ook voor een rustige loop', () => {
    const FEVER = [ill('below_neck', TODAY)];
    expect(verdictOn(drag(week(), { illness: FEVER }), 'er17', TODAY)).toMatchObject({ kind: 'blocked', chip: 'Je bent ziek' });
    expect(keptAsk({ illness: FEVER }, byId.get('tpl_easy_run'), TODAY, TODAY)).toBeUndefined();
  });
});

describe('gat 6: opbouw na ziekte bij verplaatsen en in Let op', () => {
  // Drie dagen koorts, vandaag beter: zwaar pas weer na de eerste helft van de opbouw.
  const RAMP = [ill('below_neck', addDays(TODAY, -3), TODAY)];
  it('een zware training voor heavyFrom vraagt eerst; ASCEND stelt die dag niet voor', () => {
    expect(verdictOn(drag(week(), { illness: RAMP }), 'hi19', addDays(TODAY, 1))).toMatchObject({ kind: 'ask', askReason: 'Je bouwt op na ziekte, dus nog niets zwaars.', skipRules: ['ILL'] });
    const days = suggestMoveDates(week(), templates, 'hi19', [], program, undefined, 'automatic', TODAY, 7, { illness: RAMP }).map((d) => d.date);
    expect(days).not.toContain(addDays(TODAY, 1));
  });
  it('een zware training die je zelf vastzette in de opbouw staat in Let op, met een voorstel', () => {
    const sessions = week().map((s) => (s.id === 'hi19' ? { ...s, scheduledDate: addDays(TODAY, 1), lock: LOCK, status: 'moved' as const, movedFromDate: addDays(MONDAY, 3) } : s));
    const input = check(sessions, { illness: RAMP });
    const c = weekConcerns(input, MONDAY).find((x) => x.rule === 'ILL')!;
    expect(c).toMatchObject({ headline: 'Je bouwt op na ziekte, en er staat een zware training.' });
    expect(planWeekFix(input, c, MONDAY)?.proposal?.changes).toEqual([expect.objectContaining({ plannedSessionId: 'hi19', action: 'remove' })]);
  });
});

describe('keuze 1 van de eigenaar: wat je zelf vastzette op een zieke dag staat altijd in Let op', () => {
  it('ziek: een vastgezette training van morgen', () => {
    const sessions = week().map((s) => (s.id === 'er17' ? { ...s, lock: LOCK } : s));
    const c = weekConcerns(check(sessions, { illness: [ill('stomach', TODAY)] }), MONDAY).filter((x) => x.rule === 'ILL');
    expect(c.map((x) => x.headline)).toEqual(['Je bent ziek, en er staat een training.']);
    expect(c[0].fact).toBe('Rustige duurloop op dinsdag 17 valt nog in je ziekte.');
    expect(c[0].notes).toEqual({ er17: 'je bent ziek' });
  });
  it('van het systeem: geen melding, ziek melden haalt hem weg', () => {
    expect(weekConcerns(check(week(), { illness: [ill('stomach', TODAY)] }), MONDAY).some((x) => x.rule === 'ILL')).toBe(false);
  });
  it('ziek en zonder sportschool tegelijk: één melding, ziek gaat voor', () => {
    const sessions = week().map((s) => (s.id === 'ua18' ? { ...s, scheduledDate: addDays(TODAY, 1), lock: LOCK } : s));
    const c = weekConcerns(check(sessions, { illness: [ill('above_neck', TODAY)], leave: [period('no_gym', TODAY, addDays(TODAY, 3))] }), MONDAY);
    expect(c.filter((x) => x.finding.subjectId === 'ua18').map((x) => x.rule)).toEqual(['ILL']);
  });
  it('de planning leest ILL niet: de ronde verandert niets aan wat van jou is', () => {
    const sessions = week().map((s) => (s.id === 'er17' ? { ...s, lock: LOCK } : s));
    const input = check(sessions, { illness: [ill('stomach', TODAY)] });
    expect(validateWeeks(input).some((f) => f.rule === 'ILL')).toBe(false);
    expect(repairWeeks({ ...input, reportYours: true }).repairs.filter((r) => r.rule === 'ILL')).toEqual([]);
  });
});

describe('gat 10: vervallen en toch inhalen', () => {
  it('een training die op een zieke dag verviel, haal je niet in', () => {
    const s = ps('x', 'tpl_easy_run', addDays(TODAY, -2));
    const t = byId.get('tpl_easy_run')!;
    expect(catchUpEligibility(s, t, { logged: false, today: TODAY, caughtUp: false }).ok).toBe(true);
    expect(catchUpEligibility(s, t, { logged: false, today: TODAY, caughtUp: false, pause: { illness: [ill('below_neck', addDays(TODAY, -3), addDays(TODAY, -1))] } })).toEqual({ ok: false, reason: 'paused' });
    expect(catchUpEligibility(s, t, { logged: false, today: TODAY, caughtUp: false, pause: { leave: [period('no_training', addDays(TODAY, -2), addDays(TODAY, -2))], templates } })).toEqual({ ok: false, reason: 'paused' });
  });
});

// --- stap 3: Forge ------------------------------------------------------------------------------------------------------

describe('gat 3 en 4: de ijkset kent ziek, de week voor een race en de rustige weken', () => {
  const base = { date: TODAY, planned: [] as PlannedSession[], templates };
  it('gat 3: niet als je ziek bent of opbouwt, ook niet met neus of keel', () => {
    expect(calibrationBlock({ ...base, illness: [ill('above_neck', TODAY)] })).toBe('ill');
    expect(calibrationBlock({ ...base, illness: [ill('below_neck', addDays(TODAY, -3), addDays(TODAY, -1))] })).toBe('ill');
    expect(calibrationBlock(base)).toBeUndefined();
  });
  it('gat 4: de week voor een race is het venster van raceWeekGuard, niet drie dagen', () => {
    // Vrijdag 20, een race op woensdag 25: vijf dagen ervoor, in de week erna. Vroeger mocht de set nog.
    const race = ps('race', 'tpl_race', addDays(TODAY, 9));
    expect(calibrationBlock({ ...base, planned: [race] })).toBeUndefined();
    expect(calibrationBlock({ ...base, date: addDays(TODAY, 4), planned: [race] })).toBe('test');
  });
  it('gat 4: geen set tot bijna falen in een rustige instap of de lichte week van een golf', () => {
    const quiet = quietWeeks({ reentryWeeks: [{ id: 'r', from: TODAY, until: addDays(TODAY, 6), factor: 0.75, reason: 'pause' }], around: TODAY });
    expect(quiet).toEqual([{ from: TODAY, until: addDays(TODAY, 6) }]);
    expect(calibrationBlock({ ...base, quietWeeks: quiet })).toBe('quiet');
    expect(calibrationBlock({ ...base, date: addDays(TODAY, 7), quietWeeks: quiet })).toBeUndefined();
  });
  it('gat 12: niet met krachttraining uit', () => {
    expect(calibrationBlock({ ...base, strengthOff: true })).toBe('off');
  });
});

// --- stap 4: wat ASCEND voorstelt en erbij zet -----------------------------------------------------------------------

describe('gat 8: iets erbij in een periode zonder sportschool, één antwoord', () => {
  const START = '2026-09-28';
  const prog: Program = { id: 'p', name: 'P', startDate: START, phases: layoutPhasesForGoal(START, '2027-08-01', { [PHASE_BASIS]: 4 })! };
  const DAYS: [string, number][] = [['tpl_herstel', 0], ['tpl_upper_a', 1], ['tpl_lower_a', 2], ['tpl_easy_run', 3], ['tpl_upper_b', 4], ['tpl_hill_intervals', 5], ['tpl_long_run', 6]];
  const planned: PlannedSession[] = [];
  for (let w = 0; w < 10; w++) {
    const monday = addDays(START, w * 7);
    for (const [templateId, d] of DAYS) planned.push(ps(`${monday}-${templateId}`, templateId, addDays(monday, d), { order: d }));
  }
  const logs = (before: string) => planned.filter((s) => s.scheduledDate < before && s.templateId !== 'tpl_herstel').map(log);
  const extra = (today: string, over: Partial<ExtraAdviceInputs> = {}) => proposeExtraSession({ today, program: prog, plannedSessions: planned, logs: logs(today), templates, planChangeLog: [], restDay: 1, gaps: [], respondedIds: new Set(), ...over })?.date;

  it('de extra training komt niet op een dag zonder sportschool (eigenaar: er komt niets bij)', () => {
    expect(extra('2026-11-02')).toBe('2026-11-03');
    expect(extra('2026-11-02', { leave: [period('no_gym', '2026-11-02', '2026-11-08')] })).not.toBe('2026-11-03');
    const days = extra('2026-11-02', { leave: [period('no_gym', '2026-11-02', '2026-11-08')] });
    expect(days === undefined || days > '2026-11-08').toBe(true);
  });
  it('hoeveel per soort en het weekvoorschrift zeggen hetzelfde: de stap erbij', () => {
    const rules = dayRules({ today: TODAY, leave: [period('no_gym', TODAY, addDays(TODAY, 2))] });
    for (const t of [byId.get('tpl_easy_run')!, byId.get('tpl_upper_a')!, undefined]) expect(rules.may({ date: addDays(TODAY, 1), step: 'add', template: t })).toMatchObject({ ok: false, cause: 'nogym' });
    expect(rules.ok({ date: addDays(TODAY, 3), step: 'add' })).toBe(true);
  });
});

describe('gat 9: het weekvoorschrift kent ziek', () => {
  it('erbij weigert de dagen van je ziekte en je opbouw', () => {
    const sick = dayRules({ today: TODAY, illness: [ill('above_neck', TODAY)] });
    expect(sick.ok({ date: addDays(TODAY, 1), step: 'add' })).toBe(false);
    expect(sick.ok({ date: addDays(TODAY, 2), step: 'add' })).toBe(true);
    const ramp = dayRules({ today: TODAY, illness: [ill('below_neck', addDays(TODAY, -3), TODAY)] });
    const until = ramp.facts(TODAY).find((f) => f.cause === 'ramp')!.until!;
    expect(ramp.ok({ date: until, step: 'add' })).toBe(false);
    expect(ramp.ok({ date: addDays(until, 1), step: 'add' })).toBe(true);
  });
});

describe('gat 11: de opbouw na ziekte in elke poort', () => {
  it('mayPropose is de oude poort van de elf voorstellen', () => {
    expect(mayPropose(TODAY, [])).toBe(true);
    expect(mayPropose(TODAY, [ill('above_neck', TODAY)])).toBe(false);
    expect(mayPropose(TODAY, [ill('stomach', addDays(TODAY, -3), addDays(TODAY, -1))])).toBe(false);
    expect(mayPropose(TODAY, [ill('stomach', addDays(TODAY, -30), addDays(TODAY, -28))])).toBe(true);
  });
  it('de extra training en het voorstel bij een slechte ochtend wachten ook tijdens de opbouw', () => {
    const RAMP = [ill('below_neck', addDays(TODAY, -3), addDays(TODAY, -1))];
    expect(extraRunEarned({ today: TODAY, program: null as unknown as Program, plannedSessions: [], logs: [], templates, planChangeLog: [], gaps: [], respondedIds: new Set(), illnessEpisodes: RAMP } as unknown as ExtraAdviceInputs, MONDAY)).toEqual({ earned: false, reason: 'Je bent ziek gemeld of bouwt op na ziekte.' });
    const morning = (illnessEpisodes: IllnessEpisode[]) => morningProposalCause({
      today: TODAY, rule: { date: TODAY, signals: [], offCount: 2, askTired: true, line: '' }, plannedSessions: [ps('h', 'tpl_hill_intervals', TODAY)], templates, logs: [], illnessEpisodes, enabled: true,
    });
    expect(morning([])?.session.id).toBe('h');
    expect(morning(RAMP)).toBeUndefined();
  });
});

// --- na Warden, Lookout en Pathfinder (16 november) -----------------------------------------------------------------

describe('het sleepblad: hoogstens twee zinnen, en Let op niet dubbel', () => {
  // Verkouden; Benen A vandaag gedaan; Benen B van donderdag naar dinsdag, je rustdag.
  const COLD = [ill('above_neck', TODAY)];
  const plan = [ps('la16', 'tpl_lower_a', TODAY), ps('lb19', 'tpl_lower_b', addDays(TODAY, 3))];
  const logs = [log(plan[0])];
  it('de sterkste reden en de 48 uur kort, met "al gedaan" en niet "al geweest"', () => {
    const ctx: DragContext = { sessions: plan, templates, logs, program, asOf: TODAY, sameDayPairingPreference: 'automatic', move: { illness: COLD, restDay: 2 } };
    const verdict = dayVerdicts(ctx, 'lb19', MONDAY).find((v) => v.date === addDays(TODAY, 1))!;
    expect(verdict).toMatchObject({ kind: 'rest', askReason: 'Je bent verkouden, dus niets zwaars. Dit is je rustdag.', skipRules: ['REST-DAY', 'ILL'] });
    const proposal = proposeMove(plan, templates, 'lb19', addDays(TODAY, 1), logs, program, undefined, 'automatic', TODAY);
    expect(proposal.reason).not.toMatch(/al geweest/);
    const decision = decideMove(proposal, { verdict });
    expect(decision.action).toBe('ask');
    expect(decision.proposal.reason).toBe(`Je bent verkouden, dus niets zwaars. Dicht op ${byId.get('tpl_lower_a')!.name}, liefst 48 uur ertussen.`);
    expect(decision.proposal.reason.split('. ').length).toBeLessThanOrEqual(2);
  });
  it('de korte zin vervangt alleen de botsing: een testloop of wat een periode neerzette blijft staan', () => {
    const ctx: DragContext = { sessions: plan, templates, logs, program, asOf: TODAY, sameDayPairingPreference: 'automatic', move: { illness: COLD, restDay: 2 } };
    const verdict = dayVerdicts(ctx, 'lb19', MONDAY).find((v) => v.date === addDays(TODAY, 1))!;
    const proposal = proposeMove(plan, templates, 'lb19', addDays(TODAY, 1), logs, program, undefined, 'automatic', TODAY);
    const short = `Dicht op ${byId.get('tpl_lower_a')!.name}, liefst 48 uur ertussen.`;
    expect(decideMove(proposal, { verdict, askAlways: PLACED_ASK_REASON }).proposal.reason).toBe(`Je bent verkouden, dus niets zwaars. ${PLACED_ASK_REASON} ${short}`);
    expect(decideMove(proposal, { verdict, askAlways: true }).proposal.reason).toBe(`Je bent verkouden, dus niets zwaars. ${TEST_ASK_REASON} ${short}`);
  });
  it('een dag die al zegt wat Let op zou zeggen, slaat die melding over', () => {
    const ctx = drag(week(), { illness: [ill('below_neck', addDays(TODAY, -3), TODAY)], leave: [period('no_gym', addDays(TODAY, 1), addDays(TODAY, 1))] });
    expect(verdictOn(ctx, 'ua18', addDays(TODAY, 1)).skipRules).toEqual(['NO-GYM', 'ILL']);
  });
});

describe('de datumkiezer weigert een dag die dicht is, met de zin van slepen', () => {
  const t = byId.get('tpl_easy_run')!;
  const tomorrow = addDays(TODAY, 1);
  it('koorts', () => {
    expect(keptRefusal({ illness: [ill('below_neck', TODAY)] }, t, tomorrow, TODAY)).toBe('Dinsdag 17 november valt nog in je ziekte.');
  });
  it('de dag van je doel en later', () => {
    expect(keptRefusal({ goalDay: tomorrow }, t, tomorrow, TODAY)).toBe('Dinsdag 17 november ligt op of na je doel.');
    expect(keptRefusal({ goalDay: tomorrow }, t, addDays(tomorrow, 1), TODAY)).toBe('Woensdag 18 november ligt op of na je doel.');
    expect(keptRefusal({ goalDay: tomorrow }, t, TODAY, TODAY)).toBeUndefined();
  });
  it('vakantie en tocht', () => {
    expect(keptRefusal({ leave: [period('no_training', tomorrow, tomorrow)] }, t, tomorrow, TODAY)).toBe('Dinsdag 17 november is een vakantiedag.');
    expect(keptRefusal({ leave: [period('trek', tomorrow, tomorrow)] }, t, tomorrow, TODAY)).toBe('Dinsdag 17 november is een tochtdag.');
  });
  it('een dag die eerst vraagt of kan: geen weigering', () => {
    expect(keptRefusal({ illness: [ill('above_neck', TODAY)] }, t, tomorrow, TODAY)).toBeUndefined();
    expect(keptRefusal({ illness: [ill('above_neck', TODAY)] }, byId.get('tpl_hill_intervals')!, tomorrow, TODAY)).toBeUndefined();
    expect(keptRefusal({}, t, tomorrow, TODAY)).toBeUndefined();
  });
});

describe('ILL in Let op: de tweede zin hoort bij de soort', () => {
  const mine = (id: string, date: string) => week().map((s) => (s.id === id ? { ...s, scheduledDate: date, lock: LOCK } : s));
  const why = (illness: IllnessEpisode[], id: string) => weekConcerns(check(mine(id, addDays(TODAY, 1)), { illness }), MONDAY).find((c) => c.rule === 'ILL')!;
  it('ziek: wat je mist telt niet als gemist', () => {
    const c = why([ill('stomach', TODAY)], 'er17');
    expect(c.finding.illness).toBe('ill');
    expect(c.why).toBe('Je zette deze training zelf hier of accepteerde hem in een voorstel, dus eerst komt de vraag. Wat je mist terwijl je ziek bent, telt niet als gemist.');
  });
  it('verkouden en opbouw: rustig bewegen mag wel', () => {
    const cold = why([ill('above_neck', TODAY)], 'hi19');
    expect(cold.finding.illness).toBe('ill_light');
    expect(cold.why).toBe('Je zette deze training zelf hier of accepteerde hem in een voorstel, dus eerst komt de vraag. Rustig bewegen mag wel, niets zwaars.');
    const ramp = why([ill('below_neck', addDays(TODAY, -3), TODAY)], 'hi19');
    expect(ramp.finding.illness).toBe('ramp');
    expect(ramp.headline).toBe('Je bouwt op na ziekte, en er staat een zware training.');
  });
});

// I-74: een test of wedstrijd op een koortsdag staat in Let op, en bij ILL kan een training ook naar een rustige dag.
describe('I-74: ziek in Let op, ook een test of wedstrijd, en verplaatsen als voorstel', () => {
  const FEVER = [ill('below_neck', TODAY)];
  const COLD = [ill('above_neck', TODAY)];
  const TUE = addDays(MONDAY, 1);
  const withAnchor = (templateId: string): PlannedSession[] => [ps('an17', templateId, TUE), ps('ua18', 'tpl_upper_a', addDays(MONDAY, 2)), ps('lr21', 'tpl_long_run', addDays(MONDAY, 5))];
  const ills = (input: CheckInput) => weekConcerns(input, MONDAY).filter((c) => c.rule === 'ILL');

  it('een testloop op een koortsdag: in Let op, met een voorstel om hem te verplaatsen, nooit te laten vervallen', () => {
    const input = check(withAnchor('tpl_test_run'), { illness: FEVER });
    const [c] = ills(input);
    expect(c).toMatchObject({ headline: 'Je bent ziek, en er staat een testloop.', fact: 'Testloop 5 km op dinsdag 17 valt nog in je ziekte.', notes: { an17: 'je bent ziek' } });
    expect(c.finding.level).toBe(2);
    const fix = planWeekFix(input, c, MONDAY)!;
    const all = [fix.proposal!, ...(fix.options ?? []).map((o) => o.proposal!)].flatMap((p) => p.changes);
    expect(all.every((x) => x.action === 'move' && x.plannedSessionId === 'an17')).toBe(true);
    // Niet naar een dag die de ziekte nog vasthoudt (vandaag en morgen).
    expect(all.every((x) => x.toDate! > addDays(TODAY, 1))).toBe(true);
  });

  it('een wedstrijd op een koortsdag: in Let op, zonder voorstel; hij schuift niet', () => {
    const input = check(withAnchor('tpl_race'), { illness: FEVER });
    const [c] = ills(input);
    expect(c).toMatchObject({ headline: 'Je bent ziek, en je wedstrijd staat er.', why: 'Ziek train je niet. Je wedstrijd schuift niet mee. Of je start, kies je zelf.' });
    expect(planWeekFix(input, c, MONDAY)).toBeNull();
  });

  // Warden, 23 november: met een slot is een test of wedstrijd niveau 1; de keuze gaat op de rol.
  it('met een slot: een test alleen verplaatsen, een wedstrijd nooit een voorstel, altijd hun eigen tekst', () => {
    const locked = (templateId: string) => withAnchor(templateId).map((s) => (s.id === 'an17' ? { ...s, lock: LOCK } : s));
    const testInput = check(locked('tpl_test_run'), { illness: FEVER });
    const [t] = ills(testInput);
    expect(t.finding.level).toBe(1);
    expect(t).toMatchObject({ headline: 'Je bent ziek, en er staat een testloop.', why: 'Ziek zegt een testloop niets over je vorm. Hij schuift alleen met jouw Akkoord.' });
    const fix = planWeekFix(testInput, t, MONDAY)!;
    const all = [fix.proposal!, ...(fix.options ?? []).map((o) => o.proposal!)].flatMap((p) => p.changes);
    expect(all.length).toBeGreaterThan(0);
    expect(all.every((x) => x.action === 'move')).toBe(true);
    const raceInput = check(locked('tpl_race'), { illness: FEVER });
    const [r] = ills(raceInput);
    expect(r.finding.level).toBe(1);
    expect(r).toMatchObject({ headline: 'Je bent ziek, en je wedstrijd staat er.', why: 'Ziek train je niet. Je wedstrijd schuift niet mee. Of je start, kies je zelf.' });
    expect(planWeekFix(raceInput, r, MONDAY)).toBeNull();
  });

  it('buikgriep is ook ziek: dezelfde tekst, zonder koorts erin', () => {
    const [c] = ills(check(withAnchor('tpl_race'), { illness: [ill('stomach', TODAY)] }));
    expect(c.finding.illness).toBe('ill');
    expect(c.why).toBe('Ziek train je niet. Je wedstrijd schuift niet mee. Of je start, kies je zelf.');
    expect(`${c.headline} ${c.why}`).not.toMatch(/koorts/i);
    const [t] = ills(check(withAnchor('tpl_test_run'), { illness: [ill('stomach', TODAY)] }));
    expect(t.why).toBe('Ziek zegt een testloop niets over je vorm. Hij schuift alleen met jouw Akkoord.');
  });

  it('ziek: een test gaat naar de verste passende dag van de week', () => {
    // Alleen de test in de week: elke dag van woensdag tot zaterdag past, zondag is de rustdag.
    const input = check([ps('an17', 'tpl_test_run', TUE)], { illness: FEVER });
    const fix = planWeekFix(input, ills(input)[0], MONDAY)!;
    expect(fix.proposal!.changes).toEqual([expect.objectContaining({ plannedSessionId: 'an17', action: 'move', toDate: addDays(MONDAY, 5) })]);
  });

  it('met neus of keel staat een test er niet: alleen koorts of buikgriep', () => {
    expect(ills(check(withAnchor('tpl_test_run'), { illness: COLD }))).toEqual([]);
    expect(ills(check(withAnchor('tpl_test_run')))).toEqual([]);
  });

  it('verkouden: eerst naar een rustige dag, dan laten vervallen', () => {
    const sessions = withAnchor('tpl_hill_intervals').map((s) => (s.id === 'an17' ? { ...s, lock: LOCK } : s));
    const input = check(sessions, { illness: COLD });
    const [c] = ills(input);
    const fix = planWeekFix(input, c, MONDAY)!;
    expect(fix.proposal!.changes).toEqual([expect.objectContaining({ plannedSessionId: 'an17', action: 'move' })]);
    expect(fix.options!.map((o) => o.proposal!.changes[0].action)).toEqual(['move', 'remove']);
    expect(fix.options![0].label).toBe('Heuvelintervallen verplaatsen');
  });

  it('met koorts: eerst laten vervallen, dan naar een rustige dag', () => {
    const sessions = withAnchor('tpl_easy_run').map((s) => (s.id === 'an17' ? { ...s, lock: LOCK } : s));
    const input = check(sessions, { illness: FEVER });
    const fix = planWeekFix(input, ills(input)[0], MONDAY)!;
    expect(fix.options!.map((o) => o.proposal!.changes[0].action)).toEqual(['remove', 'move']);
  });
});

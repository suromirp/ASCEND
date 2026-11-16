// Eén regel voor alle uitzonderingen (I-67): een toets per gat uit het ontwerp (docs/visie/Ontwerp een regel voor
// uitzonderingen.md, hoofdstuk 2), elk op de weg die vroeger zelf toetste. Alles nagemaakt.

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { IllnessEpisode } from '../models/illness';
import type { LeavePeriod } from '../models/leave';
import type { PlannedSession, SessionLog } from '../models/training';
import { addDays, mondayOfWeek } from '../utils/dates';
import { catchUpEligibility } from './catchUp';
import { keptAsk, keptDayReason, suggestMoveDates } from './moveSuggestions';
import { deriveSessionStatus } from './sessionStatus';
import { computeCurrentStreak } from './streak';
import { dayVerdicts, type DragContext } from './weekDrag';
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
    expect(verdictOn(drag(week(), { illness: COLD }), 'hi19', addDays(TODAY, 1))).toMatchObject({ kind: 'ask', ask: true, askReason: 'Je bent verkouden. Rustig bewegen mag, niets zwaars.' });
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

describe('gat 6: opbouw na ziek bij verplaatsen en in Let op', () => {
  // Drie dagen koorts, vandaag beter: zwaar pas weer na de eerste helft van de opbouw.
  const RAMP = [ill('below_neck', addDays(TODAY, -3), TODAY)];
  it('een zware training voor heavyFrom vraagt eerst; ASCEND stelt die dag niet voor', () => {
    expect(verdictOn(drag(week(), { illness: RAMP }), 'hi19', addDays(TODAY, 1))).toMatchObject({ kind: 'ask', askReason: 'Je bouwt op na ziekte. Nog niets zwaars.' });
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

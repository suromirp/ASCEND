(globalThis as unknown as { process: { env: Record<string, string> } }).process.env.TZ = 'Europe/Amsterdam';
// Een lichte gemiste training op de eerste rustdag van de instap (I-159). Nagemaakte gebruiker, verschoven datums:
// vandaag T, je laatste training T-13, vakantie T-12 tot en met T-4, terug op T-3. Daarna twee dagen niet fit: de
// trainingen van T-2 en T-1 staan open zonder log. Op T+1 staat niets: de eerste rustdag van de instap.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession, SessionLog } from '../models/training';
import type { Program } from '../models/program';
import type { LeavePeriod } from '../models/leave';
import type { IllnessEpisode } from '../models/illness';
import { proposeReentry, reentryCatchUpItems, reentryEffect, reentryNote, type ReentryInputs } from './reentry';
import { computeAdvice, type AdviceInputs } from './adviceEngine';
import { applyPlanChangeItems } from './proposalEngine';
import { addDays, mondayOfWeek } from '../utils/dates';

const { templates, program: base } = buildDefaultProgramData();
const program: Program = { ...base, startDate: '2026-11-16' };
const name = (id: string) => templates.find((t) => t.id === id)!.name;

const ps = (templateId: string, scheduledDate: string, over: Partial<PlannedSession> = {}): PlannedSession => ({
  id: `p-${templateId}-${scheduledDate}`, templateId, scheduledDate, weekStartDate: mondayOfWeek(scheduledDate), status: 'planned', order: 0, ...over,
});
const done = (s: PlannedSession): SessionLog => ({
  id: `l-${s.id}`, templateId: s.templateId, plannedSessionId: s.id, type: templates.find((t) => t.id === s.templateId)!.type,
  completedDate: s.scheduledDate, completedAt: `${s.scheduledDate}T08:00:00.000Z`, variant: 'full', durationMinutes: 40, source: 'manual',
} as SessionLog);

// Drie weken vol voor de pauze (om de dag een training, alles gelogd), dan de pauze, dan de dagen terug.
function scenario(T: string, rows: Array<[number, string]> = DEFAULT_ROWS) {
  const t = (k: number) => addDays(T, k);
  const history: PlannedSession[] = [];
  for (let k = -34; k <= -13; k += 3) history.push(ps(k % 2 ? 'tpl_upper_a' : 'tpl_easy_run', t(k)));
  const plan = [...history, ...rows.map(([k, id]) => ps(id, t(k)))];
  const logs = history.map(done);
  return { T, t, plan, logs };
}
// T-8 ligt in de vakantie (nooit gemist). T-2 en T-1 gemist. T een open training, T+1 vrij, dan de rest van de week.
const DEFAULT_ROWS: Array<[number, string]> = [
  [-8, 'tpl_easy_run'], [-2, 'tpl_upper_a'], [-1, 'tpl_easy_run'], [0, 'tpl_upper_b'],
  [2, 'tpl_hill_intervals'], [3, 'tpl_long_run'], [4, 'tpl_upper_a'], [6, 'tpl_easy_run'],
];

const T0 = '2027-02-18'; // een donderdag
const vacation = (t: (k: number) => string): LeavePeriod => ({ id: 'weg', kind: 'no_training', startDate: t(-12), endDate: t(-4) });
const input = (s: ReturnType<typeof scenario>, over: Partial<ReentryInputs> = {}): ReentryInputs => ({
  program, plannedSessions: s.plan, logs: s.logs, templates, today: s.T, leavePeriods: [vacation(s.t)],
  choice: 'three_quarters', respondedIds: new Set(), ...over,
});
const adviceInputs = (s: ReturnType<typeof scenario>, over: Partial<AdviceInputs> = {}): AdviceInputs => ({
  logs: s.logs, plannedSessions: s.plan, templates, injuries: [], program, dailyTimeBudget: {}, sameDayPairingPreference: 'automatic',
  respondedIds: new Set(), asOf: s.T, leave: [vacation(s.t)], restDay: 1, ...over,
});

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(`${T0}T09:00:00+01:00`)); });
afterEach(() => vi.useRealTimers());

describe('I-159: een lichte gemiste training op de eerste rustdag van de instap', () => {
  it('vakantie zonder ziekte: de laatste lichte gemiste training komt op de eerste rustdag', () => {
    const s = scenario(T0);
    const p = proposeReentry(input(s))!;
    expect(p).toBeDefined();
    expect(p.cause).toBe('away');
    expect(p.catchUp).toEqual({ sessionId: `p-tpl_easy_run-${s.t(-1)}`, name: name('tpl_easy_run'), fromDate: s.t(-1), toDate: s.t(1) });
    expect(reentryEffect(p, s.T)).toContain(`${name('tpl_easy_run')} van wo 17 februari deed je niet: die komt op vr 19 februari, je eerste rustdag in die dagen, net zo kort als de rest.`);
    expect(reentryEffect(p, s.T)).toContain('Verder blijven je trainingen');
    expect(reentryEffect(p, s.T)).not.toMatch(/[–—]/);
    expect(reentryNote(p.week, undefined, undefined, p.catchUp)).toContain('je eerste rustdag in die dagen');
  });

  it('als advies op Vandaag: in hetzelfde voorstel, en de rij is bezet voor andere voorstellen', () => {
    const s = scenario(T0);
    const all = computeAdvice(adviceInputs(s));
    const a = all.find((x) => x.ruleId === 'REENTRY')!;
    expect(a.reentryCatchUp).toMatchObject({ fromDate: s.t(-1), toDate: s.t(1) });
    // Geen ander voorstel raakt dezelfde training.
    const others = all.filter((x) => x !== a).flatMap((x) => [x.proposal, ...(x.options?.map((o) => o.proposal) ?? [])]).flatMap((p) => p?.changes ?? []);
    expect(others.some((c) => c.plannedSessionId === a.reentryCatchUp!.sessionId)).toBe(false);
  });

  it('een stille periode zonder vakantie geeft het voorstel ook', () => {
    const s = scenario(T0);
    const p = proposeReentry(input(s, { leavePeriods: [] }))!;
    expect(p.cause).toBe('quiet');
    expect(p.catchUp).toMatchObject({ fromDate: s.t(-1), toDate: s.t(1) });
  });

  it('na ziekte blijft de rustdag staan: geen voorstel om iets in te halen', () => {
    const s = scenario(T0);
    const ill: IllnessEpisode[] = [{ id: 'ziek', kind: 'above_neck', startDate: s.t(-10), endDate: s.t(-9) }];
    const p = proposeReentry(input(s, { illnessEpisodes: ill }));
    expect(p).toBeDefined();
    expect(p!.cause).toBe('ill_away');
    expect(p!.catchUp).toBeUndefined();
    // Alleen ziek, geen vakantie.
    const onlyIll: IllnessEpisode[] = [{ id: 'ziek', kind: 'above_neck', startDate: s.t(-12), endDate: s.t(-4) }];
    expect(proposeReentry(input(s, { illnessEpisodes: onlyIll, leavePeriods: [] }))?.catchUp).toBeUndefined();
  });

  it('geen gemiste lichte training: geen voorstel om in te halen', () => {
    // Gemist zijn alleen een harde loop en de lange duurloop; de training in de vakantie telt nooit als gemist.
    const s = scenario(T0, [[-8, 'tpl_easy_run'], [-2, 'tpl_hill_intervals'], [-1, 'tpl_long_run'], [0, 'tpl_upper_b'], [3, 'tpl_upper_a'], [5, 'tpl_easy_run']]);
    const p = proposeReentry(input(s))!;
    expect(p).toBeDefined();
    expect(p.catchUp).toBeUndefined();
    // Gelogd of overgeslagen is ook niet gemist.
    const s2 = scenario(T0);
    const plan = s2.plan.map((r) => (r.scheduledDate === s2.t(-1) ? { ...r, status: 'skipped' as const } : r));
    const logs = [...s2.logs, done(s2.plan.find((r) => r.scheduledDate === s2.t(-2))!)];
    expect(proposeReentry(input(s2, { plannedSessions: plan, logs }))?.catchUp).toBeUndefined();
  });

  it('zware benen binnen 48 uur van een zware beensessie: niet op die rustdag', () => {
    // Gemist alleen Benen A. Op T+2 staat de Lange duurloop (zware benen): T+1 ligt erbinnen.
    const s = scenario(T0, [[-1, 'tpl_lower_a'], [0, 'tpl_upper_b'], [2, 'tpl_long_run'], [4, 'tpl_upper_a']]);
    expect(proposeReentry(input(s))!.catchUp).toBeUndefined();
    // Een lichte training zonder zware sessie in de buurt mag wel (een zware beendag nooit: terugkeerRustdagRegel.test.ts).
    const free = scenario(T0, [[-1, 'tpl_easy_run'], [0, 'tpl_upper_b'], [4, 'tpl_upper_a']]);
    expect(proposeReentry(input(free))!.catchUp).toMatchObject({ fromDate: free.t(-1), toDate: free.t(1) });
    // Een zware sessie die je vandaag al deed telt ook: Boven B gedaan, dan geen Boven A morgen.
    const upper = scenario(T0, [[-1, 'tpl_upper_a'], [4, 'tpl_easy_run']]);
    const upperToday = ps('tpl_upper_b', upper.T, { id: 'boven-vandaag' });
    const withLog = proposeReentry(input(upper, { plannedSessions: [...upper.plan, upperToday], logs: [...upper.logs, done(upperToday)] }));
    expect(withLog?.catchUp).toBeUndefined();
  });

  it('de dag zelf: een open training van vandaag is nog niet gemist', () => {
    const s = scenario(T0, [[0, 'tpl_upper_a'], [3, 'tpl_upper_b'], [5, 'tpl_easy_run']]);
    vi.setSystemTime(new Date(`${T0}T23:30:00+01:00`));
    const p = proposeReentry(input(s))!;
    expect(p).toBeDefined();
    expect(p.catchUp).toBeUndefined();
  });

  it('over een week- en maandgrens in Europe/Amsterdam', () => {
    const T = '2027-03-01'; // maandag; gemist za 27 en zo 28 februari, de rustdag is di 2 maart
    vi.setSystemTime(new Date(`${T}T00:30:00+01:00`));
    const s = scenario(T, [[-2, 'tpl_upper_a'], [-1, 'tpl_easy_run'], [0, 'tpl_upper_b'], [2, 'tpl_upper_a'], [4, 'tpl_easy_run']]);
    const p = proposeReentry(input(s))!;
    expect(p.catchUp).toEqual({ sessionId: `p-tpl_easy_run-2027-02-28`, name: name('tpl_easy_run'), fromDate: '2027-02-28', toDate: '2027-03-02' });
    const after = applyPlanChangeItems(reentryCatchUpItems(p.catchUp!), s.plan, undefined, { by: 'proposal', at: 'test' }).sessions;
    const moved = after.find((r) => r.id === p.catchUp!.sessionId)!;
    expect(moved).toMatchObject({ scheduledDate: '2027-03-02', weekStartDate: '2027-03-01', movedFromDate: '2027-02-28' });
  });

  it('een rij die je zelf vastzette blijft staan: dan de training ervoor, of niets', () => {
    // Op T-2 een herstelloop: Boven A daar zou naast Boven B van vandaag te zwaar zijn (respectsHeavySpacing).
    const s = scenario(T0, DEFAULT_ROWS.map(([k, id]): [number, string] => [k, k === -2 ? 'tpl_recovery_run' : id]));
    const lock = { by: 'user' as const, at: `${s.t(-1)}T08:00:00.000Z` };
    const one = s.plan.map((r) => (r.scheduledDate === s.t(-1) ? { ...r, lock } : r));
    expect(proposeReentry(input(s, { plannedSessions: one }))!.catchUp).toMatchObject({ fromDate: s.t(-2), name: name('tpl_recovery_run') });
    const both = s.plan.map((r) => (r.scheduledDate === s.t(-1) || r.scheduledDate === s.t(-2) ? { ...r, lock } : r));
    expect(proposeReentry(input(s, { plannedSessions: both }))!.catchUp).toBeUndefined();
    // Een rustdag waar je zelf een training op zette is geen rustdag.
    const mine = [...s.plan, ps('tpl_upper_b', s.t(1), { id: 'mijn', lock })];
    expect(proposeReentry(input(s, { plannedSessions: mine }))!.catchUp?.toDate).not.toBe(s.t(1));
  });

  it('Liever niet laat alles staan; met de instelling uit geen inhaal', () => {
    const s = scenario(T0);
    const before = JSON.stringify(s.plan);
    const id = proposeReentry(input(s))!.id;
    const all = computeAdvice(adviceInputs(s, { respondedIds: new Set([id]) }));
    expect(all.some((a) => a.ruleId === 'REENTRY')).toBe(false);
    // Het voorstel zelf verandert niets aan de planning.
    expect(JSON.stringify(s.plan)).toBe(before);
    expect(proposeReentry(input(s, { catchUp: false }))!.catchUp).toBeUndefined();
    const a = computeAdvice(adviceInputs(s, { reentry: { choice: 'three_quarters', catchUp: false } })).find((x) => x.ruleId === 'REENTRY');
    expect(a?.reentryCatchUp).toBeUndefined();
  });

  it('een vaste lengte gaat mee met de instap', () => {
    const s = scenario(T0);
    const plan = s.plan.map((r) => (r.scheduledDate === s.t(-1) ? { ...r, plannedMinutes: 40 } : r));
    expect(proposeReentry(input(s, { plannedSessions: plan }))!.catchUp?.plannedMinutes).toBe(30);
  });
});

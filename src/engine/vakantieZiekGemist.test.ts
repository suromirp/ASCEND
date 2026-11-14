// Vakantie en ziekte tellen nooit als gemist, geen inhaaladvies voor een race, en een rustiger instap na een
// pauze (docs/beslissingen/2026-11-14-vakantie-en-ziek-niet-gemist.md; profielendoorloop ziek-vakantie 1 tot 3,
// hardloper 3 en 7). Alles nagemaakt.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { computeCurrentStreak } from './streak';
import { deriveSessionStatus } from './sessionStatus';
import { rowExtra } from './weekRow';
import { buildChangeLog, weekAdjustments } from './changeLog';
import { weekHighlights } from './weekHighlights';
import { attentionLines } from './weekGlance';
import { shortfallSentence } from './repeatWeek';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession, SessionLog } from '../models/training';
import type { Program } from '../models/program';
import type { LeavePeriod } from '../models/leave';
import type { IllnessEpisode } from '../models/illness';
import { buildWeekReview } from './weekReview';
import { leftOutOfCount } from './weekLogs';
import { MISSED_ADVICE, planMissed, lapsedLine, type MissedInput } from './missedTraining';
import { computeAdvice, type AdviceInputs } from './adviceEngine';
import { proposeReentry, reentryAdjustments, reentryEffect, resolveReentry, type ReentryInputs } from './reentry';
import { durationScopeFor } from './durationScope';
import { resolveEffectiveFullDuration, withDurationScope } from './substitutions';
import { cleanSettings } from '../storage/backupClean';
import { addDays, mondayOfWeek } from '../utils/dates';

const { templates, program: base } = buildDefaultProgramData();
const program: Program = { ...base, startDate: '2026-11-16' };

let n = 0;
const ps = (templateId: string, scheduledDate: string, over: Partial<PlannedSession> = {}): PlannedSession => ({
  id: `s${++n}-${scheduledDate}`, templateId, scheduledDate, weekStartDate: mondayOfWeek(scheduledDate), status: 'planned', order: 0, ...over,
});
const done = (s: PlannedSession, minutes = 40): SessionLog => ({
  id: `l-${s.id}`, templateId: s.templateId, plannedSessionId: s.id, type: templates.find((t) => t.id === s.templateId)!.type,
  completedDate: s.scheduledDate, completedAt: `${s.scheduledDate}T08:00:00.000Z`, variant: 'full', durationMinutes: minutes, source: 'manual',
} as SessionLog);
const loose = (templateId: string, date: string, minutes = 20): SessionLog => ({
  id: `loose-${date}`, templateId, type: templates.find((t) => t.id === templateId)!.type, completedDate: date, completedAt: `${date}T08:00:00.000Z`,
  variant: 'full', durationMinutes: minutes, source: 'manual',
} as SessionLog);

// Een gewone week van vijf trainingen en een rustdag op maandag.
function week(monday: string): PlannedSession[] {
  return [
    ps('tpl_herstel', monday),
    ps('tpl_upper_a', addDays(monday, 1)),
    ps('tpl_lower_a', addDays(monday, 2)),
    ps('tpl_easy_run', addDays(monday, 3)),
    ps('tpl_hill_intervals', addDays(monday, 5)),
    ps('tpl_mountain_hike', addDays(monday, 6)),
  ];
}

const vacation = (startDate: string, endDate: string, kind: LeavePeriod['kind'] = 'no_gym'): LeavePeriod => ({ id: `v-${startDate}`, kind, startDate, endDate });

describe('L: een vakantie die je meldde telt nooit als gemist', () => {
  const sessions = [...week('2026-11-30')];
  const leave = [vacation('2026-11-30', '2026-12-06')];

  it('de weekterugblik zegt geen "0 van 5" en geen "blijven liggen"', () => {
    const before = buildWeekReview({ weekStart: '2026-11-30', plannedSessions: sessions, logs: [], templates, program, planChangeLog: [], asOf: '2026-12-07' })!;
    expect(before.planned).toBe(5);
    expect(before.missed).toHaveLength(5);
    const after = buildWeekReview({ weekStart: '2026-11-30', plannedSessions: sessions, logs: [], templates, program, planChangeLog: [], asOf: '2026-12-07', leavePeriods: leave })!;
    expect(after.planned).toBe(0);
    expect(after.missed).toEqual([]);
    expect(after.advice.join(' ')).not.toMatch(/blijven liggen|bleef liggen/);
  });

  it('wat je op vakantie wel deed, telt gewoon als gedaan', () => {
    const run = sessions.find((s) => s.templateId === 'tpl_easy_run')!;
    const review = buildWeekReview({ weekStart: '2026-11-30', plannedSessions: sessions, logs: [done(run, 20)], templates, program, planChangeLog: [], asOf: '2026-12-07', leavePeriods: leave })!;
    expect(review.done).toBe(1);
    expect(review.planned).toBe(1);
  });

  it('vrije dagen zijn geen vakantie: daar telt gemist gewoon', () => {
    const review = buildWeekReview({ weekStart: '2026-11-30', plannedSessions: sessions, logs: [], templates, program, planChangeLog: [], asOf: '2026-12-07', leavePeriods: [vacation('2026-11-30', '2026-12-06', 'free_days')] })!;
    expect(review.planned).toBe(5);
  });

  it('een vakantie over de weekgrens: in beide weken telt alleen wat buiten de vakantie viel', () => {
    const two = [...week('2026-11-23'), ...week('2026-11-30')];
    const over = [vacation('2026-11-27', '2026-12-01', 'no_training')];
    const loggedIds = new Set<string | undefined>();
    const leftOut = leftOutOfCount(two, [], undefined, '2026-12-07', program.startDate, { periods: over, loggedIds });
    const left = two.filter((s) => leftOut(s.id)).map((s) => s.scheduledDate);
    expect(left).toEqual(['2026-11-28', '2026-11-29', '2026-11-30', '2026-12-01']);
    const first = buildWeekReview({ weekStart: '2026-11-23', plannedSessions: two, logs: [], templates, program, planChangeLog: [], asOf: '2026-12-07', leavePeriods: over })!;
    const second = buildWeekReview({ weekStart: '2026-11-30', plannedSessions: two, logs: [], templates, program, planChangeLog: [], asOf: '2026-12-07', leavePeriods: over })!;
    expect(first.planned).toBe(3);
    expect(second.planned).toBe(4);
  });

  it('een oude back-up zonder periodes rekent zoals altijd', () => {
    const review = buildWeekReview({ weekStart: '2026-11-30', plannedSessions: sessions, logs: [], templates, program, planChangeLog: [], asOf: '2026-12-07', leavePeriods: undefined })!;
    expect(review.planned).toBe(5);
  });
});

const missedInput = (over: Partial<MissedInput>): MissedInput => ({ plannedSessions: [], logs: [], templates, today: '2026-11-30', settings: MISSED_ADVICE, memory: {}, ...over });

describe('L: bij een ziekmelding of vakantie vervalt wat ervoor open stond, met één regel', () => {
  // Benen A op woensdag 25 november en de bergtocht op zondag 29 november, niet gedaan. Vakantie vanaf 30 november.
  const legs = ps('tpl_lower_a', '2026-11-25');
  const hike = ps('tpl_mountain_hike', '2026-11-29');
  const rest = ps('tpl_herstel', '2026-11-30');
  const leave = [vacation('2026-11-30', '2026-12-06')];

  it('zonder vakantie de vraag Niet gedaan?, met vakantie één regel en geen vraag', () => {
    expect(planMissed(missedInput({ plannedSessions: [legs, hike] })).item).toMatchObject({ kind: 'ask', session: { id: legs.id } });
    const plan = planMissed(missedInput({ plannedSessions: [legs, hike], leavePeriods: leave }));
    expect(plan.item).toBeUndefined();
    expect(plan.lapsed?.kind).toBe('away');
    expect(lapsedLine(plan.lapsed!.kind, plan.lapsed!.sessions)).toBe('Benen A (zwaar) van woensdag 25 november en Bergtocht van zondag 29 november vervallen: je meldde een vakantie. Inhalen hoeft niet.');
  });

  it('de regel staat de eerste drie dagen van de pauze, niet elke dag', () => {
    expect(planMissed(missedInput({ plannedSessions: [legs, hike], leavePeriods: leave, today: '2026-12-02' })).lapsed).toBeDefined();
    const later = planMissed(missedInput({ plannedSessions: [legs, hike], leavePeriods: leave, today: '2026-12-03' }));
    expect(later.lapsed).toBeUndefined();
    expect(later.item).toBeUndefined();
  });

  it('na de vakantie geen regel meer en de vraag komt niet terug', () => {
    const plan = planMissed(missedInput({ plannedSessions: [legs, hike], leavePeriods: leave, today: '2026-12-07' }));
    expect(plan.item).toBeUndefined();
    expect(plan.lapsed).toBeUndefined();
  });

  it('wat op een vakantiedag stond krijgt nooit de vraag', () => {
    const onHoliday = ps('tpl_easy_run', '2026-12-02');
    const plan = planMissed(missedInput({ plannedSessions: [onHoliday], leavePeriods: leave, today: '2026-12-05' }));
    expect(plan.item).toBeUndefined();
    expect(plan.lapsed).toBeUndefined();
  });

  it('geen inhaaladvies "doe vandaag in plaats van je rustdag" op de eerste vakantiedag', () => {
    const adv = (leaveOn: LeavePeriod[] | undefined) => computeAdvice(adviceInputs({ plannedSessions: [legs, hike, rest], asOf: '2026-11-30', leave: leaveOn }));
    expect(adv(undefined).some((a) => a.ruleId === 'MISSED-CATCH-UP')).toBe(true);
    expect(adv(leave).some((a) => a.ruleId === 'MISSED-CATCH-UP' || a.ruleId === 'REST-SWAP' || a.ruleId === 'SKIPPED-KEY-TO-REST')).toBe(false);
  });

  it('ziekte die in een vakantie overgaat: wat ervoor stond vervalt, de ziektedagen en vakantiedagen zijn nooit gemist', () => {
    const ill: IllnessEpisode[] = [{ id: 'z', kind: 'below_neck', startDate: '2026-11-27', endDate: '2026-11-29' }];
    const onIll = ps('tpl_hill_intervals', '2026-11-28');
    const plan = planMissed(missedInput({ plannedSessions: [legs, onIll, hike], leavePeriods: leave, illnessEpisodes: ill, today: '2026-12-01' }));
    expect(plan.item).toBeUndefined();
    expect(plan.lapsed?.sessions.map((m) => m.session.id)).toEqual([legs.id]);
  });
});

function adviceInputs(over: Partial<AdviceInputs>): AdviceInputs {
  return { logs: [], plannedSessions: [], templates, injuries: [], program, dailyTimeBudget: {}, sameDayPairingPreference: 'automatic', respondedIds: new Set(), asOf: '2026-11-30', ...over };
}

describe('E: de week voor een race en de racedag', () => {
  // Zondag 3 januari de lange duurloop gemist, maandag 4 januari een rustdag; de race op zondag 10 januari.
  const longRun = ps('tpl_long_run', '2027-01-03');
  const restDay = ps('tpl_herstel', '2027-01-04');
  const race = ps('tpl_race', '2027-01-10');

  it('zonder race het inhaaladvies op de rustdag, binnen zeven dagen voor de race niet', () => {
    const without = computeAdvice(adviceInputs({ plannedSessions: [longRun, restDay], asOf: '2027-01-04' }));
    expect(without.find((a) => a.ruleId === 'MISSED-CATCH-UP')?.effect).toContain('in plaats van je rustdag');
    const withRace = computeAdvice(adviceInputs({ plannedSessions: [longRun, restDay, race], asOf: '2027-01-04' }));
    expect(withRace.some((a) => ['MISSED-CATCH-UP', 'SKIPPED-KEY-TO-REST', 'REST-SWAP'].includes(a.ruleId))).toBe(false);
  });

  it('op de racedag zelf geen vraag over wat voorbij is', () => {
    const tempo = ps('tpl_tempo_run', '2027-01-07');
    expect(planMissed(missedInput({ plannedSessions: [tempo], today: '2027-01-09' })).item).toBeDefined();
    expect(planMissed(missedInput({ plannedSessions: [tempo, race], today: '2027-01-10' })).item).toBeUndefined();
  });

  it('Nog open ouder dan zeven dagen verdwijnt vanzelf', () => {
    const old = ps('tpl_long_run', '2026-12-27');
    expect(planMissed(missedInput({ plannedSessions: [old], today: '2027-01-03' })).item).toBeDefined();
    expect(planMissed(missedInput({ plannedSessions: [old], today: '2027-01-04' })).item).toBeUndefined();
  });

  it('één woord: het inhaaladvies heet gemist, niet blijven liggen', () => {
    const a = computeAdvice(adviceInputs({ plannedSessions: [longRun, restDay], asOf: '2027-01-04' })).find((x) => x.ruleId === 'MISSED-CATCH-UP')!;
    expect(a.title).toMatch(/gemist$/);
    expect(a.title).not.toMatch(/blijven liggen/);
  });
});

// Het profiel: drie dagen getraind (17 tot 19 november), ziek 20 tot 22 november, een week niets, vakantie
// zonder sportschool 30 november tot en met 6 december met één loopje van 20 minuten; terug op maandag 7 december.
describe('K: rustiger instap na ziekte en een vakantie', () => {
  const plan = [...week('2026-11-16'), ...week('2026-11-23'), ...week('2026-11-30'), ...week('2026-12-07'), ...week('2026-12-14')];
  const logs = [
    done(plan.find((s) => s.scheduledDate === '2026-11-17')!),
    done(plan.find((s) => s.scheduledDate === '2026-11-18')!),
    done(plan.find((s) => s.scheduledDate === '2026-11-19')!),
    loose('tpl_easy_run', '2026-12-03', 20),
  ];
  const ill: IllnessEpisode[] = [{ id: 'z', kind: 'below_neck', startDate: '2026-11-20', endDate: '2026-11-22' }];
  const leave = [vacation('2026-11-30', '2026-12-06')];
  const input = (over: Partial<ReentryInputs> = {}): ReentryInputs => ({
    program, plannedSessions: plan, logs, templates, today: '2026-12-07', illnessEpisodes: ill, leavePeriods: leave, choice: 'three_quarters', respondedIds: new Set(), ...over,
  });

  it('op de dag terug een voorstel: zeven dagen driekwart, het doel blijft', () => {
    const p = proposeReentry(input())!;
    expect(p).toMatchObject({ id: 'reentry:2026-12-07', cause: 'ill_away', done: 1, usual: 5, week: { from: '2026-12-07', until: '2026-12-13', factor: 0.75 } });
    expect(reentryEffect(p)).toBe('De afgelopen twee weken deed je 1 training, met ziekte en een vakantie ertussen. Een gewone week heeft er 5. Voorstel: tot en met zo 13 december duren je trainingen driekwart van de gewone tijd. Welke trainingen er staan, je fase en je doeldatum blijven zoals ze zijn. Met Liever niet blijft alles staan.');
  });

  it('als advies op Vandaag, met Akkoord via het eigen voorstel; zonder Akkoord verandert de duur niet', () => {
    const advice = computeAdvice(adviceInputs({ plannedSessions: plan, logs, illnessEpisodes: ill, leave, asOf: '2026-12-07' }));
    expect(advice.find((a) => a.ruleId === 'REENTRY')?.reentry).toEqual({ from: '2026-12-07', until: '2026-12-13', factor: 0.75 });
    // Geen "Deze week nog een keer?" over de vakantieweek.
    expect(advice.some((a) => a.ruleId === 'REPEAT-WEEK')).toBe(false);
  });

  it('de instelling: de helft, of niet voorstellen', () => {
    expect(proposeReentry(input({ choice: 'half' }))?.week.factor).toBe(0.5);
    expect(proposeReentry(input({ choice: 'off' }))).toBeUndefined();
    expect(resolveReentry(undefined)).toBe('three_quarters');
    expect(resolveReentry('altijd')).toBe('three_quarters');
  });

  it('tot en met dag 4 na terugkomst, met hetzelfde id en hetzelfde venster, en niet terwijl je nog weg bent', () => {
    expect(proposeReentry(input({ today: '2026-12-09' }))).toBeDefined();
    expect(proposeReentry(input({ today: '2026-12-10' }))).toMatchObject({ id: 'reentry:2026-12-07', week: { from: '2026-12-07', until: '2026-12-13' } });
    expect(proposeReentry(input({ today: '2026-12-11' }))).toBeUndefined();
    expect(proposeReentry(input({ today: '2026-12-05' }))).toBeUndefined();
  });

  it('Liever niet: niet nog eens voor deze terugkomst; Akkoord: niet dubbel', () => {
    expect(proposeReentry(input({ respondedIds: new Set(['reentry:2026-12-07']) }))).toBeUndefined();
    expect(proposeReentry(input({ weeks: [{ from: '2026-12-07', until: '2026-12-13', factor: 0.75 }] }))).toBeUndefined();
  });

  it('terug midden in een blok, midden in de week: zeven dagen vanaf de dag terug', () => {
    const p = proposeReentry(input({ leavePeriods: [vacation('2026-11-30', '2026-12-08')], today: '2026-12-09' }))!;
    expect(p.week).toMatchObject({ from: '2026-12-09', until: '2026-12-15' });
  });

  it('een race binnen zeven dagen na terugkomst: geen voorstel, de afbouw gaat voor', () => {
    const withRace = [...plan, ps('tpl_race', '2026-12-12')];
    expect(proposeReentry(input({ plannedSessions: withRace }))).toBeUndefined();
  });

  it('ziekte voorbij maar het opbouwen loopt nog: geen voorstel, Weer opbouwen doet het al', () => {
    // Beter op zondag 6 december na vijf dagen ziek: opbouwen tot en met 14 december.
    const ill5: IllnessEpisode[] = [{ id: 'z3', kind: 'below_neck', startDate: '2026-12-01', endDate: '2026-12-06' }];
    expect(proposeReentry(input({ illnessEpisodes: ill5, today: '2026-12-07' }))).toBeUndefined();
  });

  it('niet tijdens het opbouwen na ziekte, en niet in de eerste twee weken van je plan', () => {
    const lateIll: IllnessEpisode[] = [{ id: 'z2', kind: 'below_neck', startDate: '2026-12-01', endDate: '2026-12-06' }];
    expect(proposeReentry(input({ illnessEpisodes: lateIll, leavePeriods: [] }))).toBeUndefined();
    expect(proposeReentry(input({ program: { ...program, startDate: '2026-11-30' } }))).toBeUndefined();
  });

  it('twee weken weinig training zonder pauze: op maandag ook een voorstel', () => {
    const p = proposeReentry(input({ illnessEpisodes: [], leavePeriods: [], logs: logs.slice(0, 3) }))!;
    expect(p).toMatchObject({ cause: 'quiet', week: { from: '2026-12-07' } });
    // Genoeg gedaan: niets.
    const busy = plan.filter((s) => s.scheduledDate >= '2026-11-23' && s.scheduledDate < '2026-12-07' && s.templateId !== 'tpl_herstel').map((s) => done(s));
    expect(proposeReentry(input({ illnessEpisodes: [], leavePeriods: [], logs: busy }))).toBeUndefined();
  });

  it('zomertijd: terug op de zondag van de klokwissel, de zeven dagen kloppen', () => {
    const autumn = [...week('2026-10-19'), ...week('2026-10-26')];
    const p = proposeReentry({
      program: { ...program, startDate: '2026-09-28' }, plannedSessions: autumn, logs: [], templates, today: '2026-10-27',
      leavePeriods: [vacation('2026-10-17', '2026-10-24')], choice: 'three_quarters', respondedIds: new Set(),
    })!;
    expect(p.week).toEqual({ from: '2026-10-25', until: '2026-10-31', factor: 0.75 });
  });

  it('na Akkoord duren de trainingen in die zeven dagen driekwart, daarna weer gewoon', () => {
    const scope = durationScopeFor({ reentryWeeks: [{ from: '2026-12-07', until: '2026-12-13', factor: 0.75 }] }, [], templates, program, '2026-12-07');
    const hike = templates.find((t) => t.id === 'tpl_easy_run')!;
    const plain = resolveEffectiveFullDuration(hike, '2026-12-10', program);
    const eased = withDurationScope(scope, () => resolveEffectiveFullDuration(hike, '2026-12-10', program));
    const after = withDurationScope(scope, () => resolveEffectiveFullDuration(hike, '2026-12-14', program));
    expect(eased).toBe(Math.max(15, Math.round((plain * 0.75) / 5) * 5));
    expect(after).toBe(resolveEffectiveFullDuration(hike, '2026-12-14', program));
  });

  it('een oude of beschadigde back-up: zonder instap rekent alles zoals altijd, een kapotte rij valt weg', () => {
    expect(reentryAdjustments(undefined)).toEqual([]);
    expect(reentryAdjustments([{ from: 'gisteren', until: '2026-12-13', factor: 0.75 }, { from: '2026-12-07', until: '2026-12-13', factor: 9 }])).toEqual([]);
    const counter = { n: 0 };
    const old = cleanSettings({ restDay: 1 }, counter);
    expect(old && 'reentryWeeks' in old).toBe(false);
    const mixed = cleanSettings({ reentryWeeks: [{ from: '2026-12-07', until: '2026-12-13', factor: 0.75 }, { from: 'x' }] }, counter);
    expect(mixed?.reentryWeeks).toEqual([{ from: '2026-12-07', until: '2026-12-13', factor: 0.75 }]);
  });
});

describe('L: de reeks op Je stand breekt niet op een vakantie', () => {
  afterEach(() => vi.useRealTimers());

  it('een vakantie zonder sportschool over de weekgrens telt neutraal, vrije dagen niet', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-12-08T09:00:00+01:00'));
    const two = [...week('2026-11-23'), ...week('2026-11-30')];
    const logs = two.filter((s) => s.scheduledDate < '2026-11-27' && s.templateId !== 'tpl_herstel').map((s) => done(s));
    const templateById = new Map(templates.map((t) => [t.id, t]));
    const loggedIds = new Set(logs.map((l) => l.plannedSessionId));
    const streak = (periods: LeavePeriod[]) => computeCurrentStreak(two, logs, {
      templateById, programStart: program.startDate,
      leftOut: leftOutOfCount(two, [], undefined, '2026-12-08', program.startDate, { periods, loggedIds }),
    });
    const away = streak([vacation('2026-11-27', '2026-12-06')]);
    const free = streak([vacation('2026-11-27', '2026-12-06', 'free_days')]);
    expect(away).toBeGreaterThan(0);
    expect(free).toBe(0);
  });
});

describe('Warden ronde 2: één id per terugkomst, één racebescherming, grenzen', () => {
  const plan = [...week('2026-11-16'), ...week('2026-11-23'), ...week('2026-11-30'), ...week('2026-12-07'), ...week('2026-12-14')];
  const base = (over: Partial<ReentryInputs>): ReentryInputs => ({
    program, plannedSessions: plan, logs: [], templates, today: '2026-12-04', choice: 'three_quarters', respondedIds: new Set(), ...over,
  });

  it.each([['vrijdag', '2026-11-30', '2026-12-03', '2026-12-04'], ['zondag', '2026-11-30', '2026-12-05', '2026-12-06']])('terug op %s, Liever niet: maandag komt hetzelfde voorstel niet terug met een ander id', (_, start, end, back) => {
    const leave = [vacation(start, end)];
    const first = proposeReentry(base({ leavePeriods: leave, today: back }))!;
    expect(first.id).toBe(`reentry:${back}`);
    const responded = new Set([first.id]);
    expect(proposeReentry(base({ leavePeriods: leave, today: back, respondedIds: responded }))).toBeUndefined();
    expect(proposeReentry(base({ leavePeriods: leave, today: '2026-12-07', respondedIds: responded }))).toBeUndefined();
    expect(proposeReentry(base({ leavePeriods: leave, today: '2026-12-08', respondedIds: responded }))).toBeUndefined();
  });

  it('een race op dag 7 vanaf de terugkomst beschermt, op dag 8 niet; ook een race die alleen een doel is', () => {
    const leave = [vacation('2026-11-30', '2026-12-06')];
    const at = (d: number) => [...plan, ps('tpl_race', addDays('2026-12-07', d))];
    expect(proposeReentry(base({ leavePeriods: leave, today: '2026-12-07', plannedSessions: at(7) }))).toBeUndefined();
    expect(proposeReentry(base({ leavePeriods: leave, today: '2026-12-07', plannedSessions: at(8) }))).toBeDefined();
    const goal = { goalId: 'g', name: '10 km', raceDate: '2026-12-14', blockStart: '2026-11-16', raceWeek: '2026-12-14' };
    expect(proposeReentry(base({ leavePeriods: leave, today: '2026-12-07', raceGoals: [goal] }))).toBeUndefined();
    expect(proposeReentry(base({ leavePeriods: leave, today: '2026-12-07', raceGoals: [{ ...goal, raceDate: '2026-12-15' }] }))).toBeDefined();
  });

  it('de grens van weinig training: 3 van 5 gedaan geeft een voorstel, 4 niet', () => {
    const leave = [vacation('2026-11-30', '2026-12-06')];
    const runs = (n: number) => Array.from({ length: n }, (_, i) => loose('tpl_easy_run', addDays('2026-11-23', i)));
    expect(proposeReentry(base({ leavePeriods: leave, today: '2026-12-07', logs: runs(3) }))).toBeDefined();
    expect(proposeReentry(base({ leavePeriods: leave, today: '2026-12-07', logs: runs(4) }))).toBeUndefined();
  });

  it('twee weken weinig training zonder pauze: hoogstens één keer per drie weken', () => {
    const asked = new Set(['reentry:2026-11-30']);
    expect(proposeReentry(base({ today: '2026-12-07' }))).toBeDefined();
    expect(proposeReentry(base({ today: '2026-12-07', respondedIds: asked }))).toBeUndefined();
    expect(proposeReentry(base({ today: '2026-12-14', respondedIds: asked }))).toBeUndefined();
    expect(proposeReentry(base({ today: '2026-12-21', respondedIds: asked, plannedSessions: [...plan, ...week('2026-12-21')] }))).toBeDefined();
  });

  it.each([[7, false], [8, true]])('inhalen met een race op dag %i: advies %s', (day, shown) => {
    const longRun = ps('tpl_long_run', '2027-01-03');
    const restDay = ps('tpl_herstel', '2027-01-04');
    const race = ps('tpl_race', addDays('2027-01-04', day));
    const advice = computeAdvice(adviceInputs({ plannedSessions: [longRun, restDay, race], asOf: '2027-01-04' }));
    expect(advice.some((a) => a.ruleId === 'MISSED-CATCH-UP')).toBe(shown);
  });

  it('rustdagruil en een overgeslagen sleuteltraining: niet in de week voor een race', () => {
    // Gisteren niets, vandaag rust, morgen een training: REST-SWAP. De lange duurloop van gisteren overgeslagen: SKIPPED-KEY-TO-REST.
    const rest = ps('tpl_herstel', '2027-01-04');
    const tomorrow = ps('tpl_easy_run', '2027-01-05');
    const skipped = ps('tpl_long_run', '2027-01-03', { status: 'skipped' });
    const race = ps('tpl_race', '2027-01-10');
    const rules = (withRace: boolean) => computeAdvice(adviceInputs({ plannedSessions: [rest, tomorrow, skipped, ...(withRace ? [race] : [])], asOf: '2027-01-04' })).map((a) => a.ruleId);
    expect(rules(false).some((r) => r === 'REST-SWAP' || r === 'SKIPPED-KEY-TO-REST')).toBe(true);
    expect(rules(true).some((r) => r === 'REST-SWAP' || r === 'SKIPPED-KEY-TO-REST')).toBe(false);
  });

  it('Niets doen: ook geen regel over vervallen', () => {
    const legs = ps('tpl_lower_a', '2026-11-25');
    const leave = [vacation('2026-11-30', '2026-12-06')];
    expect(planMissed(missedInput({ plannedSessions: [legs], leavePeriods: leave })).lapsed).toBeDefined();
    expect(planMissed(missedInput({ plannedSessions: [legs], leavePeriods: leave, settings: { ...MISSED_ADVICE, choice: 'off' } })).lapsed).toBeUndefined();
  });

  it('Week: een voorbije training op een vakantiedag is neutraal, niet gemist', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-12-08T09:00:00+01:00'));
    const run = ps('tpl_easy_run', '2026-12-03');
    expect(deriveSessionStatus(run, []).status).toBe('missed');
    expect(deriveSessionStatus(run, [], false, { leave: [vacation('2026-11-30', '2026-12-06')] }).status).toBe('away');
    expect(deriveSessionStatus(run, [], false, { leave: [vacation('2026-11-30', '2026-12-06', 'free_days')] }).status).toBe('missed');
    expect(deriveSessionStatus(run, [done(run)], false, { leave: [vacation('2026-11-30', '2026-12-06')] }).status).toBe('completed');
    vi.useRealTimers();
  });
});

describe('de rustiger instap in het logboek van wijzigingen', () => {
  it('een voorstel met alleen lengtes staat erin met zijn eigen regel; een ander leeg voorstel niet', () => {
    const at = '2026-12-07T08:00:00.000Z';
    const proposal = (trigger: 'reentry_planned' | 'availability_changed') => ({
      id: `p-${trigger}`, trigger, issue: 'Rustiger instap', changes: [], alternatives: [], consequences: 'Tot en met zo 13 december driekwart.',
      explanation: 'Test.', createdAt: at, resolvedAt: at, resolution: 'accepted' as const,
    });
    const log = buildChangeLog([proposal('reentry_planned'), proposal('availability_changed')], [], templates, '2026-12-01');
    expect(log.map((e) => [e.label, e.lines])).toEqual([['Rustiger instap', ['Tot en met zo 13 december driekwart.']]]);
  });
});

describe('de grens van drie weken geldt voor het voorstel, niet voor een oorzaak', () => {
  const plan = [...week('2026-11-09'), ...week('2026-11-16'), ...week('2026-11-23'), ...week('2026-11-30'), ...week('2026-12-07'), ...week('2026-12-14')];
  const early: Program = { ...program, startDate: '2026-10-05' };
  const leave = [vacation('2026-11-16', '2026-11-23')];
  const input = (over: Partial<ReentryInputs>): ReentryInputs => ({
    program: early, plannedSessions: plan, logs: [], templates, today: '2026-12-09', leavePeriods: leave, choice: 'three_quarters', respondedIds: new Set(), ...over,
  });

  it('vakantie terug op dinsdag 24 november, Liever niet: woensdag 9 december (dag 15) geen nieuw voorstel', () => {
    expect(proposeReentry(input({ today: '2026-11-24' }))?.id).toBe('reentry:2026-11-24');
    // Zonder eerder antwoord: de oorzaak is nog de vakantie, de maandag vraagt.
    expect(proposeReentry(input({}))).toBeDefined();
    expect(proposeReentry(input({ respondedIds: new Set(['reentry:2026-11-24']) }))).toBeUndefined();
  });

  it('Akkoord na ziekte, maandag 15 dagen later: geen nieuw voorstel', () => {
    // Ziek 18 tot 22 november, Akkoord op een instap vanaf zondag 22 november; maandag 7 december is dag 15.
    const ill: IllnessEpisode[] = [{ id: 'z', kind: 'below_neck', startDate: '2026-11-18', endDate: '2026-11-22' }];
    const weeks = [{ from: '2026-11-22', until: '2026-11-28', factor: 0.75 }];
    const at = (today: string, over: Partial<ReentryInputs> = {}) => proposeReentry(input({ today, leavePeriods: [], illnessEpisodes: ill, ...over }));
    expect(at('2026-12-07')).toMatchObject({ cause: 'ill' });
    expect(at('2026-12-07', { weeks })).toBeUndefined();
    // Drie weken na de vorige instap mag het weer.
    expect(at('2026-12-14', { weeks })?.id).toBe('reentry:2026-12-14');
  });
});

describe('het woord gemist, per zin', () => {
  const sessions = week('2026-11-23');
  const review = buildWeekReview({ weekStart: '2026-11-23', plannedSessions: sessions, logs: [], templates, program, planChangeLog: [], asOf: '2026-11-30' })!;

  it('de weekterugblik, de hoogtepunten en de herhaalweek zeggen gemist, nooit liggen', () => {
    expect(review.advice[0]).toMatch(/^5 trainingen gemist\./);
    const highlight = weekHighlights(review).find((h) => h.icon === 'week')!;
    expect(highlight.text).toMatch(/ gemist\. /);
    expect(highlight.text).not.toMatch(/liggen/);
    const glance = attentionLines(review).find((l) => l.key === 'missed')!;
    expect(glance.label).toBe('Gemist');
    expect(glance.value).not.toMatch(/liggen/);
    const verdict = { fellShort: true, fewDone: true, keyMissed: true, share: 0 };
    expect(shortfallSentence({ id: 'x', weekStart: '2026-11-30', previousWeek: '2026-11-23', done: 0, planned: 5, verdict, missedKey: ['Bergtocht'] })).toBe('Vorige week deed je 0 van de 5 trainingen, en de bergtocht heb je gemist.');
    expect(shortfallSentence({ id: 'x', weekStart: '2026-11-30', previousWeek: '2026-11-23', done: 4, planned: 5, verdict: { ...verdict, fewDone: false }, missedKey: ['Bergtocht'] })).toBe('Vorige week miste je de bergtocht, de belangrijkste training van de week.');
  });
});

describe('de rustiger instap in Week: Aangepast door ASCEND', () => {
  it('na Akkoord staat elke training van die zeven dagen erin als korter, met de instap om terug te zetten', () => {
    const sessions = week('2026-12-07');
    const w = { from: '2026-12-07', until: '2026-12-13', factor: 0.75 };
    const at = '2026-12-07T07:00:00.000Z';
    const proposal = { id: 'p-r', trigger: 'reentry_planned' as const, issue: 'Rustiger instap', changes: [], alternatives: [], consequences: 'x', explanation: 'x', createdAt: at, resolvedAt: at, resolution: 'accepted' as const };
    expect(weekAdjustments([proposal], sessions, templates, '2026-12-07', '2026-12-08')).toEqual([]);
    const rows = weekAdjustments([proposal], sessions, templates, '2026-12-07', '2026-12-08', [w]);
    expect(rows.map((r) => r.what)).toEqual(['korter op di 8', 'korter op wo 9', 'korter op do 10', 'korter op za 12', 'korter op zo 13']);
    expect(rows.every((r) => r.reentry?.from === '2026-12-07' && r.how === 'akkoord' && r.at === at)).toBe(true);
    // Een andere week: niets.
    expect(weekAdjustments([proposal], week('2026-12-14'), templates, '2026-12-14', '2026-12-15', [w])).toEqual([]);
  });
});

describe('ziek in Week: vervallen, nooit gemist', () => {
  it('een dag binnen de ziekte is vervallen, de dagen voor de melding blijven gemist', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-27T09:00:00+01:00'));
    const ill: IllnessEpisode[] = [{ id: 'z', kind: 'below_neck', startDate: '2026-11-24' }];
    const days = week('2026-11-23');
    const status = (s: PlannedSession) => deriveSessionStatus(s, [], templates.find((t) => t.id === s.templateId)?.type === 'recovery', { illness: ill }).status;
    expect(days.map((s) => [s.scheduledDate, status(s)])).toEqual([
      ['2026-11-23', 'rest'], ['2026-11-24', 'away'], ['2026-11-25', 'away'], ['2026-11-26', 'away'], ['2026-11-28', 'planned'], ['2026-11-29', 'planned'],
    ]);
    // De regel "Je hebt n trainingen gemist" in Week telt zo: alleen wat voor de melding lag.
    const early = ps('tpl_easy_run', '2026-11-20');
    expect(deriveSessionStatus(early, [], false, { illness: ill }).status).toBe('missed');
    expect(days.filter((s) => status(s) === 'missed')).toEqual([]);
    // De dagrij zegt vervallen.
    expect(rowExtra({ lapsed: true })).toEqual({ text: 'vervallen', warn: false });
    vi.useRealTimers();
  });
});

// Backlog R (Warden planner, 14 november): de dag na een race geen inhaaladvies en geen vraag "Niet gedaan?" over
// een training uit de afbouw; die telt ook niet als gemist, en de herstelweek wordt niet ingehaald
// (docs/beslissingen/2026-11-15-na-de-race.md). Alles nagemaakt: een race op zondag 14 maart 2027.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession, SessionLog } from '../models/training';
import type { Program } from '../models/program';
import { computeAdvice, type AdviceInputs } from './adviceEngine';
import { MISSED_ADVICE, planMissed, type MissedInput } from './missedTraining';
import { deriveSessionStatus } from './sessionStatus';
import { leftOutOfCount } from './weekLogs';
import { buildWeekReview } from './weekReview';
import { afterRaceGuard, isTaperDay, raceDatesOf } from './raceWindow';
import { strengthAdvice } from './adviceLoad';
import { weekLoss } from './fullWeek';
import restDayBackSrc from './restDayBack.ts?raw';
import weekdayPattern from '../components/WeekdayPatternLine.tsx?raw';
import { addDays, mondayOfWeek } from '../utils/dates';
import weekPage from '../pages/Week.tsx?raw';
import weekPlanner from '../components/WeekPlanner.tsx?raw';
import standData from '../components/stand/useStandData.ts?raw';
import season from '../components/SeasonOverview.tsx?raw';

const { templates, program: base } = buildDefaultProgramData();
const program: Program = { ...base, startDate: '2027-01-04' };

let n = 0;
const ps = (templateId: string, scheduledDate: string, over: Partial<PlannedSession> = {}): PlannedSession => ({
  id: `r${++n}-${scheduledDate}`, templateId, scheduledDate, weekStartDate: mondayOfWeek(scheduledDate), status: 'planned', order: 0, ...over,
});
const done = (s: PlannedSession, minutes = 40): SessionLog => ({
  id: `l-${s.id}`, templateId: s.templateId, plannedSessionId: s.id, type: templates.find((t) => t.id === s.templateId)!.type,
  completedDate: s.scheduledDate, completedAt: `${s.scheduledDate}T08:00:00.000Z`, variant: 'full', durationMinutes: minutes, source: 'manual',
} as SessionLog);

const RACE = '2027-03-14';
// De afbouw (maandag 8 tot en met zaterdag 13 maart): krachttraining gedaan, tempoloop en rustige loop niet.
const taperRest = ps('tpl_herstel', '2027-03-08');
const upper = ps('tpl_upper_a', '2027-03-09');
const tempo = ps('tpl_tempo_run', '2027-03-10');
const easy = ps('tpl_easy_run', '2027-03-12');
const race = ps('tpl_race', RACE);
// De herstelweek (maandag 15 tot en met zondag 21 maart): een rustige loop op woensdag, de lange duurloop op zaterdag.
const recRest = ps('tpl_herstel', '2027-03-15');
const recEasy = ps('tpl_easy_run', '2027-03-17');
const recLong = ps('tpl_long_run', '2027-03-20');
const plan = [taperRest, upper, tempo, easy, race, recRest, recEasy, recLong];
const withoutRace = plan.filter((s) => s.id !== race.id);
const logs = [done(upper, 45), done(race, 50)];

function adviceInputs(over: Partial<AdviceInputs>): AdviceInputs {
  return { logs, plannedSessions: plan, templates, injuries: [], program, dailyTimeBudget: {}, sameDayPairingPreference: 'automatic', respondedIds: new Set(), asOf: RACE, ...over };
}
const missedInput = (over: Partial<MissedInput>): MissedInput => ({ plannedSessions: plan, logs, templates, today: RACE, settings: MISSED_ADVICE, memory: {}, ...over });
const catchUp = (asOf: string, over: Partial<AdviceInputs> = {}) => computeAdvice(adviceInputs({ asOf, ...over })).filter((a) => a.ruleId === 'MISSED-CATCH-UP' || a.ruleId === 'SKIPPED-KEY-TO-REST');

describe('het venster rond een race', () => {
  const races = raceDatesOf(plan, templates);

  it('een race is een geplande sessie met de rol race; een overgeslagen race telt niet', () => {
    expect(races).toEqual([RACE]);
    expect(raceDatesOf([...withoutRace, ps('tpl_race', RACE, { status: 'skipped' })], templates)).toEqual([]);
  });

  it('de afbouw vervalt pas als de racedag er is, en de race zelf hoort er niet bij', () => {
    expect(isTaperDay('2027-03-12', races, '2027-03-13')).toBe(false);
    expect(isTaperDay('2027-03-12', races, RACE)).toBe(true);
    expect(isTaperDay('2027-03-07', races, '2027-03-15')).toBe(true);
    expect(isTaperDay('2027-03-06', races, '2027-03-15')).toBe(false);
    expect(isTaperDay(RACE, races, '2027-03-15')).toBe(false);
  });

  it('de herstelweek: de dag na tot en met zeven dagen na', () => {
    expect(afterRaceGuard(RACE, races)).toBe(false);
    expect(afterRaceGuard('2027-03-15', races)).toBe(true);
    expect(afterRaceGuard('2027-03-21', races)).toBe(true);
    expect(afterRaceGuard('2027-03-22', races)).toBe(false);
  });
});

describe('R: geen inhaaladvies na de race', () => {
  it('zonder race wel een advies over de rustige loop van vrijdag, met race niet: de dag na', () => {
    expect(catchUp('2027-03-15', { plannedSessions: withoutRace }).length).toBeGreaterThan(0);
    expect(catchUp('2027-03-15')).toEqual([]);
  });

  it.each(['2027-03-15', '2027-03-17', '2027-03-19', '2027-03-21'])('op %s geen inhaaladvies, ook niet voor de herstelweek', (asOf) => {
    expect(catchUp(asOf)).toEqual([]);
  });

  it('de lange duurloop van de herstelweek gemist: op dag 7 na de race niets, op dag 8 weer het gewone advies', () => {
    expect(catchUp('2027-03-21')).toEqual([]);
    const day8 = catchUp('2027-03-22');
    expect(day8.map((a) => a.ruleId)).toEqual(['MISSED-CATCH-UP']);
    expect(day8[0].proposal?.changes.map((c) => c.plannedSessionId)).toEqual([recLong.id]);
  });

  it('een venster dat later begon (Liever niet op koppelen) haalt een training uit de afbouw toch niet terug', () => {
    const declinedOn = { [`watch|${easy.id}`]: '2027-03-21' };
    const day8 = catchUp('2027-03-22', { missedLink: { on: true, declined: [`watch|${easy.id}`], declinedOn } });
    expect(day8.flatMap((a) => (a.proposal?.changes ?? []).map((c) => c.plannedSessionId))).not.toContain(easy.id);
  });

  it('een overgeslagen sleuteltraining in de herstelweek gaat niet naar een rustdag', () => {
    const long = ps('tpl_long_run', '2027-03-15', { status: 'skipped' });
    const rest = ps('tpl_herstel', '2027-03-16');
    const plain = [long, rest];
    expect(computeAdvice(adviceInputs({ plannedSessions: plain, logs: [], asOf: '2027-03-15' })).some((a) => a.ruleId === 'SKIPPED-KEY-TO-REST')).toBe(true);
    expect(computeAdvice(adviceInputs({ plannedSessions: [...plain, race], logs: [done(race)], asOf: '2027-03-15' })).some((a) => a.ruleId === 'SKIPPED-KEY-TO-REST')).toBe(false);
  });
});

describe('R: geen vraag "Niet gedaan?" over de afbouw', () => {
  it('zonder race de vraag over de rustige loop, met race niet: de dag na', () => {
    expect(planMissed(missedInput({ plannedSessions: withoutRace, today: '2027-03-15' })).item?.session.id).toBe(tempo.id);
    expect(planMissed(missedInput({ today: '2027-03-15' })).item).toBeUndefined();
  });

  it('drie dagen na en een week na: geen vraag over de afbouw', () => {
    expect(planMissed(missedInput({ plannedSessions: plan.filter((s) => s.id !== recEasy.id), today: '2027-03-17' })).item).toBeUndefined();
    expect(planMissed(missedInput({ plannedSessions: plan.filter((s) => s.id !== recEasy.id && s.id !== recLong.id), today: '2027-03-21' })).item).toBeUndefined();
  });

  it('Zelf overslaan zet geen training uit de afbouw op overgeslagen', () => {
    expect(planMissed(missedInput({ today: '2027-03-15', settings: { ...MISSED_ADVICE, choice: 'auto' } })).autoSkip).toEqual([]);
  });

  it('een training uit de herstelweek krijgt de vraag wel: dat is geen inhalen', () => {
    expect(planMissed(missedInput({ today: '2027-03-19' })).item?.session.id).toBe(recEasy.id);
  });

  it('een log van je horloge mag nog aan een training uit de afbouw gekoppeld worden', () => {
    const watch = { id: 'watch', templateId: 'tpl_easy_run', type: 'cardio', completedDate: '2027-03-13', completedAt: '2027-03-13T08:00:00.000Z', variant: 'full', durationMinutes: 40, source: 'garmin', externalId: 'garmin:1' } as SessionLog;
    const item = planMissed(missedInput({ logs: [...logs, watch], today: '2027-03-15' })).item;
    expect(item?.kind).toBe('link');
    expect(item?.session.id).toBe(easy.id);
  });
});

describe('R: de afbouw telt niet als gemist', () => {
  afterEach(() => vi.useRealTimers());
  const races = raceDatesOf(plan, templates);
  const at = (day: string) => { vi.useFakeTimers(); vi.setSystemTime(new Date(`${day}T09:00:00+01:00`)); };

  it('Week: voor de race gemist, vanaf de racedag Vervallen; een gedane training blijft gedaan', () => {
    at('2027-03-13');
    expect(deriveSessionStatus(easy, logs, false, { races }).status).toBe('missed');
    at(RACE);
    expect(deriveSessionStatus(easy, logs, false, { races }).status).toBe('away');
    for (const day of ['2027-03-15', '2027-03-17', '2027-03-21']) {
      at(day);
      expect(deriveSessionStatus(tempo, logs, false, { races }).status).toBe('away');
      expect(deriveSessionStatus(tempo, logs, false, {}).status).toBe('missed');
      expect(deriveSessionStatus(upper, logs, false, { races }).status).toBe('completed');
    }
  });

  it('de herstelweek zelf blijft gemist als je hem niet deed', () => {
    at('2027-03-19');
    expect(deriveSessionStatus(recEasy, logs, false, { races }).status).toBe('missed');
  });

  it('de telling: niet gedaan uit de afbouw telt niet, gedaan wel', () => {
    const loggedIds = new Set(logs.map((l) => l.plannedSessionId));
    const out = leftOutOfCount(plan, [], undefined, '2027-03-15', program.startDate, { periods: undefined, loggedIds, races });
    expect(out(tempo.id)).toBe(true);
    expect(out(easy.id)).toBe(true);
    expect(out(upper.id)).toBe(false);
    expect(out(race.id)).toBe(false);
    expect(out(recEasy.id)).toBe(false);
    expect(leftOutOfCount(plan, [], undefined, '2027-03-13', program.startDate, { periods: undefined, loggedIds, races })(easy.id)).toBe(false);
  });

  it('de weekterugblik van de afbouw: geen gemiste trainingen, de race en de krachttraining gedaan', () => {
    const review = (sessions: PlannedSession[]) => buildWeekReview({ weekStart: '2027-03-08', plannedSessions: sessions, logs, templates, program, planChangeLog: [], asOf: '2027-03-15' })!;
    expect(review(withoutRace).missed).toHaveLength(2);
    const after = review(plan);
    expect(after.missed).toEqual([]);
    expect(after.done).toBe(2);
    expect(after.planned).toBe(2);
  });

  it('een week na de race verandert de terugblik van de afbouw niet meer', () => {
    const review = buildWeekReview({ weekStart: '2027-03-08', plannedSessions: plan, logs, templates, program, planChangeLog: [], asOf: addDays(RACE, 7) })!;
    expect(review.missed).toEqual([]);
  });

  it('elk scherm dat gemist toont, geeft de races mee', () => {
    expect(weekPage).toMatch(/raceDatesOf\(/);
    // Na de races mag het concept van Forge volgen (openDraft, besluit 2026-11-15-concept-loopt-nog.md), daarna de start van het programma (I-57).
    expect(weekPage).toMatch(/illness: settings\.illnessEpisodes, races(, openDraft: openDraftId)?(, programStart: program\?\.startDate)? \}/);
    expect(weekPlanner).toMatch(/illness: illnessEpisodes, races(, openDraft: openDraftId)?(, programStart: program\?\.startDate)? \}/);
    expect(weekPlanner).toMatch(/illness: settings\.illnessEpisodes, races(, openDraft: openDraftId)?(, programStart: program\?\.startDate)? \}/);
    expect(weekPage).toMatch(/loggedIds: new Set\(sessionLogs\.map\(\(l\) => l\.plannedSessionId\)\), races(, openDraft: openDraftId)? \}\)\);/);
    expect(weekPlanner).toMatch(/races=\{races\}/);
    expect(standData).toMatch(/races: raceDatesOf\(/);
    expect(season).toMatch(/races: raceDatesOf\(/);
  });
});

describe('Warden ronde 2: elke stem, en een antwoord op de race klapt niets terug', () => {
  afterEach(() => vi.useRealTimers());
  const at = (day: string) => { vi.useFakeTimers(); vi.setSystemTime(new Date(`${day}T09:00:00+01:00`)); };

  it('TEST-MAKE-ROOM: een testloop uit de afbouw krijgt na de race geen inhaalvoorstel', () => {
    const test = ps('tpl_test_run', '2027-03-11');
    const sessions = [taperRest, upper, test, race, recRest, recEasy, recLong];
    const room = (list: PlannedSession[], asOf: string) => computeAdvice(adviceInputs({ plannedSessions: list, asOf })).filter((a) => a.ruleId === 'TEST-MAKE-ROOM');
    expect(room(sessions.filter((s) => s.id !== race.id), '2027-03-15').length).toBeGreaterThan(0);
    // De racedag zelf: de herstelweek begint pas morgen, alleen de afbouw houdt de test tegen.
    for (const day of [RACE, '2027-03-15', '2027-03-17', '2027-03-21']) expect(room(sessions, day)).toEqual([]);
  });

  it('TEST-MAKE-ROOM: een testloop die in de herstelweek zelf gemist is, wordt niet ingehaald', () => {
    const test = ps('tpl_test_run', '2027-03-16');
    const sessions = [race, test, recEasy, recLong];
    const room = (list: PlannedSession[], asOf: string) => computeAdvice(adviceInputs({ plannedSessions: list, asOf })).filter((a) => a.ruleId === 'TEST-MAKE-ROOM');
    expect(room(sessions.filter((s) => s.id !== race.id), '2027-03-18').length).toBeGreaterThan(0);
    expect(room(sessions, '2027-03-18')).toEqual([]);
  });

  it('Niet gedaan met het moment op de racedag zelf: de race telt', () => {
    const sameDay = { ...race, status: 'skipped' as const, lock: { by: 'user' as const, at: '2027-03-14T20:30:00+01:00' } };
    expect(raceDatesOf([sameDay], templates)).toEqual([RACE]);
    const dayBefore = { ...race, status: 'skipped' as const, lock: { by: 'user' as const, at: '2027-03-13T20:30:00+01:00' } };
    expect(raceDatesOf([dayBefore], templates)).toEqual([]);
  });

  it('Niet gedaan op de race zelf: de race blijft tellen, de afbouw blijft vervallen', () => {
    const skipped = { ...race, status: 'skipped' as const, lock: { by: 'user' as const, at: '2027-03-15T08:10:00+01:00' } };
    const list = plan.map((s) => (s.id === race.id ? skipped : s));
    const noRaceLog = [done(upper, 45)];
    expect(raceDatesOf(list, templates)).toEqual([RACE]);
    expect(planMissed(missedInput({ plannedSessions: list, logs: noRaceLog, today: '2027-03-15' })).item).toBeUndefined();
    expect(computeAdvice(adviceInputs({ plannedSessions: list, logs: noRaceLog, asOf: '2027-03-15' })).filter((a) => a.ruleId === 'MISSED-CATCH-UP')).toEqual([]);
    const review = buildWeekReview({ weekStart: '2027-03-08', plannedSessions: list, logs: noRaceLog, templates, program, planChangeLog: [], asOf: '2027-03-15' })!;
    // Alleen de race zelf telt als gepland en niet gedaan: je zei dat je hem niet liep. Overgeslagen heet niet gemist
    // (docs/beslissingen/2026-11-15-week-telling-zonder-sportschool.md), de afbouw vervalt.
    expect(review.planned - review.done).toBe(1);
    expect(review.missed).toEqual([]);
    at('2027-03-16');
    expect(deriveSessionStatus(easy, noRaceLog, false, { races: raceDatesOf(list, templates) }).status).toBe('away');
  });

  it('een race die vóór zijn dag is afgezegd, telt niet: dan is er geen afbouw', () => {
    const cancelled = { ...race, status: 'skipped' as const, lock: { by: 'user' as const, at: '2027-03-12T20:00:00+01:00' } };
    expect(raceDatesOf(plan.map((s) => (s.id === race.id ? cancelled : s)), templates)).toEqual([]);
    expect(raceDatesOf([{ ...race, status: 'skipped' }], templates)).toEqual([]);
  });

  it('een niet gelogde eerste race vervalt niet in de afbouw van een tweede', () => {
    const race2 = ps('tpl_race', '2027-03-18');
    const list = [...plan, race2];
    const races = raceDatesOf(list, templates);
    expect(isTaperDay(RACE, races, '2027-03-19')).toBe(false);
    at('2027-03-19');
    expect(deriveSessionStatus(race, [done(race2)], false, { races }).status).toBe('missed');
    expect(deriveSessionStatus(recEasy, [done(race2)], false, { races }).status).toBe('away');
  });

  it('STRENGTH-REGULARITY: kracht uit de afbouw telt na de race niet als gemist', () => {
    const a = ps('tpl_upper_a', '2027-03-08');
    const b = ps('tpl_upper_b', '2027-03-11');
    const byId = new Map(templates.map((t) => [t.id, t]));
    const hint = (list: PlannedSession[]) => strengthAdvice(adviceInputs({ plannedSessions: list, logs: [done(race)], asOf: '2027-03-15' }), byId);
    expect(hint([a, b]).length).toBe(1);
    expect(hint([a, b, race])).toEqual([]);
  });

  it('de volle week: een training uit de afbouw is op de racedag geen verlies', () => {
    const loss = (list: PlannedSession[]) => weekLoss({ today: RACE, sessions: list, logs, templates });
    expect(loss(withoutRace).map((l) => l.date)).toEqual(['2027-03-10', '2027-03-12']);
    expect(loss(plan)).toEqual([]);
  });

  it('rustdag terug en het weekdagpatroon lezen het venster ook', () => {
    // Sinds I-74 via de ene regel (engine/dayRules.ts#DayRules.taperDone, gelijk aan isTaperDay in dayRules.test.ts).
    expect(restDayBackSrc).toMatch(/races: raceDatesOf\(input\.plannedSessions, byId\)/);
    expect(restDayBackSrc).toMatch(/rules\.taperDone\(m\.scheduledDate\)/);
    expect(weekdayPattern).toMatch(/isTaperDay\(d, races, today\)/);
  });
});

// TEST-RETRY opnieuw: dezelfde opzet als testRetryOpnieuw.test.ts, nagemaakt. Een testloop op dinsdag 29 september
// 2026 met veel stilstand; de herkansing op zondag 4 oktober zette je op overgeslagen. Vandaag maandag 5 oktober.
describe('Warden ronde 2: TEST-RETRY na een race', () => {
  const TEST_DAY = '2026-09-29';
  const lock = { by: 'user' as const, at: '2026-10-04T18:00:00Z' };
  const testLog = { id: 'log-test', templateId: 'tpl_test_run', type: 'cardio', completedDate: TEST_DAY, completedAt: `${TEST_DAY}T10:00:00Z`, variant: 'full', durationMinutes: 36, rpe: 9, source: 'manual',
    cardioData: { durationMinutes: 36, distanceKm: 6, source: 'manual' },
    bestEffort: { km: 5, minutes: 27.67, wholeKm: 6, wholeMinutes: 36, accepted: true, v: 2, stops: 5, stoppedSec: 136 } } as SessionLog;
  const row = (id: string, templateId: string, date: string, over: Partial<PlannedSession> = {}): PlannedSession => ({ id, templateId, scheduledDate: date, weekStartDate: mondayOfWeek(date), status: 'planned', order: 0, ...over });
  const base = [
    row('retry', 'tpl_test_run', '2026-10-04', { status: 'skipped', lock, movedFromDate: '2026-10-03' }),
    row('easy', 'tpl_easy_run', '2026-10-08'), row('upperB', 'tpl_upper_b', '2026-10-09'), row('long2', 'tpl_long_run', '2026-10-11'),
    row('rest2', 'tpl_herstel', '2026-10-12'), row('upperA2', 'tpl_upper_a', '2026-10-13'), row('easy2', 'tpl_easy_run', '2026-10-15'),
  ];
  const again = (sessions: PlannedSession[], extraLogs: SessionLog[] = []) => computeAdvice({
    logs: [testLog, ...extraLogs], plannedSessions: sessions, templates, injuries: [], program: null, dailyTimeBudget: {}, sameDayPairingPreference: 'automatic',
    respondedIds: new Set([`retest:${TEST_DAY}`]), retryRows: new Set(['retry']), asOf: '2026-10-05', restDay: 1,
  }).find((a) => a.id === `retest:${TEST_DAY}:opnieuw`);

  it('de eerste vraag om een nieuwe testpoging: niet in de herstelweek na een race', () => {
    const tempo = row('tempo', 'tpl_tempo_run', '2026-10-07');
    const first = (sessions: PlannedSession[], extraLogs: SessionLog[] = []) => computeAdvice({
      logs: [testLog, ...extraLogs], plannedSessions: sessions, templates, injuries: [], program: null, dailyTimeBudget: {}, sameDayPairingPreference: 'automatic',
      respondedIds: new Set(), asOf: '2026-10-05', restDay: 1,
    }).find((a) => a.id === `retest:${TEST_DAY}`);
    const plain = [tempo, ...base.filter((s) => s.id !== 'retry')];
    expect(first(plain)).toBeDefined();
    const r = row('race', 'tpl_race', '2026-10-03');
    expect(first([...plain, r], [done(r)])).toBeUndefined();
  });

  it('zonder race de vraag om een nieuwe dag', () => {
    expect(again(base)).toBeDefined();
  });

  it('in de herstelweek na een race geen herkansing', () => {
    const r = row('race', 'tpl_race', '2026-10-03');
    expect(again([...base, r], [done(r)])).toBeUndefined();
  });

  it('een herkansing uit de afbouw van een race die er nu is, vervalt', () => {
    const r = row('race', 'tpl_race', '2026-10-05');
    expect(again([...base, r], [done(r)])).toBeUndefined();
  });
});

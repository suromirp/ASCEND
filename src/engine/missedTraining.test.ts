import { describe, it, expect } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { PlannedSession, SessionLog } from '../models/training';
import {
  askLine,
  autoSkipNotice,
  linkEyebrow,
  linkLine,
  linkCandidates,
  linkLog,
  planMissed,
  resolveMissedMemory,
  resolveMissedSettings,
  unlinkLog,
  validLinkedLater,
  MISSED_ADVICE,
  type MissedInput,
} from './missedTraining';
import { migrateLogLinkedLater } from '../storage/migrations';

const { templates } = buildDefaultProgramData();

// Alles nagemaakt. Vandaag is woensdag 28 oktober 2026.
const TODAY = '2026-10-28';
const planned = (id: string, templateId: string, scheduledDate: string, over: Partial<PlannedSession> = {}): PlannedSession => ({
  id, templateId, scheduledDate, weekStartDate: '2026-10-26', status: 'planned', order: 0, ...over,
});
const watchRun = (id: string, completedDate: string, over: Partial<SessionLog> = {}): SessionLog => ({
  id, templateId: 'tpl_easy_run', type: 'cardio', sport: 'running', completedDate, completedAt: `${completedDate}T08:00:00Z`, variant: 'custom', durationMinutes: 42,
  externalId: `intervals.icu:i-${id}`, source: 'garmin', cardioData: { durationMinutes: 42, distanceKm: 7, source: 'garmin' },
  ...over,
} as SessionLog);
const mfStrength = (id: string, completedDate: string, over: Partial<SessionLog> = {}): SessionLog => ({
  id, templateId: 'tpl_upper_a', type: 'strength', completedDate, completedAt: `${completedDate}T18:00:00Z`, variant: 'custom', durationMinutes: 55,
  externalId: `macrofactor:w-${id}`, source: 'macrofactor', ...over,
} as SessionLog);

const input = (over: Partial<MissedInput> = {}): MissedInput => ({
  plannedSessions: [],
  logs: [],
  templates,
  today: TODAY,
  settings: MISSED_ADVICE,
  memory: {},
  ...over,
});

describe('instelling: Training die niet doorging', () => {
  it('zonder iets opgeslagen geldt het advies: vragen, na 2 dagen, koppelen aan', () => {
    expect(resolveMissedSettings(undefined)).toEqual({ choice: 'ask', days: 2, link: true });
    expect(resolveMissedSettings({ missedTraining: 'auto', missedTrainingDays: 3, missedLink: false })).toEqual({ choice: 'auto', days: 3, link: false });
  });
  it('iets wat er niet hoort valt terug op het advies', () => {
    expect(resolveMissedSettings({ missedTraining: 'altijd', missedTrainingDays: 9, missedLink: 'ja' })).toEqual({ choice: 'ask', days: 2, link: true });
  });
  it('het geheugen leest alleen lijsten met tekst en een datum', () => {
    expect(resolveMissedMemory({ notNow: ['a', 3], notNowOn: '2026-10-28', auto: 'x', declined: ['l|s'] })).toEqual({ notNow: ['a'], notNowOn: '2026-10-28', auto: [], declined: ['l|s'] });
    expect(resolveMissedMemory(null)).toEqual({ notNow: [], auto: [], declined: [] });
    // De dag van Liever niet: alleen een datum blijft, een oud geheugen zonder blijft zonder.
    expect(resolveMissedMemory({ declined: ['l|s', 'k|s'], declinedOn: { 'l|s': '2026-10-27', 'k|s': 'gisteren' } }).declinedOn).toEqual({ 'l|s': '2026-10-27' });
    expect(resolveMissedMemory({ declined: ['l|s'], declinedOn: ['x'] }).declinedOn).toBeUndefined();
  });
});

describe('de vraag "Niet gedaan?" op Vandaag', () => {
  it('vraagt na 2 dagen zonder log', () => {
    const plan = planMissed(input({ plannedSessions: [planned('easy', 'tpl_easy_run', '2026-10-26')] }));
    expect(plan.item).toMatchObject({ kind: 'ask', session: { id: 'easy' } });
    expect(plan.autoSkip).toEqual([]);
  });

  it('vraagt nog niet na 1 dag, wel als je 1 dag kiest', () => {
    const sessions = [planned('easy', 'tpl_easy_run', '2026-10-27')];
    expect(planMissed(input({ plannedSessions: sessions })).item).toBeUndefined();
    expect(planMissed(input({ plannedSessions: sessions, settings: { ...MISSED_ADVICE, days: 1 } })).item).toMatchObject({ kind: 'ask', session: { id: 'easy' } });
  });

  it('vraagt niet als er een log bij staat', () => {
    const log = { ...watchRun('done', '2026-10-26'), plannedSessionId: 'easy' };
    expect(planMissed(input({ plannedSessions: [planned('easy', 'tpl_easy_run', '2026-10-26')], logs: [log] })).item).toBeUndefined();
  });

  it('vraagt niet naar een training van meer dan twee weken terug', () => {
    expect(planMissed(input({ plannedSessions: [planned('old', 'tpl_easy_run', '2026-10-13')] })).item).toBeUndefined();
    expect(planMissed(input({ plannedSessions: [planned('edge', 'tpl_easy_run', '2026-10-14')] })).item).toMatchObject({ session: { id: 'edge' } });
  });

  it('één vraag tegelijk, de oudste eerst', () => {
    const plan = planMissed(input({ plannedSessions: [planned('b', 'tpl_upper_a', '2026-10-24'), planned('a', 'tpl_easy_run', '2026-10-20'), planned('c', 'tpl_long_run', '2026-10-25')] }));
    expect(plan.item).toMatchObject({ kind: 'ask', session: { id: 'a' } });
  });

  it('niet bij overgeslagen, een rustdag of een ziektedag', () => {
    const sessions = [
      planned('skip', 'tpl_easy_run', '2026-10-20', { status: 'skipped' }),
      planned('rest', 'tpl_herstel', '2026-10-21'),
      planned('ill', 'tpl_easy_run', '2026-10-22'),
    ];
    const illnessEpisodes = [{ id: 'ziek', kind: 'above_neck' as const, startDate: '2026-10-22', endDate: '2026-10-23' }];
    expect(planMissed(input({ plannedSessions: sessions, illnessEpisodes })).item).toBeUndefined();
  });

  it('niet voor een training die al in een ander advies op Vandaag staat', () => {
    const plan = planMissed(input({ plannedSessions: [planned('easy', 'tpl_easy_run', '2026-10-26')], busy: new Set(['easy']) }));
    expect(plan.item).toBeUndefined();
  });

  it('Niet nu: die training komt niet terug, en vandaag komt er geen volgende', () => {
    const sessions = [planned('a', 'tpl_easy_run', '2026-10-20'), planned('b', 'tpl_upper_a', '2026-10-24')];
    expect(planMissed(input({ plannedSessions: sessions, memory: { notNow: ['a'], notNowOn: TODAY } })).item).toBeUndefined();
    expect(planMissed(input({ plannedSessions: sessions, today: '2026-10-29', memory: { notNow: ['a'], notNowOn: TODAY } })).item).toMatchObject({ session: { id: 'b' } });
  });

  it('Niets doen: geen vraag en niets vanzelf', () => {
    const plan = planMissed(input({ plannedSessions: [planned('easy', 'tpl_easy_run', '2026-10-26')], settings: { ...MISSED_ADVICE, choice: 'off' } }));
    expect(plan).toEqual({ item: undefined, autoSkip: [] });
  });

  it('de regel zegt de training en de dag', () => {
    const easy = templates.find((t) => t.id === 'tpl_easy_run')!;
    expect(askLine(planned('easy', 'tpl_easy_run', '2026-10-26'), easy)).toBe('Rustige duurloop van maandag 26 oktober');
  });
});

describe('ziek gemeld: de vragen wachten', () => {
  // Ziek sinds maandag 26 oktober, nog niet beter. De training van zaterdag 24 oktober was van voor de ziekte.
  const ill = [{ id: 'ziek', kind: 'below_neck' as const, startDate: '2026-10-26' }];
  const before = planned('za', 'tpl_easy_run', '2026-10-24');

  it('geen Niet gedaan? zolang je ziek bent, ook niet over een training van voor de ziekte', () => {
    expect(planMissed(input({ plannedSessions: [before] })).item).toMatchObject({ kind: 'ask', session: { id: 'za' } });
    expect(planMissed(input({ plannedSessions: [before], illnessEpisodes: ill }))).toEqual({ item: undefined, autoSkip: [] });
  });

  it('geen koppelvoorstel zolang je ziek bent', () => {
    const logs = [watchRun('w1', '2026-10-25')];
    expect(planMissed(input({ plannedSessions: [before], logs })).item).toMatchObject({ kind: 'link' });
    expect(planMissed(input({ plannedSessions: [before], logs, illnessEpisodes: ill })).item).toBeUndefined();
  });

  it('ook Zelf overslaan wacht', () => {
    const auto = planMissed(input({ plannedSessions: [before], illnessEpisodes: ill, settings: { ...MISSED_ADVICE, choice: 'auto' } }));
    expect(auto.autoSkip).toEqual([]);
  });

  it('weer beter: de vraag en het koppelvoorstel komen terug', () => {
    const better = [{ ...ill[0], endDate: '2026-10-27' }];
    expect(planMissed(input({ plannedSessions: [before], illnessEpisodes: better })).item).toMatchObject({ kind: 'ask', session: { id: 'za' } });
    const logs = [watchRun('w1', '2026-10-25')];
    expect(planMissed(input({ plannedSessions: [before], logs, illnessEpisodes: better })).item).toMatchObject({ kind: 'link', session: { id: 'za' } });
  });

  it('weer beter: de grens van 14 dagen telt vanaf de training, niet vanaf de dag dat je beter werd', () => {
    // Een training van 13 en 15 dagen terug, ziek in de tussentijd en vandaag beter gemeld.
    const sessions = [planned('oud', 'tpl_easy_run', '2026-10-13'), planned('net', 'tpl_upper_a', '2026-10-15')];
    const episodes = [{ id: 'ziek', kind: 'below_neck' as const, startDate: '2026-10-16', endDate: TODAY }];
    const plan = planMissed(input({ plannedSessions: sessions, illnessEpisodes: episodes }));
    expect(plan.item).toMatchObject({ kind: 'ask', session: { id: 'net' } });
    const later = planMissed(input({ plannedSessions: sessions, illnessEpisodes: episodes, today: '2026-10-30' }));
    expect(later.item).toBeUndefined();
  });
});

describe('Zelf overslaan', () => {
  const auto = { ...MISSED_ADVICE, choice: 'auto' as const };

  it('zet een vrije training na de gekozen dagen op de lijst om over te slaan, zonder vraag', () => {
    const plan = planMissed(input({ plannedSessions: [planned('easy', 'tpl_easy_run', '2026-10-26'), planned('young', 'tpl_upper_a', '2026-10-27')], settings: auto }));
    expect(plan.autoSkip.map((m) => m.session.id)).toEqual(['easy']);
    expect(plan.item).toBeUndefined();
  });

  it('een test of wedstrijd nooit vanzelf: die krijgt de vraag', () => {
    const plan = planMissed(input({ plannedSessions: [planned('test', 'tpl_test_run', '2026-10-24'), planned('race', 'tpl_race', '2026-10-25')], settings: auto }));
    expect(plan.autoSkip).toEqual([]);
    expect(plan.item).toMatchObject({ kind: 'ask', session: { id: 'test' } });
  });

  it('een test herkend via de rol, ook onder een ander id', () => {
    const own = { ...templates.find((t) => t.id === 'tpl_easy_run')!, id: 'tpl_eigen_test', name: 'Eigen test', roles: ['test' as const] };
    const plan = planMissed(input({ templates: [...templates, own], plannedSessions: [planned('own', 'tpl_eigen_test', '2026-10-24')], settings: auto }));
    expect(plan.autoSkip).toEqual([]);
    expect(plan.item).toMatchObject({ kind: 'ask', session: { id: 'own' } });
  });

  it('wat je zelf vastzette nooit vanzelf: dat krijgt de vraag', () => {
    const plan = planMissed(input({ plannedSessions: [planned('mine', 'tpl_easy_run', '2026-10-24', { lock: { by: 'user', at: '2026-10-20T08:00:00Z' } })], settings: auto }));
    expect(plan.autoSkip).toEqual([]);
    expect(plan.item).toMatchObject({ kind: 'ask', session: { id: 'mine' } });
  });

  it('een rij van een vakantie of tocht: niets vanzelf en geen vraag', () => {
    const leave = { periodId: 'vak', role: 'placed' } as unknown as PlannedSession['leave'];
    const plan = planMissed(input({ plannedSessions: [planned('trek', 'tpl_easy_run', '2026-10-24', { leave })], settings: auto }));
    expect(plan).toEqual({ item: undefined, autoSkip: [] });
    expect(planMissed(input({ plannedSessions: [planned('trek', 'tpl_easy_run', '2026-10-24', { leave })] })).item).toBeUndefined();
  });

  it('na Ongedaan maken niet nog eens vanzelf, en ook geen vraag', () => {
    const plan = planMissed(input({ plannedSessions: [planned('easy', 'tpl_easy_run', '2026-10-26')], settings: auto, memory: { auto: ['easy'] } }));
    expect(plan.autoSkip).toEqual([]);
    expect(plan.item).toBeUndefined();
  });

  it('de melding zegt wat er gebeurde en dat er geen training verzonnen is', () => {
    const easy = templates.find((t) => t.id === 'tpl_easy_run')!;
    const notice = autoSkipNotice([{ session: planned('easy', 'tpl_easy_run', '2026-10-26'), template: easy }], 2);
    expect(notice.title).toBe('Rustige duurloop overgeslagen');
    expect(notice.lines).toEqual(['Rustige duurloop van maandag 26 oktober overgeslagen']);
    expect(notice.why).toContain('Zelf overslaan');
    expect(notice.why).toContain('Ongedaan maken');
    const two = autoSkipNotice([
      { session: planned('easy', 'tpl_easy_run', '2026-10-25'), template: easy },
      { session: planned('easy2', 'tpl_easy_run', '2026-10-26'), template: easy },
    ], 2);
    expect(two.title).toBe('2 trainingen overgeslagen');
  });
});

describe('een log op een andere dag koppelen', () => {
  it('een horlogelog een dag later wordt een koppelvoorstel', () => {
    const plan = planMissed(input({ plannedSessions: [planned('easy', 'tpl_easy_run', '2026-10-27')], logs: [watchRun('w1', '2026-10-28')] }));
    expect(plan.item).toMatchObject({ kind: 'link', session: { id: 'easy' }, log: { id: 'w1' } });
  });

  it('gaat voor de vraag en voor Zelf overslaan', () => {
    const sessions = [planned('easy', 'tpl_easy_run', '2026-10-25')];
    const logs = [watchRun('w1', '2026-10-26')];
    expect(planMissed(input({ plannedSessions: sessions, logs })).item).toMatchObject({ kind: 'link' });
    const auto = planMissed(input({ plannedSessions: sessions, logs, settings: { ...MISSED_ADVICE, choice: 'auto' } }));
    expect(auto.autoSkip).toEqual([]);
    expect(auto.item).toMatchObject({ kind: 'link' });
  });

  it('een MacroFactor-log van dezelfde soort ook', () => {
    const plan = planMissed(input({ plannedSessions: [planned('up', 'tpl_upper_b', '2026-10-26')], logs: [mfStrength('m1', '2026-10-27')] }));
    expect(plan.item).toMatchObject({ kind: 'link', session: { id: 'up' }, log: { id: 'm1' } });
  });

  it('geen koppelvoorstel bij een andere soort', () => {
    const plan = planMissed(input({ plannedSessions: [planned('up', 'tpl_upper_a', '2026-10-26')], logs: [watchRun('w1', '2026-10-27')] }));
    expect(plan.item).toMatchObject({ kind: 'ask', session: { id: 'up' } });
  });

  it('geen koppelvoorstel bij een log die al gekoppeld is', () => {
    const other = planned('other', 'tpl_easy_run', '2026-10-27');
    const plan = planMissed(input({ plannedSessions: [planned('easy', 'tpl_easy_run', '2026-10-26'), other], logs: [{ ...watchRun('w1', '2026-10-27'), plannedSessionId: 'other' }] }));
    expect(plan.item).toMatchObject({ kind: 'ask', session: { id: 'easy' } });
  });

  it('geen koppelvoorstel bij een log die je zelf invulde, of te ver weg', () => {
    const sessions = [planned('easy', 'tpl_easy_run', '2026-10-24')];
    const hand = { ...watchRun('h1', '2026-10-25'), externalId: undefined, source: 'manual' as const };
    expect(planMissed(input({ plannedSessions: sessions, logs: [hand] })).item).toMatchObject({ kind: 'ask' });
    expect(planMissed(input({ plannedSessions: sessions, logs: [watchRun('w1', '2026-10-27')] })).item).toMatchObject({ kind: 'ask' });
  });

  it('een log hoort bij de dichtstbijzijnde training van dezelfde soort', () => {
    // Loop op dinsdag, gepland op maandag en dinsdag: hij hoort bij dinsdag, maandag krijgt de vraag.
    const sessions = [planned('mon', 'tpl_easy_run', '2026-10-26'), planned('tue', 'tpl_long_run', '2026-10-27')];
    const plan = planMissed(input({ plannedSessions: sessions, logs: [watchRun('w1', '2026-10-27')] }));
    expect(plan.item).toMatchObject({ kind: 'ask', session: { id: 'mon' } });
    const later = planMissed(input({ plannedSessions: sessions, logs: [watchRun('w1', '2026-10-27')], memory: { notNow: ['mon'] } }));
    expect(later.item).toMatchObject({ kind: 'link', session: { id: 'tue' }, log: { id: 'w1' } });
  });

  it('geen koppeling tussen een test en een gewone loop', () => {
    const plan = planMissed(input({ plannedSessions: [planned('test', 'tpl_test_run', '2026-10-26')], logs: [watchRun('w1', '2026-10-27')] }));
    expect(plan.item).toMatchObject({ kind: 'ask', session: { id: 'test' } });
  });

  it('na Liever niet niet meer voor dat paar', () => {
    const plan = planMissed(input({ plannedSessions: [planned('easy', 'tpl_easy_run', '2026-10-26')], logs: [watchRun('w1', '2026-10-27')], memory: { declined: ['w1|easy'] } }));
    expect(plan.item).toMatchObject({ kind: 'ask', session: { id: 'easy' } });
  });

  it('geen kaart voor de training van vandaag: een losse log van gisteren met een training van vandaag', () => {
    const plan = planMissed(input({ plannedSessions: [planned('today', 'tpl_easy_run', TODAY)], logs: [watchRun('w1', '2026-10-27')] }));
    expect(plan).toEqual({ item: undefined, autoSkip: [] });
    // Ook als er een eerdere training is: de log hoort bij vandaag, die van maandag krijgt de gewone vraag.
    const two = planMissed(input({ plannedSessions: [planned('mon', 'tpl_easy_run', '2026-10-26'), planned('today', 'tpl_easy_run', TODAY)], logs: [watchRun('w1', '2026-10-27')] }));
    expect(two.item).toMatchObject({ kind: 'link', session: { id: 'mon' } });
  });

  it('linkCandidates: dezelfde koppeling als de kaart, zonder het paar waarop je Liever niet zei', () => {
    const sessions = [planned('easy', 'tpl_easy_run', '2026-10-26')];
    const logs = [watchRun('w1', '2026-10-27')];
    expect([...linkCandidates({ plannedSessions: sessions, logs, templates, today: TODAY })].map(([id, l]) => [id, l.id])).toEqual([['easy', 'w1']]);
    expect(linkCandidates({ plannedSessions: sessions, logs, templates, today: TODAY, declined: ['w1|easy'] }).size).toBe(0);
    // Een log bij de training van vandaag: niets te koppelen.
    expect(linkCandidates({ plannedSessions: [planned('t', 'tpl_easy_run', TODAY)], logs, templates, today: TODAY }).size).toBe(0);
  });

  it('uit: geen koppelvoorstel', () => {
    const plan = planMissed(input({ plannedSessions: [planned('easy', 'tpl_easy_run', '2026-10-26')], logs: [watchRun('w1', '2026-10-27')], settings: { ...MISSED_ADVICE, link: false } }));
    expect(plan.item).toMatchObject({ kind: 'ask' });
  });

  it('de vraag in woorden, met de bron', () => {
    const easy = templates.find((t) => t.id === 'tpl_easy_run')!;
    const up = templates.find((t) => t.id === 'tpl_upper_b')!;
    expect(linkLine(planned('easy', 'tpl_easy_run', '2026-10-27'), easy, watchRun('w1', '2026-10-28'), TODAY)).toBe('Je rustige duurloop van dinsdag staat op woensdag in je horloge. Hoort die bij elkaar?');
    expect(linkEyebrow(watchRun('w1', '2026-10-28'))).toBe('Van je horloge');
    expect(linkEyebrow(mfStrength('m1', '2026-10-13'))).toBe('Van MacroFactor');
    expect(linkLine(planned('up', 'tpl_upper_b', '2026-10-12'), up, mfStrength('m1', '2026-10-13'), TODAY)).toBe('Je bovenlichaam B van maandag 12 oktober staat op dinsdag 13 oktober in MacroFactor. Hoort die bij elkaar?');
  });
});

describe('koppelen schrijft alleen de verwijzing, en Ongedaan maken haalt alleen die weg', () => {
  it('een log die nergens aan hing krijgt de verwijzing en het moment', () => {
    const log = watchRun('w1', '2026-10-28');
    const linked = linkLog(log, 'easy', '2026-10-28T09:00:00Z')!;
    expect(linked).toEqual({ ...log, plannedSessionId: 'easy', linkedLater: { at: '2026-10-28T09:00:00Z' } });
    expect(unlinkLog(linked)).toEqual(log);
  });

  it('een log die je zelf invulde wordt hier nooit gekoppeld', () => {
    expect(linkLog({ ...watchRun('h1', '2026-10-28'), externalId: undefined, source: 'manual' }, 'easy', '2026-10-28T09:00:00Z')).toBeUndefined();
  });

  it('een log die al ergens aan hing wordt nooit omgezet', () => {
    expect(linkLog({ ...watchRun('w1', '2026-10-28'), plannedSessionId: 'other' }, 'easy', '2026-10-28T09:00:00Z')).toBeUndefined();
  });

  it('een log die vanaf het begin gekoppeld was blijft gekoppeld bij ongedaan maken', () => {
    const original = { ...watchRun('w1', '2026-10-28'), plannedSessionId: 'easy' };
    expect(unlinkLog(original)).toBe(original);
  });

  it('alleen een heel moment is geldig', () => {
    expect(validLinkedLater({ at: '2026-10-28T09:00:00Z' })).toBe(true);
    expect(validLinkedLater({ at: 3 })).toBe(false);
    expect(validLinkedLater('ja')).toBe(false);
  });
});

describe('back-up: SessionLog.linkedLater', () => {
  it('een oud bestand zonder het veld leest zoals het was, een heel veld blijft, iets kapots valt weg', () => {
    const log = { ...watchRun('w1', '2026-10-28'), plannedSessionId: 'easy' };
    expect(migrateLogLinkedLater(log)).toBe(log);
    const linked = { ...log, linkedLater: { at: '2026-10-28T09:00:00Z' } };
    expect(migrateLogLinkedLater(linked)).toBe(linked);
    const broken = { ...log, linkedLater: 'gisteren' } as unknown as SessionLog;
    expect(migrateLogLinkedLater(broken)).toEqual(log);
  });
});

// Besluit docs/beslissingen/2026-11-12-stairmaster-horloge.md.
describe('koppelen achteraf: een wandellog bij heuvelintervallen op de StairMaster', () => {
  const hills = planned('hills', 'tpl_hill_intervals', '2026-10-26');
  const walkLog = (id: string, completedDate: string): SessionLog => ({
    id, templateId: 'tpl_herstel', type: 'recovery', sport: 'hiking', completedDate, completedAt: `${completedDate}T08:00:00Z`, variant: 'custom', durationMinutes: 39,
    externalId: `intervals.icu:i-${id}`, source: 'garmin', cardioData: { durationMinutes: 39, source: 'garmin' },
  } as SessionLog);
  const links = (logs: SessionLog[], places?: Record<string, string>) => [...linkCandidates({ plannedSessions: [hills], logs, templates, today: TODAY, places })].map(([id, l]) => [id, l.id]);

  it('met de keuze en op dezelfde dag: het koppelvoorstel', () => {
    expect(links([walkLog('w1', '2026-10-26')], { hills: 'stairmaster_intervals' })).toEqual([['hills', 'w1']]);
    const plan = planMissed(input({ plannedSessions: [hills], logs: [walkLog('w1', '2026-10-26')], places: { hills: 'stairmaster_intervals' } }));
    expect(plan.item).toMatchObject({ kind: 'link', session: { id: 'hills' }, log: { id: 'w1' } });
  });
  it('zonder keuze of met een andere keuze: geen koppeling, zoals het was', () => {
    expect(links([walkLog('w1', '2026-10-26')])).toEqual([]);
    expect(links([walkLog('w1', '2026-10-26')], { hills: 'incline_treadmill_intervals' })).toEqual([]);
  });
  it('een wandeling op een andere dag: geen koppeling', () => {
    expect(links([walkLog('w1', '2026-10-27')], { hills: 'stairmaster_intervals' })).toEqual([]);
    expect(links([walkLog('w1', '2026-10-25')], { hills: 'stairmaster_intervals' })).toEqual([]);
  });
  it('koppelen vult alleen de lege verwijzing: het log zelf blijft wat het was', () => {
    const log = walkLog('w1', '2026-10-26');
    const linked = linkLog(log, 'hills', '2026-10-28T09:00:00.000Z')!;
    expect({ ...linked, plannedSessionId: undefined, linkedLater: undefined }).toEqual({ ...log, plannedSessionId: undefined, linkedLater: undefined });
    expect(unlinkLog(linked)).toEqual(log);
  });
});

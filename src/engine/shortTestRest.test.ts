(globalThis as unknown as { process: { env: Record<string, string> } }).process.env.TZ = 'Europe/Amsterdam';

import { describe, expect, it } from 'vitest';
import type { PlannedSession, SessionLog } from '../models/training';
import type { StreamSet } from '../models/activityDetail';
import { linkLog, unlinkLog } from './missedTraining';
import {
  plannedTestLogIds, shortTestBriefing, shortTestDone, shortTestLogIds, shortTestRunMinutes, shortTestSessionIds, shortTestView, watchShortTest,
} from './shortTest';

// I-91, de rest van de korte test (docs/beslissingen/2026-11-20-korte-test-rest.md). Alles nagemaakt.

const s = (id: string, date: string, extra: Partial<PlannedSession> = {}): PlannedSession =>
  ({ id, templateId: 'tpl_easy_run', scheduledDate: date, weekStartDate: date, status: 'planned', order: 0, ...extra } as PlannedSession);

// Een log van het horloge: los (zonder geplande training) tenzij `plannedSessionId` meekomt.
function log(id: string, date: string, extra: Partial<SessionLog> = {}): SessionLog {
  return {
    id, templateId: 'tpl_easy_run', type: 'cardio', completedDate: date, completedAt: `${date}T08:45:00`, variant: 'full', durationMinutes: 40,
    cardioData: { distanceKm: 6, durationMinutes: 40 }, rpe: 4, source: 'garmin', externalId: `act_${id}`, ...extra,
  } as unknown as SessionLog;
}

const accepted = { answer: 'accepted' as const, date: '2026-11-02', paceSecKm: 320 };
const idsOf = (sessions: PlannedSession[], logs: SessionLog[], today: string) => [...shortTestSessionIds(sessions, accepted, true, shortTestDone(today, logs))].sort();

describe('een losse loop, koppelen achteraf en ontkoppelen (punt 1)', () => {
  // Week van maandag 16 november: dinsdag en donderdag een rustige loop; de week erna op woensdag.
  const sessions = [s('di', '2026-11-17'), s('do', '2026-11-19'), s('wo2', '2026-11-25')];
  const today = '2026-11-18';

  it('een los horlogelog telt niet als gedaan: de gemiste loop blijft gemist', () => {
    const loose = log('los', '2026-11-18');
    expect(idsOf(sessions, [], today)).toEqual(['do', 'wo2']);
    expect(idsOf(sessions, [loose], today)).toEqual(['do', 'wo2']);
    expect(shortTestDone(today, [loose]).logged.size).toBe(0);
  });

  it('koppelen achteraf: de loop telt als gedaan, ontkoppelen zet het terug', () => {
    const loose = log('los', '2026-11-18');
    const before = idsOf(sessions, [loose], today);
    const linked = linkLog(loose, 'di', '2026-11-18T20:00:00.000Z')!;
    expect(idsOf(sessions, [linked], today)).toEqual(['di', 'wo2']);
    expect(shortTestDone(today, [linked]).ranOn?.get('di')).toBe('2026-11-18');
    expect(idsOf(sessions, [unlinkLog(linked)], today)).toEqual(before);
  });

  it('historie blijft staan: koppelen maakt een nieuw log met alleen de verwijzing erbij', () => {
    const loose = Object.freeze(log('los', '2026-11-18'));
    const linked = linkLog(loose, 'di', '2026-11-18T20:00:00.000Z')!;
    const { plannedSessionId, linkedLater, ...rest } = linked;
    expect(plannedSessionId).toBe('di');
    expect(linkedLater).toEqual({ at: '2026-11-18T20:00:00.000Z' });
    expect(rest).toEqual(loose);
    // Lezen verandert niets aan de logs.
    const logs = Object.freeze([Object.freeze(linked)]) as readonly SessionLog[];
    shortTestDone(today, logs);
    expect(unlinkLog(linked)).toEqual(loose);
  });

  it('de echte dag telt, niet de dag van het plan: een latere koppeling gaat niet voor een loop die eerder was', () => {
    // Dinsdag stond gepland maar liep je pas donderdag; woensdag liep je de geplande loop van woensdag.
    const week = [s('di', '2026-11-17'), s('wo', '2026-11-18'), s('vr', '2026-11-20')];
    const wed = log('w', '2026-11-18', { plannedSessionId: 'wo' });
    const late = linkLog(log('los', '2026-11-19'), 'di', '2026-11-19T20:00:00.000Z')!;
    expect(idsOf(week, [wed], '2026-11-20')).toEqual(['wo']);
    expect(idsOf(week, [wed, late], '2026-11-20')).toEqual(['wo']);
    expect(idsOf(week, [late, wed], '2026-11-20')).toEqual(['wo']);
  });

  it('over de weekgrens: de zondagloop die je maandag liep telt in de week van maandag', () => {
    const two = [s('zo', '2026-11-15'), s('wo', '2026-11-18'), s('wo2', '2026-11-25')];
    const loose = log('los', '2026-11-16');
    const now = '2026-11-17';
    // Los: de week van 16 november krijgt de test nog op woensdag.
    expect(idsOf(two, [loose], now)).toEqual(['wo', 'wo2']);
    // Gekoppeld aan zondag: gelopen op maandag, dus de week van 16 november heeft zijn loop al.
    const linked = linkLog(loose, 'zo', '2026-11-17T09:00:00.000Z')!;
    expect(idsOf(two, [linked], now)).toEqual(['wo2', 'zo']);
    expect(idsOf(two, [unlinkLog(linked)], now)).toEqual(['wo', 'wo2']);
  });

  it('een gewoon gekoppeld log houdt de dag van het plan', () => {
    // Zonder linkedLater (vanzelf afgevinkt of zelf ingevuld) verandert er niets aan de oude regel.
    const two = [s('zo', '2026-11-15'), s('wo', '2026-11-18')];
    const own = log('eigen', '2026-11-16', { plannedSessionId: 'zo' });
    expect(shortTestDone('2026-11-17', [own]).ranOn?.size).toBe(0);
    expect(idsOf(two, [own], '2026-11-17')).toEqual(['wo', 'zo']);
  });

  it('een loop van voor de reeks telt niet, ook niet na koppelen', () => {
    const early = [s('ma', '2026-11-02'), s('do', '2026-11-05')];
    const linked = linkLog(log('los', '2026-11-01'), 'ma', '2026-11-03T09:00:00.000Z')!;
    expect(idsOf(early, [linked], '2026-11-04')).toEqual(['do']);
  });

  it('de dag zelf: vandaag telt nog niet als voorbij', () => {
    // Dinsdag is vandaag en nog niet gelopen: hij houdt de test, donderdag krijgt hem niet.
    expect(idsOf(sessions, [], '2026-11-17')).toEqual(['di', 'wo2']);
    // Een dag later zonder log is hij gemist.
    expect(idsOf(sessions, [], '2026-11-18')).toEqual(['do', 'wo2']);
    // Vandaag gelopen en vandaag gekoppeld: gedaan op vandaag.
    const linked = linkLog(log('los', '2026-11-17'), 'di', '2026-11-17T19:00:00.000Z')!;
    expect(idsOf(sessions, [linked], '2026-11-17')).toEqual(['di', 'wo2']);
  });

  it('een rij in een vakantie of tocht: vervallen is voor de test gemist, overgeslagen telt niet, gelopen wel', () => {
    // Vakantie van 16 tot en met 20 november. Dinsdag bleef staan en verviel, donderdag zette het voorstel op overgeslagen.
    const away = [s('di', '2026-11-17'), s('do', '2026-11-19', { status: 'skipped' }), s('za', '2026-11-21'), s('wo2', '2026-11-25')];
    // Onderweg, op woensdag: dinsdag is voorbij zonder log, donderdag is overgeslagen, zaterdag krijgt de test.
    expect(idsOf(away, [], '2026-11-18')).toEqual(['wo2', 'za']);
    // Liep je dinsdag toch (los, later gekoppeld), dan is dat de loop van de week.
    const linked = linkLog(log('los', '2026-11-17'), 'di', '2026-11-22T09:00:00.000Z')!;
    expect(idsOf(away, [linked], '2026-11-22')).toEqual(['di', 'wo2']);
    expect(idsOf(away, [unlinkLog(linked)], '2026-11-22')).toEqual(['wo2']);
    // Een rustige loop die in de vakantie blijft staan en nog komt, draagt de test gewoon.
    expect(idsOf([s('vr', '2026-11-20'), s('wo2', '2026-11-25')], [], '2026-11-18')).toEqual(['vr', 'wo2']);
  });

  it('Briefing en horloge lezen dezelfde dag', () => {
    const two = [s('zo', '2026-11-15'), s('wo', '2026-11-18'), s('wo2', '2026-11-25')];
    const linked = linkLog(log('los', '2026-11-16'), 'zo', '2026-11-17T09:00:00.000Z')!;
    const done = shortTestDone('2026-11-17', [linked]);
    const watch = watchShortTest({ shortTestSeries: accepted }, two, done)!;
    expect([...watch.ids].sort()).toEqual(['wo2', 'zo']);
    const base = { minutes: 40, sessions: two, on: true, series: accepted, paces: undefined, ...done };
    expect(shortTestBriefing({ ...base, session: two[1] })).toBeUndefined();
    expect(shortTestBriefing({ ...base, session: two[2] })?.kind).toBe('brief');
  });
});

// Een nagemaakte rustige loop van 40 minuten met op minuut 10 vier minuten op 5:20 en een minuut stil.
function run(hrEnd: number): StreamSet {
  const timeSec: number[] = [];
  for (let t = 0; t <= 2400; t++) timeSec.push(t);
  const speed = (t: number) => (t >= 600 && t < 840 ? 1000 / 320 : t >= 840 && t < 900 ? 0 : 1000 / 390);
  let d = 0;
  const distanceM = timeSec.map((t, i) => {
    if (i > 0) d += speed(t - 1);
    return d;
  });
  const heartRate = timeSec.map((t) => (t < 600 ? 140 : t < 780 ? 150 + ((t - 600) / 180) * (hrEnd - 150) : t < 840 ? hrEnd : t < 900 ? hrEnd - (30 * (t - 840)) / 60 : 140));
  return { timeSec, distanceM, heartRate, stanceBalanceLeftPct: timeSec.map(() => 50) };
}

describe('alleen geplande testlopen tellen voor je midden (punt 3)', () => {
  const series = { answer: 'accepted' as const, date: '2026-10-01', paceSecKm: 320 };
  const dates = ['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26', '2026-11-02'];
  const sessions = [...dates.map((d, i) => s(`p${i}`, d)), s('p3b', '2026-10-29'), s('p5', '2026-11-10')];
  const planned = dates.map((d, i) => log(`r${i}`, d, { plannedSessionId: `p${i}` }));
  const today = '2026-11-20';
  const view = (logId: string, logs: SessionLog[], hr: Record<string, number> = {}) =>
    shortTestView({ logId, logs, streams: new Map(logs.map((l) => [l.id, run(hr[l.id] ?? 165)])), series, sessions, today });

  it('een losse loop met een test erin: de feiten met de reden, geen oordeel', () => {
    const loose = log('los', '2026-11-04');
    const v = view('los', [...planned, loose])!;
    expect(v.word).toBeUndefined();
    expect(v.line).toBe('Deze loop stond niet als korte test in je week. Je ziet de feiten, zonder oordeel.');
    expect(v.askStrap).toBe(false);
    expect(v.facts[0]).toBe('Je liep 5:20 per km; je testtempo is 5:20.');
  });

  it('losse lopen schuiven je midden niet op', () => {
    // Vier geplande tests op 165, dan vier losse lopen op 150, dan de geplande test van 2 november op 165.
    const loose = ['2026-10-27', '2026-10-28', '2026-10-30', '2026-10-31'].map((d, i) => log(`los${i}`, d));
    const hr = Object.fromEntries(loose.map((l) => [l.id, 150]));
    expect(view('r4', planned)).toMatchObject({ word: 'Normaal' });
    expect(view('r4', [...planned, ...loose], hr)).toMatchObject({ word: 'Normaal' });
    expect(plannedTestLogIds([...planned, ...loose], sessions, series, today)).toEqual(new Set(['r0', 'r1', 'r2', 'r3', 'r4']));
    expect(shortTestLogIds([...planned, ...loose], series, 'r4', new Set(['r0', 'r1', 'r2', 'r3', 'r4']))).toEqual(['r0', 'r1', 'r2', 'r3', 'r4']);
  });

  it('de tweede rustige loop van een week is geen geplande testloop', () => {
    // p3 (26 oktober) droeg de test; p3b (29 oktober) is de tweede loop van die week.
    const second = log('tweede', '2026-10-29', { plannedSessionId: 'p3b' });
    expect(view('tweede', [...planned, second])?.line).toBe('Deze loop stond niet als korte test in je week. Je ziet de feiten, zonder oordeel.');
    expect(view('r4', [...planned, second], { tweede: 150 })).toMatchObject({ word: 'Normaal' });
  });

  it('koppelen achteraf laat de loop meetellen op zijn echte dag, ontkoppelen haalt hem er weer uit', () => {
    // De geplande loop van 10 november (p5) liep je op 11 november met het horloge, los.
    const loose = log('los', '2026-11-11');
    expect(view('los', [...planned, loose], { los: 150 })?.word).toBeUndefined();
    const linked = linkLog(loose, 'p5', '2026-11-13T09:00:00.000Z')!;
    const logs = [...planned, linked];
    expect(plannedTestLogIds(logs, sessions, series, today).has('los')).toBe(true);
    // Vijf geplande tests op 165 ervoor, deze op 150 met dezelfde zwaarte: Beter.
    expect(view('los', logs, { los: 150 })).toMatchObject({ word: 'Beter' });
    const back = [...planned, unlinkLog(linked)];
    expect(plannedTestLogIds(back, sessions, series, today).has('los')).toBe(false);
    expect(view('los', back, { los: 150 })?.word).toBeUndefined();
  });

  it('een geplande testloop houdt zijn oordeel, ook met de instelling Korte test later uit', () => {
    // plannedTestLogIds leest de instelling niet: wat je liep blijft staan.
    expect(plannedTestLogIds(planned, sessions, series, today).size).toBe(5);
    expect(plannedTestLogIds(planned, sessions, { answer: 'declined', date: '2026-10-01' }, today).size).toBe(0);
  });
});

describe('één regel voor de 25 minuten (punt 4)', () => {
  const plan = (minutes: number) => ({ timeline: [{ seconds: minutes * 60 }] });

  it('de kortste van de planning en de workout', () => {
    expect(shortTestRunMinutes(s('a', '2026-11-17'), plan(40))).toBe(40);
    expect(shortTestRunMinutes(s('a', '2026-11-17', { plannedMinutes: 20 }), plan(40))).toBe(20);
    expect(shortTestRunMinutes(s('a', '2026-11-17', { plannedMinutes: 45 }), plan(20))).toBe(20);
    expect(shortTestRunMinutes(s('a', '2026-11-17', { plannedMinutes: 30 }), undefined)).toBe(30);
    expect(shortTestRunMinutes(undefined, plan(40))).toBe(40);
    expect(shortTestRunMinutes(undefined, undefined)).toBeUndefined();
  });

  it('de tijdlijn telt in stappen op', () => {
    expect(shortTestRunMinutes(undefined, { timeline: [{ seconds: 600 }, { seconds: 900 }] })).toBe(25);
  });
});

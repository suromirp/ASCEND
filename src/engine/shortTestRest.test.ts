(globalThis as unknown as { process: { env: Record<string, string> } }).process.env.TZ = 'Europe/Amsterdam';

import { describe, expect, it } from 'vitest';
import type { PlannedSession, SessionLog } from '../models/training';
import type { StreamSet } from '../models/activityDetail';
import { linkLog, unlinkLog } from './missedTraining';
import {
  countedShortTests, findShortTest, shortTestBriefing, shortTestDone, shortTestLogIds, shortTestRunMinutes, shortTestSessionIds, shortTestView, watchShortTest,
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

  it('een overgeslagen loop die je toch liep telt als gedaan: het log wint', () => {
    const week = [s('di', '2026-11-17', { status: 'skipped' }), s('do', '2026-11-19'), s('wo2', '2026-11-25')];
    // Zonder log is dinsdag overgeslagen en krijgt donderdag de test.
    expect(idsOf(week, [], '2026-11-18')).toEqual(['do', 'wo2']);
    // Met een log aan dinsdag is hij gedaan, net als in de rest van de app.
    expect(idsOf(week, [log('d', '2026-11-17', { plannedSessionId: 'di' })], '2026-11-18')).toEqual(['di', 'wo2']);
    // Een los log maakt een overgeslagen loop niet gedaan.
    expect(idsOf(week, [log('los', '2026-11-17')], '2026-11-18')).toEqual(['do', 'wo2']);
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

// Een rustige loop zonder teststuk: 40 minuten gelijk tempo.
function plain(): StreamSet {
  const timeSec: number[] = [];
  for (let t = 0; t <= 2400; t++) timeSec.push(t);
  return { timeSec, distanceM: timeSec.map((t) => (t * 1000) / 390), heartRate: timeSec.map(() => 140), stanceBalanceLeftPct: timeSec.map(() => 50) };
}

describe('wat achteraf telt voor je midden (punt 3)', () => {
  const series = { answer: 'accepted' as const, date: '2026-10-01', paceSecKm: 320 };
  const dates = ['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26', '2026-11-02'];
  const planned = dates.map((d, i) => log(`r${i}`, d, { plannedSessionId: `p${i}` }));
  const LOOSE = 'Deze loop stond niet in je week. Zeg je op Vandaag Akkoord op de vraag of hij bij je geplande loop hoort, dan telt hij mee.';
  const SECOND = 'Deze week telde al een korte test. Je ziet de feiten, zonder oordeel.';
  // `hr` de hartslag aan het eind van het teststuk per log (standaard 165); `noTest` de lopen zonder teststuk.
  const view = (logId: string, logs: SessionLog[], hr: Record<string, number> = {}, noTest: string[] = []) =>
    shortTestView({ logId, logs, streams: new Map(logs.map((l) => [l.id, noTest.includes(l.id) ? plain() : run(hr[l.id] ?? 165)])), series });

  it('de nagemaakte loop zonder teststuk heeft er ook geen', () => {
    expect(findShortTest(plain(), 320)).toBeUndefined();
    expect(findShortTest(run(165), 320)).toBeDefined();
  });

  it('een losse loop met een test erin: de feiten, en wat je doet om hem te laten tellen', () => {
    const loose = log('los', '2026-11-04');
    const v = view('los', [...planned, loose])!;
    expect(v.word).toBeUndefined();
    expect(v.line).toBe(LOOSE);
    expect(v.askStrap).toBe(false);
    expect(v.facts[0]).toBe('Je liep 5:20 per km; je testtempo is 5:20.');
  });

  it('losse lopen schuiven je midden niet op', () => {
    // Vier geplande tests op 165, dan vier losse lopen op 150, dan de geplande test van 2 november op 165.
    const loose = ['2026-10-27', '2026-10-28', '2026-10-30', '2026-10-31'].map((d, i) => log(`los${i}`, d));
    const hr = Object.fromEntries(loose.map((l) => [l.id, 150]));
    expect(view('r4', planned)).toMatchObject({ word: 'Normaal' });
    expect(view('r4', [...planned, ...loose], hr)).toMatchObject({ word: 'Normaal' });
    expect(shortTestLogIds([...planned, ...loose], series, 'r4')).toEqual(['r0', 'r1', 'r2', 'r3', 'r4']);
    // De loop waar je naar kijkt komt mee, ook als hij los is.
    expect(shortTestLogIds([...planned, ...loose], series, 'los1')).toContain('los1');
  });

  it('twee lopen met een teststuk in een week: de vroegste telt, de tweede krijgt de feiten', () => {
    // r3 (26 oktober) en een tweede geplande loop op 29 oktober, allebei met een teststuk.
    const second = log('tweede', '2026-10-29', { plannedSessionId: 'p3b' });
    expect(view('tweede', [...planned, second])?.line).toBe(SECOND);
    expect(view('tweede', [...planned, second])?.word).toBeUndefined();
    expect(view('r3', [...planned, second])?.line).not.toBe(SECOND);
    expect(view('r4', [...planned, second], { tweede: 150 })).toMatchObject({ word: 'Normaal' });
    // De volgorde van de logs doet er niet toe.
    expect(view('tweede', [second, ...planned])?.line).toBe(SECOND);
  });

  it('een losse loop telt niet, na koppelen wel, na ontkoppelen weer niet', () => {
    // De geplande loop van 10 november (p5) liep je op 11 november met het horloge, los.
    const loose = log('los', '2026-11-11');
    expect(view('los', [...planned, loose], { los: 150 })).toMatchObject({ line: LOOSE });
    const linked = linkLog(loose, 'p5', '2026-11-13T09:00:00.000Z')!;
    // Vijf geplande tests op 165 ervoor, deze op 150 met dezelfde zwaarte: Beter.
    expect(view('los', [...planned, linked], { los: 150 })).toMatchObject({ word: 'Beter' });
    const back = view('los', [...planned, unlinkLog(linked)], { los: 150 })!;
    expect(back.word).toBeUndefined();
    expect(back.line).toBe(LOOSE);
  });

  describe('een eerdere loop van dezelfde week die pas later een log krijgt (Warden, 20 november)', () => {
    // Rustige lopen op dinsdag 17 en donderdag 19 november. Dinsdag had geen log, dus donderdag droeg de
    // test en je liep hem (hartslag 150 tegen een midden van 165: Beter).
    const thu = log('do', '2026-11-19', { plannedSessionId: 'do' });
    const base = [...planned, thu];

    it('donderdag telt', () => {
      expect(view('do', base, { do: 150 })).toMatchObject({ word: 'Beter' });
    });

    it('dinsdag later afgevinkt zonder teststuk: donderdag blijft tellen', () => {
      const tue = log('di', '2026-11-17', { plannedSessionId: 'di', source: 'manual' });
      for (const logs of [[...base, tue], [tue, ...base]]) {
        expect(view('do', logs, { do: 150 }, ['di'])).toMatchObject({ word: 'Beter' });
      }
    });

    it('een losse dinsdagloop later gekoppeld, zonder teststuk: donderdag blijft tellen', () => {
      const tue = linkLog(log('di', '2026-11-17'), 'di', '2026-11-20T09:00:00.000Z')!;
      expect(view('do', [...base, tue], { do: 150 }, ['di'])).toMatchObject({ word: 'Beter' });
      expect(view('do', [...base, unlinkLog(tue)], { do: 150 }, ['di'])).toMatchObject({ word: 'Beter' });
    });

    it('had de dinsdagloop zelf een teststuk, dan telt hij: de vroegste van de week', () => {
      const tue = linkLog(log('di', '2026-11-17'), 'di', '2026-11-20T09:00:00.000Z')!;
      expect(view('di', [...base, tue], { do: 150, di: 150 })).toMatchObject({ word: 'Beter' });
      expect(view('do', [...base, tue], { do: 150, di: 150 })).toMatchObject({ line: SECOND });
      // Ontkoppel je hem weer, dan telt donderdag als voorheen.
      expect(view('do', [...base, unlinkLog(tue)], { do: 150, di: 150 })).toMatchObject({ word: 'Beter' });
    });

    it('de week heeft nooit geen test als er een gelopen is', () => {
      const tue = log('di', '2026-11-17', { plannedSessionId: 'di', source: 'manual' });
      // Een test in de week erna leest donderdag in zijn midden: vier op 165 en een op 150 is nog 165,
      // maar het aantal tests waar hij op leunt is zes, niet vijf.
      const next = log('wo2', '2026-11-25', { plannedSessionId: 'wo2' });
      const logs = [...base, tue, next];
      const found = logs.filter((l) => l.id !== 'di').map((l) => ({ logId: l.id, date: l.completedDate, at: l.completedAt, valid: true }));
      const counted = countedShortTests(found as never, logs);
      expect(counted.filter((r) => r.valid).map((r) => r.logId)).toEqual(['r0', 'r1', 'r2', 'r3', 'r4', 'do', 'wo2']);
    });
  });

  it('een ongeldige eerste test en een geldige latere in een week: de latere telt', () => {
    // Dinsdag 17 november zonder borstband (ongeldig), donderdag 19 november geldig op 150.
    const tue = log('di', '2026-11-17', { plannedSessionId: 'di' });
    const thu = log('do', '2026-11-19', { plannedSessionId: 'do' });
    const logs = [...planned, tue, thu];
    const { stanceBalanceLeftPct: _band, ...noStrap } = run(165);
    void _band;
    const streams = new Map<string, StreamSet>(logs.map((l) => [l.id, l.id === 'di' ? noStrap : run(l.id === 'do' ? 150 : 165)]));
    const of = (logId: string) => shortTestView({ logId, logs, streams, series })!;
    expect(of('do')).toMatchObject({ word: 'Beter' });
    // De ongeldige houdt zijn eigen reden, niet "Deze week telde al een korte test".
    expect(of('di').word).toBeUndefined();
    expect(of('di').line).not.toBe(SECOND);
    expect(of('di').line).not.toBe(LOOSE);
    expect(of('di').askStrap).toBe(true);
    // Ook andersom: een ongeldige latere test krijgt zijn eigen reden, niet de zin van de tweede.
    const streams2 = new Map<string, StreamSet>(logs.map((l) => [l.id, l.id === 'do' ? noStrap : run(l.id === 'di' ? 150 : 165)]));
    expect(shortTestView({ logId: 'di', logs, streams: streams2, series })).toMatchObject({ word: 'Beter' });
    expect(shortTestView({ logId: 'do', logs, streams: streams2, series })?.askStrap).toBe(true);
  });

  it('per week, op de dag van het log: zondag en maandag zijn twee weken', () => {
    const sun = log('zo', '2026-11-08', { plannedSessionId: 'a' });
    const mon = log('ma', '2026-11-09', { plannedSessionId: 'b' });
    expect(view('ma', [...planned, sun, mon])?.line).not.toBe(SECOND);
    // Twee op een dag: de vroegste op de klok telt.
    const late = log('laat', '2026-11-09', { plannedSessionId: 'c', completedAt: '2026-11-09T18:00:00' });
    expect(view('laat', [...planned, mon, late])?.line).toBe(SECOND);
    expect(view('ma', [...planned, late, mon])?.line).not.toBe(SECOND);
  });

  it('zonder aangenomen reeks is er niets te lezen', () => {
    expect(shortTestLogIds(planned, { answer: 'declined', date: '2026-10-01' })).toEqual([]);
    expect(shortTestLogIds(planned, series)).toEqual(['r0', 'r1', 'r2', 'r3', 'r4']);
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

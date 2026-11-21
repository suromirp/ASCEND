(globalThis as unknown as { process: { env: Record<string, string> } }).process.env.TZ = 'Europe/Amsterdam';

import { describe, expect, it } from 'vitest';
import type { SessionLog } from '../models/training';
import type { StreamSet } from '../models/activityDetail';
import { linkLog, unlinkLog } from './missedTraining';
import { shortTestView } from './shortTest';
import { linkShortTestLine, linkShortTestLogIds, linkShortTestShift, linkShortTestState } from './linkShortTest';

// I-95: het koppelvoorstel zegt het als de koppeling verandert welke korte test van de week telt. Alles nagemaakt.

function log(id: string, date: string, extra: Partial<SessionLog> = {}): SessionLog {
  return {
    id, templateId: 'tpl_easy_run', type: 'cardio', completedDate: date, completedAt: `${date}T08:45:00`, variant: 'full', durationMinutes: 40,
    cardioData: { distanceKm: 6, durationMinutes: 40 }, rpe: 4, source: 'garmin', externalId: `act_${id}`, ...extra,
  } as unknown as SessionLog;
}

// Een rustige loop van 40 minuten met op minuut 10 vier minuten op 5:20 en een minuut stil.
function run(): StreamSet {
  const timeSec: number[] = [];
  for (let t = 0; t <= 2400; t++) timeSec.push(t);
  const speed = (t: number) => (t >= 600 && t < 840 ? 1000 / 320 : t >= 840 && t < 900 ? 0 : 1000 / 390);
  let d = 0;
  const distanceM = timeSec.map((t, i) => {
    if (i > 0) d += speed(t - 1);
    return d;
  });
  const heartRate = timeSec.map((t) => (t < 600 ? 140 : t < 780 ? 150 + ((t - 600) / 180) * 15 : t < 840 ? 165 : t < 900 ? 165 - (30 * (t - 840)) / 60 : 140));
  return { timeSec, distanceM, heartRate, stanceBalanceLeftPct: timeSec.map(() => 50) };
}

// Zonder teststuk: 40 minuten gelijk tempo.
function plain(): StreamSet {
  const timeSec: number[] = [];
  for (let t = 0; t <= 2400; t++) timeSec.push(t);
  return { timeSec, distanceM: timeSec.map((t) => (t * 1000) / 390), heartRate: timeSec.map(() => 140), stanceBalanceLeftPct: timeSec.map(() => 50) };
}

const series = { answer: 'accepted' as const, date: '2026-10-01', paceSecKm: 320 };
// Week van maandag 16 november. De geplande rustige loop van donderdag is gelopen, met een geldige test.
const thu = log('do', '2026-11-19', { plannedSessionId: 'p_do' });
// Een losse loop van het horloge op dinsdag; de geplande loop van dinsdag (p_di) heeft geen log.
const tue = log('los', '2026-11-17');
const both = () => new Map<string, StreamSet>([['do', run()], ['los', run()]]);
const shift = (loose: SessionLog, logs: SessionLog[], noTest: string[] = [], sessionId = 'p_di') =>
  linkShortTestShift({ log: loose, sessionId, logs, streams: new Map(logs.map((l) => [l.id, noTest.includes(l.id) ? plain() : run()])), series });

describe('verandert de koppeling welke korte test van de week telt', () => {
  it('een losse loop met teststuk eerder in de week: de latere test telt niet meer', () => {
    expect(shift(tue, [thu, tue])).toEqual({ logId: 'do', date: '2026-11-19', sameDay: false });
    // Dezelfde regel als het logblad na het koppelen: donderdag is dan de tweede van de week.
    const linked = linkLog(tue, 'p_di', '2026-11-20T10:00:00.000Z')!;
    const after = [thu, linked];
    const streams = new Map(after.map((l) => [l.id, run()]));
    expect(shortTestView({ logId: 'do', logs: after, streams, series })?.line).toBe('Deze week telde al een korte test. Je ziet de feiten, zonder oordeel.');
    // Ontkoppelen zet het terug, en dan zegt het voorstel weer hetzelfde.
    const back = unlinkLog(linked);
    expect(shift(back, [thu, back])).toEqual({ logId: 'do', date: '2026-11-19', sameDay: false });
  });

  it('de zin', () => {
    const today = '2026-11-20';
    expect(linkShortTestLine({ logId: 'do', date: '2026-11-19', sameDay: false }, today)).toBe('Je korte test van donderdag telt dan niet meer, die uit deze loop wel.');
    expect(linkShortTestLine({ logId: 'do', date: '2026-11-17', sameDay: true }, today)).toBe('Je latere korte test van dinsdag telt dan niet meer, die uit deze loop wel.');
    // Een week of verder terug: met de datum.
    expect(linkShortTestLine({ logId: 'do', date: '2026-11-12', sameDay: false }, today)).toBe('Je korte test van donderdag 12 november telt dan niet meer, die uit deze loop wel.');
    // De test die nu telt is van vandaag.
    expect(linkShortTestLine({ logId: 'do', date: '2026-11-20', sameDay: false }, today)).toBe('Je korte test van vandaag telt dan niet meer, die uit deze loop wel.');
    expect(linkShortTestLine({ logId: 'do', date: '2026-11-20', sameDay: true }, today)).toBe('Je latere korte test van vandaag telt dan niet meer, die uit deze loop wel.');
    expect(linkShortTestLine(undefined, today)).toBeUndefined();
  });

  it('een koppeling die niets verandert: de losse loop is later dan de test die telt', () => {
    const fri = log('los', '2026-11-20');
    expect(shift(fri, [thu, fri], [], 'p_vr')).toBeUndefined();
  });

  it('geen andere test die telt in de week: er verschuift niets', () => {
    expect(shift(tue, [tue])).toBeUndefined();
    // De latere loop had geen teststuk.
    expect(shift(tue, [thu, tue], ['do'])).toBeUndefined();
    // De latere loop is zelf los: hij telde al niet.
    const looseThu = log('do', '2026-11-19');
    expect(shift(tue, [looseThu, tue])).toBeUndefined();
  });

  it('een losse loop zonder teststuk verdringt niets', () => {
    expect(shift(tue, [thu, tue], ['los'])).toBeUndefined();
  });

  it('een ongeldig teststuk in de losse loop verdringt niets', () => {
    const logs = [thu, tue];
    const { stanceBalanceLeftPct: _band, ...noStrap } = run();
    void _band;
    const streams = new Map<string, StreamSet>([['do', run()], ['los', noStrap]]);
    expect(linkShortTestShift({ log: tue, sessionId: 'p_di', logs, streams, series })).toBeUndefined();
    // Met de keuze voor de pols telt hij wel, zoals op het logblad.
    expect(linkShortTestShift({ log: tue, sessionId: 'p_di', logs, streams, series, noStrap: 'margin' })).toBeDefined();
  });

  it('de test in een andere week: zondag en maandag zijn twee weken', () => {
    const sun = log('los', '2026-11-15');
    const mon = log('ma', '2026-11-16', { plannedSessionId: 'p_ma' });
    expect(shift(sun, [mon, thu, sun], [], 'p_zo')).toBeUndefined();
    // Ook met de zondagloop vooraan: de tests van de week erna horen niet bij zijn week.
    expect(shift(sun, [sun, mon, thu], [], 'p_zo')).toBeUndefined();
    expect(linkShortTestLogIds({ log: sun, sessionId: 'p_zo', logs: [sun, mon, thu], series })).toEqual([]);
    // Met een test later in zijn eigen week verschuift alleen die, niet die van de week erna.
    const sat = log('za', '2026-11-14', { plannedSessionId: 'p_za' });
    const wed = log('los', '2026-11-11');
    expect(shift(wed, [wed, sat, mon, thu], [], 'p_wo')).toEqual({ logId: 'za', date: '2026-11-14', sameDay: false });
    expect(linkShortTestLogIds({ log: wed, sessionId: 'p_wo', logs: [wed, sat, mon, thu], series })).toEqual(['los', 'za']);
    // De week telt op de dag van het log, niet op die van het plan: een losse loop van maandag bij de
    // geplande loop van zondag verdringt de test van donderdag wel.
    const looseMon = log('los', '2026-11-16');
    expect(shift(looseMon, [thu, looseMon], [], 'p_zo')).toMatchObject({ logId: 'do' });
  });

  it('de dag zelf: de vroegste op de klok telt', () => {
    const early = log('los', '2026-11-19', { completedAt: '2026-11-19T07:00:00' });
    expect(shift(early, [thu, early])).toEqual({ logId: 'do', date: '2026-11-19', sameDay: true });
    const late = log('los', '2026-11-19', { completedAt: '2026-11-19T18:00:00' });
    expect(shift(late, [thu, late])).toBeUndefined();
  });

  it('wat niet te koppelen is, of zonder reeks: niets', () => {
    // Al gekoppeld.
    const linked = log('los', '2026-11-17', { plannedSessionId: 'p_x' });
    expect(shift(linked, [thu, linked])).toBeUndefined();
    // Zelf ingevuld.
    const hand = log('los', '2026-11-17', { source: 'manual', externalId: undefined });
    expect(shift(hand, [thu, hand])).toBeUndefined();
    // Geen Akkoord op de korte test, of een losse loop van voor de eerste dag van de reeks.
    expect(linkShortTestShift({ log: tue, sessionId: 'p_di', logs: [thu, tue], streams: both(), series: undefined })).toBeUndefined();
    expect(linkShortTestShift({ log: tue, sessionId: 'p_di', logs: [thu, tue], streams: both(), series: { ...series, date: '2026-11-18' } })).toBeUndefined();
    // Een ingekorte losse loop heeft geen test.
    const trimmed = log('los', '2026-11-17', { trim: { startSec: 60 } } as unknown as Partial<SessionLog>);
    expect(shift(trimmed, [thu, trimmed])).toBeUndefined();
    // De reeksen zijn nog niet gelezen.
    expect(linkShortTestShift({ log: tue, sessionId: 'p_di', logs: [thu, tue], streams: new Map(), series })).toBeUndefined();
  });

  it('welke reeksen er gelezen worden: de rustige lopen van die week, met de losse loop erbij', () => {
    const before = log('vorige', '2026-11-12', { plannedSessionId: 'p_v' });
    const otherLoose = log('los2', '2026-11-18');
    const strength = log('kracht', '2026-11-18', { templateId: 'tpl_legs_a', plannedSessionId: 'p_k' });
    expect(linkShortTestLogIds({ log: tue, sessionId: 'p_di', logs: [before, thu, tue, otherLoose, strength], series })).toEqual(['los', 'do']);
    expect(linkShortTestLogIds({ log: tue, sessionId: 'p_di', logs: [thu, tue], series: undefined })).toEqual([]);
    // Een losse loop die geen rustige loop is: niets te lezen.
    const walk = log('los', '2026-11-17', { templateId: 'tpl_walk' });
    expect(linkShortTestLogIds({ log: walk, sessionId: 'p_di', logs: [thu, walk], series })).toEqual([]);
  });

  it('niets te lezen als er geen gekoppelde rustige loop later in de week is', () => {
    const ask = (loose: SessionLog, logs: SessionLog[]) => linkShortTestLogIds({ log: loose, sessionId: 'p_x', logs, series });
    expect(ask(tue, [tue])).toEqual([]);
    // De andere loop is eerder, of later maar zelf los.
    const fri = log('los', '2026-11-20');
    expect(ask(fri, [thu, fri])).toEqual([]);
    expect(ask(tue, [tue, log('do', '2026-11-19')])).toEqual([]);
    // Zelfde dag: alleen een latere op de klok.
    const late = log('los', '2026-11-19', { completedAt: '2026-11-19T18:00:00' });
    expect(ask(late, [thu, late])).toEqual([]);
  });

  describe('de drie standen van de kaart', () => {
    const today = '2026-11-20';
    const input = { log: tue, sessionId: 'p_di', logs: [thu, tue], series };
    it('bezig tot de reeksen gelezen zijn, daarna de zin', () => {
      expect(linkShortTestState(input, undefined, today)).toEqual({ stand: 'busy' });
      expect(linkShortTestState(input, { streams: both(), complete: true }, today)).toEqual({ stand: 'line', line: 'Je korte test van donderdag telt dan niet meer, die uit deze loop wel.' });
    });
    it('gelezen en er verschuift niets: niets', () => {
      expect(linkShortTestState(input, { streams: new Map<string, StreamSet>([['do', run()], ['los', plain()]]), complete: true }, today)).toEqual({ stand: 'none' });
    });
    it('een fout of de tijdgrens: niets, nooit blijvend bezig', () => {
      expect(linkShortTestState(input, { streams: new Map(), complete: false }, today)).toEqual({ stand: 'none' });
      expect(linkShortTestState(input, { streams: both(), complete: false }, today)).toEqual({ stand: 'none' });
    });
    it('geen kandidaat: meteen niets, zonder te wachten', () => {
      expect(linkShortTestState(undefined, undefined, today)).toEqual({ stand: 'none' });
      expect(linkShortTestState({ ...input, logs: [tue] }, undefined, today)).toEqual({ stand: 'none' });
      const fri = log('los', '2026-11-20');
      expect(linkShortTestState({ ...input, log: fri, logs: [thu, fri] }, undefined, today)).toEqual({ stand: 'none' });
      expect(linkShortTestState({ ...input, series: undefined }, undefined, today)).toEqual({ stand: 'none' });
    });
    it('de keuze voor de pols telt mee, zoals op het logblad', () => {
      const { stanceBalanceLeftPct: _band, ...noStrap } = run();
      void _band;
      const streams = new Map<string, StreamSet>([['do', run()], ['los', noStrap]]);
      expect(linkShortTestState(input, { streams, complete: true }, today).stand).toBe('none');
      expect(linkShortTestState({ ...input, noStrap: 'margin' }, { streams, complete: true }, today).stand).toBe('line');
    });
  });

  it('leest alleen: geen log verandert', () => {
    const logs = Object.freeze([Object.freeze(thu), Object.freeze(tue)]) as readonly SessionLog[];
    expect(linkShortTestShift({ log: logs[1], sessionId: 'p_di', logs, streams: both(), series })).toBeDefined();
    expect(logs[1].plannedSessionId).toBeUndefined();
  });
});

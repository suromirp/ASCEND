import { describe, it, expect } from 'vitest';
import type { AdviceInputs } from './adviceEngine';
import { influenceMove, influenceMoveCause, influenceMoveId, influenceMoveSummary, morningNumber, noteWords, type MoveCauseInput } from './influenceProposal';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { addDays } from '../utils/dates';
import type { InfluenceEntry, InfluenceReasonNote } from '../models/influence';
import type { RecoveryMetric } from '../models/metrics';
import type { PlannedSession, SessionLog } from '../models/training';

// Nagemaakte week: de test staat op donderdag 29 oktober, benen A op woensdag.
const { templates } = buildDefaultProgramData();
const DAYS = ['tpl_herstel', 'tpl_upper_a', 'tpl_lower_a', 'tpl_test_run', 'tpl_upper_b', 'tpl_hill_intervals', 'tpl_long_run'];
const weekOf = (monday: string, test = 'tpl_easy_run'): PlannedSession[] => DAYS.map((t, d) => ({
  id: `${monday}-${d}`, templateId: t === 'tpl_test_run' ? test : t, scheduledDate: addDays(monday, d), weekStartDate: monday, status: 'planned' as const, order: d,
}));
const planned = [...weekOf('2026-10-26', 'tpl_test_run'), ...weekOf('2026-11-02'), ...weekOf('2026-11-09')];
const THURSDAY = '2026-10-29';
const TEST_ID = '2026-10-26-3';

const entry = (id: string, date: string, reasons: InfluenceReasonNote[], extra: Partial<InfluenceEntry> = {}): InfluenceEntry => ({ id, date, reasons, updatedAt: '2026-10-29T07:00:00.000Z', ...extra });
const glasses = (amount: 'weinig' | 'matig' | 'veel'): InfluenceReasonNote[] => [{ reason: 'alcohol', amount }];

const causeInput = (entries: InfluenceEntry[], over: Partial<MoveCauseInput> = {}): MoveCauseInput => ({ today: THURSDAY, plannedSessions: planned, logs: [], entries, enabled: true, ...over });
const adviceInputs = (over: Partial<AdviceInputs> = {}): AdviceInputs => ({
  logs: [], plannedSessions: planned, templates, injuries: [], program: null, dailyTimeBudget: {}, sameDayPairingPreference: 'automatic', respondedIds: new Set(), asOf: THURSDAY, ...over,
});

describe('wanneer er een voorstel komt', () => {
  it('bij een test vandaag na 3 tot 5 glazen de avond ervoor', () => {
    const cause = influenceMoveCause(causeInput([entry('a', '2026-10-28', glasses('matig'))]))!;
    expect(cause.reason).toBe('alcohol');
    expect(cause.amount).toBe('matig');
    expect(cause.session.id).toBe(TEST_ID);
    expect(cause.today).toBe(true);
  });

  it('ook als het bij een training van vandaag staat (alcohol was de avond ervoor)', () => {
    expect(influenceMoveCause(causeInput([entry('a', THURSDAY, glasses('veel'), { logId: 'andere' })]))).toBeDefined();
  });

  it('nooit bij 1 à 2 glazen', () => {
    expect(influenceMoveCause(causeInput([entry('a', '2026-10-28', glasses('weinig'))]))).toBeUndefined();
  });

  it('bij een test morgen alleen na 6 of meer glazen vanavond', () => {
    const tomorrowInput = { today: '2026-10-28' };
    expect(influenceMoveCause(causeInput([entry('a', '2026-10-28', glasses('matig'))], tomorrowInput))).toBeUndefined();
    const cause = influenceMoveCause(causeInput([entry('a', '2026-10-28', glasses('veel'))], tomorrowInput))!;
    expect(cause.today).toBe(false);
    expect(cause.session.id).toBe(TEST_ID);
  });

  it('bij wiet alleen als de test dezelfde dag is en de notitie op die dag staat', () => {
    expect(influenceMoveCause(causeInput([entry('w', THURSDAY, [{ reason: 'wiet' }])]))?.reason).toBe('wiet');
    // Een avond wiet en een test de volgende ochtend: geen voorstel.
    expect(influenceMoveCause(causeInput([entry('w', '2026-10-28', [{ reason: 'wiet' }])]))).toBeUndefined();
    // Een test morgen na wiet vandaag: ook niet.
    expect(influenceMoveCause(causeInput([entry('w', '2026-10-28', [{ reason: 'wiet' }])], { today: '2026-10-28' }))).toBeUndefined();
  });

  it('nooit voor een gewone training', () => {
    const noTest = planned.map((s) => (s.templateId === 'tpl_test_run' ? { ...s, templateId: 'tpl_easy_run' } : s));
    expect(influenceMoveCause(causeInput([entry('a', '2026-10-28', glasses('veel'))], { plannedSessions: noTest }))).toBeUndefined();
  });

  it('niet met de instelling uit', () => {
    expect(influenceMoveCause(causeInput([entry('a', '2026-10-28', glasses('veel'))], { enabled: false }))).toBeUndefined();
  });

  it('niet voor een test die al gelogd is of voorbij is', () => {
    const log = { id: 'l', plannedSessionId: TEST_ID, templateId: 'tpl_test_run', completedDate: THURSDAY } as SessionLog;
    const entries = [entry('a', '2026-10-28', glasses('veel'))];
    expect(influenceMoveCause(causeInput(entries, { logs: [log] }))).toBeUndefined();
    expect(influenceMoveCause(causeInput(entries, { today: '2026-10-30' }))).toBeUndefined();
  });

  it('niet voor een test die je zelf oversloeg', () => {
    const skipped = planned.map((s) => (s.id === TEST_ID ? { ...s, status: 'skipped' as const } : s));
    expect(influenceMoveCause(causeInput([entry('a', '2026-10-28', glasses('veel'))], { plannedSessions: skipped }))).toBeUndefined();
  });
});

describe('het voorstel zelf', () => {
  const cause = () => influenceMoveCause(causeInput([entry('a', '2026-10-28', glasses('matig'))]))!;

  it('verschuift alleen de test naar een dag die de beenregels respecteert', () => {
    const move = influenceMove(adviceInputs(), cause())!;
    expect(move.advice.id).toBe(influenceMoveId(TEST_ID, THURSDAY));
    expect(move.advice.ruleId).toBe('TEST-INFLUENCE');
    const items = move.advice.proposal!.changes.filter((c) => c.action === 'move');
    const testMove = items.find((c) => c.plannedSessionId === TEST_ID)!;
    expect(testMove.fromDate).toBe(THURSDAY);
    expect(testMove.toDate! > THURSDAY).toBe(true);
    // Benen A van woensdag blijft staan: nooit binnen 48 uur van de nieuwe test.
    expect(items.find((c) => c.plannedSessionId === '2026-10-26-2')).toBeUndefined();
  });

  it('komt die dag niet terug na Liever niet', () => {
    const answered = new Set([influenceMoveId(TEST_ID, THURSDAY)]);
    expect(influenceMove(adviceInputs({ respondedIds: answered }), cause())).toBeUndefined();
    // De volgende dag is het een nieuw id.
    expect(influenceMoveId(TEST_ID, '2026-10-30')).not.toBe(influenceMoveId(TEST_ID, THURSDAY));
  });

  it('is er niet zonder reden', () => {
    expect(influenceMove(adviceInputs(), undefined)).toBeUndefined();
  });
});

describe('de tekst', () => {
  const cause = influenceMoveCause(causeInput([entry('a', '2026-10-28', glasses('matig'))]))!;

  it('noemt wat je vastlegde, het getal van vanochtend en waarom het voor ASCEND uitmaakt', () => {
    const text = influenceMoveSummary(cause, { restingHr: 58, diff: 8 }, '2026-10-30');
    expect(text).toContain('Je legde vast: alcohol, 3 tot 5 glazen.');
    expect(text).toContain('Vanochtend is je rusthartslag 58, 8 boven je gemiddelde.');
    expect(text).toContain('ASCEND rekent je tempo\'s uit de uitkomst van deze test.');
    expect(text).toContain('vr 30');
  });

  it('zegt nooit wat je had moeten doen, en heeft geen gedachtestreepjes', () => {
    const text = influenceMoveSummary(cause, { restingHr: 52 });
    expect(text).not.toMatch(/helaas|minder drinken|had moeten|gezondheid|[\u2013\u2014]/i);
    expect(text).toContain('Vanochtend is je rusthartslag 52.');
  });

  it('laat het getal weg als er geen is, en noemt wiet gewoon wiet', () => {
    expect(influenceMoveSummary(cause)).not.toContain('Vanochtend');
    expect(noteWords({ reason: 'wiet' })).toBe('wiet');
  });

  it('leest het getal van vanochtend tegen je eigen gemiddelde', () => {
    const metrics: RecoveryMetric[] = Array.from({ length: 12 }, (_, i) => ({ id: `m${i}`, date: addDays('2026-10-17', i), restingHeartRate: 50, source: 'garmin' as const }));
    expect(morningNumber(THURSDAY, [...metrics, { id: 'x', date: THURSDAY, restingHeartRate: 58, source: 'garmin' }])).toEqual({ restingHr: 58, diff: 8 });
    expect(morningNumber(THURSDAY, [{ id: 'x', date: THURSDAY, restingHeartRate: 58, source: 'garmin' }])).toEqual({ restingHr: 58 });
    expect(morningNumber(THURSDAY, metrics)).toBeUndefined();
    // Ochtenden met "Deze nacht niet meetellen" doen niet mee in het gemiddelde, zoals op de ochtendkaart.
    const odd = new Set(metrics.slice(0, 3).map((m) => m.date));
    const high = metrics.map((m) => (odd.has(m.date) ? { ...m, restingHeartRate: 80 } : m));
    const today = { id: 'x', date: THURSDAY, restingHeartRate: 58, source: 'garmin' as const };
    expect(morningNumber(THURSDAY, [...high, today])!.diff).toBeLessThan(8);
    expect(morningNumber(THURSDAY, [...high, today], odd)!.diff).toBe(8);
  });
});

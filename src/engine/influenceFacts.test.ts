import { describe, it, expect } from 'vitest';
import type { InfluenceEntry } from '../models/influence';
import type { RecoveryMetric } from '../models/metrics';
import type { SessionLog } from '../models/training';
import { addDays } from '../utils/dates';
import { TEMPLATES } from './fixtures/runLogs';
import { derivedFactEntries, knownFacts } from './influence';
import { InfluenceCalculator, appliesTo, hasAnythingToShow, influenceEffects, looksLike, recordedCounts, type EffectsInput } from './influenceEffects';

// Nagemaakte gegevens: een rustige reeks ochtenden en een paar beendagen.
const START = '2026-08-20';
const DAYS = 66;
const metrics = (over: Record<string, Partial<RecoveryMetric>> = {}): RecoveryMetric[] =>
  Array.from({ length: DAYS }, (_, i) => {
    const date = addDays(START, i);
    return { id: `m${i}`, date, restingHeartRate: 49 + (i % 3), hrv: 58 + (i % 4), sleepMinutes: 420 + (i % 5) * 5, source: 'garmin' as const, ...over[date] };
  });
const legDay = (id: string, date: string): SessionLog => ({ id, templateId: 'tpl_lower_a', type: 'strength', completedDate: date, completedAt: `${date}T18:00:00.000Z`, variant: 'full', durationMinutes: 60, source: 'manual' });
const easy = (id: string, date: string): SessionLog => ({ ...legDay(id, date), templateId: 'tpl_easy_run' });
const base = (over: Partial<EffectsInput> = {}): EffectsInput => ({ entries: [], metrics: metrics(), logs: [], templates: TEMPLATES, program: null, ...over });
const note = (id: string, date: string, reason: 'zware_beendag' | 'kort_geslapen', extra: Partial<InfluenceEntry> = {}): InfluenceEntry => ({ id, date, reasons: [{ reason }], updatedAt: '2026-10-24T08:00:00.000Z', ...extra });

const LEGS = ['2026-09-20', '2026-09-27', '2026-10-04', '2026-10-11'];
const legLogs = LEGS.map((d, i) => legDay(`leg${i}`, d));
const afterLegs = Object.fromEntries(LEGS.map((d) => [addDays(d, 1), { restingHeartRate: 58 }]));
const restEffect = (input: EffectsInput, key: string) => influenceEffects(input).find((e) => e.measure === 'restingHr' && e.group.key === key);

describe('feiten die ASCEND zelf weet', () => {
  it('geeft dezelfde feiten als knownFacts, op elke plek', () => {
    const logs = [...legLogs, easy('t', '2026-09-21')];
    const rec = metrics({ '2026-09-21': { sleepMinutes: 300 } });
    const ill = [{ id: 'i1', kind: 'above_neck' as const, startDate: '2026-09-21', endDate: '2026-09-21' }];
    const derived = derivedFactEntries({ logs, templates: TEMPLATES, recovery: rec, illness: ill });
    const reasonsAt = (id: string) => derived.find((e) => e.id === id)?.reasons.map((r) => r.reason) ?? [];
    const t = logs.find((l) => l.id === 't') as SessionLog;
    const same = (target: Parameters<typeof knownFacts>[0]['target']) =>
      knownFacts({ target, logs, templates: TEMPLATES, recovery: rec, illness: ill, cause: 'patroon' }).map((f) => f.reason);
    // Illness is counted once per period (own test below), so the per-place facts leave it out.
    const noIll = (list: string[]) => list.filter((r) => r !== 'ziek');
    expect(reasonsAt('fact-log-t')).toEqual(noIll(same({ kind: 'log', log: t })));
    expect(reasonsAt('fact-day-2026-09-20')).toEqual(noIll(same({ kind: 'day', date: '2026-09-20' })));
    expect(reasonsAt('fact-day-2026-09-21')).toEqual(noIll(same({ kind: 'day', date: '2026-09-21' })));
    expect(reasonsAt('fact-log-t')).toEqual(['zware_beendag', 'kort_geslapen']);
  });

  it('telt een zware beendag zonder notitie mee in het overzicht', () => {
    const input = base({ logs: legLogs, metrics: metrics(afterLegs) });
    const e = restEffect(input, 'zware_beendag')!;
    expect(e.count).toBe(4);
    expect(e.enough).toBe(true);
    expect(hasAnythingToShow(influenceEffects(input))).toBe(true);
    expect(recordedCounts(new InfluenceCalculator(input).entries).find((c) => c.group.key === 'zware_beendag')?.count).toBe(4);
  });

  it('telt feiten mee zonder dat de instelling Mogelijke oorzaak erin voorkomt', () => {
    // De instelling zit niet in de invoer: feiten zijn feiten, ook zonder voorstellen.
    expect(restEffect(base({ logs: legLogs, metrics: metrics(afterLegs) }), 'zware_beendag')?.count).toBe(4);
  });

  it('telt een bevestigde en een afgeleide zware beendag op dezelfde plek één keer', () => {
    const entries = [note('a', LEGS[0], 'zware_beendag'), note('b', addDays(LEGS[1], 1), 'zware_beendag', { logId: 't1' })];
    const logs = [...legLogs, easy('t0', addDays(LEGS[0], 1)), easy('t1', addDays(LEGS[1], 1))];
    const e = restEffect(base({ entries, logs, metrics: metrics(afterLegs) }), 'zware_beendag')!;
    expect(e.count).toBe(4);
  });

  it('telt een nacht die niet goed gemeten is niet als kort geslapen', () => {
    const short = ['2026-09-20', '2026-09-27', '2026-10-04'];
    const rec = metrics(Object.fromEntries(short.map((d) => [d, { sleepMinutes: 300 }])));
    const found = (judgments?: EffectsInput['nightJudgments']) =>
      influenceEffects(base({ metrics: rec, nightJudgments: judgments })).find((e) => e.measure === 'sleep' && e.group.key === 'kort_geslapen');
    expect(found()?.count).toBe(3);
    expect(found(short.map((date) => ({ date, verdict: 'niet_goed' as const, minutes: 300 })))).toBeUndefined();
  });

  it('houdt een korte nacht zonder oordeel in de band en telt hem als kort geslapen', () => {
    const short = ['2026-09-20', '2026-09-27', '2026-10-04'];
    const rec = metrics(Object.fromEntries(short.map((d) => [d, { sleepMinutes: 300 }])));
    const calc = new InfluenceCalculator(base({ metrics: rec }));
    expect(calc.recordedMornings.size).toBe(0);
    expect(calc.isPlain('2026-09-20', 'sleep')).toBe(true);
    expect(influenceEffects(base({ metrics: rec })).find((e) => e.measure === 'sleep' && e.group.key === 'kort_geslapen')?.count).toBe(3);
  });

  it('laat een dag met alleen een feit gewoon zijn en houdt zijn ochtend in de band', () => {
    const calc = new InfluenceCalculator(base({ logs: legLogs }));
    const morning = addDays(LEGS[0], 1);
    expect(calc.isPlain(morning, 'restingHr')).toBe(true);
    expect(calc.isPlain(morning, 'effort')).toBe(true);
    expect(calc.recordedMornings.has(morning)).toBe(false);
    // Een notitie van jezelf op dezelfde plek haalt de ochtend wel uit de band.
    const own = new InfluenceCalculator(base({ logs: legLogs, entries: [note('a', LEGS[0], 'zware_beendag')] }));
    expect(own.isPlain(morning, 'restingHr')).toBe(false);
  });

  it('laat alcohol staan naast een gewone week met drie zware beendagen', () => {
    // Elke zaterdag een zware beendag: de ochtend erna ligt 5 slagen hoger. Dat is deze week.
    const saturdays = ['2026-08-22', '2026-08-29', '2026-09-05', '2026-09-12', '2026-09-19', '2026-09-26', '2026-10-03', '2026-10-10'];
    const logs = saturdays.map((d, i) => legDay(`sat${i}`, d));
    const wine = ['2026-09-02', '2026-09-09', '2026-09-16', '2026-09-23'];
    const rec = metrics({ ...Object.fromEntries(saturdays.map((d) => [addDays(d, 1), { restingHeartRate: 55 }])), ...Object.fromEntries(wine.map((d) => [d, { restingHeartRate: 62 }])) });
    const entries = wine.map((m, i) => ({ id: `w${i}`, date: addDays(m, -1), reasons: [{ reason: 'alcohol' as const, amount: 'matig' as const }], updatedAt: '2026-10-24T08:00:00.000Z' }));
    const effects = influenceEffects(base({ entries, logs, metrics: rec }));
    const wineEffect = effects.find((e) => e.measure === 'restingHr' && e.group.key === 'alcohol:matig')!;
    expect(wineEffect.count).toBe(4);
    expect(wineEffect.outsideCount).toBe(4);
    expect(wineEffect.clear).toBe(true);
    const legEffect = effects.find((e) => e.measure === 'restingHr' && e.group.key === 'zware_beendag')!;
    expect(legEffect.count).toBeGreaterThanOrEqual(3);
    const calc = new InfluenceCalculator(base({ entries, logs, metrics: rec }));
    expect(saturdays.some((d) => calc.recordedMornings.has(addDays(d, 1)))).toBe(false);
  });

  it('telt warm alleen voor hartslag bij tempo en zwaarte', () => {
    expect(appliesTo({ reason: 'warm' }, 'paceHr')).toBe(true);
    expect(appliesTo({ reason: 'warm' }, 'effort')).toBe(true);
    for (const m of ['restingHr', 'hrv', 'sleep'] as const) expect(appliesTo({ reason: 'warm' }, m)).toBe(false);
    expect(appliesTo({ reason: 'zware_beendag' }, 'sleep')).toBe(true);
    const hot = ['2026-09-20', '2026-09-27', '2026-10-04', '2026-10-11'];
    const facts: InfluenceEntry[] = hot.map((d, i) => ({ id: `f${i}`, date: d, logId: `h${i}`, reasons: [{ reason: 'warm' }], updatedAt: '' }));
    const rec = metrics(Object.fromEntries(hot.map((d) => [d, { restingHeartRate: 60, hrv: 30, sleepMinutes: 300 }])));
    const measures = influenceEffects(base({ facts, metrics: rec })).filter((e) => e.group.key === 'warm').map((e) => e.measure);
    expect(measures).not.toContain('restingHr');
    expect(measures).not.toContain('hrv');
    expect(measures).not.toContain('sleep');
    // En voor lijkt op is warm geen kandidaat bij een ochtendmeting.
    const entries = hot.map((d, i) => ({ id: `a${i}`, date: addDays(d, -1), reasons: [{ reason: 'alcohol' as const }], updatedAt: '' }));
    const r = looksLike({ ...base({ entries, facts, metrics: rec }), cause: 'patroon', measure: 'restingHr', date: '2026-10-20' });
    expect(r?.group.reason).not.toBe('warm');
  });

  it('telt een ziekmelding één keer per periode, op de eerste ochtend, ook zonder training', () => {
    const ill = [{ id: 'i1', kind: 'above_neck' as const, startDate: '2026-09-21', endDate: '2026-09-27' }];
    const facts = derivedFactEntries({ logs: [easy('t', '2026-09-23')], templates: TEMPLATES, recovery: metrics(), illness: ill });
    const mornings = facts.filter((e) => e.reasons.some((r) => r.reason === 'ziek'));
    expect(mornings).toHaveLength(1);
    // Een dagnotitie raakt de ochtend erna: de eerste ochtend van de melding.
    expect(addDays(mornings[0].date, 1)).toBe('2026-09-21');
    const e = influenceEffects(base({ illness: ill, metrics: metrics({ '2026-09-21': { restingHeartRate: 60 } }) })).find((x) => x.measure === 'restingHr' && x.group.key === 'ziek')!;
    expect(e.count).toBe(1);
  });

  it('rekent 700 logs snel genoeg door', () => {
    const logs: SessionLog[] = Array.from({ length: 700 }, (_, i) => (i % 3 === 0 ? legDay(`p${i}`, addDays('2025-01-01', i)) : easy(`p${i}`, addDays('2025-01-01', i))));
    const recovery: RecoveryMetric[] = Array.from({ length: 400 }, (_, i) => ({ id: `r${i}`, date: addDays('2026-09-20', i - 399), restingHeartRate: 50, sleepMinutes: i % 9 === 0 ? 300 : 430, source: 'garmin' as const }));
    const t0 = performance.now();
    const facts = derivedFactEntries({ logs, templates: TEMPLATES, recovery, illness: [{ id: 'i', kind: 'above_neck', startDate: '2026-01-10' }] });
    const ms = performance.now() - t0;
    console.log(`derivedFactEntries: ${facts.length} feiten, ${Math.round(ms)} ms (700 logs, 400 dagen)`);
    expect(ms).toBeLessThan(1000);
  });
});

import { describe, it, expect } from 'vitest';
import type { InfluenceEntry, InfluenceReasonNote } from '../models/influence';
import type { RecoveryMetric } from '../models/metrics';
import type { SessionLog } from '../models/training';
import { addDays } from '../utils/dates';
import { EARLIER_DATES, EASY, TEMPLATES, context, runLog } from './fixtures/runLogs';
import {
  InfluenceCalculator,
  alcoholAmounts,
  groupOf,
  hasAnythingToShow,
  headline,
  influenceEffects,
  looksLike,
  morningOf,
  occurrencesOf,
  outsideSentence,
  recordedCounts,
  researchLine,
  shownFor,
  signed,
  tooFewLine,
  effectsOfGroup,
  countLine,
  factSentence,
  fewLine,
  scaleFor,
  type EffectsInput,
} from './influenceEffects';

// Nagemaakte gegevens: een rustige reeks ochtenden zonder eigenaar.
const START = '2026-08-20';
const DAYS = 66; // tot en met 2026-10-24

const rest = (i: number) => 49 + (i % 3);
const hrv = (i: number) => 58 + (i % 4);
const sleep = (i: number) => 420 + (i % 5) * 5;

function metrics(over: Record<string, Partial<RecoveryMetric>> = {}): RecoveryMetric[] {
  return Array.from({ length: DAYS }, (_, i) => {
    const date = addDays(START, i);
    return { id: `m${i}`, date, restingHeartRate: rest(i), hrv: hrv(i), sleepMinutes: sleep(i), source: 'garmin' as const, ...over[date] };
  });
}

const entry = (id: string, date: string, reasons: InfluenceReasonNote[], extra: Partial<InfluenceEntry> = {}): InfluenceEntry => ({
  id,
  date,
  reasons,
  updatedAt: '2026-10-24T08:00:00.000Z',
  ...extra,
});

const alcohol = (amount: 'weinig' | 'matig' | 'veel'): InfluenceReasonNote => ({ reason: 'alcohol', amount });

// De ochtenden waarop het gebeurde: de avond ervoor staat als dag in de kalender.
function nights(mornings: string[], note: InfluenceReasonNote, prefix = 'n'): InfluenceEntry[] {
  return mornings.map((m, i) => entry(`${prefix}${i}`, addDays(m, -1), [note]));
}

const base = (over: Partial<EffectsInput> = {}): EffectsInput => ({ entries: [], metrics: metrics(), logs: [], templates: TEMPLATES, program: null, ...over });

const MORNINGS = ['2026-09-20', '2026-09-27', '2026-10-04', '2026-10-11'];
const bumped = (mornings: string[], by: { restingHeartRate?: number; hrv?: number; sleepMinutes?: number }) =>
  Object.fromEntries(mornings.map((m) => [m, by]));

describe('welke ochtend een notitie raakt', () => {
  it('met een training is het de dag van de training, op een dag de dag erna', () => {
    expect(morningOf({ date: '2026-10-10', logId: 'l1' })).toBe('2026-10-10');
    expect(morningOf({ date: '2026-10-10' })).toBe('2026-10-11');
  });

  it('telt een reden per ochtend één keer, ook als hij op de dag en bij de training staat', () => {
    const entries = [entry('a', '2026-10-09', [alcohol('matig')]), entry('b', '2026-10-10', [alcohol('matig')], { logId: 'l1' })];
    expect(occurrencesOf(entries)).toHaveLength(1);
  });

  it('zet alcohol per hoeveelheid apart en anders per eigen woord', () => {
    expect(groupOf(alcohol('matig')).name).toBe('Alcohol, 3 tot 5 glazen');
    expect(groupOf(alcohol('weinig')).key).not.toBe(groupOf(alcohol('veel')).key);
    expect(groupOf({ reason: 'anders', label: ' Reizen ' }).key).toBe(groupOf({ reason: 'anders', label: 'reizen' }).key);
  });
});

describe('rusthartslag, HRV en slaap de ochtend erna', () => {
  const input = base({
    entries: nights(MORNINGS, alcohol('matig')),
    metrics: metrics(bumped(MORNINGS, { restingHeartRate: 57, hrv: 46, sleepMinutes: 385 })),
  });
  const effects = influenceEffects(input);
  const of = (m: string) => effects.find((e) => e.measure === m && e.group.reason === 'alcohol')!;

  it('geeft per keer het verschil met je eigen schommeling en of het erbuiten valt', () => {
    const e = of('restingHr');
    expect(e.count).toBe(4);
    expect(e.enough).toBe(true);
    expect(e.points.every((p) => p.outside)).toBe(true);
    expect(e.meanDiff).toBeGreaterThan(6);
    expect(e.meanDiff).toBeLessThan(8);
    expect(e.outsideCount).toBe(4);
    expect(outsideSentence(e)).toBe('Alle 4 keer buiten je schommeling.');
    expect(of('hrv').meanDiff).toBeLessThan(-10);
    expect(of('sleep').meanDiff).toBeLessThan(-30);
  });

  it('laat de andere vastgelegde ochtenden uit de band, zodat een reden zijn eigen band niet vervuilt', () => {
    const near = '2026-10-12';
    const withNeighbour = base({
      entries: [...nights(MORNINGS, alcohol('matig')), ...nights([near], { reason: 'stress' }, 's')],
      metrics: metrics({ ...bumped(MORNINGS, { restingHeartRate: 57 }), [near]: { restingHeartRate: 60 }, [addDays(near, -1)]: { restingHeartRate: 60 } }),
    });
    const point = new InfluenceCalculator(withNeighbour).pointAt('restingHr', '2026-10-11');
    const calc = new InfluenceCalculator(base({ entries: nights(MORNINGS, alcohol('matig')), metrics: metrics(bumped(MORNINGS, { restingHeartRate: 57 })) }));
    // De andere ochtenden (ook de eigen eerdere keren) doen niet mee: de middelste waarde blijft 50.
    expect(point!.center).toBe(50);
    expect(calc.pointAt('restingHr', '2026-10-11')!.center).toBe(50);
  });

  it('rekent met de mediaan: één uitschieter in de vier weken ervoor verandert de band niet', () => {
    const plain = new InfluenceCalculator(base({ entries: nights(MORNINGS, alcohol('matig')) })).pointAt('restingHr', '2026-10-11')!;
    const spiky = new InfluenceCalculator(base({ entries: nights(MORNINGS, alcohol('matig')), metrics: metrics({ '2026-10-06': { restingHeartRate: 90 } }) })).pointAt('restingHr', '2026-10-11')!;
    expect(spiky.center).toBe(plain.center);
    expect(spiky.high - spiky.low).toBeCloseTo(plain.high - plain.low, 5);
  });

  it('heeft minstens een week eigen dagen nodig', () => {
    const few = base({ entries: nights(['2026-08-25'], alcohol('matig')), metrics: metrics() });
    expect(new InfluenceCalculator(few).pointAt('restingHr', '2026-08-25')).toBeUndefined();
  });

  it('telt nachten mee die je niet liet meetellen voor hartslag', () => {
    const flagged = nights(MORNINGS, alcohol('matig')).map((e) => ({ ...e, excludeHeartRate: true }));
    const e = influenceEffects(base({ entries: flagged, metrics: metrics(bumped(MORNINGS, { restingHeartRate: 57 })) })).find((x) => x.measure === 'restingHr')!;
    expect(e.count).toBe(4);
  });

  it('geeft onder de 3 keer alleen het aantal en geen getal om te tonen', () => {
    const two = base({ entries: nights(MORNINGS.slice(0, 2), alcohol('veel')), metrics: metrics(bumped(MORNINGS.slice(0, 2), { restingHeartRate: 62 })) });
    const e = influenceEffects(two).find((x) => x.measure === 'restingHr')!;
    expect(e.count).toBe(2);
    expect(e.enough).toBe(false);
    expect(shownFor([e], 'restingHr')).toEqual([]);
    expect(hasAnythingToShow([e])).toBe(false);
  });

  it('houdt de hoeveelheden alcohol uit elkaar', () => {
    const mixed = base({
      entries: [...nights(MORNINGS.slice(0, 3), alcohol('matig')), ...nights(MORNINGS.slice(3), alcohol('weinig'), 'w')],
      metrics: metrics(bumped(MORNINGS, { restingHeartRate: 57 })),
    });
    const list = influenceEffects(mixed).filter((e) => e.measure === 'restingHr');
    expect(list.map((e) => [e.group.amount, e.count]).sort()).toEqual([['matig', 3], ['weinig', 1]]);
    expect(alcoholAmounts(mixed.entries)).toEqual([{ amount: 'weinig', count: 1 }, { amount: 'matig', count: 3 }, { amount: 'veel', count: 0 }]);
  });

  it('sorteert op hoe groot het verschil is', () => {
    const entries = [...nights(MORNINGS.slice(0, 3), { reason: 'stress' }, 's'), ...nights(['2026-09-22', '2026-09-29', '2026-10-06'], alcohol('veel'), 'v')];
    const m = metrics({ ...bumped(MORNINGS.slice(0, 3), { restingHeartRate: 53 }), ...bumped(['2026-09-22', '2026-09-29', '2026-10-06'], { restingHeartRate: 62 }) });
    const shown = shownFor(influenceEffects(base({ entries, metrics: m })), 'restingHr');
    expect(shown.map((e) => e.group.reason)).toEqual(['alcohol', 'stress']);
  });

  it('zegt in een kopzin alleen wat duidelijk buiten de band valt', () => {
    const grouped = effectsOfGroup(effects, 'alcohol:matig');
    const parts = headline(grouped.get('restingHr')!.group, grouped)!;
    const text = parts.map((p) => ('text' in p ? p.text : p.num)).join('');
    expect(text).toContain('Na 3 tot 5 glazen ligt je rusthartslag de ochtend erna gemiddeld 7 hoger');
    expect(text).toContain('je HRV');
    expect(text).toContain('minuten korter');
    expect(parts.some((p) => 'num' in p)).toBe(true);
  });

  it('zegt niets in de kopzin als alles binnen de band valt', () => {
    const calm = influenceEffects(base({ entries: nights(MORNINGS, alcohol('weinig')), metrics: metrics(bumped(MORNINGS, { restingHeartRate: 51 })) }));
    const grouped = effectsOfGroup(calm, 'alcohol:weinig');
    expect(headline(grouped.get('restingHr')!.group, grouped)).toBeUndefined();
  });

  it('noemt wat nog te weinig is, zonder opdracht', () => {
    const entries = [...nights(MORNINGS.slice(0, 2), { reason: 'wiet' }), ...nights(MORNINGS.slice(2, 3), { reason: 'laat_gegeten' }, 'l'), ...nights(MORNINGS, alcohol('matig'), 'a')];
    expect(recordedCounts(entries).map((c) => [c.group.key, c.count])).toEqual([['alcohol:matig', 4], ['wiet', 2], ['laat_gegeten', 1]]);
    const line = tooFewLine(entries)!;
    expect(line).toContain('wiet (2 keer)');
    expect(line).toContain('laat gegeten (1 keer)');
    expect(line).not.toMatch(/nog \d keer nodig/);
    expect(tooFewLine(nights(MORNINGS, alcohol('matig')))).toBeUndefined();
  });

  it('schrijft een min met het minteken en een plus voor meer', () => {
    expect(signed(7)).toBe('+7');
    expect(signed(-12)).toBe('−12');
    expect(signed(0.2)).toBe('0');
  });
});

describe('onderzoeksregels', () => {
  it('staan er alleen voor alcohol en wiet en alleen met getallen uit het onderzoek', () => {
    expect(researchLine(groupOf(alcohol('matig')), 'restingHr')).toBe('Onderzoek vindt bij 3 tot 5 glazen 4 tot 8 slagen hoger.');
    expect(researchLine(groupOf(alcohol('matig')), 'hrv')).toContain('6 tot 15 ms lager');
    expect(researchLine(groupOf(alcohol('veel')), 'restingHr')).toContain('8 tot 15 slagen');
    expect(researchLine(groupOf({ reason: 'wiet' }), 'paceHr')).toContain('14 tot 18 slagen');
    expect(researchLine(groupOf({ reason: 'stress' }), 'restingHr')).toBeUndefined();
    expect(researchLine(groupOf(alcohol('matig')), 'effort')).toBeUndefined();
    expect(researchLine(groupOf({ reason: 'alcohol' }), 'restingHr')).toBeUndefined();
  });
});

describe('zwaarte', () => {
  const logAt = (id: string, date: string, feel: 'better' | 'normal' | 'worse'): SessionLog => ({
    id, templateId: 'x', type: 'cardio', completedDate: date, completedAt: `${date}T08:00:00.000Z`, variant: 'custom', durationMinutes: 40, subjectiveFeel: feel, source: 'manual',
  });
  it('vergelijkt hoe een training voelde met je normale trainingen van de vier weken ervoor', () => {
    const normal = ['2026-09-22', '2026-09-24', '2026-09-26', '2026-09-30', '2026-10-02', '2026-10-05'].map((d, i) => logAt(`n${i}`, d, 'normal'));
    const heavy = ['2026-10-08', '2026-10-10', '2026-10-12'].map((d, i) => logAt(`h${i}`, d, 'worse'));
    const entries = heavy.map((l, i) => entry(`e${i}`, l.completedDate, [alcohol('matig')], { logId: l.id }));
    const e = influenceEffects(base({ entries, logs: [...normal, ...heavy] })).find((x) => x.measure === 'effort')!;
    expect(e.count).toBe(3);
    expect(e.points.every((p) => p.outside)).toBe(true);
    expect(e.meanDiff).toBe(2);
  });
});

describe('hartslag bij een rustig tempo', () => {
  const cool = { tempC: 12, feelsC: 11, windKmh: 10, gustKmh: 18, rainMm: 0, source: 'lookup' as const };
  const earlier = EARLIER_DATES.map((date, i) => runLog({ id: `e${i}`, date, spec: { ...EASY, seed: 10 + i }, conditions: cool, strap: true }));
  const subject = (hr: number) => runLog({ id: 's', date: '2026-10-18', spec: { ...EASY, hr, seed: 99 }, conditions: cool, strap: true });
  const run = (logs: SessionLog[]) => ({ hr: { lthr: 170, restingHr: 50 }, legs: context(logs).legs, chestStrap: true });

  it('gebruikt de bestaande vergelijking en geeft het verschil in slagen', () => {
    const logs = [...earlier, subject(150)];
    const input = base({ entries: [entry('r', '2026-10-18', [{ reason: 'wiet' }], { logId: 's' })], logs, run: run(logs) });
    const p = new InfluenceCalculator(input).pointAt('paceHr', '2026-10-18')!;
    expect(p.diff).toBeGreaterThan(6);
    expect(p.diff).toBeLessThan(10);
    expect(p.outside).toBe(true);
  });

  it('ziet een gewoon loopje als binnen de schommeling', () => {
    const logs = [...earlier, subject(143)];
    const input = base({ entries: [entry('r', '2026-10-18', [{ reason: 'wiet' }], { logId: 's' })], logs, run: run(logs) });
    expect(new InfluenceCalculator(input).pointAt('paceHr', '2026-10-18')!.outside).toBe(false);
  });

  it('is er niet zonder loopgegevens', () => {
    const logs = [...earlier, subject(150)];
    expect(new InfluenceCalculator(base({ logs })).pointAt('paceHr', '2026-10-18')).toBeUndefined();
  });
});

describe('lijkt op', () => {
  // Vier keer stress (+3) en vier keer alcohol (+8): de ochtend van nu is +8.
  const stress = ['2026-09-06', '2026-09-13', '2026-09-20', '2026-09-27'];
  const wine = ['2026-10-01', '2026-10-05', '2026-10-09', '2026-10-13'];
  const entries = [...nights(stress, { reason: 'stress' }, 's'), ...nights(wine, alcohol('matig'), 'a')];
  const mm = (now: number) => metrics({ ...bumped(stress, { restingHeartRate: 53 }), ...bumped(wine, { restingHeartRate: 58 }), '2026-10-20': { restingHeartRate: now } });
  const ask = (now: number, over: Record<string, unknown> = {}) =>
    looksLike({ ...base({ entries, metrics: mm(now) }), cause: 'patroon', measure: 'restingHr', date: '2026-10-20', ...over });

  it('noemt de reden als de waarde in haar band valt en buiten de andere', () => {
    const r = ask(58)!;
    expect(r.group.key).toBe('alcohol:matig');
    expect(r.times).toBe(4);
    expect(r.otherTimes).toBe(4);
  });

  it('zegt niets als de waarde in geen van beide bandes valt of in de andere', () => {
    expect(ask(50)).toBeUndefined();
    expect(ask(53)?.group.key).toBe('stress');
  });

  it('zegt niets bij minder dan 4 keer, of als de andere keren te weinig zijn', () => {
    expect(looksLike({ ...base({ entries: entries.filter((e) => e.id !== 'a0'), metrics: mm(58) }), cause: 'patroon', measure: 'restingHr', date: '2026-10-20' })?.group.key).toBeUndefined();
    expect(looksLike({ ...base({ entries: entries.filter((e) => !['s0', 's1'].includes(e.id)), metrics: mm(58) }), cause: 'patroon', measure: 'restingHr', date: '2026-10-20' })).toBeUndefined();
  });

  it('zegt niets als de banden elkaar raken', () => {
    const touching = metrics({ ...bumped(stress, { restingHeartRate: 55 }), ...bumped(wine, { restingHeartRate: 58 }), '2026-09-13': { restingHeartRate: 58 }, '2026-10-20': { restingHeartRate: 58 } });
    expect(looksLike({ ...base({ entries, metrics: touching }), cause: 'patroon', measure: 'restingHr', date: '2026-10-20' })).toBeUndefined();
  });

  it('antwoordt alleen bij patroon of zonder keuze', () => {
    expect(ask(58, { cause: undefined })).toBeDefined();
    expect(ask(58, { cause: 'uit' })).toBeUndefined();
    expect(ask(58, { cause: 'weet' })).toBeUndefined();
  });

  it('gebruikt bij wiet alleen je eigen keren', () => {
    const weed = nights(wine, { reason: 'wiet' }, 'w');
    const r = looksLike({ ...base({ entries: [...nights(stress, { reason: 'stress' }, 's'), ...weed], metrics: mm(58) }), cause: 'patroon', measure: 'restingHr', date: '2026-10-20' })!;
    expect(r.group.reason).toBe('wiet');
    expect(r.times).toBe(4);
  });
});

describe('de zinnen onder de strook', () => {
  const MORNS = ['2026-09-20', '2026-09-27', '2026-10-04', '2026-10-11'];
  const input = base({ entries: nights(MORNS, alcohol('matig')), metrics: metrics(bumped(MORNS, { restingHeartRate: 57, hrv: 46, sleepMinutes: 385 })) });
  const effects = influenceEffects(input);
  const pick = (m: string) => effects.find((e) => e.measure === m)!;

  it('telt de keren en wat erbuiten viel', () => {
    expect(countLine(pick('restingHr'))).toBe('4 keer \u00b7 elke keer erbuiten');
  });

  it('geeft per meting één feitelijke zin zonder oordeel', () => {
    expect(factSentence(pick('restingHr'))).toBe('Alle 4 keer buiten je schommeling.');
    expect(factSentence(pick('hrv'))).toMatch(/^Alle 4 keer buiten je schommeling\. Dat is \d+% onder je gemiddelde van \d+ ms\.$/);
    expect(factSentence(pick('sleep'))).toContain('Gemiddeld 6 u 25 tegen');
    expect(factSentence(pick('sleep'))).toContain('de duur is betrouwbaarder dan de fasen');
    for (const m of ['restingHr', 'hrv', 'sleep']) expect(factSentence(pick(m))).not.toMatch(/helaas|[\u2013\u2014]/);
  });

  it('zegt onder de 3 keer alleen hoeveel er is, zonder opdracht', () => {
    expect(fewLine('effort', 2)).toBe('Nog te weinig: 2 trainingen met een zwaarte. Vanaf 3 staat het hier.');
    expect(fewLine('restingHr', 1)).toContain('1 ochtend met een rusthartslag');
    expect(fewLine('hrv', 0)).toContain('Nog niets');
    expect(fewLine('effort', 2)).not.toMatch(/nog \d keer nodig/);
  });
});

describe('de schaal van een meting', () => {
  it('is voor alle redenen dezelfde en past om de grootste afwijking en de band', () => {
    const MORNS = ['2026-09-20', '2026-09-27', '2026-10-04'];
    const effects = influenceEffects(base({ entries: nights(MORNS, alcohol('veel')), metrics: metrics(bumped(MORNS, { restingHeartRate: 60 })) }));
    const e = effects.find((x) => x.measure === 'restingHr')!;
    expect(scaleFor([e])).toBeGreaterThan(Math.max(...e.points.map((p) => Math.abs(p.diff))));
    expect(scaleFor([])).toBe(1);
  });
});

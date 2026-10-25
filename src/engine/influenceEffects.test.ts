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
  looksLikeText,
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
  // Vier keer alcohol (+8) tegenover je gewone ochtenden zonder notitie (rond 50): de ochtend van nu is +8.
  const wine = ['2026-10-01', '2026-10-05', '2026-10-09', '2026-10-13'];
  const entries = nights(wine, alcohol('matig'), 'a');
  const mm = (now: number, extra: Record<string, Partial<RecoveryMetric>> = {}) => metrics({ ...bumped(wine, { restingHeartRate: 58 }), '2026-10-20': { restingHeartRate: now }, ...extra });
  const ask = (now: number, over: Record<string, unknown> = {}, list = entries, extra: Record<string, Partial<RecoveryMetric>> = {}) =>
    looksLike({ ...base({ entries: list, metrics: mm(now, extra) }), cause: 'patroon', measure: 'restingHr', date: '2026-10-20', ...over });

  it('geeft een antwoord als alleen alcohol is vastgelegd, tegenover je gewone ochtenden', () => {
    const r = ask(58)!;
    expect(r.group.key).toBe('alcohol:matig');
    expect(r.times).toBe(4);
    expect(r.otherTimes).toBeGreaterThanOrEqual(4);
    expect(looksLikeText(r).line).toBe(`Uit 4 keer met die reden en ${r.otherTimes} keer zonder. Zeker weten doet ASCEND het niet.`);
  });

  it('zegt niets als de waarde bij je gewone ochtenden past', () => {
    expect(ask(50)).toBeUndefined();
    expect(ask(51)).toBeUndefined();
  });

  it('zegt niets bij minder dan 4 keer met de reden', () => {
    expect(ask(58, {}, entries.slice(0, 3))).toBeUndefined();
  });

  it('zegt niets als de banden elkaar raken', () => {
    expect(ask(58, {}, entries, { '2026-10-02': { restingHeartRate: 58 }, '2026-10-03': { restingHeartRate: 58 } })).toBeUndefined();
  });

  it('een andere reden is niet de andere kant: ochtenden met die reden tellen niet als gewoon', () => {
    const stress = nights(['2026-09-06', '2026-09-13', '2026-09-20', '2026-09-27'], { reason: 'stress' }, 's');
    const r = ask(58, {}, [...entries, ...stress], bumped(['2026-09-06', '2026-09-13', '2026-09-20', '2026-09-27'], { restingHeartRate: 58 }))!;
    expect(r.group.key).toBe('alcohol:matig');
  });

  it('antwoordt alleen bij patroon of zonder keuze', () => {
    expect(ask(58, { cause: undefined })).toBeDefined();
    expect(ask(58, { cause: 'uit' })).toBeUndefined();
    expect(ask(58, { cause: 'weet' })).toBeUndefined();
  });

  it('gebruikt bij wiet alleen je eigen keren', () => {
    const r = ask(58, {}, nights(wine, { reason: 'wiet' }, 'w'))!;
    expect(r.group.reason).toBe('wiet');
    expect(r.times).toBe(4);
  });
});

describe('wat niet meetelt blijft uit de banden', () => {
  const morning = '2026-10-11';
  const at = (over: Partial<EffectsInput>) => new InfluenceCalculator(base({ entries: nights([morning], alcohol('matig')), ...over }));

  it('een nacht zonder reden die niet meetelt doet niet mee in de band', () => {
    const odd = Array.from({ length: 14 }, (_, i) => addDays('2026-09-25', i));
    const high = Object.fromEntries(odd.map((d) => [d, { restingHeartRate: 70 }]));
    const withOdd = at({ metrics: metrics(high) }).pointAt('restingHr', morning)!;
    const flagged = odd.map((d, i) => entry(`x${i}`, addDays(d, -1), [], { excludeHeartRate: true }));
    const skipped = at({ entries: [...nights([morning], alcohol('matig')), ...flagged], metrics: metrics(high) }).pointAt('restingHr', morning)!;
    expect(withOdd.center).toBeGreaterThan(50);
    expect(skipped.center).toBe(50);
  });

  it('een nacht die je niet goed gemeten noemde telt niet voor slaap en HRV, wel voor rusthartslag niet te missen', () => {
    const days = ['2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09'];
    const low = Object.fromEntries(days.map((d) => [d, { hrv: 20, sleepMinutes: 120 }]));
    const judgments = days.map((d) => ({ date: d, verdict: 'niet_goed' as const, minutes: 120 }));
    const plain = at({ metrics: metrics(low) });
    const judged = at({ metrics: metrics(low), nightJudgments: judgments });
    expect(plain.pointAt('hrv', morning)!.center).toBeLessThan(judged.pointAt('hrv', morning)!.center);
    expect(judged.pointAt('sleep', morning)!.center).toBeGreaterThan(400);
  });

  it('een training zonder reden die niet meetelt blijft uit de band van zwaarte', () => {
    const logAt = (id: string, date: string, feel: 'normal' | 'worse'): SessionLog => ({
      id, templateId: 'x', type: 'cardio', completedDate: date, completedAt: `${date}T08:00:00.000Z`, variant: 'custom', durationMinutes: 40, subjectiveFeel: feel, source: 'manual',
    });
    const normal = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'].map((d, i) => logAt(`n${i}`, d, 'normal'));
    const heavy = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09'].map((d, i) => logAt(`h${i}`, d, 'worse'));
    const target = logAt('t', '2026-10-10', 'worse');
    const entriesFor = (skip: boolean) => [entry('e', '2026-10-10', [alcohol('matig')], { logId: 't' }), ...(skip ? heavy.map((l, i) => entry(`s${i}`, l.completedDate, [], { logId: l.id, excludeHeartRate: true })) : [])];
    const without = new InfluenceCalculator(base({ entries: entriesFor(false), logs: [...normal, ...heavy, target] })).pointAt('effort', '2026-10-10')!;
    const withSkip = new InfluenceCalculator(base({ entries: entriesFor(true), logs: [...normal, ...heavy, target] })).pointAt('effort', '2026-10-10')!;
    expect(withSkip.center).toBe(0);
    expect(without.center).toBeGreaterThan(0);
  });

  it('met een reden telt een nacht die niet meetelt wel als punt', () => {
    const flagged = nights(['2026-09-20', '2026-09-27', '2026-10-04'], alcohol('matig')).map((e) => ({ ...e, excludeHeartRate: true }));
    const e = influenceEffects(base({ entries: flagged, metrics: metrics(bumped(['2026-09-20', '2026-09-27', '2026-10-04'], { restingHeartRate: 57 })) })).find((x) => x.measure === 'restingHr')!;
    expect(e.count).toBe(3);
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

describe('lijkt op, de zinnen', () => {
  it('noemt de reden in kleine letters en het aantal keer, zonder percentage', () => {
    const t = looksLikeText({ group: groupOf({ reason: 'alcohol', amount: 'matig' }), measure: 'paceHr', times: 4, otherTimes: 6 });
    expect(t.title).toBe('Lijkt op je loopjes bij alcohol, 3 tot 5 glazen');
    expect(t.line).toBe('Uit 4 keer met die reden en 6 keer zonder. Zeker weten doet ASCEND het niet.');
    expect(`${t.title} ${t.line}`).not.toMatch(/%|waarschijnlijk/);
  });

  it('laat een eigen woord zoals je het schreef', () => {
    const t = looksLikeText({ group: groupOf({ reason: 'anders', label: 'Verjaardag' }), measure: 'paceHr', times: 4, otherTimes: 4 });
    expect(t.title).toBe('Lijkt op je loopjes bij Verjaardag');
  });
});

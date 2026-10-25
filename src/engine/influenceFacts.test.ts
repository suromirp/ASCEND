import { describe, it, expect } from 'vitest';
import type { InfluenceEntry } from '../models/influence';
import type { RecoveryMetric } from '../models/metrics';
import type { SessionLog } from '../models/training';
import { addDays } from '../utils/dates';
import { TEMPLATES } from './fixtures/runLogs';
import { derivedFactEntries, knownFacts } from './influence';
import { InfluenceCalculator, hasAnythingToShow, influenceEffects, recordedCounts, type EffectsInput } from './influenceEffects';

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
    const reasonsAt = (id: string) => derived.find((e) => e.id === id)?.reasons.map((r) => r.reason);
    const t = logs.find((l) => l.id === 't') as SessionLog;
    const same = (target: Parameters<typeof knownFacts>[0]['target']) =>
      knownFacts({ target, logs, templates: TEMPLATES, recovery: rec, illness: ill, cause: 'patroon' }).map((f) => f.reason);
    expect(reasonsAt('fact-log-t')).toEqual(same({ kind: 'log', log: t }));
    expect(reasonsAt('fact-day-2026-09-20')).toEqual(same({ kind: 'day', date: '2026-09-20' }));
    expect(reasonsAt('fact-day-2026-09-21')).toEqual(same({ kind: 'day', date: '2026-09-21' }));
    expect(reasonsAt('fact-log-t')).toEqual(['zware_beendag', 'kort_geslapen', 'ziek']);
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

  it('maakt een dag met een feit niet gewoon voor lijkt op', () => {
    const withFact = new InfluenceCalculator(base({ logs: legLogs }));
    const without = new InfluenceCalculator(base({ logs: legLogs, facts: [] }));
    const morning = addDays(LEGS[0], 1);
    expect(without.isPlain(morning, 'restingHr')).toBe(true);
    expect(withFact.isPlain(morning, 'restingHr')).toBe(false);
    expect(withFact.isPlain(LEGS[0], 'effort')).toBe(true);
    expect(withFact.isPlain(morning, 'effort')).toBe(false);
  });
});

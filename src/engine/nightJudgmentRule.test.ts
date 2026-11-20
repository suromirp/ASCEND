// De ene regel voor een oordeel "Niet goed gemeten" (docs/beslissingen/2026-11-20-niet-goed-gemeten-
// rest.md): staat "Vragen bij een korte nacht" uit, dan telt een eerder oordeel nergens mee. Alle
// plekken die een oordeel lezen staan hier naast elkaar. De ochtenden zijn nagemaakt.

import { describe, expect, it } from 'vitest';
import type { NightJudgment } from '../models/checkIn';
import type { LeavePeriod } from '../models/leave';
import type { RecoveryMetric } from '../models/metrics';
import { addDays } from '../utils/dates';
import { illnessSign } from './illnessSigns';
import { knownFacts } from './influence';
import { influenceEffects } from './influenceEffects';
import { morningRule } from './morningRule';
import { ignoredNightDates, judgmentsInUse } from './shortNight';
import { todayWellness } from './wellnessCheck';

const today = '2026-11-20';
const yesterday = addDays(today, -1);

// Vijf weken gewone ochtenden; `special` overschrijft losse dagen.
function mornings(special: Record<string, Partial<RecoveryMetric>> = {}): RecoveryMetric[] {
  const out: RecoveryMetric[] = [];
  for (let i = 35; i >= 0; i--) {
    const date = addDays(today, -i);
    out.push({ id: `intervals.icu:${date}`, date, source: 'import', restingHeartRate: 50 + (i % 3) - 1, hrv: 60 + (i % 5) - 2, sleepMinutes: 450 + (i % 4) * 5, ...special[date] });
  }
  return out;
}

interface Stored { askShortNight?: boolean; nightJudgments?: NightJudgment[]; leavePeriods?: LeavePeriod[] }
const judged = (date: string, minutes: number): NightJudgment => ({ date, verdict: 'niet_goed', minutes });

// Wat de vier plekken van deze ochtend maken, gelezen zoals de hooks het doen: alles via judgmentsInUse.
function readers(settings: Stored, metrics: RecoveryMetric[], day = today) {
  const judgments = judgmentsInUse(settings);
  const ask = settings.askShortNight !== false;
  const ignored = ignoredNightDates(judgments, metrics);
  return {
    card: todayWellness(day, metrics, { ask, judgments })?.night?.state,
    ruleHasSleep: !!morningRule(day, metrics, { ignoredNights: ignored })?.signals.some((s) => s.key === 'sleep'),
    shortNightFact: knownFacts({ target: { kind: 'day', date: addDays(day, -1) }, logs: [], templates: [], recovery: metrics, illness: undefined, judgments, cause: 'patroon' }).some((f) => f.reason === 'kort_geslapen'),
    shortNightsInOverview: influenceEffects({ entries: [], metrics, logs: [], templates: [], program: null, nightJudgments: judgments }).find((e) => e.measure === 'sleep' && e.group.key === 'kort_geslapen')?.count ?? 0,
  };
}

describe('judgmentsInUse', () => {
  const list = [judged(today, 200)];

  it('geeft de oordelen als de instelling aan staat of nooit is aangeraakt', () => {
    expect(judgmentsInUse({ nightJudgments: list })).toBe(list);
    expect(judgmentsInUse({ askShortNight: true, nightJudgments: list })).toBe(list);
    expect(judgmentsInUse({})).toEqual([]);
  });

  it('geeft niets als de instelling uit staat, en steeds dezelfde lege lijst', () => {
    const off = judgmentsInUse({ askShortNight: false, nightJudgments: list });
    expect(off).toEqual([]);
    expect(judgmentsInUse({ askShortNight: false, nightJudgments: [judged(yesterday, 100)] })).toBe(off);
  });

  it('laat de bewaarde lijst zelf met rust', () => {
    const settings = { askShortNight: false, nightJudgments: list };
    judgmentsInUse(settings);
    expect(settings.nightJudgments).toEqual([judged(today, 200)]);
  });
});

describe('een oordeel met de instelling aan, uit en weer aan', () => {
  // Drie korte nachten, alle drie "Niet goed gemeten", de laatste vandaag.
  const short = [addDays(today, -14), addDays(today, -7), today];
  const metrics = mornings(Object.fromEntries(short.map((d) => [d, { sleepMinutes: 200 }])));
  const nightJudgments = short.map((d) => judged(d, 200));

  const counted = { card: 'ignored', ruleHasSleep: false, shortNightFact: false, shortNightsInOverview: 0 };
  const notCounted = { card: undefined, ruleHasSleep: true, shortNightFact: true, shortNightsInOverview: 3 };

  it('aan: het oordeel telt op alle vier de plekken', () => {
    expect(readers({ nightJudgments }, metrics)).toEqual(counted);
  });

  it('uit: het oordeel telt nergens, ook niet in Wat speelde er', () => {
    expect(readers({ askShortNight: false, nightJudgments }, metrics)).toEqual(notCounted);
  });

  it('uit is gelijk aan nooit een oordeel gegeven hebben', () => {
    expect(readers({ askShortNight: false, nightJudgments }, metrics)).toEqual(readers({ askShortNight: false }, metrics));
  });

  it('weer aan: hetzelfde bewaarde oordeel telt weer', () => {
    const stored: Stored = { nightJudgments };
    const off: Stored = { ...stored, askShortNight: false };
    const onAgain: Stored = { ...off, askShortNight: true };
    expect(onAgain.nightJudgments).toBe(nightJudgments);
    expect(readers(stored, metrics)).toEqual(counted);
    expect(readers(off, metrics)).toEqual(notCounted);
    expect(readers(onAgain, metrics)).toEqual(counted);
  });
});

describe('een nacht in een vakantie', () => {
  // De nacht valt midden in een vrije periode. Geen van de plekken leest de vakantie: het oordeel
  // geldt daar net als thuis, en uit is ook daar uit.
  const leavePeriods: LeavePeriod[] = [{ id: 'vrij-1', kind: 'free_days', startDate: addDays(today, -3), endDate: addDays(today, 4) }];
  const metrics = mornings({ [today]: { sleepMinutes: 200 } });
  const nightJudgments = [judged(today, 200)];

  it('telt het oordeel net als op een gewone dag', () => {
    expect(readers({ nightJudgments, leavePeriods }, metrics)).toEqual(readers({ nightJudgments }, metrics));
    expect(readers({ nightJudgments, leavePeriods }, metrics).card).toBe('ignored');
  });

  it('telt het oordeel niet als de instelling uit staat', () => {
    const r = readers({ askShortNight: false, nightJudgments, leavePeriods }, metrics);
    expect(r.card).toBeUndefined();
    expect(r.shortNightFact).toBe(true);
  });
});

describe('vroeg ziek zien leest dezelfde regel', () => {
  const bad = { restingHeartRate: 57, hrv: 48, sleepMinutes: 200 };
  const metrics = mornings({ [yesterday]: bad, [today]: bad });
  const nightJudgments = [judged(today, 200)];
  const sign = (settings: Stored) => illnessSign({ today, metrics, ignoredNights: ignoredNightDates(judgmentsInUse(settings), metrics) });

  it('aan: de HRV van vandaag telt niet, dus geen vraag', () => {
    expect(sign({ nightJudgments })).toBeUndefined();
  });

  it('uit: het oordeel telt niet, de vraag komt zoals zonder oordeel', () => {
    expect(sign({ askShortNight: false, nightJudgments })?.mornings).toBe(2);
    expect(sign({ askShortNight: false, nightJudgments })).toEqual(sign({}));
  });

  it('weer aan: de vraag is weer weg', () => {
    expect(sign({ askShortNight: true, nightJudgments })).toBeUndefined();
  });
});

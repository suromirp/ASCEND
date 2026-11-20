import { describe, expect, it } from 'vitest';
import { belongsToLink, doubleMornings, morningsToImport } from './morningDouble';
import { isSourcelessMorning, orderBySource } from './sourcePrecedence';
import { baselineValues, dayRecord } from './wellnessCheck';
import type { RecoveryMetric } from '../models/metrics';

// Nagemaakte ochtenden (docs/beslissingen/2026-11-20-ochtend-dubbel.md).
const m = (id: string, numbers: Partial<RecoveryMetric> = { restingHeartRate: 50 }): RecoveryMetric => ({ id, date: id.slice(id.indexOf(':') + 1), source: 'import', ...numbers });

describe('een ochtend zonder bron', () => {
  it('is alleen het id dat de import zelf maakte', () => {
    expect(isSourcelessMorning('import:2026-11-10')).toBe(true);
    for (const id of ['intervals.icu:2026-11-10', 'health-connect:2026-11-10', 'manual:2026-11-10', 'garmin:2026-11-10', 'important:2026-11-10', 'eigen-id']) expect(isSourcelessMorning(id)).toBe(false);
  });

  it('hoort bij de koppeling, net als wat opgehaald is; met de hand ingevuld nooit', () => {
    expect(belongsToLink('intervals.icu:2026-11-10', 'intervals.icu:')).toBe(true);
    expect(belongsToLink('import:2026-11-10', 'intervals.icu:')).toBe(true);
    expect(belongsToLink('manual:2026-11-10', 'intervals.icu:')).toBe(false);
    expect(belongsToLink('health-connect:2026-11-10', 'intervals.icu:')).toBe(false);
  });
});

describe('doubleMornings', () => {
  it('noemt de ochtend zonder bron als een ochtend met een bron op die dag elk getal ook heeft', () => {
    const list = [m('import:2026-11-10', { restingHeartRate: 58, sleepMinutes: 300 }), m('intervals.icu:2026-11-10', { restingHeartRate: 50, hrv: 60, sleepMinutes: 440 })];
    expect(doubleMornings(list).map((r) => r.id)).toEqual(['import:2026-11-10']);
  });

  it('laat hem staan als hij een getal heeft dat de andere mist, als hij alleen is, of op een andere dag', () => {
    expect(doubleMornings([m('import:2026-11-10', { hrv: 66 }), m('intervals.icu:2026-11-10')])).toEqual([]);
    expect(doubleMornings([m('import:2026-11-10')])).toEqual([]);
    expect(doubleMornings([m('import:2026-11-10'), m('intervals.icu:2026-11-11')])).toEqual([]);
  });

  it('twee bronnen dekken samen, en een ochtend met een bron wordt nooit genoemd', () => {
    const list = [m('import:2026-11-10', { restingHeartRate: 58, sleepMinutes: 300 }), m('intervals.icu:2026-11-10', { restingHeartRate: 50 }), m('health-connect:2026-11-10', { sleepMinutes: 420 }), m('manual:2026-11-10', { restingHeartRate: 49 })];
    expect(doubleMornings(list).map((r) => r.id)).toEqual(['import:2026-11-10']);
  });

  it('`others` dekt mee maar wordt zelf niet beoordeeld', () => {
    expect(doubleMornings([m('import:2026-11-10')], [m('intervals.icu:2026-11-10'), m('import:2026-11-11'), m('intervals.icu:2026-11-11')]).map((r) => r.id)).toEqual(['import:2026-11-10']);
  });
});

describe('morningsToImport', () => {
  it('schrijft niets wat het toestel al heeft en geen ochtend zonder bron die niets toevoegt', () => {
    const device = [m('intervals.icu:2026-11-10'), m('import:2026-11-12')];
    const incoming = [m('intervals.icu:2026-11-10', { restingHeartRate: 44 }), m('import:2026-11-10'), m('import:2026-11-11'), m('import:2026-11-12', { restingHeartRate: 44 }), m('import:2026-11-13'), m('intervals.icu:2026-11-13')];
    expect(morningsToImport(device, incoming).map((r) => r.id)).toEqual(['import:2026-11-11', 'intervals.icu:2026-11-13']);
  });

  it('een bestand met alleen ochtenden zonder bron op een leeg toestel komt heel binnen', () => {
    const incoming = [m('import:2026-11-10'), m('import:2026-11-11')];
    expect(morningsToImport([], incoming)).toEqual(incoming);
  });
});

describe('de volgorde bij het lezen', () => {
  // In de opslag staat "import:" voor "intervals.icu:" (sleutelvolgorde).
  const stored = [m('import:2026-11-10', { restingHeartRate: 58, hrv: 66 }), m('health-connect:2026-11-10', { restingHeartRate: 54, sleepMinutes: 400 }), m('intervals.icu:2026-11-10', { restingHeartRate: 50 })];

  it('eerst de bron die voorgaat, dan de aanvullende, de ochtend zonder bron als laatste', () => {
    expect(orderBySource(stored).map((r) => r.id)).toEqual(['intervals.icu:2026-11-10', 'health-connect:2026-11-10', 'import:2026-11-10']);
  });

  it('de dag en het gemiddelde nemen het getal van de bron', () => {
    const ordered = orderBySource(stored);
    expect(dayRecord('2026-11-10', ordered)).toMatchObject({ id: 'intervals.icu:2026-11-10', restingHeartRate: 50, sleepMinutes: 400, hrv: 66 });
    expect(baselineValues('2026-11-11', ordered, (r) => r.restingHeartRate)).toEqual([50]);
  });
});

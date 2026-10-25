import { describe, expect, it } from 'vitest';
import type { SweatEntry } from '../models/sweat';
import { basisLabel, defaultSweatRate, entryRate, entryResultLine, mergeSweatEntries, isSweatLog, sweatActivityOfLog, sweatLossMl, sweatRateAt, usableSweatEntries, weighedCount, weighedDate } from './sweat';

const entry = (over: Partial<SweatEntry> & { id: string }): SweatEntry => ({
  logId: `log-${over.id}`,
  date: '2026-06-01',
  activity: 'walk',
  durationMinutes: 120,
  updatedAt: '2026-06-01T10:00:00.000Z',
  ...over,
});

describe('sweatLossMl', () => {
  it('is het gewichtsverschil in ml', () => {
    expect(sweatLossMl({ weightBeforeKg: 80, weightAfterKg: 79.2 })).toBe(800);
  });
  it('telt wat je dronk erbij en haalt wat je plaste eraf', () => {
    expect(sweatLossMl({ weightBeforeKg: 80, weightAfterKg: 79.5, drankMl: 600, peeMl: 200 })).toBe(900);
  });
  it('is onbekend zonder allebei de wegingen', () => {
    expect(sweatLossMl({ weightBeforeKg: 80 })).toBeUndefined();
    expect(sweatLossMl({ weightAfterKg: 80 })).toBeUndefined();
  });
});

describe('entryRate', () => {
  it('rekent het verlies om naar ml per uur', () => {
    expect(entryRate(entry({ id: 'a', durationMinutes: 56, weightBeforeKg: 80, weightAfterKg: 79.1 }))).toEqual({ mlPerHour: 964, source: 'weighed' });
  });
  it('slaat een te korte meting over', () => {
    expect(entryRate(entry({ id: 'a', durationMinutes: 20, weightBeforeKg: 80, weightAfterKg: 79.5 }))).toBeUndefined();
  });
  it('slaat een gewichtstoename en een onmogelijk tempo over', () => {
    expect(entryRate(entry({ id: 'a', weightBeforeKg: 80, weightAfterKg: 80.4 }))).toBeUndefined();
    expect(entryRate(entry({ id: 'b', durationMinutes: 60, weightBeforeKg: 80, weightAfterKg: 74 }))).toBeUndefined();
  });
  it('valt terug op de schatting van het horloge, maar een weging gaat voor', () => {
    expect(entryRate(entry({ id: 'a', durationMinutes: 56, watchMl: 924 }))).toEqual({ mlPerHour: 990, source: 'watch' });
    expect(entryRate(entry({ id: 'b', durationMinutes: 60, watchMl: 2000, weightBeforeKg: 80, weightAfterKg: 79 }))?.source).toBe('weighed');
  });
  it('zegt het resultaat in een zin', () => {
    expect(entryResultLine(entry({ id: 'a', durationMinutes: 60, weightBeforeKg: 80, weightAfterKg: 79.2 }))).toBe('Gewogen: ongeveer 800 ml verloren, 800 ml per uur.');
    expect(entryResultLine(entry({ id: 'b', durationMinutes: 60 }))).toBeUndefined();
  });
});

describe('sweatRateAt: de terugval zonder metingen', () => {
  it('geeft de standaard naar algemene cijfers, gemarkeerd als nog niet gemeten', () => {
    expect(sweatRateAt(undefined, 20)).toEqual({ mlPerHour: 900, basis: 'default', count: 0, tempC: 20 });
    expect(sweatRateAt([], 20).basis).toBe('default');
  });
  it('de standaardlijn loopt van 500 naar 1.250 en blijft daartussen', () => {
    expect(defaultSweatRate(0)).toBe(500);
    expect(defaultSweatRate(10)).toBe(500);
    expect(defaultSweatRate(30)).toBe(1250);
    expect(defaultSweatRate(40)).toBe(1250);
    expect(defaultSweatRate(15)).toBe(700);
  });
  it('de standaard blijft binnen de algemene cijfers: 1,0 tot 1,5 liter per uur in de warmte', () => {
    expect(defaultSweatRate(28)).toBeGreaterThanOrEqual(1000);
    expect(defaultSweatRate(30)).toBeLessThanOrEqual(1500);
  });
  it('noemt de standaard nog niet gemeten, naar algemene cijfers, zonder het woord voorzichtig', () => {
    const label = basisLabel(sweatRateAt([], 20));
    expect(label).toBe('nog niet gemeten, naar algemene cijfers');
    expect(label).not.toMatch(/voorzichtig/i);
  });
  it('een meting zonder bruikbare getallen telt niet als meting', () => {
    expect(sweatRateAt([entry({ id: 'a', durationMinutes: 10, weightBeforeKg: 80, weightAfterKg: 79 })], 20).basis).toBe('default');
  });
});

describe('sweatRateAt: uit je eigen metingen', () => {
  const at = (id: string, tempC: number, lossKg: number, extra: Partial<SweatEntry> = {}) =>
    entry({ id, tempC, weightBeforeKg: 80, weightAfterKg: 80 - lossKg, durationMinutes: 120, ...extra });

  it('neemt het gemiddelde van de metingen in de buurt van de temperatuur', () => {
    const r = sweatRateAt([at('a', 21, 1.2), at('b', 23, 1.6), at('c', 10, 0.6)].slice(0, 2), 22);
    expect(r).toMatchObject({ mlPerHour: 700, basis: 'measured', count: 2 });
  });
  it('trekt een lijn als de metingen genoeg uit elkaar liggen', () => {
    // 10 graden 400, 20 graden 800, 30 graden 1.200 ml per uur
    const list = [at('a', 10, 0.8), at('b', 20, 1.6), at('c', 30, 2.4)];
    expect(sweatRateAt(list, 25).mlPerHour).toBe(1000);
    expect(sweatRateAt(list, 15).mlPerHour).toBe(600);
  });
  it('schuift een meting op een andere temperatuur mee met jouw verhouding tot de standaard', () => {
    // 13 graden en ruim boven de standaard: de verhouding schuift mee naar een warme dag
    const r = sweatRateAt([at('a', 13, 1.93)], 28);
    expect(r.basis).toBe('measured');
    expect(r.mlPerHour).toBeGreaterThan(defaultSweatRate(28));
  });
  it('neemt zonder temperatuur het gemiddelde van de metingen', () => {
    const r = sweatRateAt([entry({ id: 'a', weightBeforeKg: 80, weightAfterKg: 79 }), entry({ id: 'b', weightBeforeKg: 80, weightAfterKg: 78.6 })], 22);
    expect(r).toMatchObject({ mlPerHour: 600, basis: 'measured', count: 2 });
  });
  it('laat een wandeling voorgaan voor een wandeling en valt anders terug op alle metingen', () => {
    const run = at('r', 20, 3, { activity: 'run' });
    const walk = at('w', 20, 1.2, { activity: 'walk' });
    expect(sweatRateAt([run, walk], 20, 'walk').mlPerHour).toBe(600);
    expect(sweatRateAt([run], 20, 'walk').basis).toBe('measured');
  });
  it('een eigen weging gaat altijd voor de schatting van het horloge', () => {
    const watch = entry({ id: 'h', tempC: 20, watchMl: 2400 });
    const own = at('o', 20, 1.2);
    expect(sweatRateAt([watch, own], 20)).toMatchObject({ mlPerHour: 600, basis: 'measured' });
    expect(sweatRateAt([watch], 20)).toMatchObject({ mlPerHour: 1200, basis: 'watch' });
  });
});

describe('weighedCount en weighedDate', () => {
  const list = [
    entry({ id: 'a', date: '2026-06-10', weightBeforeKg: 80, weightAfterKg: 79 }),
    entry({ id: 'b', date: '2026-06-01', watchMl: 900 }),
    entry({ id: 'c', date: '2026-06-03', weightBeforeKg: 80, weightAfterKg: 79.3 }),
  ];
  it('telt alleen eigen wegingen', () => {
    expect(weighedCount(list)).toBe(2);
    expect(weighedCount(undefined)).toBe(0);
  });
  it('geeft de datum van de n-de weging, van oud naar nieuw', () => {
    expect(weighedDate(list, 2)).toBe('2026-06-10');
    expect(weighedDate(list, 3)).toBeUndefined();
  });
});

describe('mergeSweatEntries', () => {
  const a = entry({ id: 'a', logId: 'l1', watchMl: 900 });
  const b = entry({ id: 'b', logId: 'l2', watchMl: 800, date: '2026-06-05' });
  it('voegt samen per training en het toestel wint', () => {
    const device = { ...a, watchMl: 1000 };
    const merged = mergeSweatEntries([device], [a, b]);
    expect(merged?.map((e) => e.id)).toEqual(['a', 'b']);
    expect(merged?.find((e) => e.id === 'a')?.watchMl).toBe(1000);
  });
  it('het toestel wint per training, ook als de meting uit de back-up nieuwer is', () => {
    const newer = entry({ id: 'x', logId: 'l1', watchMl: 700, updatedAt: '2026-07-01T00:00:00.000Z' });
    const merged = mergeSweatEntries([a], [newer]);
    expect(merged).toHaveLength(1);
    expect(merged?.[0].id).toBe('a');
  });
  it('houdt van twee metingen uit de back-up voor één training de nieuwste', () => {
    const newer = entry({ id: 'x', logId: 'l9', watchMl: 700, updatedAt: '2026-07-01T00:00:00.000Z' });
    const older = entry({ id: 'y', logId: 'l9', watchMl: 600, updatedAt: '2026-06-01T00:00:00.000Z' });
    expect(mergeSweatEntries(undefined, [older, newer])?.map((e) => e.id)).toEqual(['x']);
  });
  it('brengt een meting terug die je hier wiste en laat niets staan als beide leeg zijn', () => {
    expect(mergeSweatEntries([], [a])).toHaveLength(1);
    expect(mergeSweatEntries(undefined, undefined)).toBeUndefined();
  });
});

describe('usableSweatEntries', () => {
  const e = entry({ id: 'a', logId: 'l1', durationMinutes: 120, weightBeforeKg: 80, weightAfterKg: 78 });
  it('rekent met de duur uit de log zelf, en met de bewaarde duur als terugval', () => {
    expect(usableSweatEntries([e], [{ id: 'l1', durationMinutes: 60 }])[0].durationMinutes).toBe(60);
    expect(entryRate(usableSweatEntries([e], [{ id: 'l1', durationMinutes: 60 }])[0])?.mlPerHour).toBe(2000);
    expect(usableSweatEntries([e], [{ id: 'l1', durationMinutes: 0 }])[0].durationMinutes).toBe(120);
  });
  it('slaat metingen van een training die er niet meer is over, zonder ze te wissen', () => {
    const list = [e];
    expect(usableSweatEntries(list, [{ id: 'l2', durationMinutes: 60 }])).toEqual([]);
    expect(usableSweatEntries(list, undefined)).toEqual([]);
    expect(list).toHaveLength(1);
  });
  it('de taak en het tempo tellen alleen metingen van bestaande trainingen', () => {
    const two = [e, entry({ id: 'b', logId: 'l2', date: '2026-06-02', weightBeforeKg: 80, weightAfterKg: 78.5 })];
    expect(weighedCount(usableSweatEntries(two, [{ id: 'l1', durationMinutes: 120 }, { id: 'l2', durationMinutes: 120 }]))).toBe(2);
    expect(weighedCount(usableSweatEntries(two, [{ id: 'l1', durationMinutes: 120 }]))).toBe(1);
  });
});

describe('welke trainingen een zweetmeting krijgen', () => {
  const base = { type: 'adventure' as const };
  it('een loop, wandeling en tocht wel', () => {
    expect(sweatActivityOfLog({ type: 'cardio' })).toBe('run');
    expect(sweatActivityOfLog({ type: 'hiking' })).toBe('walk');
    expect(isSweatLog(base)).toBe(true);
    expect(sweatActivityOfLog(base)).toBe('walk');
  });
  it('een bergtocht zonder modaliteit krijgt wel de rij Zweetverlies', () => {
    expect(isSweatLog({ type: 'adventure', outdoorData: { durationMinutes: 300, source: 'manual' } })).toBe(true);
  });
  it('een fietstocht als avontuur en kracht niet', () => {
    expect(isSweatLog({ type: 'adventure', sport: 'cycling' })).toBe(false);
    expect(isSweatLog({ type: 'adventure', outdoorData: { durationMinutes: 120, modality: 'bike_outdoor', source: 'manual' } })).toBe(false);
    expect(isSweatLog({ type: 'strength' })).toBe(false);
  });
});

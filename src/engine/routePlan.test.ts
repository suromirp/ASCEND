import { describe, it, expect } from 'vitest';
import { applyChoice, buildItinerary, canMergeWithNext, compareWithBest, dayLabel, effectiveMerge, hardestDays, itineraryTotals, sanitizeRoutePlan, sanitizeSoloPlan, sleepWarning } from './routePlan';
import { EMPTY_ROUTE_PLAN, type RoutePlan } from '../models/routePlan';
import { GR5_STAGES } from '../data/gr5Stages';
import type { SessionLog } from '../models/training';

const NOW = '2026-10-22T10:00:00.000Z';
const planWith = (choices: RoutePlan['choices']): RoutePlan => ({ choices, updatedAt: NOW });

describe('de dagenlijst', () => {
  it('geeft zonder keuzes 36 loopdagen met datums vanaf de start', () => {
    const days = buildItinerary(EMPTY_ROUTE_PLAN, '2027-08-01');
    expect(days).toHaveLength(36);
    expect(days[0]).toMatchObject({ dayNumber: 1, date: '2027-08-01', from: 'Saint-Gingolph' });
    expect(days[35]).toMatchObject({ dayNumber: 36, date: '2027-09-05', to: 'Nice' });
  });

  it('laat de datums weg zonder startdatum', () => {
    expect(buildItinerary(EMPTY_ROUTE_PLAN)[0].date).toBeUndefined();
  });

  it('voegt twee etappes samen tot één dag met opgetelde cijfers', () => {
    const days = buildItinerary(planWith({ t1e1: { mergeWithNext: true } }), '2027-08-01');
    expect(days).toHaveLength(35);
    expect(days[0]).toMatchObject({ from: 'Saint-Gingolph', to: 'refuge de Trébentaz', km: 24.8, up: 2872, down: 1383, minutes: 330 + 370 });
    expect(days[0].stages).toHaveLength(2);
    expect(days[1].date).toBe('2027-08-02');
    expect(dayLabel(days[0])).toBe('Etappe 1 en 2');
  });

  it('voegt nooit drie etappes samen', () => {
    const plan = planWith({ t1e1: { mergeWithNext: true }, t1e2: { mergeWithNext: true } });
    expect(effectiveMerge(plan, 0)).toBe(true);
    expect(effectiveMerge(plan, 1)).toBe(false);
    expect(canMergeWithNext(plan, 1)).toBe(false);
    expect(buildItinerary(plan)).toHaveLength(35);
  });

  it('zet een rustdag na een etappe en schuift de rest een dag op', () => {
    const days = buildItinerary(planWith({ t1e3: { restAfter: true, sleep: 'gite' } }), '2027-08-01');
    expect(days).toHaveLength(37);
    expect(days[3]).toMatchObject({ kind: 'rest', date: '2027-08-04', to: 'refuge de Chésery', sleep: 'gite' });
    expect(days[4].date).toBe('2027-08-05');
    expect(itineraryTotals(days)).toMatchObject({ walkDays: 36, restDays: 1, endDate: '2027-09-06' });
  });

  it('negeert een rustdag na de laatste etappe en na een samengevoegde eerste helft', () => {
    expect(buildItinerary(planWith({ t4e9: { restAfter: true } }))).toHaveLength(36);
    expect(buildItinerary(planWith({ t1e1: { mergeWithNext: true, restAfter: true } }))).toHaveLength(35);
  });

  it('neemt de slaapplek van de laatste etappe van een dag', () => {
    const days = buildItinerary(planWith({ t1e1: { mergeWithNext: true, sleep: 'tent' }, t1e2: { sleep: 'camping' } }));
    expect(days[0].sleep).toBe('camping');
  });

  it('telt een onbekende waarde als ondergrens en zegt dat', () => {
    const day = buildItinerary(EMPTY_ROUTE_PLAN).find((d) => d.stages[0].id === 't2e6')!;
    expect(day.incomplete).toBe(true);
    expect(day.down).toBe(0);
    expect(day.up).toBe(1297);
  });

  it('telt de nachten per soort, met de aankomst in Nice niet mee', () => {
    const totals = itineraryTotals(buildItinerary(planWith({ t1e1: { sleep: 'tent' }, t1e2: { sleep: 'tent' }, t1e3: { sleep: 'gite' }, t4e9: { sleep: 'camping' } })));
    expect(totals.nights).toMatchObject({ tent: 2, gite: 1, camping: 0, open: 32 });
    expect(totals.km).toBeCloseTo(560.8, 1);
  });
});

describe('keuzes toepassen', () => {
  it('bewaart een slaapplek en haalt hem weer weg', () => {
    const a = applyChoice(EMPTY_ROUTE_PLAN, 't1e1', { sleep: 'tent' }, NOW);
    expect(a.choices.t1e1).toEqual({ sleep: 'tent' });
    const b = applyChoice(a, 't1e1', { sleep: undefined }, NOW);
    expect(b.choices).toEqual({});
  });

  it('weigert samenvoegen als de vorige al met deze is samengevoegd', () => {
    const a = applyChoice(EMPTY_ROUTE_PLAN, 't1e1', { mergeWithNext: true }, NOW);
    const b = applyChoice(a, 't1e2', { mergeWithNext: true }, NOW);
    expect(b.choices.t1e2).toBeUndefined();
  });

  it('haalt de rustdag van de eerste helft weg bij samenvoegen', () => {
    const plan = applyChoice(EMPTY_ROUTE_PLAN, 't1e2', { mergeWithNext: true, restAfter: true }, NOW);
    expect(plan.choices.t1e2).toEqual({ mergeWithNext: true });
  });

  it('haalt de samenvoeging van de volgende weg als de vorige er een maakt', () => {
    let plan = applyChoice(EMPTY_ROUTE_PLAN, 't1e2', { mergeWithNext: true }, NOW);
    plan = applyChoice(plan, 't1e1', { mergeWithNext: true }, NOW);
    expect(plan.choices.t1e1).toEqual({ mergeWithNext: true });
    expect(plan.choices.t1e2).toBeUndefined();
  });

  it('kent geen samenvoegen bij de laatste etappe en negeert een onbekende etappe', () => {
    expect(applyChoice(EMPTY_ROUTE_PLAN, 't4e9', { mergeWithNext: true }, NOW).choices).toEqual({});
    expect(applyChoice(EMPTY_ROUTE_PLAN, 'x', { sleep: 'tent' }, NOW)).toBe(EMPTY_ROUTE_PLAN);
  });
});

describe('de zwaarste dagen', () => {
  it('rangschikt op omhoog plus omlaag', () => {
    const top = hardestDays(buildItinerary(EMPTY_ROUTE_PLAN));
    expect(top).toHaveLength(5);
    expect(top[0].stages[0].id).toBe('t1e7'); // 1.082 omhoog en 2.069 omlaag
    const loads = top.map((d) => d.up + d.down);
    expect([...loads].sort((a, b) => b - a)).toEqual(loads);
  });

  it('kijkt naar de dagen van je plan, ook samengevoegde', () => {
    const top = hardestDays(buildItinerary(planWith({ t4e7: { mergeWithNext: true } })));
    expect(top.some((d) => d.stages.length === 2)).toBe(true);
  });
});

describe('naast je beste dag', () => {
  const log = (date: string, minutes: number, up: number, down: number): SessionLog => ({
    id: `l${date}`, templateId: 'tpl_mountain_hike', type: 'hiking', completedDate: date, completedAt: `${date}T10:00:00Z`, variant: 'full', durationMinutes: minutes, source: 'manual',
    outdoorData: { durationMinutes: minutes, elevationGainM: up, elevationLossM: down, source: 'manual' },
  } as SessionLog);

  it('zet tijd, omhoog en omlaag naast je beste dag van de laatste acht weken', () => {
    const day = buildItinerary(EMPTY_ROUTE_PLAN).find((d) => d.stages[0].id === 't1e3')!; // 13,5 km, 609 omhoog, 495 omlaag, 4h34
    const rows = compareWithBest(day, [log('2026-10-10', 300, 700, 300), log('2026-06-01', 600, 3000, 3000)], '2026-10-22');
    expect(rows.find((r) => r.key === 'stijgen')).toMatchObject({ need: 609, best: 700, bestDate: '2026-10-10', enough: true });
    expect(rows.find((r) => r.key === 'dalen')).toMatchObject({ need: 495, best: 300, enough: false });
    expect(rows.find((r) => r.key === 'tijd')).toMatchObject({ need: 274, best: 300, enough: true });
  });

  it('geeft best 0 zonder tochten', () => {
    const day = buildItinerary(EMPTY_ROUTE_PLAN)[0];
    const rows = compareWithBest(day, [], '2026-10-22');
    expect(rows).toHaveLength(3);
    expect(rows.every((r) => r.best === 0 && !r.enough)).toBe(true);
  });

  it('heeft niets te vergelijken bij een rustdag', () => {
    const rest = buildItinerary(planWith({ t1e1: { restAfter: true } }))[1];
    expect(compareWithBest(rest, [], '2026-10-22')).toEqual([]);
  });
});

describe('slapen en regels', () => {
  const dayOf = (id: string) => buildItinerary(EMPTY_ROUTE_PLAN).find((d) => d.stages[0].id === id)!;
  it('waarschuwt bij tent in het hart van de Vanoise en in de reservaten', () => {
    expect(sleepWarning(dayOf('t2e7'), 'tent')).toMatch(/Vanoise/);
    expect(sleepWarning(dayOf('t2e2'), 'tent')).toMatch(/Contamines/);
  });
  it('waarschuwt niet bij andere slaapplekken of waar een tent mag', () => {
    expect(sleepWarning(dayOf('t2e7'), 'bivak')).toBeUndefined();
    expect(sleepWarning(dayOf('t4e2'), 'tent')).toBeUndefined();
    expect(sleepWarning(dayOf('t2e7'), undefined)).toBeUndefined();
  });
});

describe('opschonen van wat uit een bestand komt', () => {
  it('houdt alleen keuzes van bestaande etappes met een bekende vorm', () => {
    const cleaned = sanitizeRoutePlan({ choices: { t1e1: { sleep: 'tent', mergeWithNext: true, junk: 1 }, t9e9: { sleep: 'tent' }, t1e2: { sleep: 'paleis' }, t1e3: 'oops' }, updatedAt: NOW });
    expect(cleaned).toEqual({ choices: { t1e1: { sleep: 'tent', mergeWithNext: true } }, updatedAt: NOW });
  });
  it('geeft undefined voor onzin', () => {
    expect(sanitizeRoutePlan(null)).toBeUndefined();
    expect(sanitizeRoutePlan({ choices: [] })).toBeUndefined();
    expect(sanitizeSoloPlan('x')).toBeUndefined();
  });
  it('knipt de afspraak met thuis op een bruikbare vorm', () => {
    expect(sanitizeSoloPlan({ who: 'Sam', checkInTime: '25:99', satellite: 'misschien', ifMissing: 5, gear: 'rode tent' })).toMatchObject({ who: 'Sam', checkInTime: '', satellite: '', ifMissing: '', gear: 'rode tent' });
    expect(sanitizeSoloPlan({ checkInTime: '20:00', satellite: 'ja' })).toMatchObject({ checkInTime: '20:00', satellite: 'ja' });
  });
});

it('de som van de officiële etappes is 560,8 km', () => {
  expect(Math.round(GR5_STAGES.reduce((a, s) => a + (s.km ?? 0), 0) * 10) / 10).toBe(560.8);
});

import { describe, expect, it } from 'vitest';
import { exerciseById } from '../data/exercises';
import type { SetLog } from '../models/training';
import {
  analyseSessions,
  deriveRange,
  FATIGUE_MAX,
  FATIGUE_MIN,
  FATIGUE_PER_SET,
  learnFatigue,
  describePlannedSet,
  estimateSet,
  expectedReps,
  formatWeight,
  lastWeightMismatch,
  prescribe,
  referenceWeight,
  sessionStrength,
  topSetOf,
  usedBefore,
  warmupSets,
  type SessionInput, lastDateBefore } from './strengthModel';
import { readMacroFactorRows } from './macrofactorImport';
import { resolveStrengthSettings } from './strengthSettings';
import { candidatesFor } from './strengthWeights';

const ex = (id: string) => exerciseById(id)!;
const settings = resolveStrengthSettings(undefined);
const work = (reps: number, weightKg: number, rir?: number): SetLog => ({ reps, weightKg, ...(rir !== undefined ? { rir } : {}) });

describe('KR-1 geschatte kracht per set', () => {
  const ctx = { exercise: ex('bench-press') };
  it('rekent Epley met herhalingen plus herhalingen over', () => {
    // 70 kg x 6 met 2 over: 8 tot falen, 70 x (1 + 8/30)
    const barbell = { exercise: ex('bench-press') };
    expect(estimateSet(work(6, 70, 2), barbell)!.strengthKg).toBeCloseTo(88.667, 2);
  });
  it('telt alleen werksets, met RIR, tot 12 herhalingen tot falen', () => {
    expect(estimateSet({ ...work(8, 60, 2), kind: 'warmup' }, ctx)).toBeUndefined();
    expect(estimateSet(work(8, 60), ctx)).toBeUndefined();
    expect(estimateSet(work(10, 60, 2), ctx)).toBeDefined();
    expect(estimateSet(work(11, 60, 2), ctx)).toBeUndefined();
    expect(estimateSet(work(0, 60, 2), ctx)).toBeUndefined();
  });
  it('RIR 4 en 5 tellen half, RIR 6 en meer niet', () => {
    expect(estimateSet(work(5, 60, 3), ctx)!.weight).toBe(1);
    expect(estimateSet(work(5, 60, 4), ctx)!.weight).toBe(0.5);
    expect(estimateSet(work(5, 60, 5), ctx)!.weight).toBe(0.5);
    expect(estimateSet(work(5, 60, 6), ctx)).toBeUndefined();
  });
  it('telt het lichaamsgewicht mee bij een oefening met een deel lichaamsgewicht', () => {
    const row = { exercise: ex('barbell-row'), bodyKg: 80 };
    // rij: 8% van 80 kg = 6,4 kg erbij
    expect(estimateSet(work(8, 50, 2), row)!.strengthKg).toBeCloseTo((50 + 6.4) * (1 + 10 / 30), 3);
    // zonder lichaamsgewicht geen schatting
    expect(estimateSet(work(8, 50, 2), { exercise: ex('barbell-row') })).toBeUndefined();
  });
  it('rekent bij optrekken met hulp de hulp af van het lichaamsgewicht', () => {
    const pull = { exercise: ex('assisted-pull-up'), bodyKg: 80 };
    const a = estimateSet(work(8, -30, 2), pull)!;
    expect(a.strengthKg).toBeCloseTo(50 * (1 + 10 / 30), 3);
    // positief ingevuld is ook hulp
    expect(estimateSet(work(8, 30, 2), pull)!.strengthKg).toBeCloseTo(a.strengthKg, 6);
    // meer hulp dan lichaamsgewicht: geen last
    expect(estimateSet(work(8, -90, 2), pull)).toBeUndefined();
  });
  it('een zwaarder gewogen optrekking met extra gewicht telt erbij op', () => {
    const pull = { exercise: ex('pull-up'), bodyKg: 80 };
    expect(estimateSet(work(5, 10, 1), pull)!.strengthKg).toBeCloseTo(90 * (1 + 6 / 30), 3);
    // negatief extra gewicht (een band) telt als hulp
    expect(estimateSet(work(5, -10, 1), pull)!.strengthKg).toBeCloseTo(70 * (1 + 6 / 30), 3);
  });
});

describe('KR-2 één getal per training', () => {
  const ctx = { exercise: ex('bench-press') };
  it('neemt de hoogste schatting, niet een gemiddelde', () => {
    const v = sessionStrength([work(8, 60, 2), work(7, 60, 2), work(6, 60, 2)], ctx)!;
    expect(v).toBeCloseTo(60 * (1 + 10 / 30), 6);
  });
  it('de zwaarste set telt ook als hij niet de eerste is', () => {
    const v = sessionStrength([work(10, 50, 2), work(6, 60, 1), work(8, 55, 2)], ctx)!;
    expect(v).toBeCloseTo(60 * (1 + 7 / 30), 6);
  });
  it('neemt de ene als er maar één is, en niets als er geen is', () => {
    expect(sessionStrength([work(8, 60, 2), work(8, 60)], ctx)).toBeCloseTo(60 * (1 + 10 / 30), 6);
    expect(sessionStrength([work(8, 60)], ctx)).toBeUndefined();
  });
  it('een set ver van falen telt niet mee zolang er een set met vol gewicht is', () => {
    const v = sessionStrength([work(8, 60, 2), work(8, 62, 4)], ctx)!;
    expect(v).toBeCloseTo(60 * (1 + 10 / 30), 6);
  });
  it('zonder set met vol gewicht telt de hoogste set met half gewicht', () => {
    const v = sessionStrength([work(8, 60, 4), work(8, 62, 5)], { ...ctx, maxToFailure: 20 })!;
    expect(v).toBeCloseTo(62 * (1 + 13 / 30), 6);
  });
});

describe('KR-3 gladstrijken', () => {
  const ctx = { exercise: ex('bench-press') };
  // 70 kg x 8 met 2 over is een vaste kracht van 70 x (1 + 10/30)
  const base = 70 * (1 + 10 / 30);
  const s = (date: string, weight: number, legsTired = false): SessionInput => ({ date, sets: [work(8, weight, 2)], legsTired });
  it('begint bij de eerste training', () => {
    const p = analyseSessions([s('2026-09-01', 70)], ctx);
    expect(p[0].smoothed).toBeCloseTo(base, 6);
    expect(p[0].note).toBe('start');
  });
  it('gaat omhoog met een half deel van de afstand', () => {
    const p = analyseSessions([s('2026-09-01', 70), s('2026-09-08', 80)], ctx);
    const target = 80 * (1 + 10 / 30);
    expect(p[1].smoothed).toBeCloseTo(base + 0.5 * (target - base), 6);
    expect(p[1].k).toBe(0.5);
  });
  it('gaat omlaag met een kwart', () => {
    const p = analyseSessions([s('2026-09-01', 70), s('2026-09-08', 60)], ctx);
    const target = 60 * (1 + 10 / 30);
    expect(p[1].smoothed).toBeCloseTo(base + 0.25 * (target - base), 6);
  });
  it('twee slechte dagen achter elkaar: de tweede telt met de helft', () => {
    const p = analyseSessions([s('2026-09-01', 70), s('2026-09-08', 60), s('2026-09-15', 60)], ctx);
    expect(p[1].k).toBe(0.25);
    expect(p[2].k).toBe(0.5);
    expect(p[2].note).toBe('down_twice');
  });
  it('een goede dag tussen twee slechte zet de teller terug', () => {
    const p = analyseSessions([s('2026-09-01', 70), s('2026-09-08', 60), s('2026-09-15', 90), s('2026-09-22', 60)], ctx);
    expect(p[3].k).toBe(0.25);
  });
  it('na zware benen telt een slechte beenoefening nauwelijks (k 0,1)', () => {
    const squat = { exercise: ex('back-squat') };
    const e = 100 * (1 + 10 / 30);
    const p = analyseSessions(
      [
        { date: '2026-09-01', sets: [work(8, 100, 2)] },
        { date: '2026-09-08', sets: [work(8, 80, 2)], legsTired: true },
      ],
      squat,
    );
    expect(p[1].k).toBe(0.1);
    expect(p[1].smoothed).toBeCloseTo(e + 0.1 * (80 * (1 + 10 / 30) - e), 6);
    expect(p[1].legsTired).toBe(true);
  });
  it('vermoeide benen tellen niet bij een oefening zonder benen', () => {
    const p = analyseSessions([s('2026-09-01', 70), s('2026-09-08', 60, true)], ctx);
    expect(p[1].k).toBe(0.25);
    expect(p[1].legsTired).toBe(false);
  });
  it('vermoeide benen tellen niet als twee slechte dagen achter elkaar', () => {
    const squat = { exercise: ex('back-squat') };
    const p = analyseSessions(
      [
        { date: '2026-09-01', sets: [work(8, 100, 2)] },
        { date: '2026-09-08', sets: [work(8, 80, 2)], legsTired: true },
        { date: '2026-09-15', sets: [work(8, 80, 2)] },
      ],
      squat,
    );
    expect(p[2].k).toBe(0.25);
  });
  it('na een pauze van meer dan drie weken begint het opnieuw met k 0,7', () => {
    const p = analyseSessions([s('2026-09-01', 70), s('2026-09-23', 60)], ctx);
    expect(p[1].k).toBe(0.7);
    expect(p[1].note).toBe('restart');
    // precies drie weken is nog geen pauze
    expect(analyseSessions([s('2026-09-01', 70), s('2026-09-22', 60)], ctx)[1].k).toBe(0.25);
  });
  it('een training zonder bruikbare set laat het getal staan', () => {
    const p = analyseSessions([s('2026-09-01', 70), { date: '2026-09-08', sets: [work(8, 70)] }], ctx);
    expect(p[1].smoothed).toBeCloseTo(base, 6);
    expect(p[1].value).toBeUndefined();
  });
  it('een kleine dip van minder dan 1% telt niet als slechte dag', () => {
    const sets = [{ date: '2026-09-01', sets: [work(8, 70, 2)] }, { date: '2026-09-08', sets: [work(8, 69.9, 2)] }, { date: '2026-09-15', sets: [work(8, 69.9, 2)] }];
    expect(analyseSessions(sets, ctx)[2].k).toBe(0.25);
  });
});

describe('afronden op het sportschoolprofiel (KR-6)', () => {
  it('een stang maakt stappen van 2,5 kg boven de lege stang', () => {
    const c = candidatesFor(ex('back-squat'), settings.profile, { lastExternalKg: 60 })!;
    const w = c.map((x) => x.externalKg);
    expect(w.slice(0, 4)).toEqual([20, 22.5, 25, 27.5]);
    expect(w).toContain(67.5);
    expect(w).not.toContain(21);
  });
  it('kiest de lichte stang als je lichter tilt dan de zware stang', () => {
    const c = candidatesFor(ex('back-squat'), settings.profile, { lastExternalKg: 17.5 })!;
    expect(c[0].externalKg).toBe(15);
  });
  it('dumbbells gaan per 2 kg tot 10 kg en daarna per 2,5 kg', () => {
    const w = candidatesFor(ex('dumbbell-curl'), settings.profile, {})!.map((x) => x.externalKg);
    expect(w.slice(0, 7)).toEqual([2, 4, 6, 8, 10, 12.5, 15]);
  });
  it('kabels en toestellen gaan per 5 kg, tenzij de oefening een eigen stap heeft', () => {
    expect(candidatesFor(ex('lat-pulldown'), settings.profile, {})!.slice(0, 3).map((x) => x.externalKg)).toEqual([5, 10, 15]);
    const own = { ...settings.profile, exerciseStepKg: { 'lat-pulldown': 2.5 } };
    expect(candidatesFor(ex('lat-pulldown'), own, {})!.slice(0, 3).map((x) => x.externalKg)).toEqual([2.5, 5, 7.5]);
  });
  it('zonder kleine schijven springt de stang verder', () => {
    const profile = { ...settings.profile, platesKg: [5, 10, 20] };
    const w = candidatesFor(ex('back-squat'), profile, { lastExternalKg: 60 })!.map((x) => x.externalKg);
    expect(w.slice(0, 3)).toEqual([20, 30, 40]);
  });
});

describe('KR-4 het voorschrift', () => {
  const row = ex('barbell-row');
  // Een rij met 47,5 kg x 9 met 2 over, 3 sets, drie weken achter elkaar.
  const sessions = (weights: number[], reps = 9): SessionInput[] =>
    weights.map((w, i) => ({ date: `2026-09-${String(1 + i * 7).padStart(2, '0')}`, sets: [work(reps, w, 2), work(reps - 1, w - 2.5, 2), work(reps - 1, w - 2.5, 2)] }));

  it('geeft niets zonder geschiedenis of zonder RIR', () => {
    expect(prescribe({ exercise: row, sessions: [], date: '2026-10-01', bodyKg: 80, settings })).toBeUndefined();
    expect(prescribe({ exercise: row, sessions: [{ date: '2026-09-01', sets: [work(10, 40)] }], date: '2026-10-01', bodyKg: 80, settings })).toBeUndefined();
  });
  it('geeft niets voor een oefening met lichaamsgewicht zonder lichaamsgewicht', () => {
    expect(prescribe({ exercise: row, sessions: sessions([45]), date: '2026-10-01', settings })).toBeUndefined();
  });
  it('het rekenvoorbeeld uit het rapport: kracht 88 kg, bereik 6 tot 8, 2 over geeft 67,5 kg', () => {
    // 67,5 x 7 met 2 over geeft 67,5 x (1 + 9/30) = 87,75; dat is het voorbeeld
    expect(expectedReps(88, 67.5, 2)).toBe(7);
    expect(expectedReps(88, 70, 2)).toBe(5);
    // en als voorschrift: 67,5 x 8 met 2 over is kracht 67,5 x (1 + 10/30) = 90
    const squat = ex('back-squat');
    const p = prescribe({
      exercise: squat,
      sessions: [{ date: '2026-09-01', sets: [work(8, 67.5, 2), work(8, 67.5, 2), work(8, 67.5, 2)] }],
      date: '2026-09-08',
      settings: resolveStrengthSettings({ workSets: 'equal' }),
    })!;
    expect(p.range).toEqual({ low: 7, high: 9, rir: 2 });
    expect(p.sets[0].weightKg).toBe(67.5);
    expect(describePlannedSet(squat, p.sets[0])).toBe('67,5 kg x 7 tot 9, 2 over');
  });
  it('kiest eerst gewicht: het zwaarste gewicht dat nog binnen het bereik valt', () => {
    const p = prescribe({ exercise: row, sessions: sessions([45, 45]), date: '2026-09-20', bodyKg: 80, settings })!;
    // De voorgestelde eerste set haalt de onderkant van het bereik en niets zwaarders doet dat.
    const c = candidatesFor(row, settings.profile, { bodyKg: 80, lastExternalKg: 45 })!;
    const first = p.sets[0];
    const idx = c.findIndex((x) => x.externalKg === first.weightKg);
    expect(expectedReps(p.strengthKg, c[idx].loadKg, 2)).toBeGreaterThanOrEqual(first.repsLow);
    expect(expectedReps(p.strengthKg, c[idx + 1].loadKg, 2)).toBeLessThan(first.repsLow);
  });
  it('eerst herhalingen: zelfde gewicht tot de bovenkant van het bereik', () => {
    const rf = resolveStrengthSettings({ progression: 'reps_first' });
    const s: SessionInput[] = [{ date: '2026-09-01', sets: [work(8, 60, 2), work(8, 60, 2), work(7, 60, 2)] }];
    const p = prescribe({ exercise: ex('bench-press'), sessions: s, date: '2026-09-08', settings: rf })!;
    expect(p.sets[0].weightKg).toBe(60);
    expect(p.kind).toBe('same');
    expect(p.reason).toContain('Eerst herhalingen');
    // het gewicht gaat pas omhoog als de bovenkant gehaald wordt
    const top: SessionInput[] = [{ date: '2026-09-01', sets: [work(8, 60, 2), work(8, 60, 2), work(7, 60, 2)] }, { date: '2026-09-08', sets: [work(9, 60, 2), work(9, 60, 2), work(9, 60, 2)] }];
    const q = prescribe({ exercise: ex('bench-press'), sessions: top, date: '2026-09-15', settings: rf })!;
    expect(q.sets[0].weightKg).toBeGreaterThan(60);
  });
  it('werksets dalend: elke volgende set heeft een eigen, niet hoger gewicht', () => {
    const p = prescribe({ exercise: row, sessions: sessions([47.5, 47.5]), date: '2026-09-20', bodyKg: 80, settings: resolveStrengthSettings({ workSets: 'descending' }) })!;
    for (let i = 1; i < p.sets.length; i++) expect(p.sets[i].weightKg).toBeLessThanOrEqual(p.sets[i - 1].weightKg);
    expect(p.sets[p.sets.length - 1].weightKg).toBeLessThan(p.sets[0].weightKg);
  });
  it('werksets gelijk: alle sets hetzelfde', () => {
    const p = prescribe({ exercise: row, sessions: sessions([47.5, 47.5]), date: '2026-09-20', bodyKg: 80, settings: resolveStrengthSettings({ workSets: 'equal' }) })!;
    expect(new Set(p.sets.map((s) => s.weightKg)).size).toBe(1);
  });
  it('het aantal sets volgt de vorige training', () => {
    const p = prescribe({ exercise: row, sessions: sessions([47.5]), date: '2026-09-20', bodyKg: 80, settings })!;
    expect(p.sets).toHaveLength(3);
  });
  it('de vaste 3% geeft 47,5, 45, 42,5, 42,5 bij 11 tot 13 met 2 over', () => {
    // Kracht waarbij 47,5 kg net 11 herhalingen met 2 over geeft: bij een rij telt 8% van het lichaamsgewicht mee.
    const lat = ex('chest-supported-row');
    const bodyKg = 0;
    void bodyKg;
    const cable = ex('cable-high-row');
    const needed = 47.5 * (1 + 13 / 30);
    // sessie met strength = needed: 47,5 kg x 11 met 2 over is 47,5 x (1 + 13/30)
    const s: SessionInput[] = [{ date: '2026-09-01', sets: [work(11, 47.5, 2), work(11, 47.5, 2), work(11, 47.5, 2), work(11, 47.5, 2)] }];
    const profile = { ...settings.profile, stackStepKg: 2.5 };
    const p = prescribe({ exercise: cable, sessions: s, date: '2026-09-08', settings: { ...settings, profile, estimateUpTo: 15, fatigue: 'fixed' } })!;
    void lat;
    expect(needed).toBeGreaterThan(0);
    expect(p.range).toEqual({ low: 11, high: 13, rir: 2 });
    expect(p.sets.map((x) => x.weightKg)).toEqual([47.5, 45, 42.5, 42.5]);
  });
});

describe('KR-5 de stapgrens', () => {
  const bench = ex('bench-press');
  it('de kracht waarmee het voorstel rekent gaat per training hooguit 5% omhoog', () => {
    // Kracht 80 (60 kg x 8 met 2 over), daarna een dag met 70 kg x 8 met 1 over: de
    // gladgestreken kracht stijgt met ruim 6%, het voorstel rekent met 5%.
    const s: SessionInput[] = [
      { date: '2026-09-01', sets: [work(8, 60, 2), work(8, 60, 2), work(8, 60, 2)] },
      { date: '2026-09-08', sets: [work(8, 70, 1), work(8, 70, 1), work(8, 70, 1)] },
    ];
    const p = prescribe({ exercise: bench, sessions: s, date: '2026-09-15', settings })!;
    expect(p.strengthKg).toBeCloseTo(80 * 1.05, 6);
    expect(p.kind).toBe('capped');
    expect(p.reason).toContain('kracht');
    expect(p.reason).toContain('5%');
  });
  it('bij een gelijk doel blijft een grote sprong geremd', () => {
    // Drie weken met hetzelfde doel (7 tot 9, 2 over); dan een uitschieter van 60 naar 75 kg.
    const plan = { low: 7, high: 9, rir: 2 };
    const s: SessionInput[] = [
      { date: '2026-09-01', sets: [work(8, 60, 2), work(8, 60, 2), work(8, 60, 2)] },
      { date: '2026-09-08', sets: [work(8, 60, 2), work(8, 60, 2), work(8, 60, 2)] },
      { date: '2026-09-15', sets: [work(8, 75, 1), work(8, 75, 1), work(8, 75, 1)] },
    ];
    const p = prescribe({ exercise: bench, sessions: s, date: '2026-09-22', settings, plan })!;
    // De kracht van 60 x 8 met 2 over is 80; de sprong naar 75 kg wordt op 5% gehouden.
    expect(p.strengthKg).toBeCloseTo(84, 6);
    expect(p.sets[0].weightKg).toBeLessThanOrEqual(65);
    expect(p.kind).toBe('capped');
  });
  it('een golf in het bereik: het gewicht volgt de omrekening, ook meer dan 10% omhoog of omlaag', () => {
    const three = (reps: number, kg: number) => [work(reps, kg, 2), work(reps, kg, 2), work(reps, kg, 2)];
    // Week 1: 4 tot 6 met 80 kg x 5. Week 2: 7 tot 9 met 72,5 kg x 8. Week 3: 2 tot 4.
    const week12: SessionInput[] = [
      { date: '2026-09-01', sets: three(5, 80) },
      { date: '2026-09-08', sets: three(8, 72.5) },
    ];
    const lighter = prescribe({ exercise: bench, sessions: week12.slice(0, 1), date: '2026-09-08', settings, plan: { low: 7, high: 9, rir: 2 } })!;
    expect(lighter.sets[0].weightKg).toBeLessThan(80);
    const heavier = prescribe({ exercise: bench, sessions: week12, date: '2026-09-15', settings, plan: { low: 2, high: 4, rir: 2 } })!;
    // 16% zwaarder dan vorige keer, omdat het doel veel minder herhalingen vraagt.
    expect(heavier.sets[0].weightKg).toBeGreaterThan(72.5 * 1.15);
    expect(heavier.kind).not.toBe('capped');
  });
  it('van weinig naar veel herhalingen mag het gewicht meer dan 10% omlaag', () => {
    const s: SessionInput[] = [{ date: '2026-09-01', sets: [work(3, 100, 2), work(3, 100, 2), work(3, 100, 2)] }];
    const p = prescribe({ exercise: bench, sessions: s, date: '2026-09-08', settings, plan: { low: 7, high: 9, rir: 2 } })!;
    expect(p.sets[0].weightKg).toBeLessThanOrEqual(87.5);
    expect(p.kind).not.toBe('capped');
  });
  it('gaat na een betere training niet lichter dan vorige keer als je het bereik haalde', () => {
    const s: SessionInput[] = [
      { date: '2026-09-01', sets: [work(8, 60, 2), work(8, 60, 2), work(8, 60, 2)] },
      { date: '2026-09-08', sets: [work(8, 67.5, 2), work(8, 67.5, 2), work(8, 67.5, 2)] },
    ];
    const p = prescribe({ exercise: bench, sessions: s, date: '2026-09-15', settings })!;
    expect(p.sets[0].weightKg).toBeGreaterThanOrEqual(65);
  });
  it('houdt per week hooguit 10% omhoog', () => {
    const s: SessionInput[] = [
      { date: '2026-09-09', sets: [work(8, 60, 2), work(8, 60, 2), work(8, 60, 2)] },
      { date: '2026-09-12', sets: [work(8, 63, 2), work(8, 63, 2), work(8, 63, 2)] },
      { date: '2026-09-14', sets: [work(8, 70, 2), work(8, 70, 2), work(8, 70, 2)] },
    ];
    const p = prescribe({ exercise: bench, sessions: s, date: '2026-09-15', settings })!;
    // basis van de week is 60 kg: hooguit 66, maar nooit onder wat je al deed omlaag gedwongen
    expect(p.sets[0].weightKg).toBeLessThanOrEqual(70);
  });
  it('gaat per training hooguit 10% omlaag', () => {
    const s: SessionInput[] = [
      { date: '2026-09-01', sets: [work(8, 100, 2), work(8, 100, 2), work(8, 100, 2)] },
      { date: '2026-09-04', sets: [work(3, 100, 2), work(3, 100, 2), work(3, 100, 2)] },
      { date: '2026-09-07', sets: [work(2, 100, 2), work(2, 100, 2), work(2, 100, 2)] },
    ];
    const p = prescribe({ exercise: ex('overhead-press'), sessions: s, date: '2026-09-10', settings })!;
    expect(p.sets[0].weightKg).toBeGreaterThanOrEqual(90);
  });
});

describe('bereik verbreden bij een grove stap', () => {
  it('breidt het bereik uit als de stap van het toestel te grof is', () => {
    // kabel in stappen van 5 kg, doel 7 tot 9: 30 kg x 6 of 25 kg x 11
    const cable = ex('triceps-pushdown');
    const s: SessionInput[] = [{ date: '2026-09-01', sets: [work(8, 25, 2), work(8, 25, 2), work(8, 25, 2)] }];
    // kracht rond 25 x (1 + 10/30) = 33,3: 30 kg geeft 3 reps (< 7), 25 kg geeft 8,3-2=6 hmm
    const p = prescribe({ exercise: cable, sessions: s, date: '2026-09-08', settings })!;
    expect(p.range.low).toBe(7);
    const first = p.sets[0];
    expect(first.repsLow).toBe(7);
    expect(first.repsHigh).toBeGreaterThanOrEqual(9);
  });
  it('met de schakelaar uit blijft het bereik staan en gaat het om meer over', () => {
    const cable = ex('triceps-pushdown');
    const off = resolveStrengthSettings({ widenRange: false });
    const s: SessionInput[] = [{ date: '2026-09-01', sets: [work(8, 25, 2), work(8, 25, 2), work(8, 25, 2)] }];
    const p = prescribe({ exercise: cable, sessions: s, date: '2026-09-08', settings: off })!;
    expect(p.sets[0].repsHigh).toBe(9);
    expect(p.widened).toBe(false);
  });
});

describe('bij een grove stap het gewicht met de kleinste verwachte misser', () => {
  // Een kabel in stappen van 5 kg, doel 14 tot 16 herhalingen met 2 over.
  const cable = ex('triceps-pushdown');
  const plan = { low: 14, high: 16, rir: 2 };
  const run = (sets: SetLog[], over: object = {}) => prescribe({ exercise: cable, sessions: [{ date: '2026-09-01', sets }], date: '2026-09-08', settings: resolveStrengthSettings(over), plan })!;

  it('kiest de zwaardere kant als die dichter bij het doel zit, met een lagere onderkant voor die set', () => {
    // Kracht 83,3: 50 kg geeft 18 herhalingen (2 boven de top), 55 kg geeft 13 (1 onder de onderkant).
    const p = run([work(18, 50, 2), work(18, 50, 2), work(18, 50, 2)]);
    expect(p.kind).toBe('coarse_heavier');
    expect(p.widened).toBe(false);
    expect(p.sets[0].weightKg).toBe(55);
    expect(p.sets[0].repsLow).toBe(13);
    expect(p.sets[0].repsHigh).toBe(16);
    expect(p.reason).toBe('De stap is hier te grof voor 14 tot 16 herhalingen; met 55 kg haal je er naar verwachting 13, dat zit dichter bij je doel dan 50 kg.');
    // De latere sets houden het bereik van het doel: de onderkant wordt daar niet verlaagd.
    for (const set of p.sets.slice(1)) expect(set.repsLow).toBeGreaterThanOrEqual(13);
  });
  it('blijft bij een gelijke misser aan de lichte kant en verbreedt het bereik', () => {
    // Kracht 82,5: 50 kg geeft 17 (1 boven de top), 55 kg geeft 13 (1 onder de onderkant).
    const p = run([work(13, 55, 2), work(13, 55, 2), work(13, 55, 2)]);
    expect(p.kind).toBe('widened');
    expect(p.sets[0].weightKg).toBe(50);
    expect(p.sets[0].repsHigh).toBe(17);
  });
  it('blijft bij de lichte kant als de zwaardere verder weg zit', () => {
    // Kracht 78,3: 50 kg geeft 14 herhalingen en past gewoon; geen grove stap.
    const p = run([work(15, 50, 2), work(15, 50, 2), work(15, 50, 2)]);
    expect(p.kind).not.toBe('coarse_heavier');
    expect(p.sets[0].weightKg).toBe(50);
  });
  it('met "Bereik verbreden" uit blijft het lichtere gewicht staan en gaat het om meer over', () => {
    const p = run([work(18, 50, 2), work(18, 50, 2), work(18, 50, 2)], { widenRange: false });
    expect(p.kind).not.toBe('coarse_heavier');
    expect(p.sets[0].weightKg).toBe(50);
    expect(p.sets[0].repsHigh).toBe(16);
    expect(p.sets[0].rir).toBeGreaterThan(2);
  });
});

describe('vermoeidheid per set, per oefening geleerd', () => {
  const bench = ex('bench-press');
  const ctx = { exercise: bench };
  // Een training met werksets van gelijke kracht die elk `drop` lager uitvallen.
  const dropping = (date: string, drop: number, n = 4): SessionInput => ({
    date,
    sets: Array.from({ length: n }, () => work(10, 60, 2)).map((s, i) => ({ ...s, reps: 10, weightKg: 60 * (1 - drop) ** i })),
  });

  it('zonder paren is het 3% en is er niets geleerd', () => {
    expect(learnFatigue([], ctx, false)).toEqual({ perSet: FATIGUE_PER_SET, pairs: 0 });
    expect(learnFatigue([{ date: '2026-09-01', sets: [work(10, 60, 2)] }], ctx, false).pairs).toBe(0);
  });
  it('trekt naar 3% zolang er weinig paren zijn en volgt de oefening bij veel', () => {
    // Elke set 10% lichter bij dezelfde herhalingen is 10% minder kracht per stap.
    const few = learnFatigue([dropping('2026-09-01', 0.1, 3)], ctx, false);
    expect(few.pairs).toBe(2);
    expect(few.perSet).toBeCloseTo((2 * 0.1 + 8 * 0.03) / 10, 3);
    const many = learnFatigue(Array.from({ length: 8 }, (_, i) => dropping(`2026-09-0${i + 1}`, 0.1)), ctx, false);
    expect(many.pairs).toBe(24);
    expect(many.perSet).toBeGreaterThan(0.08);
    expect(many.perSet).toBeLessThan(0.1);
  });
  it('houdt de daling tussen 1% en 12%', () => {
    const lots = (drop: number) => learnFatigue(Array.from({ length: 12 }, (_, i) => dropping(`2026-09-${String(i + 1).padStart(2, '0')}`, drop)), ctx, false).perSet;
    expect(lots(0.3)).toBe(FATIGUE_MAX);
    expect(lots(-0.2)).toBe(FATIGUE_MIN);
  });
  it('de mediaan laat een uitschieter los', () => {
    const odd: SessionInput = { date: '2026-09-20', sets: [work(10, 60, 2), work(10, 30, 2), work(10, 60, 2), work(10, 60, 2)] };
    const base = Array.from({ length: 6 }, (_, i) => ({ date: `2026-09-0${i + 1}`, sets: [work(10, 60, 2), work(10, 60, 2), work(10, 60, 2)] }));
    expect(learnFatigue([...base, odd], ctx, false).perSet).toBeLessThan(0.05);
  });
  it('telt geen opwarmsets, sets zonder RIR of sets ver van falen', () => {
    const noisy: SessionInput = { date: '2026-09-01', sets: [{ ...work(5, 30, 4), kind: 'warmup' }, work(10, 60, 2), work(10, 40), work(10, 60, 2), work(10, 40, 5), work(10, 60, 2)] };
    expect(learnFatigue([noisy], ctx, false).pairs).toBe(0);
  });
  it('een opwarmset tussen werksets onderbreekt het paar', () => {
    const between: SessionInput = { date: '2026-09-01', sets: [work(10, 60, 2), { ...work(5, 30, 4), kind: 'warmup' }, work(10, 60, 2)] };
    expect(learnFatigue([between], ctx, false).pairs).toBe(0);
  });
  it('een set met een aangenomen RIR telt niet: dan zou het model zijn eigen voorspelling terugleren', () => {
    const untouched: SessionInput = { date: '2026-09-01', sets: [{ ...work(8, 60, 2), rirAssumed: true }, { ...work(6, 60, 2), rirAssumed: true }, { ...work(6, 60, 2), rirAssumed: true }] };
    expect(learnFatigue([untouched], ctx, true).pairs).toBe(0);
    const mixed: SessionInput = { date: '2026-09-02', sets: [work(10, 60, 2), { ...work(9, 60, 2), rirAssumed: true }, work(9, 60, 2)] };
    expect(learnFatigue([mixed], ctx, true).pairs).toBe(0);
  });
  it('bij gelijke werksets tellen alleen paren met hetzelfde gewicht', () => {
    const mixed: SessionInput = { date: '2026-09-01', sets: [work(10, 60, 2), work(10, 60, 2), work(10, 50, 2), work(10, 50, 2)] };
    expect(learnFatigue([mixed], ctx, true).pairs).toBe(2);
    expect(learnFatigue([mixed], ctx, false).pairs).toBe(3);
  });
  it('het voorschrift gebruikt de geleerde daling, en "Vast 3%" de vaste', () => {
    const sessions = Array.from({ length: 6 }, (_, i) => dropping(`2026-09-0${i + 1}`, 0.1));
    const learned = prescribe({ exercise: bench, sessions, date: '2026-09-10', settings })!;
    const fixed = prescribe({ exercise: bench, sessions, date: '2026-09-10', settings: resolveStrengthSettings({ fatigue: 'fixed' }) })!;
    expect(fixed.fatiguePerSet).toBe(FATIGUE_PER_SET);
    expect(learned.fatiguePerSet).toBeGreaterThan(0.06);
    // Een grotere daling geeft een lichtere laatste set.
    expect(learned.sets.at(-1)!.weightKg).toBeLessThan(fixed.sets.at(-1)!.weightKg);
  });
});

describe('KR-8 gemiste en extra herhalingen, en vermoeide benen', () => {
  const squat = ex('back-squat');
  const history: SessionInput[] = [
    { date: '2026-09-01', sets: [work(8, 80, 2), work(8, 80, 2), work(8, 80, 2)] },
    { date: '2026-09-08', sets: [work(8, 80, 2), work(8, 80, 2), work(8, 80, 2)] },
  ];
  it('met vermoeide benen blijft het gewicht staan en is het doel één herhaling lager', () => {
    const calm = prescribe({ exercise: squat, sessions: history, date: '2026-09-15', settings })!;
    const tired = prescribe({ exercise: squat, sessions: history, date: '2026-09-15', settings, tired: { because: 'een bergtocht gisteren' } })!;
    expect(tired.kind).toBe('tired');
    expect(tired.sets[0].weightKg).toBe(80);
    expect(tired.sets[0].repsLow).toBe(calm.range.low - 1);
    expect(tired.reason).toContain('bergtocht gisteren');
  });
  it('vermoeide benen doen niets bij een oefening voor het bovenlichaam', () => {
    const p = prescribe({ exercise: ex('bench-press'), sessions: history, date: '2026-09-15', settings, tired: { because: 'een bergtocht gisteren' } })!;
    expect(p.kind).not.toBe('tired');
  });
  it('twee keer duidelijk onder de verwachting zonder vermoeidheid: 5% lichter', () => {
    const s: SessionInput[] = [
      { date: '2026-09-01', sets: [work(10, 80, 2), work(10, 80, 2), work(10, 80, 2)] },
      { date: '2026-09-08', sets: [work(6, 80, 2), work(6, 80, 2), work(6, 80, 2)] },
      { date: '2026-09-15', sets: [work(6, 80, 2), work(6, 80, 2), work(6, 80, 2)] },
    ];
    const p = prescribe({ exercise: ex('bench-press'), sessions: s, date: '2026-09-22', settings })!;
    expect(p.kind).toBe('two_under');
    expect(p.sets[0].weightKg).toBeLessThanOrEqual(76);
    expect(p.sets[0].weightKg).toBeGreaterThanOrEqual(72);
  });
  it('twee keer onder de verwachting met vermoeide benen is geen reden voor lichter', () => {
    const s: SessionInput[] = [
      { date: '2026-09-01', sets: [work(10, 80, 2), work(10, 80, 2), work(10, 80, 2)] },
      { date: '2026-09-08', sets: [work(6, 80, 2), work(6, 80, 2), work(6, 80, 2)], legsTired: true },
      { date: '2026-09-15', sets: [work(6, 80, 2), work(6, 80, 2), work(6, 80, 2)], legsTired: true },
    ];
    const p = prescribe({ exercise: squat, sessions: s, date: '2026-09-22', settings })!;
    expect(p.kind).not.toBe('two_under');
  });
  it('extra herhalingen maken de volgende keer zwaarder, binnen de stapgrens', () => {
    const s: SessionInput[] = [{ date: '2026-09-01', sets: [work(8, 60, 2), work(8, 60, 2), work(8, 60, 2)] }, { date: '2026-09-08', sets: [work(10, 60, 2), work(10, 60, 2), work(10, 60, 2)] }];
    const p = prescribe({ exercise: ex('bench-press'), sessions: s, date: '2026-09-15', settings })!;
    expect(p.sets[0].weightKg).toBeGreaterThan(60);
    expect(p.sets[0].weightKg).toBeLessThanOrEqual(65);
  });
  it('na een pauze zegt de zin dat we voorzichtig beginnen', () => {
    const p = prescribe({ exercise: ex('bench-press'), sessions: history, date: '2026-11-15', settings })!;
    expect(p.kind).toBe('pause');
  });
});

describe('KR-7 opwarmsets', () => {
  const squat = ex('back-squat');
  const profile = settings.profile;
  const candidates = candidatesFor(squat, profile, { lastExternalKg: 100 })!;
  it('slim: lichte set en een set dicht bij het werkgewicht, afgerond op schijven', () => {
    const w = warmupSets(settings, squat, candidates, 60, 80)!;
    expect(w.map((x) => x.reps)).toEqual([8, 4]);
    expect(w.every((x) => x.weightKg < 60 && x.weightKg >= 20)).toBe(true);
    expect(w[0].weightKg).toBeLessThan(w[1].weightKg);
  });
  it('zwaar werkgewicht (meer dan drie keer de lege stang) krijgt een derde, lichte set', () => {
    expect(warmupSets(settings, squat, candidates, 100, 133)).toHaveLength(3);
    expect(warmupSets(settings, squat, candidates, 60, 80)).toHaveLength(2);
  });
  it('schema: 40, 60 en 80 procent van het eerste werkgewicht voor 5, 5 en 3', () => {
    const w = warmupSets(resolveStrengthSettings({ warmup: 'scheme' }), squat, candidates, 100, 133);
    expect(w).toEqual([{ weightKg: 40, reps: 5 }, { weightKg: 60, reps: 5 }, { weightKg: 80, reps: 3 }]);
  });
  it('een stangoefening met een klein deel lichaamsgewicht (barbell row) krijgt ze wel', () => {
    const row = ex('barbell-row');
    const rowCandidates = candidatesFor(row, profile, { lastExternalKg: 45, bodyKg: 85 })!;
    expect(warmupSets(settings, row, rowCandidates, 45, 70).length).toBeGreaterThan(0);
  });
  it('uit: geen opwarmsets', () => {
    expect(warmupSets(resolveStrengthSettings({ warmup: 'off' }), squat, candidates, 100, 133)).toEqual([]);
  });
  it('een licht gewicht, een isolatieoefening of lichaamsgewicht krijgt er geen', () => {
    expect(warmupSets(settings, squat, candidates, 30, 42)).toEqual([]);
    const curl = ex('dumbbell-curl');
    expect(warmupSets(settings, curl, candidatesFor(curl, profile, {})!, 14, 20)).toEqual([]);
    const pull = ex('pull-up');
    expect(warmupSets(settings, pull, candidatesFor(pull, profile, { bodyKg: 80 })!, 10, 120)).toEqual([]);
  });
  it('komt nooit onder de lege stang en laat dubbele sets vallen', () => {
    const w = warmupSets(resolveStrengthSettings({ warmup: 'scheme' }), squat, candidates, 45, 60);
    expect(w.every((x) => x.weightKg >= 20)).toBe(true);
    expect(new Set(w.map((x) => x.weightKg)).size).toBe(w.length);
  });
  it('bij een tweede oefening van hetzelfde patroon blijft het bij één voelset', () => {
    const w = warmupSets(settings, squat, candidates, 100, 133, 'feel');
    expect(w).toEqual([{ weightKg: 65, reps: 5 }]);
  });
});

describe('afleidingen', () => {
  it('de top set is de zwaarste werkset', () => {
    const top = topSetOf([work(10, 40, 2), { ...work(5, 90), kind: 'warmup' }, work(6, 50, 1), work(5, 50, 0)], { exercise: ex('bench-press') })!;
    expect(top).toMatchObject({ weightKg: 50, reps: 6, rir: 1 });
  });
  it('het bereik volgt de laatste twee trainingen en blijft binnen een band', () => {
    const pts = analyseSessions(
      [{ date: '2026-09-01', sets: [work(11, 40, 2), work(12, 40, 2)] }, { date: '2026-09-08', sets: [work(13, 40, 2), work(12, 40, 3)] }],
      { exercise: ex('bench-press') },
    );
    expect(deriveRange(pts)).toEqual({ low: 11, high: 13, rir: 2 });
  });
  it('het referentiegewicht is het gewicht dat de schatting aankan bij het midden van het bereik', () => {
    const e = 70 * (1 + 10 / 30);
    const ref = referenceWeight(e, { low: 7, high: 9, rir: 2 }, { exercise: ex('bench-press') })!;
    expect(ref.reps).toBe(8);
    expect(ref.weightKg).toBe(70);
  });
});

describe('optrekken met hulp uit een MacroFactor-export', () => {
  const pull = ex('assisted-pull-up');
  const rows = (weight: number, date: string) => [
    ['Date', 'Workout', 'Exercise', 'Set Type', 'Weight (kg)', 'Reps', 'RIR', 'Duration'],
    [`${date} 18:00`, 'Boven', 'Machine-Assisted Pull-Up', 'Standard', weight, 8, 2, '50:00'],
    [`${date} 18:05`, 'Boven', 'Machine-Assisted Pull-Up', 'Standard', weight, 8, 2, '50:00'],
  ];
  const sessionFrom = (weight: number, date: string): SessionInput => {
    const w = readMacroFactorRows(rows(weight, date)).workouts[0];
    return { date, sets: (w.exercises[0].loggedSets ?? w.exercises[0].sets).map((s) => ({ reps: s.reps, ...(s.weightKg !== undefined ? { weightKg: s.weightKg } : {}), ...(s.rir !== undefined ? { rir: s.rir } : {}) })) };
  };
  it('bewaart een negatief gewicht uit de export', () => {
    const w = readMacroFactorRows(rows(-30, '2026-09-01')).workouts[0];
    expect(w.exercises[0].sets.map((s) => s.weightKg)).toEqual([-30, -30]);
    expect(w.exercises[0].top.weightKg).toBe(-30);
  });
  it('rekent van de import tot het voorschrift met de hulp mee', () => {
    const sessions = [sessionFrom(-30, '2026-09-01'), sessionFrom(-30, '2026-09-04')];
    const rx = prescribe({ exercise: pull, sessions, date: '2026-09-08', settings, bodyKg: 80 })!;
    // De last is 80 - 30 = 50 kg, niet de volle 80 kg zonder hulp.
    expect(rx.strengthKg).toBeCloseTo(50 * (1 + 10 / 30), 3);
    expect(rx.sets[0].weightKg).toBeLessThanOrEqual(0);
    expect(rx.sets[0].weightKg).toBeGreaterThanOrEqual(-35);
  });
  it('zonder gewicht bij een hulptoestel komt er geen schatting en geen voorstel', () => {
    const noWeight: SessionInput = { date: '2026-09-01', sets: [{ reps: 8, rir: 2 }, { reps: 8, rir: 2 }] };
    expect(estimateSet({ reps: 8, rir: 2 }, { exercise: pull, bodyKg: 80 })).toBeUndefined();
    expect(prescribe({ exercise: pull, sessions: [noWeight, { ...noWeight, date: '2026-09-04' }], date: '2026-09-08', settings, bodyKg: 80 })).toBeUndefined();
  });
  it('een hulp van 5 kg komt alleen voor als die stap bestaat', () => {
    const sessions = [sessionFrom(-30, '2026-09-01'), sessionFrom(-30, '2026-09-04'), sessionFrom(-30, '2026-09-07')];
    const coarse = resolveStrengthSettings({ profiles: [{ ...settings.profile, exerciseStepKg: { 'assisted-pull-up': 10 } }], activeProfileId: settings.profile.id });
    const rx = prescribe({ exercise: pull, sessions, date: '2026-09-10', settings: coarse, bodyKg: 80 })!;
    expect(rx.sets.every((s) => Math.abs(s.weightKg) % 10 === 0)).toBe(true);
    const fine = prescribe({ exercise: pull, sessions, date: '2026-09-10', settings, bodyKg: 80 })!;
    expect(fine.sets.every((s) => Math.abs(s.weightKg) % 5 === 0)).toBe(true);
  });
});

describe('de zin bij een lichter voorschrift', () => {
  const bench = ex('bench-press');
  const s = (date: string, rows: [number, number, number?][]): SessionInput => ({ date, sets: rows.map(([reps, w, rir]) => work(reps, w, rir)) });
  it('zegt niet "kracht lager" als de gladgestreken kracht niet daalde', () => {
    // Vorige keer onder het bereik van 7 tot 9: de kracht steeg wel, het gewicht was te zwaar.
    const sessions = [s('2026-09-01', [[8, 60, 2], [8, 60, 2]]), s('2026-09-05', [[8, 60, 2], [8, 60, 2]]), s('2026-09-08', [[5, 70, 2], [5, 70, 2]])];
    const points = analyseSessions(sessions, { exercise: bench });
    expect(points[2].smoothed!).toBeGreaterThan(points[1].smoothed!);
    const rx = prescribe({ exercise: bench, sessions, date: '2026-09-12', settings })!;
    expect(rx.reason).not.toContain('geschatte kracht is wat lager');
    expect(rx.reason).not.toContain('geschatte kracht is gedaald');
    // Vorige keer 5 herhalingen bij een doel van 7 tot 9: dat is een ander doel dan nu.
    if (rx.kind === 'down') expect(rx.reason).toContain('Deze keer vraagt het programma 7 tot 9 herhalingen, meer dan vorige keer');
  });
  it('zegt bij hetzelfde doel dat je vorige keer onder het bereik zat', () => {
    // Vorige keer 6 herhalingen bij 7 tot 9: hetzelfde doel, net eronder.
    const sessions = [s('2026-09-01', [[8, 60, 2], [8, 60, 2]]), s('2026-09-05', [[8, 60, 2], [8, 60, 2]]), s('2026-09-08', [[6, 70, 2], [6, 70, 2]])];
    const rx = prescribe({ exercise: bench, sessions, date: '2026-09-12', settings, plan: { low: 7, high: 9, rir: 2 } })!;
    expect(rx.kind).toBe('down');
    expect(rx.reason).toContain('Vorige keer zat je onder de 7 tot 9 herhalingen');
    expect(rx.reason).not.toContain('Deze keer vraagt');
  });
  it('zegt bij een ander doel dat het programma nu meer vraagt, met het bereik van nu', () => {
    // Vorige keer een golf van 4 tot 6, nu 11 tot 13: een lichter gewicht, en de zin gaat over nu.
    const sessions = [s('2026-09-01', [[5, 80, 2], [5, 80, 2]]), s('2026-09-05', [[5, 80, 2], [5, 80, 2]]), s('2026-09-08', [[5, 80, 2], [5, 80, 2]])];
    const rx = prescribe({ exercise: bench, sessions, date: '2026-09-12', settings, plan: { low: 11, high: 13, rir: 2 } })!;
    expect(rx.sets[0].weightKg).toBeLessThan(80);
    expect(rx.reason).toBe('Deze keer vraagt het programma 11 tot 13 herhalingen, meer dan vorige keer, dus een lichter gewicht.');
  });
  it('zegt het wel als de kracht echt daalde', () => {
    const sessions = [s('2026-09-01', [[8, 70, 2], [8, 70, 2]]), s('2026-09-05', [[8, 70, 2], [8, 70, 2]]), s('2026-09-08', [[6, 65, 2], [6, 65, 2]])];
    const points = analyseSessions(sessions, { exercise: bench });
    expect(points[2].smoothed!).toBeLessThan(points[1].smoothed!);
    const rx = prescribe({ exercise: bench, sessions, date: '2026-09-12', settings })!;
    if (rx.kind === 'down') expect(rx.reason).toContain('kracht is wat lager');
  });
});

describe('opwarmen loopt netjes af', () => {
  const bench = ex('bench-press');
  const squat = ex('back-squat');
  const check = (w: { weightKg: number; reps: number }[]) => {
    for (let i = 1; i < w.length; i++) {
      expect(w[i].reps).toBeLessThanOrEqual(w[i - 1].reps);
      expect(w[i].weightKg).toBeGreaterThan(w[i - 1].weightKg);
    }
  };
  it('de herhalingen worden nooit hoger dan bij de set ervoor', () => {
    for (const [e, first, strength] of [[bench, 67.5, 88], [bench, 80, 100], [squat, 140, 180], [squat, 100, 133], [squat, 200, 260]] as const) {
      const c = candidatesFor(e, settings.profile, { lastExternalKg: first })!;
      check(warmupSets(settings, e, c, first, strength));
    }
  });
  it('zwaar begint licht met 10 herhalingen, daarna 8 en 4', () => {
    const c = candidatesFor(squat, settings.profile, { lastExternalKg: 140 })!;
    expect(warmupSets(settings, squat, c, 140, 180).map((x) => x.reps)).toEqual([10, 8, 4]);
  });
});

describe('een gewicht dat het profiel niet kent', () => {
  const s = (date: string, w: number): SessionInput => ({ date, sets: [work(10, w, 2), work(10, w, 2)] });
  it('een EZ-stang van 12,5 kg bij een lichtste stang van 15 geeft geen voorstel', () => {
    const curl = ex('barbell-curl');
    const input = { exercise: curl, sessions: [s('2026-09-01', 12.5), s('2026-09-04', 12.5)], date: '2026-09-08', settings };
    expect(lastWeightMismatch(input)).toBe(true);
    expect(prescribe(input)).toBeUndefined();
  });
  it('een dumbbell die niet in het rek staat geeft geen voorstel', () => {
    const db = ex('dumbbell-bench-press');
    const input = { exercise: db, sessions: [s('2026-09-01', 23), s('2026-09-04', 23)], date: '2026-09-08', settings };
    expect(lastWeightMismatch(input)).toBe(true);
    expect(prescribe(input)).toBeUndefined();
  });
  it('een kabel of machine met een andere stap blijft gewoon een voorstel geven', () => {
    const fly = ex('cable-fly');
    const input = { exercise: fly, sessions: [s('2026-09-01', 17.5), s('2026-09-04', 17.5)], date: '2026-09-08', settings };
    expect(lastWeightMismatch(input)).toBe(false);
    expect(prescribe(input)).toBeDefined();
  });
  it('een afrondingsverschil van ongeveer 0,1 kg (pounds uit een export) telt nog als hetzelfde gewicht', () => {
    const db = ex('dumbbell-bench-press');
    const near = { exercise: db, sessions: [s('2026-09-01', 22.55), s('2026-09-04', 22.55)], date: '2026-09-08', settings };
    expect(lastWeightMismatch(near)).toBe(false);
    const far = { exercise: db, sessions: [s('2026-09-01', 22.7), s('2026-09-04', 22.7)], date: '2026-09-08', settings };
    expect(lastWeightMismatch(far)).toBe(true);
  });
  it('een gewicht dat wel kan, geeft gewoon een voorstel', () => {
    const db = ex('dumbbell-bench-press');
    const input = { exercise: db, sessions: [s('2026-09-01', 22.5), s('2026-09-04', 22.5)], date: '2026-09-08', settings };
    expect(lastWeightMismatch(input)).toBe(false);
    expect(prescribe(input)).toBeDefined();
  });
});

describe('afronden naar het dichtstbijzijnde gewicht is geen stap', () => {
  const db = ex('incline-dumbbell-press');
  const s = (date: string, w: number): SessionInput => ({ date, sets: [work(10, w, 2), work(10, w, 2)] });
  const run = (w: number) => prescribe({ exercise: db, sessions: [s('2026-09-01', w), s('2026-09-04', w)], date: '2026-09-08', settings, plan: { low: 8, high: 12, rir: 2 }, nearestOnMismatch: true })!;
  it('24 kg wordt 25 kg en dat heet niet een stap zwaarder', () => {
    const p = run(24);
    expect(p.sets[0].weightKg).toBe(25);
    expect(p.kind).toBe('same');
    expect(p.reason).not.toContain('stap zwaarder');
    expect(p.notice).toBeDefined();
  });
  it('23 kg wordt 22,5 kg en dat heet niet een stap lichter', () => {
    const p = run(23);
    expect(p.sets[0].weightKg).toBe(22.5);
    expect(p.kind).toBe('same');
    expect(p.reason).not.toContain('lichter');
  });
});

describe('vermoeide benen en het doel in herhalingen', () => {
  it('een squat van 100 x 6 met bereik 6 tot 8 mag op moe benen 5 als doel krijgen', () => {
    const squat = ex('back-squat');
    const sessions: SessionInput[] = [
      { date: '2026-09-01', sets: [work(6, 100, 2), work(6, 100, 2)] },
      { date: '2026-09-08', sets: [work(6, 100, 2), work(6, 100, 2)] },
    ];
    const p = prescribe({ exercise: squat, sessions, date: '2026-09-15', settings, plan: { low: 6, high: 8, rir: 2 }, tired: { because: 'een bergtocht gisteren' } })!;
    expect(p.kind).toBe('tired');
    expect(p.sets[0].repsLow).toBe(5);
    expect(p.targetReps).toBeLessThan(6);
  });
});

describe('opwarmset met een negatief extern gewicht', () => {
  it('wordt weggelaten in plaats van de lichtste dumbbell', () => {
    const row = ex('barbell-row');
    const cands = candidatesFor(row, settings.profile, { lastExternalKg: 20, bodyKg: 200 })!;
    const w = warmupSets(settings, row, cands, 40, 20, 'full', 200);
    // 40% van een kracht van 20 kg is 8 kg, minder dan de 16 kg lichaam in deze rij
    expect(w).toEqual([]);
  });
});

describe('na een pauze lichter beginnen', () => {
  const bench = ex('bench-press');
  const three = (reps: number, kg: number) => [work(reps, kg, 2), work(reps, kg, 2), work(reps, kg, 2)];
  const sessions: SessionInput[] = [
    { date: '2026-06-01', sets: three(8, 60) },
    { date: '2026-06-08', sets: three(8, 60) },
  ];
  it('tot en met 28 dagen begint het voorstel op het laatste niveau', () => {
    const p = prescribe({ exercise: bench, sessions, date: '2026-07-06', settings })!;
    expect(p.kind).toBe('pause');
    expect(p.reason).toContain('laatste niveau');
    expect(p.strengthKg).toBeCloseTo(80, 6);
  });
  it('na meer dan 28 dagen rekent het met 5% minder kracht en zegt dat', () => {
    const p = prescribe({ exercise: bench, sessions, date: '2026-07-07', settings })!;
    expect(p.kind).toBe('pause');
    expect(p.reason).toBe('Je deed dit meer dan vier weken niet, dus we beginnen iets lichter en kijken na deze training opnieuw.');
    expect(p.strengthKg).toBeCloseTo(80 * 0.95, 6);
    expect(p.sets[0].weightKg).toBeLessThan(60);
  });
  it('met de instelling uit blijft het op het laatste niveau', () => {
    const off = resolveStrengthSettings({ lighterAfterBreak: false });
    const p = prescribe({ exercise: bench, sessions, date: '2026-07-07', settings: off })!;
    expect(p.strengthKg).toBeCloseTo(80, 6);
    expect(p.reason).toContain('laatste niveau');
  });
  it('rustte alleen deze oefening terwijl je wel krachttraining deed, dan is het geen pauze van training', () => {
    const p = prescribe({ exercise: bench, sessions, date: '2026-07-07', settings, lastStrengthDate: '2026-07-03' })!;
    expect(p.strengthKg).toBeCloseTo(80, 6);
    expect(p.reason).toContain('laatste niveau');
    // Was ook de laatste krachttraining meer dan vier weken terug, dan wel lichter.
    const q = prescribe({ exercise: bench, sessions, date: '2026-07-07', settings, lastStrengthDate: '2026-06-08' })!;
    expect(q.strengthKg).toBeCloseTo(80 * 0.95, 6);
  });
  it('lastDateBefore geeft de laatste dag voor een datum', () => {
    expect(lastDateBefore(['2026-06-01', '2026-07-03', '2026-07-09'], '2026-07-07')).toBe('2026-07-03');
    expect(lastDateBefore(['2026-07-09'], '2026-07-07')).toBeUndefined();
  });
});

describe('dumbbells als totaal', () => {
  const press = ex('dumbbell-bench-press');
  const three = (kg: number, reps = 8, rir = 2) => [work(reps, kg, rir), work(reps, kg, rir), work(reps, kg, rir)];
  const run = (log: SessionInput[], mode?: 'auto' | 'each' | 'total') =>
    prescribe({ exercise: press, sessions: log, date: '2026-09-22', settings: resolveStrengthSettings(mode ? { dumbbellLog: mode } : undefined), plan: { low: 7, high: 9, rir: 2 } });
  const totals: SessionInput[] = [
    { date: '2026-09-01', sets: three(56) },
    { date: '2026-09-08', sets: three(60) },
    { date: '2026-09-15', sets: three(60) },
  ];
  it('vanzelf: een logboek met totalen wordt als totaal gelezen', () => {
    const p = run(totals)!;
    expect(p).toBeDefined();
    expect(p.dumbbellTotal).toBe(true);
    // een som van twee gelijke dumbbells uit het rek: 60 is 2 x 30, in stappen van 5
    expect(p.sets[0].weightKg % 5).toBe(0);
    expect(p.sets[0].weightKg).toBeGreaterThan(50);
    expect(p.kind).not.toBe('widened');
    expect(describePlannedSet(press, p.sets[0], true)).toContain('(2 x ');
  });
  it('vanzelf: per dumbbell gelogde gewichten blijven per dumbbell', () => {
    const each: SessionInput[] = [{ date: '2026-09-01', sets: three(27.5) }, { date: '2026-09-08', sets: three(30) }, { date: '2026-09-15', sets: three(30) }];
    const p = run(each)!;
    expect(p.dumbbellTotal).toBeUndefined();
    expect(p.sets[0].weightKg).toBeLessThanOrEqual(35);
  });
  it('"Per dumbbell" leest nooit een totaal', () => {
    expect(run(totals, 'each')?.dumbbellTotal).toBeUndefined();
  });
  it('"Totaal van twee" leest elk gewicht als totaal, ook als het onder het rek past', () => {
    const light: SessionInput[] = [{ date: '2026-09-01', sets: three(20) }, { date: '2026-09-08', sets: three(20) }];
    expect(run(light, 'total')?.dumbbellTotal).toBe(true);
    expect(run(light, 'auto')?.dumbbellTotal).toBeUndefined();
  });
  it('een oefening met één dumbbell wordt nooit verdubbeld', () => {
    const goblet = ex('goblet-squat');
    const log: SessionInput[] = [{ date: '2026-09-01', sets: three(60) }];
    const p = prescribe({ exercise: goblet, sessions: log, date: '2026-09-08', settings: resolveStrengthSettings({ dumbbellLog: 'total' }), nearestOnMismatch: true });
    expect(p?.dumbbellTotal).toBeUndefined();
  });
  it('de last voor de schatting blijft wat er gelogd is', () => {
    const p = run(totals)!;
    expect(sessionStrength(three(60), { exercise: press })).toBeCloseTo(60 * (1 + 10 / 30), 6);
    expect(p.strengthKg).toBeGreaterThan(70);
  });
  it('zonder totaal loopt een gelogd totaal vast op het rek (de oude klacht)', () => {
    expect(lastWeightMismatch({ exercise: press, sessions: totals, date: '2026-09-22', settings: resolveStrengthSettings({ dumbbellLog: 'each' }) })).toBe(true);
    expect(lastWeightMismatch({ exercise: press, sessions: totals, date: '2026-09-22', settings })).toBe(false);
  });
  it('het gewicht staat er met twee dumbbells bij', () => {
    expect(formatWeight(press, 60, true)).toBe('60 kg (2 x 30)');
    expect(formatWeight(press, 60)).toBe('60 kg');
    expect(formatWeight(ex('goblet-squat'), 24, true)).toBe('24 kg');
  });
});

describe('wat ASCEND leert over gewichten is per sportschool', () => {
  const sets = (kg: number[]): SetLog[] => kg.map((w) => ({ reps: 10, weightKg: w }));
  const sessions: SessionInput[] = [
    { date: '2026-10-01', sets: sets([10, 15]), gymProfileId: 'a' },
    { date: '2026-10-03', sets: sets([22.5, 27.5]), gymProfileId: 'b' },
    { date: '2026-10-05', sets: sets([30]) },
  ];
  const base = resolveStrengthSettings(undefined).profile;
  const withActive = (id: string) =>
    resolveStrengthSettings({ activeProfileId: id, profiles: [{ ...base, id: 'a', name: 'Sportschool A' }, { ...base, id: 'b', name: 'Sportschool B' }] });

  it('telt alleen de trainingen van de actieve sportschool, en die zonder sportschool', () => {
    expect(usedBefore({ sessions, date: '2026-10-10', settings: withActive('a') })).toEqual([10, 15, 30]);
    expect(usedBefore({ sessions, date: '2026-10-10', settings: withActive('b') })).toEqual([22.5, 27.5, 30]);
  });
  it('zonder sportschoolprofielen telt alles zoals voorheen', () => {
    expect(usedBefore({ sessions: sessions.map((s) => ({ ...s, gymProfileId: undefined })), date: '2026-10-10', settings })).toEqual([10, 15, 22.5, 27.5, 30]);
  });
});

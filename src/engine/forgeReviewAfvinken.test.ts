import { describe, expect, it } from 'vitest';
import { exerciseById } from '../data/exercises';
import type { SessionLog, SetLog } from '../models/training';
import { belowPrescription, confirmedAssumed } from './assumedSets';
import { applyLighter } from './forgeAdjust';
import { mergeDraft, standHints } from './forgeInput';
import { QUICK_RIR_HINT, reckonAfterTick, undoRaise } from './forgeReckon';
import { toStrengthData, type WorkoutExercise, type WorkoutRow } from './forgeWorkout';
import { analyseSessions, prescribe, type SessionInput } from './strengthModel';
import { DEFAULT_PROFILE, resolveStrengthSettings, type GymProfile } from './strengthSettings';
import { migrateLogSetAsked } from '../storage/migrations';

// De punten uit de review van "Afvinken telt als het doel" (besluit 2026-11-09-forge-review-afvinken.md).
// Nagemaakte getallen. Bankdrukken met een stang van 20 kg en schijven vanaf 1,25 kg.
const bench = exerciseById('bench-press')!;
const ctx = { exercise: bench, maxToFailure: 20 };
const measured = (reps: number, weightKg: number, rir = 2): SetLog => ({ reps, weightKg, rir });
const assumed = (reps: number, weightKg: number, asked: { reps?: number; kg?: number; forgeKg?: number } = {}, rir = 2): SetLog => ({
  reps, weightKg, rir, rirAssumed: true,
  ...(asked.reps !== undefined ? { repsAsked: asked.reps } : {}),
  ...(asked.kg !== undefined ? { weightKgAsked: asked.kg } : {}),
  ...(asked.forgeKg !== undefined ? { forgeKg: asked.forgeKg } : {}),
});
const on = resolveStrengthSettings(undefined);
const row = (i: number, over: Partial<WorkoutRow> = {}): WorkoutRow => ({ id: `r${i}`, kind: 'work', target: { weightKg: 60, repsLow: 9, repsHigh: 11, rir: 2 }, weightKg: 60, reps: 10, forgeReps: 10, done: false, ...over });
const ex = (rows: WorkoutRow[], over: Partial<WorkoutExercise> = {}): WorkoutExercise => ({ slot: 's', exerciseId: 'bench-press', name: 'Bankdrukken', known: true, rows, restSec: 120, timed: false, ...over });

describe('a: het gewicht dat Forge na een bijstelling in de rij zette (forgeKg)', () => {
  it('reckonAfterTick en Lichter zetten forgeKg; Terugzetten haalt hem weg', () => {
    const done = ex([row(0, { done: true, reps: 6, rir: 0 }), row(1), row(2)], { strengthKg: 80 });
    const after = reckonAfterTick(done, 'r0', { profile: DEFAULT_PROFILE, workSets: 'descending', bodyKg: 80, on: true });
    const next = after.rows[1];
    expect(next.weightKg).toBeLessThan(60);
    expect(next.forgeKg).toBe(next.weightKg);
    const lighter = applyLighter(ex([row(0, { done: true }), row(1)]), { fromRowId: 'r0', items: [{ rowId: 'r1', weightKg: 55 }] });
    expect(lighter.rows[1]).toMatchObject({ weightKg: 55, forgeKg: 55 });
    const raised = { ...ex([row(0, { forgeKg: 60 })]), raise: { back: [{ rowId: 'r0', weightKg: 57.5, reps: 10 }] } };
    expect(undoRaise(raised as WorkoutExercise).rows[0].forgeKg).toBeUndefined();
  });

  it('het log krijgt forgeKg alleen naast rirAssumed en alleen als het afwijkt van het voorschrift', () => {
    const rows: WorkoutRow[] = [
      row(0, { done: true, weightKg: 55, forgeKg: 55, rir: 2, rirAssumed: true }),
      row(1, { done: true, weightKg: 60, forgeKg: 60, rir: 2, rirAssumed: true }),
      row(2, { done: true, weightKg: 55, forgeKg: 55, rir: 1 }),
    ];
    const sets = toStrengthData([ex(rows)])![0].sets;
    expect(sets[0]).toMatchObject({ weightKg: 55, weightKgAsked: 60, forgeKg: 55, rirAssumed: true });
    expect(sets[1].forgeKg).toBeUndefined();
    expect(sets[2].forgeKg).toBeUndefined();
  });

  it('afgevinkt op het lichtere gewicht van Forge is bevestigd, maar onder het voorschrift', () => {
    const set = assumed(10, 55, { reps: 10, kg: 60, forgeKg: 55 });
    expect(confirmedAssumed(set, undefined, {})).toBe(true);
    expect(belowPrescription(set, {})).toBe(true);
    // Een oud log zonder forgeKg: lichter dan het voorschrift blijft niet bevestigd, zoals altijd.
    expect(confirmedAssumed(assumed(10, 55, { reps: 10, kg: 60 }), undefined, {})).toBe(false);
    // Zelf lichter getikt dan Forge vroeg: niet bevestigd.
    expect(confirmedAssumed(assumed(10, 52.5, { reps: 10, kg: 60, forgeKg: 55 }), undefined, {})).toBe(false);
  });

  it('zo een bevestigde set houdt de kracht niet vast: hij telt als meting', () => {
    const start: SessionInput = { date: '2026-09-01', sets: [measured(10, 60)] };
    const strength0 = 60 * (1 + 12 / 30);
    const lowered: SessionInput = { date: '2026-09-04', sets: [assumed(10, 55, { reps: 10, kg: 60, forgeKg: 55 })] };
    const points = analyseSessions([start, lowered], { ...ctx, confirm: { rangeLow: 9 } });
    expect(points[1].value).toBeCloseTo(55 * (1 + 12 / 30), 6);
    expect(points[1].smoothed!).toBeLessThan(strength0);
    // Op het gewicht van het voorschrift houdt hij de kracht wel vast.
    const same: SessionInput = { date: '2026-09-04', sets: [assumed(10, 60, { reps: 10, kg: 60 })] };
    expect(analyseSessions([start, same], { ...ctx, confirm: { rangeLow: 9 } })[1].smoothed).toBeCloseTo(strength0, 9);
  });

  it('de migratiestap: geldig forgeKg blijft, beschadigd of zonder rirAssumed valt weg, een oud log blijft hetzelfde', () => {
    const log = (sets: unknown[]): SessionLog => ({ id: 'x', templateId: 't', type: 'strength', completedDate: '2026-09-01', completedAt: '2026-09-01T18:00:00.000Z', variant: 'custom', durationMinutes: 50, source: 'manual', strengthData: [{ exerciseId: 'bench-press', exerciseName: 'Bankdrukken', sets: sets as SetLog[] }] });
    const old = log([{ reps: 10, weightKg: 60, rir: 2, rirAssumed: true, repsAsked: 10, weightKgAsked: 60 }]);
    expect(migrateLogSetAsked(old)).toBe(old);
    const good = log([{ reps: 10, weightKg: 55, rir: 2, rirAssumed: true, repsAsked: 10, weightKgAsked: 60, forgeKg: 55 }]);
    expect(migrateLogSetAsked(good)).toBe(good);
    const bad = migrateLogSetAsked(log([{ reps: 10, weightKg: 55, rir: 2, rirAssumed: true, weightKgAsked: 60, forgeKg: 'veel' }]));
    expect(bad.strengthData![0].sets[0]).toEqual({ reps: 10, weightKg: 55, rir: 2, rirAssumed: true, weightKgAsked: 60 });
    const loose = migrateLogSetAsked(log([{ reps: 10, weightKg: 55, rir: 2, forgeKg: 55 }]));
    expect(loose.strengthData![0].sets[0]).toEqual({ reps: 10, weightKg: 55, rir: 2 });
  });
});

describe('b en c: de stap zwaarder op bevestigde sets', () => {
  const plan = { low: 9, high: 11, rir: 2 };
  const input = (sessions: SessionInput[]) => ({ exercise: bench, sessions, date: '2026-09-15', settings: on, plan });
  const first: SessionInput = { date: '2026-09-01', sets: [measured(9, 60), measured(9, 60), measured(9, 60)] };

  it('alle werksets zoals gevraagd aan de bovenkant: een stap', () => {
    const all: SessionInput = { date: '2026-09-08', sets: [assumed(11, 60, { reps: 11, kg: 60 }), assumed(11, 60, { reps: 11, kg: 60 }), assumed(11, 60, { reps: 11, kg: 60 })] };
    expect(prescribe(input([first, all]))!.raised?.stepKg).toBe(2.5);
  });
  it('b: een werkset die niet bevestigd is (lichter dan gevraagd) houdt de stap tegen', () => {
    const one: SessionInput = { date: '2026-09-08', sets: [assumed(11, 60, { reps: 11, kg: 60 }), assumed(11, 60, { reps: 11, kg: 60 }), assumed(11, 57.5, { reps: 11, kg: 60 })] };
    expect(prescribe(input([first, one]))!.raised).toBeUndefined();
  });
  it('b: een gemeten RIR onder het doel in een andere werkset houdt de stap tegen', () => {
    const one: SessionInput = { date: '2026-09-08', sets: [assumed(11, 60, { reps: 11, kg: 60 }), assumed(11, 60, { reps: 11, kg: 60 }), measured(11, 60, 1)] };
    expect(prescribe(input([first, one]))!.raised).toBeUndefined();
  });
  it('c: de topset leest de RIR zoals regel 4: 2 meer dan gevraagd telt met 1 over, dus geen stap', () => {
    const extra: SessionInput = { date: '2026-09-08', sets: [assumed(11, 60, { reps: 9, kg: 60 }), assumed(11, 60, { reps: 9, kg: 60 }), assumed(11, 60, { reps: 9, kg: 60 })] };
    expect(prescribe(input([first, extra]))!.raised).toBeUndefined();
    // 1 meer dan gevraagd telt nog met 2 over (naar boven afgerond).
    const one: SessionInput = { date: '2026-09-08', sets: [assumed(11, 60, { reps: 10, kg: 60 }), assumed(11, 60, { reps: 10, kg: 60 }), assumed(11, 60, { reps: 10, kg: 60 })] };
    expect(prescribe(input([first, one]))!.raised?.stepKg).toBe(2.5);
  });
});

describe('d: na een pauze houdt een bevestigde set de kracht niet vast', () => {
  const start: SessionInput = { date: '2026-08-01', sets: [measured(7, 67.5, 2)] };
  const strength0 = 67.5 * (1 + 9 / 30);
  it('de eerste training na meer dan drie weken telt als meting, ook als hij bevestigd is', () => {
    const back: SessionInput = { date: '2026-09-10', sets: [assumed(7, 62.5, { reps: 7, kg: 62.5 })] };
    const points = analyseSessions([start, back], { ...ctx, confirm: { rangeLow: 6 } });
    expect(points[1].value).toBeCloseTo(62.5 * (1 + 9 / 30), 6);
    expect(points[1].smoothed!).toBeLessThan(strength0);
  });
  it('zonder pauze houdt dezelfde set de kracht wel vast', () => {
    const soon: SessionInput = { date: '2026-08-08', sets: [assumed(7, 62.5, { reps: 7, kg: 62.5 })] };
    expect(analyseSessions([start, soon], { ...ctx, confirm: { rangeLow: 6 } })[1].smoothed).toBeCloseTo(strength0, 9);
  });
});

describe('e: mergeDraft en een oud concept zonder trainings', () => {
  it('een aangeraakt oud concept krijgt het aantal trainingen van nu; een eigen getal blijft', () => {
    const fresh = [ex([row(0)], { trainings: 2 })];
    const old = [ex([row(0, { done: true })])];
    expect(mergeDraft(old, fresh)[0].trainings).toBe(2);
    expect(mergeDraft(old, fresh)[0].rows[0].done).toBe(true);
    const own = [ex([row(0, { done: true })], { trainings: 5 })];
    expect(mergeDraft(own, fresh)[0].trainings).toBe(5);
    // Zonder getal in het nieuwe plan blijft het concept zoals het was.
    expect(mergeDraft(old, [ex([row(0)])])[0]).toBe(old[0]);
  });
});

describe('h: Minder en Meer op een toestel met standen', () => {
  const machine = exerciseById('leg-extension')!;
  const gym: GymProfile = { ...DEFAULT_PROFILE, id: 'g', name: 'Proefzaal', stackStepKg: 2.5, exerciseStandsKg: { [machine.id]: { kg: [7, 14, 23, 32] } } };
  it('een leeg veld: Minder zegt niets (nooit naar 0 kilo), Meer de eerste stand', () => {
    expect(standHints(machine, gym, undefined)).toEqual({ up: 7 });
    expect(standHints(machine, gym, 0)).toEqual({ up: 7 });
  });
  it('op de laagste stand zegt Minder niets; daarboven allebei', () => {
    expect(standHints(machine, gym, 7)).toEqual({ up: 14 });
    expect(standHints(machine, gym, 14)).toEqual({ down: 7, up: 23 });
  });
  it('zonder standen geen hints', () => {
    expect(standHints(machine, { ...gym, exerciseStandsKg: undefined }, 14)).toBeUndefined();
    expect(standHints(bench, gym, 60)).toBeUndefined();
  });
});

describe('g: de uitlegzin bij de bolletjes', () => {
  it('kort, je/jij, zonder gedachtestreepje', () => {
    expect(QUICK_RIR_HINT).toContain('Twijfel je tussen twee, kies het lagere: dan rekent Forge voorzichtig.');
    expect(QUICK_RIR_HINT).not.toMatch(/[\u2013\u2014]/);
  });
});

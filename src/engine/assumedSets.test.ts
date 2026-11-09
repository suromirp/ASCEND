import { describe, expect, it } from 'vitest';
import { exerciseById } from '../data/exercises';
import type { SetLog } from '../models/training';
import { asksReserve } from './forgeReckon';
import { toStrengthData, type WorkoutExercise, type WorkoutRow } from './forgeWorkout';
import { confirmedAssumed, confirmedFlags, confirmedRir } from './assumedSets';
import { analyseSessions, estimateSet, learnAfterHard, learnFatigue, prescribe, sessionStrength, type SessionInput } from './strengthModel';
import { resolveStrengthSettings } from './strengthSettings';
import { migrateLogSetAsked } from '../storage/migrations';
import type { SessionLog } from '../models/training';

// Nagemaakte getallen. Bankdrukken met een stang van 20 kg en schijven vanaf 1,25 kg.
const bench = exerciseById('bench-press')!;
const ctx = { exercise: bench, maxToFailure: 20 };
const measured = (reps: number, weightKg: number, rir = 2): SetLog => ({ reps, weightKg, rir });
const assumed = (reps: number, weightKg: number, asked?: { reps?: number; kg?: number }, rir = 2): SetLog => ({
  reps, weightKg, rir, rirAssumed: true,
  ...(asked?.reps !== undefined ? { repsAsked: asked.reps } : {}),
  ...(asked?.kg !== undefined ? { weightKgAsked: asked.kg } : {}),
});
const on = resolveStrengthSettings(undefined);
const off = resolveStrengthSettings({ assumedCounts: false });

describe('stap 1: wat een aangenomen set nu al doet (instelling uit)', () => {
  it('estimateSet kijkt niet naar rirAssumed: dezelfde schatting als gemeten', () => {
    expect(estimateSet(assumed(7, 67.5), ctx)!.strengthKg).toBeCloseTo(estimateSet(measured(7, 67.5), ctx)!.strengthKg, 9);
  });
  it('telt mee in sessionStrength en in de gladgestreken kracht van analyseSessions', () => {
    const sets = [assumed(7, 67.5), assumed(7, 67.5)];
    expect(sessionStrength(sets, ctx)).toBeCloseTo(67.5 * (1 + 9 / 30), 6);
    const points = analyseSessions([{ date: '2026-09-01', sets }], ctx);
    expect(points[0].smoothed).toBeCloseTo(87.75, 6);
  });
  it('telt niet mee in learnFatigue en learnAfterHard', () => {
    const s: SessionInput = { date: '2026-09-01', sets: [assumed(8, 60), assumed(7, 60), assumed(6, 60)] };
    expect(learnFatigue([s], ctx, false).pairs).toBe(0);
    expect(learnAfterHard([s], ctx, false, 0.03).pairs).toBe(0);
  });
  it('geeft geen stap zwaarder op de bovenkant van het bereik (topReached eist een gemeten RIR)', () => {
    const sessions: SessionInput[] = [
      { date: '2026-09-01', sets: [assumed(9, 60), assumed(9, 60), assumed(9, 60)] },
      { date: '2026-09-08', sets: [assumed(11, 60), assumed(11, 60), assumed(11, 60)] },
    ];
    const p = prescribe({ exercise: bench, sessions, date: '2026-09-15', settings: off, plan: { low: 9, high: 11, rir: 2 } })!;
    expect(p.raised).toBeUndefined();
  });
});

describe('regel 1 en 3: bevestigd', () => {
  it('werkset, aangenomen, niet lichter, minstens de gevraagde herhalingen', () => {
    expect(confirmedAssumed(assumed(7, 67.5, { reps: 7, kg: 67.5 }), undefined, {})).toBe(true);
    expect(confirmedAssumed(assumed(8, 70, { reps: 7, kg: 67.5 }), undefined, {})).toBe(true);
    expect(confirmedAssumed(assumed(6, 67.5, { reps: 7, kg: 67.5 }), undefined, {})).toBe(false);
    expect(confirmedAssumed(assumed(7, 65, { reps: 7, kg: 67.5 }), undefined, {})).toBe(false);
    expect(confirmedAssumed(measured(7, 67.5), undefined, {})).toBe(false);
    expect(confirmedAssumed({ ...assumed(7, 67.5, { reps: 7 }), kind: 'warmup' }, undefined, {})).toBe(false);
  });
  it('oude logs zonder gevraagd aantal: minstens de onderkant van het bereik', () => {
    expect(confirmedAssumed(assumed(9, 60), undefined, { rangeLow: 9 })).toBe(true);
    expect(confirmedAssumed(assumed(8, 60), undefined, { rangeLow: 9 })).toBe(false);
    // Zonder bereik en zonder gevraagd aantal valt er niets te bevestigen.
    expect(confirmedAssumed(assumed(9, 60), undefined, {})).toBe(false);
  });
  it('een fout halverwege: valt de volgende set 2 of meer tekort, dan vervalt bevestigd achteraf', () => {
    const sets = [assumed(8, 60, { reps: 8, kg: 60 }), assumed(6, 60, { reps: 8, kg: 60 }), assumed(8, 60, { reps: 8, kg: 60 })];
    expect(confirmedFlags(sets, {})).toEqual([false, false, true]);
    // Eén tekort is nog geen teken.
    expect(confirmedFlags([assumed(8, 60, { reps: 8 }), assumed(7, 60, { reps: 8 })], {})).toEqual([true, false]);
    // Een opwarmset ertussen telt niet als volgende set.
    expect(confirmedFlags([assumed(8, 60, { reps: 8 }), { reps: 3, weightKg: 40, kind: 'warmup' }, measured(8, 60)], {})[0]).toBe(true);
  });
  it('regel 4: extra herhalingen tellen half, de RIR naar boven afgerond, niet onder 0', () => {
    expect(confirmedRir(assumed(7, 67.5, { reps: 7 }), undefined)).toBe(2);
    expect(confirmedRir(assumed(8, 67.5, { reps: 7 }), undefined)).toBe(2);
    expect(confirmedRir(assumed(9, 67.5, { reps: 7 }), undefined)).toBe(1);
    expect(confirmedRir(assumed(14, 67.5, { reps: 7 }), undefined)).toBe(0);
  });
});

describe('regel 4: geschatte kracht op bevestigde sets', () => {
  // Kracht 88 kg, doel 2 over: Forge zet 67,5 kg maal 7 (hoofdstuk 4 van het verslag).
  const start: SessionInput = { date: '2026-09-01', sets: [measured(7, 67.5, 2), measured(7, 67.5, 2)] };
  const strength0 = 67.5 * (1 + 9 / 30);
  const ticked = (date: string, reps: number): SessionInput => ({ date, sets: [assumed(reps, 67.5, { reps: 7, kg: 67.5 }), assumed(reps, 67.5, { reps: 7, kg: 67.5 })] });
  const dates = Array.from({ length: 10 }, (_, i) => `2026-09-${String(i + 2).padStart(2, '0')}`);

  it('tien trainingen met precies de gevraagde herhalingen: de kracht zakt niet en stijgt niet', () => {
    const sessions = [start, ...dates.map((d) => ticked(d, 7))];
    const points = analyseSessions(sessions, { ...ctx, confirm: { rangeLow: 6 } });
    for (const p of points) expect(p.smoothed).toBeCloseTo(strength0, 9);
  });
  it('het voorbeeld van 88 kg: 9 in plaats van 7 telt als 9 met 1 over, 90 kg', () => {
    const sessions: SessionInput[] = [{ date: '2026-09-01', sets: [measured(7, 88 / 1.3, 2)] }, ticked('2026-09-02', 9)];
    const points = analyseSessions(sessions, { ...ctx, confirm: { rangeLow: 6 } });
    expect(points[0].smoothed).toBeCloseTo(88, 0);
    expect(points[1].value).toBeCloseTo(90, 6);
  });
  it('een mindere gemeten dag blijft tellen; een niet-bevestigde aangenomen set telt zoals voorheen', () => {
    const lower: SessionInput = { date: '2026-09-02', sets: [assumed(5, 67.5, { reps: 7, kg: 67.5 })] };
    const a = analyseSessions([start, lower], { ...ctx, confirm: { rangeLow: 6 } });
    const b = analyseSessions([start, lower], ctx);
    expect(a[1].smoothed).toBeCloseTo(b[1].smoothed!, 9);
    expect(a[1].smoothed!).toBeLessThan(strength0);
  });
  it('de eerste set op een nieuw gewicht: zonder eerdere kracht telt hij als meting', () => {
    const points = analyseSessions([ticked('2026-09-02', 7)], { ...ctx, confirm: { rangeLow: 6 } });
    expect(points[0].smoothed).toBeCloseTo(strength0, 9);
  });
  it('instelling uit: de afrondingsdrift van nu blijft', () => {
    const sessions = [{ date: '2026-09-01', sets: [measured(7, 69.2, 2)] }, ...dates.map((d) => ticked(d, 7))];
    const offPoints = analyseSessions(sessions, ctx);
    const onPoints = analyseSessions(sessions, { ...ctx, confirm: { rangeLow: 6 } });
    expect(offPoints.at(-1)!.smoothed!).toBeLessThan(offPoints[0].smoothed!);
    expect(onPoints.at(-1)!.smoothed!).toBeCloseTo(onPoints[0].smoothed!, 9);
  });
});

describe('regel 5: de stap zwaarder op bevestigde sets', () => {
  const plan = { low: 9, high: 11, rir: 2 };
  const input = (sessions: SessionInput[], settings = on) => ({ exercise: bench, sessions, date: '2026-09-15', settings, plan });

  it('alle werksets aan de bovenkant: de kleinste stap zwaarder, met alleen de herhalingen in de regel', () => {
    const sessions: SessionInput[] = [
      { date: '2026-09-01', sets: [measured(9, 60), measured(9, 60), measured(9, 60)] },
      { date: '2026-09-08', sets: [assumed(11, 60, { reps: 10, kg: 60 }), assumed(11, 60, { reps: 10, kg: 60 }), assumed(11, 60, { reps: 10, kg: 60 })] },
    ];
    const p = prescribe(input(sessions))!;
    expect(p.raised).toEqual({ fromKg: 60, stepKg: 2.5, reps: 11 });
    expect(p.reason).toBe('2,5 kg erbij, je haalde vorige keer 11.');
    // Instelling uit: het gedrag van nu, geen stap.
    expect(prescribe(input(sessions, off))!.raised).toBeUndefined();
  });
  it('alleen de topset aan de bovenkant: pas na twee trainingen achter elkaar', () => {
    const once: SessionInput[] = [
      { date: '2026-09-01', sets: [measured(10, 60), measured(10, 60), measured(9, 60)] },
      { date: '2026-09-08', sets: [assumed(11, 60, { reps: 10, kg: 60 }), assumed(10, 60, { reps: 10, kg: 60 }), assumed(9, 60, { reps: 9, kg: 60 })] },
    ];
    expect(prescribe(input(once))!.raised).toBeUndefined();
    const twice: SessionInput[] = [
      { date: '2026-08-25', sets: [measured(9, 60), measured(9, 60), measured(9, 60)] },
      { date: '2026-09-01', sets: [assumed(11, 60, { reps: 10, kg: 60 }), assumed(10, 60, { reps: 10, kg: 60 }), assumed(9, 60, { reps: 9, kg: 60 })] },
      once[1],
    ];
    const plain = prescribe(input(twice, off))!;
    expect(plain.sets[0].weightKg).toBe(60);
    expect(prescribe(input(twice))!.raised?.stepKg).toBe(2.5);
  });
  it('lichter dan voorgeschreven telt niet als bevestigd, dus geen stap', () => {
    const sessions: SessionInput[] = [
      { date: '2026-09-01', sets: [measured(9, 60), measured(9, 60), measured(9, 60)] },
      { date: '2026-09-08', sets: [assumed(11, 60, { reps: 10, kg: 62.5 }), assumed(11, 60, { reps: 10, kg: 62.5 }), assumed(11, 60, { reps: 9, kg: 62.5 })] },
    ];
    expect(prescribe(input(sessions))!.raised).toBeUndefined();
  });
  it('oude logs zonder gevraagd aantal tellen bij het lezen ook, met de onderkant van het bereik', () => {
    const sessions: SessionInput[] = [
      { date: '2026-09-01', sets: [assumed(10, 60), assumed(10, 60), assumed(10, 60)] },
      { date: '2026-09-08', sets: [assumed(11, 60), assumed(11, 60), assumed(11, 60)] },
    ];
    // Bereik 10 tot 11: 11 is 1 boven de onderkant, dat telt met 2 over (regel 4), dus een stap.
    expect(prescribe({ ...input(sessions), plan: { low: 10, high: 11, rir: 2 } })!.raised?.stepKg).toBe(2.5);
    // Bereik 9 tot 11: 11 is 2 boven de onderkant, dat telt met 1 over, en regel 5 leest hetzelfde: geen stap.
    expect(prescribe(input(sessions))!.raised).toBeUndefined();
    // Het log zelf verandert niet.
    expect(sessions[1].sets[0]).toEqual({ reps: 11, weightKg: 60, rir: 2, rirAssumed: true });
  });
  it('vermoeidheid leren blijft zonder bevestigde sets (regel 6)', () => {
    const s: SessionInput = { date: '2026-09-01', sets: [assumed(10, 60, { reps: 10, kg: 60 }), assumed(9, 60, { reps: 9, kg: 60 })] };
    expect(learnFatigue([s], { ...ctx, confirm: {} }, false).pairs).toBe(0);
  });
});

describe('regel 2: twijfel, dan Hoeveel over?', () => {
  const row = (i: number, over: Partial<WorkoutRow> = {}): WorkoutRow => ({ id: `r${i}`, kind: 'work', target: { weightKg: 60, repsLow: 9, repsHigh: 11, rir: 2 }, weightKg: 60, reps: 10, forgeReps: 10, rir: 2, rirAssumed: true, done: true, ...over });
  const ex = (rows: WorkoutRow[], over: Partial<WorkoutExercise> = {}): WorkoutExercise => ({ slot: 's', exerciseId: 'bench-press', name: 'Bankdrukken', known: true, rows, restSec: 120, timed: false, trainings: 5, previous: [measured(10, 60)], ...over });
  const four = (mid: Partial<WorkoutRow> = {}) => [row(0), row(1, mid), row(2), row(3)];

  it('een gewone middelste set: geen vraag, ook met twijfel aan', () => {
    expect(asksReserve(ex(four()), 'r1', true)).toBe(false);
  });
  it('minder dan gevraagd, of 2 boven de bovenkant', () => {
    expect(asksReserve(ex(four({ reps: 9 })), 'r1', true)).toBe(true);
    expect(asksReserve(ex(four({ reps: 13 })), 'r1', true)).toBe(true);
    expect(asksReserve(ex(four({ reps: 12 })), 'r1', true)).toBe(false);
  });
  it('de eerste set op een zwaarder gewicht dan vorige keer, niet de set daarna', () => {
    const rows = [row(0), row(1, { weightKg: 62.5 }), row(2, { weightKg: 62.5 }), row(3)];
    expect(asksReserve(ex(rows), 'r1', true)).toBe(true);
    expect(asksReserve(ex(rows), 'r2', true)).toBe(false);
  });
  it('een oefening met minder dan drie trainingen: elke werkset', () => {
    expect(asksReserve(ex(four(), { trainings: 2 }), 'r1', true)).toBe(true);
    expect(asksReserve(ex(four(), { trainings: 3 }), 'r1', true)).toBe(false);
  });
  it('instelling uit: alleen de eerste, een zware en de laatste set, zoals nu', () => {
    const e = ex(four({ reps: 5 }), { trainings: 0 });
    expect(['r0', 'r1', 'r2', 'r3'].map((id) => asksReserve(e, id))).toEqual([true, false, false, true]);
  });
});

describe('het log: wat Forge vroeg, bij elke werkset uit Forge', () => {
  it('toStrengthData schrijft repsAsked en weightKgAsked naast rirAssumed', () => {
    const rows: WorkoutRow[] = [
      { id: 'a', kind: 'work', target: { weightKg: 60, repsLow: 9, repsHigh: 11, rir: 2 }, weightKg: 60, reps: 10, forgeReps: 10, rir: 2, rirAssumed: true, done: true },
      { id: 'b', kind: 'work', target: { weightKg: 60, repsLow: 9, repsHigh: 11, rir: 2 }, weightKg: 60, reps: 9, forgeReps: 10, rir: 1, rirAssumed: false, done: true },
    ];
    const data = toStrengthData([{ slot: 's', exerciseId: 'bench-press', name: 'Bankdrukken', known: true, rows, restSec: 120, timed: false }])!;
    expect(data[0].sets[0]).toMatchObject({ reps: 10, rirAssumed: true, repsAsked: 10, weightKgAsked: 60 });
    // Sinds 9 november ook bij een set met eigen RIR (Hoe goed kent Forge je), maar dan zonder rirAssumed.
    expect(data[0].sets[1]).toMatchObject({ repsAsked: 10, weightKgAsked: 60, rirAsked: 2 });
    expect(data[0].sets[1].rirAssumed).toBeUndefined();
  });
  it('de migratiestap houdt geldige velden, laat een beschadigd veld vallen en laat oude logs staan', () => {
    const log = (sets: unknown[]): SessionLog => ({ id: 'x', templateId: 't', type: 'strength', completedDate: '2026-09-01', completedAt: '2026-09-01T18:00:00.000Z', variant: 'custom', durationMinutes: 50, source: 'manual', strengthData: [{ exerciseId: 'bench-press', exerciseName: 'Bankdrukken', sets: sets as SetLog[] }] });
    const old = log([{ reps: 10, weightKg: 60, rir: 2, rirAssumed: true }]);
    expect(migrateLogSetAsked(old)).toBe(old);
    const good = log([{ reps: 10, weightKg: 60, rir: 2, rirAssumed: true, repsAsked: 10, weightKgAsked: 60 }]);
    expect(migrateLogSetAsked(good)).toBe(good);
    const bad = migrateLogSetAsked(log([{ reps: 10, weightKg: 60, rir: 2, rirAssumed: true, repsAsked: 'tien', weightKgAsked: 60 }]));
    expect(bad.strengthData![0].sets[0]).toEqual({ reps: 10, weightKg: 60, rir: 2, rirAssumed: true, weightKgAsked: 60 });
    const loose = log([{ reps: 10, weightKg: 60, rir: 2, repsAsked: 10, rirAsked: 2 }]);
    expect(migrateLogSetAsked(loose)).toBe(loose);
    const badRir = migrateLogSetAsked(log([{ reps: 10, weightKg: 60, rir: 2, repsAsked: 10, rirAsked: 'twee' }]));
    expect(badRir.strengthData![0].sets[0]).toEqual({ reps: 10, weightKg: 60, rir: 2, repsAsked: 10 });
  });
});

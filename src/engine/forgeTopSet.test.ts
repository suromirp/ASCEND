// De training van 3 november (Benen A) nagebouwd, met nagemaakte cijfers in de buurt van wat er gebeurde.
// Besluit: docs/beslissingen/2026-11-03-forge-na-de-eerste-vergelijking.md.
//
// Squat: een topset met 1 over, daarna twee terugsets van 7 tot 9 met 2 over. Het oude model gaf 72,5 en 70,
// en daar lukten er 6. Deadlift: een topset tot falen ("7+"), 10 herhalingen, en daarna 95, 92,5 en 90 voor 7.

import { describe, expect, it } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { ExercisePrescription, SessionLog, SetLog, SetTarget } from '../models/training';
import { reckonAfterTick, type ReckonContext } from './forgeReckon';
import { planWorkout, tickRow, type PlanContext, type WorkoutExercise, type WorkoutRow } from './forgeWorkout';
import { fatigueFactor, FATIGUE_PER_SET, HARD_SET_EXTRA, isHardPair, learnAfterHard, learnFatigue, type SessionInput } from './strengthModel';
import { resolveStrengthSettings } from './strengthSettings';

const { templates, program } = buildDefaultProgramData();
const BODY = 80;

type Row = [reps: number, weightKg: number, rir: number];
const sets = (rows: Row[], assumed = true): SetLog[] => rows.map(([reps, weightKg, rir]) => ({ reps, weightKg, rir, kind: 'work' as const, ...(assumed ? { rirAssumed: true as const } : {}) }));

function log(id: string, date: string, exercises: [string, string, SetLog[]][]): SessionLog {
  return {
    id, templateId: 'tpl_lower_a', type: 'strength', completedDate: date, completedAt: `${date}T18:30:00.000Z`, variant: 'custom', durationMinutes: 70, source: 'manual',
    strengthData: exercises.map(([exerciseId, exerciseName, s]) => ({ exerciseId, exerciseName, sets: s })),
  };
}

// Nagemaakte voorgeschiedenis: de week ervoor, met de RIR aangenomen zoals de eigenaar traint.
const history = (): SessionLog[] => [
  log('h1', '2026-10-20', [['deadlift', 'Deadlift (Barbell)', sets([[7, 102.5, 0], [7, 95, 2], [7, 92.5, 2], [7, 90, 2]])]]),
  log('h2', '2026-10-27', [
    ['back-squat', 'Back Squat (Barbell)', sets([[4, 85, 1], [7, 75, 2], [7, 72.5, 2]])],
    ['deadlift', 'Deadlift (Barbell)', sets([[9, 100, 0], [7, 92.5, 2], [7, 90, 2], [7, 87.5, 2]])],
  ]),
];

const top = (low: number, high: number, rir: number, failure = false): SetTarget => ({ repsLow: low, repsHigh: high, rir, ...(failure ? { failure: true } : {}) });
const squatSlot: ExercisePrescription = { id: 'sq', exerciseName: 'Barbell Back Squat', sets: 3, reps: '5-7', priority: 'core', setTargets: [top(5, 7, 1), top(7, 9, 2), top(7, 9, 2)] };
const deadliftSlot: ExercisePrescription = { id: 'dl', exerciseName: 'Conventional Deadlift', sets: 4, reps: '7+', priority: 'core', setTargets: [top(7, 7, 0, true), top(7, 9, 2), top(7, 9, 2), top(7, 9, 2)] };

const settings = resolveStrengthSettings(undefined);
const ctx = (over: Partial<PlanContext> = {}): PlanContext => ({ logs: history(), templates, program, bodyKg: BODY, settings, date: '2026-11-03', modelOn: true, ...over });
const reckon: ReckonContext = { profile: settings.profile, workSets: settings.workSets, bodyKg: BODY, maxToFailure: settings.estimateUpTo, stackWeights: settings.stackWeights, on: true };
const work = (e: WorkoutExercise) => e.rows.filter((r) => r.kind === 'work');
const weights = (e: WorkoutExercise) => work(e).map((r) => r.weightKg);

// Een set afvinken met wat je deed, zoals het scherm dat doet: tickRow en dan meerekenen.
function tickWith(ex: WorkoutExercise, rowId: string, patch: Partial<WorkoutRow>): WorkoutExercise {
  const withValues = { ...ex, rows: ex.rows.map((r) => (r.id === rowId ? { ...r, ...patch } : r)) };
  return reckonAfterTick(tickRow([withValues], ex.slot, rowId).workout[0], rowId, reckon);
}

describe('de daling na een zware topset', () => {
  it('een topset is 0 of 1 over gevolgd door een set met meer over; gelijke sets zijn geen topset', () => {
    expect(isHardPair({ rir: 1 }, { rir: 2 })).toBe(true);
    expect(isHardPair({ rir: 0, failure: true }, { rir: 2 })).toBe(true);
    expect(isHardPair({ rir: 1 }, { rir: 1 })).toBe(false);
    expect(isHardPair({ rir: 2 }, { rir: 3 })).toBe(false);
    expect(fatigueFactor([{ rir: 1 }, { rir: 2 }, { rir: 2 }], 0, 2, FATIGUE_PER_SET)).toBeCloseTo((1 - FATIGUE_PER_SET - HARD_SET_EXTRA) * (1 - FATIGUE_PER_SET), 9);
    expect(fatigueFactor([{ rir: 2 }, { rir: 2 }, { rir: 2 }], 0, 2, FATIGUE_PER_SET)).toBeCloseTo((1 - FATIGUE_PER_SET) ** 2, 9);
  });

  it('squat: de terugsets na de topset van 82,5 kg komen op 67,5 en 65 in plaats van 72,5 en 70', () => {
    const [squat] = planWorkout([squatSlot], ctx());
    expect(weights(squat)).toEqual([82.5, 67.5, 65]);
  });

  it('squat: de topset van 7 met een aangenomen 1 over zet de terugsets niet weer zwaarder', () => {
    const [squat] = planWorkout([squatSlot], ctx());
    const t = work(squat)[0];
    const after = tickWith(squat, t.id, { reps: 7 });
    // Set 2 blijft 67,5 (met de herhalingen die Forge nu verwacht, binnen 7 tot 9), set 3 blijft 65.
    expect(weights(after)).toEqual([82.5, 67.5, 65]);
    expect(work(after)[1].reps!).toBeGreaterThanOrEqual(7);
    expect(work(after)[1].reps!).toBeLessThanOrEqual(9);
  });

  it('deadlift: na de topset van 10 tot falen komen de terugsets op 95, 92,5 en 90, wat werkte', () => {
    const [dl] = planWorkout([deadliftSlot], ctx());
    expect(work(dl)[0].weightKg).toBe(102.5);
    const after = tickWith(dl, work(dl)[0].id, { reps: 10 });
    expect(weights(after)).toEqual([102.5, 95, 92.5, 90]);
    expect(work(after).slice(1).every((r) => r.reps === 7)).toBe(true);
  });

  it('deadlift: haal je in de topset wat gevraagd was, dan blijven de lichtere terugsets van het voorschrift staan', () => {
    const [dl] = planWorkout([deadliftSlot], ctx());
    const before = weights(dl);
    const after = tickWith(dl, work(dl)[0].id, {});
    expect(weights(after)).toEqual(before);
  });

  it('deadlift: de volgende training na 3 november, na een topset even sterk als toen, is niet duidelijk lichter dan wat werkte', () => {
    const third = log('d3', '2026-11-03', [['deadlift', 'Deadlift (Barbell)', sets([[10, 102.5, 0], [7, 95, 2], [7, 92.5, 2], [7, 90, 2]])]]);
    const [dl] = planWorkout([deadliftSlot], ctx({ logs: [...history(), third], date: '2026-11-10' }));
    const first = work(dl)[0];
    // De topset gaat omhoog. Vooraf rekent Forge met de gladgestreken kracht (een goede dag telt half),
    // dus de terugsets staan eerst lager; de eerste blijft binnen één stap van wat werkte.
    expect(first.weightKg!).toBeGreaterThan(102.5);
    expect(work(dl)[1].weightKg!).toBeGreaterThanOrEqual(92.5);
    // Na een topset die even sterk is als op 3 november (9 tot falen bij 105 kg) volgen de terugsets
    // je kracht van die dag: elk hooguit één stap (2,5 kg) onder wat werkte.
    const after = tickWith(dl, first.id, { reps: 9 });
    const w = weights(after) as number[];
    [95, 92.5, 90].forEach((kg, i) => expect(w[i + 1]).toBeGreaterThanOrEqual(kg - 2.5));
    expect(w[1]).toBe(95);
  });
});

describe('de extra daling leren uit je eigen sets', () => {
  const squat = { exercise: undefined };
  const session = (date: string, drop: number): SessionInput => {
    // Topset 100 x 5 met 1 over (kracht 120), daarna 2 terugsets met 2 over die `drop` lager uitkomen.
    const s2 = 120 * (1 - drop);
    return { date, sets: sets([[5, 100, 1], [8, Math.round((s2 / (1 + 10 / 30)) * 100) / 100, 2], [8, Math.round(((s2 * 0.97) / (1 + 10 / 30)) * 100) / 100, 2]], false) };
  };

  it('zonder paren na een topset is het 6%', () => {
    expect(learnAfterHard([], squat, false, FATIGUE_PER_SET)).toEqual({ extra: HARD_SET_EXTRA, pairs: 0 });
  });

  it('een grote daling na de topset leert een grotere extra, en telt niet mee voor de gewone daling per set', () => {
    const many = Array.from({ length: 12 }, (_, i) => session(`2026-09-${String(i + 1).padStart(2, '0')}`, 0.15));
    const learned = learnAfterHard(many, squat, false, FATIGUE_PER_SET);
    expect(learned.pairs).toBe(12);
    expect(learned.extra).toBeGreaterThan(0.08);
    // De gewone daling per set ziet alleen de paren tussen terugsets (3%).
    expect(learnFatigue(many, squat, false).perSet).toBeCloseTo(FATIGUE_PER_SET, 2);
  });

  it('een aangenomen RIR leert niets', () => {
    const assumed = [{ date: '2026-09-01', sets: sets([[5, 100, 1], [8, 70, 2]]) }];
    expect(learnAfterHard(assumed, squat, false, FATIGUE_PER_SET).pairs).toBe(0);
  });
});

describe('opwarmen voor een zware topset', () => {
  const warm = (e: WorkoutExercise) => e.rows.filter((r) => r.kind === 'warmup');

  it('de deadlift na de squat krijgt drie opwarmstappen in plaats van één voelset', () => {
    const [squat, dl] = planWorkout([squatSlot, deadliftSlot], ctx());
    expect(warm(squat).length).toBeGreaterThanOrEqual(3);
    const w = warm(dl);
    expect(w).toHaveLength(3);
    // De lege stang, dan ongeveer 55% en 75% van de topset, oplopend en onder de topset.
    expect(w[0].weightKg).toBe(20);
    expect(w[1].weightKg!).toBeGreaterThan(w[0].weightKg!);
    expect(w[2].weightKg!).toBeGreaterThan(w[1].weightKg!);
    expect(w[2].weightKg!).toBeLessThan(102.5);
    expect(w[2].weightKg!).toBeGreaterThanOrEqual(75);
    // Warme spieren: minder herhalingen dan een koude opbouw.
    expect(w.map((r) => r.reps)).toEqual([5, 3, 2]);
  });

  it('koud en zonder historie: ook dan drie stappen voor een topset tot falen', () => {
    const [dl] = planWorkout([{ ...deadliftSlot, targetWeightKg: 105 }], ctx({ logs: [] }));
    expect(warm(dl).map((r) => r.weightKg)).toEqual([20, 60, 80]);
    expect(warm(dl).map((r) => r.reps)).toEqual([8, 5, 3]);
  });

  it('een gewone eerste set met 2 over na de squat houdt één voelset', () => {
    const rdl: ExercisePrescription = { id: 'rdl', exerciseName: 'Conventional Deadlift', sets: 3, reps: '7-9', priority: 'core', setTargets: [top(7, 9, 2), top(7, 9, 2), top(7, 9, 2)] };
    const [, dl] = planWorkout([squatSlot, rdl], ctx());
    expect(warm(dl)).toHaveLength(1);
  });

  it('met Opwarmen uit blijft het uit', () => {
    const off = resolveStrengthSettings({ warmup: 'off' });
    const [, dl] = planWorkout([squatSlot, deadliftSlot], ctx({ settings: off }));
    expect(warm(dl)).toHaveLength(0);
  });
});

import { describe, expect, it } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { exerciseById } from '../data/exercises';
import type { ExercisePrescription } from '../models/training';
import { demoStrengthLogs, demoWeights } from './fixtures/strengthLogs';
import { applyWeight, makeLight, makeSnap } from './forgeInput';
import {
  planExercise,
  planState,
  planStateBefore,
  planWorkout,
  previousText,
  REST_AFTER_RAMP,
  REST_AFTER_WARMUP,
  targetText,
  tickAllRows,
  tickRow,
  type PlanContext,
  type WorkoutExercise,
} from './forgeWorkout';
import { resolveStrengthSettings } from './strengthSettings';

const { templates, program } = buildDefaultProgramData();
const settings = resolveStrengthSettings(undefined);
const logs = demoStrengthLogs();
const BODY = demoWeights[0].kg;
const ctx = (over: Partial<PlanContext> = {}): PlanContext => ({ logs, templates, program, bodyKg: BODY, settings, date: '2026-10-22', modelOn: true, ...over });
const slot = (id: string, exerciseName: string, sets: number, reps: string, extra: Partial<ExercisePrescription> = {}): ExercisePrescription => ({ id, exerciseName, sets, reps, priority: 'core', ...extra });
const warmRows = (e: WorkoutExercise) => e.rows.filter((r) => r.kind === 'warmup');

describe('opwarmen in een training', () => {
  it('squat krijgt de opbouw, leg press erna hooguit één set, RDL erna één voelset', () => {
    const [squat, press, rdl] = planWorkout([slot('a', 'Barbell Back Squat', 3, '5-8'), slot('b', 'Pin-Loaded Leg Press', 3, '10-12'), slot('c', 'Barbell Romanian Deadlift', 3, '8-10')], ctx());
    expect(warmRows(squat).length).toBeGreaterThanOrEqual(2);
    expect(warmRows(press).length).toBeLessThanOrEqual(1);
    expect(warmRows(rdl)).toHaveLength(1);
    expect(warmRows(rdl)[0].target.repsLow).toBe(5);
  });

  it('bankdrukken krijgt de opbouw, roeien en pulldown erna één set, een fly niets', () => {
    const [bench, pull, fly] = planWorkout([slot('a', 'Barbell Bench Press', 3, '6-8'), slot('b', 'Seated Cable Row', 3, '10-12'), slot('c', 'Pec Deck Fly', 3, '12-15')], ctx());
    expect(warmRows(bench).length).toBeGreaterThanOrEqual(2);
    expect(warmRows(pull).length).toBeLessThanOrEqual(1);
    expect(warmRows(fly)).toHaveLength(0);
  });

  it('een beencurl krijgt nooit een opwarmset, ook niet als eerste', () => {
    const [curl] = planWorkout([slot('a', 'Seated Hamstring Curl', 3, '10-12', { targetWeightKg: 40 })], ctx({ logs: [] }));
    expect(warmRows(curl)).toHaveLength(0);
  });

  it('zonder historie maar met een werkgewicht: 50% voor 8 en 80% voor 3, onder het werkgewicht', () => {
    const [squat] = planWorkout([slot('a', 'Barbell Back Squat', 3, '5-8', { targetWeightKg: 100 })], ctx({ logs: [] }));
    expect(warmRows(squat).map((r) => [r.weightKg, r.reps])).toEqual([[50, 8], [80, 3]]);
    expect(squat.rows.filter((r) => r.kind === 'work')[0].weightKg).toBe(100);
  });

  it('zonder historie en zonder gewicht: lege opwarmrijen die zich vullen zodra set 1 een gewicht heeft', () => {
    const [bench] = planWorkout([slot('a', 'Barbell Bench Press', 3, '6-8')], ctx({ logs: [] }));
    const warm = warmRows(bench);
    expect(warm).toHaveLength(2);
    expect(warm.every((r) => r.weightKg === undefined && r.share !== undefined)).toBe(true);
    const e = exerciseById('bench-press');
    const first = bench.rows.find((r) => r.kind === 'work')!;
    const filled = applyWeight(bench, first.id, 80, false, makeSnap(e, settings.profile, BODY, 80), 0, makeLight(e, settings.profile));
    expect(warmRows(filled).map((r) => r.weightKg)).toEqual([40, 65]);
    // een te licht gewicht laat de lege rijen weer vallen
    const light = applyWeight(bench, first.id, 25, false, makeSnap(e, settings.profile, BODY, 25), 0, makeLight(e, settings.profile));
    expect(warmRows(light)).toHaveLength(0);
  });

  it('opwarmsets volgen het eerste werkgewicht zolang je ze niet aanraakt', () => {
    const [squat] = planWorkout([slot('a', 'Barbell Back Squat', 3, '5-8', { targetWeightKg: 100 })], ctx({ logs: [] }));
    const e = exerciseById('back-squat');
    const first = squat.rows.find((r) => r.kind === 'work')!;
    const moved = applyWeight(squat, first.id, 120, false, makeSnap(e, settings.profile, BODY, 120), 0, makeLight(e, settings.profile));
    expect(warmRows(moved).map((r) => r.weightKg)).toEqual([60, 95]);
    // een opwarmset die je zelf aanpaste blijft staan
    const w0 = warmRows(squat)[0];
    const touched = applyWeight(squat, w0.id, 45, false, makeSnap(e, settings.profile, BODY, 45));
    const after = applyWeight(touched, first.id, 120, false, makeSnap(e, settings.profile, BODY, 120), 0, makeLight(e, settings.profile));
    expect(warmRows(after)[0].weightKg).toBe(45);
    expect(warmRows(after)[1].weightKg).toBe(95);
  });

  it('een gewicht buiten het profiel: een zin op het workoutscherm en het dichtstbijzijnde gewicht', () => {
    const odd = [{ ...logs[0], id: 'odd', completedDate: '2026-10-10', strengthData: [{ exerciseId: 'incline-dumbbell-press', exerciseName: '45° Incline Dumbbell Press', sets: [9, 9, 9].map((reps) => ({ reps, weightKg: 24, rir: 2, kind: 'work' as const })) }] }];
    const [press] = planWorkout([slot('a', '45° Incline Dumbbell Press', 3, '8-10')], ctx({ logs: odd }));
    expect(press.reason).toMatch(/past niet bij je sportschool/);
    expect(press.rows.filter((r) => r.kind === 'work')[0].weightKg).toBeGreaterThan(0);
  });
});

describe('programma: de voorgevulde herhaling', () => {
  it('ligt niet boven wat het model verwacht en blijft in het bereik', () => {
    const targets = [1, 2, 3, 4].map(() => ({ repsLow: 4, repsHigh: 6, rir: 1 }));
    const [squat] = planWorkout([slot('a', 'Barbell Back Squat', 4, '4-6', { setTargets: targets })], ctx());
    for (const r of squat.rows.filter((x) => x.kind === 'work')) {
      expect(r.reps).toBeGreaterThanOrEqual(4);
      expect(r.reps).toBeLessThanOrEqual(5);
    }
  });
});

describe('rust na de opwarming', () => {
  const plan = (): WorkoutExercise[] => planWorkout([slot('a', 'Barbell Back Squat', 3, '5-8'), slot('b', 'Pin-Loaded Leg Press', 3, '10-12')], ctx());

  it('na de laatste opwarmset van een opbouw 90 seconden, niet de volle rust', () => {
    const w = plan();
    const warm = warmRows(w[0]);
    const done = tickRow(w, 'a', warm[warm.length - 1].id);
    expect(done.restSec).toBe(REST_AFTER_WARMUP);
    expect(w[0].restSec).toBeGreaterThan(REST_AFTER_WARMUP);
  });

  it('na een enkele aanloopset 60 seconden', () => {
    const w = plan();
    const warm = warmRows(w[1]);
    if (warm.length === 1) expect(tickRow(w, 'b', warm[0].id).restSec).toBe(REST_AFTER_RAMP);
  });

  it('na een werkset de volle rust', () => {
    const w = plan();
    const work = w[0].rows.find((r) => r.kind === 'work')!;
    expect(tickRow(w, 'a', work.id).restSec).toBe(w[0].restSec);
  });
});

describe('afvinken zonder gewicht', () => {
  it('een werkset zonder gewicht neemt het gewicht van de set ervoor', () => {
    const [bench] = planWorkout([slot('a', 'Barbell Bench Press', 3, '6-8')], ctx({ logs: [] }));
    const rows = bench.rows.filter((r) => r.kind === 'work');
    const withFirst = { ...bench, rows: bench.rows.map((r) => (r.id === rows[0].id ? { ...r, weightKg: 60 } : r)) };
    const out = tickRow([withFirst], 'a', rows[1].id).workout[0];
    expect(out.rows.find((r) => r.id === rows[1].id)!.weightKg).toBe(60);
    const all = tickAllRows([withFirst], 'a').workout[0];
    expect(all.rows.filter((r) => r.kind === 'work').every((r) => r.weightKg === 60)).toBe(true);
  });

  it('een gewicht bij set 1 gaat ook naar latere sets die nog leeg zijn', () => {
    const [bench] = planWorkout([slot('a', 'Barbell Bench Press', 3, '6-8')], ctx({ logs: [] }));
    const e = exerciseById('bench-press');
    const first = bench.rows.find((r) => r.kind === 'work')!;
    const out = applyWeight(bench, first.id, 60, true, makeSnap(e, settings.profile, BODY, 60), 0, makeLight(e, settings.profile));
    expect(out.rows.filter((r) => r.kind === 'work').map((r) => r.weightKg)).toEqual([60, 60, 60]);
    const off = applyWeight(bench, first.id, 60, false, makeSnap(e, settings.profile, BODY, 60), 0, makeLight(e, settings.profile));
    expect(off.rows.filter((r) => r.kind === 'work').map((r) => r.weightKg)).toEqual([60, undefined, undefined]);
  });
});

describe('ruilen', () => {
  it('begint met de spieren die de oefeningen ervoor al warm maakten', () => {
    const w = planWorkout([slot('a', 'Barbell Bench Press', 3, '6-8'), slot('b', 'Barbell Overhead Press', 3, '8-10')], ctx());
    const state = planStateBefore(ctx(), w, 'b');
    expect(state.warm.regions.has('upper')).toBe(true);
    const first = planStateBefore(ctx(), w, 'a');
    expect(first.warm.regions.size).toBe(0);
  });
});

describe('teksten bij hulp', () => {
  it('"hulp 30 kg" in plaats van "-30 kg"', () => {
    const pull = exerciseById('assisted-pull-up');
    const row = { id: 'r', kind: 'work' as const, target: { weightKg: -30, repsLow: 9, repsHigh: 11 }, done: false };
    expect(targetText(row, pull)).toBe('hulp 30 kg × 9-11');
    expect(previousText({ reps: 9, weightKg: -30 }, pull)).toBe('hulp 30 kg × 9');
    expect(targetText({ ...row, target: { weightKg: 47.5, repsLow: 8, repsHigh: 10 } }, exerciseById('bench-press'))).toBe('47,5 kg × 8-10');
  });
});

describe('opwarmen: aanvullingen uit de controle', () => {
  it('een lichter werkgewicht haalt ook ingevulde opwarmrijen weg die je niet aanraakte', () => {
    const [squat] = planWorkout([slot('a', 'Barbell Back Squat', 3, '5-8', { targetWeightKg: 100 })], ctx({ logs: [] }));
    expect(warmRows(squat).length).toBeGreaterThan(0);
    const e = exerciseById('back-squat');
    const first = squat.rows.find((r) => r.kind === 'work')!;
    const light = applyWeight(squat, first.id, 25, false, makeSnap(e, settings.profile, BODY, 25), 0, makeLight(e, settings.profile));
    expect(warmRows(light)).toHaveLength(0);
  });

  it('een opwarmrij die op 92% of meer van het werkgewicht uitkomt, valt weg', () => {
    const [squat] = planWorkout([slot('a', 'Barbell Back Squat', 3, '5-8', { targetWeightKg: 100 })], ctx({ logs: [] }));
    const first = squat.rows.find((r) => r.kind === 'work')!;
    const rows = squat.rows.map((r) => (r.kind === 'warmup' && r.id.endsWith('w1') ? { ...r, share: 0.99 } : r));
    const out = applyWeight({ ...squat, rows }, first.id, 100, false, (kg) => kg);
    expect(warmRows(out)).toHaveLength(1);
  });

  it('een geruilde oefening neemt het bereik van het sjabloon niet over', () => {
    const c = ctx();
    const s = slot('a', 'Barbell Back Squat', 3, '5-8');
    const swapped = planExercise(s, c, planState(c), exerciseById('leg-press'));
    const work = swapped.rows.filter((r) => r.kind === 'work');
    expect(work.some((r) => r.target.repsLow === 5 && r.target.repsHigh === 8)).toBe(false);
    const own = planExercise(s, c, planState(c));
    expect(own.rows.filter((r) => r.kind === 'work')[0].target.repsLow).toBeGreaterThanOrEqual(5);
  });

  it('een zware squat na een bilbrug met eigen gewicht krijgt nog de volle opbouw', () => {
    const [bridge, squat] = planWorkout([slot('a', 'Glute Bridge', 3, '12-15'), slot('b', 'Barbell Back Squat', 3, '5-8', { targetWeightKg: 100 })], ctx({ logs: [] }));
    expect(warmRows(bridge)).toHaveLength(0);
    expect(warmRows(squat).length).toBeGreaterThanOrEqual(2);
  });

  it('Per spiergroep is de standaard; Per oefening geeft elke samengestelde oefening de volle opbouw', () => {
    const slots = [slot('a', 'Barbell Back Squat', 3, '5-8', { targetWeightKg: 100 }), slot('b', 'Barbell Romanian Deadlift', 3, '8-10', { targetWeightKg: 100 })];
    const group = planWorkout(slots, ctx({ logs: [] }));
    expect(warmRows(group[1])).toHaveLength(1);
    const each = planWorkout(slots, ctx({ logs: [], settings: resolveStrengthSettings({ warmupScope: 'exercise' }) }));
    expect(warmRows(each[1]).length).toBeGreaterThanOrEqual(2);
  });
});

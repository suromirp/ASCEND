import { describe, expect, it } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { exerciseById } from '../data/exercises';
import type { ExercisePrescription, SessionLog } from '../models/training';
import { planWorkout, progress, tickAllRows, tickRow, toStrengthData, type PlanContext } from './forgeWorkout';
import { activeRow, exerciseComplete } from './forgeInput';
import { resolveStrengthSettings, strengthModelKey } from './strengthSettings';
import { leftAlone, mutedWarmup, warmAlreadyAfter, warmAlreadyLine } from './warmupLater';
import { isWorkSet } from './workSets';
import { demoStrengthLogs } from './fixtures/strengthLogs';

const squat = exerciseById('back-squat')!;
const deadlift = exerciseById('deadlift')!;
const legPress = exerciseById('leg-press')!;
const bench = exerciseById('bench-press')!;
const incline = exerciseById('incline-bench-press')!;

describe('warmAlreadyAfter (pure)', () => {
  it('eerste oefening van de training: gewone opwarmset', () => {
    expect(warmAlreadyAfter(squat, [], 'group')).toBeUndefined();
  });
  it('zelfde patroon op warme spieren: al warm, met de oefening ervoor', () => {
    expect(warmAlreadyAfter(legPress, [{ exercise: squat, name: 'Back Squat' }, { exercise: deadlift }], 'group')).toBe('Back Squat');
  });
  it('ander patroon (deadlift na squat): gewoon', () => {
    expect(warmAlreadyAfter(deadlift, [{ exercise: squat }], 'group')).toBeUndefined();
  });
  it('nieuwe spiergroep (bankdrukken na benen): gewoon', () => {
    expect(warmAlreadyAfter(bench, [{ exercise: squat }, { exercise: legPress }], 'group')).toBeUndefined();
  });
  it('een oefening ervoor zonder opwarmsets maakt niets warm', () => {
    expect(warmAlreadyAfter(legPress, [{ exercise: squat, warmed: false }], 'group')).toBeUndefined();
  });
  it('Per oefening: elke samengestelde oefening de volle opbouw, niets gedempt', () => {
    expect(warmAlreadyAfter(legPress, [{ exercise: squat }], 'exercise')).toBeUndefined();
    expect(warmAlreadyAfter(incline, [{ exercise: bench }], 'exercise')).toBeUndefined();
    expect(warmAlreadyAfter(incline, [{ exercise: bench }], 'group')).toBe(bench.name);
  });
  it('de zin: het feit eerst, de stoel alleen bij een toestel', () => {
    expect(warmAlreadyLine(legPress, 'Back Squat')).toBe('Je benen zijn warm van de Back Squat. Twijfel je over de stoel of het gewicht, doe hem dan.');
    expect(warmAlreadyLine(incline, 'Bench Press')).toBe('Je bovenlichaam is warm van de Bench Press. Twijfel je over het gewicht, doe hem dan.');
    expect(warmAlreadyLine(legPress, 'x')).not.toMatch(/[–—]/);
  });
});

const { templates, program } = buildDefaultProgramData();
const settings = resolveStrengthSettings(undefined);
const ctx = (over: Partial<PlanContext> = {}): PlanContext => ({ logs: [], templates, program, bodyKg: 80, settings, date: '2026-11-14', modelOn: true, ...over });
const slot = (id: string, exerciseName: string, kg: number): ExercisePrescription => ({ id, exerciseName, sets: 3, reps: '6-8', priority: 'core', targetWeightKg: kg });
const legDay = [slot('a', 'Back Squat', 100), slot('b', 'Deadlift', 120), slot('c', 'Leg Press', 140)];

describe('Forge: opwarmset later in de training', () => {
  it('squat en deadlift gewoon, de leg press gedempt met de zin', () => {
    const w = planWorkout(legDay, ctx());
    const [sq, dl, lp] = w;
    expect(sq.rows.some((r) => r.kind === 'warmup')).toBe(true);
    expect(sq.warmFrom).toBeUndefined();
    expect(sq.rows.some(mutedWarmup)).toBe(false);
    expect(dl.rows.some((r) => r.kind === 'warmup')).toBe(true);
    expect(dl.warmFrom).toBeUndefined();
    const lpWarm = lp.rows.filter((r) => r.kind === 'warmup');
    expect(lpWarm.length).toBe(1);
    expect(lpWarm.every(mutedWarmup)).toBe(true);
    expect(lp.warmFrom).toBe(sq.name);
    expect(warmAlreadyLine(legPress, lp.warmFrom!)).toBe(`Je benen zijn warm van de ${sq.name}. Twijfel je over de stoel of het gewicht, doe hem dan.`);
    // Werksets worden nooit gedempt.
    expect(lp.rows.filter((r) => r.kind === 'work').some((r) => r.warmAlready)).toBe(false);
  });

  it('een nieuwe spiergroep: gewone opwarmset zonder zin', () => {
    const w = planWorkout([slot('a', 'Back Squat', 100), slot('b', 'Bench Press', 80)], ctx());
    expect(w[1].rows.some((r) => r.kind === 'warmup')).toBe(true);
    expect(w[1].warmFrom).toBeUndefined();
    expect(w[1].rows.some(mutedWarmup)).toBe(false);
  });

  it('instelling uit: alles zoals altijd', () => {
    const w = planWorkout(legDay, ctx({ settings: { ...settings, warmupMuted: false } }));
    expect(w[2].warmFrom).toBeUndefined();
    expect(w[2].rows.some((r) => r.warmAlready)).toBe(false);
    // Dezelfde rijen en gewichten: dempen verandert niets aan het voorschrift.
    const on = planWorkout(legDay, ctx());
    expect(w.map((e) => e.rows.map((r) => [r.kind, r.weightKg, r.reps]))).toEqual(on.map((e) => e.rows.map((r) => [r.kind, r.weightKg, r.reps])));
  });

  it('Per oefening: de leg press krijgt de volle opbouw, niet gedempt', () => {
    const w = planWorkout(legDay, ctx({ settings: { ...settings, warmupScope: 'exercise' } }));
    expect(w[2].rows.filter((r) => r.kind === 'warmup').length).toBeGreaterThan(1);
    expect(w[2].warmFrom).toBeUndefined();
    expect(w[2].rows.some(mutedWarmup)).toBe(false);
  });

  it('laten liggen telt niet als gemist en niet mee in de telling', () => {
    let w = planWorkout(legDay, ctx());
    const total = progress(w).total;
    expect(total).toBe(9);
    // Alle sets afvinken: de gedempte opwarmset blijft open, de oefening is af, de rest start niet na de laatste set.
    w = tickAllRows(w, 'a').workout;
    w = tickAllRows(w, 'b').workout;
    const res = tickAllRows(w, 'c');
    w = res.workout;
    const lp = w[2];
    expect(lp.rows.find((r) => r.kind === 'warmup')!.done).toBe(false);
    expect(exerciseComplete(lp)).toBe(true);
    expect(res.restSec).toBeUndefined();
    expect(progress(w)).toEqual({ done: total, total });
    expect(lp.rows.every(leftAlone)).toBe(true);
    // Niets meer te doen: de cursor gaat niet terug naar de opwarmset die je liet liggen.
    expect(activeRow(w)).toBeUndefined();
    // In het log: de werksets, niet de opwarmset die je liet liggen.
    const data = toStrengthData(w)!;
    const lpLog = data.find((d) => d.exerciseName === lp.name)!;
    expect(lpLog.sets.every(isWorkSet)).toBe(true);
    expect(lpLog.sets).toHaveLength(3);
    // Nog eens Alle sets afvinken haalt de vinkjes weg, de opwarmset blijft zoals hij was.
    const back = tickAllRows(w, 'c').workout[2];
    expect(back.rows.every((r) => !r.done)).toBe(true);
  });

  it('een gedempte opwarmset die je toch afvinkt telt als gedaan, niet als werkset', () => {
    let w = planWorkout(legDay, ctx());
    const warm = w[2].rows.find((r) => r.kind === 'warmup')!;
    w = tickRow(w, 'c', warm.id).workout;
    const row = w[2].rows.find((r) => r.id === warm.id)!;
    expect(row.done).toBe(true);
    expect(mutedWarmup(row)).toBe(false);
    expect(progress(w).done).toBe(0);
    const lpLog = toStrengthData(w)!.find((d) => d.exerciseName === w[2].name)!;
    expect(lpLog.sets).toHaveLength(1);
    expect(lpLog.sets[0].kind).toBe('warmup');
    expect(isWorkSet(lpLog.sets[0])).toBe(false);
    // Het log draagt geen nieuw veld: de vorm van SetLog blijft zoals hij was.
    expect(Object.keys(lpLog.sets[0])).not.toContain('warmAlready');
  });

  it('oude logs: niets herschreven, en de instelling telt de historie niet opnieuw', () => {
    const old: SessionLog[] = demoStrengthLogs();
    const frozen = JSON.stringify(old);
    const w = planWorkout(legDay, ctx({ logs: old }));
    expect(w[2].warmFrom).toBeDefined();
    expect(JSON.stringify(old)).toBe(frozen);
    expect(strengthModelKey({ warmupMuted: false })).toBe(strengthModelKey({}));
  });
});

import { describe, expect, it } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { exerciseById } from '../data/exercises';
import type { ExercisePrescription, SessionLog } from '../models/training';
import { planWorkout, progress, tickAllRows, tickRow, toStrengthData, type PlanContext, type WorkoutExercise } from './forgeWorkout';
import { activeRow, exerciseComplete } from './forgeInput';
import { resolveStrengthSettings, strengthModelKey } from './strengthSettings';
import { allTicked, mutedWarmup, warmAlreadyAfter, warmAlreadyLine, warmNow } from './warmupLater';
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
const slot = (id: string, exerciseName: string, kg: number, extra: Partial<ExercisePrescription> = {}): ExercisePrescription => ({ id, exerciseName, sets: 3, reps: '6-8', priority: 'core', targetWeightKg: kg, ...extra });
const legDay = [slot('a', 'Back Squat', 100), slot('b', 'Deadlift', 120), slot('c', 'Leg Press', 140)];
const work = (ex: WorkoutExercise) => ex.rows.filter((r) => r.kind === 'work');
// Squat en deadlift helemaal afgevinkt, zoals in de echte volgorde.
function afterSquatAndDeadlift(): WorkoutExercise[] {
  let w = planWorkout(legDay, ctx());
  w = tickAllRows(w, 'a').workout;
  return tickAllRows(w, 'b').workout;
}
const muted = (w: WorkoutExercise[], i: number) => w[i].rows.filter((r) => mutedWarmup(r, warmNow(w, w[i])));

describe('Forge: opwarmset later in de training', () => {
  it('gepland: squat en deadlift gewoon; de leg press krijgt de bron met naam en plek', () => {
    const [sq, dl, lp] = planWorkout(legDay, ctx());
    expect(sq.rows.some((r) => r.kind === 'warmup')).toBe(true);
    expect(sq.warmFrom).toBeUndefined();
    expect(dl.rows.some((r) => r.kind === 'warmup')).toBe(true);
    expect(dl.warmFrom).toBeUndefined();
    expect(lp.rows.filter((r) => r.kind === 'warmup')).toHaveLength(1);
    // De naam zoals op het scherm (WorkoutExercise.name), niet de alias uit het sjabloon.
    expect(lp.warmFrom).toBe(sq.name);
    expect(lp.warmFromSlot).toBe('a');
    expect(work(lp).some((r) => r.warmAlready)).toBe(false);
  });

  it('squat afgevinkt: de leg press gedempt, met de zin', () => {
    const w = afterSquatAndDeadlift();
    expect(warmNow(w, w[2])).toBe(true);
    expect(muted(w, 2)).toHaveLength(1);
    expect(warmAlreadyLine(legPress, w[2].warmFrom!)).toBe(`Je benen zijn warm van de ${w[0].name}. Twijfel je over de stoel of het gewicht, doe hem dan.`);
  });

  it('leg press eerst (squat nog niet afgevinkt): gewone opwarmset, geen zin, en de cursor gaat er gewoon heen', () => {
    const w = planWorkout(legDay, ctx());
    expect(warmNow(w, w[2])).toBe(false);
    expect(muted(w, 2)).toHaveLength(0);
    // Alle sets afvinken bij de leg press vinkt ook de opwarmset af: hij is gewoon.
    const lp = tickAllRows(w, 'c').workout[2];
    expect(lp.rows.every((r) => r.done)).toBe(true);
  });

  it('één afgevinkte set van de bron is genoeg', () => {
    let w = planWorkout(legDay, ctx());
    w = tickRow(w, 'a', work(w[0])[0].id).workout;
    expect(warmNow(w, w[2])).toBe(true);
  });

  it('bron geruild (squat voor Walking Lunge): gewoon, ook met afgevinkte sets', () => {
    const w = afterSquatAndDeadlift();
    const swapped = w.map((e, i) => (i === 0 ? { ...e, exerciseId: 'walking-lunge', name: 'Walking Lunge', swappedFrom: e.name } : e));
    expect(warmNow(swapped, swapped[2])).toBe(false);
    expect(muted(swapped, 2)).toHaveLength(0);
    // Een bron die er niet meer is ook.
    expect(warmNow(w.slice(1), w[2])).toBe(false);
  });

  it('een concept van voor warmFromSlot is gewoon', () => {
    const w = afterSquatAndDeadlift();
    const { warmFromSlot: _s, ...old } = w[2];
    void _s;
    expect(warmNow(w, old)).toBe(false);
  });

  it('een nieuwe spiergroep: gewone opwarmset zonder zin', () => {
    const w = planWorkout([slot('a', 'Back Squat', 100), slot('b', 'Bench Press', 80)], ctx());
    expect(w[1].rows.some((r) => r.kind === 'warmup')).toBe(true);
    expect(w[1].warmFrom).toBeUndefined();
  });

  it('een zware topset (1 over of minder) krijgt zijn stappen, nooit gedempt', () => {
    const w = planWorkout([slot('a', 'Back Squat', 100), slot('c', 'Leg Press', 140, { rpe: 9 })], ctx());
    expect(w[1].rows.some((r) => r.kind === 'warmup')).toBe(true);
    expect(w[1].warmFrom).toBeUndefined();
    expect(w[1].rows.some((r) => r.warmAlready)).toBe(false);
  });

  it('instelling uit: alles zoals altijd, met dezelfde rijen en gewichten', () => {
    const off = planWorkout(legDay, ctx({ settings: { ...settings, warmupMuted: false } }));
    expect(off[2].warmFrom).toBeUndefined();
    expect(off[2].rows.some((r) => r.warmAlready)).toBe(false);
    const on = planWorkout(legDay, ctx());
    expect(off.map((e) => e.rows.map((r) => [r.kind, r.weightKg, r.reps]))).toEqual(on.map((e) => e.rows.map((r) => [r.kind, r.weightKg, r.reps])));
  });

  it('Per oefening: volle opbouw, niet gedempt', () => {
    const per = { ...settings, warmupScope: 'exercise' as const };
    const w = planWorkout(legDay, ctx({ settings: per }));
    expect(w[2].rows.filter((r) => r.kind === 'warmup').length).toBeGreaterThan(1);
    expect(w[2].warmFrom).toBeUndefined();
    // De regel in Instellingen: settingsSummary.test.ts.
  });

  it('laten liggen telt niet als gemist en niet mee in de telling', () => {
    let w = afterSquatAndDeadlift();
    const total = progress(w).total;
    expect(total).toBe(9);
    const res = tickAllRows(w, 'c');
    w = res.workout;
    const lp = w[2];
    expect(lp.rows.find((r) => r.kind === 'warmup')!.done).toBe(false);
    expect(exerciseComplete(lp)).toBe(true);
    expect(allTicked(w, lp)).toBe(true);
    expect(res.restSec).toBeUndefined();
    expect(progress(w)).toEqual({ done: total, total });
    expect(activeRow(w)).toBeUndefined();
    const lpLog = toStrengthData(w)!.find((d) => d.exerciseName === lp.name)!;
    expect(lpLog.sets.every(isWorkSet)).toBe(true);
    expect(lpLog.sets).toHaveLength(3);
    // Nog eens Alle sets afvinken haalt de vinkjes weg; de opwarmset blijft zoals hij was.
    expect(tickAllRows(w, 'c').workout[2].rows.every((r) => !r.done)).toBe(true);
  });

  it('allTicked: iets afgevinkt en alles af, een gedempte opwarmset mag liggen', () => {
    const w = afterSquatAndDeadlift();
    expect(allTicked(w, w[2])).toBe(false);
    expect(allTicked(w, w[0])).toBe(true);
    // Zonder gedaan bron telt de opwarmset gewoon mee.
    const fresh = planWorkout(legDay, ctx());
    let w2 = tickAllRows(fresh, 'c').workout;
    w2 = tickRow(w2, 'c', w2[2].rows.find((r) => r.kind === 'warmup')!.id).workout;
    expect(allTicked(w2, w2[2])).toBe(false);
  });

  it('rust: na de laatste werkset van de training geen rust door een gedempte opwarmset die nog open staat', () => {
    let w = afterSquatAndDeadlift();
    const sets = work(w[2]);
    for (const r of sets.slice(0, -1)) w = tickRow(w, 'c', r.id).workout;
    const last = tickRow(w, 'c', sets.at(-1)!.id);
    expect(last.restSec).toBeUndefined();
    // Een eerdere werkset krijgt gewoon rust.
    const early = tickRow(afterSquatAndDeadlift(), 'c', sets[0].id);
    expect(early.restSec).toBeGreaterThan(0);
  });

  it('na een gedane set springt de actieve rij niet naar een gedempte opwarmset; hervatten doet hetzelfde', () => {
    const w = afterSquatAndDeadlift();
    const lastDl = work(w[1]).at(-1)!;
    expect(activeRow(w, { slot: 'b', rowId: lastDl.id })).toEqual({ slot: 'c', rowId: work(w[2])[0].id });
    expect(activeRow(w)).toEqual({ slot: 'c', rowId: work(w[2])[0].id });
    // Niet gedempt (bron niet gedaan): de opwarmset is gewoon de volgende.
    const fresh = planWorkout(legDay, ctx());
    expect(activeRow(fresh, { slot: 'b', rowId: work(fresh[1]).at(-1)!.id })).toEqual({ slot: 'c', rowId: fresh[2].rows[0].id });
  });

  it('een gedempte opwarmset die je toch afvinkt telt als gedaan, niet als werkset', () => {
    let w = afterSquatAndDeadlift();
    const warm = w[2].rows.find((r) => r.kind === 'warmup')!;
    const before = progress(w).done;
    w = tickRow(w, 'c', warm.id).workout;
    const row = w[2].rows.find((r) => r.id === warm.id)!;
    expect(row.done).toBe(true);
    expect(mutedWarmup(row, warmNow(w, w[2]))).toBe(false);
    expect(progress(w).done).toBe(before);
    const lpLog = toStrengthData(w)!.find((d) => d.exerciseName === w[2].name)!;
    expect(lpLog.sets).toHaveLength(1);
    expect(lpLog.sets[0].kind).toBe('warmup');
    expect(isWorkSet(lpLog.sets[0])).toBe(false);
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

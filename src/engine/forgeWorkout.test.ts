import { describe, expect, it } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { exerciseById } from '../data/exercises';
import type { ExercisePrescription } from '../models/training';
import { demoStrengthLogs, demoWeights } from './fixtures/strengthLogs';
import {
  addRow,
  estimatedRest,
  formatClock,
  hardestLegRir,
  legDayLine,
  nextLoad,
  parseReps,
  planWorkout,
  plateList,
  plateLoad,
  plateSteps,
  previousFor,
  previousText,
  progress,
  removeLastRow,
  restFor,
  swapOptions,
  targetText,
  tickRow,
  toStrengthData,
  updateRow,
  type PlanContext,
  type WorkoutExercise,
} from './forgeWorkout';
import { resolveStrengthSettings } from './strengthSettings';
import { isWorkSet } from './workSets';

const { templates, program } = buildDefaultProgramData();
const settings = resolveStrengthSettings(undefined);
const profile = settings.profile;
const logs = demoStrengthLogs();
const BODY = demoWeights[0].kg;

const ctx = (over: Partial<PlanContext> = {}): PlanContext => ({ logs, templates, program, bodyKg: BODY, settings, date: '2026-10-22', modelOn: true, ...over });
const slot = (id: string, exerciseName: string, sets: number, reps: string, extra: Partial<ExercisePrescription> = {}): ExercisePrescription => ({ id, exerciseName, sets, reps, priority: 'core', ...extra });

describe('parseReps', () => {
  it('leest bereiken, één getal, per been en tijd', () => {
    expect(parseReps('6-8')).toEqual({ repsLow: 6, repsHigh: 8 });
    expect(parseReps('10 per been')).toEqual({ repsLow: 10, repsHigh: 10 });
    expect(parseReps('8-10 per been')).toEqual({ repsLow: 8, repsHigh: 10 });
    expect(parseReps('11 tot 13')).toEqual({ repsLow: 11, repsHigh: 13 });
    expect(parseReps('45s')).toEqual({ repsLow: 45, repsHigh: 45, timedSec: 45 });
    expect(parseReps('geen')).toBeUndefined();
  });
});

describe('rusttijd', () => {
  it('zwaarder en samengesteld langer, klein korter', () => {
    expect(estimatedRest(exerciseById('back-squat'))).toBe(180);
    expect(estimatedRest(exerciseById('leg-press'), 10)).toBe(120);
    expect(estimatedRest(exerciseById('leg-press'), 6)).toBe(150);
    expect(estimatedRest(exerciseById('lateral-raise'))).toBe(90);
    expect(estimatedRest(undefined, 12)).toBe(90);
    expect(estimatedRest(undefined, 6)).toBe(120);
  });
  it('je eigen rusttijd per oefening wint', () => {
    expect(restFor('back-squat', exerciseById('back-squat'), 5, { 'back-squat': 240 })).toBe(240);
  });
  it('schrijft een klok', () => {
    expect(formatClock(150)).toBe('2:30');
    expect(formatClock(59)).toBe('0:59');
    expect(formatClock(-3)).toBe('0:00');
  });
});

describe('planWorkout', () => {
  it('met geschiedenis: opwarmsets uit Forge, daarna de werksets met het voorschrift en een reden', () => {
    const [squat] = planWorkout([slot('ex8', 'Barbell Back Squat', 4, '5-8')], ctx());
    expect(squat.exerciseId).toBe('back-squat');
    expect(squat.name).toBe('Barbell Back Squat');
    expect(squat.reason).toBeTruthy();
    const warm = squat.rows.filter((r) => r.kind === 'warmup');
    const work = squat.rows.filter((r) => r.kind === 'work');
    expect(warm.length).toBeGreaterThan(0);
    expect(work).toHaveLength(4);
    // Alles staat al ingevuld: aftikken is genoeg.
    for (const r of squat.rows) {
      expect(r.weightKg).toBeDefined();
      expect(r.reps).toBeGreaterThan(0);
      expect(r.done).toBe(false);
    }
    expect(work[0].rir).toBe(work[0].target.rir);
    // De opwarmsets liggen onder het eerste werkgewicht.
    expect(Math.max(...warm.map((r) => r.weightKg!))).toBeLessThan(work[0].weightKg!);
    expect(squat.previous?.length).toBeGreaterThan(0);
    expect(squat.restSec).toBe(180);
  });

  it('zonder geschiedenis: het sjabloon, met 2 over, geen opwarmsets', () => {
    const [ex] = planWorkout([slot('ex5', 'Lateral raises', 3, '12-15')], ctx());
    expect(ex.rows).toHaveLength(3);
    expect(ex.rows.every((r) => r.kind === 'work' && r.target.repsLow === 12 && r.target.repsHigh === 15 && r.rir === 2 && r.reps === 14)).toBe(true);
    expect(ex.reason).toBeUndefined();
  });

  it('met Forge uit: ook bij geschiedenis alleen het sjabloon, wel de vorige keer', () => {
    const [squat] = planWorkout([slot('ex8', 'Barbell Back Squat', 3, '5-8')], ctx({ modelOn: false }));
    expect(squat.reason).toBeUndefined();
    expect(squat.rows.every((r) => r.kind === 'work')).toBe(true);
    expect(squat.rows[0].weightKg).toBeGreaterThan(0);
    expect(squat.previous?.length).toBeGreaterThan(0);
  });

  it('een tijdsoefening krijgt rijen zonder kg en herhalingen', () => {
    const [core] = planWorkout([slot('ex13', 'Core', 3, '45s')], ctx());
    expect(core.timed).toBe(true);
    expect(targetText(core.rows[0])).toBe('45 sec');
  });

  it('een RPE in het sjabloon wordt herhalingen over', () => {
    const [ex] = planWorkout([slot('x', 'Onbekende oefening', 2, '8', { rpe: 8 })], ctx());
    expect(ex.known).toBe(false);
    expect(ex.rows[0].rir).toBe(2);
    expect(ex.exerciseId).toBe('x');
  });
});

describe('afvinken en de rusttimer', () => {
  const plan = (): WorkoutExercise[] => planWorkout([slot('ex8', 'Barbell Back Squat', 3, '5-8'), slot('ex5', 'Lateral raises', 1, '12-15')], ctx());

  it('na een opwarmset die niet de laatste is geen rust, na de laatste opwarmset wel', () => {
    const w = plan();
    const warm = w[0].rows.filter((r) => r.kind === 'warmup');
    expect(warm.length).toBeGreaterThanOrEqual(2);
    const first = tickRow(w, 'ex8', warm[0].id);
    expect(first.restSec).toBeUndefined();
    const last = tickRow(first.workout, 'ex8', warm[warm.length - 1].id);
    expect(last.restSec).toBe(180);
  });

  it('na een werkset rust, uitvinken start niets', () => {
    const w = plan();
    const row = w[0].rows.find((r) => r.kind === 'work')!;
    const on = tickRow(w, 'ex8', row.id);
    expect(on.restSec).toBe(180);
    expect(on.workout[0].rows.find((r) => r.id === row.id)!.done).toBe(true);
    const off = tickRow(on.workout, 'ex8', row.id);
    expect(off.restSec).toBeUndefined();
  });

  it('na de allerlaatste set van de training geen rust', () => {
    let w = plan();
    for (const ex of w) for (const r of ex.rows.slice(0, -1)) w = tickRow(w, ex.slot, r.id).workout;
    w = tickRow(w, 'ex8', w[0].rows.at(-1)!.id).workout;
    const last = tickRow(w, 'ex5', w[1].rows.at(-1)!.id);
    expect(last.restSec).toBeUndefined();
  });

  it('afvinken vult lege velden met het voorschrift', () => {
    const w = plan();
    const row = w[1].rows[0];
    const cleared = w.map((e) => (e.slot === 'ex5' ? updateRow(e, row.id, { reps: undefined, rir: undefined }) : e));
    const r = tickRow(cleared, 'ex5', row.id).workout[1].rows[0];
    expect(r.reps).toBe(14);
    expect(r.rir).toBe(2);
  });

  it('voortgang telt de werksets', () => {
    let w = plan();
    expect(progress(w)).toEqual({ done: 0, total: 4 });
    w = tickRow(w, 'ex5', w[1].rows[0].id).workout;
    w = tickRow(w, 'ex8', w[0].rows[0].id).workout; // een opwarmset telt niet
    expect(progress(w)).toEqual({ done: 1, total: 4 });
  });
});

describe('sets toevoegen en weghalen', () => {
  const [ex] = planWorkout([slot('ex8', 'Barbell Back Squat', 3, '5-8')], ctx());
  it('een werkset komt achteraan als kopie van de laatste', () => {
    const more = addRow(ex, 'work');
    expect(more.rows).toHaveLength(ex.rows.length + 1);
    const added = more.rows.at(-1)!;
    expect(added.kind).toBe('work');
    expect(added.weightKg).toBe(ex.rows.at(-1)!.weightKg);
    expect(added.done).toBe(false);
  });
  it('een opwarmset komt voor de werksets', () => {
    const more = addRow(ex, 'warmup');
    const firstWork = more.rows.findIndex((r) => r.kind === 'work');
    expect(more.rows[firstWork - 1].kind).toBe('warmup');
    expect(more.rows.filter((r) => r.kind === 'warmup')).toHaveLength(ex.rows.filter((r) => r.kind === 'warmup').length + 1);
  });
  it('weghalen neemt de laatste set die nog niet gedaan is', () => {
    const lastId = ex.rows.at(-1)!.id;
    const ticked = { ...ex, rows: ex.rows.map((r) => (r.id === lastId ? { ...r, done: true } : r)) };
    const less = removeLastRow(ticked);
    expect(less.rows.some((r) => r.id === lastId)).toBe(true);
    expect(less.rows).toHaveLength(ex.rows.length - 1);
  });
});

describe('opslaan', () => {
  it('alleen afgevinkte rijen, met soort, kg, herhalingen en RIR', () => {
    let w = planWorkout([slot('ex8', 'Barbell Back Squat', 2, '5-8'), slot('ex13', 'Core', 2, '45s')], ctx());
    expect(toStrengthData(w)).toBeUndefined();
    const warm = w[0].rows.find((r) => r.kind === 'warmup')!;
    const work = w[0].rows.find((r) => r.kind === 'work')!;
    w = tickRow(w, 'ex8', warm.id).workout;
    w = tickRow(w, 'ex8', work.id).workout;
    w = tickRow(w, 'ex13', w[1].rows[0].id).workout;
    const data = toStrengthData(w)!;
    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({ exerciseId: 'back-squat', exerciseName: 'Barbell Back Squat' });
    expect(data[0].sets).toHaveLength(2);
    expect(data[0].sets[0]).toMatchObject({ kind: 'warmup', weightKg: warm.weightKg, reps: warm.reps });
    expect(data[0].sets[0].rir).toBeUndefined();
    expect(data[0].sets[1]).toMatchObject({ kind: 'work', weightKg: work.weightKg, reps: work.reps, rir: work.rir });
    // De opwarmset telt niet als werk (isWorkSet), de werkset wel.
    expect(data[0].sets.filter(isWorkSet)).toHaveLength(1);
    expect(hardestLegRir(w)).toBe(work.rir);
  });
});

describe('vorige keer', () => {
  it('zet de set van vorige keer op dezelfde plek', () => {
    const [ex] = planWorkout([slot('ex8', 'Barbell Back Squat', 3, '5-8')], ctx({ modelOn: false }));
    const prev = previousFor(ex, ex.rows[0]);
    expect(prev).toBeDefined();
    expect(previousText(prev)).toMatch(/kg × \d+$/);
  });
});

describe('schijven', () => {
  it('stang 20 en 13,75 per kant is 10, 2,5 en 1,25', () => {
    const load = plateLoad(47.5, exerciseById('barbell-row'), profile)!;
    expect(load.barKg).toBe(20);
    expect(load.perSide).toEqual([10, 2.5, 1.25]);
    expect(load.shortKg).toBe(0);
    expect(plateList(load.perSide)).toBe('1 × 10, 1 × 2,5, 1 × 1,25');
  });
  it('van 47,5 naar 45 gaat er per kant één 1,25 af, naar 42,5 de 2,5 af en een 1,25 op', () => {
    const row = exerciseById('barbell-row');
    const a = nextLoad(undefined, 47.5, row, profile)!;
    const b = nextLoad(a, 45, row, profile)!;
    expect(b.remove).toEqual([1.25]);
    expect(b.add).toEqual([]);
    const c = nextLoad(b, 42.5, row, profile)!;
    expect(c.remove).toEqual([2.5]);
    expect(c.add).toEqual([1.25]);
    expect(c.perSide).toEqual([10, 1.25]);
  });
  it('een stapel blijft zwaar binnen: van 22,5 naar 35 niet een 5 op een 1,25', () => {
    const row = exerciseById('barbell-row');
    const a = nextLoad(undefined, 22.5, row, profile)!;
    const b = nextLoad(a, 35, row, profile)!;
    expect(b.perSide).toEqual([5, 2.5]);
    expect(b.remove).toEqual([1.25]);
  });
  it('wat de schijven niet kunnen maken staat erbij', () => {
    const load = plateLoad(21, exerciseById('back-squat'), profile)!;
    expect(load.perSide).toEqual([]);
    expect(load.shortKg).toBe(0.5);
  });
  it('alleen voor een stang of een toestel met schijven', () => {
    expect(plateLoad(40, exerciseById('lat-pulldown'), profile)).toBeUndefined();
    expect(plateLoad(100, exerciseById('leg-press-plates'), profile)!.barKg).toBe(0);
  });
  it('per rij in volgorde, met de stang van het eerste werkgewicht', () => {
    const [ex] = planWorkout([slot('ex8', 'Barbell Back Squat', 3, '5-8')], ctx());
    const steps = plateSteps(ex, profile);
    expect(steps).toHaveLength(ex.rows.length);
    expect(steps.every((s) => s === undefined || s.barKg === steps.find(Boolean)!.barKg)).toBe(true);
  });
});

describe('ruilen', () => {
  it('zelfde spieren, de beweging eerst, nooit zichzelf', () => {
    const options = swapOptions(exerciseById('barbell-row'), profile);
    expect(options.length).toBeGreaterThan(2);
    expect(options.map((e) => e.id)).not.toContain('barbell-row');
    expect(options[0].pattern).toBe('pull_horizontal');
    for (const e of options) expect(e.primary.some((m) => ['lats', 'upper_back'].includes(m))).toBe(true);
  });
  it('zonder stang in je sportschool geen stangoefening, en niets wat al in de training zit', () => {
    const options = swapOptions(exerciseById('dumbbell-row'), { ...profile, barsKg: [] }, ['seated-cable-row']);
    expect(options.every((e) => e.resistance !== 'barbell')).toBe(true);
    expect(options.map((e) => e.id)).not.toContain('seated-cable-row');
  });
  it('een oefening die de lijst niet kent heeft geen ruilopties', () => {
    expect(swapOptions(undefined, profile)).toEqual([]);
  });
});

describe('de benen', () => {
  it('na een bergtocht zegt de regel waarvan je benen moe zijn', () => {
    expect(legDayLine('2026-10-15', { logs, templates, program, bodyKg: BODY })).toContain('bergtocht gisteren');
  });
  it('anders de beenindex in woorden', () => {
    expect(legDayLine('2026-09-17', { logs: [], templates, program, bodyKg: BODY })).toBe('Beenindex 0, fris.');
  });
});

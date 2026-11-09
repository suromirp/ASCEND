import { describe, expect, it } from 'vitest';
import { exerciseById } from '../data/exercises';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { ExercisePrescription, SessionLog, SetLog } from '../models/training';
import { suggestLighter } from './forgeAdjust';
import { applyReps, applyWeight, carryChange, mergeDraft } from './forgeInput';
import { estimateRepsAt, raiseOpen, reckonAfterTick, reckonWeight, RECKON_MAX_REPS, strengthFor, undoRaise, wentOtherwise, type ReckonContext } from './forgeReckon';
import { planWorkout, tickRow, type WorkoutExercise, type WorkoutRow } from './forgeWorkout';
import { estimateSet, expectedReps, prescribe, type SessionInput } from './strengthModel';
import { loadFromExternal } from './strengthWeights';
import { DEFAULT_PROFILE, resolveStrengthSettings } from './strengthSettings';

// Nagemaakte getallen. Bankdrukken met een stang van 20 kg en schijven vanaf 1,25 kg.
const ctx = (over: Partial<ReckonContext> = {}): ReckonContext => ({ profile: DEFAULT_PROFILE, workSets: 'descending', bodyKg: 80, maxToFailure: 20, on: true, ...over });

// Kracht 90 kg: bij 60 kg en 2 over verwacht het model 30 x (90/60 - 1) - 2 = 13 herhalingen.
const STRENGTH = 90;

function row(i: number, over: Partial<WorkoutRow> = {}): WorkoutRow {
  return { id: `r${i}`, kind: 'work', target: { weightKg: 60, repsLow: 9, repsHigh: 11, rir: 2 }, weightKg: 60, reps: 10, forgeReps: 10, done: false, ...over };
}
const bench = (rows: WorkoutRow[], over: Partial<WorkoutExercise> = {}): WorkoutExercise => ({
  slot: 's', exerciseId: 'bench-press', name: 'Bankdrukken', known: true, rows, restSec: 120, timed: false, strengthKg: STRENGTH, fatiguePerSet: 0.03, ...over,
});
const three = () => [row(0), row(1), row(2)];

// Een gewicht in set `rowId` typen zoals het scherm dat doet: applyWeight, doorvoeren, dan meerekenen.
function typeWeight(ex: WorkoutExercise, rowId: string, kg: number, c = ctx()): WorkoutExercise {
  const changed = carryChange(ex, applyWeight(ex, rowId, kg, false), rowId, 'weightKg');
  return reckonWeight(ex, changed, rowId, c);
}

describe('herhalingen schatten bij een ander gewicht', () => {
  it('gewicht omhoog geeft minder herhalingen, omlaag meer, uit dezelfde rekenregel als het voorschrift', () => {
    const ex = bench(three());
    const up = typeWeight(ex, 'r0', 70);
    const down = typeWeight(ex, 'r0', 50);
    expect(up.rows[0].reps).toBe(expectedReps(STRENGTH, 70, 2));
    expect(down.rows[0].reps).toBe(expectedReps(STRENGTH, 50, 2));
    expect(up.rows[0].reps!).toBeLessThan(10);
    expect(down.rows[0].reps!).toBeGreaterThan(10);
    expect(up.rows[0].repsEstimated).toBe(true);
  });

  it('een latere set rekent met de vermoeidheid van de sets ervoor', () => {
    const ex = bench(three());
    expect(estimateRepsAt(ex, 'r2', 60, ctx())).toBe(expectedReps(STRENGTH * 0.97 ** 2, 60, 2));
    expect(estimateRepsAt(ex, 'r2', 60, ctx({ workSets: 'equal' }))).toBe(expectedReps(STRENGTH, 60, 2));
  });

  it('herhalingen die je zelf invulde blijven staan', () => {
    const typed = applyReps(bench(three()), 'r0', 12);
    const after = typeWeight(typed, 'r0', 70);
    expect(after.rows[0].reps).toBe(12);
    expect(after.rows[0].weightKg).toBe(70);
  });

  it('een tweede gewicht schat opnieuw, ook na een eerste schatting', () => {
    const once = typeWeight(bench(three()), 'r0', 70);
    const twice = typeWeight(once, 'r0', 65);
    expect(twice.rows[0].reps).toBe(expectedReps(STRENGTH, 65, 2));
  });

  it('een gewicht dat doorschuift krijgt daar ook de geschatte herhalingen', () => {
    const after = typeWeight(bench(three()), 'r0', 70);
    expect(after.rows[1].weightKg).toBe(70);
    expect(after.rows[1].reps).toBe(expectedReps(STRENGTH * 0.97, 70, 2));
    expect(after.rows[1].edited).toBeUndefined();
    expect(after.rows[2].reps).toBe(expectedReps(STRENGTH * 0.97 ** 2, 70, 2));
  });

  it('begrensd tussen 1 en 30, naar beneden afgerond', () => {
    const light = typeWeight(bench(three()), 'r0', 20);
    expect(light.rows[0].reps).toBe(RECKON_MAX_REPS);
    const heavy = typeWeight(bench(three()), 'r0', 120);
    expect(heavy.rows[0].reps).toBe(1);
  });

  it('zonder geschatte kracht gebeurt er niets', () => {
    const ex = bench(three(), { strengthKg: undefined });
    const after = typeWeight(ex, 'r0', 70);
    expect(after.rows[0].reps).toBe(10);
    expect(strengthFor(ex, 'r0', ctx())).toBeUndefined();
  });

  it('niet bij opwarmsets', () => {
    const warm: WorkoutRow = { id: 'w0', kind: 'warmup', target: { weightKg: 30, repsLow: 8, repsHigh: 8 }, weightKg: 30, reps: 8, done: false, share: 0.5 };
    const ex = bench([warm, ...three()]);
    const after = reckonWeight(ex, applyWeight(ex, 'w0', 40, false), 'w0', ctx());
    expect(after.rows[0].reps).toBe(8);
  });
});

describe('na afvinken de volgende set bijstellen', () => {
  const tick = (ex: WorkoutExercise, rowId: string, patch: Partial<WorkoutRow>) => {
    const withValues = { ...ex, rows: ex.rows.map((r) => (r.id === rowId ? { ...r, ...patch } : r)) };
    return tickRow([withValues], ex.slot, rowId).workout[0];
  };

  it('afvinken zoals het er stond verandert niets', () => {
    const done = tick(bench(three()), 'r0', {});
    expect(wentOtherwise(done.rows[0])).toBe(false);
    expect(reckonAfterTick(done, 'r0', ctx())).toBe(done);
  });

  it('twee herhalingen meer dan gevraagd zet de volgende set hoger', () => {
    // Kracht 84: set 1 verwacht 10 bij 60 kg, set 2 (3% minder) 8, dus de onderkant 9. Je deed 12.
    const ex = bench([row(0), row(1, { reps: 9, forgeReps: 9 }), row(2, { reps: 9, forgeReps: 9 })], { strengthKg: 84 });
    const done = tick(ex, 'r0', { reps: 12 });
    expect(wentOtherwise(done.rows[0])).toBe(true);
    const after = reckonAfterTick(done, 'r0', ctx());
    const next = after.rows[1];
    const before = done.rows[1];
    expect((next.weightKg ?? 0) > (before.weightKg ?? 0) || (next.reps ?? 0) > (before.reps ?? 0)).toBe(true);
    // Binnen het bereik, en niet door jou aangepast.
    expect(next.reps!).toBeGreaterThanOrEqual(9);
    expect(next.reps!).toBeLessThanOrEqual(11);
    expect(next.edited).toBeUndefined();
    // Alleen de eerstvolgende set.
    expect(after.rows[2]).toEqual(done.rows[2]);
  });

  it('0 over terwijl 2 gevraagd zet de volgende set lager', () => {
    const done = tick(bench(three()), 'r0', { reps: 10, rir: 0, rirAssumed: false });
    const after = reckonAfterTick(done, 'r0', ctx());
    const next = after.rows[1];
    const before = done.rows[1];
    expect((next.weightKg ?? 0) < (before.weightKg ?? 0) || (next.reps ?? 0) < (before.reps ?? 0)).toBe(true);
  });

  it('kiest het lichtere gewicht net als Lichter, zodat beide hetzelfde zeggen', () => {
    // 60 x 7 met 1 over: te zwaar.
    const done = tick(bench(three()), 'r0', { reps: 7, rir: 1, rirAssumed: false });
    const after = reckonAfterTick(done, 'r0', ctx());
    const lighter = suggestLighter(done, 'r0', ctx())!;
    expect(after.rows[1].weightKg).toBe(lighter.items.find((i) => i.rowId === 'r1')!.weightKg);
    // Het voorstel Lichter gaat daarna alleen nog over de set erna.
    expect(suggestLighter(after, 'r0', ctx())?.items.map((i) => i.rowId)).toEqual(['r2']);
  });

  it('een set die je zelf aanpaste blijft staan', () => {
    const rows = three();
    rows[1] = { ...rows[1], reps: 8, edited: true };
    const done = tick(bench(rows), 'r0', { reps: 13 });
    expect(reckonAfterTick(done, 'r0', ctx())).toBe(done);
  });

  it('niet na een opwarmset', () => {
    const warm: WorkoutRow = { id: 'w0', kind: 'warmup', target: { weightKg: 30, repsLow: 8, repsHigh: 8 }, weightKg: 30, reps: 8, done: false };
    const done = tick(bench([warm, ...three()]), 'w0', { reps: 12 });
    expect(reckonAfterTick(done, 'w0', ctx())).toBe(done);
  });

  it('een geschat vak daarna rekent met de kracht van vandaag uit die set', () => {
    const done = tick(bench(three()), 'r0', { reps: 10, rir: 0, rirAssumed: false });
    const today = 60 * (1 + 10 / 30);
    expect(strengthFor(done, 'r2', ctx())).toBeCloseTo(today * 0.97 ** 2, 6);
  });
});

describe('de stap omhoog na de bovenkant van het bereik', () => {
  const work = (reps: number, weightKg: number, rir: number): SetLog => ({ reps, weightKg, rir });
  const sessions: SessionInput[] = [
    { date: '2026-09-01', sets: [work(9, 60, 2), work(9, 60, 2), work(9, 60, 2)] },
    { date: '2026-09-08', sets: [work(11, 60, 2), work(11, 60, 2), work(10, 60, 2)] },
  ];
  const input = (reckon: boolean) => ({ exercise: exerciseById('bench-press')!, sessions, date: '2026-09-15', settings: resolveStrengthSettings({ reckon }), plan: { low: 9, high: 11, rir: 2 } });

  it('haalde je de bovenkant met de gevraagde RIR, dan staat de kleinste stap zwaarder klaar, met een regel', () => {
    const on = prescribe(input(true))!;
    const off = prescribe(input(false))!;
    expect(off.sets[0].weightKg).toBe(60);
    expect(on.sets[0].weightKg).toBe(62.5);
    expect(on.raised).toEqual({ fromKg: 60, stepKg: 2.5, reps: 11, rir: 2 });
    expect(on.reason).toBe('2,5 kg erbij, je haalde vorige keer 11 met 2 over.');
    expect(off.raised).toBeUndefined();
    expect(off.reason).toBe('Zelfde gewicht als vorige keer, probeer weer 11 te halen.');
  });

  it('niet als je de bovenkant niet haalde', () => {
    const low: SessionInput[] = [sessions[0], { date: '2026-09-08', sets: [work(10, 60, 2), work(10, 60, 2), work(9, 60, 2)] }];
    const p = prescribe({ ...input(true), sessions: low })!;
    expect(p.raised).toBeUndefined();
  });

  it('Terugzetten zet de open sets terug op het gewicht van zonder de stap', () => {
    const rows = [row(0, { weightKg: 62.5, target: { weightKg: 62.5, repsLow: 9, repsHigh: 11, rir: 2 } }), row(1, { weightKg: 62.5, target: { weightKg: 62.5, repsLow: 9, repsHigh: 11, rir: 2 } }), row(2, { weightKg: 60, done: true })];
    const ex = bench(rows, { reason: '2,5 kg erbij, je haalde vorige keer 11 met 2 over.', raise: { line: '2,5 kg erbij, je haalde vorige keer 11 met 2 over.', reason: 'Zelfde gewicht als vorige keer, probeer weer 11 te halen.', back: [{ rowId: 'r0', weightKg: 60, reps: 11 }, { rowId: 'r1', weightKg: 60, reps: 10 }, { rowId: 'r2', weightKg: 57.5, reps: 10 }] } });
    expect(raiseOpen(ex)).toBe(true);
    const back = undoRaise(ex);
    expect(back.rows.map((r) => r.weightKg)).toEqual([60, 60, 60]);
    expect(back.rows[0].reps).toBe(11);
    expect(back.rows[0].target.weightKg).toBe(60);
    expect(back.reason).toBe('Zelfde gewicht als vorige keer, probeer weer 11 te halen.');
    expect(back.raise).toBeUndefined();
    expect(raiseOpen(back)).toBe(false);
  });

  it('een set die Forge na het afvinken bijstelde, zet Terugzetten niet terug', () => {
    const rows = [row(0, { done: true }), row(1, { weightKg: 62.5 })];
    const ex = bench(rows, { raise: { line: 'x', back: [{ rowId: 'r0', weightKg: 57.5, reps: 10 }, { rowId: 'r1', weightKg: 60, reps: 10 }] } });
    expect(raiseOpen(ex)).toBe(false);
    expect(undoRaise(ex).rows[1].weightKg).toBe(62.5);
  });
});

describe('instelling uit', () => {
  it('geen schatting bij een ander gewicht en geen bijstelling na afvinken', () => {
    const ex = bench(three());
    const changed = applyWeight(ex, 'r0', 70, false);
    expect(reckonWeight(ex, changed, 'r0', ctx({ on: false }))).toBe(changed);
    const done = tickRow([{ ...ex, rows: ex.rows.map((r) => (r.id === 'r0' ? { ...r, reps: 13 } : r)) }], 's', 'r0').workout[0];
    expect(reckonAfterTick(done, 'r0', ctx({ on: false }))).toBe(done);
    expect(reckonAfterTick(done, 'r0', ctx())).not.toBe(done);
  });
});

describe('de stap omhoog in een training', () => {
  const { templates, program } = buildDefaultProgramData();
  const log = (id: string, date: string, reps: number): SessionLog => ({
    id, templateId: 'tpl_upper_a', type: 'strength', completedDate: date, completedAt: `${date}T18:30:00.000Z`, variant: 'custom', durationMinutes: 50, source: 'manual',
    strengthData: [{ exerciseId: 'bench-press', exerciseName: 'Bench Press (Barbell)', sets: [{ reps, weightKg: 60, rir: 2 }, { reps, weightKg: 60, rir: 2 }, { reps, weightKg: 60, rir: 2 }] }],
  });
  const logs = [log('a', '2026-09-01', 9), log('b', '2026-09-08', 11)];
  const slot: ExercisePrescription = { id: 'bp', exerciseName: 'Bench Press (Barbell)', sets: 3, reps: '9-11', rpe: 8, priority: 'core' };
  const plan = (reckon: boolean) => planWorkout([slot], { logs, templates, program, bodyKg: 80, settings: resolveStrengthSettings({ reckon, warmup: 'off' }), date: '2026-09-15', modelOn: true })[0];

  it('staat klaar met de regel, en Terugzetten geeft de training van zonder de stap', () => {
    const on = plan(true);
    const off = plan(false);
    expect(on.raise?.line).toBe('2,5 kg erbij, je haalde vorige keer 11 met 2 over.');
    expect(on.rows.find((r) => r.kind === 'work')!.weightKg).toBe(62.5);
    expect(off.raise).toBeUndefined();
    const back = undoRaise(on);
    const work = (e: WorkoutExercise) => e.rows.filter((r) => r.kind === 'work').map((r) => [r.weightKg, r.reps]);
    expect(work(back)).toEqual(work(off));
    expect(back.reason).toBe(off.reason);
  });
});

describe('uit de review', () => {
  const tickWith = (ex: WorkoutExercise, rowId: string, patch: Partial<WorkoutRow>) =>
    tickRow([{ ...ex, rows: ex.rows.map((r) => (r.id === rowId ? { ...r, ...patch } : r)) }], ex.slot, rowId).workout[0];

  it('Terugzetten blijft na herladen: mergeDraft met een vers plan houdt het teruggezette gewicht', () => {
    const { templates, program } = buildDefaultProgramData();
    const log = (id: string, date: string, reps: number): SessionLog => ({
      id, templateId: 'tpl_upper_a', type: 'strength', completedDate: date, completedAt: `${date}T18:30:00.000Z`, variant: 'custom', durationMinutes: 50, source: 'manual',
      strengthData: [{ exerciseId: 'bench-press', exerciseName: 'Bench Press (Barbell)', sets: [{ reps, weightKg: 60, rir: 2 }, { reps, weightKg: 60, rir: 2 }, { reps, weightKg: 60, rir: 2 }] }],
    });
    const slot: ExercisePrescription = { id: 'bp', exerciseName: 'Bench Press (Barbell)', sets: 3, reps: '9-11', rpe: 8, priority: 'core' };
    const fresh = () => planWorkout([slot], { logs: [log('a', '2026-09-01', 9), log('b', '2026-09-08', 11)], templates, program, bodyKg: 80, settings: resolveStrengthSettings({ warmup: 'off' }), date: '2026-09-15', modelOn: true });
    const back = undoRaise(fresh()[0]);
    expect(back.raiseUndone).toBe(true);
    const [merged] = mergeDraft([back], fresh());
    expect(merged.rows.find((r) => r.kind === 'work')!.weightKg).toBe(60);
    expect(merged.raise).toBeUndefined();
  });

  describe('een toestel met hulp: minder hulp is zwaarder', () => {
    const pull = exerciseById('assisted-pull-up')!;
    const load = (kg: number) => loadFromExternal(pull, kg, 80)!;
    const target = { weightKg: -30, repsLow: 9, repsHigh: 11, rir: 2 };
    const r = (i: number, over: Partial<WorkoutRow> = {}): WorkoutRow => ({ id: `r${i}`, kind: 'work', target, weightKg: -30, reps: 10, forgeReps: 10, done: false, ...over });
    // De kracht waarbij -30 kg net 10 herhalingen met 2 over geeft.
    const strengthKg = load(-30) * (1 + 12 / 30);
    const assisted = () => ({ ...bench([r(0), r(1, { reps: 9, forgeReps: 9 })], { strengthKg }), exerciseId: 'assisted-pull-up', name: 'Optrekken met hulp' });

    it('na een betere set: zwaarder of meer, nooit meer hulp', () => {
      const done = tickWith(assisted(), 'r0', { reps: 14 });
      const after = reckonAfterTick(done, 'r0', ctx());
      expect(after).not.toBe(done);
      const next = after.rows[1];
      expect(load(next.weightKg!) > load(-30) || next.reps! > 9).toBe(true);
      expect(load(next.weightKg!)).toBeGreaterThanOrEqual(load(-30));
    });

    it('na een mindere set: meer hulp of minder, nooit zwaarder', () => {
      const done = tickWith(assisted(), 'r0', { reps: 10, rir: 0, rirAssumed: false });
      const after = reckonAfterTick(done, 'r0', ctx());
      expect(after).not.toBe(done);
      const next = after.rows[1];
      expect(load(next.weightKg!)).toBeLessThan(load(-30));
      expect(next.weightKg!).toBeLessThan(-30);
      expect(next.reps!).toBeGreaterThanOrEqual(9);
    });
  });

  it('een stap zwaarder alleen op een gemeten RIR (met Afvinken telt als het doel uit)', () => {
    const work = (reps: number, rirAssumed = false): SetLog => ({ reps, weightKg: 60, rir: 2, ...(rirAssumed ? { rirAssumed: true } : {}) });
    const sessions = (assumed: boolean): SessionInput[] => [
      { date: '2026-09-01', sets: [work(9), work(9), work(9)] },
      { date: '2026-09-08', sets: [work(11, assumed), work(11, assumed), work(11, assumed)] },
    ];
    const input = (assumed: boolean, assumedCounts = false) => ({ exercise: exerciseById('bench-press')!, sessions: sessions(assumed), date: '2026-09-15', settings: resolveStrengthSettings({ assumedCounts }), plan: { low: 9, high: 11, rir: 2 } });
    expect(prescribe(input(false))!.raised).toBeDefined();
    const p = prescribe(input(true))!;
    expect(p.raised).toBeUndefined();
    expect(p.reason).not.toContain('over.');
    // Aan (het advies): alle werksets haalden de bovenkant zoals gevraagd, dus wel een stap, zonder "met 2 over".
    const confirmed = prescribe(input(true, true))!;
    expect(confirmed.raised).toBeDefined();
    expect(confirmed.reason).not.toContain('over.');
  });

  it('past er geen gewicht en haal je de onderkant niet, dan blijft de volgende set staan (dumbbells, grove stap)', () => {
    // Zijwaartse heffing, 12 tot 15 met 2 over, 10 kg. Een set van 6 tot falen: 8 kg geeft er 11, 6 kg ver boven het bereik.
    const t = { weightKg: 10, repsLow: 12, repsHigh: 15, rir: 2 };
    const rows: WorkoutRow[] = [0, 1].map((i) => ({ id: `r${i}`, kind: 'work', target: t, weightKg: 10, reps: 13, forgeReps: 13, done: false }));
    const ex: WorkoutExercise = { slot: 's', exerciseId: 'lateral-raise', name: 'Zijwaartse heffing', known: true, rows, restSec: 60, timed: false, strengthKg: 16, fatiguePerSet: 0.03 };
    const done = tickWith(ex, 'r0', { reps: 6, rir: 0, rirAssumed: false });
    expect(estimateSet({ reps: 6, weightKg: 10, rir: 0, kind: 'work' }, { exercise: exerciseById('lateral-raise') })).toBeDefined();
    expect(suggestLighter(done, 'r0', ctx())).toBeUndefined();
    const after = reckonAfterTick(done, 'r0', ctx());
    expect(after).toBe(done);
    expect(after.rows[1].reps).toBe(13);
  });
});

describe('tot falen: na een zware set zakt het gewicht één stap', () => {
  it('52,5 x 7 tot falen bij een doel van 9+: de volgende set wordt 47,5 kg, niet 45 (zoals MacroFactor)', () => {
    const fail = (i: number, over: Partial<WorkoutRow> = {}): WorkoutRow => ({ id: `r${i}`, kind: 'work', target: { weightKg: 50, repsLow: 9, repsHigh: 9, rir: 0, open: true }, weightKg: 50, reps: 9, forgeReps: 9, done: false, ...over });
    const ex: WorkoutExercise = { slot: 's', exerciseId: 'barbell-row', name: 'Barbell Row', known: true, rows: [fail(0), fail(1), fail(2)], restSec: 120, timed: false, fatiguePerSet: 0.05 };
    const done = { ...ex, rows: ex.rows.map((r) => (r.id === 'r0' ? { ...r, weightKg: 52.5, reps: 7, rir: 0, done: true, edited: true } : r)) };
    const after = reckonAfterTick(done, 'r0', ctx());
    const next = after.rows[1];
    expect(next.weightKg).toBe(47.5);
    expect(next.reps).toBe(8);
  });
});

describe('tot falen op een toestel met grote stappen', () => {
  it('hulp 27 x 10 tot falen, blok in stappen van 7: set 3 springt niet naar 35 kg hulp en 13 herhalingen', () => {
    const t = { weightKg: 28, repsLow: 9, repsHigh: 9, rir: 0, open: true };
    const rows: WorkoutRow[] = [
      { id: 'r0', kind: 'work', target: { ...t, weightKg: 21 }, weightKg: 23, reps: 11, rir: 0, done: true, edited: true },
      { id: 'r1', kind: 'work', target: t, weightKg: 27, reps: 10, forgeReps: 11, rir: 0, done: true, edited: true },
      { id: 'r2', kind: 'work', target: t, weightKg: 27, reps: 8, forgeReps: 8, done: false },
      { id: 'r3', kind: 'work', target: { ...t, weightKg: 35 }, weightKg: 35, reps: 9, forgeReps: 9, done: false },
    ];
    const ex: WorkoutExercise = { slot: 's', exerciseId: 'assisted-pull-up', name: 'Pull-Up', known: true, rows, restSec: 120, timed: false, fatiguePerSet: 0.08 };
    const c = ctx({ profile: { ...DEFAULT_PROFILE, stackStepKg: 7 }, bodyKg: 86 });
    const next = reckonAfterTick(ex, 'r1', c).rows[2];
    expect(next.weightKg).toBeLessThan(35);
    expect(next.reps!).toBeLessThanOrEqual(11);
  });
});

import { describe, expect, it } from 'vitest';
import { exerciseById } from '../data/exercises';
import type { ExercisePrescription, ExerciseSetLog, SessionLog, SetLog } from '../models/training';
import {
  adjustFirstSet,
  CROSS_MAX_TOTAL,
  CROSS_PER_SET,
  CROSS_PER_SET_MAX,
  crossFatigue,
  crossHistory,
  crossLine,
  crossPoints,
  expectedHard,
  hardPlanned,
  hardSetsLogged,
  learnCross,
  muscleShare,
  normalBefore,
  setsBefore,
} from './forgeCrossFatigue';
import { planWorkout, planStateBefore, planExercise, type PlanContext, type WorkoutExercise } from './forgeWorkout';
import { strengthFor, undoRaise } from './forgeReckon';
import { capSlots } from './forgeTimeCap';
import { DEFAULT_PROFILE, resolveStrengthSettings } from './strengthSettings';
import { expectedReps } from './strengthModel';

// Vermoeidheid tussen oefeningen (besluit 2026-11-09-forge-vermoeidheid-tussen-oefeningen.md). Nagemaakte getallen.
const bench = exerciseById('bench-press')!;
const fly = exerciseById('pec-deck-fly')!;
const pushdown = exerciseById('triceps-pushdown')!;
const squat = exerciseById('back-squat')!;
const legPress = exerciseById('leg-press')!;

const set = (reps: number, weightKg: number, rir?: number, extra: Partial<SetLog> = {}): SetLog => ({ reps, weightKg, ...(rir !== undefined ? { rir } : {}), ...extra });
const entry = (exerciseId: string, exerciseName: string, sets: SetLog[]): ExerciseSetLog => ({ exerciseId, exerciseName, sets });
const log = (id: string, date: string, data: ExerciseSetLog[]): SessionLog => ({ id, templateId: 'tpl_x', type: 'strength', completedDate: date, completedAt: `${date}T18:00:00Z`, variant: 'full', durationMinutes: 60, source: 'manual', strengthData: data });
const benchSets = () => [set(8, 80, 2), set(8, 80, 2), set(7, 80, 2)];
const flySets = (rir: number | undefined = 2, extra: Partial<SetLog> = {}) => [set(12, 50, rir, extra), set(11, 50, rir, extra), set(10, 50, rir, extra)];
const DATES = ['2026-10-01', '2026-10-04', '2026-10-07', '2026-10-10'];
const TODAY = '2026-10-13';

const slot = (id: string, exerciseName: string, sets: number, reps: string, extra: Partial<ExercisePrescription> = {}): ExercisePrescription => ({ id, exerciseName, sets, reps, priority: 'core', ...extra });
const ctxOf = (logs: SessionLog[], over: Partial<PlanContext> = {}, settings = {}): PlanContext => ({ logs, templates: [], bodyKg: 80, settings: resolveStrengthSettings(settings), date: TODAY, modelOn: true, ...over });
const work = (e: WorkoutExercise) => e.rows.filter((r) => r.kind === 'work');
const plain = (e: WorkoutExercise) => e.rows.map((r) => [r.kind, r.weightKg, r.reps]);

describe('spieren en harde sets', () => {
  it('een gedeelde hoofdspier telt 1, alleen een hulpspier een half, anders niets', () => {
    expect(muscleShare(squat, legPress)).toBe(1);
    expect(muscleShare(fly, bench)).toBe(1);
    expect(muscleShare(pushdown, bench)).toBe(0.5);
    expect(muscleShare(bench, pushdown)).toBe(0);
    expect(muscleShare(undefined, bench)).toBe(0);
    expect(muscleShare(bench, { ...bench, primary: [] })).toBe(0);
  });

  it('telt een eigen RIR tot en met 3, nooit een opwarmset, en weet het niet zonder RIR', () => {
    expect(hardSetsLogged([set(5, 40, undefined, { kind: 'warmup' }), set(8, 80, 3), set(8, 80, 4), set(6, 80, 0)], true)).toBe(2);
    expect(hardSetsLogged([set(8, 80, 2), set(8, 80)], true)).toBeUndefined();
  });

  it('een afgevinkte set telt alleen als hij bevestigd is; een oud log zonder gevraagd aantal is onbekend', () => {
    const asked = { rirAssumed: true as const, repsAsked: 8, weightKgAsked: 80 };
    expect(hardSetsLogged([set(8, 80, 2, asked), set(8, 80, 2, asked)], true)).toBe(2);
    expect(hardSetsLogged([set(8, 80, 2, asked)], false)).toBeUndefined();
    expect(hardSetsLogged([set(8, 80, 2, { rirAssumed: true })], true)).toBeUndefined();
    // Minder dan gevraagd: niet bevestigd, dus onbekend.
    expect(hardSetsLogged([set(6, 80, 2, asked)], true)).toBeUndefined();
  });

  it('het voorschrift: tot falen of hoogstens 3 over telt, een houding niet', () => {
    const r = (rir?: number, extra = {}) => ({ kind: 'work', target: { ...(rir !== undefined ? { rir } : {}), ...extra } });
    expect(hardPlanned([r(2), r(3), r(4), r(undefined), r(4, { failure: true }), r(1, { timedSec: 45 }), { kind: 'warmup', target: {} }])).toBe(4);
  });

  it('setsBefore: zonder spiergegevens niets, een onbekende set op dezelfde spieren maakt het onbekend', () => {
    expect(setsBefore(bench, [{ exercise: fly, hard: 3 }, { exercise: pushdown, hard: 2 }, { exercise: squat, hard: 4 }])).toBe(4);
    expect(setsBefore(undefined, [{ exercise: fly, hard: 3 }])).toBeUndefined();
    expect(setsBefore(bench, [{ exercise: fly, hard: undefined }])).toBeUndefined();
    expect(setsBefore(bench, [{ exercise: squat, hard: undefined }])).toBe(0);
  });

  it('per log in de volgorde van het log, ook een log zonder krachtdata', () => {
    const logs = [log('a', DATES[0], [entry('pec-deck-fly', 'Pec Deck Fly', flySets()), entry('bench-press', 'Barbell Bench Press', benchSets())]), { ...log('b', DATES[1], []), strengthData: undefined }];
    const h = crossHistory(logs, true);
    expect(h.get('a')?.get('pec-deck-fly')).toBe(0);
    expect(h.get('a')?.get('bench-press')).toBe(3);
    expect(h.has('b')).toBe(false);
  });
});

describe('normaal, leren en de factor', () => {
  it('normaal is de mediaan van de laatste bekende, met minstens drie', () => {
    expect(normalBefore([3, undefined, 3])).toBeUndefined();
    expect(normalBefore([0, 3, undefined, 3, 4])).toBe(3);
    expect(normalBefore([9, 9, 9, 0, 0, 0, 0, 0, 0])).toBe(0);
  });

  it('leren: te weinig of steeds hetzelfde aantal is de startwaarde', () => {
    expect(learnCross([{ before: 0, drop: 0 }, { before: 3, drop: 0.1 }]).perSet).toBe(CROSS_PER_SET);
    expect(learnCross(Array.from({ length: 8 }, () => ({ before: 3, drop: 0.05 }))).perSet).toBe(CROSS_PER_SET);
  });

  it('leren: de helling, naar 2% getrokken en tussen 0 en 5%', () => {
    const pts = (slope: number) => Array.from({ length: 8 }, (_, i) => ({ before: i % 2 === 0 ? 0 : 4, drop: 0.01 + (i % 2 === 0 ? 0 : 4 * slope) }));
    const mild = learnCross(pts(0.03));
    expect(mild.perSet).toBeCloseTo((8 * 0.03 + 8 * CROSS_PER_SET) / 16, 9);
    expect(learnCross(pts(0.2)).perSet).toBe(CROSS_PER_SET_MAX);
    expect(learnCross(pts(-0.1)).perSet).toBe(0);
  });

  it('meetpunten uit je eigen trainingen: alleen een eerste set met een eigen RIR, nooit een afgevinkte', () => {
    const days = Array.from({ length: 10 }, (_, i) => `2026-09-${String(i + 1).padStart(2, '0')}`);
    // Om en om vooraan (0 ervoor) en na 2 harde sets: dan 3 herhalingen minder op 80 kg, ruim 3% per set.
    const sessions = days.map((date, i) => ({ date, before: i % 2 === 0 ? 0 : 2, sets: [set(i % 2 === 0 ? 8 : 5, 80, 2), set(7, 80, 2)] }));
    const pts = crossPoints(sessions, { exercise: bench, maxToFailure: 20 });
    expect(pts).toHaveLength(9);
    const learned = learnCross(pts);
    expect(learned.trainings).toBe(9);
    expect(learned.perSet).toBeGreaterThan(CROSS_PER_SET);
    expect(learned.perSet).toBeLessThanOrEqual(CROSS_PER_SET_MAX);
    const assumed = sessions.map((x) => ({ ...x, sets: [{ ...x.sets[0], rirAssumed: true as const }, x.sets[1]] }));
    expect(crossPoints(assumed, { exercise: bench, maxToFailure: 20 })).toHaveLength(0);
    const unknown = sessions.map((x) => ({ ...x, before: undefined }));
    expect(crossPoints(unknown, { exercise: bench, maxToFailure: 20 })).toHaveLength(0);
  });

  it('vandaag telt wat je bij de eerdere oefening logde, hoogstens het voorschrift', () => {
    expect(expectedHard(3, [])).toBe(3);
    expect(expectedHard(3, [undefined, undefined])).toBe(3);
    expect(expectedHard(3, [0, 0, 0])).toBe(0);
    expect(expectedHard(3, [2, 2, 3])).toBe(2);
    expect(expectedHard(1, [3, 3, 3])).toBe(1);
  });

  it('een dode zone: minder dan een hele harde set meer doet niets', () => {
    expect(crossFatigue(3.5, 3, CROSS_PER_SET)).toBeUndefined();
    expect(crossFatigue(4, 3, CROSS_PER_SET)?.factor).toBeCloseTo(0.98, 9);
  });

  it('alleen het verschil telt, alleen omlaag, hoogstens 10%', () => {
    expect(crossFatigue(3, 3, CROSS_PER_SET)).toBeUndefined();
    expect(crossFatigue(1, 3, CROSS_PER_SET)).toBeUndefined();
    expect(crossFatigue(5, 3, CROSS_PER_SET)?.factor).toBeCloseTo(0.96, 9);
    expect(crossFatigue(20, 0, CROSS_PER_SET)?.factor).toBeCloseTo(1 - CROSS_MAX_TOTAL, 9);
    expect(crossFatigue(undefined, 0, CROSS_PER_SET)).toBeUndefined();
    expect(crossFatigue(5, undefined, CROSS_PER_SET)).toBeUndefined();
  });

  it('de regel: het droge feit eerst, je/jij, zonder gedachtestreepjes', () => {
    const c = crossFatigue(3, 1, CROSS_PER_SET)!;
    expect(crossLine(c, { lighter: true, fewerReps: 0 })).toBe('2 harde sets meer voor dezelfde spieren ervoor dan normaal, dus je eerste set iets lichter.');
    expect(crossLine(crossFatigue(1.5, 0.5, CROSS_PER_SET)!, { lighter: false, fewerReps: 1 })).toBe('1 harde set meer voor dezelfde spieren ervoor dan normaal, dus je eerste set een herhaling minder.');
    expect(crossLine(crossFatigue(1.5, 0, CROSS_PER_SET)!, { lighter: false, fewerReps: 2 })).toMatch(/^1,5 harde sets meer .* 2 herhalingen minder\.$/);
    expect(crossLine(c, { lighter: true, fewerReps: 0 })).not.toMatch(/[–—]/);
  });
});

describe('de eerste set bijstellen', () => {
  const loadOf = (kg: number) => kg;
  const cands = [70, 72.5, 75, 77.5, 80, 82.5].map((k) => ({ externalKg: k, loadKg: k }));
  const strength = 80 * (1 + 10 / 30);

  it('haal je de onderkant nog, dan alleen minder herhalingen', () => {
    const made = adjustFirstSet({ weightKg: 80, reps: 8, target: { repsLow: 5, repsHigh: 8, rir: 2 } }, strength, 0.96, loadOf, cands);
    expect(made).toEqual({ weightKg: 80, reps: expectedReps(strength * 0.96, 80, 2) });
    expect(made!.reps).toBeLessThan(8);
  });

  it('anders het zwaarste lichtere gewicht waarmee je de onderkant haalt', () => {
    const made = adjustFirstSet({ weightKg: 80, reps: 8, target: { repsLow: 7, repsHigh: 9, rir: 2 } }, strength, 0.94, loadOf, cands)!;
    expect(made.weightKg).toBeLessThan(80);
    expect(expectedReps(strength * 0.94, made.weightKg, 2)).toBeGreaterThanOrEqual(7);
    expect(expectedReps(strength * 0.94, made.weightKg + 2.5, 2)).toBeLessThan(7);
  });

  it('nooit zwaarder of meer, en niets bij tot falen of een houding', () => {
    expect(adjustFirstSet({ weightKg: 80, reps: 6, target: { repsLow: 6, repsHigh: 8, rir: 2 } }, strength, 0.99, loadOf, cands)).toBeUndefined();
    expect(adjustFirstSet({ weightKg: 80, reps: 8, target: { repsLow: 8, repsHigh: 8, rir: 0, failure: true } }, strength, 0.9, loadOf, cands)).toBeUndefined();
    expect(adjustFirstSet({ weightKg: 80, reps: 8, target: { repsLow: 8, repsHigh: 10, rir: 2, timedSec: 45 } }, strength, 0.9, loadOf, cands)).toBeUndefined();
    expect(adjustFirstSet({ weightKg: 80, reps: 8, target: { repsLow: 6, repsHigh: 8, rir: 2 } }, strength, 1, loadOf, cands)).toBeUndefined();
  });

  it('geen lichter gewicht dat past: de onderkant op dit gewicht', () => {
    expect(adjustFirstSet({ weightKg: 80, reps: 8, target: { repsLow: 7, repsHigh: 9, rir: 2 } }, strength, 0.9, loadOf, [{ externalKg: 80, loadKg: 80 }])).toEqual({ weightKg: 80, reps: 7 });
  });
});

describe('in het voorschrift van Forge', () => {
  // Normaal: bankdrukken als eerste. Vandaag: eerst drie harde sets pec deck.
  const benchFirst = DATES.map((d, i) => log(`l${i}`, d, [entry('bench-press', 'Barbell Bench Press', benchSets())]));
  const flyThenBench = DATES.map((d, i) => log(`l${i}`, d, [entry('pec-deck-fly', 'Pec Deck Fly', flySets()), entry('bench-press', 'Barbell Bench Press', benchSets())]));
  const today = [slot('a', 'Pec Deck Fly', 3, '10-12'), slot('b', 'Barbell Bench Press', 3, '6-8')];

  it('meer harde sets ervoor dan normaal: de eerste set lichter, met de reden op de rij', () => {
    const off = planWorkout(today, ctxOf(benchFirst, {}, { crossFatigue: false }))[1];
    const on = planWorkout(today, ctxOf(benchFirst))[1];
    expect(work(on)[0].weightKg!).toBeLessThan(work(off)[0].weightKg!);
    expect(work(on)[0].target.weightKg).toBe(work(on)[0].weightKg);
    expect(work(on)[0].forgeReps).toBe(work(on)[0].reps);
    expect(on.reason).toMatch(/^3 harde sets meer voor dezelfde spieren ervoor dan normaal, dus je eerste set iets lichter\./);
    expect(off.reason ?? '').not.toMatch(/dezelfde spieren/);
    // Een latere set nooit zwaarder dan de eerste.
    for (const r of work(on)) expect(r.weightKg!).toBeLessThanOrEqual(work(on)[0].weightKg!);
    // In de training rekent Forge met de bijgestelde kracht: 3 sets meer, 2% per set.
    expect(on.strengthKg!).toBeCloseTo(off.strengthKg! * (1 - 3 * CROSS_PER_SET), 6);
    const ctx = { profile: DEFAULT_PROFILE, workSets: 'descending' as const, bodyKg: 80, on: true };
    expect(strengthFor(on, work(on)[0].id, ctx)).toBeCloseTo(on.strengthKg!, 6);
  });

  it('dezelfde volgorde als altijd: verschil nul, niets bijgesteld', () => {
    const off = planWorkout(today, ctxOf(flyThenBench, {}, { crossFatigue: false }));
    const on = planWorkout(today, ctxOf(flyThenBench));
    expect(on.map(plain)).toEqual(off.map(plain));
    expect(on[1].reason).toBe(off[1].reason);
    expect(on[1].strengthKg).toBe(off[1].strengthKg);
  });

  it('dezelfde volgorde met gelogde RIR 4 of een set minder bij de eerdere oefening: niets bijgesteld', () => {
    for (const sets of [flySets(4), flySets().slice(0, 2)]) {
      const history = DATES.map((d, i) => log(`l${i}`, d, [entry('pec-deck-fly', 'Pec Deck Fly', sets), entry('bench-press', 'Barbell Bench Press', benchSets())]));
      const on = planWorkout(today, ctxOf(history));
      const off = planWorkout(today, ctxOf(history, {}, { crossFatigue: false }));
      expect(on.map(plain)).toEqual(off.map(plain));
      expect(on[1].reason).toBe(off[1].reason);
      expect(on[1].strengthKg).toBe(off[1].strengthKg);
    }
  });

  it('Terugzetten na een stap omhoog houdt de bijstelling: latere sets niet zwaarder, de zin blijft', () => {
    // 7 tot 8: vorige keer 8 met 2 over is de bovenkant, dus "Forge rekent mee" zet een stap omhoog.
    const raised = [today[0], slot('b', 'Barbell Bench Press', 3, '7-8')];
    const on = planWorkout(raised, ctxOf(benchFirst))[1];
    expect(on.raise).toBeDefined();
    expect(on.reason).toMatch(/^3 harde sets meer/);
    const back = undoRaise(on);
    const w = work(back);
    for (const r of w) expect(r.weightKg!).toBeLessThanOrEqual(w[0].weightKg!);
    expect(back.reason).toMatch(/dezelfde spieren ervoor dan normaal/);
    const backOff = undoRaise(planWorkout(raised, ctxOf(benchFirst, {}, { crossFatigue: false }))[1]);
    expect(w[0].weightKg!).toBeLessThan(work(backOff)[0].weightKg!);
  });

  it('niets aan de eerste set te doen (tot falen): de kracht blijft ook gelijk, geen stille bijstelling', () => {
    const failing = [today[0], slot('b', 'Barbell Bench Press', 3, '6-8', { setTargets: [{ repsLow: 6, repsHigh: 8, rir: 0, failure: true }, { repsLow: 6, repsHigh: 8, rir: 2 }, { repsLow: 6, repsHigh: 8, rir: 2 }] })];
    const on = planWorkout(failing, ctxOf(benchFirst, {}, { noSpotter: false }))[1];
    const off = planWorkout(failing, ctxOf(benchFirst, {}, { noSpotter: false, crossFatigue: false }))[1];
    expect(on.strengthKg).toBe(off.strengthKg);
    expect(on.reason).toBe(off.reason);
  });

  it('minder harde sets ervoor dan normaal: nooit zwaarder', () => {
    const on = planWorkout([slot('b', 'Barbell Bench Press', 3, '6-8')], ctxOf(flyThenBench));
    const off = planWorkout([slot('b', 'Barbell Bench Press', 3, '6-8')], ctxOf(flyThenBench, {}, { crossFatigue: false }));
    expect(on.map(plain)).toEqual(off.map(plain));
  });

  it('te weinig trainingen: niets zeggen', () => {
    const two = benchFirst.slice(0, 2);
    const on = planWorkout(today, ctxOf(two));
    const off = planWorkout(today, ctxOf(two, {}, { crossFatigue: false }));
    expect(on.map(plain)).toEqual(off.map(plain));
    expect(on[1].reason).toBe(off[1].reason);
  });

  it('een oude back-up zonder RIR of zonder gevraagd aantal bij de eerdere oefening: onbekend, niets bijgesteld', () => {
    for (const sets of [flySets(undefined), flySets(2, { rirAssumed: true })]) {
      const old = DATES.map((d, i) => log(`l${i}`, d, [entry('pec-deck-fly', 'Pec Deck Fly', sets), entry('bench-press', 'Barbell Bench Press', benchSets())]));
      const on = planWorkout([slot('b', 'Barbell Bench Press', 3, '6-8')], ctxOf(old));
      const off = planWorkout([slot('b', 'Barbell Bench Press', 3, '6-8')], ctxOf(old, {}, { crossFatigue: false }));
      expect(on.map(plain)).toEqual(off.map(plain));
    }
  });

  it('een oefening zonder spiergegevens: niets bijgesteld', () => {
    const odd = DATES.map((d, i) => log(`l${i}`, d, [entry('x', 'Mysterie Duwer', benchSets())]));
    const plan = [slot('a', 'Pec Deck Fly', 3, '10-12'), slot('x', 'Mysterie Duwer', 3, '6-8')];
    const on = planWorkout(plan, ctxOf(odd));
    const off = planWorkout(plan, ctxOf(odd, {}, { crossFatigue: false }));
    expect(on.map(plain)).toEqual(off.map(plain));
    expect(on[1].reason).toBe(off[1].reason);
  });

  it('uit, of zonder het model: precies zoals voorheen', () => {
    const off = planWorkout(today, ctxOf(benchFirst, {}, { crossFatigue: false }));
    expect(off[1].reason ?? '').not.toMatch(/dezelfde spieren/);
    const noModel = planWorkout(today, ctxOf(benchFirst, { modelOn: false }));
    expect(noModel[1].reason).toBeUndefined();
  });

  it('Vast in plaats van Geleerd: dezelfde 2% per set', () => {
    const fixed = planWorkout(today, ctxOf(benchFirst, {}, { fatigue: 'fixed' }))[1];
    const off = planWorkout(today, ctxOf(benchFirst, {}, { crossFatigue: false }))[1];
    expect(fixed.strengthKg!).toBeCloseTo(off.strengthKg! * (1 - 3 * CROSS_PER_SET), 6);
  });

  it('ruilen midden in de training telt de oefeningen ervoor mee', () => {
    const ctx = ctxOf(benchFirst);
    const workout = planWorkout(today, ctx);
    const state = planStateBefore(ctx, workout, 'b');
    const swapped = planExercise(today[1], ctx, state, bench);
    expect(swapped.reason).toMatch(/^3 harde sets meer voor dezelfde spieren/);
  });

  it('de tijdsgrens: een weggevallen oefening telt niet mee', () => {
    const withExtra = [{ ...today[0], priority: 'optional' as const }, today[1]];
    const capped = capSlots({ slots: withExtra, fullMinutes: 60, cap: 1 });
    expect(capped.slots.map((s) => s.id)).toEqual(['b']);
    const on = planWorkout(capped.slots, ctxOf(benchFirst));
    const off = planWorkout(capped.slots, ctxOf(benchFirst, {}, { crossFatigue: false }));
    expect(on.map(plain)).toEqual(off.map(plain));
    // Een set eraf bij de extra oefening: een set minder telt mee.
    const trimmed = [{ ...withExtra[0], sets: 2 }, today[1]];
    expect(planWorkout(trimmed, ctxOf(benchFirst))[1].reason).toMatch(/^2 harde sets meer/);
  });

  it('Lichter blijft werken: de regel van Lichter staat voorop, de bijstelling erachter', () => {
    const legFirst = DATES.map((d, i) => log(`l${i}`, d, [entry('leg-press', 'Pin-Loaded Leg Press', [set(10, 120, 2), set(10, 120, 2), set(9, 120, 2)])]));
    const plan = [slot('a', 'Barbell Back Squat', 3, '6-8', { targetWeightKg: 80 }), slot('b', 'Pin-Loaded Leg Press', 3, '8-10')];
    const eased = planWorkout(plan, ctxOf(legFirst, { ease: { how: 'standaard', because: 'spierpijn' } }));
    const easedOff = planWorkout(plan, ctxOf(legFirst, { ease: { how: 'standaard', because: 'spierpijn' } }, { crossFatigue: false }));
    expect(eased[1].reason).toMatch(/^Lichter door spierpijn.*dezelfde spieren ervoor dan normaal/);
    expect(easedOff[1].reason).toMatch(/^Lichter door spierpijn/);
    expect(work(eased[1])[0].weightKg!).toBeLessThanOrEqual(work(easedOff[1])[0].weightKg!);
    expect(work(eased[1]).length).toBe(work(easedOff[1]).length);
  });
});

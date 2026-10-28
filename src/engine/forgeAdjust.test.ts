import { describe, expect, it } from 'vitest';
import { adjustText, applyLighter, fitStillOpen, noFitText, stillHeavyTip, stillOpen, suggestLighter, suggestOwnWeights, suggestTooBigStep, tooBigStepTip, tooHeavy, type AdjustContext } from './forgeAdjust';
import type { WorkoutExercise, WorkoutRow } from './forgeWorkout';
import { DEFAULT_PROFILE } from './strengthSettings';

// Nagemaakte getallen.
const ctx = (over: Partial<AdjustContext> = {}): AdjustContext => ({ profile: DEFAULT_PROFILE, workSets: 'descending', bodyKg: 80, ...over });

function row(i: number, over: Partial<WorkoutRow> = {}, target: Partial<WorkoutRow['target']> = {}): WorkoutRow {
  return { id: `r${i}`, kind: 'work', target: { repsLow: 9, repsHigh: 11, rir: 2, ...target }, done: false, ...over };
}
const exercise = (exerciseId: string, rows: WorkoutRow[]): WorkoutExercise => ({ slot: 's', exerciseId, name: 'Oefening', known: true, rows, restSec: 90, timed: false });

describe('tooHeavy', () => {
  it('herhalingen plus RIR onder de onderkant plus het gevraagde RIR', () => {
    expect(tooHeavy(row(0, { done: true, weightKg: 60, reps: 8, rir: 2 }))).toBe(true);
    expect(tooHeavy(row(0, { done: true, weightKg: 60, reps: 9, rir: 2 }))).toBe(false);
    // Met meer RIR dan gevraagd is het niet te zwaar.
    expect(tooHeavy(row(0, { done: true, weightKg: 60, reps: 8, rir: 3 }))).toBe(false);
    // Een aangenomen RIR is het doel: dan beslissen de herhalingen alleen.
    expect(tooHeavy(row(0, { done: true, weightKg: 60, reps: 8, rir: 2, rirAssumed: true }))).toBe(true);
    expect(tooHeavy(row(0, { done: true, weightKg: 60, reps: 9, rir: 2, rirAssumed: true }))).toBe(false);
    expect(tooHeavy(row(0, { done: true, weightKg: 60, reps: 8 }))).toBe(false);
    expect(tooHeavy(row(0, { done: false, weightKg: 60, reps: 8, rir: 0 }))).toBe(false);
  });
});

describe('suggestLighter met een stang', () => {
  const sets = (): WorkoutRow[] => [
    row(0, { done: true, weightKg: 70, reps: 7, rir: 1 }, { weightKg: 70 }),
    row(1, { weightKg: 70, reps: 9 }, { weightKg: 70 }),
    row(2, { weightKg: 70, reps: 9 }, { weightKg: 70 }),
  ];

  it('stelt per volgende set een lichter gewicht voor, minder naarmate de vermoeidheid oploopt', () => {
    const adj = suggestLighter(exercise('bench-press', sets()), 'r0', ctx())!;
    expect(adj).toBeDefined();
    expect(adj.items.map((i) => i.rowId)).toEqual(['r1', 'r2']);
    expect(adj.items[0].weightKg).toBeLessThan(70);
    expect(adj.items[1].weightKg).toBeLessThanOrEqual(adj.items[0].weightKg);
    // Elk voorgesteld gewicht bestaat met de schijven van het profiel (stang 20 plus paren schijven).
    for (const i of adj.items) expect(((i.weightKg - 20) / 2) % 1.25).toBeCloseTo(0, 5);
  });

  it('rekent met de daling van de oefening: een grotere daling geeft lichtere latere sets', () => {
    const base = suggestLighter(exercise('bench-press', sets()), 'r0', ctx())!;
    const tired = suggestLighter({ ...exercise('bench-press', sets()), fatiguePerSet: 0.1 }, 'r0', ctx())!;
    expect(tired.items.at(-1)!.weightKg).toBeLessThan(base.items.at(-1)!.weightKg);
    expect(suggestLighter(exercise('bench-press', sets()), 'r0', ctx({ fatiguePerSet: 0.1 }))!.items.at(-1)!.weightKg).toBe(tired.items.at(-1)!.weightKg);
  });

  it('bij gelijke werksets geen extra vermoeidheid', () => {
    const adj = suggestLighter(exercise('bench-press', sets()), 'r0', ctx({ workSets: 'equal' }))!;
    expect(adj.items[0].weightKg).toBe(adj.items[1].weightKg);
  });

  it('niets voor een set die al gedaan is of die je zelf aanpaste', () => {
    const rows = sets();
    rows[1] = { ...rows[1], edited: true };
    const adj = suggestLighter(exercise('bench-press', rows), 'r0', ctx())!;
    expect(adj.items.map((i) => i.rowId)).toEqual(['r2']);
    rows[2] = { ...rows[2], done: true };
    expect(suggestLighter(exercise('bench-press', rows), 'r0', ctx())).toBeUndefined();
  });

  it('geen voorstel als de set niet te zwaar was', () => {
    const rows = sets();
    rows[0] = { ...rows[0], reps: 10 };
    expect(suggestLighter(exercise('bench-press', rows), 'r0', ctx())).toBeUndefined();
  });

  it('applyLighter zet het gewicht in open, onaangeraakte sets en houdt de herhalingen in het bereik', () => {
    const rows = sets();
    rows[1] = { ...rows[1], reps: 20 };
    const ex = exercise('bench-press', rows);
    const adj = suggestLighter(ex, 'r0', ctx())!;
    const next = applyLighter(ex, adj);
    expect(next.rows[0]).toEqual(ex.rows[0]);
    expect(next.rows[1].weightKg).toBe(adj.items[0].weightKg);
    expect(next.rows[1].reps).toBe(11);
    expect(next.rows[2].reps).toBe(9);
    // Liever niet laat alles staan: zonder applyLighter is er niets veranderd.
    expect(ex.rows[1].weightKg).toBe(70);
  });

  it('stillOpen laat gedane of aangepaste sets vallen', () => {
    const ex = exercise('bench-press', sets());
    const adj = suggestLighter(ex, 'r0', ctx())!;
    const later = { ...ex, rows: ex.rows.map((r) => (r.id === 'r1' ? { ...r, done: true } : r)) };
    expect(stillOpen(later, adj)!.items.map((i) => i.rowId)).toEqual(['r2']);
    const all = { ...later, rows: later.rows.map((r) => (r.id === 'r2' ? { ...r, edited: true } : r)) };
    expect(stillOpen(all, adj)).toBeUndefined();
  });

  it('de tekst noemt het gewicht, of de reeks gewichten', () => {
    const text = adjustText({ fromRowId: 'r0', items: [{ rowId: 'r1', weightKg: 62.5 }] }, undefined);
    expect(text).toBe('Die set was zwaarder dan bedoeld. Volgende set 62,5 kg?');
    expect(adjustText({ fromRowId: 'r0', items: [{ rowId: 'r1', weightKg: 62.5 }, { rowId: 'r2', weightKg: 60 }] }, undefined)).toBe('Die set was zwaarder dan bedoeld. Volgende sets 62,5 en 60 kg?');
  });
});

// Een kabeloefening, doel 9 tot 11 bij 2 RIR, en je deed zelf 13,5 kg x 8 bij 2 RIR.
describe('suggestLighter met grove stappen op een toestel', () => {
  const rows = (): WorkoutRow[] => [
    row(0, { done: true, weightKg: 13.5, reps: 8, rir: 2 }, { weightKg: 10 }),
    // Het gewicht van de eerste set is doorgegeven (13,5), het voorschrift was 10.
    row(1, { weightKg: 13.5, reps: 10 }, { weightKg: 10 }),
    row(2, { weightKg: 13.5, reps: 10 }, { weightKg: 10 }),
  ];

  it('toestel met alleen 10 en 15: geen voorstel van 10 x 21, de herhalingen blijven zoals ze waren', () => {
    const machine = { ...DEFAULT_PROFILE, stackStepKg: 5 };
    const ex = exercise('pallof-press', rows());
    const adj = suggestLighter(ex, 'r0', ctx({ profile: machine, usedKg: [10, 15] }));
    expect(adj).toBeUndefined();
    // En ook als er een voorstel was: de herhalingen in de open rijen vallen binnen het bereik.
    expect(ex.rows.slice(1).every((r) => r.reps! >= 9 && r.reps! <= 11)).toBe(true);
  });

  it('toestel met ook 12,5: dat gewicht, want daar blijven de herhalingen in het bereik', () => {
    const ex = exercise('pallof-press', rows());
    const adj = suggestLighter(ex, 'r0', ctx({ usedKg: [10, 12.5, 15] }))!;
    expect(adj).toBeDefined();
    expect(adj.items[0]).toEqual({ rowId: 'r1', weightKg: 12.5 });
    // Voor de tweede set is 12,5 al te zwaar en 10 te licht (te veel herhalingen): daar geen voorstel.
    expect(adj.items.find((i) => i.rowId === 'r2')).toBeUndefined();
    const next = applyLighter(ex, adj);
    for (const r of next.rows.slice(1)) {
      expect(r.reps).toBeGreaterThanOrEqual(9);
      expect(r.reps).toBeLessThanOrEqual(11);
    }
    // Nooit een gewicht dat boven het gebruikte gewicht uitkomt.
    for (const i of adj.items) expect(i.weightKg).toBeLessThan(13.5);
  });

  it('Stappen van je profiel: de gebruikte gewichten tellen niet, dus met stappen van 5 kg geen voorstel', () => {
    const machine = { ...DEFAULT_PROFILE, stackStepKg: 5 };
    const ex = exercise('pallof-press', rows());
    expect(suggestLighter(ex, 'r0', ctx({ profile: machine, usedKg: [10, 12.5, 15], stackWeights: 'profile' }))).toBeUndefined();
    expect(suggestLighter(ex, 'r0', ctx({ profile: machine, usedKg: [10, 12.5, 15], stackWeights: 'learned' }))!.items[0].weightKg).toBe(12.5);
  });
});

describe('suggestOwnWeights: geen gewicht past', () => {
  // Een nagemaakte kabel met alleen zware gewichten in deze sportschool.
  const heavyOnly = { ...DEFAULT_PROFILE, exerciseWeightsKg: { 'cable-fly': [40, 45] } };
  const sets = (): WorkoutRow[] => [
    row(0, { done: true, weightKg: 40, reps: 5, rir: 0 }, { weightKg: 40 }),
    row(1, { weightKg: 40, reps: 9 }, { weightKg: 40 }),
  ];

  it('vraagt om de gewichten als zelfs het lichtste gewicht het bereik niet haalt', () => {
    const ex = exercise('cable-fly', sets());
    expect(suggestLighter(ex, 'r0', ctx({ profile: heavyOnly }))).toBeUndefined();
    const fit = suggestOwnWeights(ex, 'r0', ctx({ profile: heavyOnly }))!;
    expect(fit).toMatchObject({ fromRowId: 'r0', repsLow: 9, repsHigh: 11, lightestKg: 40 });
    expect(fit.expectedReps).toBeLessThan(9);
    // De regel zegt welke set het is.
    expect(fit).toMatchObject({ rowId: 'r1', setNo: 2, weightKg: 40 });
    expect(noFitText(fit)).toBe('Set 2: geen gewicht van dit toestel past bij 9 tot 11 herhalingen. Gewichten van dit toestel invullen?');
    expect(noFitText(fit, true)).toBe('Set 2: geen gewicht van dit toestel past bij 9 tot 11 herhalingen. Gewichten van dit toestel aanpassen?');
    expect(noFitText({ ...fit, setNo: undefined })).toBe('Geen gewicht van dit toestel past bij 9 tot 11 herhalingen. Gewichten van dit toestel invullen?');
  });
  it('de melding verdwijnt zodra die set is opgelost', () => {
    const ex = exercise('cable-fly', sets());
    const fit = suggestOwnWeights(ex, 'r0', ctx({ profile: heavyOnly }))!;
    expect(fitStillOpen(ex, fit)).toBe(true);
    const edited = { ...ex, rows: ex.rows.map((r) => (r.id === 'r1' ? { ...r, edited: true } : r)) };
    expect(fitStillOpen(edited, fit)).toBe(false);
    const changed = { ...ex, rows: ex.rows.map((r) => (r.id === 'r1' ? { ...r, weightKg: 35 } : r)) };
    expect(fitStillOpen(changed, fit)).toBe(false);
    const done = { ...ex, rows: ex.rows.map((r) => (r.id === 'r1' ? { ...r, done: true } : r)) };
    expect(fitStillOpen(done, fit)).toBe(false);
    expect(fitStillOpen({ ...ex, rows: ex.rows.filter((r) => r.id !== 'r1') }, fit)).toBe(false);
    expect(fitStillOpen(ex, { rowId: undefined })).toBe(true);
  });
  it('zegt één getal als het bereik één getal is', () => {
    expect(noFitText({ fromRowId: 'r0', repsLow: 10, repsHigh: 10, lightestKg: 40, expectedReps: 6 })).toContain('bij 10 herhalingen');
  });
  it('de stille tip na het invullen noemt het lichtste gewicht en wat je daarmee haalt', () => {
    expect(stillHeavyTip({ fromRowId: 'r0', repsLow: 10, repsHigh: 12, lightestKg: 35, expectedReps: 8 })).toBe('Ook 35 kg is nog te zwaar, naar verwachting 8 herhalingen.');
    expect(stillHeavyTip({ fromRowId: 'r0', repsLow: 10, repsHigh: 12, lightestKg: 32.5, expectedReps: 1 })).toBe('Ook 32,5 kg is nog te zwaar, naar verwachting 1 herhaling.');
    expect(stillHeavyTip({ fromRowId: 'r0', repsLow: 10, repsHigh: 12, lightestKg: 40, expectedReps: 0 })).toBe('Ook 40 kg is nog te zwaar voor deze set.');
  });
  it('vraagt niets als er wel een lichter gewicht is of als de set niet te zwaar was', () => {
    const ex = exercise('cable-fly', sets());
    expect(suggestOwnWeights(ex, 'r0', ctx())).toBeUndefined();
    const fine = exercise('cable-fly', [{ ...sets()[0], reps: 10, rir: 2 }, sets()[1]]);
    expect(suggestOwnWeights(fine, 'r0', ctx({ profile: heavyOnly }))).toBeUndefined();
  });
  it('vraagt niets bij een stang', () => {
    expect(suggestOwnWeights(exercise('bench-press', sets()), 'r0', ctx({ profile: heavyOnly }))).toBeUndefined();
  });
  it('na het invullen van lichtere gewichten komt het voorstel Lichter wel', () => {
    const ex = exercise('cable-fly', sets());
    const filled = { ...DEFAULT_PROFILE, exerciseWeightsKg: { 'cable-fly': [10, 20, 30, 32.5, 35, 40] } };
    expect(suggestLighter(ex, 'r0', ctx({ profile: filled }))).toBeDefined();
  });
});

describe('suggestLighter met een tussengewicht', () => {
  const sets = (): WorkoutRow[] => [
    row(0, { done: true, weightKg: 45, reps: 5, rir: 0 }, { weightKg: 45 }),
    row(1, { weightKg: 45, reps: 9 }, { weightKg: 45 }),
  ];
  it('kiest een gewicht met tussengewicht als dat de kleinste verwachte misser geeft', () => {
    const blockOnly = { ...DEFAULT_PROFILE, exerciseWeightsKg: { 'cable-fly': [30, 45] } };
    const withAddOn = { ...blockOnly, addOnKg: [2.5, 5] };
    const ex = exercise('cable-fly', sets());
    // Zonder tussengewicht is 30 kg een te grote stap, dus geen voorstel.
    expect(suggestLighter(ex, 'r0', ctx({ profile: blockOnly }))).toBeUndefined();
    const finer = suggestLighter(ex, 'r0', ctx({ profile: withAddOn }))!.items[0].weightKg!;
    expect(finer).toBeGreaterThan(30);
    expect(finer).toBeLessThan(45);
    expect([32.5, 35, 37.5, 40, 42.5]).toContain(finer);
  });
});

describe('suggestTooBigStep: het lichtere gewicht is een te grote stap', () => {
  // Een nagemaakte kabel met alleen 10 en 40: 10 kg geeft veel te veel herhalingen.
  const gap = { ...DEFAULT_PROFILE, exerciseWeightsKg: { 'cable-fly': [10, 40, 45] } };
  const sets = (): WorkoutRow[] => [
    row(0, { done: true, weightKg: 40, reps: 5, rir: 0 }, { weightKg: 40 }),
    row(1, { weightKg: 40, reps: 9 }, { weightKg: 40 }),
  ];

  it('geeft de stap en de verwachte herhalingen als suggestLighter en suggestOwnWeights zwijgen', () => {
    const ex = exercise('cable-fly', sets());
    expect(suggestLighter(ex, 'r0', ctx({ profile: gap }))).toBeUndefined();
    expect(suggestOwnWeights(ex, 'r0', ctx({ profile: gap }))).toBeUndefined();
    const step = suggestTooBigStep(ex, 'r0', ctx({ profile: gap }))!;
    expect(step).toMatchObject({ fromRowId: 'r0', stepKg: 10 });
    expect(step.expectedReps).toBeGreaterThan(11);
    expect(step).toMatchObject({ rowId: 'r1', setNo: 2 });
    expect(tooBigStepTip(step)).toBe(step.expectedReps > 30 ? 'Set 2: 10 kg is een te grote stap: veel te veel herhalingen.' : `Set 2: 10 kg is een te grote stap: naar verwachting ${step.expectedReps} herhalingen.`);
  });
  it('rekent met dezelfde vermoeidheid per set als het bijsturen', () => {
    const ex = exercise('cable-fly', sets());
    const calm = suggestTooBigStep(ex, 'r0', ctx({ profile: gap, fatiguePerSet: 0.03 }))!;
    const tired = suggestTooBigStep(ex, 'r0', ctx({ profile: gap, fatiguePerSet: 0.2 }))!;
    expect(tired.expectedReps).toBeLessThan(calm.expectedReps);
    const equal = suggestTooBigStep(ex, 'r0', ctx({ profile: gap, workSets: 'equal' }))!;
    expect(equal.expectedReps).toBeGreaterThanOrEqual(calm.expectedReps);
  });
  it('zwijgt als er wel een voorstel is, als geen gewicht past, of als de set niet te zwaar was', () => {
    const ex = exercise('cable-fly', sets());
    const fine = { ...DEFAULT_PROFILE, exerciseWeightsKg: { 'cable-fly': [10, 20, 30, 32.5, 35, 40] } };
    expect(suggestTooBigStep(ex, 'r0', ctx({ profile: fine }))).toBeUndefined();
    const heavyOnly = { ...DEFAULT_PROFILE, exerciseWeightsKg: { 'cable-fly': [40, 45] } };
    expect(suggestTooBigStep(ex, 'r0', ctx({ profile: heavyOnly }))).toBeUndefined();
    const ok = exercise('cable-fly', [{ ...sets()[0], reps: 10, rir: 2 }, sets()[1]]);
    expect(suggestTooBigStep(ok, 'r0', ctx({ profile: gap }))).toBeUndefined();
  });
  it('de tekst zegt herhaling bij één', () => {
    expect(tooBigStepTip({ fromRowId: 'r0', stepKg: 32.5, expectedReps: 1 })).toBe('32,5 kg is een te grote stap: naar verwachting 1 herhaling.');
    expect(tooBigStepTip({ fromRowId: 'r0', stepKg: 35, expectedReps: 16 })).toBe('35 kg is een te grote stap: naar verwachting 16 herhalingen.');
    expect(tooBigStepTip({ fromRowId: 'r0', stepKg: 10, expectedReps: 128 })).toBe('10 kg is een te grote stap: veel te veel herhalingen.');
  });
});

// Een nagemaakte split squat met twee dumbbells en lichaamsgewicht (80 kg), en een rek met
// alleen 2 en 30 kg per dumbbell: per hand gelogd of als totaal is het dezelfde last, dus
// dezelfde tip, met de stap in dezelfde maat als het logboek.
describe('twee dumbbells met lichaamsgewicht: de tip rekent in dezelfde maat als het bijsturen', () => {
  const rack = { ...DEFAULT_PROFILE, dumbbells: { startKg: 2, stepKg: 28, upToKg: 30, thenStepKg: 28, maxKg: 30 } };
  const rowsAt = (kg: number): WorkoutRow[] => [row(0, { done: true, weightKg: kg, reps: 4, rir: 0 }, { weightKg: kg }), row(1, { weightKg: kg, reps: 9 }, { weightKg: kg })];
  it('per hand 30 en als totaal 60 geven dezelfde verwachte herhalingen', () => {
    const perHand = { ...exercise('bulgarian-split-squat', rowsAt(30)), dumbbellTotal: false };
    const total = { ...exercise('bulgarian-split-squat', rowsAt(60)), dumbbellTotal: true };
    const c = ctx({ profile: rack });
    expect(suggestLighter(perHand, 'r0', c)).toBeUndefined();
    expect(suggestLighter(total, 'r0', c)).toBeUndefined();
    const a = suggestTooBigStep(perHand, 'r0', c)!;
    const b = suggestTooBigStep(total, 'r0', c)!;
    expect(a.expectedReps).toBe(b.expectedReps);
    expect(a.stepKg).toBe(2);
    expect(b.stepKg).toBe(4);
  });
});

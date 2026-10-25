import { describe, expect, it } from 'vitest';
import { adjustText, applyLighter, stillOpen, suggestLighter, tooHeavy, type AdjustContext } from './forgeAdjust';
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

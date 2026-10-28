import { describe, expect, it } from 'vitest';
import type { WorkoutExercise, WorkoutRow } from './forgeWorkout';
import { canRemoveRow, droppedCount, droppedLine, isOwnRow, ownCountSentence, programmedWorkSets, reasonWithOwnCount, reinsertRow, removeSet, restoreDropped, rowLabel } from './forgeRows';

const row = (id: string, kind: 'work' | 'warmup' = 'work', done = false): WorkoutRow => ({ id, kind, target: { repsLow: 8, repsHigh: 10 }, reps: 8, weightKg: 60, done });
const ex = (rows: WorkoutRow[], reason?: string): WorkoutExercise => ({ slot: 'bench', exerciseId: 'bench', name: 'Bankdrukken', known: true, rows, restSec: 90, timed: false, ...(reason ? { reason } : {}) });
const program = () => ex([row('bench:w0', 'warmup'), row('bench:s0'), row('bench:s1'), row('bench:s2')], 'Je programma vraagt nu 3 sets van 8 tot 10; het gewicht volgt uit je geschatte kracht.');

describe('isOwnRow', () => {
  it('kent programmasets en eigen sets aan hun id', () => {
    expect(isOwnRow(row('bench:s0'))).toBe(false);
    expect(isOwnRow(row('bench:w1', 'warmup'))).toBe(false);
    expect(isOwnRow(row('bench:amk3x2'))).toBe(true);
    expect(isOwnRow(row('bench:cmk3x2'))).toBe(true);
  });
});

describe('removeSet', () => {
  it('haalt een werkset van het programma weg en onthoudt hem met zijn plek', () => {
    const r = removeSet(program(), 'bench:s1');
    expect(r.ex.rows.map((x) => x.id)).toEqual(['bench:w0', 'bench:s0', 'bench:s2']);
    expect(r.ex.dropped).toEqual([{ row: expect.objectContaining({ id: 'bench:s1' }), index: 2 }]);
    expect(r.label).toBe('2');
    expect(droppedCount(r.ex)).toBe(1);
  });
  it('onthoudt een eigen set niet als weggehaald programma', () => {
    const base = ex([row('bench:s0'), row('bench:a1x2')]);
    const r = removeSet(base, 'bench:a1x2');
    expect(r.ex.dropped).toBeUndefined();
    expect(r.ex.rows).toHaveLength(1);
  });
  it('onthoudt een opwarmset niet in het programma', () => {
    expect(removeSet(program(), 'bench:w0').ex.dropped).toBeUndefined();
  });
  it('mag ook een afgevinkte set weghalen, maar nooit de laatste rij', () => {
    const base = ex([row('bench:s0', 'work', true), row('bench:s1')]);
    expect(canRemoveRow(base, 'bench:s0')).toBe(true);
    expect(removeSet(base, 'bench:s0').ex.rows).toHaveLength(1);
    expect(canRemoveRow(ex([row('bench:s0')]), 'bench:s0')).toBe(false);
    expect(removeSet(ex([row('bench:s0')]), 'bench:s0').ex.rows).toHaveLength(1);
  });
});

describe('terugzetten', () => {
  it('reinsertRow zet de set op zijn plek terug en maakt de regel leeg', () => {
    const r = removeSet(program(), 'bench:s1');
    const back = reinsertRow(r.ex, r.removed!);
    expect(back.rows.map((x) => x.id)).toEqual(['bench:w0', 'bench:s0', 'bench:s1', 'bench:s2']);
    expect(droppedCount(back)).toBe(0);
  });
  it('restoreDropped zet alles terug in de oude volgorde', () => {
    let e = removeSet(program(), 'bench:s2').ex;
    e = removeSet(e, 'bench:s0').ex;
    expect(droppedCount(e)).toBe(2);
    const back = restoreDropped(e);
    expect(back.rows.map((x) => x.id)).toEqual(['bench:w0', 'bench:s0', 'bench:s1', 'bench:s2']);
    expect(droppedCount(back)).toBe(0);
  });
  it('zet niets dubbel terug', () => {
    const r = removeSet(program(), 'bench:s1');
    const once = reinsertRow(r.ex, r.removed!);
    expect(reinsertRow(once, r.removed!).rows).toHaveLength(once.rows.length);
  });
});

describe('de regel en de zin', () => {
  it('zegt hoeveel sets van het programma weg zijn', () => {
    expect(droppedLine(1)).toBe('1 set van je programma weggehaald');
    expect(droppedLine(2)).toBe('2 sets van je programma weggehaald');
  });
  it('telt de sets die het programma vroeg', () => {
    const e = removeSet(program(), 'bench:s1').ex;
    expect(programmedWorkSets(e)).toBe(3);
  });
  it('voegt "Jij doet er 2." toe als er een set minder is', () => {
    const e = removeSet(program(), 'bench:s1').ex;
    expect(ownCountSentence(e)).toBe('Jij doet er 2.');
    expect(reasonWithOwnCount(e)).toMatch(/geschatte kracht\. Jij doet er 2\.$/);
  });
  it('voegt "Jij doet er 4." toe bij een eigen set erbij', () => {
    const e = { ...program(), rows: [...program().rows, row('bench:a1x4')] };
    expect(ownCountSentence(e)).toBe('Jij doet er 4.');
  });
  it('zegt niets als het aantal klopt of de tekst niet over sets gaat', () => {
    expect(ownCountSentence(program())).toBeUndefined();
    const other = ex([row('bench:s0'), row('bench:a1x2')], 'Zelfde gewicht als vorige keer.');
    expect(ownCountSentence(other)).toBeUndefined();
  });
  it('nummert werksets en opwarmsets', () => {
    expect(rowLabel(program(), 'bench:w0')).toBe('W1');
    expect(rowLabel(program(), 'bench:s2')).toBe('3');
    expect(rowLabel(program(), 'nergens')).toBe('');
  });
});

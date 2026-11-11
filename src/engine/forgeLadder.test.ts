import { describe, expect, it } from 'vitest';
import { exerciseById } from '../data/exercises';
import type { SetLog } from '../models/training';
import { addedKgOf, asksClean, bandOf, countsForLine, ladderHint, ladderLines, ladderRows, lastBand, withBand, withClean, withLastBand } from './forgeLadder';
import type { LadderState } from './skillLadder';
import type { WorkoutExercise, WorkoutRow } from './forgeWorkout';

const ex = (id: string) => exerciseById(id)!;
const state = (over: Partial<LadderState>): LadderState => ({ ladderId: 'push-up', current: 4, currentExerciseId: 'push-up', passed: false, proposal: null, lastDate: '2026-11-08', ...over });
const workout = (rows: WorkoutRow[]): WorkoutExercise => ({ slot: 's1', exerciseId: 'pull-up', name: 'Pull-Up', known: true, rows, restSec: 120, timed: false });
const row = (id: string, over: Partial<WorkoutRow> = {}): WorkoutRow => ({ id, kind: 'work', target: { repsLow: 5, repsHigh: 5 }, reps: 5, done: false, ...over });

describe('de drie regels bij een stap', () => {
  it('push-up: stap 4 van 7, de toets, de uitleg en beide kanten', () => {
    const l = ladderLines(ex('push-up'))!;
    expect(l.step).toBe('Stap 4 van 7');
    expect(l.test).toBe('Toets: 3 keer 8');
    expect(l.explain).toBe('Haal je dat met nette vorm, dan kan de volgende stap.');
    expect(l.lighter).toEqual({ exerciseId: 'incline-push-up', name: ex('incline-push-up').name });
    expect(l.harder).toEqual({ exerciseId: 'decline-push-up', name: ex('decline-push-up').name });
  });

  it('het tweede getal is het aantal stappen van de ladder, nooit een vast getal', () => {
    expect(ladderLines(ex('pull-up'))!.step).toBe('Stap 4 van 5');
    expect(ladderLines(ex('dip'))!.step).toBe('Stap 3 van 4');
  });

  it('een houding in seconden, op stap 1 zonder lichtere stap', () => {
    const l = ladderLines(ex('dead-hang'))!;
    expect(l.step).toBe('Stap 1 van 5');
    expect(l.test).toBe('Toets: 3 keer 30 seconden');
    expect(l.lighter).toBeUndefined();
    expect(l.harder?.exerciseId).toBe('scapular-pull-up');
  });

  it('extra gewicht staat in de toets; de laatste stap is de zwaarste, zonder zwaardere', () => {
    const l = ladderLines(ex('weighted-pull-up'))!;
    expect(l.test).toBe('Toets: 3 keer 8 met 2,5 kg erbij');
    expect(l.explain).toBe('Dit is de zwaarste stap.');
    expect(l.harder).toBeUndefined();
    expect(addedKgOf(ex('weighted-dip'))).toBe(2.5);
    expect(addedKgOf(ex('dip'))).toBeUndefined();
  });

  it('een oefening zonder ladder heeft geen regels', () => {
    expect(ladderLines(ex('bench-press'))).toBeUndefined();
    expect(ladderLines(undefined)).toBeUndefined();
  });

  it('geen gedachtestreepjes', () => {
    for (const id of ['push-up', 'dead-hang', 'weighted-dip', 'archer-push-up']) expect(JSON.stringify(ladderLines(ex(id)))).not.toMatch(/[–—]/);
  });
});

describe('de stille regel met het voorstel van de ladder', () => {
  it('zwaarder: alleen op de oefening op de huidige stap', () => {
    const s = state({ passed: true, proposal: { kind: 'harder', step: 5, exerciseId: 'decline-push-up' } });
    expect(ladderHint(ex('push-up'), s)).toBe(`Toets gehaald. Volgende stap: ${ex('decline-push-up').name}.`);
    expect(ladderHint(ex('decline-push-up'), s)).toBeUndefined();
    expect(ladderHint(ex('knee-push-up'), s)).toBeUndefined();
  });

  it('lichter: alleen op de stap boven het voorstel', () => {
    const s = state({ proposal: { kind: 'lighter', step: 3, exerciseId: 'incline-push-up' } });
    expect(ladderHint(ex('push-up'), s)).toBe(`Drie trainingen onder de onderkant. Lichtere stap: ${ex('incline-push-up').name}.`);
    expect(ladderHint(ex('incline-push-up'), s)).toBeUndefined();
    expect(ladderHint(ex('diamond-push-up'), s)).toBeUndefined();
  });

  it('geen voorstel of een andere ladder: geen regel', () => {
    expect(ladderHint(ex('push-up'), state({}))).toBeUndefined();
    expect(ladderHint(ex('push-up'), null)).toBeUndefined();
    expect(ladderHint(ex('pull-up'), state({ passed: true, proposal: { kind: 'harder', step: 5, exerciseId: 'decline-push-up' } }))).toBeUndefined();
  });
});

describe('de rijen van een stap', () => {
  it('een houding zonder historie: 10 seconden, reps 1, geen RIR', () => {
    const { rows, hold } = ladderRows({ slotId: 'x', exercise: ex('dead-hang'), setCount: 3, band: true });
    expect(hold).toBe(true);
    expect(rows).toHaveLength(3);
    for (const r of rows) {
      expect(r.target.holdSec).toBe(10);
      expect(r.seconds).toBe(10);
      expect(r.reps).toBe(1);
      expect(r.target.rir).toBeUndefined();
    }
  });

  it('een houding neemt je laatste seconden, hoogstens de toets', () => {
    const prev = (s: number[]): SetLog[] => s.map((n) => ({ reps: 1, seconds: n }));
    expect(ladderRows({ slotId: 'x', exercise: ex('dead-hang'), setCount: 3, previous: prev([20, 25]), band: true }).rows[0].seconds).toBe(25);
    expect(ladderRows({ slotId: 'x', exercise: ex('dead-hang'), setCount: 3, previous: prev([45]), band: true }).rows[0].seconds).toBe(30);
    // Een opwarmset telt niet.
    expect(ladderRows({ slotId: 'x', exercise: ex('dead-hang'), setCount: 2, previous: [{ reps: 1, seconds: 28, kind: 'warmup' }], band: true }).rows[0].seconds).toBe(10);
  });

  it('herhalingen: je laatste keer op die stap, anders 5; het aantal sets blijft', () => {
    const fresh = ladderRows({ slotId: 'x', exercise: ex('diamond-push-up'), setCount: 4, rir: 2, band: true });
    expect(fresh.hold).toBe(false);
    expect(fresh.rows).toHaveLength(4);
    expect(fresh.rows[0]).toMatchObject({ reps: 5, target: { repsLow: 5, repsHigh: 5, rir: 2 } });
    expect(fresh.rows[0].weightKg).toBeUndefined();
    const again = ladderRows({ slotId: 'x', exercise: ex('diamond-push-up'), setCount: 3, previous: [{ reps: 7 }, { reps: 6 }], band: true });
    expect(again.rows[0].reps).toBe(7);
  });

  it('extra gewicht: je laatste gewicht op die stap, anders 2,5', () => {
    expect(ladderRows({ slotId: 'x', exercise: ex('weighted-pull-up'), setCount: 3, band: true }).rows[0]).toMatchObject({ weightKg: 2.5, target: { weightKg: 2.5 } });
    expect(ladderRows({ slotId: 'x', exercise: ex('weighted-pull-up'), setCount: 3, previous: [{ reps: 6, weightKg: 5 }], band: true }).rows[0]).toMatchObject({ weightKg: 5, reps: 6 });
  });

  it('de band van je vorige keer staat klaar, alleen met de instelling en alleen bij Pull-Up en Dip', () => {
    const prev: SetLog[] = [{ reps: 5, band: 'middel' }, { reps: 6, band: 'licht' }];
    expect(ladderRows({ slotId: 'x', exercise: ex('pull-up'), setCount: 2, previous: prev, band: true }).rows[0]).toMatchObject({ band: 'licht', reps: 6 });
    expect(ladderRows({ slotId: 'x', exercise: ex('pull-up'), setCount: 2, previous: prev, band: false }).rows[0].band).toBeUndefined();
    expect(ladderRows({ slotId: 'x', exercise: ex('negative-dip'), setCount: 2, previous: prev, band: true }).rows[0].band).toBeUndefined();
    expect(lastBand([{ reps: 5, band: 'zwaar' }, { reps: 5 }])).toBeUndefined();
    expect(withLastBand([row('a'), row('w', { kind: 'warmup' })], [{ reps: 5, band: 'zwaar' }]).map((r) => r.band)).toEqual(['zwaar', undefined]);
  });
});

describe('de band in de rij', () => {
  it('een keuze geldt voor de open sets; een gedane set houdt wat erop stond', () => {
    const e = workout([row('a', { done: true, band: 'zwaar' }), row('b'), row('c')]);
    const next = withBand(e, 'licht');
    expect(next.rows.map((r) => r.band)).toEqual(['zwaar', 'licht', 'licht']);
    expect(bandOf(next)).toBe('licht');
    const none = withBand(next, null);
    expect(none.rows.map((r) => r.band)).toEqual(['zwaar', undefined, undefined]);
    expect(bandOf(none)).toBeNull();
    expect(bandOf(workout([row('a', { done: true, band: 'middel' })]))).toBe('middel');
  });
});

describe('Ging het netjes?', () => {
  it('alleen na een gedane werkset op een ladderstap die de onderkant haalt, zonder band', () => {
    const e = workout([row('a', { done: true, reps: 5 }), row('b', { done: true, reps: 4 }), row('c', { done: true, reps: 8, band: 'licht' }), row('d', { reps: 8 })]);
    expect(asksClean(e, 'a', ex('pull-up'))).toBe(true);
    expect(asksClean(e, 'b', ex('pull-up'))).toBe(false);
    expect(asksClean(e, 'c', ex('pull-up'))).toBe(false);
    expect(asksClean(e, 'd', ex('pull-up'))).toBe(false);
    expect(asksClean(e, 'a', ex('lat-pulldown'))).toBe(false);
    const w = workout([row('w', { kind: 'warmup', done: true, reps: 8 })]);
    expect(asksClean(w, 'w', ex('pull-up'))).toBe(false);
  });

  it('een houding vanaf 10 seconden', () => {
    const e = workout([row('a', { done: true, reps: 1, seconds: 10 }), row('b', { done: true, reps: 1, seconds: 9 })]);
    expect(asksClean(e, 'a', ex('dead-hang'))).toBe(true);
    expect(asksClean(e, 'b', ex('dead-hang'))).toBe(false);
  });

  it('Ja, Nee en niets geven waar, onwaar of leeg', () => {
    const e = workout([row('a', { done: true })]);
    expect(withClean(e, 'a', true).rows[0].clean).toBe(true);
    expect(withClean(e, 'a', false).rows[0].clean).toBe(false);
    const cleared = withClean(withClean(e, 'a', false), 'a', undefined).rows[0];
    expect('clean' in cleared).toBe(false);
  });
});

describe('extra gewicht op Pull-Up en Dip', () => {
  it('telt voor de stap met gewicht vanaf 2,5 kg, zonder band', () => {
    expect(countsForLine(ex('pull-up'), { kind: 'work', weightKg: 5 })).toBe(`Telt voor ${ex('weighted-pull-up').name}.`);
    expect(countsForLine(ex('pull-up'), { kind: 'work', weightKg: 2.5 })).toBe(`Telt voor ${ex('weighted-pull-up').name}.`);
    expect(countsForLine(ex('dip'), { kind: 'work', weightKg: 10 })).toBe(`Telt voor ${ex('weighted-dip').name}.`);
    expect(countsForLine(ex('pull-up'), { kind: 'work', weightKg: 2 })).toBeUndefined();
    expect(countsForLine(ex('pull-up'), { kind: 'work', weightKg: 5, band: 'licht' })).toBeUndefined();
    expect(countsForLine(ex('pull-up'), { kind: 'warmup', weightKg: 5 })).toBeUndefined();
    expect(countsForLine(ex('negative-chin-up'), { kind: 'work', weightKg: 5 })).toBeUndefined();
    expect(countsForLine(ex('weighted-pull-up'), { kind: 'work', weightKg: 5 })).toBeUndefined();
  });
});

import { describe, expect, it } from 'vitest';
import { appendEvents, becauseText, cleanForgeLog, deriveChanges, FORGE_LOG_MAX, isOpen, MERGE_MS, noFitEvent, setLabel, spotterEvents, stateText, underRangeEvent, unseenCount, type ForgeEvent } from './forgeLog';
import type { WorkoutExercise, WorkoutRow } from './forgeWorkout';

const row = (i: number, extra: Partial<WorkoutRow> = {}): WorkoutRow => ({
  id: `bench:s${i}`, kind: 'work', target: { repsLow: 8, repsHigh: 10, rir: 2 }, weightKg: 62.5, reps: 8, done: false, ...extra,
});
const exercise = (rows: WorkoutRow[]): WorkoutExercise => ({ slot: 'bench', exerciseId: 'bench-press', name: 'Barbell Bench Press', known: true, rows, restSec: 120, timed: false });
let n = 0;
const id = () => `ev${++n}`;
const T0 = 1_700_000_000_000;

describe('deriveChanges', () => {
  const before = [exercise([row(0, { done: true }), row(1), row(2)])];

  it('een eigen aanpassing is een gebeurtenis van de soort eigen, met van en naar', () => {
    const after = [exercise([row(0, { done: true }), row(1, { weightKg: 60 }), row(2)])];
    const out = deriveChanges(before, after, { kind: 'eigen', edited: { slot: 'bench', rowId: 'bench:s1' } }, T0, id);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ kind: 'eigen', set: '2', from: { kg: 62.5, reps: 8 }, to: { kg: 60, reps: 8 }, exercise: 'Barbell Bench Press' });
  });

  it('wat in latere werksets meeveranderde is doorgevoerd, met de set waar het vandaan kwam', () => {
    const after = [exercise([row(0, { done: true }), row(1, { weightKg: 60 }), row(2, { weightKg: 60 })])];
    const out = deriveChanges(before, after, { kind: 'eigen', edited: { slot: 'bench', rowId: 'bench:s1' } }, T0, id);
    expect(out.map((e) => [e.set, e.kind])).toEqual([['2', 'eigen'], ['3', 'doorgevoerd']]);
    expect(out[1].via).toBe('2');
    expect(becauseText(out[1])).toBe('Doorgevoerd vanuit set 2.');
  });

  it('opwarmsets die vanzelf meeschuiven zijn geen gebeurtenis', () => {
    const w = (kg: number): WorkoutRow => ({ id: 'bench:w0', kind: 'warmup', target: { repsLow: 5, repsHigh: 5 }, weightKg: kg, reps: 5, done: false });
    const b = [exercise([w(30), row(1)])];
    const a = [exercise([w(25), row(1, { weightKg: 50 })])];
    const out = deriveChanges(b, a, { kind: 'eigen', edited: { slot: 'bench', rowId: 'bench:s1' } }, T0, id);
    expect(out.map((e) => e.set)).toEqual(['1']);
  });

  it('Lichter is bijgestuurd', () => {
    const after = [exercise([row(0, { done: true }), row(1, { weightKg: 60 }), row(2, { weightKg: 60 })])];
    const out = deriveChanges(before, after, { kind: 'bijgestuurd' }, T0, id);
    expect(out.map((e) => e.kind)).toEqual(['bijgestuurd', 'bijgestuurd']);
    expect(becauseText(out[0])).toBe('Forge stuurde bij: je koos Lichter.');
  });

  it('afvinken, een nieuwe planning en een geruilde oefening zijn geen gebeurtenis', () => {
    const ticked = [exercise([row(0, { done: true }), row(1, { done: true, rir: 2, rirAssumed: true }), row(2)])];
    expect(deriveChanges(before, ticked, { kind: 'eigen' }, T0, id)).toEqual([]);
    const after = [exercise([row(0, { done: true }), row(1, { weightKg: 60 }), row(2)])];
    expect(deriveChanges(before, after, { kind: 'negeer' }, T0, id)).toEqual([]);
    const swapped = [{ ...after[0], exerciseId: 'incline-bench-press' }];
    expect(deriveChanges(before, swapped, { kind: 'eigen' }, T0, id)).toEqual([]);
  });

  it('niets veranderd, niets gelogd', () => {
    expect(deriveChanges(before, before, { kind: 'eigen' }, T0, id)).toEqual([]);
  });
});

describe('appendEvents', () => {
  const ev = (at: number, to: ForgeEvent['to'], from: ForgeEvent['from'] = { kg: 62.5, reps: 8 }, kind: ForgeEvent['kind'] = 'eigen'): ForgeEvent => ({ id: id(), at, exerciseId: 'bench-press', exercise: 'Barbell Bench Press', rowId: 'bench:s1', set: '2', kind, from, to });

  it('typen in meerdere stappen is één handeling: begin van de eerste, einde van de laatste', () => {
    const log = appendEvents(appendEvents([], [ev(T0, { kg: 6, reps: 8 })]), [ev(T0 + 2000, { kg: 60, reps: 8 }, { kg: 6, reps: 8 })]);
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ at: T0 + 2000, from: { kg: 62.5, reps: 8 }, to: { kg: 60, reps: 8 } });
  });

  it('terug naar het begin haalt de gebeurtenis weg', () => {
    const log = appendEvents(appendEvents([], [ev(T0, { kg: 60, reps: 8 })]), [ev(T0 + 1000, { kg: 62.5, reps: 8 }, { kg: 60, reps: 8 })]);
    expect(log).toEqual([]);
  });

  it('een wijziging lang daarna is een nieuwe gebeurtenis', () => {
    const log = appendEvents(appendEvents([], [ev(T0, { kg: 60, reps: 8 })]), [ev(T0 + MERGE_MS + 1, { kg: 57.5, reps: 8 }, { kg: 60, reps: 8 })]);
    expect(log).toHaveLength(2);
  });

  it('bijsturen wordt nooit samengevoegd', () => {
    const a = ev(T0, { kg: 60, reps: 8 }, { kg: 62.5, reps: 8 }, 'bijgestuurd');
    const b = ev(T0 + 1000, { kg: 57.5, reps: 8 }, { kg: 60, reps: 8 }, 'bijgestuurd');
    expect(appendEvents(appendEvents([], [a]), [b])).toHaveLength(2);
  });

  it('houdt hoogstens FORGE_LOG_MAX gebeurtenissen, de oudste vallen af', () => {
    const many = Array.from({ length: FORGE_LOG_MAX + 5 }, (_, i) => ({ ...ev(T0 + i * 10 * MERGE_MS, { kg: i }), rowId: `r${i}` }));
    const log = appendEvents([], many);
    expect(log).toHaveLength(FORGE_LOG_MAX);
    expect(log[0].rowId).toBe('r5');
  });
});

describe('meldingen en hun oplossing', () => {
  const ex = exercise([row(0, { done: true }), row(1), row(2)]);
  const fit = { rowId: 'bench:s1', setNo: 2, weightKg: 62.5, repsLow: 8, repsHigh: 10 };

  it('past-niet zegt welke set en is open tot die set is opgelost', () => {
    const e = noFitEvent(ex, fit, T0, id())!;
    expect(e).toMatchObject({ kind: 'past-niet', set: '2', fact: 'Geen gewicht van dit toestel past bij 8 tot 10 herhalingen.' });
    expect(isOpen(e, [ex])).toBe(true);
    expect(isOpen(e, [exercise([row(0, { done: true }), row(1, { edited: true }), row(2)])])).toBe(false);
    expect(isOpen(e, [exercise([row(0, { done: true }), row(1, { weightKg: 55 }), row(2)])])).toBe(false);
    expect(isOpen(e, [exercise([row(0, { done: true }), row(1, { done: true }), row(2)])])).toBe(false);
  });

  it('een set onder het bereik is een feit met het bereik erbij', () => {
    const e = underRangeEvent(ex, row(0, { done: true, reps: 6, rir: 1 }), T0, id());
    expect(e.kind).toBe('onder');
    expect(e.fact).toBe('Onder het bereik van 8 tot 10 herhalingen met 2 over.');
    expect(stateText(e.to)).toBe('62,5 kg × 6');
  });

  it('de stip telt wat Forge deed, niet wat je zelf deed, en geen opgeloste melding', () => {
    const own: ForgeEvent = { id: 'a', at: T0 + 10, exerciseId: 'bench-press', exercise: 'x', rowId: 'bench:s1', set: '2', kind: 'eigen' };
    const lighter: ForgeEvent = { ...own, id: 'b', kind: 'bijgestuurd' };
    const nofit = noFitEvent(ex, fit, T0 + 20, 'c')!;
    expect(unseenCount([own], T0, [ex])).toBe(0);
    expect(unseenCount([own, lighter, nofit], T0, [ex])).toBe(2);
    expect(unseenCount([own, lighter, nofit], T0 + 15, [ex])).toBe(1);
    const solved = exercise([row(0, { done: true }), row(1, { edited: true }), row(2)]);
    expect(unseenCount([own, lighter, nofit], T0, [solved])).toBe(1);
  });
});

describe('zonder spotter in het verloop', () => {
  it('het spotterteken staat al bij de set en telt niet mee voor de stip', () => {
    const ex = exercise([row(0, { target: { repsLow: 8, repsHigh: 10, rir: 1, spotter: true } })]);
    expect(unseenCount(spotterEvents([ex], T0 + 5, id), T0, [ex])).toBe(0);
  });

  it('één gebeurtenis per oefening met de sets waar de reserve omhoog ging', () => {
    const ex = exercise([row(0, { target: { repsLow: 8, repsHigh: 10, rir: 1, spotter: true } }), row(1, { target: { repsLow: 8, repsHigh: 10, rir: 1, spotter: true } }), row(2, { target: { repsLow: 8, repsHigh: 10, rir: 2 } })]);
    const out = spotterEvents([ex], T0, id);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ kind: 'spotter', set: '1 tot 2', to: { rir: 1 } });
    expect(setLabel(ex, 'bench:s2')).toBe('3');
  });
  it('zonder gemarkeerde sets geen gebeurtenis', () => {
    expect(spotterEvents([exercise([row(0)])], T0, id)).toEqual([]);
  });
});

describe('cleanForgeLog', () => {
  const good = { id: 'a', at: T0, exerciseId: 'bench-press', exercise: 'Bench', rowId: 'r1', set: '1', kind: 'eigen', from: { kg: 60, reps: 8 }, to: { kg: 62.5, reps: 8, rir: 2 } };

  it('houdt wat heel is en laat de rest vallen', () => {
    const out = cleanForgeLog([good, { ...good, id: 'b', kind: 'raar' }, { ...good, id: 'c', at: 'gisteren' }, null, 7, { ...good, id: 'd', exercise: '' }, { ...good, id: 'a' }]);
    expect(out?.map((e) => e.id)).toEqual(['a']);
  });
  it('schoont de stand op en sorteert op tijd', () => {
    const out = cleanForgeLog([{ ...good, id: 'z', at: T0 + 5, to: { kg: 'zwaar', reps: 8, rir: 99 } }, good]);
    expect(out?.map((e) => e.id)).toEqual(['a', 'z']);
    expect(out?.[1].to).toEqual({ reps: 8 });
  });
  it('geeft niets terug voor rommel of een lege lijst', () => {
    expect(cleanForgeLog(undefined)).toBeUndefined();
    expect(cleanForgeLog('x')).toBeUndefined();
    expect(cleanForgeLog([])).toBeUndefined();
    expect(cleanForgeLog([{ nope: 1 }])).toBeUndefined();
  });
});

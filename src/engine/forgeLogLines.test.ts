import { describe, expect, it } from 'vitest';
import { joinReasons, linesPerSet, resolveForgeLogView, setCountEvent, spotterEvents, underRangeEvent, type ForgeEvent } from './forgeLog';
import type { WorkoutExercise, WorkoutRow } from './forgeWorkout';
import type { ExerciseSetLog } from '../models/training';

// Nagemaakte training: een leg press met drie werksets en een opwarmset.
const T0 = 1_700_000_000_000;
const row = (id: string, extra: Partial<WorkoutRow> = {}): WorkoutRow => ({
  id, kind: 'work', target: { repsLow: 8, repsHigh: 10, rir: 1 }, weightKg: 80, reps: 10, done: true, ...extra,
});
const exercise = (rows: WorkoutRow[]): WorkoutExercise => ({ slot: 'lp', exerciseId: 'leg-press', name: 'Pin-Loaded Leg Press', known: true, rows, restSec: 120, timed: false });
const ev = (e: Partial<ForgeEvent> & Pick<ForgeEvent, 'kind' | 'rowId' | 'set'>): ForgeEvent => ({ id: `${e.kind}-${e.rowId}-${e.at ?? 0}`, at: T0, exerciseId: 'leg-press', exercise: 'Pin-Loaded Leg Press', ...e });

describe('linesPerSet', () => {
  it('set 3 met eigen en onder is een regel, met beide redenen in een zin', () => {
    const rows = [row('w1', { kind: 'warmup', weightKg: 40, reps: 8, rir: undefined }), row('s1'), row('s2'), row('s3', { weightKg: 85, reps: 7, rir: 0 })];
    const ex = exercise(rows);
    const events = [
      ev({ kind: 'eigen', rowId: 's3', set: '3', at: T0, from: { kg: 80, reps: 10 }, to: { kg: 85, reps: 10 } }),
      underRangeEvent(ex, rows[3], T0 + 1000, 'u3'),
    ];
    const out = linesPerSet(events, { workout: [ex], view: 'wijzigingen' });
    expect(out).toHaveLength(1);
    expect(out[0].lines).toHaveLength(1);
    const line = out[0].lines[0];
    expect(line).toMatchObject({ set: '3', kg: 85, reps: 7, rir: 0, changed: true });
    expect(line.reason).toBe('Zelf aangepast en onder het bereik van 8 tot 10 herhalingen met 1 over.');
  });

  it('set 1 die werd aangepast voor de RIR-keuze toont de RIR van nu: 0', () => {
    const ex = exercise([row('s1', { weightKg: 85, reps: 8, rir: 0 }), row('s2', { done: false })]);
    const events = [ev({ kind: 'eigen', rowId: 's1', set: '1', from: { kg: 80, reps: 10, rir: 1 }, to: { kg: 85, reps: 8, rir: 1 } })];
    const [g] = linesPerSet(events, { workout: [ex], view: 'wijzigingen' });
    expect(g.lines[0]).toMatchObject({ set: '1', kg: 85, reps: 8, rir: 0 });
    expect(g.lines[0].rirAssumed).toBeUndefined();
  });

  it('een aangenomen RIR komt mee als aangenomen', () => {
    const ex = exercise([row('s1', { rir: 1, rirAssumed: true }), row('s2')]);
    const [g] = linesPerSet([], { workout: [ex], view: 'alle' });
    expect(g.lines[0]).toMatchObject({ rir: 1, rirAssumed: true });
  });

  it('een set die werd weggehaald en weer toegevoegd is een regel', () => {
    const removed = row('s3');
    const back = row('s3b', { weightKg: 75, reps: 10, rir: 2 });
    const ex = exercise([row('s1'), row('s2'), back]);
    const events = [
      setCountEvent('weggehaald', ex, removed, '3', T0, 'e1'),
      setCountEvent('toegevoegd', ex, back, '3', T0 + 5000, 'e2'),
    ];
    const [g] = linesPerSet(events, { workout: [ex], view: 'wijzigingen' });
    expect(g.lines).toHaveLength(1);
    expect(g.lines[0]).toMatchObject({ set: '3', kg: 75, rir: 2 });
    expect(g.lines[0].removed).toBeUndefined();
    expect(g.lines[0].reason).toBe('Weggehaald en weer toegevoegd.');
  });

  it('een weggehaalde set die niet terugkwam blijft een regel, als weggehaald', () => {
    const ex = exercise([row('s1'), row('s2')]);
    const [g] = linesPerSet([setCountEvent('weggehaald', ex, row('s3'), '3', T0, 'e1')], { workout: [ex], view: 'alle' });
    expect(g.lines.map((l) => l.set)).toEqual(['1', '2', '3']);
    expect(g.lines[2]).toMatchObject({ removed: true, reason: 'Zelf weggehaald.' });
    expect(g.lines[2].heaviest).toBeUndefined();
  });

  it('een oud log zonder RIR-velden en met kapotte sets leest zonder fout', () => {
    const logged = [{ exerciseId: 'leg-press', exerciseName: 'Leg Press', sets: [{ reps: 10, weightKg: 80 }, null, { reps: 9, weightKg: 85, rir: 'x' }] }] as unknown as ExerciseSetLog[];
    const events = [ev({ kind: 'eigen', rowId: 'a', set: '2', from: { kg: 80 }, to: { kg: 85 } })];
    const [g] = linesPerSet(events, { logged, view: 'alle' });
    expect(g.lines.map((l) => l.set)).toEqual(['1', '2']);
    expect(g.lines[1]).toMatchObject({ kg: 85, reps: 9, changed: true, reason: 'Zelf aangepast.' });
    expect(g.lines[1].rir).toBeUndefined();
    expect(g.lines[1].heaviest).toBe(true);
  });

  it('een training zonder wijzigingen: Wijzigingen is leeg, Alle sets toont alles', () => {
    const ex = exercise([row('w1', { kind: 'warmup', weightKg: 40, rir: undefined }), row('s1'), row('s2', { weightKg: 85, reps: 8 })]);
    expect(linesPerSet([], { workout: [ex], view: 'wijzigingen' })).toEqual([]);
    const [g] = linesPerSet([], { workout: [ex], view: 'alle' });
    expect(g.lines.map((l) => l.set)).toEqual(['W1', '1', '2']);
    expect(g.lines.every((l) => l.reason === '' && !l.changed)).toBe(true);
    expect(g.lines.find((l) => l.heaviest)?.set).toBe('2');
  });

  it('in het logboek zonder workout: de gelogde sets met hun nummers en het verloop erbij', () => {
    const logged: ExerciseSetLog[] = [{ exerciseId: 'leg-press', exerciseName: 'Pin-Loaded Leg Press', sets: [
      { reps: 8, weightKg: 40, kind: 'warmup' },
      { reps: 10, weightKg: 80, rir: 1, rirAssumed: true, kind: 'work' },
      { reps: 7, weightKg: 85, rir: 0, kind: 'work' },
    ] }];
    const events = [
      ev({ kind: 'meegerekend', rowId: 's2', set: '2', at: T0, from: { kg: 80, reps: 10 }, to: { kg: 85, reps: 8 } }),
      ev({ kind: 'eigen', rowId: 's2', set: '2', at: T0 + 1000, from: { kg: 85, reps: 8 }, to: { kg: 85, reps: 7 } }),
    ];
    const changes = linesPerSet(events, { logged, view: 'wijzigingen' });
    expect(changes[0].lines).toHaveLength(1);
    expect(changes[0].lines[0]).toMatchObject({ set: '2', kg: 85, reps: 7, rir: 0, heaviest: true });
    expect(changes[0].lines[0].reason).toBe('Zwaarder gezet omdat je vorige set makkelijker ging dan gepland en zelf aangepast.');
    const all = linesPerSet(events, { logged, view: 'alle' });
    expect(all[0].lines.map((l) => [l.set, l.rirAssumed ?? false])).toEqual([['W1', false], ['1', true], ['2', false]]);
  });

  it('zonder workout en log: de stand komt uit het verloop zelf', () => {
    const events = [ev({ kind: 'eigen', rowId: 's1', set: '1', from: { kg: 80 }, to: { kg: 82.5, reps: 9, rir: 1 } })];
    const [g] = linesPerSet(events, { view: 'wijzigingen' });
    expect(g.lines[0]).toMatchObject({ set: '1', kg: 82.5, reps: 9, rir: 1 });
    expect(g.lines[0].done).toBeUndefined();
  });

  it('de spotterregel hoort bij elke set uit het voorschrift, maar is geen wijziging', () => {
    const ex = { ...exercise([row('s1', { target: { repsLow: 5, repsHigh: 5, rir: 1, spotter: true } }), row('s2', { target: { repsLow: 5, repsHigh: 5, rir: 1, spotter: true } })]) };
    const events = spotterEvents([ex], T0, () => 'sp');
    expect(linesPerSet(events, { workout: [ex], view: 'wijzigingen' })).toEqual([]);
    const [g] = linesPerSet(events, { workout: [ex], view: 'alle' });
    expect(g.lines.map((l) => l.reason)).toEqual(['Zonder spotter minstens 1 over.', 'Zonder spotter minstens 1 over.']);
  });

  it('een set die alleen in het verloop staat, telt niet als zwaarste set', () => {
    const logged: ExerciseSetLog[] = [{ exerciseId: 'leg-press', exerciseName: 'Leg Press', sets: [{ reps: 10, weightKg: 80, kind: 'work' }, { reps: 10, weightKg: 82.5, kind: 'work' }] }];
    const events = [ev({ kind: 'eigen', rowId: 'x', set: '3', from: { kg: 80 }, to: { kg: 100, reps: 5 } })];
    const [g] = linesPerSet(events, { logged, view: 'alle' });
    expect(g.lines.find((l) => l.heaviest)?.set).toBe('2');
  });

  it('twee keer weghalen en een keer toevoegen: een regel terug, een blijft weggehaald', () => {
    const back = row('s3c', { weightKg: 70, rir: 2 });
    const ex = exercise([row('s1'), row('s2'), back]);
    const events = [
      setCountEvent('weggehaald', ex, row('s3'), '3', T0, 'e1'),
      setCountEvent('toegevoegd', ex, row('s3b'), '3', T0 + 1000, 'e2'),
      setCountEvent('weggehaald', ex, row('s3b'), '3', T0 + 2000, 'e3'),
      setCountEvent('toegevoegd', ex, back, '3', T0 + 3000, 'e4'),
    ];
    const [g] = linesPerSet(events, { workout: [ex], view: 'wijzigingen' });
    expect(g.lines.filter((l) => l.set === '3' && !l.removed)).toHaveLength(1);
    expect(g.lines.find((l) => l.key.endsWith('s3c'))).toMatchObject({ kg: 70, reason: 'Weggehaald en weer toegevoegd.' });
  });

  it('een oud log zonder rij-id koppelt op nummer; een set die niet in het log staat is niet gedaan', () => {
    // Bewust meebewogen (11 november, Warden M1 en M3): eerst legde deze test vast dat zo'n set ongemarkeerd bleef.
    const logged: ExerciseSetLog[] = [{ exerciseId: 'leg-press', exerciseName: 'Leg Press', sets: [{ reps: 10, weightKg: 80, kind: 'work' }, { reps: 8, weightKg: 85, kind: 'work' }] }];
    const events = [ev({ kind: 'eigen', rowId: 's3', set: '3', from: { kg: 80 }, to: { kg: 85 } })];
    const [g] = linesPerSet(events, { logged, view: 'wijzigingen' });
    expect(g.lines).toHaveLength(1);
    expect(g.lines[0]).toMatchObject({ set: '3', kg: 85, skipped: true, done: false });
  });

  it('een log met rij-id koppelt op rij: set 1 open, set 2 aangepast, set 3 onder het bereik', () => {
    // Nagespeeld door Warden: zonder rij-id kwam de reden bij de verkeerde set en stond "Set 3" er twee keer.
    const logged: ExerciseSetLog[] = [{ exerciseId: 'leg-press', exerciseName: 'Leg Press', sets: [
      { reps: 10, weightKg: 85, kind: 'work', rowId: 's2' },
      { reps: 6, weightKg: 85, rir: 0, kind: 'work', rowId: 's3' },
    ] }];
    const events = [
      ev({ kind: 'eigen', rowId: 's2', set: '2', at: T0, from: { kg: 80 }, to: { kg: 85 } }),
      ev({ kind: 'onder', rowId: 's3', set: '3', at: T0 + 1000, to: { kg: 85, reps: 6 }, fact: 'Onder het bereik van 8 tot 10 herhalingen.' }),
    ];
    const [g] = linesPerSet(events, { logged, view: 'alle' });
    expect(g.lines.map((l) => [l.set, l.reason])).toEqual([['1', 'Zelf aangepast.'], ['2', 'Onder het bereik van 8 tot 10 herhalingen.']]);
    expect(g.lines.every((l) => !l.skipped)).toBe(true);
  });

  it('een gebeurtenis bij een set die niet gelogd is, wordt na afloop een gedimde regel "niet gedaan"', () => {
    const logged: ExerciseSetLog[] = [{ exerciseId: 'leg-press', exerciseName: 'Leg Press', sets: [{ reps: 10, weightKg: 80, kind: 'work', rowId: 's1' }] }];
    const events = [ev({ kind: 'meegerekend', rowId: 's2', set: '2', from: { kg: 80, reps: 10 }, to: { kg: 85, reps: 8 } })];
    const [g] = linesPerSet(events, { logged, view: 'wijzigingen' });
    expect(g.lines[0]).toMatchObject({ set: '2', kg: 85, skipped: true, done: false });
    expect(g.lines[0].heaviest).toBeUndefined();
  });

  it('een spotterregel "1 tot 3" met twee gelogde sets geeft geen lege derde regel', () => {
    const logged: ExerciseSetLog[] = [{ exerciseId: 'leg-press', exerciseName: 'Leg Press', sets: [{ reps: 5, weightKg: 100, kind: 'work', rowId: 's1' }, { reps: 5, weightKg: 100, kind: 'work', rowId: 's2' }] }];
    const events = [ev({ kind: 'spotter', rowId: 's1', set: '1 tot 3', to: { rir: 1 } })];
    const [g] = linesPerSet(events, { logged, view: 'alle' });
    expect(g.lines.map((l) => l.set)).toEqual(['1', '2']);
    expect(g.lines.every((l) => l.reason === 'Zonder spotter minstens 1 over.')).toBe(true);
  });

  it('dezelfde oefening twee keer in een log geeft twee blokken met eigen sleutels', () => {
    const one = { exerciseId: 'leg-press', exerciseName: 'Leg Press', sets: [{ reps: 10, weightKg: 80, kind: 'work' as const }] };
    const out = linesPerSet([], { logged: [one, one], view: 'alle' });
    expect(out).toHaveLength(2);
    const keys = out.flatMap((g) => [g.key, ...g.lines.map((l) => l.key)]);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('Alle sets tijdens de training: gedane sets en sets met een reden, geen open sets zonder reden', () => {
    const ex = exercise([row('s1'), row('s2', { done: false }), row('s3', { done: false })]);
    const events = [ev({ kind: 'meegerekend', rowId: 's3', set: '3', from: { kg: 80 }, to: { kg: 77.5 } })];
    const [g] = linesPerSet(events, { workout: [ex], view: 'alle' });
    expect(g.lines.map((l) => l.set)).toEqual(['1', '3']);
  });

  it('dezelfde reden twee keer staat er een keer', () => {
    expect(joinReasons(['zelf aangepast', 'zelf aangepast'])).toBe('Zelf aangepast.');
    expect(joinReasons(['a', 'b', 'c'])).toBe('A, b en c.');
    expect(joinReasons([])).toBe('');
  });

  it('Verloop toont: Wijzigingen is het advies, iets geks ook', () => {
    expect(resolveForgeLogView(undefined)).toBe('wijzigingen');
    expect(resolveForgeLogView({ forgeLogView: 'alle' })).toBe('alle');
    expect(resolveForgeLogView({ forgeLogView: 3 })).toBe('wijzigingen');
  });
});

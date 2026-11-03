import { describe, expect, it } from 'vitest';
import { exerciseById } from '../data/exercises';
import { addedSlotsFor, canAddExercise, sessionPrescription, isAddedSlot, normalizeAddedExercises, withAddedExercise, withoutAddedSlot, workoutWithoutAdded, MAX_ADDED_PER_TEMPLATE, MAX_ADDED_TEMPLATES, type AddedExercises } from './addedExercises';
import type { WorkoutExercise } from './forgeWorkout';
import { forgeSlotsFor } from './forgeSlots';
import { exerciseKey } from './strengthHistory';

describe('toegevoegde oefeningen', () => {
  it('leest alleen bekende oefeningen, zonder dubbele, en negeert rommel', () => {
    expect(normalizeAddedExercises(undefined)).toBeUndefined();
    expect(normalizeAddedExercises('ja')).toBeUndefined();
    expect(normalizeAddedExercises({ tpl_x: ['tibialis-raise', 'tibialis-raise', 'bestaat-niet', 4] })).toEqual({ tpl_x: ['tibialis-raise'] });
    expect(normalizeAddedExercises({ tpl_x: 'tibialis-raise' })).toBeUndefined();
  });

  it('voegt toe na Akkoord, één keer, en hoogstens drie per training', () => {
    const ids = ['tpl_x'];
    let m = withAddedExercise<{ addedExercises?: AddedExercises }>({}, 'tpl_x', 'tibialis-raise', ids);
    expect(m.addedExercises).toEqual({ tpl_x: ['tibialis-raise'] });
    expect(withAddedExercise(m, 'tpl_x', 'tibialis-raise', ids)).toBe(m);
    m = withAddedExercise(m, 'tpl_x', 'bodyweight-calf-raise', ids);
    m = withAddedExercise(m, 'tpl_x', 'glute-bridge', ids);
    expect(m.addedExercises!.tpl_x).toHaveLength(MAX_ADDED_PER_TEMPLATE);
    expect(canAddExercise(m, 'tpl_x', ids)).toBe(false);
    expect(withAddedExercise(m, 'tpl_x', 'hip-thrust', ids)).toBe(m);
  });

  it('ruimt toevoegingen op bij sjablonen die er niet meer zijn, en voegt niets toe aan een onbekend sjabloon', () => {
    const m = withAddedExercise({ addedExercises: { tpl_weg: ['glute-bridge'] } }, 'tpl_x', 'tibialis-raise', ['tpl_x']);
    expect(m.addedExercises).toEqual({ tpl_x: ['tibialis-raise'] });
    const same = { addedExercises: {} };
    expect(withAddedExercise(same, 'tpl_onbekend', 'tibialis-raise', ['tpl_x'])).toBe(same);
  });

  it('bij twintig trainingen met een toevoeging is er geen plek voor een nieuwe training', () => {
    const ids = Array.from({ length: MAX_ADDED_TEMPLATES }, (_, i) => `tpl_${i}`);
    const full = { addedExercises: Object.fromEntries(ids.map((id) => [id, ['tibialis-raise']])) };
    expect(canAddExercise(full, 'tpl_nieuw', [...ids, 'tpl_nieuw'])).toBe(false);
    expect(canAddExercise(full, 'tpl_0', ids)).toBe(true);
    // Is een van die sjablonen weg, dan komt er plek.
    expect(canAddExercise(full, 'tpl_nieuw', [...ids.slice(1), 'tpl_nieuw'])).toBe(true);
  });

  it('een oefening die al in de training zit komt er niet nog eens bij', () => {
    const model = { addedExercises: { tpl_x: ['tibialis-raise', 'glute-bridge'] } };
    const slots = addedSlotsFor(model, 'tpl_x', [{ id: 'ex1', exerciseName: 'Tibialis Raise', sets: 3, reps: '15', priority: 'core' }]);
    expect(slots.map((s) => s.id)).toEqual(['plus:glute-bridge']);
  });

  it('forgeSlotsFor: het sjabloon met daarachter de toevoegingen, zonder dubbele', () => {
    const template = { id: 'tpl_x', exercises: [{ id: 'ex1', exerciseName: 'Glute Bridge', sets: 3, reps: '10', priority: 'core' as const }] };
    const slots = forgeSlotsFor(template, { addedExercises: { tpl_x: ['glute-bridge', 'tibialis-raise'] } }, '2026-11-02');
    expect(slots.map((s) => s.id)).toEqual(['ex1', 'plus:tibialis-raise']);
    expect(forgeSlotsFor({ id: 'tpl_y' }, undefined, '2026-11-02')).toEqual([]);
  });

  it('uit een lopende training: alleen weg als er nog niets is afgevinkt', () => {
    const ex = (slot: string, done: boolean): WorkoutExercise => ({ slot, rows: [{ id: `${slot}:s1`, done }, { id: `${slot}:s2`, done: false }] }) as unknown as WorkoutExercise;
    const workout = [ex('ex1', false), ex('plus:tibialis-raise', true)];
    expect(workoutWithoutAdded(workout, 'plus:tibialis-raise')).toBe(workout);
    expect(workoutWithoutAdded([ex('ex1', false), ex('plus:tibialis-raise', false)], 'plus:tibialis-raise').map((e) => e.slot)).toEqual(['ex1']);
    expect(workoutWithoutAdded(workout, 'bestaat-niet')).toBe(workout);
  });

  it('Ruilen na Uit deze training halen: het voorschrift van de sessie, nooit stil niets', () => {
    const rows = [{ id: 'w', kind: 'warmup', done: true }, { id: 's1', kind: 'work', done: true }, { id: 's2', kind: 'work', done: false }];
    const kept = { slot: 'plus:tibialis-raise', rows } as unknown as WorkoutExercise;
    // De oefening staat niet meer in de training, wel in de sessie.
    const p = sessionPrescription([], kept);
    expect(p).toMatchObject({ id: 'plus:tibialis-raise', sets: 2, reps: '15-20', priority: 'accessory' });
    expect(exerciseKey(p!.id, p!.exerciseName).exercise?.id).toBe('tibialis-raise');
    // Staat hij er nog wel in, dan geldt het voorschrift van de training.
    const slots = addedSlotsFor({ addedExercises: { tpl_x: ['tibialis-raise'] } }, 'tpl_x');
    expect(sessionPrescription(slots, kept)).toBe(slots[0]);
    expect(sessionPrescription([], { slot: 'ex1', rows } as unknown as WorkoutExercise)).toBeUndefined();
    expect(sessionPrescription([], { slot: 'plus:bestaat-niet', rows } as unknown as WorkoutExercise)).toBeUndefined();
  });

  it('wordt een voorschrift dat Forge herkent, achter de training', () => {
    const slots = addedSlotsFor({ addedExercises: { tpl_x: ['tibialis-raise'] } }, 'tpl_x');
    expect(slots).toHaveLength(1);
    expect(slots[0]).toMatchObject({ sets: 3, reps: '15-20', priority: 'accessory' });
    expect(exerciseKey(slots[0].id, slots[0].exerciseName).exercise?.id).toBe('tibialis-raise');
    expect(addedSlotsFor({ addedExercises: { tpl_x: ['tibialis-raise'] } }, 'tpl_y')).toEqual([]);
    expect(addedSlotsFor(undefined, 'tpl_x')).toEqual([]);
  });

  it('elke toegevoegde oefening wordt door de naam herkend', () => {
    for (const id of ['tibialis-raise', 'bodyweight-calf-raise', 'single-leg-calf-raise', 'glute-bridge', 'hip-thrust']) {
      const [slot] = addedSlotsFor({ addedExercises: { t: [id] } }, 't');
      expect(exerciseKey(slot.id, slot.exerciseName).exercise?.id, id).toBe(exerciseById(id)!.id);
    }
  });

  it('weet welke rij toegevoegd is en haalt hem weer weg', () => {
    const m = { addedExercises: { tpl_x: ['tibialis-raise'] } };
    expect(isAddedSlot(m, 'tpl_x', 'plus:tibialis-raise')).toBe(true);
    expect(isAddedSlot(m, 'tpl_x', 'ex8')).toBe(false);
    expect(isAddedSlot(m, 'tpl_y', 'plus:tibialis-raise')).toBe(false);
    expect(withoutAddedSlot(m, 'tpl_x', 'plus:tibialis-raise').addedExercises).toBeUndefined();
  });
});

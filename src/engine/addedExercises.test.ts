import { describe, expect, it } from 'vitest';
import { exerciseById } from '../data/exercises';
import { addedSlotsFor, isAddedSlot, normalizeAddedExercises, withAddedExercise, withoutAddedSlot, MAX_ADDED_PER_TEMPLATE, type AddedExercises } from './addedExercises';
import { exerciseKey } from './strengthHistory';

describe('toegevoegde oefeningen', () => {
  it('leest alleen bekende oefeningen, zonder dubbele, en negeert rommel', () => {
    expect(normalizeAddedExercises(undefined)).toBeUndefined();
    expect(normalizeAddedExercises('ja')).toBeUndefined();
    expect(normalizeAddedExercises({ tpl_x: ['tibialis-raise', 'tibialis-raise', 'bestaat-niet', 4] })).toEqual({ tpl_x: ['tibialis-raise'] });
    expect(normalizeAddedExercises({ tpl_x: 'tibialis-raise' })).toBeUndefined();
  });

  it('voegt toe na Akkoord, één keer, en hoogstens drie per training', () => {
    let m = withAddedExercise<{ addedExercises?: AddedExercises }>({}, 'tpl_x', 'tibialis-raise');
    expect(m.addedExercises).toEqual({ tpl_x: ['tibialis-raise'] });
    expect(withAddedExercise(m, 'tpl_x', 'tibialis-raise')).toBe(m);
    m = withAddedExercise(m, 'tpl_x', 'bodyweight-calf-raise');
    m = withAddedExercise(m, 'tpl_x', 'glute-bridge');
    expect(m.addedExercises!.tpl_x).toHaveLength(MAX_ADDED_PER_TEMPLATE);
    expect(withAddedExercise(m, 'tpl_x', 'hip-thrust')).toBe(m);
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

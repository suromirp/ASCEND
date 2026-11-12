import { describe, expect, it } from 'vitest';
import { dutchExerciseAlias, noticeExerciseName } from './exerciseNames';
import { EXERCISES, exerciseById } from '../data/exercises';

describe('de Nederlandse naam in een melding', () => {
  it('op één been staan, uit de alias in de data', () => {
    expect(dutchExerciseAlias('single-leg-stance')).toBe('Op één been staan');
    expect(noticeExerciseName('single-leg-stance', 'Single Leg Stance')).toBe('Op één been staan');
  });

  it('de spieren voor de berg: kuiten, scheenspier en bilspieren met hun alias', () => {
    expect(noticeExerciseName('standing-calf-raise', '')).toBe('Kuitheffen gestrekt');
    expect(noticeExerciseName('glute-bridge', '')).toBe('Bilbrug');
  });

  it('zonder Nederlandse alias blijft de eigen naam, en een onbekende id houdt wat je meegeeft', () => {
    expect(noticeExerciseName('tibialis-raise', 'x')).toBe(exerciseById('tibialis-raise')!.name);
    expect(noticeExerciseName('bestaat-niet', 'Eigen oefening')).toBe('Eigen oefening');
  });

  it('de naam in de data zelf verandert niet (Forge, logs en MacroFactor)', () => {
    expect(exerciseById('single-leg-stance')!.name).toBe('Single Leg Stance');
  });

  it('kiest nooit een Engelse alias als Nederlands', () => {
    for (const e of EXERCISES) {
      const nl = dutchExerciseAlias(e.id);
      if (nl) expect(nl).not.toMatch(/\b(with|on|the|and)\b/i);
    }
  });
});

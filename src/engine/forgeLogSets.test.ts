import { describe, expect, it } from 'vitest';
import { appendEvents, becauseText, cleanForgeLog, setCountEvent, unseenCount } from './forgeLog';
import type { WorkoutRow } from './forgeWorkout';

const row: WorkoutRow = { id: 'bench:a1', kind: 'work', target: { repsLow: 8, repsHigh: 10 }, reps: 8, weightKg: 60, done: false };
const ex = { exerciseId: 'bench', name: 'Bankdrukken' };

describe('setCountEvent', () => {
  it('maakt een gebeurtenis voor een toegevoegde set met zijn stand', () => {
    const ev = setCountEvent('toegevoegd', ex, row, '4', 1000, 'e1');
    expect(ev).toMatchObject({ kind: 'toegevoegd', set: '4', to: { kg: 60, reps: 8 } });
    expect(becauseText(ev)).toBe('Je voegde deze set zelf toe.');
  });
  it('maakt een gebeurtenis voor een weggehaalde set, zonder stand', () => {
    const ev = setCountEvent('weggehaald', ex, row, '3', 1000, 'e2');
    expect(ev.to).toBeUndefined();
    expect(becauseText(ev)).toBe('Je haalde deze set zelf weg.');
  });
  it('blijft na opslaan en lezen staan, en geeft geen stip op de knop', () => {
    const log = appendEvents([], [setCountEvent('weggehaald', ex, row, '3', 1000, 'e2')]);
    expect(cleanForgeLog(JSON.parse(JSON.stringify(log)))).toHaveLength(1);
    expect(unseenCount(log, 0, [])).toBe(0);
  });
});

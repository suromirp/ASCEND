import { describe, expect, it } from 'vitest';
import { resolveExerciseArt, showsDrawing, showsExerciseArt } from './exerciseArtSettings';

describe('resolveExerciseArt', () => {
  it('staat standaard op spierkaart en tekening', () => {
    expect(resolveExerciseArt(undefined)).toBe('beide');
    expect(resolveExerciseArt({})).toBe('beide');
    expect(resolveExerciseArt({ exerciseArt: 'iets geks' })).toBe('beide');
    expect(resolveExerciseArt({ exerciseArt: 3 })).toBe('beide');
  });
  it('leest een geldige keuze', () => {
    expect(resolveExerciseArt({ exerciseArt: 'spierkaart' })).toBe('spierkaart');
    expect(resolveExerciseArt({ exerciseArt: 'uit' })).toBe('uit');
  });
  it('zegt wat er getoond wordt', () => {
    expect(showsDrawing('beide')).toBe(true);
    expect(showsDrawing('spierkaart')).toBe(false);
    expect(showsExerciseArt('spierkaart')).toBe(true);
    expect(showsExerciseArt('uit')).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { weekPositionLabel } from './weekLabel';

describe('weekPositionLabel', () => {
  it('telt de week binnen de fase, niet in het programma', () => {
    const position = { weekInPhase: 2, phase: { name: 'Opbouw', weekCount: 18 } } as never;
    expect(weekPositionLabel(position)).toBe('Week 2 van 18, opbouw');
  });
});

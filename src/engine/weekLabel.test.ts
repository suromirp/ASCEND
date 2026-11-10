import { describe, expect, it } from 'vitest';
import { weekHeading, weekPositionLabel } from './weekLabel';
import { layoutWaves } from './programLayout';
import { addDays, resolveProgramWeek } from '../utils/dates';
import type { Program } from '../models/program';

describe('weekPositionLabel', () => {
  it('telt de week binnen de fase, niet in het programma', () => {
    const position = { weekInPhase: 2, phase: { name: 'Opbouw', weekCount: 18 } } as never;
    expect(weekPositionLabel(position)).toBe('Week 2 van 18, opbouw');
  });
});

describe('weekHeading', () => {
  const phased = (weekInPhase: number) => ({ weekInPhase, weekInProgram: 7, phase: { id: 'phase_1', name: 'Basis', weekCount: 18 } }) as never;
  const START = '2026-10-26';
  const golf = (light: boolean): Program => ({ id: 'p', name: 'P', startDate: START, phases: layoutWaves(START, START, 12, START, 0, { length: 4, light }) });

  it('zonder positie blijft de kop "Week" en is de regel leeg', () => {
    expect(weekHeading(null)).toEqual({ title: 'Week', line: '' });
    expect(weekHeading(undefined)).toEqual({ title: 'Week', line: '' });
  });

  it('geeft de week in de fase, niet die van het programma', () => {
    expect(weekHeading(phased(3))).toEqual({ title: 'Week', number: 3, line: 'van 18, basis' });
  });

  it('de laatste week van een fase leest "Week 18 van 18"', () => {
    expect(weekHeading(phased(18))).toEqual({ title: 'Week', number: 18, line: 'van 18, basis' });
  });

  it('kop en regel samen lezen als de tekst van Vandaag', () => {
    const p = phased(3);
    const h = weekHeading(p);
    expect(`${h.title} ${h.number} ${h.line}`).toBe(weekPositionLabel(p));
  });

  it('in een golf staat de tekst van de golf in de regel', () => {
    expect(weekHeading(resolveProgramWeek(golf(true), addDays(START, 7 * 5)))).toEqual({ title: 'Week', number: 2, line: 'van 4 van je golf' });
  });

  it('een vaste week zonder lichte week zegt "Je vaste week"', () => {
    expect(weekHeading(resolveProgramWeek(golf(false), START))).toEqual({ title: 'Je vaste week', line: '' });
  });
});

import { describe, expect, it } from 'vitest';
import { weekHeading, weekPageHeading, weekPositionLabel } from './weekLabel';
import { layoutWaves } from './programLayout';
import { addDays, resolveProgramWeek } from '../utils/dates';
import type { Program } from '../models/program';

describe('weekPositionLabel', () => {
  it('telt de week binnen de fase, met de fase voorop', () => {
    const position = { weekInPhase: 2, phase: { name: 'OPBOUW', weekCount: 18 } } as never;
    expect(weekPositionLabel(position)).toBe('Opbouw, week 2 van 18');
    expect(weekPositionLabel({ weekInPhase: 1, phase: { name: 'NAAR DE START', weekCount: 2 } } as never)).toBe('Naar de start, week 1 van 2');
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

  it('kop en regel noemen dezelfde week en fase als de tekst van Vandaag', () => {
    // De kop van Week houdt zijn grote getal ("Week 3", "van 18, basis"); Vandaag zet de fase voorop
    // ("Basis, week 3 van 18"). Dezelfde getallen en dezelfde fase.
    const p = phased(3);
    const h = weekHeading(p);
    expect(weekPositionLabel(p)).toBe(`Basis, week ${h.number} ${h.line.replace(', basis', '')}`);
  });

  it('in een golf staat de tekst van de golf in de regel', () => {
    expect(weekHeading(resolveProgramWeek(golf(true), addDays(START, 7 * 5)))).toEqual({ title: 'Week', number: 2, line: 'van 4 van je golf' });
  });

  it('een vaste week zonder lichte week zegt "Je vaste week"', () => {
    expect(weekHeading(resolveProgramWeek(golf(false), START))).toEqual({ title: 'Je vaste week', line: '' });
  });
});

describe('weekPageHeading', () => {
  const phased = (weekInPhase: number) => ({ weekInPhase, weekInProgram: 1, phase: { id: 'phase_1', name: 'Basisfase', weekCount: 4 } }) as never;
  const START = '2026-10-26';
  const golf = (light: boolean): Program => ({ id: 'p', name: 'P', startDate: START, phases: layoutWaves(START, START, 12, START, 0, { length: 4, light }) });

  it('het grote getal blijft, de kleine regel noemt de fase en haar lengte zonder het weeknummer nog eens', () => {
    expect(weekPageHeading(phased(1))).toEqual({ title: 'Week', number: 1, line: 'Basisfase van 4 weken' });
    expect(weekPageHeading({ weekInPhase: 1, weekInProgram: 1, phase: { id: 'x', name: 'NAAR DE START', weekCount: 1 } } as never).line).toBe('Naar de start van 1 week');
  });

  it('zonder positie, in een golf en in een vaste week verandert er niets', () => {
    expect(weekPageHeading(null)).toEqual({ title: 'Week', line: '' });
    expect(weekPageHeading(resolveProgramWeek(golf(true), addDays(START, 7 * 5)))).toEqual({ title: 'Week', number: 2, line: 'van 4 van je golf' });
    expect(weekPageHeading(resolveProgramWeek(golf(false), START))).toEqual({ title: 'Je vaste week', line: '' });
  });
});

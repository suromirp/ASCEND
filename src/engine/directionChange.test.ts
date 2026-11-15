import { describe, expect, it } from 'vitest';
import { directionChangeLines, directionChangeTitle } from './directionChange';
import { DIRECTION_IDS } from '../data/directions';

describe('directionChangeLines', () => {
  it('zegt de richting en de week in gewone zinnen', () => {
    const lines = directionChangeLines('maintain', {});
    expect(lines[0]).toBe('Richting: Fit blijven.');
    expect(lines[1]).toBe('Je week: 150 minuten en 2 keer kracht.');
    expect(lines.join(' ')).toMatch(/Geen bergtocht en geen rugzak/);
    expect(lines.join(' ')).toMatch(/Andere sporten die je doet tellen straks gewoon mee/);
  });

  it('noemt het als je onder de richtlijn kiest, zonder waarschuwing', () => {
    const lines = directionChangeLines('easy', {});
    expect(lines[1]).toBe('Je week: 90 minuten en 1 keer kracht. Dat is onder de richtlijn, en dat mag een keuze zijn.');
    expect(lines.join(' ')).toMatch(/herstelloop/);
  });

  it('volgt je eigen weekbudget', () => {
    expect(directionChangeLines('maintain', { weekBudget: { minutes: 180 } })[1]).toBe('Je week: 180 minuten en 2 keer kracht.');
  });

  it('heeft een titel per richting', () => {
    expect(directionChangeTitle('improve')).toBe('Richting: Fitter worden');
  });

  it('geen gedachtestreepjes en geen uitroeptekens', () => {
    for (const id of DIRECTION_IDS) expect(directionChangeLines(id, {}).join(' ')).not.toMatch(/[\u2013\u2014!]/);
  });
  it('noemt met kracht uit geen kracht en toetst alleen de minuten', () => {
    const lines = directionChangeLines('easy', { strengthTraining: false });
    expect(lines[1]).toBe('Je week: 90 minuten. Dat is onder de richtlijn, en dat mag een keuze zijn.');
    expect(directionChangeLines('maintain', { strengthTraining: false })[1]).toBe('Je week: 150 minuten.');
    expect(lines[4]).toBe('Je week bestaat uit lopen. Andere sporten die je doet tellen straks gewoon mee.');
    expect(directionChangeLines('maintain', { strengthTraining: false }).join(' ')).not.toMatch(/kracht/i);
  });
  it('zegt bij Sterker worden met kracht uit niet dat kracht voorop staat', () => {
    const lines = directionChangeLines('stronger', { strengthTraining: false });
    expect(lines[2]).toBe('De duur loopt rustig mee en is elke vierde week wat korter.');
    expect(lines.join(' ')).not.toMatch(/kracht/i);
    expect(directionChangeLines('stronger', {})[2]).toContain('Kracht staat voorop');
  });
});

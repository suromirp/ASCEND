import { describe, expect, it } from 'vitest';
import { noteFor } from './derive';
import { settingsHelp } from '../../data/settingsHelp';

describe('weekbudget zonder kracht', () => {
  it('noemt kracht in de notitie met kracht aan, niet met kracht uit', () => {
    expect(noteFor('weekbudget', true)).toContain('2 keer kracht');
    const uit = noteFor('weekbudget', false);
    expect(uit).not.toMatch(/kracht/i);
    expect(uit).toContain('150 minuten');
  });
  it('geeft Richting dezelfde notitie in beide standen, zonder keren kracht', () => {
    expect(noteFor('richting', false)).toBe(noteFor('richting', true));
    expect(noteFor('richting', false)).not.toMatch(/keer kracht/);
  });
  it('noemt keren kracht in de uitleg van Richting alleen met kracht aan', () => {
    expect(JSON.stringify(settingsHelp('richting', true, true))).toContain('2 keer kracht');
    const uit = settingsHelp('richting', true, false)!;
    expect(JSON.stringify(uit)).not.toMatch(/keer kracht|kracht voorop/);
    expect(uit.points).toHaveLength(3);
  });
  it('geeft een instelling zonder variant dezelfde notitie', () => {
    expect(noteFor('golven', false)).toBe(noteFor('golven', true));
  });
  it('noemt kracht in de uitleg met kracht aan, niet met kracht uit', () => {
    const aan = settingsHelp('weekbudget', true, true)!;
    expect(JSON.stringify(aan)).toContain('2 keer kracht');
    const uit = settingsHelp('weekbudget', true, false)!;
    expect(JSON.stringify(uit)).not.toMatch(/kracht/i);
    expect(uit.points).toHaveLength(3);
  });
});

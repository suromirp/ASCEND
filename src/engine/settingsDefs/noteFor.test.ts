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
  it('geeft een instelling zonder variant dezelfde notitie', () => {
    expect(noteFor('richting', false)).toBe(noteFor('richting', true));
  });
  it('noemt kracht in de uitleg met kracht aan, niet met kracht uit', () => {
    const aan = settingsHelp('weekbudget', true, true)!;
    expect(JSON.stringify(aan)).toContain('2 keer kracht');
    const uit = settingsHelp('weekbudget', true, false)!;
    expect(JSON.stringify(uit)).not.toMatch(/kracht/i);
    expect(uit.points).toHaveLength(3);
  });
});

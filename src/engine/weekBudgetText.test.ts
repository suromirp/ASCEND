import { describe, expect, it } from 'vitest';
import { belowGuidelineLine, weekBudgetAdviceLine, weekBudgetFollowNote } from './weekBudgetText';

const o = { chosen: true, label: 'Fit blijven', minutes: 150, strength: 2, guidelineMinutes: 150, guidelineStrength: 2 };

describe('weekbudget teksten', () => {
  it('kracht aan: advies met kracht', () => {
    expect(weekBudgetAdviceLine(o, true)).toBe('Advies bij Fit blijven: 150 min, 2 keer kracht.');
    expect(weekBudgetAdviceLine({ ...o, chosen: false }, true)).toContain('2 keer kracht. De richtlijn is 150 minuten en 2 keer kracht.');
    expect(weekBudgetFollowNote(true, true)).toContain('krachttrainingen');
  });
  it('kracht uit: geen kracht in de tekst', () => {
    expect(weekBudgetAdviceLine(o, false)).toBe('Advies bij Fit blijven: 150 min.');
    expect(weekBudgetAdviceLine({ ...o, chosen: false }, false)).toBe('Advies: 150 min. De richtlijn is 150 minuten.');
    expect(weekBudgetFollowNote(true, false)).not.toMatch(/kracht(training)?en/);
    expect(weekBudgetFollowNote(false, false)).toBe(weekBudgetFollowNote(false, true));
  });
  it('de richtlijnzin noemt met kracht uit alleen de minuten', () => {
    expect(belowGuidelineLine(true)).toBe('Dit is onder de richtlijn van 150 minuten en 2 keer kracht. Dat mag een keuze zijn.');
    expect(belowGuidelineLine(false, 'Dat')).toBe('Dat is onder de richtlijn van 150 minuten. Dat mag een keuze zijn.');
  });
});

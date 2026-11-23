import { describe, expect, it } from 'vitest';
import { CALM_WORDS, effortWords, forgeLabels, resolveForgeWords } from './forgeWords';
import { INTENSITY } from '../data/workoutStructure';
import { FIRST_STRENGTH_LINE, FORGE_READ_LINES } from '../data/forgeReadLines';

describe('forgeWords', () => {
  it('zonder keuze gewoon; alleen jargon is vaktaal', () => {
    expect(resolveForgeWords(undefined)).toBe('plain');
    expect(resolveForgeWords('x')).toBe('plain');
    expect(resolveForgeWords('jargon')).toBe('jargon');
  });

  it('de koppen: Plan, Over en Zwaarte, of de vaktaal', () => {
    expect(forgeLabels('plain')).toMatchObject({ plan: 'Plan', over: 'Over', effort: 'Zwaarte', reps: 'Herh.', repsSpoken: 'Herhalingen' });
    expect(forgeLabels('jargon')).toMatchObject({ plan: 'Voorschrift', over: 'RIR', effort: 'Zwaarte (RPE)' });
  });

  it('RPE 3-4 wordt gewone woorden, de sjabloontekst blijft staan', () => {
    expect(effortWords('Rustig tempo (RPE 3-4/10).', 'plain')).toBe(`Rustig tempo (${CALM_WORDS}).`);
    expect(effortWords('rustig houden (RPE 3-4)', 'plain')).toBe(`rustig houden (${CALM_WORDS})`);
    expect(effortWords('RPE 5-6', 'plain')).toBe('RPE 5-6');
    expect(effortWords('RPE 3-4', 'jargon')).toBe('RPE 3-4');
    expect(INTENSITY[2].rpe).toBe('RPE 3-4');
  });

  it('het blad Zo lees je dit: Plan, Herh., Over en W, zonder gedachtestreepjes', () => {
    expect(FORGE_READ_LINES.map((l) => l.head)).toEqual(['Plan', 'Herh.', 'Over', 'W']);
    for (const l of FORGE_READ_LINES) expect(`${l.head} ${l.text}`).not.toMatch(/[–—]/);
    expect(FORGE_READ_LINES[2].text).toMatch(/Twijfel je tussen twee, kies de laagste/);
    expect(FIRST_STRENGTH_LINE).toBe('Kies een gewicht dat licht voelt. Je moet er nog een paar over hebben.');
  });
});

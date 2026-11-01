import { describe, expect, it } from 'vitest';

// Het cijferblok mag niet per veld opnieuw monteren: dan klapt het dicht en weer open
// (verschijnanimatie, terugknopstap en hoogte 0 bij elke overgang). De key volgt alleen de epoch.
const read = (name: string): string => Object.entries(SOURCES).find(([p]) => p.endsWith(`/${name}`))?.[1] ?? '';
const SOURCES = import.meta.glob<string>('./*.tsx', { query: '?raw', import: 'default', eager: true });

describe('InputDock in ForgeWorkout', () => {
  const src = read('ForgeWorkout.tsx');
  const at = src.indexOf('<InputDock');
  const tag = src.slice(at, src.indexOf('/>', at));

  it('heeft geen key die het slot, de set of het veld bevat', () => {
    const key = /key=\{([^}]*)\}/.exec(tag)?.[1] ?? '';
    expect(key).not.toMatch(/dock\.(slot|rowId|field)/);
    expect(key).toBe('dockEpoch');
  });

  it('velden en blok dragen data-dock-keep', () => {
    const parts = read('parts.tsx');
    const dock = read('InputDock.tsx');
    expect(parts).toContain('data-dock-keep');
    expect(dock).toContain('data-dock-keep');
  });
});

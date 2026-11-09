import { describe, expect, it } from 'vitest';

// Bewaakt de rij voor een stap, de houding, "Ging het netjes?" en de band in Forge
// (docs/beslissingen/2026-11-09-calisthenics-forge-rij.md): de teksten van het ontwerp, tikdoelen van 44 px,
// alleen tokens, en een verschijning die in Rustig en Uit meteen op de eindstand staat. Vitest leest CSS als lege
// tekst; de regel voor `.mx-row-in` in Rustig staat in src/index.css bij de andere klassen zonder beweging.
const SOURCES = import.meta.glob<string>(['./*.tsx'], { query: '?raw', import: 'default', eager: true });
const read = (f: string): string => SOURCES[f] ?? '';

describe('calisthenics in het workoutscherm', () => {
  const block = read('./ExerciseBlock.tsx');
  const menus = read('./ForgeMenus.tsx');

  it('leest de bestanden', () => {
    for (const src of [block, menus]) expect(src.length).toBeGreaterThan(100);
  });

  it('de rij voor een stap: Stap lichter en Stap zwaarder als TextButton, in zinsletters', () => {
    expect(block).toMatch(/<TextButton className="shrink-0 whitespace-nowrap"[^\n]*>Stap lichter<\/TextButton>/);
    expect(block).toMatch(/<TextButton className="shrink-0 whitespace-nowrap"[^\n]*>Stap zwaarder<\/TextButton>/);
    expect(block).toContain('ladderLines.step');
    expect(block).toContain('ladderLines.test');
    expect(block).toContain('ladderLines.explain');
    expect(block).not.toMatch(/\buppercase\b/);
  });

  it('een houding heeft de kolom sec en de seconden in het cijferblok; extra gewicht heet extra kg', () => {
    expect(block).toContain("ex.timed || ex.hold ? 'sec' : 'Herh.'");
    expect(block).toContain("act.open(ex.slot, row.id, 'seconds')");
    expect(block).toContain("'extra kg'");
  });

  it('Ging het netjes?: Ja en Nee van 44 px hoog, met een eigen verschijning die in Rustig stil staat', () => {
    const ask = block.slice(block.indexOf('function CleanAsk'), block.indexOf('// "70 + 2,3"'));
    expect(ask).toContain('Ging het netjes?');
    expect(ask).toMatch(/h-11 min-w-\[44px\][^"]*rounded-full border/);
    expect(ask).toContain('mx-row-in');
    expect(ask).not.toMatch(/animate-/);
  });

  it('achteraf in het setmenu: drie keuzes', () => {
    for (const t of ['Netjes: ja', 'Netjes: nee', 'Netjes: weet ik niet']) expect(menus).toContain(t);
  });

  it('de band is een Segmented met Geen, en de teksten komen uit de engine', () => {
    expect(block).toContain('<Segmented');
    expect(block).toContain('label="Band"');
    expect(block).toContain("label: 'Geen'");
    expect(block).toContain('BAND_LABEL');
  });

  it('geen hexkleur, geen rgba en niets kleiner dan 12 px in het blok', () => {
    expect(block).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(block).not.toMatch(/rgba?\(/);
    expect(block).not.toMatch(/text-\[(\d|1[01])px\]/);
  });
});

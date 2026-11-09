import { describe, expect, it } from 'vitest';

// Bewaakt de regels van het scherm van de toestelstanden (docs/beslissingen/2026-11-09-forge-toestelstanden.md):
// alleen tokens, niets kleiner dan 12 px, tikdoelen van 44 px, zinsletters, en de bladen door ForgeSheet en Sheet.
const SOURCES = import.meta.glob<string>(['./*.ts', './*.tsx', '../settings/groups/ToestelSheets.tsx'], { query: '?raw', import: 'default', eager: true });
const read = (f: string): string => SOURCES[f] ?? '';
const files = ['./MachineWeights.tsx', './useForgeStands.ts', './InputDock.tsx', '../settings/groups/ToestelSheets.tsx'];

describe('het scherm van de toestelstanden', () => {
  it('leest de bestanden', () => {
    for (const f of files) expect(read(f).length, f).toBeGreaterThan(100);
  });

  for (const f of files) {
    const src = read(f);
    it(`${f}: geen hexkleur, geen rgba, geen uppercase, geen tekst onder 12 px`, () => {
      expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(src).not.toMatch(/rgba?\(/);
      expect(src).not.toMatch(/\buppercase\b/);
      expect(src).not.toMatch(/text-\[(\d|1[01])px\]/);
    });
  }

  it('de chips van een stand zijn minstens 44 bij 44 px en worden doorgestreept', () => {
    const src = read('./MachineWeights.tsx');
    expect(src).toMatch(/min-h-\[44px\] min-w-\[44px\]/);
    expect(src).toContain('line-through');
  });

  it('het blad heeft Stand toevoegen, Veel tegelijk, Standen wissen, Annuleren en een fout bij mislukt opslaan', () => {
    const src = read('./MachineWeights.tsx');
    for (const text of ['Stand toevoegen', 'Veel tegelijk', 'Standen wissen', 'Annuleren', 'Opslaan lukte niet. Probeer het nog eens.', 'Alleen deze standen']) expect(src).toContain(text);
  });

  it('Minder en Meer tonen het doelgewicht, ook voor schermlezers', () => {
    const src = read('./InputDock.tsx');
    expect(src).toContain('Minder, naar');
    expect(src).toContain('Meer, naar');
    expect(src).toContain('text-xs');
  });

  it('de regel in het blok heeft alleen Terugdraaien', () => {
    const src = read('./ExerciseBlock.tsx');
    expect(src).toContain('Terugdraaien');
    expect(src).toContain('act.standUndo()');
  });

  it('Standen wissen heeft Terugdraaien, het formulier heeft geen key, en het keuzestrookje heeft korte woorden', () => {
    const src = read('./MachineWeights.tsx');
    expect(src).toContain('Terugdraaien');
    expect(src).toContain('restoreStandsNow');
    expect(src).not.toMatch(/<MachineWeightsForm key=/);
    expect(src).toContain("label: 'Ook schatten'");
    expect(src).not.toContain('Ook tussenin en erboven schatten');
  });

  it('Rustig en Uit bij Beweging: de nieuwe regels in het blad en onder de bolletjes hebben geen eigen beweging', () => {
    // Beweging komt alleen uit de klassen in index.css, die bij Rustig en Uit op de eindstand staan.
    const sheet = read('./MachineWeights.tsx');
    expect(sheet).not.toMatch(/animate-|transition/);
    const block = read('./ExerciseBlock.tsx');
    const quick = block.slice(block.indexOf('function QuickRir'), block.indexOf('function PrescriptionText'));
    expect(quick).toContain('QUICK_RIR_HINT');
    expect(quick.match(/animate-/g) ?? []).toHaveLength(1);
    expect(quick).not.toMatch(/text-\[(\d|1[01])px\]/);
  });

  it('de regel met Terugdraaien blijft staan bij een volgende tik; alleen een foutregel of Terugdraaien zelf haalt hem weg', () => {
    const src = read('./useForgeStands.ts');
    const tick = src.slice(src.indexOf('const onTick'), src.indexOf('const onOpen'));
    expect(tick).not.toContain('setNote(null)');
  });
});

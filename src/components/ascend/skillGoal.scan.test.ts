import { describe, expect, it } from 'vitest';

// Bewaakt de kaart en het blad van een vaardigheid (docs/beslissingen/2026-11-09-calisthenics-vaardigheidsdoel.md):
// alleen tokens, niets kleiner dan 12 px, tikdoelen van 44 px, zinsletters, geen percentage, en een verschijning die
// in Rustig en Uit meteen op de eindstand staat. Vitest leest CSS als lege tekst; de regel voor `.mx-row-in` in
// Rustig staat in src/index.css bij de andere klassen zonder beweging, Uit zet alles op de eindstand.
const SOURCES = import.meta.glob<string>(['./SkillGoalCard.tsx', './SkillGoalSheet.tsx', './useSkillGoals.ts', '../../pages/Ascend.tsx'], { query: '?raw', import: 'default', eager: true });
const read = (f: string): string => SOURCES[f] ?? '';

describe('de vaardigheid op de Ascend-tab', () => {
  const card = read('./SkillGoalCard.tsx');
  const sheet = read('./SkillGoalSheet.tsx');
  const hook = read('./useSkillGoals.ts');
  const page = read('../../pages/Ascend.tsx');

  it('leest de bestanden', () => {
    for (const src of [card, sheet, hook, page]) expect(src.length).toBeGreaterThan(100);
  });

  it('alleen tokens, niets kleiner dan 12 px, geen hoofdletters als stijl', () => {
    for (const src of [card, sheet]) {
      expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(src).not.toMatch(/rgba?\(/);
      expect(src).not.toMatch(/text-\[(\d|1[01])px\]/);
      expect(src).not.toMatch(/\buppercase\b/);
    }
  });

  it('de kaart verschijnt met mx-row-in (Rustig en Uit: meteen de eindstand) en heeft geen eigen animatie', () => {
    expect(card).toContain('mx-row-in');
    expect(card).not.toMatch(/animate-/);
    expect(card).not.toMatch(/transition-/);
  });

  it('geen percentage en geen Ring of Meter: de trap, het werk en één regel', () => {
    expect(card).not.toMatch(/\.percent\b|<Ring\b|<Meter\b|\}%|\d%/);
    expect(card).toContain('readiness.work');
    expect(card).toContain('readiness.line');
  });

  it('de keuze van de ladder wikkelt over meerdere regels (negen ladders passen niet in één strook)', () => {
    expect(sheet).toContain('<Chip');
    expect(sheet).toContain('flex-wrap');
    expect(sheet).not.toContain('<Segmented');
  });

  it('tikdoelen van minstens 44 px: de stappen in het blad en de rijen van de trap', () => {
    expect(sheet).toContain('min-h-[52px]');
    expect(card).toContain('min-h-[44px]');
    expect(card).toContain('<TextButton tone="dim"');
  });

  it('toevoegen en weghalen gaan via Akkoord, met de vaste woorden, en elke schrijfactie heeft een grens in tijd', () => {
    expect(page).toContain('primaryLabel="Akkoord"');
    expect(page).toContain('secondaryLabel="Liever niet"');
    expect(page).toContain('secondaryLabel="Annuleren"');
    expect(sheet).toContain('>Annuleren</TextButton>');
    expect(hook.match(/withTimeout\(/g)?.length).toBe(2);
    expect(page).toContain("'Dat lukte niet op tijd.'");
    expect(hook).toContain('reload()');
  });

  it('een vaardigheid gaat nooit door het voorstel van de planning', () => {
    const block = page.slice(page.indexOf('{skillProposal && ('), page.indexOf('{skillRemoving && ('));
    expect(block.length).toBeGreaterThan(100);
    expect(block).not.toContain('planHorizonChange');
    expect(block).not.toContain('horizon.propose');
  });
});

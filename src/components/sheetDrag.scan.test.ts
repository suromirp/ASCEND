import { describe, expect, it } from 'vitest';

// Een blad dat je omlaag kunt slepen heeft `ref={sheetRef}` op het paneel (useSheetClose).
// Deze scan faalt als een bestand `animate-sheet-in` gebruikt zonder die ref, zodat een nieuw
// blad het niet kan vergeten. Een blad dat bewust niet mag sluiten door slepen staat hieronder,
// met de reden. Docs: docs/beslissingen/2026-10-28-vloeiende-overgangen.md.
const EXCEPTIONS: Record<string, string> = {};
// Een blad zonder greepje (SheetGrip, ui.tsx) laat niet zien dat je het kunt wegslepen.
const GRIP_EXCEPTIONS: Record<string, string> = {};

// Alle bronbestanden als tekst, relatief aan src/ (zonder Node-types).
const SOURCES = import.meta.glob<string>('../**/*.tsx', { query: '?raw', import: 'default', eager: true });

describe('bladen volgen je vinger', () => {
  const text = new Map(Object.entries(SOURCES).map(([path, src]) => [path.replace(/^\.\.\//, 'src/'), src]));
  const files = [...text.keys()].filter((f) => text.get(f)!.includes('animate-sheet-in'));

  it('vindt de bladen', () => {
    expect(files.length).toBeGreaterThan(30);
  });

  it('elk blad heeft ref={sheetRef} op het paneel, of staat met reden in de uitzonderingen', () => {
    const missing = files.filter((f) => !text.get(f)!.includes('ref={sheetRef}') && !(f in EXCEPTIONS));
    expect(missing).toEqual([]);
  });

  it('elk blad heeft het greepje (SheetGrip) bovenaan, of staat met reden in de uitzonderingen', () => {
    const missing = files.filter((f) => !text.get(f)!.includes('<SheetGrip />') && !(f in GRIP_EXCEPTIONS));
    expect(missing).toEqual([]);
  });

  it('elke uitzondering bestaat nog en geeft een reden', () => {
    for (const [file, reason] of Object.entries(EXCEPTIONS)) {
      expect(files).toContain(file);
      expect(reason.length).toBeGreaterThan(10);
    }
  });
});

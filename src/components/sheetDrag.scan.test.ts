import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Een blad dat je omlaag kunt slepen heeft `ref={sheetRef}` op het paneel (useSheetClose).
// Deze scan faalt als een bestand `animate-sheet-in` gebruikt zonder die ref, zodat een nieuw
// blad het niet kan vergeten. Een blad dat bewust niet mag sluiten door slepen staat hieronder,
// met de reden. Docs: docs/beslissingen/2026-10-28-vloeiende-overgangen.md.
const EXCEPTIONS: Record<string, string> = {};

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

describe('bladen volgen je vinger', () => {
  const files = walk('src').filter((f) => f.endsWith('.tsx') && readFileSync(f, 'utf8').includes('animate-sheet-in'));

  it('vindt de bladen', () => {
    expect(files.length).toBeGreaterThan(30);
  });

  it('elk blad heeft ref={sheetRef} op het paneel, of staat met reden in de uitzonderingen', () => {
    const missing = files.filter((f) => !readFileSync(f, 'utf8').includes('ref={sheetRef}') && !(f.replace(/\\/g, '/') in EXCEPTIONS));
    expect(missing).toEqual([]);
  });

  it('elke uitzondering bestaat nog en geeft een reden', () => {
    for (const [file, reason] of Object.entries(EXCEPTIONS)) {
      expect(files.map((f) => f.replace(/\\/g, '/'))).toContain(file);
      expect(reason.length).toBeGreaterThan(10);
    }
  });
});

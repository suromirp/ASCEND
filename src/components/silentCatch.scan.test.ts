import { describe, expect, it } from 'vitest';

// Een knop die wacht heeft een zichtbare uitkomst (docs/beslissingen/2026-10-22-kwaliteitspoort.md). Een fout
// die alleen in de console belandt (`.catch((err) => console.error(...))`) is voor de gebruiker een knop die
// niets doet. Deze scan keurt dat af in pagina's en componenten: vang de fout en zeg het, bijvoorbeeld met
// `showFailure` (ChangeNotice) zoals Week.tsx#applyOrTell. Smal gehouden: alleen een catch die niets anders
// doet dan loggen.
const SOURCES = {
  ...import.meta.glob<string>('../pages/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }),
  ...import.meta.glob<string>('./**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }),
};
const SILENT = /\.catch\(\s*\(?\s*\w*\s*\)?\s*=>\s*console\.error\(/;

describe('geen fout die alleen in de console belandt', () => {
  const files = Object.entries(SOURCES).filter(([path]) => !path.endsWith('.test.ts') && !path.endsWith('.test.tsx'));

  it('vindt de bestanden', () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it('geen .catch((err) => console.error(...)) zonder zichtbare melding', () => {
    expect(files.filter(([, src]) => SILENT.test(src)).map(([path]) => path)).toEqual([]);
  });

  it('herkent het patroon', () => {
    expect(SILENT.test("x.catch((err) => console.error('Ruilen mislukt:', err));")).toBe(true);
    expect(SILENT.test("x.catch((err) => { console.error(err); showFailure('a', 'b'); });")).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';

// Een lui geladen pagina (React.lazy) toont tijdens het laden de laadstand (components/PageLoading.tsx),
// nooit `fallback={null}`: de app staat nooit op een leeg scherm (docs/beslissingen/2026-10-22-kwaliteitspoort.md,
// docs/onderhoud/2026-11-02-sneller.md). Deze scan faalt als een Suspense met routes erin `fallback={null}`
// krijgt, of als een lui stuk buiten de routes staat zonder reden hieronder.
const NOT_A_ROUTE: Record<string, string> = {
  ForgeSessionHost: 'Een overlay boven de pagina, geen pagina: tijdens het laden blijft de pagina eronder staan.',
};

const SOURCES = import.meta.glob<string>('./**/*.tsx', { query: '?raw', import: 'default', eager: true });

describe('lui geladen pagina\'s tonen een laadstand', () => {
  const files = Object.entries(SOURCES).filter(([, src]) => /\blazy\(/.test(src));

  it('vindt de lui geladen pagina\'s in App.tsx', () => {
    expect(files.map(([f]) => f)).toContain('./App.tsx');
  });

  it('geen Suspense met routes erin heeft fallback={null}', () => {
    const bad: string[] = [];
    for (const [file, src] of files) {
      for (const m of src.matchAll(/<Suspense\s+fallback=\{null\}\s*>([\s\S]*?)<\/Suspense>/g)) {
        if (/<Routes?\b/.test(m[1])) bad.push(file);
      }
    }
    expect(bad).toEqual([]);
  });

  it('elk lui stuk is een route, of staat met reden in de uitzonderingen', () => {
    const outside: string[] = [];
    for (const [file, src] of files) {
      for (const m of src.matchAll(/const\s+(\w+)\s*=\s*lazy\(/g)) {
        const name = m[1];
        if (name in NOT_A_ROUTE) continue;
        if (!new RegExp(`<Route\\b[^>]*element=\\{<${name}\\b`).test(src)) outside.push(`${file} ${name}`);
      }
    }
    expect(outside).toEqual([]);
  });

  it('de routes staan in een Suspense met de laadstand', () => {
    const app = SOURCES['./App.tsx'];
    expect(app).toMatch(/<Suspense fallback=\{<PageLoading \/>\}>\s*<Routes>/);
  });
});

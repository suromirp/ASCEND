import { describe, expect, it } from 'vitest';

// De werkbriefjes (docs/werkbriefjes/) noemen bestanden en functies als `src/pad.ts#naam`. Een helper begint daar,
// dus een pad of functie die niet meer bestaat stuurt hem de verkeerde kant op: deze test faalt dan.
const BRIEFS = import.meta.glob<string>('../docs/werkbriefjes/*.md', { query: '?raw', import: 'default', eager: true });
const SOURCES = import.meta.glob<string>('./**/*.{ts,tsx,css}', { query: '?raw', import: 'default', eager: true });

const source = new Map(Object.entries(SOURCES).map(([p, s]) => [p.replace(/^\.\//, 'src/'), s]));
const REF = /`(src\/[A-Za-z0-9_./-]+\.(?:ts|tsx|css))(?:#([A-Za-z0-9_]+))?`/g;
const defines = (text: string, name: string) =>
  new RegExp(`(?:function|const|let|class|interface|type|enum)\\s+${name}\\b|\\b${name}\\s*[:=(]`).test(text);

describe('werkbriefjes', () => {
  const briefs = Object.entries(BRIEFS).filter(([p]) => !p.endsWith('README.md'));

  it('er zijn briefjes', () => {
    expect(briefs.length).toBeGreaterThanOrEqual(9);
  });

  it('elk genoemd bestand en elke genoemde functie bestaat', () => {
    const wrong: string[] = [];
    for (const [file, text] of briefs) {
      for (const m of text.matchAll(REF)) {
        const src = source.get(m[1]);
        if (src === undefined) wrong.push(`${file}: ${m[1]} bestaat niet`);
        else if (m[2] && !defines(src, m[2])) wrong.push(`${file}: ${m[1]}#${m[2]} niet gevonden`);
      }
    }
    expect(wrong).toEqual([]);
  });

  it('elk briefje is kort en heeft de vaste kopjes', () => {
    for (const [file, text] of briefs) {
      expect(text.split('\n').length, file).toBeLessThanOrEqual(45);
      for (const head of ['## Bestanden', '## Nooit', '## Valkuilen', '## Testen', '## Lees verder']) expect(text, `${file} mist ${head}`).toContain(head);
    }
  });
});

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

// De schermen onder /stand, echt gerenderd (zonder DOM: de eerste render). Alleen het kader: lucht, terugknop,
// titel en een onbekend adres. De kaarten zelf hebben hun eigen tests.
vi.mock('../components/stand/useStandData', () => ({ useStandData: () => ({ rhythm: { enough: false, fact: 'nog niets', weeks: [] }, mainPast: false }) }));
vi.mock('../components/SkyBand', () => ({ SkyBand: ({ children }: { children: unknown }) => createElement('div', { 'data-sky': 'low' }, children as never) }));

const { StandScreenPage } = await import('./StandScreen');
const nodeFs = (await import('node:' + 'fs')) as { readFileSync: (url: URL, encoding: string) => string };

const at = (path: string) => renderToStaticMarkup(
  createElement(MemoryRouter, { initialEntries: [path] },
    createElement(Routes, null,
      createElement(Route, { path: '/stand', element: createElement('p', null, 'STANDPAGINA') }),
      createElement(Route, { path: '/stand/:scherm', element: createElement(StandScreenPage) }))),
);

describe('de schermen onder /stand', () => {
  it('Ritme: de lage lucht met de terugknop naar Je stand, het kopje Je stand en de naam', () => {
    const html = at('/stand/ritme');
    expect(html).toContain('aria-label="Terug naar Je stand"');
    expect(html).toContain('>Je stand<');
    expect(html).toMatch(/<h1[^>]*>Ritme<\/h1>/);
    expect(html).toContain('data-stand-screen="ritme"');
  });

  it('een adres dat niet bestaat opent Je stand, nooit een leeg scherm', () => {
    // Navigate doet zijn werk pas na de eerste render; de pagina zelf toont dan geen scherm.
    expect(at('/stand/bestaat-niet')).not.toContain('data-stand-screen');
  });
});

describe('Rustig en Uit bij Beweging', () => {
  const sources = import.meta.glob<string>(['./Standing.tsx', './StandScreen.tsx', '../components/stand/StandSummary.tsx', '../components/stand/StandList.tsx'], { query: '?raw', import: 'default', eager: true });
  const css = nodeFs.readFileSync(new URL('../index.css', import.meta.url), 'utf8');

  it('Stand en zijn schermen bewegen alleen met de pagina-overgang, geen eigen animatie of lus', () => {
    for (const [file, src] of Object.entries(sources)) {
      const anims = [...src.matchAll(/\b(animate-[\w-]+|mx-[\w-]+-in|transition-[\w-]+)\b/g)].map((m) => m[1]);
      expect(anims.filter((a) => a !== 'animate-page-in'), file).toEqual([]);
    }
  });

  it('in Uit staat alles meteen op de eindstand', () => {
    expect(css).toMatch(/html\[data-motion='off'\] \*,/);
  });
});

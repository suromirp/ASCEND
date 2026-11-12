import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

// De schermen onder /stand, echt gerenderd (zonder DOM: de eerste render). Alleen het kader: lucht, terugknop,
// titel en een onbekend adres. De kaarten zelf hebben hun eigen tests.
vi.mock('../components/stand/useStandData', () => ({ useStandData: () => ({
  rhythm: { enough: false, fact: 'nog niets', weeks: [] }, mainPast: false, today: '2026-10-31', curve: [], weeks: [], mix: {},
  calendar: [{ level: 0 }, { level: 3 }, { level: 1 }, { level: 0 }, { level: 0 }, { level: 0 }, { level: 0 }], checks: [],
  descent: [{ metres: 0 }], routeDescent: undefined, goalDay: undefined, goalPack: undefined, inputs: { bodyKg: 80 },
}) }));
// De kaarten zelf hebben hun eigen tests; hier staan ze als merkteken.
vi.mock('../components/LegFatigueCard', () => ({ LegFatigueCard: () => createElement('p', null, 'HART-BENEN') }));
vi.mock('../components/stand/FreshnessChart', () => ({ FreshnessChart: () => createElement('p', null, 'GRAFIEK-FRISHEID') }));
vi.mock('../components/stand/WeeklyLoadChart', () => ({ WeeklyLoadChart: () => createElement('p', null, 'GRAFIEK-BELASTING') }));
vi.mock('../components/stand/IntensityMixCard', () => ({ IntensityMixCard: () => createElement('p', null, 'INTENSITEIT') }));
// De instelling Klimtempo staat uit: geen rij.
vi.mock('../components/stand/useClimbPace', () => ({ useClimbPace: () => undefined }));
vi.mock('../components/SkyBand', () => ({ SkyBand: ({ children }: { children: unknown }) => createElement('div', { 'data-sky': 'low' }, children as never) }));

const { StandScreenPage } = await import('./StandScreen');
const nodeFs = (await import('node:' + 'fs')) as { readFileSync: (url: URL, encoding: string) => string };

const at = (path: string, state?: unknown) => renderToStaticMarkup(
  createElement(MemoryRouter, { initialEntries: [state ? { pathname: path, state } : path] },
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

  const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

  it('Benen: de naam één keer, in de lucht met de i; daaronder het hart, Frisheid en de rij Beendagen', () => {
    const html = at('/stand/benen');
    expect(html.match(/>Benen</g)).toHaveLength(1);
    expect(html).toMatch(/<h1[^>]*>Benen<\/h1>/);
    expect(html).toContain('aria-label="Hoe de beenindex werkt"');
    const t = text(html);
    expect(t.indexOf('HART-BENEN')).toBeLessThan(t.indexOf('GRAFIEK-FRISHEID'));
    expect(t).toContain('Beendagen 1 zware dag in één week');
    // Zonder meting geen rij Index en je benen.
    expect(t).not.toContain('Index en je benen');
  });

  it('Belasting: de i in de lucht, de grafiek als hart, Intensiteit en de rijen; Klimtempo uit is geen rij, Bergaf zonder doel ook niet', () => {
    const html = at('/stand/belasting');
    expect(html).toContain('aria-label="Wat Belasting telt"');
    const t = text(html);
    expect(t.indexOf('GRAFIEK-BELASTING')).toBeLessThan(t.indexOf('INTENSITEIT'));
    expect(t).toContain('Soorten Kracht, lopen en bergwerk');
    expect(t).not.toContain('Klimtempo');
    expect(t).not.toContain('Bergaf');
    expect(t).not.toContain('Belasting per week');
  });

  it('Ritme in de lege stand: de naam één keer en één zin, niet drie keer hetzelfde', () => {
    const html = at('/stand/ritme');
    expect(html.match(/>Ritme</g)).toHaveLength(1);
    expect(text(html).match(/Na twee volle weken/g)).toHaveLength(1);
    expect(html).toContain('aria-label="Wat Ritme telt"');
  });

  it('vanaf Vandaag gaat de terugknop terug naar Vandaag, niet naar Je stand', () => {
    expect(at('/stand/benen', { from: 'vandaag' })).toContain('aria-label="Terug naar Vandaag"');
    expect(at('/stand/benen', { from: 'stand' })).toContain('aria-label="Terug naar Je stand"');
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

  it('het label dat meeloopt schuift 150 ms ease-out en staat in Rustig en Uit meteen op zijn plek', () => {
    expect(css).toMatch(/\.stand-chart-label \{\s*transition: left 0\.15s ease-out, top 0\.15s ease-out;/);
    expect(css).toMatch(/html\[data-motion='calm'\] \.stand-chart-label,\s*html\[data-motion='off'\] \.stand-chart-label \{\s*transition: none;/);
  });
});

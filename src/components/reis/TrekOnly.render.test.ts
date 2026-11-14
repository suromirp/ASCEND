import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

// De tochtschermen zonder tocht als doel: een direct adres geeft één regel uitleg en de weg naar
// Ascend, geen leeg scherm. Met een tocht opent het scherm zelf.
let trek = false;
vi.mock('./useHasTrekGoal', () => ({ useHasTrekGoal: () => trek }));

const { TrekOnly } = await import('./TrekOnly');

const at = (path: string) => renderToStaticMarkup(
  createElement(MemoryRouter, { initialEntries: [path] },
    createElement(Routes, null,
      createElement(Route, { element: createElement(TrekOnly) },
        createElement(Route, { path: '/etappes', element: createElement('p', null, 'ETAPPES-SCHERM') }),
        createElement(Route, { path: '/reis/paklijst', element: createElement('p', null, 'PAKLIJST-SCHERM') })))),
);

describe('TrekOnly', () => {
  it('zonder tocht: uitleg en een knop naar Ascend, niet het scherm', () => {
    trek = false;
    for (const path of ['/etappes', '/reis/paklijst']) {
      const html = at(path);
      expect(html, path).not.toContain('SCHERM');
      expect(html, path).toContain('Dit scherm hoort bij een tocht.');
      expect(html, path).toContain('Naar Ascend');
    }
  });

  it('met een tocht: het scherm zelf', () => {
    trek = true;
    expect(at('/etappes')).toContain('ETAPPES-SCHERM');
    expect(at('/reis/paklijst')).toContain('PAKLIJST-SCHERM');
  });
});

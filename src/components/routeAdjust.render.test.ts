import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { RouteSearchModel } from './useRouteSearch';
import { RouteAdjust } from './RouteAdjust';
import { loopPieces } from '../engine/routeAdjust';
import { offsetPoint } from '../engine/routeGeometry';

vi.mock('./motion', () => ({ useMotionMode: () => 'full' }));

// Nagemaakt: een rechte lijn van 3,2 km met 30 m klim midden in het tweede stuk.
const START = { lat: 52.1, lon: 5.9 };
const eleAt = (m: number) => (m <= 1100 ? 20 : m >= 1850 ? 50 : 20 + (m - 1100) * 0.04);
const line = Array.from({ length: 65 }, (_, i) => ({ ...offsetPoint(START, 0, i * 50), ele: eleAt(i * 50) }));

const model = (over: Partial<RouteSearchModel> = {}) => ({
  canReverse: true, adjustLine: '', adjustFail: '', pieces: loopPieces(line),
  reverse: () => undefined, stepLength: () => undefined, avoidStretch: () => undefined, resetAdjust: () => undefined, other: { available: false, busy: false, failLine: '', note: '', pick: () => undefined, retry: undefined }, ...over,
}) as unknown as RouteSearchModel;

const render = (m: RouteSearchModel, selected?: number, piecesOpen = true) => renderToStaticMarkup(createElement(RouteAdjust, { model: m, selected, onSelect: () => undefined, motion: 'full', piecesOpen }));

describe('Bijsturen en Per stuk in het blad Route', () => {
  it('drie knoppen in zinsletters, en de stukken met afstand op 0,1 km en hele meters', () => {
    const html = render(model());
    expect(html).toContain('>Andere kant op<');
    expect(html).toContain('>Langer<');
    expect(html).toContain('>Korter<');
    expect(html).not.toContain('Terug naar het voorstel');
    expect(html).toContain('Km 0 tot 1 · 1 km · 0 m omhoog');
    expect(html).toContain('Km 1 tot 2 · 1 km · 30 m omhoog');
    expect(html).toContain('Km 2 tot 3,2 · 1,2 km · 0 m omhoog');
  });
  it('Simpel: geen Andere kant op; bijgestuurd: de regel en Terug naar het voorstel', () => {
    const html = render(model({ canReverse: false, adjustLine: 'Bijgestuurd: korter, gezocht op 9 km.' }));
    expect(html).not.toContain('Andere kant op');
    expect(html).toContain('Bijgestuurd: korter, gezocht op 9 km.');
    expect(html).toContain('>Terug naar het voorstel<');
  });
  it('een gekozen stuk: Vermijd dit stuk en Annuleren eronder', () => {
    const html = render(model(), 1);
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('>Vermijd dit stuk<');
    expect(html).toContain('>Annuleren<');
  });
  it('lukte bijsturen niet: één regel waarom, in inkt', () => {
    const html = render(model({ adjustFail: 'Om dit stuk ligt geen andere weg. De lus blijft zoals hij was.' }));
    expect(html).toContain('role="status"');
    expect(html).toContain('Om dit stuk ligt geen andere weg.');
  });
  it('Per stuk staat standaard dicht achter één tikregel', () => {
    const html = render(model(), undefined, false);
    expect(html).toContain('Per stuk: 3 stukken');
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('Km 0 tot 1');
  });
});

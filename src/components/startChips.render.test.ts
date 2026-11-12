// Start bij: Andere plek staat buiten de schuifrij, zodat hij altijd heel in beeld is. Nagemaakte namen.
import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StartChips } from './RoutePanel';
import type { RouteSearchModel } from './useRouteSearch';

vi.mock('./motion', () => ({ useMotionMode: () => 'full' }));

const model = (over: Partial<RouteSearchModel>) => ({
  startChips: [
    { kind: 'here', label: 'Waar je nu bent' },
    { kind: 'home', label: 'Thuis', placeId: 'place_home' },
    { kind: 'place', label: 'Natuurgebied Noord', placeId: 'p1' },
    { kind: 'other', label: 'Andere plek' },
  ],
  startChip: 'here',
  pickStart: () => undefined,
  choosePlace: () => undefined,
  ...over,
}) as unknown as RouteSearchModel;

describe('StartChips', () => {
  it('Andere plek staat na de schuifrij, niet erin', () => {
    const html = renderToStaticMarkup(createElement(StartChips, { model: model({}) }));
    const scroller = html.slice(html.indexOf('overflow-x-auto'));
    const rowEnd = scroller.indexOf('</div>');
    expect(scroller.slice(0, rowEnd)).toContain('Natuurgebied Noord');
    expect(scroller.slice(0, rowEnd)).not.toContain('Andere plek');
    expect(scroller.slice(rowEnd)).toContain('Andere plek');
  });
  it('een gezochte plek op Andere plek houdt het label en staat gekozen', () => {
    const html = renderToStaticMarkup(createElement(StartChips, { model: model({ startChip: 'other', startChips: [{ kind: 'here', label: 'Waar je nu bent' }, { kind: 'other', label: 'Heuvelrug' }] }) }));
    expect(html).toContain('aria-label="Andere plek: Heuvelrug"');
    expect(html).toMatch(/aria-pressed="true"[^>]*aria-label="Andere plek: Heuvelrug"/);
  });
});

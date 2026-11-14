// Start bij in vaste chips (besluit 2026-11-14-geen-stille-thuis.md, verving de tweede chip met wisselende
// naam van 2026-11-12-route-blok.md): Waar je nu bent, Thuis (als die er is) en Andere plek, altijd met
// dezelfde naam op dezelfde plek. Geen schuifrij, dus niets valt af. Nagemaakte namen.
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
  savedStarts: [],
  pickStart: () => undefined,
  choosePlace: () => undefined,
  ...over,
}) as unknown as RouteSearchModel;

const buttons = (html: string) => html.match(/<button[^>]*>.*?<\/button>/g) ?? [];

describe('StartChips', () => {
  it('drie vaste chips, geen schuifrij: Waar je nu bent, Thuis en Andere plek; je plekken staan niet als chip', () => {
    const html = renderToStaticMarkup(createElement(StartChips, { model: model({}) }));
    expect(buttons(html)).toHaveLength(3);
    expect(html).not.toContain('overflow-x-auto');
    expect(buttons(html)[0]).toContain('>Waar je nu bent<');
    expect(buttons(html)[1]).toContain('>Thuis<');
    expect(buttons(html)[2]).toContain('Andere plek');
    expect(html).not.toContain('Natuurgebied Noord');
  });
  it('een gekozen bewaarde plek: Andere plek gekozen, met haar naam in een regel eronder; de chips houden hun naam', () => {
    const html = renderToStaticMarkup(createElement(StartChips, { model: model({ startChip: 'p1' }) }));
    expect(html).toMatch(/aria-pressed="true"[^>]*aria-label="Andere plek: Natuurgebied Noord"/);
    expect(html).toContain('>Bij Natuurgebied Noord<');
    expect(html).toMatch(/aria-pressed="false"[^>]*>Waar je nu bent</);
    expect(buttons(html)[1]).toContain('>Thuis<');
  });
  it('Andere plek heeft een kleine pijl: hij opent een blad', () => {
    const html = renderToStaticMarkup(createElement(StartChips, { model: model({}) }));
    const other = buttons(html)[2];
    expect(other).toContain('aria-hidden');
    expect(other).toContain('<svg');
  });
  it('een instelling die bij Thuis start: de chip Thuis staat gekozen', () => {
    const html = renderToStaticMarkup(createElement(StartChips, { model: model({ startChip: 'home' }) }));
    expect(buttons(html)[1]).toMatch(/aria-pressed="true"[^>]*>Thuis</);
    expect(html).not.toContain('>Bij ');
  });
  it('een gezochte plek: Andere plek gekozen met haar naam; zonder Thuis geen chip Thuis', () => {
    const html = renderToStaticMarkup(createElement(StartChips, { model: model({ startChip: 'other', startChips: [{ kind: 'here', label: 'Waar je nu bent' }, { kind: 'other', label: 'Heuvelrug' }] }) }));
    expect(html).toMatch(/aria-pressed="true"[^>]*aria-label="Andere plek: Heuvelrug"/);
    expect(html).not.toContain('>Thuis<');
    expect(buttons(html)).toHaveLength(2);
  });
});

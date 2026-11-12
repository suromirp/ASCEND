// Start bij in twee chips (besluit 2026-11-12-route-blok.md, verving de schuifrij van 2026-11-12-andere-plek.md):
// Waar je nu bent en een tweede chip met de naam van de plek die geldt. Geen schuifrij meer, dus niets
// valt af. Nagemaakte namen.
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
  it('twee chips, geen schuifrij: Waar je nu bent en Andere plek; Thuis en je plekken staan niet als chip', () => {
    const html = renderToStaticMarkup(createElement(StartChips, { model: model({}) }));
    expect(buttons(html)).toHaveLength(2);
    expect(html).not.toContain('overflow-x-auto');
    expect(html).toContain('>Waar je nu bent<');
    expect(html).toContain('>Andere plek<');
    expect(html).not.toContain('>Thuis<');
    expect(html).not.toContain('Natuurgebied Noord');
  });
  it('een gekozen bewaarde plek: haar naam op de tweede chip, afgekort in de chip en niet erbuiten', () => {
    const html = renderToStaticMarkup(createElement(StartChips, { model: model({ startChip: 'p1' }) }));
    expect(html).toMatch(/aria-pressed="true"[^>]*aria-label="Andere plek: Natuurgebied Noord"/);
    expect(html).toContain('truncate');
    expect(html).toMatch(/aria-pressed="false"[^>]*>Waar je nu bent</);
  });
  it('een oude instelling die bij Thuis start: Thuis staat gekozen op de tweede chip', () => {
    const html = renderToStaticMarkup(createElement(StartChips, { model: model({ startChip: 'home' }) }));
    expect(html).toMatch(/aria-pressed="true"[^>]*aria-label="Andere plek: Thuis"/);
  });
  it('een gezochte plek op Andere plek houdt het label en staat gekozen', () => {
    const html = renderToStaticMarkup(createElement(StartChips, { model: model({ startChip: 'other', startChips: [{ kind: 'here', label: 'Waar je nu bent' }, { kind: 'other', label: 'Heuvelrug' }] }) }));
    expect(html).toMatch(/aria-pressed="true"[^>]*aria-label="Andere plek: Heuvelrug"/);
  });
});

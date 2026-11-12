// Het blad Andere plek (besluit 2026-11-12-route-blok.md): je bewaarde plekken met Thuis bovenaan, plus
// zoeken. Nagemaakte namen.
import { describe, expect, it, vi } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NewPlaceSheet } from './NewPlaceSheet';
import type { StartChip } from '../engine/places';

vi.mock('./Portal', () => ({ Portal: ({ children }: { children: ReactNode }) => children }));

const saved: StartChip[] = [
  { kind: 'home', label: 'Thuis', placeId: 'place_home' },
  { kind: 'place', label: 'Bosrand West', placeId: 'p1' },
];
const render = (over: Partial<Parameters<typeof NewPlaceSheet>[0]> = {}) =>
  renderToStaticMarkup(createElement(NewPlaceSheet, { onPick: () => undefined, onClose: () => undefined, ...over }));

describe('het blad Andere plek', () => {
  it('heet Andere plek, met het zoekveld bovenaan en je plekken eronder, Thuis eerst', () => {
    const html = render({ saved, chosen: 'here', onPickSaved: () => undefined });
    expect(html).toContain('>Andere plek<');
    expect(html.indexOf('aria-label="Plaatsnaam"')).toBeLessThan(html.indexOf('aria-label="Je plekken"'));
    expect(html.indexOf('>Thuis<')).toBeLessThan(html.indexOf('>Bosrand West<'));
  });
  it('de plek die nu geldt staat gekozen', () => {
    const html = render({ saved, chosen: 'p1', onPickSaved: () => undefined });
    expect(html).toMatch(/aria-pressed="true"[^>]*>.*Bosrand West/);
    expect(html).toMatch(/aria-pressed="false"[^>]*>.*Thuis/);
  });
  it('geen thuisplek en geen plekken: alleen zoeken, geen lege lijst', () => {
    const html = render({ saved: [], onPickSaved: () => undefined });
    expect(html).toContain('aria-label="Plaatsnaam"');
    expect(html).not.toContain('aria-label="Je plekken"');
  });
  it('elk blad hier gaat door useSheetClose, met het greepje: de terugknop sluit alleen dit blad', async () => {
    const src = (await import('./NewPlaceSheet.tsx?raw')).default as string;
    expect(src).toContain('useSheetClose(onClose)');
    expect(src).toContain('ref={sheetRef}');
    expect(src).toContain('<SheetGrip />');
  });
});

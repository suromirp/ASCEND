import { describe, expect, it } from 'vitest';
import line from './RouteProposalLine.tsx?raw';
import panel from './RoutePanel.tsx?raw';
import map from './RouteMap.tsx?raw';
import searching from './RouteSearching.tsx?raw';
// De regie van het blad staat sinds spoor 5 in een hook die de Briefing deelt.
import search from './useRouteSearch.ts?raw';

// Spoor 2 van de Briefing (docs/beslissingen/2026-11-11-briefing.md): het blad Route met de kaart
// bovenaan, één tik vanaf de ingang en nergens meer uitklappen.
describe('het blad Route', () => {
  it('nergens een uitklap: geen aria-expanded en geen pijl die omklapt', () => {
    for (const src of [line, panel, map]) {
      expect(src).not.toContain('aria-expanded');
      expect(src).not.toContain('flipped');
    }
  });
  it('elke ingang opent het blad met één tik, ook op het trainingsscherm en in het blad achter de i', () => {
    expect(line).not.toMatch(/mode === 'inline'/);
    expect(line).not.toContain("mode: 'sheet' | 'inline'");
    expect((line.match(/setOpen\(true\)/g) ?? []).length).toBe(2);
    expect(line).toContain('<RouteSheet');
  });
  it('Route voorstellen uit: geen ingang', () => {
    expect(line).toContain('if (settings.routeProposal === false) return null;');
  });
  it('het blad en het blad achter de i gaan door useSheetClose, met ref en greep', () => {
    expect((line.match(/useSheetClose\(/g) ?? []).length).toBe(2);
    expect((line.match(/ref=\{sheetRef\}/g) ?? []).length).toBe(2);
    expect((line.match(/<SheetGrip \/>/g) ?? []).length).toBe(2);
    expect(line).toContain('--rand-onder');
  });
  it('de delen volgen de volgorde van de engine; de kaart en de zoekstand hebben dezelfde vaste hoogte', () => {
    expect(search).toContain('routeSheetParts(');
    expect(panel).toContain('{parts.map(part)}');
    expect(map).toContain('height: ROUTE_MAP_HEIGHT');
    expect(searching).toContain('height: ROUTE_MAP_HEIGHT');
    expect(map).not.toContain('aspectRatio');
    expect(searching).not.toContain('aspectRatio');
  });
  it('de lange uitleg staat achter de i, niet weg', () => {
    expect(line).toContain('{MAP_HINT}');
    expect(line).toContain('{PICK_HINT}');
    expect(line).toContain('watchSteps(sender !== null).map');
    expect(line).not.toContain('SAVE_HINT}');
    expect(map).not.toContain('De ring is de start.');
  });
  it('kaart kan niet tekenen: de lussen als tekst, zonder doorgetrokken of gestreept', () => {
    expect(map).toContain('mapFallbackLine(state.kind');
    expect(search).toContain('markNoMap: () => setNoMapKey(key)');
    expect(panel).toContain('onNoMap={model.markNoMap}');
    expect(panel).toContain('onMap={!noMap && okStyles.length > 1}');
  });
  it('het blad heeft een vaste hoogte: het springt niet als de lussen er zijn', () => {
    expect(line).toContain('relative h-[90vh] w-full');
  });
  it('je plek als start is de chip Waar je nu bent: de rij Zet mijn plek als start is weg (Pathfinder route-start, eis 6)', () => {
    expect(map).not.toContain('>Zet mijn plek als start<');
    expect(map).not.toContain('>Gebruik waar ik nu ben<');
    expect(map).toContain('>Start hier<');
    expect(map).toContain('>Bewaar als plek<');
    expect(map).toContain('>Maak dit Thuis<');
  });
  it('de uitleg na de knop staat achter de i, niet onder de knop', () => {
    expect(panel).toContain('routeOutcomeLine(');
    expect(panel).not.toContain('routeActionLine(');
    expect(line).toContain('watchSteps(sender !== null).map');
  });
  it('een andere lus kiezen volgt Beweging', () => {
    expect(panel).toContain('transition: pickTransition(motion)');
  });
  it('alleen tokens en niets onder 12 px', () => {
    for (const src of [line, panel, map]) {
      expect(src).not.toMatch(/#[0-9a-fA-F]{3,6}\b|rgba?\(/);
      expect(src).not.toMatch(/text-\[(\d|1[01])px\]/);
    }
  });
});

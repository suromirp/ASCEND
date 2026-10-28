import { describe, it, expect } from 'vitest';
import { BOX_EDGES, edgeScroll } from './useVerticalDrag';

// De pagina scrolt 10 px per beeld binnen 90 px van de bovenkant en 130 px van de onderkant,
// precies zoals de doelen op Ascend altijd deden.
describe('edgeScroll', () => {
  const top = 56;
  const height = 800;
  it('omhoog binnen 90 px van de bovenkant van de pagina', () => {
    expect(edgeScroll(top, top, height)).toBe(-10);
    expect(edgeScroll(top + 89, top, height)).toBe(-10);
  });
  it('niet in het midden', () => {
    expect(edgeScroll(top + 90, top, height)).toBe(0);
    expect(edgeScroll(400, top, height)).toBe(0);
    expect(edgeScroll(height - 130, top, height)).toBe(0);
  });
  it('omlaag binnen 130 px van de onderkant van het scherm', () => {
    expect(edgeScroll(height - 129, top, height)).toBe(10);
    expect(edgeScroll(height, top, height)).toBe(10);
  });
});

// In een eigen bak (het blad Volgorde aanpassen) tellen de randen van de bak, 40 px.
describe('edgeScroll in een bak', () => {
  const top = 200;
  const bottom = 500;
  it('omhoog en omlaag binnen 40 px van de randen van de bak', () => {
    expect(edgeScroll(top + 39, top, bottom, BOX_EDGES)).toBe(-10);
    expect(edgeScroll(bottom - 39, top, bottom, BOX_EDGES)).toBe(10);
  });
  it('niet daarbinnen', () => {
    expect(edgeScroll(top + 40, top, bottom, BOX_EDGES)).toBe(0);
    expect(edgeScroll(350, top, bottom, BOX_EDGES)).toBe(0);
    expect(edgeScroll(bottom - 40, top, bottom, BOX_EDGES)).toBe(0);
  });
  it('de pagina houdt zijn eigen randen als er geen bak is', () => {
    expect(edgeScroll(top + 80, top, 800)).toBe(-10);
  });
});

import { describe, expect, it } from 'vitest';
import { COARSE_M, distanceKm, pathLengthKm, remainingAlongPath, stageHasCoords, stagePosition, stagePositionText, type StageLike } from './stagePosition';

// Nagemaakte plekken op een vlak stuk, geen echte route: een etappe van west naar oost langs 46 graden noord.
const A = { lat: 46.0, lon: 7.0 };
const B = { lat: 46.0, lon: 7.1 }; // ongeveer 7,7 km oostelijk van A
const C = { lat: 46.0, lon: 7.2 }; // nog zo ver

const one: StageLike = { to: 'Dorp B', coords: { start: A, end: B } };

describe('afstand', () => {
  it('klopt in een rechte lijn', () => {
    expect(distanceKm(A, A)).toBe(0);
    expect(distanceKm(A, B)).toBeGreaterThan(7.6);
    expect(distanceKm(A, B)).toBeLessThan(7.9);
    // Een graad lengte op 46 graden noord is ongeveer 77 km.
    expect(distanceKm({ lat: 46, lon: 7 }, { lat: 46, lon: 8 })).toBeCloseTo(77.3, 0);
  });

  it('telt een pad op', () => {
    expect(pathLengthKm([A, B, C])).toBeCloseTo(distanceKm(A, B) + distanceKm(B, C), 6);
    expect(pathLengthKm([A])).toBe(0);
  });

  it('rest van een pad vanaf het dichtstbijzijnde stuk', () => {
    const path = [A, B, C];
    const mid = { lat: 46.0, lon: 7.05 };
    expect(remainingAlongPath(path, mid)).toBeCloseTo(distanceKm(mid, B) + distanceKm(B, C), 1);
    // Naast het pad telt de plek op het pad, niet de afstand ernaast.
    const beside = { lat: 46.01, lon: 7.05 };
    expect(remainingAlongPath(path, beside)).toBeCloseTo(remainingAlongPath(path, mid), 0);
    // Voor het begin telt de hele lijn.
    expect(remainingAlongPath(path, { lat: 46, lon: 6.9 })).toBeCloseTo(pathLengthKm(path), 6);
  });
});

describe('stageHasCoords', () => {
  it('vraagt een begin en een eind', () => {
    expect(stageHasCoords(one)).toBe(true);
    expect(stageHasCoords({ to: 'x' })).toBe(false);
    expect(stageHasCoords({ to: 'x', coords: { start: A, end: { lat: NaN, lon: 7 } } })).toBe(false);
  });
});

describe('stagePosition', () => {
  it('zonder coordinaten is er niets te zeggen', () => {
    expect(stagePosition([{ to: 'Dorp B' }], A)).toBeUndefined();
    expect(stagePosition([], A)).toBeUndefined();
    // Een samengevoegde dag met een etappe zonder coordinaten ook niet.
    expect(stagePosition([one, { to: 'Dorp C' }], A)).toBeUndefined();
  });

  it('meet in een rechte lijn tot het eind als er geen pad is', () => {
    const p = stagePosition([one], { lat: 46.0, lon: 7.05 })!;
    expect(p.method).toBe('straight');
    expect(p.kmToEnd).toBeCloseTo(distanceKm({ lat: 46, lon: 7.05 }, B), 6);
    expect(p.nextName).toBe('Dorp B');
    expect(p.arrived).toBe(false);
  });

  it('meet langs de punten van de etappe als die er zijn', () => {
    const bend = { lat: 46.02, lon: 7.05 };
    const stage: StageLike = { to: 'Dorp B', coords: { start: A, end: B, path: [A, bend, B] } };
    const p = stagePosition([stage], bend)!;
    expect(p.method).toBe('path');
    expect(p.kmToEnd).toBeCloseTo(distanceKm(bend, B), 1);
    // Langs de bocht is het verder dan in een rechte lijn.
    expect(stagePosition([stage], A)!.kmToEnd).toBeGreaterThan(distanceKm(A, B));
  });

  it('zegt dat je er bent vlak bij het eind', () => {
    const p = stagePosition([one], { lat: 46.0, lon: 7.0995 })!;
    expect(p.arrived).toBe(true);
    expect(stagePositionText(p)).toBe('Je bent bij Dorp B.');
  });

  it('op een samengevoegde dag is de volgende plek het eind van de eerste etappe zolang je daar niet voorbij bent', () => {
    const two: StageLike = { to: 'Dorp C', coords: { start: B, end: C } };
    const early = stagePosition([one, two], { lat: 46.0, lon: 7.04 })!;
    expect(early.nextName).toBe('Dorp B');
    expect(early.kmToNext).toBeCloseTo(distanceKm({ lat: 46, lon: 7.04 }, B), 6);
    expect(early.kmToEnd).toBeCloseTo(early.kmToNext + distanceKm(B, C), 6);
    expect(early.endName).toBe('Dorp C');

    const late = stagePosition([one, two], { lat: 46.0, lon: 7.15 })!;
    expect(late.nextName).toBe('Dorp C');
    expect(late.kmToEnd).toBeCloseTo(distanceKm({ lat: 46, lon: 7.15 }, C), 6);
  });

  it('een plek ver van de etappe geeft geen getal', () => {
    expect(stagePosition([one], { lat: 48.5, lon: 2.3 })).toBeUndefined();
  });
});

describe('stagePositionText', () => {
  it('noemt de afstand en de manier van meten', () => {
    const straight = stagePosition([one], { lat: 46.0, lon: 7.05 })!;
    expect(stagePositionText(straight)).toMatch(/^Nog ongeveer 3,\d km in een rechte lijn tot Dorp B\.$/);
    const bend = { lat: 46.02, lon: 7.05 };
    const path = stagePosition([{ to: 'Dorp B', coords: { start: A, end: B, path: [A, bend, B] } }], A)!;
    expect(stagePositionText(path)).toMatch(/^Nog ongeveer \d+,?\d* km langs de route tot Dorp B\.$/);
  });

  it('noemt bij een samengevoegde dag eerst de volgende plek', () => {
    const two: StageLike = { to: 'Dorp C', coords: { start: B, end: C } };
    const text = stagePositionText(stagePosition([one, two], { lat: 46.0, lon: 7.04 })!);
    expect(text).toContain('tot Dorp B');
    expect(text).toContain('Dorp C');
    expect(text).not.toMatch(/[–—]/);
  });

  it('rondt groter dan tien kilometer af op hele kilometers', () => {
    const far: StageLike = { to: 'Verderop', coords: { start: A, end: { lat: 46.0, lon: 7.3 } } };
    expect(stagePositionText(stagePosition([far], A)!)).toMatch(/^Nog ongeveer \d+ km in een rechte lijn tot Verderop\.$/);
  });
});

describe('een grove plek, voorbij het eind en een route die terugbuigt', () => {
  it('zegt eerlijk dat een grove plek ongeveer is', () => {
    const fine = stagePosition([one], { lat: 46.0, lon: 7.05 }, 20)!;
    expect(stagePositionText(fine)).not.toContain('na bekend');
    expect(COARSE_M).toBe(500);
    const coarse = stagePosition([one], { lat: 46.0, lon: 7.05 }, 3000)!;
    expect(stagePositionText(coarse)).toMatch(/^Nog ongeveer 3,\d km in een rechte lijn tot Dorp B\. Je plek is op ongeveer 3 km na bekend\.$/);
  });

  it('een eigen zin voorbij het eind, ook met een pad', () => {
    const past = stagePosition([one], { lat: 46.0, lon: 7.13 })!;
    expect(past.pastEnd).toBe(true);
    expect(past.arrived).toBe(false);
    expect(stagePositionText(past)).toBe('Je bent voorbij Dorp B, het eind van deze etappe.');
    const withPath: StageLike = { to: 'Dorp B', coords: { start: A, end: B, path: [A, B] } };
    expect(stagePosition([withPath], { lat: 46.0, lon: 7.13 })!.pastEnd).toBe(true);
    // Vlak bij het eind of ervoor is het niet voorbij.
    expect(stagePosition([one], { lat: 46.0, lon: 7.05 })!.pastEnd).toBe(false);
    expect(stagePosition([one], { lat: 46.0, lon: 7.0999 })!.pastEnd).toBe(false);
  });

  it('met een pad telt de etappe waar je het dichtst bij ligt, ook als de route terugbuigt', () => {
    // De tweede etappe loopt terug naar het begin van de eerste: het eind van de dag ligt bij A.
    const one2: StageLike = { to: 'Dorp B', coords: { start: A, end: B, path: [A, B] } };
    const back: StageLike = { to: 'Terug bij A', coords: { start: B, end: A, path: [B, { lat: 46.02, lon: 7.05 }, A] } };
    const p = stagePosition([one2, back], { lat: 46.0, lon: 7.01 })!;
    expect(p.nextName).toBe('Dorp B');
    expect(p.method).toBe('path');
    // Zonder pad blijft de oude regel gelden.
    const plain = stagePosition([one, { to: 'Dorp C', coords: { start: B, end: C } }], { lat: 46.0, lon: 7.04 })!;
    expect(plain.nextName).toBe('Dorp B');
  });
});

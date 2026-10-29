import { describe, expect, it } from 'vitest';
import { pathBounds, thumbFrame } from './exerciseArtThumb';

describe('pathBounds', () => {
  it('leest absolute en relatieve opdrachten', () => {
    expect(pathBounds('M10 20 L50 20 L50 80 Z')).toEqual({ minX: 10, minY: 20, maxX: 50, maxY: 80 });
    expect(pathBounds('m10 20 l40 0 l0 60 z')).toEqual({ minX: 10, minY: 20, maxX: 50, maxY: 80 });
    expect(pathBounds('M5 5 H25 V45 h-30 v-10')).toEqual({ minX: -5, minY: 5, maxX: 25, maxY: 45 });
  });
  it('neemt de stuurpunten van bogen mee en de eindpunten van cirkelbogen', () => {
    expect(pathBounds('M0 0c10 -20 30 -20 40 0')).toEqual({ minX: 0, minY: -20, maxX: 40, maxY: 0 });
    expect(pathBounds('M10 10a5 5 0 0 1 10 0')).toEqual({ minX: 10, minY: 10, maxX: 20, maxY: 10 });
  });
  it('herhaalt een opdracht zonder letter en leest vlaggen zonder spatie', () => {
    expect(pathBounds('M0 0 10 10 20 0')).toEqual({ minX: 0, minY: 0, maxX: 20, maxY: 10 });
    expect(pathBounds('M0 0a5 5 0 0110 0')).toEqual({ minX: 0, minY: 0, maxX: 10, maxY: 0 });
  });
  it('geeft null bij niets bruikbaars', () => {
    expect(pathBounds('')).toBeNull();
    expect(pathBounds('Z')).toBeNull();
  });
});

describe('thumbFrame', () => {
  const drawing = (d: string) => ({
    viewBox: [0, 0, 512, 512] as [number, number, number, number],
    frames: ['M0 0 L1 1 L2 0', d, 'M0 0 L1 1 L2 0'] as [string, string, string],
  });
  it('neemt alleen het middelste beeld, in een vierkante viewBox om dat beeld', () => {
    const t = thumbFrame(drawing('M100 100 L200 100 L200 300 L100 300 Z'))!;
    expect(t.d).toBe('M100 100 L200 100 L200 300 L100 300 Z');
    const [x, y, w, h] = t.viewBox;
    expect(w).toBe(h);
    expect(x).toBeLessThan(100);
    expect(x + w).toBeGreaterThan(200);
    expect(y).toBeLessThan(100);
    expect(y + h).toBeGreaterThan(300);
    expect(x + w / 2).toBeCloseTo(150, 5);
    expect(y + h / 2).toBeCloseTo(200, 5);
  });
  it('geeft null als het pad niets heeft om te meten', () => {
    expect(thumbFrame(drawing('Z'))).toBeNull();
  });
});

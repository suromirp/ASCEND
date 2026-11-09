import { describe, expect, it } from 'vitest';
import { ascentOf, bearing, lineLength, metersBetween, offsetPoint, repeatedShare } from './routeGeometry';
import type { RoutePoint } from '../models/route';

// Nagemaakte punten, geen echte plek.
const A: RoutePoint = { lat: 52.1, lon: 5.9 };

const straight = (from: RoutePoint, deg: number, meters: number, steps = 20): RoutePoint[] =>
  Array.from({ length: steps + 1 }, (_, i) => offsetPoint(from, deg, (meters * i) / steps));

describe('routeGeometry', () => {
  it('meet een afstand en een richting', () => {
    const b = offsetPoint(A, 90, 1000);
    expect(metersBetween(A, b)).toBeCloseTo(1000, 0);
    expect(bearing(A, b)).toBeCloseTo(90, 0);
    expect(lineLength(straight(A, 0, 2500))).toBeCloseTo(2500, 0);
  });

  it('telt een stijging pas boven de dode band van 5 m', () => {
    const ele = (...e: number[]) => e.map((v, i) => ({ lat: 52.1 + i * 0.0001, lon: 5.9, ele: v }));
    expect(ascentOf(ele(10, 12, 10, 13, 11, 14))).toBe(0);
    expect(ascentOf(ele(10, 20, 30, 20, 10, 40))).toBe(50);
    // Ruis van een paar meter op een helling telt niet dubbel.
    expect(ascentOf(ele(10, 18, 16, 24, 22, 30))).toBe(20);
  });

  it('punten zonder hoogte doen niet mee', () => {
    expect(ascentOf([{ lat: 1, lon: 1 }, { lat: 1, lon: 1.001 }])).toBe(0);
    expect(ascentOf([{ lat: 1, lon: 1, ele: 5 }, { lat: 1, lon: 1.001 }, { lat: 1, lon: 1.002, ele: 25 }])).toBe(20);
  });

  it('heen en terug over hetzelfde pad loop je voor de helft twee keer', () => {
    const out = straight(A, 45, 2000, 100);
    const share = repeatedShare([...out, ...[...out].reverse().slice(1)]);
    expect(share).toBeGreaterThan(0.42);
    expect(share).toBeLessThanOrEqual(0.5);
  });

  it('een vierkante lus loop je nergens twee keer', () => {
    const b = offsetPoint(A, 0, 1000);
    const c = offsetPoint(b, 90, 1000);
    const d = offsetPoint(c, 180, 1000);
    const loop = [...straight(A, 0, 1000), ...straight(b, 90, 1000).slice(1), ...straight(c, 180, 1000).slice(1), ...straight(d, 270, 1000).slice(1)];
    expect(repeatedShare(loop)).toBeLessThan(0.03);
  });
});

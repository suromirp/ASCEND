import { describe, expect, it } from 'vitest';
import { capitalize } from './capitalize';
import { r1, r2 } from './round';

const oud1 = (n: number) => Math.round(n * 10) / 10;
const oud2 = (n: number) => Math.round(n * 100) / 100;

// Zelfde uitkomst als de losse kopieën die hier vroeger stonden.
describe('r1 en r2', () => {
  it('rondt af op de manier van Math.round', () => {
    expect(r1(0.25)).toBe(0.3);
    expect(r1(-0.25)).toBe(-0.2);
    expect(r1(1.04)).toBe(1);
    expect(r2(0.125)).toBe(0.13);
    expect(r2(-0.125)).toBe(-0.12);
    expect(r2(1.005)).toBe(oud2(1.005));
    expect(r1(2.675)).toBe(oud1(2.675));
  });
  it('houdt nul en hele getallen gelijk', () => {
    expect(r1(0)).toBe(0);
    expect(r2(3)).toBe(3);
  });
});

describe('capitalize', () => {
  it('zet de eerste letter groot en laat de rest staan', () => {
    expect(capitalize('zaterdag in mei')).toBe('Zaterdag in mei');
    expect(capitalize('iPhone')).toBe('IPhone');
    expect(capitalize('')).toBe('');
  });
});

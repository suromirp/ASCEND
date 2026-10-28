import { describe, expect, it } from 'vitest';
import { mayTap, openingMs, stepBy, swipeDelta } from './exerciseSteps';

describe('stepBy', () => {
  it('loopt rond', () => {
    expect(stepBy(1, 1)).toBe(2);
    expect(stepBy(3, 1)).toBe(1);
    expect(stepBy(1, -1)).toBe(3);
    expect(stepBy(2, -1)).toBe(1);
  });
  it('neemt een vreemde stap als de eindstand', () => {
    expect(stepBy(7, 0)).toBe(3);
    expect(stepBy(Number.NaN, 1)).toBe(1);
  });
});

describe('mayTap', () => {
  it('geeft pas na 140 ms weer een tik', () => {
    expect(mayTap(0, 139)).toBe(false);
    expect(mayTap(0, 140)).toBe(true);
    expect(mayTap(-1e9, 0)).toBe(true);
  });
});

describe('swipeDelta', () => {
  it('telt een horizontale veeg vanaf 36 px', () => {
    expect(swipeDelta(-40, 3)).toBe(1);
    expect(swipeDelta(40, 3)).toBe(-1);
    expect(swipeDelta(30, 0)).toBe(0);
  });
  it('negeert een veeg die meer omhoog of omlaag gaat', () => {
    expect(swipeDelta(40, 80)).toBe(0);
  });
});

describe('openingMs', () => {
  it('duurt 900 ms, half in Rustig en niets in Uit', () => {
    expect(openingMs('full')).toBe(900);
    expect(openingMs('calm')).toBe(450);
    expect(openingMs('off')).toBe(0);
  });
});

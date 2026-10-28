import { describe, expect, it } from 'vitest';
import { GROW_CLOSE_MS, GROW_OPEN_MS, growKeyframes, growOpacity, growPlan, isFreshOrigin, ORIGIN_MAX_AGE_MS } from './growPlan';
import growSource from './growPlan.ts?raw';

const viewport = { width: 390, height: 800 };
const row = { left: 16, top: 300, width: 358, height: 64 };
const panel = { left: 0, top: 300, width: 390, height: 500 };

describe('growPlan', () => {
  it('speelt alleen in Normaal', () => {
    expect(growPlan('full', row, panel, viewport)).toMatchObject({ durationMs: GROW_OPEN_MS, delayContentMs: 100 });
    expect(growPlan('calm', row, panel, viewport)).toBeNull();
    expect(growPlan('off', row, panel, viewport)).toBeNull();
  });

  it('doet niets bij een rechthoek zonder maat', () => {
    expect(growPlan('full', { ...row, height: 0 }, panel, viewport)).toBeNull();
    expect(growPlan('full', row, { ...panel, width: 0 }, viewport)).toBeNull();
    expect(growPlan('full', { ...row, width: Number.NaN }, panel, viewport)).toBeNull();
  });

  it('doet niets als de rij onder of boven het scherm ligt', () => {
    expect(growPlan('full', { ...row, top: 900 }, panel, viewport)).toBeNull();
    expect(growPlan('full', { ...row, top: -200 }, panel, viewport)).toBeNull();
    // Voor de helft in beeld is genoeg.
    expect(growPlan('full', { ...row, top: 800 - 40 }, panel, viewport)).not.toBeNull();
  });

  it('doet niets als de rij hoger of breder is dan het blad', () => {
    expect(growPlan('full', { ...row, height: 600 }, panel, viewport)).toBeNull();
    expect(growPlan('full', { ...row, width: 500 }, panel, viewport)).toBeNull();
  });

  it('sluiten duurt iets korter en wacht met de inhoud niet', () => {
    expect(growPlan('full', row, panel, viewport, 'close')).toMatchObject({ durationMs: GROW_CLOSE_MS, delayContentMs: 0 });
  });
});

describe('growKeyframes', () => {
  it('begint exact op de rij en eindigt op het blad', () => {
    const [a, b] = growKeyframes(row, panel);
    expect(a.transform).toBe(`translate(16px, 300px) scale(${358 / 390}, ${64 / 500})`);
    expect(b.transform).toBe('translate(0px, 300px) scale(1, 1)');
  });

  it('sluiten is het omgekeerde', () => {
    const open = growKeyframes(row, panel, 'open');
    expect(growKeyframes(row, panel, 'close')).toEqual([open[1], open[0]]);
  });
});

describe('growOpacity', () => {
  it('komt er in 60 ms bij en gaat bij openen in de laatste 100 ms weg', () => {
    const k = growOpacity(280, 'open');
    expect(k[1].offset).toBeCloseTo(60 / 280);
    expect(k[2].offset).toBeCloseTo(180 / 280);
    expect(k[3]).toEqual({ opacity: 0, offset: 1 });
  });

  it('blijft bij sluiten tot het einde staan', () => {
    const k = growOpacity(240, 'close');
    expect(k.at(-1)).toEqual({ opacity: 1, offset: 1 });
  });
});

describe('isFreshOrigin', () => {
  const el = { isConnected: true, width: 300, height: 60 };
  it('is geldig binnen 600 ms', () => {
    expect(isFreshOrigin({ at: 1000 }, 1000 + ORIGIN_MAX_AGE_MS, el)).toBe(true);
  });
  it('is te oud, losgekoppeld of onzichtbaar niet geldig', () => {
    expect(isFreshOrigin({ at: 1000 }, 1000 + ORIGIN_MAX_AGE_MS + 1, el)).toBe(false);
    expect(isFreshOrigin({ at: 1000 }, 1100, { ...el, isConnected: false })).toBe(false);
    expect(isFreshOrigin({ at: 1000 }, 1100, { ...el, height: 0 })).toBe(false);
    expect(isFreshOrigin(null, 1100, el)).toBe(false);
    expect(isFreshOrigin({ at: 1000 }, 1100, null)).toBe(false);
  });
});

describe('teksten', () => {
  it('bevatten geen gedachtestreepjes', () => {
    expect(growSource).not.toMatch(/[–—]/);
  });
});

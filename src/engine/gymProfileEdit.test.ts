import { describe, expect, it } from 'vitest';
import {
  COMMON_BARS_KG,
  COMMON_PLATES_KG,
  applyDumbbellPreset,
  checkCustomWeight,
  chipValues,
  detectDumbbellPreset,
  dumbbellWeights,
  fitRack,
  setRackBound,
  smallestBarJump,
  summarizeSeries,
  toggleWeight,
} from './gymProfileEdit';
import { DEFAULT_PROFILE, normalizeProfile } from './strengthSettings';

const rack = DEFAULT_PROFILE.dumbbells;

describe('dumbbellWeights', () => {
  it('gives the default series: 2 kg steps to 10, then 2,5 to the heaviest', () => {
    const w = dumbbellWeights(rack);
    expect(w.slice(0, 8)).toEqual([2, 4, 6, 8, 10, 12.5, 15, 17.5]);
    expect(w[w.length - 1]).toBe(50);
    expect(w).toHaveLength(5 + 16);
  });
});

describe('toggleWeight', () => {
  it('adds a value in the stored order and removes it again', () => {
    expect(toggleWeight('bars', [20, 15], 10).list).toEqual([20, 15, 10]);
    expect(toggleWeight('bars', [20, 15], 25).list).toEqual([25, 20, 15]);
    expect(toggleWeight('plates', [2.5, 5], 1.25).list).toEqual([1.25, 2.5, 5]);
    expect(toggleWeight('plates', [1.25, 2.5, 5], 2.5).list).toEqual([1.25, 5]);
  });
  it('keeps the last value and the size limit', () => {
    expect(toggleWeight('bars', [20], 20)).toMatchObject({ list: [20], refused: expect.any(String) });
    const full = [0.5, 1.25, 2.5, 5, 10, 15, 20, 25, 30, 35, 40, 45];
    expect(toggleWeight('plates', full, 7.5).refused).toBeDefined();
  });
  it('gives lists that are stored as they are', () => {
    const bars = toggleWeight('bars', DEFAULT_PROFILE.barsKg, 7.5).list;
    const plates = toggleWeight('plates', DEFAULT_PROFILE.platesKg, 0.5).list;
    const p = normalizeProfile({ ...DEFAULT_PROFILE, barsKg: bars, platesKg: plates });
    expect(p?.barsKg).toEqual(bars);
    expect(p?.platesKg).toEqual(plates);
  });
});

describe('chipValues', () => {
  it('shows the usual values and your own, in order', () => {
    expect(chipValues('bars', [20]).map((c) => c.value)).toEqual(COMMON_BARS_KG);
    const plates = chipValues('plates', [1.25, 3]);
    expect(plates.map((c) => c.value)).toEqual([0.5, 1.25, 2.5, 3, 5, 10, 15, 20, 25]);
    expect(plates.filter((c) => c.custom).map((c) => c.value)).toEqual([3]);
    expect(COMMON_PLATES_KG).toHaveLength(8);
  });
});

describe('checkCustomWeight', () => {
  it('refuses nothing, out of range, doubles and a full list', () => {
    expect(checkCustomWeight('plates', [5], undefined)).toBeDefined();
    expect(checkCustomWeight('plates', [5], 0.1)).toBeDefined();
    expect(checkCustomWeight('bars', [20], 60)).toBeDefined();
    expect(checkCustomWeight('plates', [5], 5)).toBeDefined();
    expect(checkCustomWeight('plates', [5], 3)).toBeUndefined();
  });
});

describe('dumbbell series', () => {
  it('recognises the default and your own', () => {
    expect(detectDumbbellPreset(rack)).toBe('mixed');
    expect(detectDumbbellPreset({ ...rack, stepKg: 3 })).toBeUndefined();
    expect(detectDumbbellPreset({ ...rack, stepKg: 2, thenStepKg: 2, upToKg: 30 })).toBe('per2');
  });
  it('applies a series and keeps lightest and heaviest', () => {
    const per2 = applyDumbbellPreset(rack, 'per2');
    expect(per2).toMatchObject({ startKg: 2, stepKg: 2, thenStepKg: 2, maxKg: 50 });
    expect(dumbbellWeights(per2).slice(-2)).toEqual([48, 50]);
    expect(detectDumbbellPreset(per2)).toBe('per2');
    const quarter = applyDumbbellPreset(rack, 'per2_5');
    expect(dumbbellWeights(quarter).slice(0, 3)).toEqual([2.5, 5, 7.5]);
    expect(applyDumbbellPreset(quarter, 'mixed').startKg).toBe(2);
  });
  it('always gives a rack that is stored as it is', () => {
    for (const id of ['per1', 'per2', 'per2_5', 'mixed'] as const) {
      const r = applyDumbbellPreset({ ...rack, startKg: 5, maxKg: 30 }, id);
      expect(normalizeProfile({ ...DEFAULT_PROFILE, dumbbells: r })?.dumbbells).toEqual(r);
    }
  });
  it('moves the lightest and the heaviest within bounds', () => {
    expect(setRackBound(rack, 'startKg', 12)).toMatchObject({ startKg: 12, upToKg: 12 });
    expect(setRackBound(rack, 'maxKg', 8)).toMatchObject({ maxKg: 8, upToKg: 8 });
    expect(setRackBound(rack, 'startKg', 0)).toMatchObject({ startKg: 0.5 });
    expect(setRackBound(rack, 'maxKg', 1000).maxKg).toBe(200);
    const r = setRackBound(rack, 'maxKg', 40);
    expect(normalizeProfile({ ...DEFAULT_PROFILE, dumbbells: r })?.dumbbells).toEqual(r);
    expect(fitRack({ ...rack, startKg: 30 }).startKg).toBe(20);
  });
});

describe('summarizeSeries', () => {
  it('shows the first weights, the last two and the total', () => {
    const s = summarizeSeries(dumbbellWeights(rack));
    expect(s).toMatchObject({ gap: true, total: 21, tail: [47.5, 50] });
    expect(s.head).toHaveLength(8);
    expect(summarizeSeries([2, 4, 6])).toEqual({ head: [2, 4, 6], tail: [], total: 3, gap: false });
  });
});

describe('smallestBarJump', () => {
  it('is a pair of the lightest plates', () => {
    expect(smallestBarJump([1.25, 2.5, 5])).toBe(2.5);
    expect(smallestBarJump([0.5, 1.25])).toBe(1);
  });
});

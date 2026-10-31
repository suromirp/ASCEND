import { describe, expect, it } from 'vitest';
import { estimateStorage } from './storageEstimate';

describe('estimateStorage', () => {
  it('geeft het gebruik en de quota door', async () => {
    expect(await estimateStorage(100, async () => ({ usage: 1200, quota: 5000 }))).toEqual({ kind: 'measured', usage: 1200, quota: 5000 });
  });
  it('zonder functie of met een fout: niet beschikbaar', async () => {
    expect(await estimateStorage(100, undefined)).toEqual({ kind: 'unavailable' });
    expect(await estimateStorage(100, async () => { throw new Error('nee'); })).toEqual({ kind: 'unavailable' });
    expect(await estimateStorage(100, async () => ({}))).toEqual({ kind: 'unavailable' });
  });
  it('geen antwoord binnen de grens: te traag', async () => {
    expect(await estimateStorage(20, () => new Promise(() => undefined))).toEqual({ kind: 'timeout' });
  });
});

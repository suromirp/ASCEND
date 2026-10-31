import { describe, expect, it } from 'vitest';
import { formatSize, storageUseText } from './storageUse';

describe('formatSize', () => {
  it('B, KB, MB en GB met een komma', () => {
    expect(formatSize(512)).toBe('512 B');
    expect(formatSize(850_000)).toBe('850 KB');
    expect(formatSize(4_200_000)).toBe('4,2 MB');
    expect(formatSize(24_000_000)).toBe('24 MB');
    expect(formatSize(1_400_000_000)).toBe('1,4 GB');
  });
});

describe('storageUseText', () => {
  it('nog niet gemeten: niets', () => {
    expect(storageUseText(undefined)).toBeUndefined();
  });

  it('gewoon: wat de app gebruikt en wat de browser geeft', () => {
    expect(storageUseText({ kind: 'measured', usage: 24_000_000, quota: 2_000_000_000 })).toEqual({ value: '24 MB', sub: 'Van de 2 GB die de browser geeft' });
  });

  it('zonder quota alleen het gebruik', () => {
    expect(storageUseText({ kind: 'measured', usage: 1_000_000 })).toEqual({ value: '1 MB' });
    expect(storageUseText({ kind: 'measured', usage: 1_000_000, quota: 0 })).toEqual({ value: '1 MB' });
  });

  it('krap vanaf 80 %, met een waarschuwing', () => {
    expect(storageUseText({ kind: 'measured', usage: 79, quota: 100 })?.tight).toBeUndefined();
    const tight = storageUseText({ kind: 'measured', usage: 860_000_000, quota: 1_000_000_000 })!;
    expect(tight.tight).toBe(true);
    expect(tight.value).toBe('860 MB');
    expect(tight.sub).toBe('Bijna vol: 86 % van 1 GB. Maak een back-up en ruim reeksen op');
  });

  it('niet beschikbaar of te traag: een nette tekst, gedimd', () => {
    expect(storageUseText({ kind: 'unavailable' })).toMatchObject({ value: 'Niet te zien', dim: true });
    expect(storageUseText({ kind: 'timeout' })).toMatchObject({ value: 'Niet te zien', dim: true });
    expect(storageUseText({ kind: 'timeout' })!.sub).toContain('niet op tijd');
  });
});

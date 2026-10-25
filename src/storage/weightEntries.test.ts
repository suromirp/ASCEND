import { describe, it, expect } from 'vitest';
import { migrateWeightEntries } from './migrations';
import type { WeightEntry } from '../models/metrics';

describe('migrateWeightEntries', () => {
  it('laat metingen van voor het vetpercentage ongemoeid', () => {
    const old: WeightEntry[] = [
      { date: '2026-09-01', kg: 87, source: 'manual' },
      { date: '2026-09-02', kg: 86, source: 'macrofactor', basis: 'trend', scaleKg: 85.5 },
    ];
    expect(migrateWeightEntries(old)).toEqual({ entries: old, skipped: 0 });
  });

  it('houdt een geldig vetpercentage', () => {
    const entries: WeightEntry[] = [{ date: '2026-09-01', kg: 80, source: 'macrofactor', basis: 'scale', fatPct: 18.4 }];
    expect(migrateWeightEntries(entries)).toEqual({ entries, skipped: 0 });
  });

  it('laat een onmogelijk vetpercentage vallen en houdt het gewicht', () => {
    const raw = [
      { date: '2026-09-01', kg: 80, source: 'manual', fatPct: 2 },
      { date: '2026-09-02', kg: 80, source: 'manual', fatPct: 61 },
      { date: '2026-09-03', kg: 80, source: 'manual', fatPct: '18' },
      { date: '2026-09-04', kg: 80, source: 'manual', fatPct: null },
    ] as unknown as WeightEntry[];
    const { entries, skipped } = migrateWeightEntries(raw);
    expect(skipped).toBe(4);
    expect(entries.map((e) => 'fatPct' in e)).toEqual([false, false, false, false]);
    expect(entries.map((e) => e.kg)).toEqual([80, 80, 80, 80]);
  });
});

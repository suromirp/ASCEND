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

  it('een weging uit Health Connect staat naast je eigen gewicht van die dag', () => {
    const entries: WeightEntry[] = [
      { date: '2026-11-03', kg: 84, source: 'manual' },
      { date: '2026-11-03', kg: 82.5, source: 'health-connect', basis: 'scale', fatPct: 18.2 },
    ];
    expect(migrateWeightEntries(entries)).toEqual({ entries, skipped: 0 });
  });

  it('twee op dezelfde dag en plek worden er een, de laatste; een weging uit Health Connect buiten 30 tot 250 kg valt weg', () => {
    const raw: WeightEntry[] = [
      { date: '2026-11-03', kg: 82.5, source: 'health-connect', basis: 'scale' },
      { date: '2026-11-03', kg: 84, source: 'manual' },
      { date: '2026-11-03', kg: 82.7, source: 'health-connect', basis: 'scale' },
      { date: '2026-11-04', kg: 400, source: 'health-connect', basis: 'scale' },
    ];
    expect(migrateWeightEntries(raw)).toEqual({
      entries: [
        { date: '2026-11-03', kg: 82.7, source: 'health-connect', basis: 'scale' },
        { date: '2026-11-03', kg: 84, source: 'manual' },
      ],
      skipped: 2,
    });
  });
});

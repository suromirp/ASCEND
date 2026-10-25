import { describe, expect, it } from 'vitest';
import { migrateSweatEntries } from './migrations';

const good = { id: 's1', logId: 'l1', date: '2026-06-01', activity: 'walk', durationMinutes: 120, weightBeforeKg: 80, weightAfterKg: 78.8, tempC: 24, updatedAt: '2026-06-01T10:00:00.000Z' };

describe('migrateSweatEntries', () => {
  it('laat een bestand zonder lijst met rust', () => {
    expect(migrateSweatEntries(undefined)).toEqual({ list: undefined, skipped: 0 });
    expect(migrateSweatEntries(null)).toEqual({ list: undefined, skipped: 0 });
  });
  it('telt een lijst die geen lijst is', () => {
    expect(migrateSweatEntries({ a: 1 })).toEqual({ list: undefined, skipped: 1 });
  });
  it('leest een goed record zoals het is', () => {
    expect(migrateSweatEntries([good])).toEqual({ list: [good], skipped: 0 });
  });
  it('laat een kapot record vallen en telt het', () => {
    const out = migrateSweatEntries([good, { ...good, id: '' }, { ...good, id: 's3', logId: 'l3', activity: 'swim' }, { ...good, id: 's4', logId: 'l4', date: 'gisteren' }, 'tekst']);
    expect(out.list).toHaveLength(1);
    expect(out.skipped).toBe(4);
  });
  it('een kapot getal verliest alleen zichzelf', () => {
    const out = migrateSweatEntries([{ ...good, tempC: 'warm', drankMl: -5 }]);
    expect(out.list?.[0].weightBeforeKg).toBe(80);
    expect(out.list?.[0].tempC).toBeUndefined();
    expect(out.list?.[0].drankMl).toBeUndefined();
    expect(out.skipped).toBe(2);
  });
  it('een meting zonder wegingen of schatting valt weg', () => {
    expect(migrateSweatEntries([{ ...good, weightAfterKg: undefined }]).list).toEqual([]);
    expect(migrateSweatEntries([{ ...good, weightAfterKg: undefined, watchMl: 900 }]).list).toHaveLength(1);
  });
  it('houdt per training de laatste en sorteert op datum', () => {
    const out = migrateSweatEntries([
      { ...good, id: 'old', updatedAt: '2026-06-01T10:00:00.000Z' },
      { ...good, id: 'new', updatedAt: '2026-06-02T10:00:00.000Z' },
      { ...good, id: 'early', logId: 'l0', date: '2026-05-01' },
    ]);
    expect(out.list?.map((e) => e.id)).toEqual(['early', 'new']);
  });
});

import { describe, expect, it } from 'vitest';
import { FORGE_FALLBACK_LINE, FORGE_NO_DATA_LINE, FORGE_OFF_LINE, forgeEntryLine } from './forgeEntry';
import type { ForgePoint } from './forgeHistory';

const pt = (date: string, value: number): ForgePoint => ({ date, unit: 'kg', value, workSets: [] });
const base = { enabled: true, proposals: 0, today: '2026-10-28', weeks: 8 };

describe('forgeEntryLine', () => {
  it('zegt dat kracht uit staat', () => {
    expect(forgeEntryLine({ ...base, enabled: false, series: [] })).toEqual({ state: 'off', line: FORGE_OFF_LINE });
  });
  it('zonder gegevens', () => {
    expect(forgeEntryLine({ ...base, series: [] })).toEqual({ state: 'empty', line: FORGE_NO_DATA_LINE });
    expect(forgeEntryLine({ ...base, series: [[]] }).state).toBe('empty');
  });
  it('telt stijgers en noemt het voorstel', () => {
    const up = [pt('2026-08-25', 50), pt('2026-10-27', 55)];
    const flat = [pt('2026-08-25', 60), pt('2026-10-27', 60)];
    const r = forgeEntryLine({ ...base, proposals: 2, series: [up, up, up, flat] });
    expect(r.state).toBe('rising');
    expect(r.line).toBe('3 oefeningen gingen omhoog in 8 weken. Voor je volgende training staat een voorstel klaar.');
  });
  it('enkelvoud', () => {
    const up = [pt('2026-08-25', 50), pt('2026-10-27', 55)];
    expect(forgeEntryLine({ ...base, series: [up] }).line).toBe('1 oefening ging omhoog in 8 weken.');
  });
  it('zonder verandering', () => {
    const flat = [pt('2026-08-25', 60), pt('2026-10-27', 60)];
    expect(forgeEntryLine({ ...base, series: [flat] })).toEqual({ state: 'steady', line: 'Geen oefening ging omhoog in 8 weken.' });
  });
  it('valt terug op de vaste uitleg zonder vergelijkingsmoment', () => {
    const fresh = [pt('2026-10-20', 50), pt('2026-10-27', 55)];
    expect(forgeEntryLine({ ...base, series: [fresh] })).toEqual({ state: 'unknown', line: FORGE_FALLBACK_LINE });
  });
  it('heeft nergens een gedachtestreepje', () => {
    const up = [pt('2026-08-25', 50), pt('2026-10-27', 55)];
    for (const input of [{ ...base, series: [up], proposals: 1 }, { ...base, series: [] }, { ...base, enabled: false, series: [] }]) {
      expect(forgeEntryLine(input).line).not.toMatch(/[–—]/);
    }
  });
});

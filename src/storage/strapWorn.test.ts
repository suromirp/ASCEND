import { describe, expect, it } from 'vitest';
import { migrateShortTestSeries, migrateStrapWorn, migrateZoneAnswers } from './migrations';
import { cleanSettings } from './backupClean';
import { MAX_ZONE_ANSWERS } from '../models/zoneAnswer';

describe('"Ik had hem wel om" in een back-up', () => {
  it('een oudere back-up zonder lijst blijft zoals hij was', () => {
    expect(migrateStrapWorn(undefined)).toEqual({ list: undefined, skipped: 0 });
    expect(migrateStrapWorn(null)).toEqual({ list: undefined, skipped: 0 });
  });

  it('geen lijst is één overgeslagen veld', () => {
    expect(migrateStrapWorn({ logId: 't1' })).toEqual({ list: undefined, skipped: 1 });
    expect(migrateStrapWorn('t1')).toEqual({ list: undefined, skipped: 1 });
  });

  it('een fout item valt weg en wordt geteld', () => {
    expect(migrateStrapWorn(['t1', '', '   ', 3, null, 'x'.repeat(81), 't2'])).toEqual({ list: ['t1', 't2'], skipped: 5 });
  });

  it('een dubbele test staat er één keer, op zijn laatste plek', () => {
    expect(migrateStrapWorn(['t1', 't2', 't1'])).toEqual({ list: ['t2', 't1'], skipped: 0 });
  });

  it('hoogstens de laatste 60', () => {
    const many = Array.from({ length: MAX_ZONE_ANSWERS + 5 }, (_, i) => `t${i}`);
    const out = migrateStrapWorn(many);
    expect(out.list).toHaveLength(MAX_ZONE_ANSWERS);
    expect(out.list![0]).toBe('t5');
  });
});

describe('antwoorden op het voorstel: één per test en getal', () => {
  it('twee getallen voor dezelfde test blijven allebei staan; hetzelfde getal twee keer wordt het laatste', () => {
    const out = migrateZoneAnswers([
      { logId: 't1', answer: 'declined', date: '2026-10-21', lthrTo: 172 },
      { logId: 't1', answer: 'declined', date: '2026-10-22', lthrTo: 175 },
      { logId: 't1', answer: 'accepted', date: '2026-10-23', lthrTo: 172 },
    ]);
    expect(out.list).toEqual([
      { logId: 't1', answer: 'declined', date: '2026-10-22', lthrTo: 175 },
      { logId: 't1', answer: 'accepted', date: '2026-10-23', lthrTo: 172 },
    ]);
  });
});

describe('cleanSettings: de nieuwe sleutels van de drempel', () => {
  it('strapWorn: de lijst gaat mee, rommel valt weg en telt', () => {
    const skipped = { n: 0 };
    expect(cleanSettings({ strapWorn: ['t1', 4, 't2'] }, skipped)?.strapWorn).toEqual(['t1', 't2']);
    expect(skipped.n).toBe(1);
    const bad = { n: 0 };
    expect(cleanSettings({ strapWorn: 'alles' }, bad)?.strapWorn).toBeUndefined();
    expect(bad.n).toBe(1);
  });

  it('lthrFactor en noStrapTest: alleen de keuzes', () => {
    const fine = { n: 0 };
    const ok = cleanSettings({ lthrFactor: 'friel', noStrapTest: 'margin' }, fine);
    expect([ok?.lthrFactor, ok?.noStrapTest, fine.n]).toEqual(['friel', 'margin', 0]);
    const skipped = { n: 0 };
    const out = cleanSettings({ lthrFactor: 1, noStrapTest: 'soms' }, skipped);
    expect([out?.lthrFactor, out?.noStrapTest, skipped.n]).toEqual([undefined, undefined, 2]);
  });

  it('de korte test: shortTest en shortTestWatch alleen waar of onwaar, de reeks alleen heel', () => {
    const fine = { n: 0 };
    const ok = cleanSettings({ shortTest: false, shortTestWatch: false, shortTestSeries: { answer: 'accepted', date: '2026-11-18', paceSecKm: 320.4 } }, fine);
    expect([ok?.shortTest, ok?.shortTestWatch, ok?.shortTestSeries, fine.n]).toEqual([false, false, { answer: 'accepted', date: '2026-11-18', paceSecKm: 320 }, 0]);
    const bad = { n: 0 };
    const out = cleanSettings({ shortTest: 'ja', shortTestSeries: { answer: 'accepted', date: '2026-11-18' } }, bad);
    expect([out?.shortTest, out?.shortTestSeries, bad.n]).toEqual([undefined, undefined, 2]);
  });

  it('de reeks van de korte test: een oudere back-up zonder reeks blijft zoals hij was', () => {
    expect(migrateShortTestSeries(undefined)).toEqual({ value: undefined, skipped: 0 });
    expect(migrateShortTestSeries({ answer: 'declined', date: '2026-11-18T10:00:00Z', paceSecKm: 'x' })).toEqual({ value: { answer: 'declined', date: '2026-11-18' }, skipped: 0 });
    expect(migrateShortTestSeries({ answer: 'misschien', date: '2026-11-18' })).toEqual({ value: undefined, skipped: 1 });
    expect(migrateShortTestSeries({ answer: 'accepted', date: '2026-11-18', paceSecKm: 40 })).toEqual({ value: undefined, skipped: 1 });
    expect(migrateShortTestSeries('aan')).toEqual({ value: undefined, skipped: 1 });
  });

  it('de reeks van de korte test: alleen een echte dag, niet later dan morgen (I-91)', () => {
    const today = '2026-11-20';
    const ok = (date: unknown) => migrateShortTestSeries({ answer: 'accepted', date, paceSecKm: 320 }, today);
    expect(ok('2026-11-18')).toEqual({ value: { answer: 'accepted', date: '2026-11-18', paceSecKm: 320 }, skipped: 0 });
    // De dag zelf en morgen (een back-up uit een andere tijdzone) mogen.
    expect(ok('2026-11-20').value?.date).toBe('2026-11-20');
    expect(ok('2026-11-21').value?.date).toBe('2026-11-21');
    // Leeg, geen dag van de kalender, of verder in de toekomst: weg, en geteld.
    for (const bad of ['', '   ', '2026-02-31', '2026-13-01', '2026-00-10', '0000-00-00', '2026-11-22', '2031-01-01', 20261118, null, undefined]) {
      expect(ok(bad)).toEqual({ value: undefined, skipped: 1 });
    }
    expect(migrateShortTestSeries({ answer: 'declined', date: '2026-02-30' }, today)).toEqual({ value: undefined, skipped: 1 });
    // Zonder reeks blijft een oudere back-up zoals hij was, en via cleanSettings valt een onmogelijke dag weg.
    const count = { n: 0 };
    expect(cleanSettings({ shortTestSeries: { answer: 'accepted', date: '2026-02-31', paceSecKm: 320 } }, count)?.shortTestSeries).toBeUndefined();
    expect(count.n).toBe(1);
    expect('shortTestSeries' in (cleanSettings({ shortTestSeries: { answer: 'accepted', date: '2026-02-31', paceSecKm: 320 } }, { n: 0 }) ?? {})).toBe(false);
  });

  it('testReadyLine: alleen waar of onwaar', () => {
    const fine = { n: 0 };
    expect(cleanSettings({ testReadyLine: false }, fine)?.testReadyLine).toBe(false);
    expect(fine.n).toBe(0);
    const skipped = { n: 0 };
    expect(cleanSettings({ testReadyLine: 'nee' }, skipped)?.testReadyLine).toBeUndefined();
    expect(skipped.n).toBe(1);
  });
});

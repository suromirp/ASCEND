import { describe, expect, it } from 'vitest';
import { migrateZoneAnswers } from './migrations';

describe('antwoorden op Zones bijwerken in een back-up', () => {
  it('een oudere back-up zonder antwoorden blijft zoals hij was', () => {
    expect(migrateZoneAnswers(undefined)).toEqual({ list: undefined, skipped: 0 });
    expect(migrateZoneAnswers(null)).toEqual({ list: undefined, skipped: 0 });
  });

  it('houdt goede antwoorden, laat een beschadigd antwoord vallen en telt het', () => {
    const out = migrateZoneAnswers([
      { logId: 't1', answer: 'accepted', date: '2026-10-21T08:00:00.000Z', lthrFrom: 165, lthrTo: 172 },
      { logId: 't2', answer: 'declined', date: '2026-10-22', lthrTo: 170, lthrFrom: 'veel' },
      { logId: '', answer: 'accepted', date: '2026-10-22', lthrTo: 170 },
      { logId: 't3', answer: 'misschien', date: '2026-10-22', lthrTo: 170 },
      { logId: 't4', answer: 'accepted', date: '2026-10-22', lthrTo: 999 },
      { logId: 't5', answer: 'accepted', date: 'gisteren', lthrTo: 170 },
      'rommel',
    ]);
    expect(out.list).toEqual([
      { logId: 't1', answer: 'accepted', date: '2026-10-21', lthrFrom: 165, lthrTo: 172 },
      { logId: 't2', answer: 'declined', date: '2026-10-22', lthrTo: 170 },
    ]);
    expect(out.skipped).toBe(5);
  });

  it('geen lijst is één overgeslagen veld', () => {
    expect(migrateZoneAnswers({ logId: 't1' })).toEqual({ list: undefined, skipped: 1 });
  });
});

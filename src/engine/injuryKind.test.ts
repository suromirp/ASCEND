import { describe, expect, it } from 'vitest';
import { injuryChangedSince } from './injuryKind';

describe('injuryChangedSince', () => {
  const since = '2026-10-20T08:00:00.000Z';

  it('telt spierpijn en stijf niet, ook niet als ze net gemeld zijn', () => {
    expect(injuryChangedSince([{ kind: 'spierpijn', date: '2026-10-25' }, { kind: 'stijf', date: '2026-10-25', resolvedDate: '2026-10-26' }], since)).toBe(false);
  });

  it('telt een nieuwe pijnmelding en een opgeloste, ook zonder soort', () => {
    expect(injuryChangedSince([{ date: '2026-10-25' }], since)).toBe(true);
    expect(injuryChangedSince([{ kind: 'pijn', date: '2026-09-01', resolvedDate: '2026-10-25' }], since)).toBe(true);
  });

  it('telt een oude pijnmelding niet', () => {
    expect(injuryChangedSince([{ kind: 'pijn', date: '2026-09-01' }], since)).toBe(false);
  });
});

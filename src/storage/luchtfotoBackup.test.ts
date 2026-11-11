import { describe, expect, it } from 'vitest';
import { cleanSettings } from './backupClean';
import { resolveMapPhoto } from '../engine/routeMap';

// Kaart of luchtfoto in een back-up: optioneel, dus geen migratie. Oud of kapot leest als Kaart.
describe('Kaart of luchtfoto in een back-up', () => {
  it('een oude back-up zonder het veld blijft zoals hij is en leest als Kaart', () => {
    const skipped = { n: 0 };
    const cleaned = cleanSettings({ routeMapBase: 'dark' }, skipped) as Record<string, unknown>;
    expect('routeMapPhoto' in cleaned).toBe(false);
    expect(skipped.n).toBe(0);
    expect(resolveMapPhoto(cleaned.routeMapPhoto)).toBe('map');
  });

  it('Luchtfoto blijft staan; een onbekende waarde valt weg en telt als overgeslagen', () => {
    expect((cleanSettings({ routeMapPhoto: 'photo' }, { n: 0 }) as Record<string, unknown>).routeMapPhoto).toBe('photo');
    const skipped = { n: 0 };
    const cleaned = cleanSettings({ routeMapPhoto: 'satelliet' }, skipped) as Record<string, unknown>;
    expect('routeMapPhoto' in cleaned).toBe(false);
    expect(skipped.n).toBe(1);
  });
});

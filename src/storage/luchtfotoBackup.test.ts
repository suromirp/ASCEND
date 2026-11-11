import { describe, expect, it } from 'vitest';
import { cleanSettings } from './backupClean';
import { groundSettings, resolveMapBase, resolveMapGround, resolveMapPhoto } from '../engine/routeMap';

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

describe('Ondergrond: één instelling met vier standen in twee velden', () => {
  it('leest elke oude back-up defensief', () => {
    expect(resolveMapGround({})).toBe('dark');
    expect(resolveMapGround({ routeMapBase: 'light' })).toBe('light');
    // Een back-up van vóór de samenvoeging met Luchtfoto aan: Luchtfoto, en de kaart erachter blijft Licht.
    expect(resolveMapGround({ routeMapBase: 'light', routeMapPhoto: 'photo' })).toBe('photo');
    expect(resolveMapBase('light')).toBe('light');
    // Geen wint: geen tegels, ook geen foto.
    expect(resolveMapGround({ routeMapBase: 'none', routeMapPhoto: 'photo' })).toBe('none');
    expect(resolveMapGround({ routeMapBase: 'kaartje', routeMapPhoto: 'satelliet' })).toBe('dark');
  });

  it('een keuze in Ondergrond bewaart beide velden', () => {
    expect(groundSettings('light', {})).toEqual({ routeMapBase: 'light', routeMapPhoto: undefined });
    expect(groundSettings('photo', { routeMapBase: 'light' })).toEqual({ routeMapPhoto: 'photo' });
    expect(groundSettings('photo', { routeMapBase: 'none' })).toEqual({ routeMapPhoto: 'photo', routeMapBase: undefined });
    expect(groundSettings('none', { routeMapBase: 'dark' })).toEqual({ routeMapBase: 'none', routeMapPhoto: undefined });
  });
});

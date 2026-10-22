import { describe, expect, it } from 'vitest';
import { normalizeSearch, searchSettings, type SearchableSetting } from './settingsSearch';
import { SETTINGS_GROUPS, SETTINGS_INDEX } from '../data/settingsIndex';

const ids = (q: string) => searchSettings(q, SETTINGS_INDEX).map((r) => r.item.id);

describe('normalizeSearch', () => {
  it('maakt kleine letters en haalt accenten weg', () => {
    expect(normalizeSearch('  Stoïcijns  ')).toBe('stoicijns');
    expect(normalizeSearch('CAFÉ')).toBe('cafe');
  });
});

describe('searchSettings', () => {
  it('geeft niets bij een lege zoekopdracht', () => {
    expect(ids('')).toEqual([]);
    expect(ids('   ')).toEqual([]);
  });

  it('horloge vindt Garmin, bovenaan', () => {
    const found = ids('horloge');
    expect(found).toContain('garmin');
    expect(found).toContain('horloge-gebruik');
    expect(found.slice(0, 3)).toContain('garmin');
  });

  it('gewicht vindt MacroFactor-gewicht, lichaamsgewicht en rugzak', () => {
    const found = ids('gewicht');
    expect(found).toContain('macrofactor-gewicht');
    expect(found).toContain('lichaamsgewicht');
    expect(found).toContain('rugzak');
  });

  it('hoofdletters en accenten maken niet uit', () => {
    expect(ids('GEWICHT')).toEqual(ids('gewicht'));
    expect(ids('stoicijns')).toEqual(ids('stoïcijns'));
    expect(ids('stoicijns')).toContain('weekvraag');
  });

  it('een titel telt zwaarder dan een trefwoord', () => {
    const found = ids('ochtendcheck');
    expect(found[0]).toBe('ochtendcheck');
  });

  it('alle woorden moeten passen', () => {
    const found = ids('weer ruilen');
    expect(found).toContain('weerruil');
    expect(found).not.toContain('citaten');
    expect(ids('weer bananen')).toEqual([]);
  });

  it('een begin van een woord is genoeg', () => {
    expect(ids('terugbl')).toContain('weekterugblik');
  });

  it('zet gelijke scores in de volgorde van de index', () => {
    const items: SearchableSetting[] = [
      { id: 'b', title: 'Beta', note: 'x', group: 'training', keywords: ['zoek'] },
      { id: 'a', title: 'Alfa', note: 'x', group: 'training', keywords: ['zoek'] },
    ];
    expect(searchSettings('zoek', items).map((r) => r.item.id)).toEqual(['b', 'a']);
  });
});

describe('de index zelf', () => {
  it('heeft unieke id\'s, bestaande groepen en een uitleg per instelling', () => {
    const groupIds = new Set(SETTINGS_GROUPS.map((g) => g.id));
    expect(new Set(SETTINGS_INDEX.map((i) => i.id)).size).toBe(SETTINGS_INDEX.length);
    for (const item of SETTINGS_INDEX) {
      expect(groupIds.has(item.group)).toBe(true);
      expect(item.note.length).toBeGreaterThan(10);
      expect(item.route === undefined || item.route.startsWith('/')).toBe(true);
    }
  });

  it('heeft de groepen in de afgesproken volgorde', () => {
    expect(SETTINGS_GROUPS.map((g) => g.title)).toEqual([
      'Training', 'Doelen en tochten', 'Overzichten en vragen', 'Koppelingen', 'Gegevens en back-up', 'Gidsen en kennis',
    ]);
  });

  it('bevat geen gedachtestreepjes', () => {
    const all = JSON.stringify([SETTINGS_INDEX, SETTINGS_GROUPS]);
    expect(all).not.toMatch(/[–—]/);
  });
});

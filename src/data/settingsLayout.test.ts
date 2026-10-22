import { describe, expect, it } from 'vitest';
import { SETTINGS_INDEX } from './settingsIndex';
import { PAGE_ROWS, SETTINGS_PAGES, allRowIds, isSettingsPageId, pageOfRow, placementOf, settingsPageRoute, SETTINGS_ROOT } from './settingsLayout';
import { searchSettings } from '../engine/settingsSearch';

// Rijen die geen instelling zijn om naar te zoeken: een knop naar een andere pagina.
// De sporten staan onder 'sporten', met het aantal keer per week.
const NOT_SEARCHABLE = ['forge-open', 'sport-hiking', 'sport-cycling'];

describe('de indeling in acht groepen', () => {
  it('heeft acht pagina\'s met een eigen route, in twee delen', () => {
    expect(SETTINGS_PAGES.map((p) => p.id)).toEqual(['planning', 'doel', 'forge', 'lichaam', 'vandaag', 'koppelingen', 'gegevens', 'gidsen']);
    expect(SETTINGS_PAGES.filter((p) => p.part === 'training').map((p) => p.id)).toEqual(['planning', 'doel', 'forge', 'lichaam']);
    expect(settingsPageRoute('forge')).toBe(`${SETTINGS_ROOT}/forge`);
    expect(isSettingsPageId('forge')).toBe(true);
    expect(isSettingsPageId('rommel')).toBe(false);
    expect(isSettingsPageId(undefined)).toBe(false);
  });

  it('elke rij staat op precies één pagina', () => {
    const all = SETTINGS_PAGES.flatMap((p) => allRowIds(p.id));
    expect(new Set(all).size).toBe(all.length);
    for (const page of SETTINGS_PAGES) for (const row of allRowIds(page.id)) expect(pageOfRow(row)).toBe(page.id);
  });

  it('elke instelling uit de index heeft een plek op een rij van een pagina', () => {
    for (const item of SETTINGS_INDEX) {
      const placement = placementOf(item.id);
      expect(placement, `${item.id} heeft geen plek`).toBeDefined();
      expect(allRowIds(placement!.page)).toContain(placement!.row);
    }
  });

  it('elke rij die je kunt zoeken staat in de index', () => {
    const ids = new Set(SETTINGS_INDEX.map((i) => i.id));
    const missing = SETTINGS_PAGES.flatMap((p) => allRowIds(p.id)).filter((row) => !ids.has(row) && !NOT_SEARCHABLE.includes(row) && !Object.values(placementsByRow()).includes(row));
    expect(missing).toEqual([]);
  });

  it('een instelling die in het blad van een rij zit opent dat blad', () => {
    expect(placementOf('herinnering-gewicht')).toEqual({ page: 'lichaam', row: 'lichaamsgewicht', sheet: true });
    expect(placementOf('weervolgt')).toEqual({ page: 'vandaag', row: 'weerplaats', sheet: true });
    expect(placementOf('sportschool')).toEqual({ page: 'forge', row: 'stangen' });
    expect(placementOf('bestaat-niet')).toBeUndefined();
  });

  it('wat achter Geavanceerd staat is een rij van dezelfde pagina', () => {
    expect(PAGE_ROWS.forge.advanced).toEqual(['forge-bereik', 'forge-schatting']);
    expect(pageOfRow('forge-bereik')).toBe('forge');
  });

  it('zoeken vindt elke instelling op de eigen titel', () => {
    for (const item of SETTINGS_INDEX) {
      const found = searchSettings(item.title, SETTINGS_INDEX).map((r) => r.item.id);
      expect(found, `"${item.title}" vindt ${item.id} niet`).toContain(item.id);
    }
  });
});

function placementsByRow(): Record<string, string> {
  return Object.fromEntries(SETTINGS_INDEX.flatMap((i) => {
    const p = placementOf(i.id);
    return p ? [[i.id, p.row]] : [];
  }));
}

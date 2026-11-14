import { describe, expect, it } from 'vitest';
import { SETTINGS_INDEX } from './settingsIndex';
import { PAGE_ROWS, SETTINGS_PAGES, SHOW_WHEN, allRowIds, isSettingsPageId, pageOfRow, placementOf, settingsPageRoute, settingsAdvancedRoute, isAdvancedRow, SETTINGS_ROOT } from './settingsLayout';
import { searchSettings } from '../engine/settingsSearch';

// Rijen die geen instelling zijn om naar te zoeken. De rijen met een blad (`bundel-`) zijn de naam
// van een groepje instellingen die zelf in de index staan.
const NOT_SEARCHABLE: string[] = [];

// Het plafond: wie een rij toevoegt, haalt er een weg of zet hem in een blad of onder Geavanceerd
// (docs/beslissingen/2026-10-26-instellingen-opruimen.md).
// De rij Geavanceerd zelf telt niet mee: ze is geen instelling maar de deur naar een eigen pagina.
const MAX_ROWS = 12;
const MAX_ADVANCED = 6;
const MIN_ADVANCED = 2;

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

  it('elke instelling uit de index heeft een plek op een rij van een pagina, of is een verwijzing', () => {
    for (const item of SETTINGS_INDEX) {
      const placement = placementOf(item.id);
      expect(placement, `${item.id} heeft geen plek`).toBeDefined();
      if (placement!.link) expect(item.route ?? item.id, item.id).toBeTruthy();
      else expect(allRowIds(placement!.page), `${item.id} staat op ${placement!.row}`).toContain(placement!.row);
    }
  });

  it('elke rij die je kunt zoeken staat in de index', () => {
    const ids = new Set(SETTINGS_INDEX.map((i) => i.id));
    const targets = new Set(Object.values(placementsByRow()));
    const missing = SETTINGS_PAGES.flatMap((p) => allRowIds(p.id)).filter((row) => !ids.has(row) && !NOT_SEARCHABLE.includes(row) && !targets.has(row));
    expect(missing).toEqual([]);
  });

  it('een instelling die in het blad van een rij zit opent dat blad', () => {
    expect(placementOf('herinnering-gewicht')).toEqual({ page: 'lichaam', row: 'lichaamsgewicht', sheet: true });
    expect(placementOf('weervolgt')).toEqual({ page: 'vandaag', row: 'weerplaats', sheet: true });
    expect(placementOf('sportschool')).toEqual({ page: 'forge', row: 'bundel-sportschool', sheet: true });
    expect(placementOf('stangen')).toEqual({ page: 'forge', row: 'bundel-sportschool', sheet: true });
    expect(placementOf('forge-signaal')).toEqual({ page: 'forge', row: 'bundel-rusttimer', sheet: true });
    expect(placementOf('forge-bereik')).toEqual({ page: 'forge', row: 'bundel-rekenmodel', sheet: true });
    expect(placementOf('rustdag')).toEqual({ page: 'planning', row: 'bundel-dagen', sheet: true });
    expect(placementOf('zware-dingen')).toEqual({ page: 'planning', row: 'meerdere', sheet: true });
    expect(placementOf('lucht-vanaf')).toEqual({ page: 'vandaag', row: 'lucht', sheet: true });
    expect(placementOf('lichterbenen')).toEqual({ page: 'vandaag', row: 'lichterbenen' });
    expect(placementOf('lichterbenen-hoe')).toEqual({ page: 'vandaag', row: 'lichterbenen', sheet: true });
    expect(placementOf('horloge-status-week')).toEqual({ page: 'koppelingen', row: 'bundel-horloge-sturen', sheet: true });
    expect(placementOf('bestaat-niet')).toBeUndefined();
  });

  it('een gewone rij opent geen blad, een oud anker blijft vindbaar', () => {
    expect(placementOf('forge')).toEqual({ page: 'forge', row: 'forge' });
    expect(placementOf('ochtendcheck')).toEqual({ page: 'vandaag', row: 'kaarten', sheet: true });
    expect(placementOf('beweging')).toEqual({ page: 'vandaag', row: 'beweging' });
  });

  it('wat geen instelling is staat niet meer als rij, en blijft als verwijzing vindbaar', () => {
    const rows = SETTINGS_PAGES.flatMap((p) => allRowIds(p.id));
    for (const gone of ['forge-open', 'reisplanner', 'paklijst', 'horloge-status-week']) expect(rows, gone).not.toContain(gone);
    expect(placementOf('reisplanner')).toEqual({ page: 'doel', row: 'reisplanner', link: true });
    expect(placementOf('paklijst')).toEqual({ page: 'doel', row: 'paklijst', link: true });
    // Health Connect is weer een echte rij, met een schakelaar (docs/beslissingen/2026-11-02-health-connect.md).
    expect(placementOf('health-connect')).toEqual({ page: 'koppelingen', row: 'health-connect' });
    expect(PAGE_ROWS.gegevens.footer).toEqual(['versie']);
    expect(placementOf('versie')).toEqual({ page: 'gegevens', row: 'versie' });
  });

  it('wat achter Geavanceerd staat is een rij van dezelfde pagina', () => {
    expect(PAGE_ROWS.forge.advanced).toEqual(['trainingsduur', 'forge-tijdsgrens', 'bundel-rekenmodel', 'bundel-invullen', 'bundel-toets', 'forge-bergspieren']);
    expect(pageOfRow('bundel-rekenmodel')).toBe('forge');
    expect(pageOfRow('forge-bergspieren')).toBe('forge');
  });

  it('Geavanceerd is een eigen pagina onder de groep, en zoeken vindt de rijen daar nog', () => {
    expect(settingsAdvancedRoute('forge')).toBe(`${SETTINGS_ROOT}/forge/geavanceerd`);
    expect(isAdvancedRow('forge', 'bundel-rekenmodel')).toBe(true);
    expect(isAdvancedRow('forge', 'forge')).toBe(false);
    // Een instelling in een blad van een geavanceerde rij wijst naar die rij, en die staat op Geavanceerd.
    const place = placementOf('forge-vermoeidheid');
    expect(place?.row).toBe('bundel-rekenmodel');
    expect(isAdvancedRow(place!.page, place!.row)).toBe(true);
    expect(placementOf('korte-nacht')).toEqual({ page: 'vandaag', row: 'korte-nacht' });
  });

  it('zoeken vindt elke instelling op de eigen titel', () => {
    for (const item of SETTINGS_INDEX) {
      const found = searchSettings(item.title, SETTINGS_INDEX).map((r) => r.item.id);
      expect(found, `"${item.title}" vindt ${item.id} niet`).toContain(item.id);
    }
  });

  it('zoeken vindt een instelling ook op de naam van het blad waar hij nu in zit', () => {
    const find = (q: string) => searchSettings(q, SETTINGS_INDEX).map((r) => r.item.id);
    expect(find('rekenmodel')).toContain('forge-vermoeidheid');
    expect(find('rusttimer')).toContain('forge-geluid');
    expect(find('dagen en tijd')).toContain('rustdag');
    expect(find('mijn sportschool')).toContain('kabels');
    expect(find('weer en kleding')).toContain('weerruil');
  });
});

describe('het plafond per groep', () => {
  for (const page of SETTINGS_PAGES) {
    it(`${page.title}: hoogstens ${MAX_ROWS} rijen en hoogstens ${MAX_ADVANCED} onder Geavanceerd, dat er alleen is bij minstens ${MIN_ADVANCED}`, () => {
      const { rows, advanced } = PAGE_ROWS[page.id];
      expect(rows.length, `${page.id} heeft ${rows.length} rijen`).toBeLessThanOrEqual(MAX_ROWS);
      expect(advanced.length, `${page.id} heeft ${advanced.length} rijen onder Geavanceerd`).toBeLessThanOrEqual(MAX_ADVANCED);
      if (advanced.length > 0) expect(advanced.length, `${page.id}: Geavanceerd met een rij`).toBeGreaterThanOrEqual(MIN_ADVANCED);
    });
  }

  it('elke voorwaarde hoort bij een rij of bij een keuze die in de index of in een blad staat', () => {
    const ids = new Set(SETTINGS_INDEX.map((i) => i.id));
    const rows = new Set(SETTINGS_PAGES.flatMap((p) => allRowIds(p.id)));
    for (const row of Object.keys(SHOW_WHEN)) expect(ids.has(row) || rows.has(row), row).toBe(true);
  });
});

function placementsByRow(): Record<string, string> {
  return Object.fromEntries(SETTINGS_INDEX.flatMap((i) => {
    const p = placementOf(i.id);
    return p ? [[i.id, p.row]] : [];
  }));
}

describe('datavelden bekijken', () => {
  // Bewust mee (14 november, besluit 2026-11-14-info-blad-a.md): de rij staat nu bij Gidsen, naast
  // Trainingsplekken en Bronnen, niet meer onder Geavanceerd van Koppelingen.
  it('zoeken op "datavelden" vindt de rij die naar de pagina gaat, bij Gidsen', () => {
    const found = searchSettings('datavelden', SETTINGS_INDEX).map((r) => r.item.id);
    expect(found).toContain('datavelden-bekijken');
    expect(pageOfRow('datavelden-bekijken')).toBe('gidsen');
    expect(isAdvancedRow('gidsen', 'datavelden-bekijken')).toBe(false);
    expect(allRowIds('koppelingen')).not.toContain('datavelden-bekijken');
    expect(SETTINGS_INDEX.find((i) => i.id === 'datavelden-bekijken')?.route).toBe('/horloge/datavelden');
  });
});

// ASCEND: de verklaringen in settingsDefs/ (docs/visie/Ontwerp instellingen op een plek.md).
//
// Sinds stap 2 en 3 komen de index, de rijen, de plekken, de voorwaarden, de uitleg en de keuzes alleen nog uit
// de verklaringen (de uitleg uit uitleg/<groep>.ts, de keuzes uit <GROEP>_CHOICES); dat ze niets veranderden
// bewijst de foto (settingsFoto.test.ts). Hier staat wat de vorm bewaakt: dat alles één eigenaar heeft en dat
// de verwijzingen kloppen. Het advies (settingsDiff.ts) en de titels op de pagina's zijn nog niet verhuisd.

import { describe, expect, it } from 'vitest';
import { SETTINGS_INDEX } from '../data/settingsIndex';
import { placementOf } from '../data/settingsLayout';
import { SETTINGS_HELP, UITLEG } from '../data/settingsHelp';
import { hasSettingsHelp } from '../data/settingsHelpKeys';
import { CHOICES } from '../data/settingsChoices';
import { ADVICE_SPECS } from './settingsDiff';
import { ALL_DEFS, DEFS, PAGE_ORDER } from './settingsDefs/index';
import { deriveChoices, deriveHelpKeys } from './settingsDefs/derive';
import { ADVICE_ORDER } from './settingsDefs/order';

const GROUP_FILES = import.meta.glob<string>('./settingsDefs/*.ts', { query: '?raw', import: 'default', eager: true });
const APP_SOURCES = import.meta.glob<string>(['../**/*.ts', '../**/*.tsx', '!../**/*.test.ts'], { query: '?raw', import: 'default', eager: true });
const PAGES_TSX = import.meta.glob<string>(['../components/settings/**/*.tsx', '../pages/settings/*.tsx'], { query: '?raw', import: 'default', eager: true });

// Rijen waarvan de titel of de bladkop op de pagina een expressie is, zodat de test ze niet kan lezen, met de reden.
const NIET_GELEZEN: Record<string, string> = {
  'bundel-horloge-gebruik': 'titel en bladkop zijn usageTitle in KoppelingenGroup.tsx (met Health Connect: Gebruik van je gegevens)',
};

describe('de vorm van de verklaringen', () => {
  it('elke id staat er één keer, in het bestand van een groep', () => {
    expect(ALL_DEFS.length, 'dubbele id').toBe(Object.keys(DEFS).length);
    for (const d of ALL_DEFS) expect(PAGE_ORDER, d.id).toContain(d.page);
  });

  it('een plek in of aan een rij wijst naar een rij die bestaat, en elke instelling heeft een plek', () => {
    for (const d of ALL_DEFS) {
      if ('in' in d.place || 'on' in d.place) {
        const row = 'in' in d.place ? d.place.in : d.place.on;
        expect(DEFS[row] && 'row' in DEFS[row].place, `${d.id}: ${row} is geen rij`).toBe(true);
        expect(DEFS[row].page, `${d.id} staat in een rij van een andere groep`).toBe(d.page);
      }
      expect(placementOf(d.id), `${d.id} heeft geen plek`).toBeDefined();
    }
  });

  it('een instelling in de index heeft een zin en trefwoorden; een rij erbuiten niet', () => {
    for (const d of ALL_DEFS) {
      if (d.search === false) expect(d.note === undefined && d.keywords === undefined, d.id).toBe(true);
      else {
        expect(d.note, `${d.id} zonder zin`).toBeTruthy();
        expect(d.keywords?.length, `${d.id} zonder trefwoorden`).toBeGreaterThan(0);
      }
    }
    expect(SETTINGS_INDEX.length).toBe(ALL_DEFS.filter((d) => d.search !== false).length);
  });

  it('een voorwaarde wijst naar een instelling die bestaat', () => {
    for (const d of ALL_DEFS) for (const b of d.showWhen ?? []) expect(DEFS[b.parent], `${d.id}: ouder ${b.parent} bestaat niet`).toBeDefined();
  });

  it('het advies houdt zijn volgorde (order.ts)', () => {
    const knownAdvice = new Set(ADVICE_ORDER);
    expect(ADVICE_SPECS.map((s) => s.id).filter((id) => knownAdvice.has(id))).toEqual([...ADVICE_ORDER].filter((id) => ADVICE_SPECS.some((s) => s.id === id)));
  });
});

describe('de verklaringen tegenover de uitleg, de keuzes, het advies en de pagina\'s', () => {
  it('de uitleg: elke tekst hoort bij één verklaring met help: true, onder één sleutel', () => {
    const { keys, doubles } = deriveHelpKeys();
    expect(doubles, 'twee verklaringen maken dezelfde sleutel').toEqual([]);
    for (const d of ALL_DEFS) if (d.help === true) expect(UITLEG[d.id], `${d.id} heeft help: true maar geen tekst in uitleg/${d.page}.ts`).toBeDefined();
    for (const id of Object.keys(UITLEG)) expect(DEFS[id]?.help, `uitleg ${id} hoort bij geen verklaring met help: true`).toBe(true);
    expect(Object.keys(SETTINGS_HELP).sort()).toEqual([...keys].sort());
    for (const key of keys) expect(hasSettingsHelp(key), key).toBe(true);
    for (const d of ALL_DEFS) if (d.help && d.help !== true) expect(DEFS[d.help.from]?.help, `${d.id} leent uitleg van ${d.help.from}, die zelf geen uitleg heeft`).toBe(true);
    for (const [key, c] of Object.entries(CHOICES)) if (c.help) expect(hasSettingsHelp(c.help), `keuze ${key} wijst naar uitleg ${c.help} die niet bestaat`).toBe(true);
  });

  it('de keuzes: elke keuze hoort bij één verklaring, onder haar sleutel in CHOICES', () => {
    const { choices, doubles } = deriveChoices();
    expect(doubles, 'twee verklaringen maken dezelfde keuze').toEqual([]);
    for (const [key, def] of Object.entries(CHOICES)) expect(choices[key], `keuze ${key} hoort bij geen verklaring`).toBe(def);
    expect(Object.keys(choices).filter((k) => !(k in CHOICES)), 'keuze die niet in CHOICES staat').toEqual([]);
  });

  it('de titel in Aangepaste instellingen en de groep van het advies', () => {
    for (const spec of ADVICE_SPECS) {
      const d = DEFS[spec.id];
      expect(d, `advies ${spec.id} heeft geen verklaring`).toBeDefined();
      expect(d.adviceTitle ?? d.title, `adviceTitle van ${spec.id}`).toBe(spec.title);
      expect(d.page, `groep van ${spec.id}`).toBe(spec.page);
    }
    for (const d of ALL_DEFS) if (d.adviceTitle) expect(ADVICE_SPECS.some((s) => s.id === d.id), `${d.id} heeft adviceTitle zonder advies`).toBe(true);
  });

  it('de titel op de pagina en de kop van het blad, zoals de groepspagina ze schrijft', () => {
    // Alleen een rij met een letterlijke id en titel, en een blad met een letterlijke kop. Wat de test zo niet kan
    // lezen staat in NIET_GELEZEN; elke andere rowTitle, bladkop of titel van een rij buiten de index moet gelezen zijn.
    const readTitle = new Set<string>();
    const readSheet = new Set<string>();
    for (const [file, text] of Object.entries(PAGES_TSX)) {
      for (const m of text.matchAll(/<(?:SummaryRow|SettingsRow|SettingsFieldRow)\b([^<]{0,800})/g)) {
        const id = /\bid="([^"]+)"/.exec(m[1])?.[1];
        const title = /\btitle="([^"]+)"/.exec(m[1])?.[1];
        if (!id || !title || !DEFS[id]) continue;
        expect(DEFS[id].rowTitle ?? DEFS[id].title, `${file}: rij ${id}`).toBe(title);
        readTitle.add(id);
      }
      for (const m of text.matchAll(/===\s*'([^']+)'\s*&&\s*\(?\s*<BundleSheet\b([^<]{0,600})/g)) {
        const eyebrow = /\beyebrow="([^"]+)"/.exec(m[2])?.[1];
        const title = /\btitle="([^"]+)"/.exec(m[2])?.[1];
        const line = /\bline="([^"]+)"/.exec(m[2])?.[1];
        if (!eyebrow || !title || !DEFS[m[1]]) continue;
        expect(DEFS[m[1]].sheet, `${file}: blad ${m[1]}`).toEqual({ eyebrow, title, ...(line ? { line } : {}) });
        readSheet.add(m[1]);
      }
    }
    for (const d of ALL_DEFS) {
      if (d.id in NIET_GELEZEN) continue;
      if (d.rowTitle) expect(readTitle.has(d.id), `rowTitle van ${d.id} staat op geen pagina als letterlijke titel`).toBe(true);
      if (d.search === false) expect(readTitle.has(d.id), `titel van ${d.id} (niet in de index) staat op geen pagina als letterlijke titel`).toBe(true);
      if (d.sheet) expect(readSheet.has(d.id), `bladkop van ${d.id} staat op geen pagina als letterlijke kop`).toBe(true);
    }
    for (const id of Object.keys(NIET_GELEZEN)) {
      expect(DEFS[id], `${id} in NIET_GELEZEN bestaat niet`).toBeDefined();
      expect(readTitle.has(id) && (!DEFS[id].sheet || readSheet.has(id)), `${id} wordt nu wel gelezen: haal hem uit NIET_GELEZEN`).toBe(false);
    }
  });

  it('een groepsbestand leest nooit de oude bestanden of de samenvatting', () => {
    const groups = Object.entries(GROUP_FILES).filter(([file]) => PAGE_ORDER.some((p) => file.endsWith(`/${p}.ts`)));
    expect(groups).toHaveLength(8);
    for (const [file, text] of groups) {
      expect(text, file).not.toMatch(/from '[^']*(settingsSummary|settingsDiff|settingsLayout|settingsIndex|settingsChoices|uitleg\/\w+)'/);
      expect(text, `${file} haalt de uitleg binnen, die niet bij de start mag laden`).not.toMatch(/^import (?!type)[^\n]*settingsHelp'/m);
    }
  });

  it('de uitleg laadt niet bij de start: alleen settingsHelpKeys.ts haalt settingsHelp.ts op, met import()', () => {
    const static_ = Object.entries(APP_SOURCES)
      .filter(([file, text]) => !file.endsWith('/data/settingsHelp.ts') && /^import (?!type)[^\n]*from '[^']*\/settingsHelp'/m.test(text))
      .map(([file]) => file);
    expect(static_, 'importeer de uitleg via data/settingsHelpKeys.ts').toEqual([]);
  });
});

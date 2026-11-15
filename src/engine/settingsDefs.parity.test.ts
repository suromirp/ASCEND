// ASCEND: de verklaringen in settingsDefs/ zeggen hetzelfde als de oude bestanden (docs/visie/Ontwerp
// instellingen op een plek.md, stap 1). Tot stap 2 en 3 zijn de oude bestanden de bron: wie een instelling
// toevoegt of een tekst verandert, doet dat daar en zet hetzelfde in src/engine/settingsDefs/<groep>.ts. Een
// verklaring die ontbreekt staat in de foutmelding, klaar om over te nemen.

import { describe, expect, it } from 'vitest';
import { SETTINGS_INDEX } from '../data/settingsIndex';
import { PAGE_ROWS, SETTINGS_PAGES, allRowIds, placementOf } from '../data/settingsLayout';
import { SETTINGS_HELP, settingsHelp } from '../data/settingsHelp';
import { CHOICES } from '../data/settingsChoices';
import { ADVICE_SPECS } from './settingsDiff';
import { ALL_DEFS, DEFS, PAGE_ORDER } from './settingsDefs/index';
import { deriveChoices, deriveHelp, deriveIndex, derivePageRows, derivePlacement } from './settingsDefs/derive';
import { ADVICE_ORDER, INDEX_ORDER } from './settingsDefs/order';

const GROUP_FILES = import.meta.glob<string>('./settingsDefs/*.ts', { query: '?raw', import: 'default', eager: true });
const PAGES_TSX = import.meta.glob<string>(['../components/settings/**/*.tsx', '../pages/settings/*.tsx'], { query: '?raw', import: 'default', eager: true });

// Rijen waarvan de titel of de bladkop op de pagina een expressie is, zodat de test ze niet kan lezen, met de reden.
const NIET_GELEZEN: Record<string, string> = {
  'bundel-horloge-gebruik': 'titel en bladkop zijn usageTitle in KoppelingenGroup.tsx (met Health Connect: Gebruik van je gegevens)',
};

// Wat er bij een nieuwe instelling in de verklaring hoort, om over te nemen.
function expected(id: string): string {
  const item = SETTINGS_INDEX.find((i) => i.id === id);
  const p = placementOf(id);
  const place = !p ? '?' : p.link ? '{ link: true }' : p.row !== id ? (p.sheet ? `{ in: '${p.row}' }` : `{ on: '${p.row}' }`) : '{ row: true }';
  return `ontbreekt in settingsDefs/${item?.group ?? p?.page ?? '?'}.ts: { id: '${id}', page: '${item?.group ?? p?.page}', place: ${place}, title: ${JSON.stringify(item?.title ?? '')}${item ? `, note: ${JSON.stringify(item.note)}, keywords: ${JSON.stringify(item.keywords)}` : ', search: false'} }`;
}

describe('de verklaringen tegenover de oude bestanden', () => {
  it('elke id staat er één keer, in het bestand van zijn groep', () => {
    expect(ALL_DEFS.length, 'dubbele id').toBe(Object.keys(DEFS).length);
    for (const d of ALL_DEFS) expect(PAGE_ORDER, d.id).toContain(d.page);
    const rowIds = SETTINGS_PAGES.flatMap((p) => allRowIds(p.id));
    for (const id of new Set([...SETTINGS_INDEX.map((i) => i.id), ...rowIds])) expect(DEFS[id], expected(id)).toBeDefined();
  });

  it('de index: elke instelling met dezelfde titel, zin, groep, trefwoorden en route', () => {
    const derived = new Map(deriveIndex().map((i) => [i.id, i]));
    for (const item of SETTINGS_INDEX) expect(derived.get(item.id), expected(item.id)).toEqual(item);
    expect([...derived.keys()].filter((id) => !SETTINGS_INDEX.some((i) => i.id === id)), 'in de verklaringen maar niet in de index').toEqual([]);
  });

  it('de index en het advies houden hun volgorde (order.ts)', () => {
    const known = new Set(INDEX_ORDER);
    expect(SETTINGS_INDEX.map((i) => i.id).filter((id) => known.has(id))).toEqual(deriveIndex().map((i) => i.id).filter((id) => known.has(id)));
    const knownAdvice = new Set(ADVICE_ORDER);
    expect(ADVICE_SPECS.map((s) => s.id).filter((id) => knownAdvice.has(id))).toEqual([...ADVICE_ORDER].filter((id) => ADVICE_SPECS.some((s) => s.id === id)));
  });

  it('de rijen per pagina, in dezelfde volgorde', () => {
    expect(derivePageRows()).toEqual(PAGE_ROWS);
  });

  it('de plek van elke instelling en elke rij', () => {
    const ids = new Set([...SETTINGS_INDEX.map((i) => i.id), ...SETTINGS_PAGES.flatMap((p) => allRowIds(p.id)), ...ALL_DEFS.map((d) => d.id)]);
    for (const id of ids) expect(derivePlacement(id), id).toEqual(placementOf(id));
    for (const d of ALL_DEFS) if ('in' in d.place || 'on' in d.place) {
      const row = 'in' in d.place ? d.place.in : d.place.on;
      expect(DEFS[row] && 'row' in DEFS[row].place, `${d.id}: ${row} is geen rij`).toBe(true);
    }
  });

  it('de uitleg: elke sleutel één keer, met dezelfde tekst', () => {
    const { help, neutral, doubles } = deriveHelp();
    expect(doubles, 'twee verklaringen maken dezelfde sleutel').toEqual([]);
    for (const key of Object.keys(SETTINGS_HELP)) expect(help[key], `uitleg ${key} hoort bij geen verklaring (help, helpKey)`).toEqual(SETTINGS_HELP[key]);
    expect(Object.keys(help).filter((k) => !SETTINGS_HELP[k]), 'uitleg die in settingsHelp.ts niet bestaat').toEqual([]);
    for (const key of Object.keys(SETTINGS_HELP)) {
      const old = settingsHelp(key, false);
      expect(neutral[key] ?? help[key], `uitleg zonder namen ${key}`).toEqual(old);
    }
    for (const d of ALL_DEFS) if (d.help && 'from' in d.help) {
      const from = DEFS[d.help.from];
      expect(from?.help && !('from' in from.help), `${d.id} leent uitleg van ${d.help.from}, die zelf geen uitleg heeft`).toBe(true);
    }
  });

  it('de keuzes: elke keuze één keer, gelijk aan CHOICES', () => {
    const { choices, doubles } = deriveChoices();
    expect(doubles, 'twee verklaringen maken dezelfde keuze').toEqual([]);
    for (const [key, def] of Object.entries(CHOICES)) expect(choices[key], `keuze ${key} hoort bij geen verklaring`).toEqual(def);
    expect(Object.keys(choices).filter((k) => !(k in CHOICES)), 'keuze die in settingsChoices.ts niet bestaat').toEqual([]);
  });

  it('de titel in Aangepaste instellingen en de groep van het advies', () => {
    for (const spec of ADVICE_SPECS) {
      const d = DEFS[spec.id];
      expect(d, expected(spec.id)).toBeDefined();
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
      expect(text, file).not.toMatch(/from '[^']*(settingsSummary|settingsDiff|settingsLayout|settingsIndex)'/);
    }
  });
});

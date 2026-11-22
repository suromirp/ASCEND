// ASCEND: de oude vormen, afgeleid uit de verklaringen (docs/visie/Ontwerp instellingen op een plek.md,
// hoofdstuk 2, "Hoe de oude vormen eruit volgen"). Sinds stap 2 lezen SETTINGS_INDEX (data/settingsIndex.ts) en
// PAGE_ROWS, MOVED, LINKS en SHOW_WHEN (data/settingsLayout.ts) hier, sinds stap 3 ook de sleutels van de
// uitleg (de tekst bouwt data/settingsHelp.ts uit uitleg/<groep>.ts).

import type { PageRows, SettingPlacement, SettingsPageId } from '../../data/settingsLayout';
import type { SettingsIndexItem } from '../../data/settingsIndex';
import type { Blocker, ChoiceDef, SettingDef } from './types';
import { ALL_DEFS, PAGE_ORDER } from './index';
import { INDEX_ORDER } from './order';

// Volgens een lijst id's; een id die er niet in staat komt achter de laatste van zijn groep.
export function inOrder<T extends { id: string; page: SettingsPageId }>(items: readonly T[], order: readonly string[]): T[] {
  const pos = new Map(order.map((id, i) => [id, i]));
  const result = items.filter((d) => pos.has(d.id)).sort((a, b) => pos.get(a.id)! - pos.get(b.id)!);
  for (const d of items.filter((x) => !pos.has(x.id))) {
    let at = -1;
    result.forEach((r, i) => { if (r.page === d.page) at = i; });
    result.splice(at === -1 ? result.length : at + 1, 0, d);
  }
  return result;
}

export function deriveIndex(defs: readonly SettingDef[] = ALL_DEFS): SettingsIndexItem[] {
  return inOrder(defs.filter((d) => d.search !== false), INDEX_ORDER).map((d) => ({
    id: d.id,
    title: d.title,
    group: d.page,
    note: d.note ?? '',
    keywords: d.keywords ?? [],
    ...(d.route ? { route: d.route } : {}),
  }));
}

// De zin van een instelling; met Krachttraining uit de variant zonder kracht, als die er is.
export function noteFor(id: string, strengthOn: boolean, defs: readonly SettingDef[] = ALL_DEFS): string {
  const d = defs.find((x) => x.id === id);
  return (!strengthOn && d?.noteNoStrength) || d?.note || '';
}

export function derivePageRows(defs: readonly SettingDef[] = ALL_DEFS): Record<SettingsPageId, PageRows> {
  const out = {} as Record<SettingsPageId, PageRows>;
  for (const page of PAGE_ORDER) {
    const rows = defs.filter((d) => d.page === page && 'row' in d.place);
    const kind = (d: SettingDef) => ('row' in d.place ? (d.place.advanced ? 'advanced' : d.place.footer ? 'footer' : 'rows') : null);
    const footer = rows.filter((d) => kind(d) === 'footer').map((d) => d.id);
    out[page] = {
      rows: rows.filter((d) => kind(d) === 'rows').map((d) => d.id),
      advanced: rows.filter((d) => kind(d) === 'advanced').map((d) => d.id),
      ...(footer.length > 0 ? { footer } : {}),
    };
  }
  return out;
}

export function deriveLinks(defs: readonly SettingDef[] = ALL_DEFS): Record<string, SettingsPageId> {
  return Object.fromEntries(defs.filter((d) => 'link' in d.place).map((d) => [d.id, d.page]));
}

export function deriveMoved(defs: readonly SettingDef[] = ALL_DEFS): Record<string, { row: string; sheet?: boolean }> {
  return Object.fromEntries(defs.flatMap((d) => ('in' in d.place ? [[d.id, { row: d.place.in, sheet: true }]] : 'on' in d.place ? [[d.id, { row: d.place.on }]] : [])));
}

export function deriveShowWhen(defs: readonly SettingDef[] = ALL_DEFS): Record<string, Blocker[]> {
  return Object.fromEntries(defs.flatMap((d) => (d.showWhen ? [[d.id, d.showWhen]] : [])));
}

// Dezelfde regels als placementOf in data/settingsLayout.ts.
export function derivePlacement(id: string, defs: readonly SettingDef[] = ALL_DEFS): SettingPlacement | undefined {
  const link = deriveLinks(defs)[id];
  if (link) return { page: link, row: id, link: true };
  const moved = deriveMoved(defs)[id];
  const row = moved?.row ?? id;
  const rowDef = defs.find((d) => d.id === row && 'row' in d.place);
  if (!rowDef) return undefined;
  return { page: rowDef.page, row, ...(moved?.sheet ? { sheet: true } : {}) };
}

// De sleutel van de uitleg van een verklaring: de eigen sleutel, of die van de verklaring waar hij hem van leent.
export function helpKeyOf(def: SettingDef, defs: readonly SettingDef[] = ALL_DEFS): string | undefined {
  if (!def.help) return undefined;
  if (def.help !== true) {
    const from = def.help.from;
    const owner = defs.find((d) => d.id === from);
    return owner ? helpKeyOf(owner, defs) : undefined;
  }
  return def.helpKey ?? def.id;
}

// De sleutels die uitleg hebben (`helpKey ?? id` van elke verklaring met `help: true`). Licht: de tekst zelf
// staat in uitleg/<groep>.ts en laadt pas in Instellingen (data/settingsHelpKeys.ts). Een sleutel die twee keer
// gemaakt wordt staat in `doubles`.
export function deriveHelpKeys(defs: readonly SettingDef[] = ALL_DEFS): { keys: string[]; doubles: string[] } {
  const keys: string[] = [];
  const doubles: string[] = [];
  for (const d of defs) {
    if (d.help !== true) continue;
    const key = d.helpKey ?? d.id;
    if (keys.includes(key)) doubles.push(key);
    else keys.push(key);
  }
  return { keys, doubles };
}

export function deriveChoices(defs: readonly SettingDef[] = ALL_DEFS): { choices: Record<string, ChoiceDef<string | number>>; doubles: string[] } {
  const choices: Record<string, ChoiceDef<string | number>> = {};
  const doubles: string[] = [];
  for (const d of defs) {
    if (!d.choice) continue;
    if (choices[d.choice.key]) doubles.push(d.choice.key);
    choices[d.choice.key] = d.choice.def;
  }
  return { choices, doubles };
}

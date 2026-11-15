// ASCEND: waar elke instelling staat in de acht groepen van Instellingen
// (docs/beslissingen/2026-10-22-instellingen-in-groepen.md).
//
// De index (data/settingsIndex.ts) bepaalt wat er te zoeken valt; dit bestand
// bepaalt de pagina, de rij en of er een blad opent. Zo kan het zoekveld elke
// instelling vinden en er naartoe springen, en bewaakt een test dat geen
// instelling een plek mist. De id van een rij is ook het anker
// (`instelling-<id>`), en bij een instelling uit de index is het hetzelfde id.
//
// Ook de afhankelijkheden lezen hier (`SHOW_WHEN`): wat bij een andere instelling
// hoort bestaat niet zolang die uit staat (docs/beslissingen/2026-10-26-instellingen-opruimen.md).
//
// Sinds stap 2 van docs/visie/Ontwerp instellingen op een plek.md komen de rijen, de plekken en de
// voorwaarden uit de verklaringen in engine/settingsDefs/<groep>.ts (`place` en `showWhen`); de
// volgorde van de rijen is die van het bestand.

import type { AppSettings } from '../storage/database';
import type { Blocker, RowContext } from '../engine/settingsDefs/types';
import { deriveLinks, deriveMoved, derivePageRows, deriveShowWhen } from '../engine/settingsDefs/derive';

export type { Blocker, RowContext };

// De plek van de pagina's: /more is het overzicht (ook voor het tandwiel en oude links),
// /more/:groep een groep. Een onbekende groep gaat terug naar het overzicht.
export const SETTINGS_ROOT = '/more';

export type SettingsPageId = 'planning' | 'doel' | 'forge' | 'lichaam' | 'vandaag' | 'koppelingen' | 'gegevens' | 'gidsen';

export interface SettingsPage {
  id: SettingsPageId;
  title: string;
  // Op het overzicht onder "Je training" of onder "De app".
  part: 'training' | 'app';
}

// De vaste volgorde op het overzicht.
export const SETTINGS_PAGES: SettingsPage[] = [
  { id: 'planning', title: 'Planning', part: 'training' },
  { id: 'doel', title: 'Doel en tochten', part: 'training' },
  { id: 'forge', title: 'Forge', part: 'training' },
  { id: 'lichaam', title: 'Lichaam', part: 'training' },
  { id: 'vandaag', title: 'Vandaag en meldingen', part: 'app' },
  { id: 'koppelingen', title: 'Koppelingen', part: 'app' },
  { id: 'gegevens', title: 'Gegevens en back-up', part: 'app' },
  { id: 'gidsen', title: 'Gidsen en kennis', part: 'app' },
];

export const settingsPageRoute = (id: SettingsPageId): string => `${SETTINGS_ROOT}/${id}`;
// Geavanceerd is een eigen pagina onder de groep: /more/<groep>/geavanceerd
// (docs/beslissingen/2026-11-02-instellingen-ronde3.md).
export const settingsAdvancedRoute = (id: SettingsPageId): string => `${SETTINGS_ROOT}/${id}/geavanceerd`;
export const isSettingsPageId = (value: string | undefined): value is SettingsPageId => SETTINGS_PAGES.some((p) => p.id === value);
export const settingsPageTitle = (id: SettingsPageId): string => SETTINGS_PAGES.find((p) => p.id === id)?.title ?? '';

// Alle rijen per pagina, in volgorde. `advanced` staan op de eigen pagina Geavanceerd (alleen bij minstens
// twee rijen; de rij die erheen gaat telt niet mee in het plafond van `rows`), `footer` is tekst onderaan de pagina (telt niet als rij). Een rij met `bundel-` is
// een rij met een blad: de losse keuzes erin hebben `place: { in: <rij> }` (in MOVED met `sheet: true`), zodat
// zoeken en oude ankers ze blijven vinden.
export interface PageRows {
  rows: string[];
  advanced: string[];
  footer?: string[];
}

export const PAGE_ROWS: Record<SettingsPageId, PageRows> = derivePageRows();

export const allRowIds = (page: SettingsPageId): string[] => [...PAGE_ROWS[page].rows, ...PAGE_ROWS[page].advanced, ...(PAGE_ROWS[page].footer ?? [])];

// Een rij die op de pagina Geavanceerd van haar groep staat.
export const isAdvancedRow = (page: SettingsPageId, rowId: string): boolean => PAGE_ROWS[page].advanced.includes(rowId);

export function pageOfRow(rowId: string): SettingsPageId | undefined {
  return SETTINGS_PAGES.find((p) => allRowIds(p.id).includes(rowId))?.id;
}

export interface SettingPlacement {
  page: SettingsPageId;
  row: string;
  // De instelling zit in het blad van de rij: de sprong opent het blad.
  sheet?: boolean;
  // Geen rij maar een verwijzing naar een andere pagina (Reisplanner, Paklijst):
  // het zoekresultaat opent die pagina.
  link?: boolean;
}

// Verwijzingen die vroeger een rij waren. De plek waar ze nu horen (het Ascend-scherm) is de
// pagina zelf; in het zoekveld blijven ze vindbaar. Health Connect is sinds 2 november 2026
// weer een gewone rij op Koppelingen.
const LINKS: Record<string, SettingsPageId> = deriveLinks();

// Instellingen uit de index die niet op een rij met hun eigen id staan: `in` (in het blad van de rij) en `on`.
const MOVED: Record<string, { row: string; sheet?: boolean }> = deriveMoved();

// Waar een instelling uit de index staat, of undefined als het id niet bestaat.
export function placementOf(settingId: string): SettingPlacement | undefined {
  const link = LINKS[settingId];
  if (link) return { page: link, row: settingId, link: true };
  const moved = MOVED[settingId];
  const row = moved?.row ?? settingId;
  const page = pageOfRow(row);
  if (!page) return undefined;
  return { page, row, ...(moved?.sheet ? { sheet: true } : {}) };
}

// ---- afhankelijkheden op één plek ----------------------------------------------------
//
// Wat bij een andere instelling hoort bestaat niet zolang die andere uit staat: verbergen,
// niet uitgrijzen. Elke rij (en elke keuze in een blad) kan een lijst voorwaarden hebben
// (`showWhen`, met de gedeelde in engine/settingsDefs/parts.ts); de eerste die niet klopt zegt
// waarom de rij er niet is en welke instelling het oplost. De samenvatting (`hidden`), het
// zoekveld en de pagina's lezen allemaal hier.

export const SHOW_WHEN: Record<string, Blocker[]> = deriveShowWhen();

// De eerste voorwaarde die niet klopt, of undefined als de rij er is.
export function blockerOf(rowId: string, settings: AppSettings, ctx: RowContext): Blocker | undefined {
  return SHOW_WHEN[rowId]?.find((b) => !b.ok(settings, ctx));
}

export const isRowShown = (rowId: string, settings: AppSettings, ctx: RowContext): boolean => blockerOf(rowId, settings, ctx) === undefined;

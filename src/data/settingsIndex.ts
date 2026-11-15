// ASCEND: de index van alle instellingen, voor het zoekveld bovenaan Instellingen
// (engine/settingsSearch.ts). Besluiten: docs/beslissingen/2026-10-22-alles-instelbaar.md
// en docs/beslissingen/2026-10-22-instellingen-in-groepen.md.
//
// Elke instelling heeft een titel, één korte zin uitleg in gewone woorden, de groep (een van
// de acht pagina's) waar hij bij hoort, en trefwoorden en synoniemen: wat iemand intypt hoeft
// niet de titel te zijn ("horloge" vindt Garmin). Het eerste trefwoord is het belangrijkste
// synoniem en telt iets zwaarder. `route` is de pagina die de instelling zelf opent.
//
// Sinds stap 2 van docs/visie/Ontwerp instellingen op een plek.md staat dat in de verklaring
// van de instelling, in engine/settingsDefs/<groep>.ts; de index wordt daaruit afgeleid, in
// de volgorde van engine/settingsDefs/order.ts.

import { deriveIndex } from '../engine/settingsDefs/derive';
import type { SettingsPageId } from './settingsLayout';

export type SettingsGroupId = SettingsPageId;

export interface SettingsIndexItem {
  id: string;
  title: string;
  note: string;
  group: SettingsGroupId;
  keywords: string[];
  route?: string;
}

// Het anker van een rij; in een eigen bestand, zodat een rij niet het hele register binnenhaalt.
export { settingsAnchor } from './settingsAnchor';

export const SETTINGS_INDEX: SettingsIndexItem[] = deriveIndex();

// ASCEND: de vorm van één verklaring van een instelling (docs/visie/Ontwerp instellingen op een plek.md,
// hoofdstuk 2). Stap 1: alleen de tekstvelden en de plek. De voorwaarden, de samenvatting, het advies en het
// lezen en schrijven komen er in latere stappen bij, elk in de stap die ze verhuist.

import type { SettingsPageId } from '../../data/settingsLayout';
import type { SettingsHelp } from '../../data/settingsHelp';
import type { ChoiceDef } from '../../data/settingsChoices';

// Waar de instelling staat.
export type Place =
  // Een eigen rij op de pagina; de volgorde is die in het bestand. `advanced` staat op de pagina Geavanceerd,
  // `footer` is tekst onderaan de pagina.
  | { row: true; advanced?: true; footer?: true }
  // In het blad van die rij (MOVED met sheet in data/settingsLayout.ts).
  | { in: string }
  // Hangt aan die rij, zonder blad (MOVED zonder sheet).
  | { on: string }
  // Een verwijzing naar een andere pagina (LINKS).
  | { link: true };

export interface SettingDef {
  // Ook het anker instelling-<id>; verandert nooit.
  id: string;
  // De groep: was index.group, pageOfRow en AdviceSpec.page.
  page: SettingsPageId;
  place: Place;
  // De titel in de index en het zoekveld; bij een rij die niet in de index staat de titel op de pagina.
  title: string;
  // Alleen als de rij op de pagina anders heet.
  rowTitle?: string;
  // Alleen als Aangepaste instellingen hem anders noemt.
  adviceTitle?: string;
  // De ene zin en de trefwoorden uit de index; niet bij een rij die niet in de index staat.
  note?: string;
  keywords?: string[];
  route?: string;
  // Een rij die niet in de index staat (de bundelrijen behalve bundel-sporten-tellen, Versie).
  search?: false;
  // De kop van het blad dat de rij opent.
  sheet?: { eyebrow: string; title: string; line?: string };
  // De uitleg, of: dezelfde als bij die andere id (een uitleg die door meer rijen gedeeld wordt).
  help?: SettingsHelp | { from: string };
  // De oude sleutel van de uitleg (camelCase) zolang code die nog gebruikt.
  helpKey?: string;
  // De uitleg zonder namen (NEUTRAL_HELP), als "Voorbeelden bij naam noemen" uit staat.
  neutralHelp?: SettingsHelp;
  // De keuze; `key` is de oude sleutel in CHOICES.
  choice?: { key: string; def: ChoiceDef<string | number> };
}

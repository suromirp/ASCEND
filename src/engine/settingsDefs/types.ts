// ASCEND: de vorm van één verklaring van een instelling (docs/visie/Ontwerp instellingen op een plek.md,
// hoofdstuk 2). Stap 1 tot en met 3: de tekstvelden, de plek, de voorwaarden en de keuzes; de uitleg zelf staat
// apart in uitleg/<groep>.ts, zodat die lange tekst niet bij de start van de app laadt. De samenvatting, het
// advies en het lezen en schrijven komen er in latere stappen bij, elk in de stap die ze verhuist.

import type { SettingsPageId } from '../../data/settingsLayout';
import type { AppSettings } from '../../storage/database';

// Wat deze telefoon en deze gegevens zijn, voor de voorwaarden (engine/settingsSummary.ts#rowContext).
export interface RowContext {
  // Garmin is gekoppeld, en wat er van het horloge gebruikt wordt.
  garmin: boolean;
  // Health Connect staat aan (alleen in de Android-app).
  healthConnect: boolean;
  activities: boolean;
  sendToWatch: boolean;
  // Er is een MacroFactor-export ingelezen.
  macroFactorExport: boolean;
  // Een hoofddoel, een programma met weken, een tocht die nog komt.
  goal: boolean;
  program: boolean;
  trek: boolean;
  // Er is een doel dat een tocht is (engine/journeyAccess.ts#hasTrekGoal).
  trekGoal: boolean;
  // Sets en gewichten houd je in ASCEND bij (niet in MacroFactor).
  strengthInApp: boolean;
  // Er staan krachttrainingen in de planning.
  strengthTrainings: boolean;
  longSundayVisible: boolean;
  // Er is geen doel op Ascend: dan geldt een richting met een weekbudget.
  noGoal: boolean;
  // Twee trainingen op een dag mag.
  sameDayAllowed: boolean;
  // Wat dit toestel kan of heeft.
  folderSupported: boolean;
  noticeAvailable: boolean;
  // Meldingen op een vast moment, ook met het scherm uit (de Android-app).
  timed: boolean;
  // De app kan zijn webdeel zelf bijwerken (de Android-app).
  liveUpdate: boolean;
  bodyFat: boolean;
}

export interface Blocker {
  ok: (s: AppSettings, c: RowContext) => boolean;
  // "Zichtbaar zodra ...", voor het zoekveld.
  reason: string;
  // De instelling die dit oplost (een id uit de index); tikken in het zoekveld gaat daarheen.
  parent: string;
}

// Een keuze: een titel, één regel erboven, het advies en per optie een naam, één regel eronder en soms een
// kortere waarde voor in de rij. Het keuzeblad (ChoiceSheet) en de samenvatting lezen allebei hier.
export interface ChoiceDef<T extends string | number> {
  // De groep boven de titel in het blad.
  group: string;
  title: string;
  line?: string;
  advice: T;
  // De sleutel van de uitleg (helpKey ?? id van een verklaring), voor "Meer uitleg".
  help?: string;
  options: { value: T; label: string; note?: string; short?: string }[];
}

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
  // Dezelfde zin als Krachttraining uit staat en de zin dan anders moet luiden (zie noteFor in derive.ts).
  noteNoStrength?: string;
  keywords?: string[];
  route?: string;
  // Een rij die niet in de index staat (de bundelrijen behalve bundel-sporten-tellen, Versie).
  search?: false;
  // De kop van het blad dat de rij opent.
  sheet?: { eyebrow: string; title: string; line?: string };
  // Heeft uitleg achter de i (de tekst staat in uitleg/<groep>.ts onder deze id), of leent die van een andere id.
  help?: true | { from: string };
  // De oude sleutel van de uitleg (camelCase) zolang code die nog gebruikt; de sleutel is `helpKey ?? id`.
  helpKey?: string;
  // De keuze; `key` is de oude sleutel in CHOICES.
  choice?: { key: string; def: ChoiceDef<string | number> };
  // De voorwaarden, in deze volgorde (de gedeelde staan in parts.ts als B).
  showWhen?: Blocker[];
}

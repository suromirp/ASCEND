// ASCEND: de uitleg achter de InfoButton in de instellingen (docs/beslissingen/2026-10-22-instellingen-in-groepen.md).
//
// Elke uitleg heeft één zin vooraf en twee of drie korte punten met een vetgedrukt begin ("Altijd: ...",
// "Waarom: ..."). Zo is lange uitleg toch snel te lezen. Het begin van een punt is kort; de dubbele punt
// komt van de weergave.
//
// Sinds stap 3 van docs/visie/Ontwerp instellingen op een plek.md staat de tekst in
// engine/settingsDefs/uitleg/<groep>.ts op id van de verklaring, die `help: true` heeft; de sleutel is
// `helpKey ?? id`. Dit bestand laadt nooit bij de start van de app: Sheet.tsx en de instellingenpagina's
// halen het op via data/settingsHelpKeys.ts.

import { ALL_DEFS } from '../engine/settingsDefs/index';
import { PLANNING_UITLEG } from '../engine/settingsDefs/uitleg/planning';
import { DOEL_UITLEG } from '../engine/settingsDefs/uitleg/doel';
import { FORGE_UITLEG } from '../engine/settingsDefs/uitleg/forge';
import { LICHAAM_UITLEG, LICHAAM_ZONDER_NAMEN } from '../engine/settingsDefs/uitleg/lichaam';
import { VANDAAG_UITLEG } from '../engine/settingsDefs/uitleg/vandaag';
import { KOPPELINGEN_UITLEG } from '../engine/settingsDefs/uitleg/koppelingen';
import { GEGEVENS_UITLEG } from '../engine/settingsDefs/uitleg/gegevens';
import { GIDSEN_UITLEG } from '../engine/settingsDefs/uitleg/gidsen';

export interface SettingsHelp {
  title: string;
  lead: string;
  points: { head: string; text: string }[];
}

// De teksten op id van de verklaring, per groep.
export const UITLEG: Record<string, SettingsHelp> = {
  ...PLANNING_UITLEG, ...DOEL_UITLEG, ...FORGE_UITLEG, ...LICHAAM_UITLEG, ...VANDAAG_UITLEG, ...KOPPELINGEN_UITLEG, ...GEGEVENS_UITLEG, ...GIDSEN_UITLEG,
};
const ZONDER_NAMEN: Record<string, SettingsHelp> = { ...LICHAAM_ZONDER_NAMEN };

// Elke uitleg onder zijn sleutel: `helpKey ?? id` van de verklaring met `help: true`.
export const SETTINGS_HELP: Record<string, SettingsHelp> = Object.fromEntries(
  ALL_DEFS.flatMap((d) => (d.help === true && UITLEG[d.id] ? [[d.helpKey ?? d.id, UITLEG[d.id]]] : [])),
);

// Dezelfde uitleg zonder alcohol en wiet bij naam, voor als "Voorbeelden bij naam noemen" uit staat
// (docs/beslissingen/2026-10-27-redenen-bij-naam.md).
const NEUTRAL_HELP: Record<string, SettingsHelp> = Object.fromEntries(
  ALL_DEFS.flatMap((d) => (d.help === true && ZONDER_NAMEN[d.id] ? [[d.helpKey ?? d.id, ZONDER_NAMEN[d.id]]] : [])),
);

// De uitleg bij een instelling; `named` is de instelling "Voorbeelden bij naam noemen".
export function settingsHelp(key: string, named: boolean = true): SettingsHelp | undefined {
  return (!named && NEUTRAL_HELP[key]) || SETTINGS_HELP[key];
}

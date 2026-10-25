// ASCEND: staat een instelling er nu op de pagina? Een paar rijen verschijnen
// alleen onder een voorwaarde (Garmin gekoppeld, Kracht meerekenen aan, het
// kledingadvies aan). Een sprong naar zo'n rij zou nergens heen gaan; de pagina
// zegt dan waarom, en springt naar de groep. Puur: de rij zegt zelf of hij er
// is (`hidden` in settingsSummary.ts), dit bestand geeft de reden.

import { placementOf } from '../data/settingsLayout';
import { rowSummary, type SettingsFacts } from './settingsSummary';

const FORGE_OFF = 'Deze keuze verschijnt pas als Kracht meerekenen aan staat.';
const ONE_RM_OFF = 'Deze keuze verschijnt pas als Kracht meerekenen en Geschatte 1RM tonen aan staan.';
const GARMIN_OFF = 'Deze keuze verschijnt pas als je Garmin hebt gekoppeld.';
const INSIGHT_OFF = 'Deze keuze verschijnt pas als Inzicht na een training aan staat.';
const MACROFACTOR_OFF = 'Deze keuze verschijnt pas als je een MacroFactor-export hebt ingelezen.';

const REASON: Record<string, string> = {
  'lange-zondag': 'Deze keuze verschijnt pas als je hoofddoel geen bergtocht is. Bij een bergdoel staat er op zondag altijd een bergtocht.',
  backupmap: 'Deze keuze verschijnt alleen als je browser een vaste map kan onthouden. Deze nu niet.',
  'weekterugblik-dag': 'Deze keuze verschijnt pas als de weekterugblik aan staat.',
  ochtendkaart: 'Deze keuze verschijnt pas als de ochtendcheck aan staat.',
  'korte-nacht': 'Deze keuze verschijnt pas als de ochtendcheck aan staat.',
  'ochtend-vanaf': 'Deze keuze verschijnt pas als de ochtendcheck aan staat.',
  'ochtendmelding-tijd': 'Deze keuze verschijnt pas als je telefoon de ochtendmelding kan sturen.',
  'kleding-voorkeur': 'Deze keuze verschijnt pas als het kledingadvies aan staat.',
  'zware-dingen': 'Deze keuze verschijnt pas als twee trainingen op een dag mag.',
  trainingsduur: 'Deze keuze verschijnt pas als er krachttrainingen in je planning staan.',
  'forge-volgorde': FORGE_OFF,
  'forge-sets': FORGE_OFF,
  'forge-opwarmen': FORGE_OFF,
  'forge-opwarmbereik': FORGE_OFF,
  'forge-bereik': FORGE_OFF,
  'forge-schatting': FORGE_OFF,
  'forge-vergelijken': FORGE_OFF,
  'forge-extras': FORGE_OFF,
  'forge-lijntjes': FORGE_OFF,
  'forge-leren': FORGE_OFF,
  'forge-naast': FORGE_OFF,
  'forge-sinds': FORGE_OFF,
  'forge-volgorde-lijst': FORGE_OFF,
  'forge-weergave': ONE_RM_OFF,
  'forge-1rm-macrofactor': ONE_RM_OFF,
  'garmin-trainingen': GARMIN_OFF,
  'vanzelf-afvinken': GARMIN_OFF,
  'garmin-leidend': GARMIN_OFF,
  'correcties-overnemen': GARMIN_OFF,
  slaap: GARMIN_OFF,
  rusthartslag: GARMIN_OFF,
  hrv: GARMIN_OFF,
  'naar-horloge': GARMIN_OFF,
  'horloge-details': GARMIN_OFF,
  'loop-efficientie': INSIGHT_OFF,
  'loop-langedagen': INSIGHT_OFF,
  'loop-berg': INSIGHT_OFF,
  'loop-vorm': INSIGHT_OFF,
  'horloge-voorvoegsel': GARMIN_OFF,
  'horloge-gedaan-weghalen': GARMIN_OFF,
  'horloge-status': GARMIN_OFF,
  'horloge-status-week': GARMIN_OFF,
  'macrofactor-leidend': MACROFACTOR_OFF,
  'macrofactor-gewicht': MACROFACTOR_OFF,
};

export function rowAvailability(rowId: string, facts: SettingsFacts): { available: true } | { available: false; reason: string } {
  if (!rowSummary(rowId, facts).hidden) return { available: true };
  return { available: false, reason: REASON[rowId] ?? 'Deze keuze staat er nu niet.' };
}

// Voor een instelling uit de index: de rij waar hij staat en of die er nu is.
export function settingAvailabilityOnPage(settingId: string, facts: SettingsFacts): { available: true } | { available: false; reason: string } {
  const placement = placementOf(settingId);
  return placement ? rowAvailability(placement.row, facts) : { available: true };
}

export const CONDITIONAL_ROWS = Object.keys(REASON);

// ASCEND: waar elke instelling staat in de acht groepen van Instellingen
// (docs/beslissingen/2026-10-22-instellingen-in-groepen.md).
//
// De index (data/settingsIndex.ts) bepaalt wat er te zoeken valt; dit bestand
// bepaalt de pagina, de rij en of er een blad opent. Zo kan het zoekveld elke
// instelling vinden en er naartoe springen, en bewaakt een test dat geen
// instelling een plek mist. De id van een rij is ook het anker
// (`instelling-<id>`), en bij een instelling uit de index is het hetzelfde id.

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
export const isSettingsPageId = (value: string | undefined): value is SettingsPageId => SETTINGS_PAGES.some((p) => p.id === value);
export const settingsPageTitle = (id: SettingsPageId): string => SETTINGS_PAGES.find((p) => p.id === id)?.title ?? '';

// Alle rijen per pagina, in volgorde. `advanced` staan achter "Geavanceerd".
export const PAGE_ROWS: Record<SettingsPageId, { rows: string[]; advanced: string[] }> = {
  planning: {
    rows: ['trainingstijd', 'rustdag', 'rustdag-doen', 'meerdere', 'sport-running', 'sport-hiking', 'sport-cycling', 'wijzigingen', 'ambitie'],
    advanced: ['zware-dingen'],
  },
  doel: {
    rows: ['doelen', 'programma', 'lange-zondag', 'na-hoofddoel', 'volgende-tocht', 'rust-na-tocht', 'vrije-dagen', 'reisplanner', 'paklijst'],
    advanced: [],
  },
  forge: {
    rows: ['forge', 'forge-open', 'kracht', 'trainingsduur', 'forge-volgorde', 'forge-sets', 'forge-opwarmen', 'forge-opwarmbereik', 'forge-rust', 'forge-signaal', 'forge-geluid', 'forge-scherm', 'forge-doorgeven', 'forge-schijven', 'forge-1rm', 'forge-weergave', 'forge-1rm-macrofactor', 'forge-programma', 'stangen', 'schijven', 'dumbbells', 'kabels'],
    advanced: ['forge-bereik', 'forge-schatting'],
  },
  lichaam: { rows: ['lichaamsgewicht', 'hartslag', 'blessures'], advanced: [] },
  vandaag: {
    rows: ['ochtendcheck', 'ochtendkaart', 'ochtend-vanaf', 'weekterugblik', 'weekterugblik-dag', 'weekvraag', 'ochtendmelding', 'ochtendmelding-tijd', 'weerplaats', 'weerregel', 'beste-moment', 'weerruil', 'kledingadvies', 'kleding-voorkeur', 'citaten', 'geluid', 'beweging', 'lucht', 'lucht-vanaf', 'loopinzicht', 'terugknop', 'hervatten'],
    advanced: ['loop-efficientie', 'loop-langedagen', 'loop-berg', 'loop-vorm', 'loopweer', 'borstband'],
  },
  koppelingen: {
    rows: [
      'garmin', 'garmin-trainingen', 'vanzelf-afvinken', 'garmin-leidend', 'horloge-details', 'slaap', 'rusthartslag', 'hrv', 'naar-horloge',
      'horloge-voorvoegsel', 'horloge-gedaan-weghalen', 'horloge-status', 'horloge-status-week',
      'macrofactor', 'macrofactor-leidend', 'macrofactor-gewicht', 'strava-tekst', 'health-connect',
    ],
    advanced: [],
  },
  gegevens: { rows: ['backup', 'backupmap', 'opslag', 'momentopnamen', 'versie', 'startniveau', 'herbouwen', 'wissen'], advanced: [] },
  gidsen: { rows: ['weer-gids', 'kennisbank', 'plekken', 'bronnen'], advanced: [] },
};

export const allRowIds = (page: SettingsPageId): string[] => [...PAGE_ROWS[page].rows, ...PAGE_ROWS[page].advanced];

export function pageOfRow(rowId: string): SettingsPageId | undefined {
  return SETTINGS_PAGES.find((p) => allRowIds(p.id).includes(rowId))?.id;
}

export interface SettingPlacement {
  page: SettingsPageId;
  row: string;
  // De instelling zit in het blad van de rij: de sprong opent het blad.
  sheet?: boolean;
}

// Instellingen uit de index die niet op een rij met hun eigen id staan.
const MOVED: Record<string, { row: string; sheet?: boolean }> = {
  sporten: { row: 'sport-running' },
  'sport-per-week': { row: 'sport-running' },
  sportschool: { row: 'stangen' },
  'horloge-gebruik': { row: 'garmin-trainingen' },
  'garmin-gids': { row: 'garmin' },
  rugzak: { row: 'doelen' },
  weervolgt: { row: 'weerplaats', sheet: true },
  'herinnering-gewicht': { row: 'lichaamsgewicht', sheet: true },
};

// Waar een instelling uit de index staat, of undefined als het id niet bestaat.
export function placementOf(settingId: string): SettingPlacement | undefined {
  const moved = MOVED[settingId];
  const row = moved?.row ?? settingId;
  const page = pageOfRow(row);
  if (!page) return undefined;
  return { page, row, ...(moved?.sheet ? { sheet: true } : {}) };
}

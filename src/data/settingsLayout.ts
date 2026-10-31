// ASCEND: waar elke instelling staat in de acht groepen van Instellingen
// (docs/beslissingen/2026-10-22-instellingen-in-groepen.md).
//
// De index (data/settingsIndex.ts) bepaalt wat er te zoeken valt; dit bestand
// bepaalt de pagina, de rij en of er een blad opent. Zo kan het zoekveld elke
// instelling vinden en er naartoe springen, en bewaakt een test dat geen
// instelling een plek mist. De id van een rij is ook het anker
// (`instelling-<id>`), en bij een instelling uit de index is het hetzelfde id.
//
// Ook de afhankelijkheden staan hier, op één plek (`SHOW_WHEN`): wat bij een andere
// instelling hoort bestaat niet zolang die uit staat (docs/beslissingen/2026-10-26-instellingen-opruimen.md).

import type { AppSettings } from '../storage/database';
import { resolveOverviews } from '../engine/overviewSettings';
import { resolveRunInsight } from '../engine/runInsightSettings';
import { resolveSky } from '../engine/skySettings';
import { resolveLegEase } from '../engine/legEaseSettings';
import { resolveStrengthSettings } from '../engine/strengthSettings';
import { resolveWatchHrMode } from '../engine/watchHeartRate';

import { SPORT_IDS } from './sports';

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

// Alle rijen per pagina, in volgorde. `advanced` staan achter "Geavanceerd" (alleen bij minstens
// twee rijen), `footer` is tekst onderaan de pagina (telt niet als rij). Een rij met `bundel-` is
// een rij met een blad: de losse keuzes erin staan in MOVED met `sheet: true`, zodat zoeken en
// oude ankers ze blijven vinden.
export interface PageRows {
  rows: string[];
  advanced: string[];
  footer?: string[];
}

export const PAGE_ROWS: Record<SettingsPageId, PageRows> = {
  planning: {
    rows: ['bundel-dagen', 'meerdere', ...SPORT_IDS.map((id) => `sport-${id}`), 'wijzigingen', 'ambitie', 'twijfeltest', 'test-stilstaan', 'nieuwe-test', 'weekvoorstel'],
    advanced: ['slepen-week', 'volgorde-stand'],
  },
  doel: {
    rows: ['doelen', 'programma', 'weekbudget', 'lange-zondag', 'na-hoofddoel', 'klaar-weging', 'klaar-groei', 'klaar-marge', 'doeltijd-voorstel', 'seizoensstrook', 'bundel-tochten', 'vrije-dagen'],
    advanced: [],
  },
  forge: {
    rows: ['forge', 'kracht', 'forge-programma', 'forge-volgorde', 'forge-opwarmen', 'forge-opwarmbereik', 'bundel-weergave', 'bundel-rusttimer', 'forge-scherm', 'forge-bijsturen', 'forge-spotter', 'bundel-sportschool'],
    advanced: ['trainingsduur', 'bundel-rekenmodel', 'bundel-invullen', 'bundel-toets'],
  },
  lichaam: { rows: ['lichaamsgewicht', 'vetpercentage', 'hartslag', 'blessures', 'figuur', 'bundel-wat', 'bundel-signalen', 'intensiteit'], advanced: [] },
  vandaag: {
    rows: ['kaarten', 'lichterbenen', 'ochtendmelding', 'ochtendmelding-tijd', 'weerplaats', 'bundel-weer', 'beweging', 'trillen', 'lucht', 'bundel-inzicht', 'bundel-run-detail', 'zweet-vragen'],
    advanced: ['ochtendkaart', 'ochtend-vanaf', 'korte-nacht', 'weekterugblik-dag', 'terugknop', 'hervatten'],
  },
  koppelingen: {
    rows: ['garmin', 'bundel-horloge-gebruik', 'vanzelf-afvinken', 'garmin-leidend', 'correcties-overnemen', 'horloge-stil', 'bundel-horloge-sturen', 'macrofactor', 'macrofactor-leidend', 'macrofactor-gewicht', 'strava-tekst'],
    advanced: [],
  },
  gegevens: { rows: ['backup', 'backupmap', 'opslag', 'ruimte-app', 'momentopnamen', 'reeksen-bewaren', 'reeksen-backup', 'reeksen-ruimte', 'ochtend-backup', 'herbouwen', 'aangepast', 'wissen'], advanced: ['voorstellen-opruimen', 'startniveau'], footer: ['versie'] },
  gidsen: { rows: ['weer-gids', 'kennisbank', 'plekken', 'bronnen'], advanced: [] },
};

export const allRowIds = (page: SettingsPageId): string[] => [...PAGE_ROWS[page].rows, ...PAGE_ROWS[page].advanced, ...(PAGE_ROWS[page].footer ?? [])];

export function pageOfRow(rowId: string): SettingsPageId | undefined {
  return SETTINGS_PAGES.find((p) => allRowIds(p.id).includes(rowId))?.id;
}

export interface SettingPlacement {
  page: SettingsPageId;
  row: string;
  // De instelling zit in het blad van de rij: de sprong opent het blad.
  sheet?: boolean;
  // Geen rij maar een verwijzing naar een andere pagina (Reisplanner, Paklijst, Health Connect):
  // het zoekresultaat opent die pagina.
  link?: boolean;
}

// Verwijzingen die vroeger een rij waren. De plek waar ze nu horen (het Ascend-scherm) is de
// pagina zelf; in het zoekveld blijven ze vindbaar.
const LINKS: Record<string, SettingsPageId> = {
  reisplanner: 'doel',
  paklijst: 'doel',
  'health-connect': 'koppelingen',
};

const inSheet = (row: string, ...ids: string[]): Record<string, { row: string; sheet: true }> =>
  Object.fromEntries(ids.map((id) => [id, { row, sheet: true as const }]));

// Instellingen uit de index die niet op een rij met hun eigen id staan.
const MOVED: Record<string, { row: string; sheet?: boolean }> = {
  sporten: { row: 'sport-running' },
  'sport-per-week': { row: 'sport-running' },
  'garmin-gids': { row: 'garmin' },
  rugzak: { row: 'doelen' },
  weervolgt: { row: 'weerplaats', sheet: true },
  'herinnering-gewicht': { row: 'lichaamsgewicht', sheet: true },
  // Planning
  ...inSheet('bundel-dagen', 'trainingstijd', 'rustdag', 'rustdag-doen'),
  ...inSheet('meerdere', 'zware-dingen'),
  ...inSheet('ambitie', 'lange-loop'),
  // Doel en tochten
  ...inSheet('bundel-tochten', 'volgende-tocht', 'water-per-etappe', 'rust-na-tocht', 'bergschoenen', 'bergschoenen-herinnering'),
  // Forge
  ...inSheet('bundel-sportschool', 'sportschool', 'gym-profiel', 'stangen', 'schijven', 'dumbbells', 'forge-dumbbells', 'kabels', 'toestelgewichten', 'tussengewichten', 'spotterrek'),
  ...inSheet('bundel-weergave', 'forge-1rm', 'forge-weergave', 'forge-1rm-macrofactor', 'forge-vergelijken', 'forge-extras', 'forge-lijntjes', 'forge-volgorde-lijst', 'forge-plaatjes'),
  ...inSheet('bundel-rusttimer', 'forge-rust', 'forge-signaal', 'forge-geluid'),
  ...inSheet('bundel-rekenmodel', 'forge-sets', 'forge-vermoeidheid', 'forge-pauze', 'forge-bereik', 'forge-schatting', 'forge-leren'),
  ...inSheet('bundel-invullen', 'forge-oefeningen', 'forge-onderbreking', 'forge-snelknoppen', 'forge-vegen', 'forge-rir-vooraf', 'forge-doorvoeren', 'forge-schijven'),
  ...inSheet('bundel-toets', 'forge-naast', 'forge-sinds'),
  // Lichaam
  ...inSheet('bundel-signalen', 'vroeg-ziek', 'weekdag-patroon', 'hitte-tempo'),
  ...inSheet('bundel-wat', 'wat-teken', 'wat-oorzaak', 'wat-overzicht', 'wat-test', 'wat-namen', 'wat-vastgelegd'),
  // Vandaag en meldingen
  ...inSheet('kaarten', 'ochtendcheck', 'weekterugblik', 'lijfvraag', 'weekvraag', 'citaten', 'geluid'),
  ...inSheet('bundel-weer', 'weerregel', 'beste-moment', 'weerruil', 'kledingadvies', 'kleding-voorkeur'),
  ...inSheet('bundel-run-detail', 'run-detail', 'run-detail-patronen', 'run-detail-advies', 'loopvorm-cadans', 'loopvorm-grondcontact', 'loopvorm-staplengte', 'loopvorm-oscillatie', 'loopvorm-balans'),
  ...inSheet('bundel-inzicht', 'loopinzicht', 'loop-efficientie', 'loop-langedagen', 'loop-berg', 'loop-vorm', 'loopweer', 'borstband'),
  ...inSheet('lucht', 'lucht-vanaf'),
  ...inSheet('lichterbenen', 'lichterbenen-hoe'),
  // Koppelingen
  ...inSheet('bundel-horloge-gebruik', 'horloge-gebruik', 'garmin-trainingen', 'horloge-details', 'slaap', 'rusthartslag', 'hrv'),
  ...inSheet('bundel-horloge-sturen', 'naar-horloge', 'horloge-voorvoegsel', 'horloge-hartslag', 'horloge-rustige-loop', 'horloge-gedaan-weghalen', 'horloge-status', 'horloge-status-week'),
};

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
// niet uitgrijzen. Elke rij (en elke keuze in een blad) kan een lijst voorwaarden hebben;
// de eerste die niet klopt zegt waarom de rij er niet is en welke instelling het oplost.
// De samenvatting (`hidden`), het zoekveld en de pagina's lezen allemaal hier.

export interface RowContext {
  // Garmin is gekoppeld, en wat er van het horloge gebruikt wordt.
  garmin: boolean;
  activities: boolean;
  sendToWatch: boolean;
  // Er is een MacroFactor-export ingelezen.
  macroFactorExport: boolean;
  // Een hoofddoel, een programma met weken, een tocht die nog komt.
  goal: boolean;
  program: boolean;
  trek: boolean;
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
  bodyFat: boolean;
}

export interface Blocker {
  ok: (s: AppSettings, c: RowContext) => boolean;
  // "Zichtbaar zodra ...", voor het zoekveld.
  reason: string;
  // De instelling die dit oplost (een id uit de index); tikken in het zoekveld gaat daarheen.
  parent: string;
}

const strength = (s: AppSettings) => resolveStrengthSettings(s.strengthModel);

const B = {
  forge: { ok: (s) => strength(s).enabled, reason: 'Zichtbaar zodra Kracht meerekenen aan staat', parent: 'forge' },
  oneRm: { ok: (s) => strength(s).showOneRm, reason: 'Zichtbaar zodra Geschatte 1RM tonen aan staat', parent: 'forge-1rm' },
  inApp: { ok: (_s, c) => c.strengthInApp, reason: 'Zichtbaar zodra je sets in ASCEND bijhoudt', parent: 'kracht' },
  restAuto: { ok: (s) => strength(s).restAuto, reason: 'Zichtbaar zodra de rusttimer aan staat', parent: 'forge-rust' },
  restAlert: { ok: (s) => strength(s).restAlert !== 'off', reason: 'Zichtbaar zodra de rusttimer een signaal geeft', parent: 'forge-signaal' },
  mf: { ok: (_s, c) => c.macroFactorExport, reason: 'Zichtbaar zodra je een MacroFactor-export hebt ingelezen', parent: 'macrofactor' },
  garmin: { ok: (_s, c) => c.garmin, reason: 'Zichtbaar zodra Garmin is gekoppeld', parent: 'garmin' },
  activities: { ok: (_s, c) => c.activities, reason: 'Zichtbaar zodra Trainingen van je horloge aan staat', parent: 'garmin-trainingen' },
  send: { ok: (_s, c) => c.sendToWatch, reason: 'Zichtbaar zodra Trainingen naar je horloge aan staat', parent: 'naar-horloge' },
  ascendHr: { ok: (s) => resolveWatchHrMode({ mode: s.watchHeartRate }) !== 'intervals', reason: 'Zichtbaar zodra de hartslag van ASCEND naar je horloge gaat', parent: 'horloge-hartslag' },
  goal: { ok: (_s, c) => c.goal, reason: 'Zichtbaar zodra je een hoofddoel hebt', parent: 'doelen' },
  noGoal: { ok: (_s, c) => c.noGoal, reason: 'Zichtbaar zodra je geen doel hebt', parent: 'doelen' },
  goalOrProgram: { ok: (_s, c) => c.goal || c.program, reason: 'Zichtbaar zodra je een hoofddoel of programma hebt', parent: 'doelen' },
  goalOrTrek: { ok: (_s, c) => c.goal || c.trek, reason: 'Zichtbaar zodra je een hoofddoel of tocht hebt', parent: 'doelen' },
  longSunday: { ok: (_s, c) => c.longSundayVisible, reason: 'Zichtbaar zodra je hoofddoel geen bergtocht is', parent: 'doelen' },
  pairing: { ok: (_s, c) => c.sameDayAllowed, reason: 'Zichtbaar zodra twee trainingen op een dag mag', parent: 'meerdere' },
  trainings: { ok: (_s, c) => c.strengthTrainings, reason: 'Zichtbaar zodra er krachttrainingen in je planning staan', parent: 'kracht' },
  bodyFat: { ok: (_s, c) => c.bodyFat, reason: 'Zichtbaar zodra je weegmetingen met een vetpercentage hebt', parent: 'lichaamsgewicht' },
  morning: { ok: (s) => resolveOverviews(s.overviews).morningCheckIn, reason: 'Zichtbaar zodra de ochtendcheck aan staat', parent: 'ochtendcheck' },
  review: { ok: (s) => resolveOverviews(s.overviews).weekReview, reason: 'Zichtbaar zodra de weekterugblik aan staat', parent: 'weekterugblik' },
  notice: { ok: (_s, c) => c.noticeAvailable, reason: 'Zichtbaar zodra je telefoon de ochtendmelding kan sturen', parent: 'ochtendmelding' },
  clothing: { ok: (s) => resolveOverviews(s.overviews).clothingAdvice, reason: 'Zichtbaar zodra het kledingadvies aan staat', parent: 'kledingadvies' },
  runDetail: { ok: (s) => resolveRunInsight(s.runInsight).detail.show, reason: 'Zichtbaar zodra Run in detail tonen aan staat', parent: 'run-detail' },
  insight: { ok: (s) => resolveRunInsight(s.runInsight).enabled, reason: 'Zichtbaar zodra Inzicht na een training aan staat', parent: 'loopinzicht' },
  legEaseOffers: { ok: (s) => resolveLegEase(s) === 'voorstel', reason: 'Zichtbaar zodra Lichter bij vermoeide benen met een voorstel werkt', parent: 'lichterbenen' },
  skyAuto: { ok: (s) => resolveSky(s).sky === 'auto', reason: 'Zichtbaar zodra Lucht bovenaan op Automatisch staat', parent: 'lucht' },
  folder: { ok: (_s, c) => c.folderSupported, reason: 'Zichtbaar zodra je browser een vaste map kan onthouden', parent: 'backup' },
} satisfies Record<string, Blocker>;

const rule = (blockers: Blocker[], ...ids: string[]): [string, Blocker[]][] => ids.map((id) => [id, blockers]);

export const SHOW_WHEN: Record<string, Blocker[]> = Object.fromEntries([
  // Planning
  ...rule([B.pairing], 'zware-dingen'),
  // Doel en tochten
  ...rule([B.goalOrProgram], 'programma'),
  ...rule([B.noGoal], 'weekbudget'),
  ...rule([B.goal], 'na-hoofddoel'),
  ...rule([B.longSunday], 'lange-zondag'),
  ...rule([B.goalOrTrek], 'bundel-tochten', 'volgende-tocht', 'water-per-etappe', 'rust-na-tocht', 'bergschoenen', 'bergschoenen-herinnering'),
  // Forge
  ...rule([B.trainings], 'trainingsduur'),
  ...rule([B.forge], 'forge-volgorde', 'forge-opwarmen', 'forge-opwarmbereik', 'bundel-rekenmodel', 'forge-sets', 'forge-vermoeidheid', 'forge-pauze', 'forge-bereik', 'forge-schatting', 'forge-leren', 'bundel-weergave', 'forge-1rm', 'forge-vergelijken', 'forge-extras', 'forge-lijntjes', 'forge-volgorde-lijst', 'forge-dumbbells'),
  ...rule([B.forge, B.oneRm], 'forge-weergave'),
  ...rule([B.forge, B.oneRm, B.mf], 'forge-1rm-macrofactor'),
  ...rule([B.forge, B.inApp], 'forge-bijsturen', 'forge-spotter', 'spotterrek'),
  ...rule([B.inApp], 'bundel-invullen', 'forge-oefeningen', 'forge-onderbreking', 'forge-snelknoppen', 'forge-vegen', 'forge-rir-vooraf', 'forge-doorvoeren', 'forge-schijven', 'bundel-rusttimer', 'forge-rust'),
  ...rule([B.inApp, B.restAuto], 'forge-signaal'),
  ...rule([B.inApp, B.restAuto, B.restAlert], 'forge-geluid'),
  ...rule([B.forge, B.mf], 'bundel-toets', 'forge-naast', 'forge-sinds'),
  ...rule([B.mf], 'forge-programma'),
  // Lichaam
  ...rule([B.bodyFat], 'vetpercentage'),
  // Vandaag en meldingen
  ...rule([B.morning], 'ochtendkaart', 'korte-nacht', 'ochtend-vanaf'),
  ...rule([B.review], 'weekterugblik-dag'),
  ...rule([B.notice], 'ochtendmelding-tijd'),
  ...rule([B.clothing], 'kleding-voorkeur'),
  ...rule([B.runDetail], 'run-detail-patronen', 'run-detail-advies', 'loopvorm-cadans', 'loopvorm-grondcontact', 'loopvorm-staplengte', 'loopvorm-oscillatie', 'loopvorm-balans'),
  ...rule([B.insight], 'loop-efficientie', 'loop-langedagen', 'loop-berg', 'loop-vorm'),
  ...rule([B.skyAuto], 'lucht-vanaf'),
  ...rule([B.legEaseOffers], 'lichterbenen-hoe'),
  // Koppelingen
  ...rule([B.garmin], 'horloge-stil', 'bundel-horloge-gebruik', 'garmin-trainingen', 'slaap', 'rusthartslag', 'hrv', 'bundel-horloge-sturen', 'naar-horloge'),
  ...rule([B.garmin, B.activities], 'vanzelf-afvinken', 'garmin-leidend', 'correcties-overnemen', 'horloge-details'),
  ...rule([B.garmin, B.send], 'horloge-voorvoegsel', 'horloge-hartslag', 'horloge-gedaan-weghalen', 'horloge-status', 'horloge-status-week'),
  ...rule([B.garmin, B.send, B.ascendHr], 'horloge-rustige-loop'),
  ...rule([B.mf], 'macrofactor-leidend', 'macrofactor-gewicht'),
  // Gegevens en back-up
  ...rule([B.folder], 'backupmap'),
]);

// De eerste voorwaarde die niet klopt, of undefined als de rij er is.
export function blockerOf(rowId: string, settings: AppSettings, ctx: RowContext): Blocker | undefined {
  return SHOW_WHEN[rowId]?.find((b) => !b.ok(settings, ctx));
}

export const isRowShown = (rowId: string, settings: AppSettings, ctx: RowContext): boolean => blockerOf(rowId, settings, ctx) === undefined;

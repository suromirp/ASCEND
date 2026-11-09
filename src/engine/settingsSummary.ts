// ASCEND: wat de rijen en groepen in de instellingen zeggen. Puur: de feiten gaan
// erin, de korte waarde en de regel eronder komen eruit. Eén plek, zodat elke
// samenvatting waar is en het zoekveld, het overzicht en de groepspagina's nooit
// iets anders melden (docs/beslissingen/2026-10-22-instellingen-in-groepen.md).
//
// De regel voor een rij: links de titel, rechts de waarde, daaronder hoogstens één
// regel (`sub`): een feit of een bron, nooit uitleg. Een test bewaakt dat een regel
// niet langer is dan SUB_MAX_LENGTH, zodat niets afkapt op 360 px.

import { locationSummary } from './locationSetting';
import { resolveShorterToday } from './shorterToday';
import { isDefaultOrder, resolveCardOrder } from './cardOrder';
import { kgLabel } from '../utils/kg';
import { resolveTestStops } from './bestEffort';
import { resolveTestRest } from './testRest';
import type { AppSettings } from '../storage/database';
import type { Weekday } from '../models/goalEngineConfig';
import type { HealthConnectErrorKind } from '../models/healthConnect';
import type { WatchUse } from './watchUse';
import { choiceShort } from '../data/settingsChoices';
import { matchTodayProfile, TODAY_PROFILE_SHORT } from './settingsProfiles';
import { SHOW_WHEN, isRowShown, type RowContext, type SettingsPageId } from '../data/settingsLayout';
import { countDifferences } from './settingsDiff';
import { resolveOverviews } from './overviewSettings';
import { resolveMorningNotice, type NoticeSupport } from './morningNotice';
import { noticesBundleSummary, noticesNeed, permissionRows, permissionsSummary, resolveDeviceNotices, type DevicePermissions } from './deviceNotices';
import { isMyLocation } from './weatherLocation';
import { resolveStrengthSettings } from './strengthSettings';
import { allProfiles, exerciseAddOnCount, formatAddOns, machineListCount } from './machineWeights';
import { checkLines, type CheckSummary } from './prescriptionCheck';
import { DEFAULT_ENABLED_SPORTS, SPORT_LABEL, SPORT_LIST, parseWeekShape, type Sport } from './sports';
import { readClothingAdjust } from './clothingFeedback';
import { backupAge, backupAgoText } from './settingsAttention';
import { shortGoalName } from './settingsStatus';
import { MIN_LOGS_TO_LEARN } from './durationLearning';
import { resolveNavigation, resumeLabel } from './navigationSettings';
import { resolveMotion } from './motionSettings';
import { resolveQuoteLanguage } from './quoteSettings';
import { resolveReadinessWeighting } from './raceReadiness';
import { resolveGrowthChoice, resolveLimitMargin } from '../data/goalGrowth';
import { resolveBodyCheck } from './bodyCheckSettings';
import { resolveExerciseArt } from './exerciseArtSettings';
import { resolveLegEase, resolveLegEaseHow } from './legEaseSettings';
import { resolveSky } from './skySettings';
import { resolveLongRunGrowth } from './runGrowth';
import { resolveIntensityCounting } from './intensitySettings';
import { resolveFigure, type Figure } from './figureSettings';
import { formSwitchesLine, resolveRunInsight } from './runInsightSettings';
import { zoneBpm } from './heartRateZones';
import { bootGoalKm } from './bootBreakIn';
import { HR_FALLBACK_TEXT, resolveCalmRun, resolveWatchHr, resolveWatchHrMode, type IntervalsHrBasis } from './watchHeartRate';
import { adviceDifferences } from './settingsDiff';
import { settingBudget } from './weekBudget';
import { parseBeginnerStart } from './beginnerStart';
import { resolveWaveSettings } from './waves';
import { DIRECTIONS } from '../data/directions';
import { formatBytes } from './streamPack';
import { resolveStreamsBackup } from './streamsBackup';
import { backupWhereText, resolveAutoBackup, type AutoBackupFailureReason, type BackupWhere } from './autoBackup';
import { SIGNAL_KEYS, signalsOnCount } from './signalSettings';
import { resolveProposalTidyMonths } from './proposalTidy';
import { storageUseText, type StorageEstimate } from './storageUse';
import { swipeDeleteOn } from './forgeRows';
import { resolveForgeLayout } from './forgeLayout';
import { resolveBreakAsk } from './forgeSession';
import { resolveTimeCap } from './forgeTimeCap';
import { resolveSportCounting } from './sportRole';
import { sportsRowSummary } from './sportsScreen';
import { isRowPending, isRowUnknown, type SettingsSource } from './settingsPending';
import { kindAmountSummary, parseKindAmounts } from './kindAmount';
import { formatNumberNL } from '../utils/number';
import { resolveMissedSettings } from './missedTraining';
import { resolveAboveMission } from './todayCards';
import { resolveDropOnTraining } from './dropOnTraining';
import { formatDateNL, formatDayMonthNL, localDateOf } from '../utils/dates';
import { formatClock } from '../utils/clock';
import { capitalize } from '../utils/capitalize';

// Een regel onder een rij past op 360 px op één regel (13 px, de breedte van de rij).
export const SUB_MAX_LENGTH = 40;

export interface RowSummary {
  // Een andere titel dan de vaste (Laatste export tegenover Export inlezen).
  title?: string;
  value?: string;
  sub?: string;
  // ASCEND houdt dit zelf bij: het label "auto".
  auto?: boolean;
  // Niet ingesteld of uit: gedimd.
  dim?: boolean;
  // 'warn': let op, in amber (bijna vol).
  dot?: 'ok' | 'no' | 'warn';
  // Een schakelaar: aan of uit.
  checked?: boolean;
  // De rij hoort er nu niet te staan (geen sterktetrainingen, geen browserondersteuning).
  hidden?: boolean;
}

// De regel onder "Hartslag op je horloge": waarom het bij de zonenaam blijft, anders het
// verschil als de drempel van intervals.icu meer dan 3 slagen afwijkt, anders de grens van zone 2.
const THRESHOLD_GAP = 3;
function watchHrSub(f: SettingsFacts): string | undefined {
  const s = f.settings;
  const basis = f.watch?.hrBasis;
  const mine = s.heartRate?.lthr;
  const gap = typeof mine === 'number' && typeof basis?.lthr === 'number' && Math.abs(basis.lthr - mine) > THRESHOLD_GAP;
  if (resolveWatchHrMode({ mode: s.watchHeartRate }) === 'intervals') return gap ? gapText(basis!.lthr!, mine!) : undefined;
  const plan = resolveWatchHr({ mode: 'ascend' }, s.heartRate, basis);
  if (plan.kind === 'zones' && plan.reason) return HR_FALLBACK_TEXT[plan.reason];
  if (gap) return gapText(basis!.lthr!, mine!);
  const z = zoneBpm(2, s.heartRate);
  return z ? `Zone 2: ${z[0]} tot ${z[1]} bpm` : undefined;
}
function gapText(icu: number, mine: number): string {
  return `Drempel: intervals.icu ${icu}, ASCEND ${mine}`;
}

export interface SettingsFacts {
  today: string;
  settings: AppSettings;
  // Minuten per weekdag zoals ze bij de planning staan.
  dailyTimeBudget: Partial<Record<Weekday, { preferredMinutes: number }>>;
  pairing: 'automatic' | 'always' | 'only_if_useful' | 'never';
  position: { weekInProgram: number; totalWeeks: number; phaseName: string } | null;
  goal: { name: string; date: string } | null;
  // Het hoofddoel is zelf een tocht (GR5, een bergtocht): dan klopt "Geen tochten" niet.
  mainIsTrek?: boolean;
  // Tochten van jezelf die nog komen, en andere vrije dagen of vakanties die nog komen.
  treks: number;
  vacations: number;
  activeInjuries: number;
  // Wat een koppeling over je weet voor het figuur op Lichaam (nog geen enkele levert het).
  linkedSex?: Figure | null;
  // De bron van "Krachttraining bijhouden": dezelfde keuze als het krachtblok.
  strengthExternal: boolean;
  // Wat ASCEND nu doet met je ambitie: terugvallen op Standaard bij pijn.
  ambition: { chosen: 'rustig' | 'standaard' | 'stevig'; effective: 'rustig' | 'standaard' | 'stevig'; reason?: string };
  // Het gewicht in gebruik.
  weight: { kg: number; source: string; date: string } | null;
  // Zijn er weegmetingen met een vetpercentage (engine/bodyFat.ts)? Zonder is de schakelaar er niet.
  hasBodyFat?: boolean;
  // De koppeling met het horloge; null als er (nog) niet gekeken is.
  watch: { linked: boolean; syncedAt?: string; use: WatchUse; autoTick: boolean; leads: boolean; sendEnabled: boolean; corrections?: boolean; hrBasis?: IntervalsHrBasis } | null;
  macroFactor: { readAt?: string; leads: boolean } | null;
  // Opgeslagen duur per krachttraining, geleerd of geschat.
  strengthDurations: { name: string; minutes: number; source: 'learned' | 'estimate' | 'default'; basedOn: number }[];
  // Raak per training, alles en sinds de startdatum (engine/prescriptionCheck.ts); weglaten als nog niet berekend.
  strengthCheck?: CheckSummary;
  // Open taken in de reisplanner en het basisgewicht van de paklijst (kg).
  journeyOpen?: number;
  // Kilometers die ASCEND telde sinds de bergschoenen; weg zolang er geen datum is vastgelegd.
  bootKm?: number;
  packKg?: number;
  // Of de browser een vaste map kan onthouden en of die gekozen is.
  folderSupported: boolean;
  folderChosen: boolean;
  // De automatische back-up op dit toestel: in de app of de browser, waar de laatste staat, de naam
  // van de map waar hij stil naartoe kan (in de browser alleen als de vaste map gekozen is) en de
  // reden als de laatste poging mislukte. Weglaten zolang dat nog niet is gelezen.
  autoBackup?: { platform: 'app' | 'browser'; where?: BackupWhere; folder?: string; failure?: AutoBackupFailureReason;
    // Alleen in de app: of ASCEND in de map mag schrijven, en wanneer de laatste automatische back-up lukte.
    access?: 'ready' | 'needs-tap' | 'denied'; lastAutoAt?: string };
  storage: 'protected' | 'not_protected' | 'unsupported' | undefined;
  // De ruimte die de volledige reeksen van loopjes en tochten innemen (bytes); weglaten zolang
  // dat nog niet is geteld.
  streamsBytes?: number;
  // Hoeveel ruimte de app op dit toestel gebruikt (storage/storageEstimate.ts); weglaten zolang
  // dat nog niet gemeten is.
  storageUse?: StorageEstimate;
  snapshots: number;
  buildLabel: string;
  // Of de keuze voor de lange zondag er staat (niet bij een bergdoel).
  longSundayVisible: boolean;
  // Er is geen doel op Ascend (de lijst van de tab is leeg): dan staat de rij Weekbudget er.
  noGoal?: boolean;
  // Wat deze telefoon kan voor de ochtendmelding en of meldingen mogen; weglaten als dat
  // nog niet bekend is (dan telt alleen de schakelaar).
  notice?: { support: NoticeSupport; granted: boolean };
  // Wat de telefoon toestaat (meldingen, exacte wekker, Health Connect); weglaten zolang dat nog
  // niet binnen is, 'unknown' als het na twee seconden nog niet lukte.
  device?: DevicePermissions | 'unknown';
  // De app kan zijn webdeel zelf bijwerken (de Android-app).
  liveUpdate?: boolean;
  // Het lezen van de koppelstatus mislukte: dan zeggen we dat, in plaats van "Koppelen" alsof je
  // nooit gekoppeld was.
  watchUnreadable?: boolean;
  // Health Connect op dit toestel; weglaten zolang dat nog niet gelezen is.
  healthConnect?: HealthConnectFacts;
  // Bronnen die de eerste keer nog niet binnen zijn: hun rijen zeggen "Bezig" (engine/settingsPending.ts).
  pending?: readonly SettingsSource[];
  // Bronnen die de eerste keer te lang duurden of faalden: hun rijen zeggen "Onbekend", nooit een verzonnen waarde.
  unknown?: readonly SettingsSource[];
}

export interface HealthConnectFacts {
  // Draait ASCEND als Android-app? Alleen daar bestaat Health Connect.
  inApp: boolean;
  enabled: boolean;
  fetchedAt?: string;
  errorKind?: HealthConnectErrorKind;
  // Mag ASCEND je gewicht lezen (docs/beslissingen/2026-11-04-gewicht-uit-health-connect.md)?
  weightGranted?: boolean;
}

const deviceOf = (f: SettingsFacts): DevicePermissions | undefined => (f.device && f.device !== 'unknown' ? f.device : undefined);

// De rij Toestemmingen: "Alles aan", of met een amber stip hoeveel er uit staan als iets wat je
// gekozen hebt er een nodig heeft. In de browser telt Opslag beschermd mee.
function permissionsRow(f: SettingsFacts): RowSummary {
  if (f.device === 'unknown') return { value: 'Onbekend', dim: true };
  const d = deviceOf(f);
  if (!d) return { value: 'Even kijken', dim: true };
  const rows = permissionRows(d, noticesNeed(f.settings, d));
  const sum = permissionsSummary(rows, !d.timed && f.storage === 'not_protected' ? 1 : 0);
  const warn = rows.find((r) => r.warn);
  return { value: sum.value, ...(!sum.warn && sum.value !== 'Alles aan' ? { dim: true } : {}), ...(sum.warn ? { dot: 'warn' as const, sub: `${warn?.id === 'wekker' ? 'Exacte wekker' : 'Toestemming voor meldingen'} staat uit` } : {}) };
}

// De ochtendmelding: staat hij aan en kan hij ook werken (toestemming en een telefoon die het kan)?
function noticeState(f: SettingsFacts): { on: boolean; support: NoticeSupport } {
  const n = resolveMorningNotice(f.settings.morningNotice);
  const support = f.notice?.support ?? 'ready';
  return { on: n.enabled && support === 'ready' && (f.notice?.granted ?? true), support };
}

// Automatische back-up: hoe vaak, en waar hij heen gaat of dat Vandaag een kaart neerzet. Mislukte de
// laatste poging, dan een amber stip; de regel met wat je kunt doen staat onder de groep.
function autoBackupRow(f: SettingsFacts): RowSummary {
  const frequency = resolveAutoBackup(f.settings.autoBackup);
  if (frequency === 'off') return { value: choiceShort('autoBackup', frequency), dim: true };
  const when = frequency === 'weekly' ? 'Zondagavond' : 'Elke avond';
  const folder = f.autoBackup?.folder;
  const sub = f.autoBackup?.failure ? 'De laatste keer lukte het niet' : folder ? `${when}, in ${folder}` : `${when}, met een kaart op Vandaag`;
  return { value: choiceShort('autoBackup', frequency), sub, ...(f.autoBackup?.failure ? { dot: 'warn' as const } : {}) };
}

// ---- hulpjes -----------------------------------------------------------------

const LONG_MONTHS = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
const WEEKDAYS = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'];
const WEEKDAYS_SHORT = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];

const dayOf = (iso: string) => Number(iso.slice(8, 10));
const monthIndex = (iso: string) => Number(iso.slice(5, 7)) - 1;
export const longDate = (iso: string): string => `${dayOf(iso)} ${LONG_MONTHS[monthIndex(iso)]}`;

const num = (n: number, decimals = 2) => formatNumberNL(n, decimals);
const lower = (text: string) => text.toLowerCase();
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function listNL(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} en ${items[items.length - 1]}`;
}

// Health Connect (docs/beslissingen/2026-11-02-health-connect.md): in de browser gedimd met
// uitleg en zonder schakelaar; in de app een schakelaar, met daaronder wat de laatste ronde zei.
const HEALTH_ERROR_LINE: Record<HealthConnectErrorKind, string> = {
  web: 'Alleen in de Android-app',
  'not-installed': 'Health Connect staat niet op je telefoon',
  'needs-update': 'Health Connect moet worden bijgewerkt',
  denied: 'Geen toestemming meer',
  timeout: 'Geen antwoord, straks opnieuw',
  failed: 'Ophalen lukte niet, straks opnieuw',
};

function healthConnectRow(f: SettingsFacts): RowSummary {
  const h = f.healthConnect;
  if (!h) return { value: 'Even kijken', dim: true };
  if (!h.inApp) return { value: 'Alleen in de app', dim: true, sub: 'Werkt in de Android-app van ASCEND' };
  if (!h.enabled) return { checked: false, sub: 'Trainingen, slaap, rusthartslag, HRV en gewicht' };
  if (h.errorKind) return { checked: true, sub: HEALTH_ERROR_LINE[h.errorKind] };
  if (!h.fetchedAt) return { checked: true, sub: 'Nog niets opgehaald' };
  const day = localDateOf(h.fetchedAt);
  return { checked: true, sub: day === f.today ? `Opgehaald om ${clock(h.fetchedAt)}` : `Opgehaald op ${formatDayMonthNL(day)}` };
}

// "14:02", in de tijd van het toestel.
function clock(iso: string): string {
  return formatClock(iso);
}

const SPORTS: Sport[] = SPORT_LIST;

function sportState(f: SettingsFacts, sport: Sport) {
  const on = { ...DEFAULT_ENABLED_SPORTS, ...f.settings.enabledSports }[sport];
  const perWeek = f.settings.sportFrequency?.[sport];
  return { on, perWeek };
}

const WEEKDAY_ORDER: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

function trainingDays(f: SettingsFacts): number {
  return WEEKDAY_ORDER.filter((d) => (f.dailyTimeBudget[d]?.preferredMinutes ?? 0) > 0).length;
}

function restDayIndex(f: SettingsFacts): number {
  return (f.settings.restDay ?? 1) - 1;
}

function durationsValue(f: SettingsFacts): { value: string; auto: boolean } | undefined {
  const minutes = f.strengthDurations.map((d) => d.minutes);
  if (minutes.length === 0) return undefined;
  const lo = Math.min(...minutes);
  const hi = Math.max(...minutes);
  return { value: lo === hi ? `${lo} min` : `${lo} tot ${hi} min`, auto: f.strengthDurations.some((d) => d.source === 'learned') };
}

function weightWords(w: NonNullable<SettingsFacts['weight']>): string {
  const from = w.source === 'macrofactor' ? 'MacroFactor' : w.source === 'health-connect' ? 'Uit Health Connect' : 'Zelf ingevuld';
  return `${from}, ${formatDayMonthNL(w.date)}`;
}

function clothingValue(f: SettingsFacts): { value: string; auto: boolean } {
  const adjust = readClothingAdjust(f.settings.clothingAdjust);
  const entries = SPORTS.flatMap((s) => (adjust[s] ? [[s, adjust[s] as number] as const] : []));
  if (entries.length === 0) return { value: 'Standaard', auto: false };
  // Yours as much as ASCEND's (you set it in the sheet too): no "auto"
  // (docs/beslissingen/2026-10-24-kleding-zelf-bijstellen.md).
  if (entries.length > 1) return { value: `${entries.length} sporten`, auto: false };
  const [sport, v] = entries[0];
  return { value: `${SPORT_LABEL[sport]} ${num(Math.abs(v), 1)}° ${v > 0 ? 'lichter' : 'warmer'}`, auto: false };
}

function listWeights(list: number[]): string {
  return list.length <= 3 ? `${listNL(list.map((n) => num(n)))} kg` : `${list.length} stangen`;
}

// ---- de rijen ------------------------------------------------------------------

// Wat deze telefoon en deze gegevens zijn, voor de voorwaarden in data/settingsLayout.ts.
export function rowContext(f: SettingsFacts): RowContext {
  const support = f.notice?.support ?? 'ready';
  return {
    garmin: f.watch?.linked === true,
    healthConnect: f.healthConnect?.enabled === true,
    activities: f.watch?.use.activities !== false,
    sendToWatch: f.watch?.sendEnabled === true,
    macroFactorExport: !!f.macroFactor?.readAt,
    goal: f.goal !== null,
    program: f.position !== null,
    trek: f.treks > 0,
    strengthInApp: !f.strengthExternal,
    strengthTrainings: f.strengthDurations.length > 0,
    longSundayVisible: f.longSundayVisible,
    noGoal: f.noGoal === true,
    sameDayAllowed: f.pairing !== 'never',
    folderSupported: f.folderSupported || f.autoBackup?.platform === 'app',
    noticeAvailable: support !== 'unavailable' && support !== 'not_installed',
    timed: deviceOf(f)?.timed === true,
    liveUpdate: f.liveUpdate === true,
    bodyFat: f.hasBodyFat === true,
  };
}

// De samenvatting van een rij. Of de rij er nu hoort (`hidden`) komt uit SHOW_WHEN in
// data/settingsLayout.ts, zodat de afhankelijkheden op één plek staan.
export function rowSummary(rowId: string, f: SettingsFacts): RowSummary {
  const waiting = unsettledRow(rowId, f);
  if (waiting) return { ...waitingSummary(baseSummary(rowId, f), waiting), hidden: false };
  const base = isRowPending(rowId, f.pending)
    ? waitingSummary(baseSummary(rowId, f), 'Bezig…')
    : isRowUnknown(rowId, f.unknown)
      ? waitingSummary(baseSummary(rowId, f), 'Onbekend')
      : baseSummary(rowId, f);
  return SHOW_WHEN[rowId] ? { ...base, hidden: !isRowShown(rowId, f.settings, rowContext(f)) } : base;
}

// De voorwaarden van rowContext die uit een bron komen. Is die bron nog niet binnen of onbekend, dan
// weten we niet of de rij er hoort: hij blijft zichtbaar met Bezig… of Onbekend in plaats van te verdwijnen.
const CONTEXT_OF_SOURCE: Partial<Record<SettingsSource, (keyof RowContext)[]>> = {
  watch: ['garmin', 'activities', 'sendToWatch'],
  macroFactor: ['macroFactorExport'],
  healthConnect: ['healthConnect'],
  device: ['timed', 'noticeAvailable'],
  autoBackup: ['folderSupported'],
};

function unsettledRow(rowId: string, f: SettingsFacts): 'Bezig…' | 'Onbekend' | undefined {
  if (!SHOW_WHEN[rowId]) return undefined;
  const ctx = rowContext(f);
  if (isRowShown(rowId, f.settings, ctx)) return undefined;
  const open = (list: readonly SettingsSource[] | undefined) => (list ?? []).flatMap((src) => CONTEXT_OF_SOURCE[src] ?? []);
  const guess = { ...ctx };
  for (const key of [...open(f.pending), ...open(f.unknown)]) guess[key] = true;
  if (!isRowShown(rowId, f.settings, guess)) return undefined;
  // Wacht minstens een bron nog, dan Bezig…; anders is de bron onbekend.
  return open(f.pending).length > 0 ? 'Bezig…' : 'Onbekend';
}

// Een rij die op een bron wacht of er geen antwoord van kreeg: alleen de titel en dit woord, gedimd,
// zonder regel eronder (die zou een feit zijn dat we niet weten).
const waitingSummary = (base: RowSummary, value: string): RowSummary => ({ title: base.title, auto: base.auto, value, dim: true });

const countOn = (flags: boolean[]) => flags.filter(Boolean).length;
const BUNDLE_MODEL = ['forge-rekent-mee', 'forge-afvinken-doel', 'forge-sets', 'forge-vermoeidheid', 'forge-pauze', 'forge-bereik', 'forge-schatting', 'forge-leren'];
const BUNDLE_FILL = ['forge-onderbreking', 'forge-rir-vooraf', 'forge-rir-snel', 'forge-doorvoeren', 'forge-schijven'];
const adviceOrCount = (ids: string[], s: AppSettings): RowSummary => {
  const n = countDifferences(ids, s);
  return n === 0 ? { value: 'Advies' } : { value: `${n} aangepast` };
};

function baseSummary(rowId: string, f: SettingsFacts): RowSummary {
  const s = f.settings;
  const o = resolveOverviews(s.overviews);
  const forge = resolveStrengthSettings(s.strengthModel);
  const place = s.homeLocation;
  const follows = isMyLocation(place) && o.weatherFollowsLocation;
  const age = backupAge(s.lastExportedAt, f.today);
  const watchOn = f.watch?.linked === true;

  switch (rowId) {
    // Rijen met een blad: de samenvatting van wat erin zit (docs/beslissingen/2026-10-26-instellingen-opruimen.md).
    case 'bundel-dagen': {
      const n = trainingDays(f);
      if (n > 0) return { value: plural(n, 'dag', 'dagen'), dim: false, sub: `Rust op ${lower(WEEKDAYS[restDayIndex(f)])}` };
      // Geen tijden per dag, wel een rustdag: zeg wat er staat.
      return { value: `Rust ${lower(WEEKDAYS_SHORT[restDayIndex(f)])}`, dim: false };
    }
    case 'bundel-tochten':
      if (f.treks > 0) return { value: plural(f.treks, 'tocht', 'tochten') };
      // Een tocht als hoofddoel is al een tocht: zeg dat er geen andere zijn.
      if (f.goal && f.mainIsTrek) return { value: 'Geen andere', dim: true, sub: `${shortGoalName(f.goal.name)} is je doel` };
      return { value: 'Geen tochten', dim: true };
    case 'bundel-sportschool':
      return { value: forge.profile.name, sub: `${plural(forge.profile.barsKg.length, 'stang', 'stangen')}, ${plural(forge.profile.platesKg.length, 'schijf', 'schijven')}` };
    case 'bundel-weergave':
      return { value: forge.showOneRm ? choiceShort('forgeWeergave', forge.oneRmView) : 'Werkgewicht', sub: `Vergelijkt met ${lower(choiceShort('forgeVergelijken', forge.compareWeeks))}` };
    case 'bundel-rusttimer':
      return forge.restAuto ? { value: choiceShort('restsignaal', forge.restAlert) } : { value: 'Uit', dim: true };
    case 'bundel-rekenmodel':
      return adviceOrCount(BUNDLE_MODEL, s);
    case 'bundel-invullen':
      return adviceOrCount(BUNDLE_FILL, s);
    case 'bundel-toets': {
      const lines = f.strengthCheck ? checkLines(f.strengthCheck.all) : {};
      const line = lines.macrofactor ?? lines.forge;
      return { value: forge.showComparison ? 'Aan' : 'Uit', dim: !forge.showComparison, ...(line ? { sub: line } : {}) };
    }
    case 'bundel-wat': {
      const n = (s.influences ?? []).filter((e) => e.reasons.length > 0 || e.excludeHeartRate === true).length;
      return n === 0 ? { value: 'Nog niets', dim: true } : { value: `${n} keer` };
    }
    case 'bundel-signalen':
      return { value: `${signalsOnCount(s)} van ${SIGNAL_KEYS.length} aan` };
    case 'bundel-weer':
      return { value: `${countOn([o.weatherLine, o.bestMoment, o.rainSoon, o.hillsNearby, o.moonLine, o.weatherSwap, o.clothingAdvice])} van 7 aan` };
    case 'bundel-run-detail': {
      const d = resolveRunInsight(s.runInsight).detail;
      return d.show ? { value: 'Aan', sub: `Loopvorm: ${formSwitchesLine(d.form)}` } : { value: 'Uit', dim: true };
    }
    case 'bundel-inzicht': {
      const r = resolveRunInsight(s.runInsight);
      return r.enabled ? { value: 'Aan', sub: `${countOn(Object.values(r.topics))} van 4 onderwerpen` } : { value: 'Uit', dim: true };
    }
    case 'bundel-horloge-gebruik': {
      const use = f.watch?.use;
      // Met Health Connect aan komt niet alles van het horloge: dan heet de rij "Gebruik van je gegevens".
      // Zonder Garmin zijn er geen details van loopjes, dus vier keuzes.
      const title = f.healthConnect?.enabled ? { title: 'Gebruik van je gegevens' } : {};
      const flags = [use?.activities !== false, use?.sleep !== false, use?.restingHeartRate !== false, use?.hrv !== false];
      if (f.watch?.linked !== true) return { ...title, value: `${countOn(flags)} van 4 aan` };
      return { ...title, value: `${countOn([...flags, use?.details !== false && use?.activities !== false])} van 5 aan` };
    }
    case 'bundel-horloge-sturen':
      return f.watch?.sendEnabled ? { value: 'Aan' } : { value: 'Uit', dim: true };

    // Planning
    case 'trainingstijd': {
      const n = trainingDays(f);
      return n > 0 ? { value: plural(n, 'dag', 'dagen') } : { value: 'Niet ingesteld', dim: true };
    }
    case 'rustdag': {
      // A week you chose at the first questions: say so, with its days.
      const shape = parseWeekShape(s.weekShape);
      const days = shape
        ? [...new Set(Object.entries(shape.days).filter(([id]) => id !== 'tpl_herstel').map(([, d]) => d))].sort((a, b) => a - b)
        : [];
      return { value: WEEKDAYS[restDayIndex(f)], ...(days.length > 0 ? { sub: `Eigen week: ${days.map((d) => WEEKDAYS_SHORT[d - 1]).join(', ')}` } : {}) };
    }
    case 'rustdag-doen':
      return { value: s.restDayMode === 'active' ? 'Hersteldag' : 'Rust' };
    case 'meerdere':
      return { value: choiceShort('meerdere', f.pairing) };
    // Het scherm Sporten (engine/sportsScreen.ts): "2 gepland, 1 telt mee".
    case 'sporten':
      return sportsRowSummary(s);
    // Hoeveel per soort (engine/kindAmount.ts): "Alles normaal" of "2 anders".
    case 'hoeveel-per-soort': {
      const r = kindAmountSummary(parseKindAmounts(s.kindAmount).value);
      return r.sub ? { value: r.value, sub: r.sub } : { value: r.value, auto: true };
    }
    case 'wijzigingen':
      return { value: choiceShort('wijzigingen', s.changeApplyMode ?? 'auto_small') };
    case 'ambitie': {
      const label = choiceShort('ambitie', f.ambition.effective);
      return { value: f.ambition.chosen !== f.ambition.effective ? `${label}, tijdelijk` : label };
    }
    case 'lange-loop':
      return { value: choiceShort('langeLoopGroei', resolveLongRunGrowth(s.longRunGrowth)) };
    case 'zware-dingen':
      return { checked: !!s.hardSameDay, sub: 'Op één dag, eerst de loop' };
    case 'lange-loop-benen':
      return { checked: !!s.longRunThenLegs, sub: s.longRunThenLegs ? 'Een dag ertussen is genoeg' : '48 uur ertussen' };

    // Doel en tochten
    case 'doelen':
      return f.goal ? { value: `${shortGoalName(f.goal.name)}, ${formatDayMonthNL(f.goal.date)}` } : { value: 'Geen doel', dim: true, sub: 'Een doel geeft ASCEND een einddatum' };
    case 'programma':
      return f.position
        ? { value: `Week ${f.position.weekInProgram} van ${f.position.totalWeeks}`, sub: f.goal ? `${capitalize(lower(f.position.phaseName))}, teruggerekend vanaf je doel` : capitalize(lower(f.position.phaseName)) }
        : { value: 'Buiten het programma', dim: true };
    case 'lange-zondag':
      return { value: choiceShort('langeZondag', s.longSundaySession ?? 'hike') };
    case 'na-hoofddoel':
      return { value: choiceShort('naHoofddoel', s.afterMainGoal ?? 'stop') };
    case 'seizoensstrook':
      return { checked: s.showSeasonStrip !== false };
    case 'volgende-tocht':
      return { checked: s.showNextTrek !== false };
    case 'water-per-etappe':
      return { checked: s.showStageWater !== false };
    case 'rust-na-tocht':
      return { value: choiceShort('rustNaTocht', s.trekLegRest ?? 'soft') };
    case 'vakantie-opzij':
      return { value: choiceShort('vakantieOpzij', s.leaveCrowding ?? 'drop') };
    case 'vrije-dagen':
      return f.vacations > 0 ? { value: `${f.vacations} gepland` } : { value: 'Geen', dim: true };
    case 'reisplanner':
      return f.journeyOpen === undefined ? {} : f.journeyOpen > 0 ? { value: `${f.journeyOpen} open` } : { value: 'Alles af', dim: true };
    case 'bergschoenen': {
      const goal = bootGoalKm(s.bootBreakInKm);
      return { value: `${goal} km`, sub: f.bootKm === undefined ? undefined : `${Math.round(f.bootKm)} van ${goal} km ingelopen` };
    }
    case 'bergschoenen-herinnering':
      return { checked: s.bootBreakInReminder !== false };
    case 'paklijst':
      return f.packKg === undefined ? {} : { value: kgLabel(f.packKg, 2) };

    // Forge
    case 'forge':
      return { checked: forge.enabled };
    case 'forge-open':
      return {};
    case 'kracht':
      return { value: choiceShort('kracht', f.strengthExternal ? 'macrofactor' : 'ascend') };
    case 'trainingsduur': {
      const d = durationsValue(f);
      return d ? { value: d.value, auto: d.auto } : { dim: true };
    }
    case 'forge-volgorde':
      return { value: choiceShort('volgorde', forge.progression) };
    case 'forge-sets':
      return { value: choiceShort('werksets', forge.workSets) };
    case 'forge-opwarmen':
      return { value: choiceShort('opwarmen', forge.warmup) };
    case 'forge-opwarmbereik':
      return { value: choiceShort('opwarmbereik', forge.warmupScope) };
    case 'forge-bereik':
      return { checked: forge.widenRange, sub: 'Bij toestellen met grote stappen' };
    case 'forge-schatting':
      return { value: choiceShort('schatting', forge.estimateUpTo) };
    case 'forge-rust':
      return { checked: forge.restAuto };
    case 'forge-signaal':
      return { value: choiceShort('restsignaal', forge.restAlert) };
    case 'forge-geluid':
      // Bij alleen trillen kies je met het geluid het trilritme (engine/restVibration.ts): de rij blijft, met een feit eronder.
      return { value: choiceShort('rustgeluid', forge.restSound), ...(forge.restAlert === 'vibrate' ? { sub: 'Je voelt alleen het ritme' } : {}) };
    case 'forge-scherm':
      return { checked: forge.keepScreenOn };
    case 'forge-bijsturen':
      return { checked: forge.adjustLive };
    case 'forge-spotter':
      return { checked: forge.noSpotter };
    case 'forge-bergspieren':
      return { checked: forge.mountainMuscles };
    case 'spotterrek':
      return { checked: !!forge.profile.spotterRack };
    case 'forge-rir-vooraf':
      return { value: choiceShort('rirVooraf', forge.rirPrefill) };
    case 'forge-doorvoeren':
      return { value: choiceShort('doorvoeren', forge.carryMode) };
    case 'forge-1rm':
      return { checked: forge.showOneRm };
    case 'forge-weergave':
      return { value: choiceShort('forgeWeergave', forge.oneRmView) };
    case 'forge-1rm-macrofactor':
      return { checked: forge.showMacroFactorOneRm };
    case 'forge-vergelijken':
      return { value: choiceShort('forgeVergelijken', forge.compareWeeks) };
    case 'forge-volgorde-lijst':
      return { value: choiceShort('forgeVolgorde', forge.listSort) };
    case 'forge-extras':
      return { checked: forge.showExtras };
    case 'forge-lijntjes':
      return { checked: forge.showTrendLines };
    case 'forge-leren':
      return { value: choiceShort('forgeLeren', forge.stackWeights) };
    case 'forge-vermoeidheid':
      return { value: choiceShort('vermoeidheid', forge.fatigue) };
    case 'forge-pauze':
      return { checked: forge.lighterAfterBreak };
    case 'forge-rekent-mee':
      return { checked: forge.reckon };
    case 'forge-afvinken-doel':
      return { checked: forge.assumedCounts };
    case 'forge-dumbbells':
      return { value: choiceShort('dumbbellLog', forge.dumbbellLog) };
    case 'forge-naast': {
      // De stand staat hier, zodat je hem kunt zien zonder dat het op Forge staat.
      const lines = f.strengthCheck ? checkLines(f.strengthCheck.all) : {};
      const line = lines.macrofactor ?? lines.forge;
      return { checked: forge.showComparison, ...(line ? { sub: line } : {}) };
    }
    case 'forge-sinds':
      return { value: formatDateNL(forge.checkFrom) };
    case 'forge-schijven':
      return { checked: forge.showPlates };
    case 'forge-rir-snel':
      return { checked: forge.quickRir };
    case 'forge-programma':
      return s.strengthModel?.program ? { value: s.strengthModel.program.name } : { value: 'Van ASCEND', dim: true };
    case 'stangen':
      return { value: listWeights(forge.profile.barsKg) };
    case 'schijven':
      return { value: `${num(Math.min(...forge.profile.platesKg))} tot ${kgLabel(Math.max(...forge.profile.platesKg), 2)}` };
    case 'dumbbells':
      return { value: `${num(forge.profile.dumbbells.startKg)} tot ${kgLabel(forge.profile.dumbbells.maxKg, 2)}` };
    case 'kabels':
      return { value: `Per ${kgLabel(forge.profile.stackStepKg, 2)}` };
    case 'gym-profiel':
      return { value: forge.profile.name };
    case 'toestelgewichten': {
      const n = machineListCount(forge.profile);
      const gyms = allProfiles(s.strengthModel).length;
      return { value: n > 0 ? plural(n, 'toestel', 'toestellen') : 'Geen', ...(n === 0 ? { dim: true } : {}), ...(gyms > 1 ? { sub: `Voor ${forge.profile.name}` } : {}) };
    }

    case 'tussengewichten': {
      const own = exerciseAddOnCount(forge.profile);
      const list = forge.profile.addOnKg;
      return { value: formatAddOns(list), ...(!list || list.length === 0 ? { dim: true } : {}), ...(own > 0 ? { sub: `${plural(own, 'toestel', 'toestellen')} anders` } : {}) };
    }

    // Lichaam
    case 'lichaamsgewicht':
      return f.weight
        ? { value: kgLabel(f.weight.kg, 1), auto: f.weight.source === 'macrofactor' || f.weight.source === 'health-connect', sub: weightWords(f.weight) }
        : { value: 'Niet ingevuld', dim: true };
    case 'vetpercentage':
      return { checked: s.showBodyFat !== false };
    case 'hartslag': {
      const hr = s.heartRate ?? {};
      if (hr.lthr) return { value: `Drempel ${hr.lthr}`, sub: 'Zones in bpm, zoals op je horloge' };
      if (hr.maxHr) return { value: `Max ${hr.maxHr}`, sub: 'Zones in bpm, zoals op je horloge' };
      return { value: 'Niet ingevuld', dim: true, sub: 'Zonder hartslag alleen zonenummers' };
    }
    case 'blessures':
      return f.activeInjuries > 0 ? { value: `${f.activeInjuries} actief` } : { value: 'Geen', dim: true };
    case 'figuur': {
      const r = resolveFigure(s, f.linkedSex);
      if (r.setting !== 'auto') return { value: choiceShort('figuur', r.setting) };
      return r.source === 'linked'
        ? { value: choiceShort('figuur', r.figure), auto: true, sub: 'Uit je koppeling' }
        : { value: choiceShort('figuur', r.figure), auto: true, sub: `Nog niet gekozen, dus je ziet de ${choiceShort('figuur', r.figure).toLowerCase()}` };
    }

    // Wat speelde er (engine/influence.ts): alles staat aan, de oorzaak met je patroon.
    case 'wat-teken':
      return { checked: s.influenceSign !== false, sub: 'Teken bij een afwijkende hartslag' };
    case 'wat-oorzaak': {
      const cause = s.influenceCause ?? 'patroon';
      return { value: choiceShort('oorzaak', cause), sub: cause === 'uit' ? 'Feiten staan niet in het blad' : cause === 'weet' ? 'Uit weer, horloge en logboek' : 'Uit weer, horloge, logboek en je patroon' };
    }
    case 'wat-overzicht':
      return { checked: s.influenceOverview !== false, sub: 'Wat een reden met je doet' };
    case 'wat-test':
      return { checked: s.influenceTestMove !== false, sub: 'Na een avond die je noteerde' };
    case 'wat-namen':
      return { checked: s.influenceNames !== false, sub: s.influenceNames === false ? 'De uitleg blijft neutraal' : 'Alcohol en wiet staan in de uitleg' };
    case 'wat-vastgelegd': {
      const n = (s.influences ?? []).filter((e) => e.reasons.length > 0 || e.excludeHeartRate === true).length;
      return n === 0 ? { value: 'Nog niets', dim: true } : { value: `${n} keer`, sub: 'Bekijken, wijzigen of wissen' };
    }

    // Vandaag en meldingen
    case 'kaarten': {
      const p = matchTodayProfile(s);
      return { value: TODAY_PROFILE_SHORT[p], dim: p === 'aangepast' };
    }
    case 'ochtendcheck':
      return { checked: o.morningCheckIn };
    case 'ochtendkaart':
      return { checked: o.morningCard };
    case 'benen-na-test':
      return { checked: o.legsAfterEffort, sub: o.legsAfterEffort ? 'Open vraag, zonder voorstel' : 'Zoals elke ochtend' };
    case 'zweet-vragen':
      return { checked: s.askSweat !== false };
    case 'bundel-zonder-doel': {
      const w = settingBudget(s);
      return { value: w.chosen ? DIRECTIONS[w.id].label : 'Nog geen richting', dim: !w.chosen, sub: w.id === 'improve' ? `Eigen weken, ${w.budget.strength}\u00d7 kracht` : `${w.budget.minutes} min, ${w.budget.strength}\u00d7 kracht` };
    }
    case 'golven': {
      const w = resolveWaveSettings(s.waves);
      return { value: `${w.length} weken`, sub: w.lightWeek ? 'Met een lichte week' : 'Zonder lichte week' };
    }
    case 'golf-terugblik': {
      const w = resolveWaveSettings(s.waves);
      return w.review ? { value: 'Aan', sub: `Stap omhoog bij ${w.weeksForStep} van ${w.length} weken` } : { value: 'Uit', dim: true };
    }
    case 'beginnersstart':
      return { value: choiceShort('beginnersstart', parseBeginnerStart(s.beginnerStart)) };
    case 'richting': {
      const w = settingBudget(s);
      return w.chosen ? { value: DIRECTIONS[w.id].label } : { value: 'Nog niet gekozen', dim: true, sub: 'Advies: Fit blijven' };
    }
    case 'weekbudget': {
      const w = settingBudget(s);
      // De waarde blijft kort (met de InfoButton past ze op 360 px); de kracht staat op de regel eronder.
      return { value: w.id === 'improve' ? 'Eigen weken' : `${w.budget.minutes} min`, sub: `${w.budget.strength}\u00d7 kracht, ${w.chosen ? DIRECTIONS[w.id].label : 'advies Fit blijven'}` };
    }
    case 'klaar-weging':
      return { value: choiceShort('klaarWeging', resolveReadinessWeighting(s.readinessWeighting)) };
    case 'klaar-groei':
      return { value: choiceShort('klaarGroei', resolveGrowthChoice(s.goalGrowth)) };
    case 'klaar-marge':
      return { value: choiceShort('klaarMarge', resolveLimitMargin(s.limitMargin)) };
    case 'doeltijd-voorstel':
      return { checked: s.proposeTargetTime !== false };
    // Testloop: de vier keuzes rond een test in één blad; de rij noemt de rust, de rest staat in het blad.
    case 'bundel-testloop':
      return { value: `${choiceShort('testRust', resolveTestRest(s.testRest))} rust`, sub: s.newTestOnStops === false ? 'Geen nieuwe test bij stilstand' : 'Nieuwe test bij stilstand' };
    case 'test-rust':
      return { value: choiceShort('testRust', resolveTestRest(s.testRest)) };
    case 'test-stilstaan':
      return { value: choiceShort('testStilstaan', resolveTestStops(s.testStops)) };
    case 'twijfeltest':
      return { checked: s.askDoubtTest !== false };
    case 'nieuwe-test':
      return { checked: s.newTestOnStops !== false };
    // Training die niet doorging (engine/missedTraining.ts): "Vragen na 2 dagen".
    case 'bundel-niet-doorgegaan': {
      const m = resolveMissedSettings(s);
      if (m.choice === 'off') return { value: 'Niets doen', dim: true, ...(m.link ? { sub: 'Wel een log op een andere dag koppelen' } : {}) };
      return { value: `${choiceShort('nietDoorgegaan', m.choice)} na ${choiceShort('nietDoorgegaanDagen', m.days)}`, ...(m.link ? {} : { sub: 'Geen log op een andere dag koppelen' }) };
    }
    case 'niet-doorgegaan':
      return { value: choiceShort('nietDoorgegaan', resolveMissedSettings(s).choice) };
    case 'niet-doorgegaan-dagen':
      return { value: choiceShort('nietDoorgegaanDagen', resolveMissedSettings(s).days) };
    case 'log-koppelen':
      return { checked: resolveMissedSettings(s).link };
    // Hoe sporten meetellen (engine/sportRole.ts#resolveSportCounting): "Vragen" of wat er anders is.
    case 'bundel-sporten-tellen': {
      const c = resolveSportCounting(s.sportCounting);
      const off = [!c.askNew ? 'Nieuwe sport telt meteen' : '', !c.askFelt ? 'zwaarte aangenomen' : '', c.rest === 'korter' ? 'kortere rust' : ''].filter(Boolean);
      if (off.length === 0) return { value: 'Vragen', auto: true };
      const sub = off.join(', ');
      return { value: 'Aangepast', sub: sub.charAt(0).toUpperCase() + sub.slice(1) };
    }
    case 'sport-vragen':
      return { checked: resolveSportCounting(s.sportCounting).askNew };
    case 'sport-zwaarte':
      return { checked: resolveSportCounting(s.sportCounting).askFelt };
    case 'sport-rust':
      return { value: choiceShort('sportRust', resolveSportCounting(s.sportCounting).rest) };
    case 'rustdag-terug':
      return { checked: s.restDayBack !== false };
    case 'trillen':
      return { checked: s.haptics !== false };
    case 'locatie':
      return locationSummary(s);
    case 'weekvoorstel':
      return { checked: s.weekFixProposal !== false };
    case 'volgorde-stand':
      return { value: isDefaultOrder('stand', resolveCardOrder('stand', s.cardOrder)) ? 'Standaard' : 'Eigen volgorde' };
    case 'forge-oefeningen':
      return { value: choiceShort('forgeOefeningen', resolveForgeLayout(s)) };
    case 'forge-tijdsgrens': {
      // Beide waarden in één rij: "60 en 75 min", of wat uit staat.
      const cap = resolveTimeCap(s);
      if (cap.strength === 0 && cap.legs === 0) return { value: 'Uit', dim: true };
      if (cap.strength === 0) return { value: `${cap.legs} min`, sub: 'Alleen een beendag' };
      if (cap.legs === 0) return { value: `${cap.strength} min`, sub: 'Niet op een beendag' };
      return { value: `${cap.strength} en ${cap.legs} min`, sub: 'Kracht en beendag' };
    }
    case 'forge-grens-kracht':
      return { value: choiceShort('grensKracht', resolveTimeCap(s).strength), dim: resolveTimeCap(s).strength === 0 };
    case 'forge-grens-been':
      return { value: choiceShort('grensBeen', resolveTimeCap(s).legs), dim: resolveTimeCap(s).legs === 0 };
    case 'forge-onderbreking':
      return { value: choiceShort('forgeOnderbreking', resolveBreakAsk(s)), dim: resolveBreakAsk(s) === 0 };
    case 'forge-vegen':
      return { checked: swipeDeleteOn(s) };
    // Slepen in Week (engine/weekSwap.ts): "Ruilen" of "Samen", of uit.
    case 'bundel-slepen':
      return s.dragWeek === false ? { value: 'Uit', dim: true } : { value: `Aan, ${choiceShort('loslaten', resolveDropOnTraining(s)).toLowerCase()}` };
    case 'slepen-week':
      return { checked: s.dragWeek !== false };
    case 'loslaten-training':
      return { value: choiceShort('loslaten', resolveDropOnTraining(s)) };
    case 'korte-nacht':
      return { checked: s.askShortNight !== false };
    // Kaarten boven de missie (engine/todayCards.ts): "Eén".
    case 'boven-missie':
      return { value: choiceShort('bovenMissie', resolveAboveMission(s.cardsAboveMission)) };
    case 'ochtend-vanaf':
      return { value: choiceShort('ochtendVanaf', o.morningCardFrom) };
    case 'ochtendmelding': {
      const n = noticeState(f);
      if (n.support === 'unavailable') return { value: 'Niet mogelijk', dim: true, sub: 'Alleen als je de app opent' };
      if (n.support === 'not_installed') return { value: 'Niet mogelijk', dim: true, sub: 'Zet ASCEND eerst op je beginscherm' };
      return { checked: n.on, sub: n.support === 'blocked' ? 'Geblokkeerd in je telefoon' : undefined };
    }
    case 'bundel-meldingen':
      return noticesBundleSummary(s, deviceOf(f), noticeState(f).on);
    case 'rust-melding':
      return { checked: resolveDeviceNotices(s).rest };
    case 'weekmelding':
      return { checked: resolveDeviceNotices(s).week };
    case 'weekmelding-tijd':
      return { value: choiceShort('weekmeldingTijd', resolveDeviceNotices(s).weekTime) };
    case 'toestemmingen':
      return permissionsRow(f);
    case 'auto-bijwerken':
      return { checked: s.autoUpdate !== false };
    case 'ochtendmelding-tijd': {
      // Er voor als de telefoon het kan; gedimd zolang de melding uit staat.
      const n = noticeState(f);
      return { value: choiceShort('ochtendTijd', resolveMorningNotice(s.morningNotice).time), dim: !n.on };
    }
    case 'weekterugblik':
      return { checked: o.weekReview };
    case 'weekterugblik-dag':
      return { value: choiceShort('terugblikDag', o.weekReviewDay) };
    case 'forge-plaatjes':
      return { value: choiceShort('plaatjes', resolveExerciseArt(s)) };
    case 'lijfvraag':
      return { value: choiceShort('lijfvraag', resolveBodyCheck(s)) };
    case 'korter-vandaag':
      return { value: choiceShort('korterVandaag', resolveShorterToday(s.shorterToday)) };
    case 'zones-na-test':
      return { checked: s.zonesAfterTest !== false };
    case 'lichterbenen':
      return { value: choiceShort('lichterbenen', resolveLegEase(s)) };
    case 'lichterbenen-hoe':
      return { value: choiceShort('lichterbenenHoe', resolveLegEaseHow(s)) };
    case 'weekvraag':
      return { checked: o.weeklyQuestion };
    case 'weerplaats':
      if (follows) return { value: 'Volgt je locatie', auto: true };
      return place ? { value: place.name } : { value: 'Niet gekozen', dim: true };
    case 'weerregel':
      return { checked: o.weatherLine };
    case 'regen-uur':
      return { checked: o.rainSoon };
    case 'heuvels-buurt':
      return { checked: o.hillsNearby };
    case 'maanstand':
      return { checked: o.moonLine };
    case 'weerruil':
      return { checked: o.weatherSwap };
    case 'beste-moment':
      return { checked: o.bestMoment };
    case 'kledingadvies':
      return { checked: o.clothingAdvice };
    case 'kleding-voorkeur': {
      const c = clothingValue(f);
      return { value: c.value, auto: false, dim: c.value === 'Standaard' };
    }
    case 'run-detail-patronen':
      return { checked: resolveRunInsight(s.runInsight).detail.patterns };
    case 'run-detail-advies':
      return { checked: resolveRunInsight(s.runInsight).detail.advice };
    case 'loopvorm-cadans':
      return { checked: resolveRunInsight(s.runInsight).detail.form.cadence };
    case 'loopvorm-grondcontact':
      return { checked: resolveRunInsight(s.runInsight).detail.form.stanceTimeMs };
    case 'loopvorm-staplengte':
      return { checked: resolveRunInsight(s.runInsight).detail.form.stepLengthM };
    case 'loopvorm-oscillatie':
      return { checked: resolveRunInsight(s.runInsight).detail.form.oscillationMm };
    case 'loopvorm-balans':
      return { checked: resolveRunInsight(s.runInsight).detail.form.stanceBalanceLeftPct };
    case 'run-detail':
      return { checked: resolveRunInsight(s.runInsight).detail.show };
    case 'loopinzicht':
      return { checked: resolveRunInsight(s.runInsight).enabled };
    case 'loop-efficientie':
      return { checked: resolveRunInsight(s.runInsight).topics.efficiency };
    case 'loop-langedagen':
      return { checked: resolveRunInsight(s.runInsight).topics.longDays };
    case 'loop-berg':
      return { checked: resolveRunInsight(s.runInsight).topics.climbing };
    case 'loop-vorm':
      return { checked: resolveRunInsight(s.runInsight).topics.form };
    case 'loopweer':
      return { checked: resolveRunInsight(s.runInsight).weather };
    case 'borstband':
      return { checked: resolveRunInsight(s.runInsight).chestStrap };
    case 'tempo-stukken':
      return { checked: s.tempoStablePieces !== false };
    case 'intensiteit':
      return { value: choiceShort('intensiteit', resolveIntensityCounting(s)) };
    case 'lucht':
      return { value: choiceShort('lucht', resolveSky(s).sky), ...(resolveSky(s).sky === 'auto' ? { sub: `Donker vanaf ${lower(choiceShort('luchtVanaf', resolveSky(s).nightFrom))}` } : {}) };
    case 'lucht-vanaf':
      return { value: choiceShort('luchtVanaf', resolveSky(s).nightFrom) };
    case 'dagcitaat':
      return { value: choiceShort('dagcitaat', resolveQuoteLanguage(s)), dim: resolveQuoteLanguage(s) === 'off' };
    case 'beweging':
      return { value: choiceShort('beweging', resolveMotion(s)) };
    case 'terugknop':
      return { value: choiceShort('terugknop', resolveNavigation(s).tabBack) };
    case 'hervatten':
      return { value: resumeLabel(resolveNavigation(s).resumeMinutes), dim: resolveNavigation(s).resumeMinutes === 0 };
    case 'citaten':
      return { checked: o.completionMoment };
    case 'geluid':
      return { checked: s.introSoundEnabled };

    // Koppelingen
    case 'garmin':
      if (f.watchUnreadable) return { value: 'Niet te lezen', dim: true, sub: 'Probeer het zo opnieuw' };
      return watchOn
        ? { value: 'Verbonden', dot: 'ok', sub: f.watch?.syncedAt ? `Laatst bijgewerkt om ${clock(f.watch.syncedAt)}` : 'Nog niet opgehaald' }
        : { value: 'Koppelen', sub: 'Trainingen, slaap en hartslag' };
    case 'garmin-trainingen':
      return { checked: f.watch?.use.activities !== false };
    case 'vanzelf-afvinken':
      return { checked: f.watch?.autoTick !== false };
    case 'garmin-leidend':
      return { checked: f.watch?.leads !== false };
    case 'correcties-overnemen':
      return { checked: f.watch?.corrections !== false };
    case 'horloge-details':
      return { checked: f.watch?.use.details !== false };
    case 'slaap':
      return { checked: f.watch?.use.sleep !== false };
    case 'rusthartslag':
      return { checked: f.watch?.use.restingHeartRate !== false };
    case 'hrv':
      return { checked: f.watch?.use.hrv !== false };
    case 'naar-horloge':
      return { checked: !!f.watch?.sendEnabled };
    case 'horloge-voorvoegsel':
      return { value: choiceShort('voorvoegsel', s.watchNamePrefix ?? 'short') };
    case 'horloge-hartslag':
      return { value: choiceShort('hartslagHorloge', resolveWatchHrMode({ mode: s.watchHeartRate })), sub: watchHrSub(f) };
    case 'horloge-rustige-loop':
      return { checked: resolveCalmRun({ calmRun: s.watchCalmRun }) };
    case 'horloge-gedaan-weghalen':
      return { checked: s.watchRemoveDone !== false };
    case 'horloge-status':
      return s.showWatchStatus !== false && s.showWatchStatusOnWeek === false
        ? { checked: false, sub: 'Niet op Week' }
        : { checked: s.showWatchStatus !== false && s.showWatchStatusOnWeek !== false };
    case 'horloge-status-week':
      return { checked: s.showWatchStatus !== false && s.showWatchStatusOnWeek !== false };
    case 'macrofactor':
      return f.macroFactor?.readAt
        ? { title: 'Laatste export', value: formatDayMonthNL(localDateOf(f.macroFactor.readAt)) }
        : { title: 'Export inlezen', value: 'Nog niet', dim: true, sub: 'Kracht en gewicht uit MacroFactor' };
    case 'macrofactor-leidend':
      return { checked: f.macroFactor?.leads !== false };
    case 'macrofactor-gewicht':
      return { checked: s.weightFromMacroFactor !== false };
    case 'strava-tekst':
      return { checked: s.stravaText !== false };
    case 'health-connect':
      return healthConnectRow(f);
    case 'health-connect-gewicht':
      // Aan, maar nog geen toestemming voor gewicht: dat staat eronder.
      return s.weightFromHealthConnect !== false && f.healthConnect?.enabled && !f.healthConnect.weightGranted
        ? { checked: true, sub: 'Nog geen toestemming voor gewicht' }
        : { checked: s.weightFromHealthConnect !== false };

    // Gegevens en back-up
    case 'backup': {
      const where = age.days !== null ? backupWhereText(f.autoBackup?.where) : undefined;
      return { value: backupAgoText(age), dim: age.level === 'never', ...(where ? { sub: where } : {}) };
    }
    case 'auto-backup':
      return autoBackupRow(f);
    case 'backupmap':
      if (f.autoBackup?.platform === 'app' && f.autoBackup.folder) return { value: f.autoBackup.folder };
      return f.folderSupported ? { value: f.folderChosen ? 'Gekozen' : 'Niet gekozen', dim: !f.folderChosen } : {};
    case 'opslag':
      if (f.storage === 'protected') return { value: 'Ja' };
      if (f.storage === 'not_protected') return { value: 'Nee', dim: true };
      return f.storage === 'unsupported' ? { value: 'Niet mogelijk', dim: true } : {};
    case 'momentopnamen':
      return { value: String(f.snapshots), dim: f.snapshots === 0 };
    case 'vroeg-ziek':
      return { checked: s.illnessSigns !== false };
    case 'hitte-tempo':
      return { checked: s.heatPace !== false };
    case 'weekdag-patroon':
      return { checked: s.weekdayPattern !== false };
    case 'luchtkwaliteit':
      return { checked: s.airQuality !== false };
    case 'klimtempo':
      return { checked: s.climbPace !== false };
    case 'etappetijd-eigen':
      return { checked: s.stageOwnPace !== false };
    case 'tempocurve':
      return { checked: s.paceCurve !== false };
    case 'wennen-warmte':
      return { checked: s.heatAcclimation !== false };
    case 'bergweer':
      return { checked: s.mountainWeather !== false };
    case 'ochtend-voorstel':
      return { checked: s.morningProposal !== false };
    case 'ochtendregel':
      return { checked: s.morningRule !== false };
    case 'horloge-stil':
      return { checked: s.watchSilence !== false };
    case 'ochtend-backup':
      return { checked: s.morningInBackup !== false, sub: s.morningInBackup !== false ? 'Ook je slaap en hartslag gaan mee' : undefined };
    case 'reeksen-bewaren':
      return { checked: s.keepStreams !== false };
    case 'reeksen-backup': {
      const choice = resolveStreamsBackup(s);
      const sub = f.streamsBytes === undefined || choice === 'none'
        ? undefined
        : f.streamsBytes > 0
          ? `Maakt de back-up ${choice === 'all' ? '' : 'hoogstens '}ongeveer ${formatBytes(f.streamsBytes * 1.34)} groter`
          : 'Nog geen reeksen bewaard';
      return { value: choiceShort('reeksenBackup', choice), dim: choice === 'none', sub };
    }
    case 'voorstellen-opruimen': {
      const months = resolveProposalTidyMonths(s.proposalTidyMonths);
      return { value: choiceShort('voorstellenOpruimen', months), dim: months === 0 };
    }
    case 'ruimte-app': {
      const use = storageUseText(f.storageUse, deviceOf(f)?.timed === true);
      return use ? { value: use.value, sub: use.sub, dim: use.dim, dot: use.tight ? 'warn' : undefined } : {};
    }
    case 'reeksen-ruimte':
      return f.streamsBytes === undefined ? {} : { value: formatBytes(f.streamsBytes), dim: f.streamsBytes === 0 };
    case 'aangepast': {
      const n = adviceDifferences(s).length;
      return { value: String(n), hidden: n === 0 };
    }
    case 'versie':
      return { value: f.buildLabel };
    case 'startniveau':
    case 'herbouwen':
    case 'wissen':
      return {};

    // Gidsen en kennis: zes rijen zonder waarde.
    default:
      return {};
  }
}

// ---- de groepen op het overzicht -------------------------------------------------

type GroupSummary = { value?: string; sub: string; dim?: boolean; dot?: 'ok' | 'no' };

export function groupSummary(page: SettingsPageId, f: SettingsFacts): GroupSummary {
  const group = groupSummaryNow(page, f);
  if (isRowPending(page, f.pending)) return { value: 'Bezig…', sub: '', dim: true };
  if (isRowUnknown(page, f.unknown)) return { value: 'Onbekend', sub: '', dim: true };
  return group;
}

function groupSummaryNow(page: SettingsPageId, f: SettingsFacts): GroupSummary {
  const s = f.settings;
  switch (page) {
    case 'planning': {
      const n = trainingDays(f) || 6;
      const fixed = SPORTS.flatMap((sp) => {
        const st = sportState(f, sp);
        return st.on && st.perWeek ? [`${SPORT_LABEL[sp]} ${st.perWeek}× per week`] : [];
      });
      const enabled = SPORTS.filter((sp) => sportState(f, sp).on);
      const sub = fixed.length > 0
        ? fixed.slice(0, 1).join('')
        : enabled.length > 0
          ? `${listNL(enabled.map((sp, i) => (i === 0 ? SPORT_LABEL[sp] : lower(SPORT_LABEL[sp]))))}, weekschema`
          : 'Geen sport ingepland';
      return { value: `Rust ${WEEKDAYS_SHORT[restDayIndex(f)]}, ${plural(n, 'dag', 'dagen')}`, sub };
    }
    case 'doel': {
      const treks = f.treks;
      const value = treks > 0 ? plural(treks, 'tocht', 'tochten') : f.goal ? (f.mainIsTrek ? 'Alleen je doel' : 'Geen tochten') : 'Geen doel';
      const sub = f.goal
        ? `${shortGoalName(f.goal.name)} op ${longDate(f.goal.date)}${f.position ? `, ${lower(f.position.phaseName)}` : ''}`
        : 'Kies een doel om naartoe te plannen';
      return { value, dim: treks === 0, sub };
    }
    case 'forge': {
      const forge = resolveStrengthSettings(s.strengthModel);
      return forge.enabled
        ? { value: 'Aan', sub: `Eerst ${lower(choiceShort('volgorde', forge.progression))}, opwarmen ${lower(choiceShort('opwarmen', forge.warmup))}` }
        : { value: 'Uit', dim: true, sub: `Sportschool: ${plural(forge.profile.barsKg.length, 'stang', 'stangen')}, ${plural(forge.profile.platesKg.length, 'schijf', 'schijven')}` };
    }
    case 'lichaam': {
      const hr = s.heartRate ?? {};
      const hrText = hr.lthr ? `Drempel ${hr.lthr} bpm` : hr.maxHr ? `Max ${hr.maxHr} bpm` : 'Hartslag niet ingevuld';
      const inj = f.activeInjuries > 0 ? plural(f.activeInjuries, 'blessure', 'blessures') : 'geen blessures';
      return {
        value: f.weight ? kgLabel(f.weight.kg, 1) : 'Niet ingevuld',
        dim: !f.weight,
        sub: `${hrText}, ${inj}`,
      };
    }
    case 'vandaag': {
      const o = resolveOverviews(s.overviews);
      const place = s.homeLocation;
      const follows = isMyLocation(place) && o.weatherFollowsLocation;
      return { value: TODAY_PROFILE_SHORT[matchTodayProfile(s)], dim: matchTodayProfile(s) === 'aangepast', sub: follows ? 'Weer volgt je locatie' : place ? `Weer voor ${place.name}` : 'Nog geen plaats voor het weer' };
    }
    case 'koppelingen': {
      const garmin = f.watch?.linked === true;
      const mf = !!f.macroFactor?.readAt;
      if (f.watchUnreadable && !mf) return { value: 'Niet te lezen', dim: true, sub: 'Probeer het zo opnieuw' };
      if (!garmin && !mf) return { value: 'Niet gekoppeld', dim: true, sub: 'Garmin en MacroFactor nog niet gekoppeld' };
      const parts = [
        garmin ? `Garmin${f.watch?.syncedAt ? ` om ${clock(f.watch.syncedAt)}` : ''}` : null,
        mf && f.macroFactor?.readAt ? `MacroFactor ${formatDayMonthNL(localDateOf(f.macroFactor.readAt))}` : null,
      ].filter((p): p is string => p !== null);
      return garmin ? { value: 'Verbonden', dot: 'ok', sub: parts.join(', ') } : { value: 'MacroFactor', sub: parts.join(', ') };
    }
    case 'gegevens': {
      const age = backupAge(s.lastExportedAt, f.today);
      const value = age.days === null ? 'Nog nooit' : age.days === 0 ? 'Vandaag' : age.days === 1 ? 'Gisteren' : `${age.days} dagen`;
      return {
        value,
        dim: age.level === 'never',
        sub: f.snapshots > 0 ? `Alleen op deze telefoon, ${plural(f.snapshots, 'kopie', 'kopieën')}` : 'Alles staat alleen op deze telefoon',
      };
    }
    case 'gidsen':
      return { sub: 'Weer en kleding, kennisbank en bronnen' };
  }
}

// De waarde zoals het zoekresultaat die toont: Aan of Uit bij een schakelaar.
export function searchValue(rowId: string, f: SettingsFacts): { text: string; dim: boolean } {
  const r = rowSummary(rowId, f);
  if (r.checked !== undefined) return { text: r.checked ? 'Aan' : 'Uit', dim: !r.checked };
  return { text: r.value ?? '', dim: !!r.dim };
}


// De regel onder een training in het blad Trainingsduur: waar de duur vandaan komt.
export function durationNote(source: 'learned' | 'estimate' | 'default', basedOn: number, usable: number): string {
  if (source === 'learned') return `Uit ${plural(basedOn, 'training', 'trainingen')}`;
  if (source === 'estimate') return 'Jouw schatting';
  const missing = Math.max(1, MIN_LOGS_TO_LEARN - usable);
  return `Standaard, nog ${plural(missing, 'training', 'trainingen')}`;
}

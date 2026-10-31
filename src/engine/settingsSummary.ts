// ASCEND: wat de rijen en groepen in de instellingen zeggen. Puur: de feiten gaan
// erin, de korte waarde en de regel eronder komen eruit. Eén plek, zodat elke
// samenvatting waar is en het zoekveld, het overzicht en de groepspagina's nooit
// iets anders melden (docs/beslissingen/2026-10-22-instellingen-in-groepen.md).
//
// De regel voor een rij: links de titel, rechts de waarde, daaronder hoogstens één
// regel (`sub`): een feit of een bron, nooit uitleg. Een test bewaakt dat een regel
// niet langer is dan SUB_MAX_LENGTH, zodat niets afkapt op 360 px.

import { isDefaultOrder, resolveCardOrder } from './cardOrder';
import { resolveTestStops } from './bestEffort';
import type { AppSettings } from '../storage/database';
import type { Weekday } from '../models/goalEngineConfig';
import type { WatchUse } from './watchUse';
import { choiceShort } from '../data/settingsChoices';
import { matchTodayProfile, TODAY_PROFILE_LABEL } from './settingsProfiles';
import { SHOW_WHEN, isRowShown, type RowContext, type SettingsPageId } from '../data/settingsLayout';
import { countDifferences } from './settingsDiff';
import { resolveOverviews } from './overviewSettings';
import { resolveMorningNotice, type NoticeSupport } from './morningNotice';
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
import { DIRECTIONS } from '../data/directions';
import { formatBytes } from './streamPack';
import { resolveStreamsBackup } from './streamsBackup';
import { SIGNAL_KEYS, signalsOnCount } from './signalSettings';
import { resolveProposalTidyMonths } from './proposalTidy';
import { storageUseText, type StorageEstimate } from './storageUse';
import { quickButtonsOn, swipeDeleteOn } from './forgeQuickActions';
import { resolveForgeLayout } from './forgeLayout';
import { resolveBreakAsk } from './forgeSession';
import { formatNumberNL } from '../utils/number';
import { formatDateNL, localDateOf } from '../utils/dates';

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
export const THRESHOLD_GAP = 3;
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
}

// De ochtendmelding: staat hij aan en kan hij ook werken (toestemming en een telefoon die het kan)?
function noticeState(f: SettingsFacts): { on: boolean; support: NoticeSupport } {
  const n = resolveMorningNotice(f.settings.morningNotice);
  const support = f.notice?.support ?? 'ready';
  return { on: n.enabled && support === 'ready' && (f.notice?.granted ?? true), support };
}

// ---- hulpjes -----------------------------------------------------------------

const SHORT_MONTHS = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
const LONG_MONTHS = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
const WEEKDAYS = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'];
const WEEKDAYS_SHORT = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];

const dayOf = (iso: string) => Number(iso.slice(8, 10));
const monthIndex = (iso: string) => Number(iso.slice(5, 7)) - 1;
export const shortDate = (iso: string): string => `${dayOf(iso)} ${SHORT_MONTHS[monthIndex(iso)]}`;
export const longDate = (iso: string): string => `${dayOf(iso)} ${LONG_MONTHS[monthIndex(iso)]}`;

const num = (n: number, decimals = 2) => formatNumberNL(n, decimals);
const kg = (n: number) => `${num(n)} kg`;
const capitalize = (text: string) => (text ? text.charAt(0).toUpperCase() + text.slice(1) : text);
const lower = (text: string) => text.toLowerCase();
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function listNL(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} en ${items[items.length - 1]}`;
}

// "14:02", in de tijd van het toestel.
function clock(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
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
  return `${w.source === 'macrofactor' ? 'MacroFactor' : 'Zelf ingevuld'}, ${shortDate(w.date)}`;
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
    folderSupported: f.folderSupported,
    noticeAvailable: support !== 'unavailable' && support !== 'not_installed',
    bodyFat: f.hasBodyFat === true,
  };
}

// De samenvatting van een rij. Of de rij er nu hoort (`hidden`) komt uit SHOW_WHEN in
// data/settingsLayout.ts, zodat de afhankelijkheden op één plek staan.
export function rowSummary(rowId: string, f: SettingsFacts): RowSummary {
  const base = baseSummary(rowId, f);
  return SHOW_WHEN[rowId] ? { ...base, hidden: !isRowShown(rowId, f.settings, rowContext(f)) } : base;
}

const countOn = (flags: boolean[]) => flags.filter(Boolean).length;
const BUNDLE_MODEL = ['forge-sets', 'forge-vermoeidheid', 'forge-pauze', 'forge-bereik', 'forge-schatting', 'forge-leren'];
const BUNDLE_FILL = ['forge-onderbreking', 'forge-rir-vooraf', 'forge-doorvoeren', 'forge-schijven'];
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
      return f.treks > 0 ? { value: plural(f.treks, 'tocht', 'tochten') } : { value: 'Geen tochten', dim: true };
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
      return { value: `${countOn([o.weatherLine, o.bestMoment, o.weatherSwap, o.clothingAdvice])} van 4 aan` };
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
      return { value: `${countOn([use?.activities !== false, use?.details !== false && use?.activities !== false, use?.sleep !== false, use?.restingHeartRate !== false, use?.hrv !== false])} van 5 aan` };
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
    case 'sport-running':
    case 'sport-hiking':
    case 'sport-cycling': {
      const sport = rowId.slice(6) as Sport;
      const st = sportState(f, sport);
      if (!st.on) return { value: 'Uit', dim: true };
      if (st.perWeek) return { value: `${st.perWeek}× per week` };
      return { value: 'Aan', auto: true };
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

    // Doel en tochten
    case 'doelen':
      return f.goal ? { value: `${shortGoalName(f.goal.name)}, ${shortDate(f.goal.date)}` } : { value: 'Geen doel', dim: true, sub: 'Een doel geeft ASCEND een einddatum' };
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
      return f.packKg === undefined ? {} : { value: kg(f.packKg) };

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
    case 'forge-programma':
      return s.strengthModel?.program ? { value: s.strengthModel.program.name } : { value: 'Van ASCEND', dim: true };
    case 'stangen':
      return { value: listWeights(forge.profile.barsKg) };
    case 'schijven':
      return { value: `${num(Math.min(...forge.profile.platesKg))} tot ${kg(Math.max(...forge.profile.platesKg))}` };
    case 'dumbbells':
      return { value: `${num(forge.profile.dumbbells.startKg)} tot ${kg(forge.profile.dumbbells.maxKg)}` };
    case 'kabels':
      return { value: `Per ${kg(forge.profile.stackStepKg)}` };
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
        ? { value: `${num(f.weight.kg, 1)} kg`, auto: f.weight.source === 'macrofactor', sub: weightWords(f.weight) }
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
      return p === 'aangepast' ? { value: TODAY_PROFILE_LABEL.aangepast, dim: true } : { value: TODAY_PROFILE_LABEL[p], dim: false };
    }
    case 'ochtendcheck':
      return { checked: o.morningCheckIn };
    case 'ochtendkaart':
      return { checked: o.morningCard };
    case 'zweet-vragen':
      return { checked: s.askSweat !== false };
    case 'bundel-zonder-doel': {
      const w = settingBudget(s);
      return { value: w.chosen ? DIRECTIONS[w.id].label : 'Nog geen richting', dim: !w.chosen, sub: w.id === 'improve' ? `Eigen weken, ${w.budget.strength}\u00d7 kracht` : `${w.budget.minutes} min, ${w.budget.strength}\u00d7 kracht` };
    }
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
    case 'test-stilstaan':
      return { value: choiceShort('testStilstaan', resolveTestStops(s.testStops)) };
    case 'twijfeltest':
      return { checked: s.askDoubtTest !== false };
    case 'nieuwe-test':
      return { checked: s.newTestOnStops !== false };
    case 'trillen':
      return { checked: s.haptics !== false };
    case 'weekvoorstel':
      return { checked: s.weekFixProposal !== false };
    case 'volgorde-stand':
      return { value: isDefaultOrder('stand', resolveCardOrder('stand', s.cardOrder)) ? 'Standaard' : 'Eigen volgorde' };
    case 'forge-oefeningen':
      return { value: choiceShort('forgeOefeningen', resolveForgeLayout(s)) };
    case 'forge-onderbreking':
      return { value: choiceShort('forgeOnderbreking', resolveBreakAsk(s)), dim: resolveBreakAsk(s) === 0 };
    case 'forge-vegen':
      return { checked: swipeDeleteOn(s) };
    case 'forge-snelknoppen':
      return { checked: quickButtonsOn(s) };
    case 'slepen-week':
      return { checked: s.dragWeek !== false };
    case 'korte-nacht':
      return { checked: s.askShortNight !== false };
    case 'ochtend-vanaf':
      return { value: choiceShort('ochtendVanaf', o.morningCardFrom) };
    case 'ochtendmelding': {
      const n = noticeState(f);
      if (n.support === 'unavailable') return { value: 'Niet mogelijk', dim: true, sub: 'Alleen als je de app opent' };
      if (n.support === 'not_installed') return { value: 'Niet mogelijk', dim: true, sub: 'Zet ASCEND eerst op je beginscherm' };
      return { checked: n.on, sub: n.support === 'blocked' ? 'Geblokkeerd in je telefoon' : undefined };
    }
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
    case 'intensiteit':
      return { value: choiceShort('intensiteit', resolveIntensityCounting(s)) };
    case 'lucht':
      return { value: choiceShort('lucht', resolveSky(s).sky), ...(resolveSky(s).sky === 'auto' ? { sub: `Donker vanaf ${lower(choiceShort('luchtVanaf', resolveSky(s).nightFrom))}` } : {}) };
    case 'lucht-vanaf':
      return { value: choiceShort('luchtVanaf', resolveSky(s).nightFrom) };
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
        ? { title: 'Laatste export', value: shortDate(localDateOf(f.macroFactor.readAt)) }
        : { title: 'Export inlezen', value: 'Nog niet', dim: true, sub: 'Kracht en gewicht uit MacroFactor' };
    case 'macrofactor-leidend':
      return { checked: f.macroFactor?.leads !== false };
    case 'macrofactor-gewicht':
      return { checked: s.weightFromMacroFactor !== false };
    case 'strava-tekst':
      return { checked: s.stravaText !== false };
    case 'health-connect':
      return { value: 'Komt later', dim: true };

    // Gegevens en back-up
    case 'backup':
      return { value: backupAgoText(age), dim: age.level === 'never' };
    case 'backupmap':
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
      const use = storageUseText(f.storageUse);
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

export function groupSummary(page: SettingsPageId, f: SettingsFacts): { value?: string; sub: string; dim?: boolean; dot?: 'ok' | 'no' } {
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
      const value = treks > 0 ? plural(treks, 'tocht', 'tochten') : f.goal ? 'Geen tochten' : 'Geen doel';
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
        value: f.weight ? `${num(f.weight.kg, 1)} kg` : 'Leeg',
        dim: !f.weight,
        sub: `${hrText}, ${inj}`,
      };
    }
    case 'vandaag': {
      const o = resolveOverviews(s.overviews);
      const aan = [o.morningCheckIn, o.weekReview, o.weeklyQuestion, o.weatherLine, o.weatherSwap, o.bestMoment, o.clothingAdvice, o.completionMoment, s.introSoundEnabled].filter(Boolean).length;
      const place = s.homeLocation;
      const follows = isMyLocation(place) && o.weatherFollowsLocation;
      return { value: `${aan} aan`, sub: follows ? 'Weer volgt je locatie' : place ? `Weer voor ${place.name}` : 'Nog geen plaats voor het weer' };
    }
    case 'koppelingen': {
      const garmin = f.watch?.linked === true;
      const mf = !!f.macroFactor?.readAt;
      if (!garmin && !mf) return { value: 'Geen', dim: true, sub: 'Garmin en MacroFactor nog niet gekoppeld' };
      const parts = [
        garmin ? `Garmin${f.watch?.syncedAt ? ` om ${clock(f.watch.syncedAt)}` : ''}` : null,
        mf && f.macroFactor?.readAt ? `MacroFactor ${shortDate(localDateOf(f.macroFactor.readAt))}` : null,
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

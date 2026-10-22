// ASCEND: wat de rijen en groepen in de instellingen zeggen. Puur: de feiten gaan
// erin, de korte waarde en de regel eronder komen eruit. Eén plek, zodat elke
// samenvatting waar is en het zoekveld, het overzicht en de groepspagina's nooit
// iets anders melden (docs/beslissingen/2026-10-22-instellingen-in-groepen.md).
//
// De regel voor een rij: links de titel, rechts de waarde, daaronder hoogstens één
// regel (`sub`): een feit of een bron, nooit uitleg. Een test bewaakt dat een regel
// niet langer is dan SUB_MAX_LENGTH, zodat niets afkapt op 360 px.

import type { AppSettings } from '../storage/database';
import type { Weekday } from '../models/goalEngineConfig';
import type { WatchUse } from './watchUse';
import { choiceShort } from '../data/settingsChoices';
import type { SettingsPageId } from '../data/settingsLayout';
import { resolveOverviews } from './overviewSettings';
import { isMyLocation } from './weatherLocation';
import { resolveStrengthSettings } from './strengthSettings';
import { DEFAULT_ENABLED_SPORTS, SPORT_LABEL, type Sport } from './sports';
import { readClothingAdjust } from './clothingFeedback';
import { backupAge, backupAgoText } from './settingsAttention';
import { shortGoalName } from './settingsStatus';
import { formatNumberNL } from '../utils/number';

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
  dot?: 'ok' | 'no';
  // Een schakelaar: aan of uit.
  checked?: boolean;
  // De rij hoort er nu niet te staan (geen sterktetrainingen, geen browserondersteuning).
  hidden?: boolean;
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
  // De bron van "Krachttraining bijhouden": dezelfde keuze als het krachtblok.
  strengthExternal: boolean;
  // Wat ASCEND nu doet met je ambitie: terugvallen op Standaard bij pijn.
  ambition: { chosen: 'rustig' | 'standaard' | 'stevig'; effective: 'rustig' | 'standaard' | 'stevig' };
  // Het gewicht in gebruik.
  weight: { kg: number; source: string; date: string } | null;
  // De koppeling met het horloge; null als er (nog) niet gekeken is.
  watch: { linked: boolean; syncedAt?: string; use: WatchUse; autoTick: boolean; leads: boolean; sendEnabled: boolean } | null;
  macroFactor: { readAt?: string; leads: boolean } | null;
  // Opgeslagen duur per krachttraining, geleerd of geschat.
  strengthDurations: { name: string; minutes: number; source: 'learned' | 'estimate' | 'default'; basedOn: number }[];
  // Open taken in de reisplanner en het basisgewicht van de paklijst (kg).
  journeyOpen?: number;
  packKg?: number;
  // Of de browser een vaste map kan onthouden en of die gekozen is.
  folderSupported: boolean;
  folderChosen: boolean;
  storage: 'protected' | 'not_protected' | 'unsupported' | undefined;
  snapshots: number;
  buildLabel: string;
  // Of de keuze voor de lange zondag er staat (niet bij een bergdoel).
  longSundayVisible: boolean;
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

const SPORTS: Sport[] = ['running', 'hiking', 'cycling'];

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
  if (entries.length > 1) return { value: `${entries.length} sporten`, auto: true };
  const [sport, v] = entries[0];
  return { value: `${SPORT_LABEL[sport]} ${num(Math.abs(v), 1)}° ${v > 0 ? 'lichter' : 'zwaarder'}`, auto: true };
}

function listWeights(list: number[]): string {
  return list.length <= 3 ? `${listNL(list.map((n) => num(n)))} kg` : `${list.length} stangen`;
}

// ---- de rijen ------------------------------------------------------------------

export function rowSummary(rowId: string, f: SettingsFacts): RowSummary {
  const s = f.settings;
  const o = resolveOverviews(s.overviews);
  const forge = resolveStrengthSettings(s.strengthModel);
  const place = s.homeLocation;
  const follows = isMyLocation(place) && o.weatherFollowsLocation;
  const age = backupAge(s.lastExportedAt, f.today);
  const watchOn = f.watch?.linked === true;

  switch (rowId) {
    // Planning
    case 'trainingstijd': {
      const n = trainingDays(f);
      return n > 0 ? { value: `${n} dagen` } : { value: 'Niet ingesteld', dim: true };
    }
    case 'rustdag':
      return { value: WEEKDAYS[restDayIndex(f)] };
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
      return { value: 'Weekschema', auto: true };
    }
    case 'wijzigingen':
      return { value: choiceShort('wijzigingen', s.changeApplyMode ?? 'auto_small') };
    case 'ambitie': {
      const label = choiceShort('ambitie', f.ambition.effective);
      return { value: f.ambition.chosen !== f.ambition.effective ? `${label}, tijdelijk` : label };
    }
    case 'zware-dingen':
      return { checked: !!s.hardSameDay, sub: 'Op één dag, eerst de loop', hidden: f.pairing === 'never' };

    // Doel en tochten
    case 'doelen':
      return f.goal ? { value: `${shortGoalName(f.goal.name)}, ${shortDate(f.goal.date)}` } : { value: 'Geen doel', dim: true };
    case 'programma':
      return f.position
        ? { value: `Week ${f.position.weekInProgram} van ${f.position.totalWeeks}`, sub: f.goal ? `${capitalize(lower(f.position.phaseName))}, teruggerekend vanaf je doel` : capitalize(lower(f.position.phaseName)) }
        : { value: 'Buiten het programma', dim: true };
    case 'lange-zondag':
      return { value: choiceShort('langeZondag', s.longSundaySession ?? 'hike'), hidden: !f.longSundayVisible };
    case 'volgende-tocht':
      return { checked: s.showNextTrek !== false };
    case 'rust-na-tocht':
      return { value: choiceShort('rustNaTocht', s.trekLegRest ?? 'soft') };
    case 'vrije-dagen':
      return f.vacations > 0 ? { value: `${f.vacations} gepland` } : { value: 'Geen', dim: true };
    case 'reisplanner':
      return f.journeyOpen === undefined ? {} : f.journeyOpen > 0 ? { value: `${f.journeyOpen} open` } : { value: 'Alles af', dim: true };
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
      return d ? { value: d.value, auto: d.auto } : { hidden: true };
    }
    case 'forge-volgorde':
      return { value: choiceShort('volgorde', forge.progression), hidden: !forge.enabled };
    case 'forge-sets':
      return { value: choiceShort('werksets', forge.workSets), hidden: !forge.enabled };
    case 'forge-opwarmen':
      return { value: choiceShort('opwarmen', forge.warmup), hidden: !forge.enabled };
    case 'forge-bereik':
      return { checked: forge.widenRange, sub: 'Bij toestellen met grote stappen', hidden: !forge.enabled };
    case 'forge-schatting':
      return { value: choiceShort('schatting', forge.estimateUpTo), hidden: !forge.enabled };
    case 'stangen':
      return { value: listWeights(forge.profile.barsKg) };
    case 'schijven':
      return { value: `${num(Math.min(...forge.profile.platesKg))} tot ${kg(Math.max(...forge.profile.platesKg))}` };
    case 'dumbbells':
      return { value: `${num(forge.profile.dumbbells.startKg)} tot ${kg(forge.profile.dumbbells.maxKg)}` };
    case 'kabels':
      return { value: `Per ${kg(forge.profile.stackStepKg)}` };

    // Lichaam
    case 'lichaamsgewicht':
      return f.weight
        ? { value: `${num(f.weight.kg, 1)} kg`, auto: f.weight.source === 'macrofactor', sub: weightWords(f.weight) }
        : { value: 'Niet ingevuld', dim: true };
    case 'hartslag': {
      const hr = s.heartRate ?? {};
      if (hr.lthr) return { value: `Drempel ${hr.lthr}`, sub: 'Zones in bpm, zoals op je horloge' };
      if (hr.maxHr) return { value: `Max ${hr.maxHr}`, sub: 'Zones in bpm, zoals op je horloge' };
      return { value: 'Niet ingevuld', dim: true, sub: 'Zonder hartslag alleen zonenummers' };
    }
    case 'blessures':
      return f.activeInjuries > 0 ? { value: `${f.activeInjuries} actief` } : { value: 'Geen', dim: true };

    // Vandaag en meldingen
    case 'ochtendcheck':
      return { checked: o.morningCheckIn };
    case 'weekterugblik':
      return { checked: o.weekReview };
    case 'weekterugblik-dag':
      return { value: choiceShort('terugblikDag', o.weekReviewDay), hidden: !o.weekReview };
    case 'weekvraag':
      return { checked: o.weeklyQuestion };
    case 'weerplaats':
      if (follows) return { value: 'Volgt je locatie', auto: true };
      return place ? { value: place.name } : { value: 'Niet gekozen', dim: true };
    case 'weerregel':
      return { checked: o.weatherLine };
    case 'weerruil':
      return { checked: o.weatherSwap };
    case 'kledingadvies':
      return { checked: o.clothingAdvice };
    case 'kleding-voorkeur': {
      const c = clothingValue(f);
      return { value: c.value, auto: c.auto, dim: !c.auto, hidden: !o.clothingAdvice };
    }
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
      return { checked: f.watch?.use.activities !== false, hidden: !watchOn };
    case 'vanzelf-afvinken':
      return { checked: f.watch?.autoTick !== false && f.watch?.use.activities !== false, hidden: !watchOn, ...(f.watch?.use.activities === false ? { sub: 'Werkt alleen als Trainingen aan staat' } : {}) };
    case 'garmin-leidend':
      return { checked: f.watch?.leads !== false && f.watch?.use.activities !== false, hidden: !watchOn, ...(f.watch?.use.activities === false ? { sub: 'Werkt alleen als Trainingen aan staat' } : {}) };
    case 'slaap':
      return { checked: f.watch?.use.sleep !== false, hidden: !watchOn };
    case 'rusthartslag':
      return { checked: f.watch?.use.restingHeartRate !== false, hidden: !watchOn };
    case 'hrv':
      return { checked: f.watch?.use.hrv !== false, hidden: !watchOn };
    case 'naar-horloge':
      return { checked: !!f.watch?.sendEnabled, hidden: !watchOn };
    case 'macrofactor':
      return f.macroFactor?.readAt
        ? { title: 'Laatste export', value: shortDate(f.macroFactor.readAt.slice(0, 10)) }
        : { title: 'Export inlezen', value: 'Nog niet', dim: true, sub: 'Kracht en gewicht uit MacroFactor' };
    case 'macrofactor-leidend':
      return { checked: f.macroFactor?.leads !== false, hidden: !f.macroFactor?.readAt };
    case 'macrofactor-gewicht':
      return { checked: s.weightFromMacroFactor !== false, hidden: !f.macroFactor?.readAt };
    case 'health-connect':
      return { value: 'Komt later', dim: true };

    // Gegevens en back-up
    case 'backup':
      return { value: backupAgoText(age), dim: age.level === 'never' };
    case 'backupmap':
      return f.folderSupported ? { value: f.folderChosen ? 'Gekozen' : 'Niet gekozen', dim: !f.folderChosen } : { hidden: true };
    case 'opslag':
      if (f.storage === 'protected') return { value: 'Ja' };
      if (f.storage === 'not_protected') return { value: 'Nee', dim: true };
      return f.storage === 'unsupported' ? { value: 'Niet mogelijk', dim: true } : {};
    case 'momentopnamen':
      return { value: String(f.snapshots), dim: f.snapshots === 0 };
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
      return { value: `Rust ${WEEKDAYS_SHORT[restDayIndex(f)]}, ${n} dagen`, sub };
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
      const aan = [o.morningCheckIn, o.weekReview, o.weeklyQuestion, o.weatherLine, o.weatherSwap, o.clothingAdvice, o.completionMoment, s.introSoundEnabled].filter(Boolean).length;
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
        mf && f.macroFactor?.readAt ? `MacroFactor ${shortDate(f.macroFactor.readAt.slice(0, 10))}` : null,
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
      return { sub: 'Kennisbank, gidsen en bronnen' };
  }
}

// De waarde zoals het zoekresultaat die toont: Aan of Uit bij een schakelaar.
export function searchValue(rowId: string, f: SettingsFacts): { text: string; dim: boolean } {
  const r = rowSummary(rowId, f);
  if (r.checked !== undefined) return { text: r.checked ? 'Aan' : 'Uit', dim: !r.checked };
  return { text: r.value ?? '', dim: !!r.dim };
}


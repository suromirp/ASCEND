// ASCEND: wat er op de Briefing staat, het scherm vooraf voor een training buiten te voet
// (docs/beslissingen/2026-11-11-briefing.md, docs/visie/Ontwerp Route en trainingsscherm.md, spoor 4;
// eigen keuzes in docs/beslissingen/2026-11-11-briefing-sporen-1-3-4.md).
//
// Het scherm zelf (spoor 5) tekent alleen wat dit teruggeeft: de stand (je horloge vinkt af, of zelf
// invullen), waar je traint, wat er op de plek van de kaart staat, vier vakken met elk één korte regel,
// en de knop in de onderbalk. Het leest de bestaande regels en rekent er niets van na:
// - de stand: Vanzelf afvinken (engine/autoTick.ts#mayAutoTick, de schakelaar, de koppeling) en een
//   stille koppeling (engine/sourceWatch.ts#sourceSilence);
// - de route: engine/trainingPlace.ts#placeHasRoute en engine/routeTarget.ts#routeTarget;
// - het horloge: engine/watchSheet.ts (of er een blad is) en de stand uit engine/watchStatus.ts;
// - weer en kleding: engine/weather.ts#weatherForTraining en engine/clothing.ts#clothingForTraining;
// - eten en drinken: engine/eveningBefore.ts#drinkAmount en engine/fuelOnTheGo.ts#fuelForTraining;
//   hier staat geen eigen rekenregel.
//
// Puur: geen React, geen IndexedDB, geen netwerk. Het zoekt geen lus (dat doet het scherm, en alleen
// als `map.search` dat zegt) en het plant niets.

import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import type { Program } from '../models/program';
import type { WeatherForecast } from '../models/weather';
import type { SweatEntry } from '../models/sweat';
import type { RouteTarget } from '../models/route';
import type { PaceRange } from './racePaces';
import type { WatchStatus } from './watchStatus';
import { formatClockTime } from './watchStatus';
import { watchSheet, type WatchSheetInput } from './watchSheet';
import { mayAutoTick } from './autoTick';
import { sourceSilence, type SourceWatchInput } from './sourceWatch';
import { routeTarget, targetText } from './routeTarget';
import { placeChoices, placeHasRoute, resolvePlace, routeShownFor, type PlaceChoice } from './trainingPlace';
import { weatherForTraining } from './weather';
import { clothingForTraining } from './clothing';
import { drinkAmount } from './eveningBefore';
import { litersText } from './stageWater';
import { fuelForTraining, fuelShortText } from './fuelOnTheGo';
import { deriveSessionStatus } from './sessionStatus';
import { resolveEffectiveFullDuration } from './substitutions';
import { buildWorkoutPlan } from './workoutPlan';
import { durationLabel } from './sessionBrief';
import { progressionTarget } from './programLayout';
import { templateSport } from './sports';
import { RACE_TEMPLATE_ID } from './raceBlock';
import { resolveRouteSearch } from './routeSearchSetting';
import { getModality, modalitySport } from '../data/modalities';
import { INTENSITY, type Intensity } from '../data/workoutStructure';
import { addDays, toISODate } from '../utils/dates';
import { kgLabel } from '../utils/kg';

export const BRIEFING_TEXT = {
  title: 'Briefing',
  // De vier vakken.
  run: 'Wat je loopt',
  watch: 'Horloge',
  weather: 'Weer en kleding',
  fuel: 'Eten en drinken',
  // De horlogestand, kort: een vak is ongeveer 171 px breed.
  watchSent: 'Staat erop',
  watchStale: 'Wijziging nog niet erop',
  watchPending: 'Nog niet erop',
  watchLater: 'Gaat later erop',
  watchFailed: 'Versturen lukte niet',
  watchManual: 'Zelf nabouwen',
  watchFields: 'Datavelden',
  noWeather: 'Nog geen weer',
  // "1,5 liter en 2 tot 4 gels mee"; zonder weer is de hoeveelheid drinken onbekend.
  drink: 'drinken',
  fuelSuffix: 'mee',
  // De stand onderaan.
  watchTicks: 'Je horloge vinkt deze training af.',
  // Op Vandaag onder de knop Briefing (spoor 6): waarom er geen Gedaan staat.
  missionTicks: 'Je horloge vinkt hem af na je loop.',
  manual: 'Zelf invullen',
  testRun: 'Een testloop vul je zelf in.',
  race: 'Een wedstrijd vul je zelf in.',
  done: 'Deze training is al gedaan.',
  // De knop in de onderbalk.
  sendRoute: 'Route naar Garmin Connect',
  close: 'Sluiten',
} as const;

// Waarom je zelf invult: geen koppeling (of nog niet gelezen), Vanzelf afvinken uit, geen trainingen
// van je horloge, een stille koppeling, of een testloop of wedstrijd.
export type ManualReason = 'unlinked' | 'unknown' | 'autoTickOff' | 'noActivities' | 'silent' | 'testOrRace';

export type BriefingStand =
  | { kind: 'watch'; line: string; manualLabel: string }
  | { kind: 'manual'; reason: ManualReason; line?: string }
  | { kind: 'done'; line: string };

export type BriefingMap =
  // Buiten met een route: de kaart. `search` zegt of het scherm bij het openen zoekt (vandaag en
  // morgen, besluit 11 november) of pas na een tik.
  | { kind: 'route'; target: RouteTarget; line: string; search: 'open' | 'tap' }
  // Loopband of binnen: geen kaart en geen netwerk, wel wat je instelt.
  | { kind: 'place'; title: string; how: string }
  // Buiten zonder lus van de planner (wandelen, rugzak): de plekken in de buurt.
  | { kind: 'nearby' }
  // Route voorstellen uit, of de training is al gedaan: niets op die plek.
  | { kind: 'none' };

export type BriefingTileId = 'run' | 'watch' | 'weather' | 'fuel';

export interface BriefingTile {
  id: BriefingTileId;
  eyebrow: string;
  // Eén korte regel; de lange vorm staat in het blad of de pagina erachter.
  line: string;
  // Iets om op te letten (versturen mislukt, weer let op of slecht): amber, nooit een tweede mint.
  tone?: 'warn';
}

export type BriefingFooter = { kind: 'route' | 'manual' | 'close'; label: string };

// Instelling Lus zoeken (spoor 5): engine/routeSearchSetting.ts.
export { resolveRouteSearch, type RouteSearchSetting } from './routeSearchSetting';

// De kaart verschijnt of verdwijnt als je van plek wisselt. In Vol een overgang van 200 ms, in Rustig en
// Uit (en bij prefers-reduced-motion, dat de app als Uit leest) direct op de eindstand.
export const placeTransition = (motion: 'full' | 'calm' | 'off'): string | undefined =>
  motion === 'full' ? 'ascend-fade-in 200ms ease-out both' : undefined;

export interface BriefingView {
  stand: BriefingStand;
  // De keuzes Waar train je?; leeg of één keuze: geen rij, en dan geldt die ene of Buiten.
  places: PlaceChoice[];
  place: string | undefined;
  map: BriefingMap;
  tiles: BriefingTile[];
  footer: BriefingFooter;
}

export interface BriefingInput {
  template: SessionTemplate;
  // De geplande training; zonder (een losse training) is er geen horlogestand en geen bewaarde keuze.
  session?: PlannedSession;
  date: string;
  now: Date;
  program?: Program | null;
  logs: SessionLog[];
  // De bewaarde keuze Waar train je? (storage/trainingPlace.ts), ongelezen; afwezig op een toestel
  // zonder bewaarde keuze of na een oude back-up: dan de standaard.
  storedPlace?: unknown;
  // Instelling Route voorstellen, en het rustige tempo uit je test voor de afstand.
  routeOn: boolean;
  // Instelling Lus zoeken (ongelezen); afwezig is het advies, zoeken bij het openen.
  routeSearch?: unknown;
  easyPace?: PaceRange;
  // De koppeling: afwezig zolang hij gelezen wordt. Dan de veilige kant: zelf invullen.
  watchLink?: { linked: boolean; autoTick: boolean; activities: boolean };
  // Wat de bronbewaking nodig heeft; afwezig is geen stilte.
  watchSource?: SourceWatchInput;
  // Het blad Je horloge (zonder training en stand, die vult dit zelf in) en de stand van de training.
  watch: Omit<WatchSheetInput, 'template' | 'status' | 'statusText' | 'garmin'>;
  watchStatus?: WatchStatus;
  // Het weer; afwezig zonder netwerk of plaats.
  forecast?: WeatherForecast;
  weatherOn: boolean;
  clothingOn: boolean;
  clothingAdjust?: number;
  sweatEntries?: SweatEntry[];
  // Instelling Eten onderweg (engine/fuelOnTheGo.ts#fuelOn).
  fuelOn: boolean;
}

// De Briefing is er voor een training buiten te voet: hardlopen of wandelen, geen kracht en geen rust.
export function hasBriefing(template: SessionTemplate | undefined): boolean {
  if (!template || template.type === 'strength' || template.type === 'recovery') return false;
  const sport = templateSport(template);
  return sport === 'running' || sport === 'hiking';
}

// De ingang (spoor 5 en 6): Week en Vandaag openen de Briefing voor een training waar een route bij
// hoort op zijn standaardplek (engine/trainingPlace.ts#routeShownFor zonder bewaarde keuze). Een keuze
// Loopband voor die ene training haalt de ingang niet weg: die keuze maak je in de Briefing zelf, en
// daar verdwijnt dan de kaart. Wandelen en rugzak krijgen de ingang met de routes voor wandelen
// (spoor 11); tot dan houden ze het oude scherm.
export function briefingEntry(template: SessionTemplate | undefined): boolean {
  return hasBriefing(template) && routeShownFor(template, undefined);
}

// De mint knop op Vandaag (spoor 6): Briefing als je horloge deze training afvinkt, anders Gedaan.
// Eén regel met de stand van de Briefing; zolang de koppeling gelezen wordt (geen `watchLink`) of bij
// twijfel: Gedaan, de veilige kant. Een training die al gedaan is: ook Gedaan (de kaart is dan weg).
export type MissionButton = 'briefing' | 'done';

export function missionButton(input: Pick<BriefingInput, 'template' | 'session' | 'logs' | 'watchLink' | 'watchSource'>): MissionButton {
  if (!briefingEntry(input.template)) return 'done';
  if (input.session && deriveSessionStatus(input.session, input.logs).status === 'completed') return 'done';
  return standOf(input).kind === 'watch' ? 'briefing' : 'done';
}

export function briefing(input: BriefingInput): BriefingView | undefined {
  const { template } = input;
  if (!hasBriefing(template)) return undefined;
  const today = toISODate(input.now);
  const places = placeChoices(template.id);
  const place = resolvePlace(template, input.storedPlace);
  const modality = place ? getModality(template.id, place) : undefined;
  const outdoor = !modality || modality.environment === 'outdoor';
  const done = !!input.session && deriveSessionStatus(input.session, input.logs).status === 'completed';
  const minutes = input.session?.plannedMinutes ?? resolveEffectiveFullDuration(template, input.date, input.program);

  const stand = done ? ({ kind: 'done', line: BRIEFING_TEXT.done } as const) : standOf(input);
  const map = done ? ({ kind: 'none' } as const) : mapOf(input, place, modality, outdoor, today);

  const tiles: BriefingTile[] = [runTile(input, minutes)];
  const watch = watchTile(input);
  if (watch) tiles.push(watch);
  if (outdoor) {
    const weather = weatherTile(input, minutes);
    if (weather) tiles.push(weather);
  }
  const fuel = fuelTile(input, minutes, outdoor);
  if (fuel) tiles.push(fuel);

  // Zelf invullen kan pas op de dag zelf (of later); vooraf is de knop Sluiten.
  const due = input.date <= today;
  const footer: BriefingFooter =
    stand.kind === 'manual' && due
      ? { kind: 'manual', label: BRIEFING_TEXT.manual }
      : stand.kind === 'watch' && map.kind === 'route'
        ? { kind: 'route', label: BRIEFING_TEXT.sendRoute }
        : { kind: 'close', label: BRIEFING_TEXT.close };

  return { stand, places, place, map, tiles, footer };
}

// ---- de stand --------------------------------------------------------------------------------

function standOf(input: Pick<BriefingInput, 'template' | 'session' | 'watchLink' | 'watchSource'>): BriefingStand {
  const { template } = input;
  if (!mayAutoTick(template.id) || (input.session && !mayAutoTick(input.session.templateId))) {
    return { kind: 'manual', reason: 'testOrRace', line: template.id === RACE_TEMPLATE_ID ? BRIEFING_TEXT.race : BRIEFING_TEXT.testRun };
  }
  const link = input.watchLink;
  if (!link) return { kind: 'manual', reason: 'unknown' };
  if (!link.linked) return { kind: 'manual', reason: 'unlinked' };
  if (!link.autoTick) return { kind: 'manual', reason: 'autoTickOff' };
  if (!link.activities) return { kind: 'manual', reason: 'noActivities' };
  const silence = input.watchSource ? sourceSilence(input.watchSource) : undefined;
  // Alleen een stilte van trainingen telt: zonder ochtendgetallen vinkt het horloge nog gewoon af.
  if (silence && silence.kind !== 'mornings') return { kind: 'manual', reason: 'silent', line: silence.text };
  return { kind: 'watch', line: BRIEFING_TEXT.watchTicks, manualLabel: BRIEFING_TEXT.manual };
}

// ---- de plek van de kaart --------------------------------------------------------------------

function mapOf(
  input: BriefingInput,
  place: string | undefined,
  modality: ReturnType<typeof getModality>,
  outdoor: boolean,
  today: string,
): BriefingMap {
  if (!outdoor && modality) return { kind: 'place', title: modality.label, how: modality.how };
  if (!input.routeOn) return { kind: 'none' };
  if (placeHasRoute(input.template, place)) {
    const target = routeTarget({ template: input.template, date: input.date, program: input.program, logs: input.logs, testPace: input.easyPace });
    const soon = input.date === today || input.date === addDays(today, 1);
    const onOpen = soon && resolveRouteSearch(input.routeSearch) === 'open';
    return { kind: 'route', target, line: targetText(target), search: onOpen ? 'open' : 'tap' };
  }
  // Wandelen of rugzak buiten: nog geen lus van de planner, wel plekken in de buurt. Fietsen: niets.
  const sport = (place ? modalitySport(place) : undefined) ?? templateSport(input.template);
  return sport === 'hiking' ? { kind: 'nearby' } : { kind: 'none' };
}

// ---- de vier vakken --------------------------------------------------------------------------

function runTile(input: BriefingInput, minutes: number): BriefingTile {
  const parts = [durationLabel(minutes)];
  const plan = buildWorkoutPlan(input.template, input.date, input.program);
  const levels = (plan?.timeline ?? []).filter((s) => s.kind !== 'strength').map((s) => s.intensity as Intensity);
  if (levels.length > 0) {
    const peak = Math.max(...levels) as Intensity;
    const even = levels.every((l) => l === peak);
    parts.push(even ? INTENSITY[peak].zone : `tot ${INTENSITY[peak].zone}`);
  }
  const kg = progressionTarget(input.template, input.program, input.date)?.step.backpackKg ?? input.template.outdoorTarget?.backpackWeightKg;
  if (kg && kg > 0) parts.push(`rugzak ${kgLabel(kg, 1)}`);
  return { id: 'run', eyebrow: BRIEFING_TEXT.run, line: parts.join(', ') };
}

function watchTile(input: BriefingInput): BriefingTile | undefined {
  const plan = buildWorkoutPlan(input.template, input.date, input.program);
  const status = input.watchStatus;
  const sheet = watchSheet({ ...input.watch, template: input.template, garmin: plan?.garmin, status: status?.kind });
  if (!sheet.hasWatchSheet) return undefined;
  const today = toISODate(input.now);
  const shown = input.watch.showStatus ? status?.kind : undefined;
  switch (shown) {
    case 'sent': {
      const at = status?.sentAt ? new Date(status.sentAt) : undefined;
      const sameDay = at && !Number.isNaN(at.getTime()) && toISODate(at) === today;
      return { id: 'watch', eyebrow: BRIEFING_TEXT.watch, line: sameDay ? `${BRIEFING_TEXT.watchSent}, ${formatClockTime(at!)}` : BRIEFING_TEXT.watchSent };
    }
    case 'stale':
      return { id: 'watch', eyebrow: BRIEFING_TEXT.watch, line: BRIEFING_TEXT.watchStale };
    case 'pending':
      return { id: 'watch', eyebrow: BRIEFING_TEXT.watch, line: BRIEFING_TEXT.watchPending };
    case 'later':
      return { id: 'watch', eyebrow: BRIEFING_TEXT.watch, line: BRIEFING_TEXT.watchLater };
    case 'failed':
      return { id: 'watch', eyebrow: BRIEFING_TEXT.watch, line: BRIEFING_TEXT.watchFailed, tone: 'warn' };
    default:
      // Niet gekoppeld, geen stand of de stand verborgen: wat het blad je dan biedt.
      return { id: 'watch', eyebrow: BRIEFING_TEXT.watch, line: plan?.garmin ? BRIEFING_TEXT.watchManual : BRIEFING_TEXT.watchFields };
  }
}

function weatherTile(input: BriefingInput, minutes: number): BriefingTile | undefined {
  if (!input.weatherOn && !input.clothingOn) return undefined;
  const base = { forecast: input.forecast, template: input.template, logs: input.logs, date: input.date, durationMinutes: minutes, now: input.now };
  const w = weatherForTraining(base);
  if (!w) return { id: 'weather', eyebrow: BRIEFING_TEXT.weather, line: BRIEFING_TEXT.noWeather };
  const parts: string[] = [];
  if (input.weatherOn) parts.push(`${Math.round(w.tempC)} ${Math.abs(Math.round(w.tempC)) === 1 ? 'graad' : 'graden'}`);
  if (input.clothingOn) {
    const first = clothingForTraining({ ...base, adjustC: input.clothingAdjust })?.lines[0];
    // Alleen de eerste zin: een vak is smal; de rest staat op de weerpagina erachter.
    if (first) parts.push(lowerFirst(firstSentence(first)));
  }
  if (parts.length === 0) return undefined;
  const tone = input.weatherOn && w.verdict !== 'prima' ? ('warn' as const) : undefined;
  return { id: 'weather', eyebrow: BRIEFING_TEXT.weather, line: parts.join(', '), ...(tone ? { tone } : {}) };
}

function fuelTile(input: BriefingInput, minutes: number, outdoor: boolean): BriefingTile | undefined {
  // Drinken uit je zweettempo hoort bij buiten: binnen klopt het weer van de start niet.
  const drink = outdoor
    ? drinkAmount({ template: input.template, minutes, forecast: input.forecast, logs: input.logs, date: input.date, now: input.now, sweatEntries: input.sweatEntries })
    : undefined;
  // Eten onderweg (engine/fuelOnTheGo.ts) hangt niet aan het weer: ook op de loopband.
  const fuel = input.fuelOn ? fuelForTraining(input.template, minutes) : undefined;
  if (!drink && !fuel) return undefined;
  const parts: string[] = [];
  if (drink) parts.push(drink.liters === undefined ? BRIEFING_TEXT.drink : litersText(drink.liters));
  if (fuel) parts.push(fuelShortText(fuel));
  return { id: 'fuel', eyebrow: BRIEFING_TEXT.fuel, line: upperFirst(`${parts.join(' en ')} ${BRIEFING_TEXT.fuelSuffix}`) };
}

function upperFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function firstSentence(s: string): string {
  const end = s.search(/\.(\s|$)/);
  return end < 0 ? s : s.slice(0, end);
}

function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

// ASCEND: wat er op de Briefing staat, het scherm vooraf voor een training buiten te voet
// (docs/beslissingen/2026-11-11-briefing.md, docs/visie/Ontwerp Route en trainingsscherm.md, spoor 4;
// eigen keuzes in docs/beslissingen/2026-11-11-briefing-sporen-1-3-4.md).
//
// Het scherm zelf tekent alleen wat dit teruggeeft (sporen 1 tot 4 van docs/visie/Ontwerp trainingsscherm
// minimaal.md): de kop, de hartkaart (kerngetallen en zonebalk of profiel), de stand (je horloge vinkt af,
// of zelf invullen), waar je traint met de regel bij een andere keuze, wat er op de plek van de kaart
// staat, één lijst zonder kopje met elk één korte regel, de stopregels, en de ene knop in de onderbalk
// (of geen). Het leest de bestaande regels en rekent er niets van na:
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
import type { PaceRange, RacePaces } from './racePaces';
import { paceRangeText, trainingPace } from './missionFacts';
import { watchSportOf, type WatchSport } from './watchWorkout';
import type { WatchStatus } from './watchStatus';
import { formatClockTime } from './watchStatus';
import { watchSheet, type WatchSheetInput } from './watchSheet';
import { mayAutoTick } from './autoTick';
import { sourceSilence, type SourceWatchInput } from './sourceWatch';
import { routeTarget } from './routeTarget';
import { placeChoices, placeHasRoute, resolvePlace, type PlaceChoice } from './trainingPlace';
import { weatherForTraining } from './weather';
import { PLACE_WEATHER_FROM_HOME, placeWeatherFailed, placeWeatherLine } from './placeWeather';
import { clothingForTraining } from './clothing';
import { drinkAmount } from './eveningBefore';
import { litersText } from './stageWater';
import { fuelForTraining, fuelShortText } from './fuelOnTheGo';
import { deriveSessionStatus } from './sessionStatus';
import { buildSessionBrief, durationLabel, placePlan, type BriefFact, type SessionBrief } from './sessionBrief';
import type { WorkoutPlan } from './workoutPlan';
import { resolveEffectiveFullDuration } from './substitutions';
import { buildWorkoutPlan } from './workoutPlan';
import { templateSport, type Sport } from './sports';
import { RACE_TEMPLATE_ID } from './raceBlock';
import { resolveRouteSearch } from './routeSearchSetting';
import { getModality, modalitySport } from '../data/modalities';
import { placeBrief } from '../data/placeBrief';
import type { Intensity } from '../data/workoutStructure';
import { addDays, formatDateNL, toISODate, weekdayShortNL } from '../utils/dates';

export const BRIEFING_TEXT = {
  title: 'Briefing',
  // Wat je loopt: de regel onder de rij Briefing in Week als er verder niets in staat, en de naam van de
  // hartkaart voor een schermlezer.
  run: 'Wat je loopt',
  doing: 'Wat je doet',
  // De vaste woorden van de lijst (spoor 3 van docs/visie/Ontwerp trainingsscherm minimaal.md).
  watch: 'Horloge',
  weather: 'Weer',
  fuel: 'Mee',
  stretch: 'Voor en na',
  // Het blad achter de rij Mee.
  fuelSheet: 'Eten en drinken',
  // Het blad achter de rij Voor en na.
  warmup: 'Opwarmen',
  cooldown: 'Rekken',
  // De horlogestand, kort.
  watchSent: 'Staat erop',
  watchStale: 'Wijziging nog niet erop',
  watchPending: 'Nog niet erop',
  watchLater: 'Gaat later erop',
  watchFailed: 'Versturen lukte niet',
  watchManual: 'Workout zelf instellen',
  watchFields: 'Datavelden',
  noWeather: 'Nog geen weer',
  // "1,5 liter en 2 tot 4 gels"; zonder weer is de hoeveelheid drinken onbekend.
  drink: 'drinken',
  // In de rij Horloge: wie afvinkt (de losse regel onder het scherm is weg, spoor 3).
  watchTicks: 'Vinkt zelf af',
  // Op Vandaag onder de knop Briefing (spoor 6): waarom er geen Gedaan staat.
  missionTicks: 'Je horloge vinkt hem af na je loop.',
  manual: 'Zelf invullen',
  testRun: 'Een testloop vul je zelf in.',
  race: 'Een wedstrijd vul je zelf in.',
  done: 'Deze training is al gedaan.',
  // De knop in de onderbalk: één knop, of geen onderbalk (de terugknop sluit).
  sendRoute: 'Route naar Garmin Connect',
  doneButton: 'Gedaan',
  // De stopregels, zonder kaart (spoor 4).
  stop: 'Stop of schakel terug als',
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
  // Loopband of binnen: geen kaart en geen netwerk; wat je instelt staat in de regel onder de chips.
  | { kind: 'place' }
  // Buiten zonder lus van de planner (wandelen, rugzak): de plekken in de buurt.
  | { kind: 'nearby' }
  // Route voorstellen uit, of de training is al gedaan: niets op die plek.
  | { kind: 'none' };

// De lijst zonder kopje (spoor 3): links het vaste woord, rechts de waarde, en een pijltje als de rij
// een blad of pagina opent. Wat je loopt staat in de hartkaart, niet in de lijst.
export type BriefingRowId = 'watch' | 'weather' | 'fuel' | 'stretch';

export interface BriefingRow {
  id: BriefingRowId;
  label: string;
  // Eén korte regel; de lange vorm staat in het blad of de pagina erachter.
  line: string;
  // Iets om op te letten (versturen mislukt, weer let op of slecht): een amber stip, nooit een tweede mint.
  tone?: 'warn';
  // Opent de rij iets? De rij Horloge zonder blad Je horloge opent niets.
  opens: boolean;
}

// De kop (spoor 2): het kopje, één zin uitleg en de regel met de dag en de week, zoals op het oude scherm.
export interface BriefingHead {
  eyebrow: string;
  purpose: string;
  dayLine: string;
}

// De hartkaart (spoor 2): de kerngetallen, en daaronder de zonebalk (één doorlopend blok) of het
// profiel van de stappen. Zone en praattest staan alleen hier, in de zin onder de balk.
export interface BriefingHeart {
  // De naam van de hartkaart voor een schermlezer: Wat je loopt bij hardlopen, Wat je doet bij wandelen of traplopen.
  // Afwezig: Wat je loopt.
  label?: string;
  facts: BriefFact[];
  zone?: Intensity;
  steps: boolean;
  // De wandeldag voor een bergtocht: wat morgen vraagt.
  tomorrow?: string;
  // De zin over het tempo: uit welke testloop, en de afstand die duur en tempo samen geven. Het tempo zelf staat
  // als kerngetal in `facts` ("6:45 tot 7:40" per km). Zonder testloop alleen de afstandszin, of niets.
  paceNote?: string;
  // De stappen zoals de gekozen manier ze noemt (profiel en Zo doe je het); het horloge leest het plan zelf.
  plan?: WorkoutPlan;
}

// De onderbalk heeft één knop, of is er niet (dan sluit de terugknop). `fallback`: wat de knop is
// zolang er (nog) geen lus is, bij een knop Route.
export type BriefingFooter =
  | { kind: 'route'; label: string; fallback: { kind: 'manual'; label: string } | { kind: 'none' } }
  | { kind: 'manual'; label: string }
  | { kind: 'none' };

// Welke knop er nu onderaan staat: de route zodra de lus er is, anders wat de engine als terugval
// noemt (Gedaan of geen onderbalk). Gedaan alleen als het scherm een weg naar het invullen heeft.
export function footerNow(footer: BriefingFooter, routeReady: boolean, canFill: boolean): 'route' | 'manual' | 'none' {
  const kind = footer.kind === 'route' ? (routeReady ? 'route' : footer.fallback.kind) : footer.kind;
  return kind === 'manual' && !canFill ? 'none' : kind;
}

// Instelling Lus zoeken (spoor 5): engine/routeSearchSetting.ts.
export { resolveRouteSearch, type RouteSearchSetting } from './routeSearchSetting';

// De kaart verschijnt of verdwijnt als je van plek wisselt. In Vol een overgang van 200 ms, in Rustig en
// Uit (en bij prefers-reduced-motion, dat de app als Uit leest) direct op de eindstand.
export const placeTransition = (motion: 'full' | 'calm' | 'off'): string | undefined =>
  motion === 'full' ? 'ascend-fade-in 200ms ease-out both' : undefined;

export interface BriefingView {
  head: BriefingHead;
  heart: BriefingHeart;
  stand: BriefingStand;
  // De keuzes Waar train je?; leeg of één keuze: geen rij, en dan geldt die ene of Buiten.
  places: PlaceChoice[];
  place: string | undefined;
  // De regel onder de chips (spoor 4): alleen bij een andere keuze dan de standaard, met het oordeel
  // en wat je anders doet. Bij de standaard geen regel.
  placeLine?: string;
  map: BriefingMap;
  rows: BriefingRow[];
  // De stopregels, volledig en zonder kaart; leeg: geen blok.
  stopSignals: string[];
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
  // De tempo's uit je testloop (engine/testJudgment.ts#pacesFromLogs) en het echte tempo van je laatste rustige
  // lopen (engine/recentRunPace.ts), voor het tempo in de hartkaart. Afwezig: geen tempo.
  paces?: RacePaces;
  recentPace?: { range: PaceRange; runs: number };
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
  // De gekozen plek ligt ver van huis (engine/placeWeather.ts): 'shown' als `forecast` het weer van die
  // plek is, 'failed' als hij niet geladen kon worden en `forecast` het weer van huis bleef.
  weatherPlace?: { name: string; state: 'shown' | 'failed' };
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

// De ingang: elke training te voet opent de Briefing, ook wandelen, rugzak en een training die op de
// loopband begint (spoor 1 van docs/visie/Ontwerp trainingsscherm minimaal.md). Eerder kreeg alleen
// een training met een route op zijn standaardplek de ingang, en de rest het oude scherm.
export function briefingEntry(template: SessionTemplate | undefined): boolean {
  return hasBriefing(template);
}

// Een keuze in het blad van een training die naar het oude scherm Hoe je het doet ging (lezen vooraf,
// of op een dag die voorbij is), wordt de Briefing voor een training te voet. De keuzes zelf en hun
// volgorde komen uit engine/sessionActions.ts en veranderen niet.
export function entryAction<A extends string>(action: A, template: SessionTemplate | undefined): A | 'briefing' {
  return briefingEntry(template) && (action === 'start' || action === 'preview') ? 'briefing' : action;
}

// Vandaag al doen (niet kracht in MacroFactor, die heeft een eigen korte stap): een training te voet
// gaat meteen naar het invullen, zoals Gedaan, want de uitleg vooraf staat in de Briefing; al het andere
// opent zijn eigen scherm (kracht: Forge). Ook een testloop of wedstrijd: altijd zelf invullen.
export function doTodayOpens(template: SessionTemplate | undefined): 'log' | 'start' {
  return briefingEntry(template) ? 'log' : 'start';
}

export type MissionButton = 'briefing' | 'done';

// De mint knop op Vandaag (spoor 6): Briefing als je horloge deze training afvinkt, anders Gedaan.
// Eén regel met de stand van de Briefing; zolang de koppeling gelezen wordt (geen `watchLink`) of bij
// twijfel: Gedaan, de veilige kant. Een training die al gedaan is: ook Gedaan (de kaart is dan weg).
// Dit geldt voor elke training te voet, met of zonder route, ook een wandeling (besluit
// 2026-11-12-trainingsscherm-sporen-1-4.md). Een testloop of wedstrijd vul je altijd zelf in: Gedaan.
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
  const brief = buildSessionBrief(template, input.date, input.program, { modalityKey: place });

  const rows: BriefingRow[] = [];
  const watch = watchRow(input, stand, place);
  if (watch) rows.push(watch);
  if (outdoor) {
    const weather = weatherRow(input, minutes);
    if (weather) rows.push(weather);
  }
  const fuel = fuelRow(input, minutes, outdoor);
  if (fuel) rows.push(fuel);
  const stretch = stretchRow(template);
  if (stretch) rows.push(stretch);

  // Gedaan (zelf invullen) kan pas op de dag zelf (of later); vooraf geen onderbalk.
  const due = input.date <= today;
  // Met een lus is de route naar je horloge de hoofdknop, ook als je zelf invult (dan een tekstknop
  // onderaan); zonder lus Gedaan, of geen onderbalk.
  const rest: { kind: 'manual'; label: string } | { kind: 'none' } =
    stand.kind === 'manual' && due ? { kind: 'manual', label: BRIEFING_TEXT.doneButton } : { kind: 'none' };
  const footer: BriefingFooter = map.kind === 'route' ? { kind: 'route', label: BRIEFING_TEXT.sendRoute, fallback: rest } : rest;

  return {
    head: headOf(input, brief),
    heart: heartOf(input, brief, place),
    stand,
    places,
    place,
    placeLine: placeLineOf(template, place, brief.sportSwitch),
    map,
    rows,
    stopSignals: modality?.environment === 'rest' ? [] : brief.stopSignals,
    footer,
  };
}

// ---- de kop en de hartkaart (spoor 2) ---------------------------------------------------------

function headOf(input: BriefingInput, brief: SessionBrief): BriefingHead {
  const weekday = weekdayShortNL(input.date);
  const day = `${weekday.charAt(0).toUpperCase()}${weekday.slice(1).toLowerCase()} ${formatDateNL(input.date)}`;
  return { eyebrow: brief.headline, purpose: oneSentence(brief.purpose), dayLine: [day, brief.weekLabel].filter(Boolean).join(' · ') };
}

// Het hart: dezelfde getallen als het oude scherm. Bij één doorlopend blok zeggen de zonebalk en zijn
// zin het al: zone en praattest dan niet nog eens als getal of pil.
//
// Het totaal komt uit de tijdlijn: dat is wat je loopt en wat je horloge telt. Zo eindigt de tijdlijn altijd op het
// getal erboven (besluit 2026-11-12-briefing-per-manier.md); engine/workoutPlan.ts laat de tijdlijn passen in de
// geplande minuten, dus meestal zijn beide gelijk.
// Het tempo: alleen bij een manier die hardlopen is (op de StairMaster of de fiets zegt een tempo per km niets),
// in de plaats van het laatste losse feit, zoals eerder op de missiekaart.
function heartOf(input: BriefingInput, brief: SessionBrief, place: string | undefined): BriefingHeart {
  const raw = buildWorkoutPlan(input.template, input.date, input.program);
  const plan = raw ? placePlan(raw, input.template.id, place) : undefined;
  const conditioning = plan?.timeline.filter((s) => s.kind !== 'strength') ?? [];
  const zone = conditioning.length === 1 && !conditioning[0].noTarget ? (conditioning[0].intensity as Intensity) : undefined;
  let facts = zone ? brief.facts.filter((f) => !ZONE_FACT.test(f.value)) : brief.facts;
  const timelineMinutes = plan ? Math.round(plan.timeline.reduce((sum, s) => sum + s.seconds, 0) / 60) : undefined;
  if (timelineMinutes && facts[0]?.label === 'totaal') facts = [{ value: durationLabel(timelineMinutes), label: 'totaal' }, ...facts.slice(1)];
  const sport = (place ? modalitySport(place) : undefined) ?? templateSport(input.template);
  const minutes = timelineMinutes ?? input.session?.plannedMinutes ?? resolveEffectiveFullDuration(input.template, input.date, input.program);
  const pace = sport === 'running' ? trainingPace(input.template.id, input.paces, minutes, input.recentPace?.range, input.recentPace?.runs) : {};
  if (pace.range) {
    const fact = { value: paceRangeText(pace.range), label: 'per km' };
    const last = facts.length - 1;
    // Een eigen feit van de manier ("Geen afdaling") blijft staan: dan komt het tempo erbij.
    const own = !!placeBrief(input.template.id, place)?.third;
    facts = last >= 1 && !own && !/^[±\d]/.test(facts[last].value) ? [...facts.slice(0, last), fact] : [...facts, fact];
  }
  return {
    label: sport === 'running' ? BRIEFING_TEXT.run : BRIEFING_TEXT.doing,
    facts,
    zone,
    steps: conditioning.length > 1,
    ...(brief.tomorrow ? { tomorrow: brief.tomorrow } : {}),
    ...(pace.note ? { paceNote: pace.note } : {}),
    ...(plan ? { plan } : {}),
  };
}

// Een kerngetal dat zone of praattest zegt ("Zone 2", "Praten kan").
export const ZONE_FACT = /^(zone \d|praten kan)/i;

// ---- de regel onder de chips (spoor 4) --------------------------------------------------------

// Alleen bij een andere keuze dan de standaard: het oordeel en wat je anders doet. "Ook goed. Rustig
// tempo, route met zoveel mogelijk hoogteverschil." Telt het als een andere sport, dan die zin erbij.
function placeLineOf(template: SessionTemplate, place: string | undefined, sportSwitch: string | undefined): string | undefined {
  if (!place || place === resolvePlace(template, undefined)) return undefined;
  const modality = getModality(template.id, place);
  const choice = placeChoices(template.id).find((p) => p.key === place);
  if (!modality || !choice) return undefined;
  return [`${choice.roleLabel}.`, howWithoutSport(modality.how, sportSwitch), sportSwitch].filter(Boolean).join(' ');
}

// De uitleg van een manier zonder de zin over de sport als de regel die zin al zegt ("Dit telt als wandelen, niet
// als hardlopen."): geen zin dubbel in één blok (eigenaar 12 november).
export function howWithoutSport(how: string, sportSwitch: string | undefined): string {
  return sportSwitch ? how.replace(/\s*Telt als [^.]*\./g, '').trim() : how;
}

// ---- de rij Waar train je? -------------------------------------------------------------------

// Hoogstens drie chips in één rij, zonder schuiven, zodat er op 360 px geen chip afvalt. Bij meer keuzes het patroon
// van Start bij: de standaard, en een tweede chip die het blad met alle keuzes opent. Die draagt de naam van de
// gekozen keuze als dat niet de standaard is (`other`), anders Andere manier.
export const PLACE_ROW_MAX = 3;
export const OTHER_PLACE = 'Andere manier';

export function placeRow<P extends { key: string }>(places: readonly P[], chosen: string | undefined): { chips: P[]; more: boolean; other?: P } {
  if (places.length <= PLACE_ROW_MAX) return { chips: [...places], more: false };
  const first = places[0];
  const other = places.find((p) => p.key === chosen && p.key !== first.key);
  return { chips: [first], more: true, ...(other ? { other } : {}) };
}

// De regel onder de rij Briefing in Week: wat er echt in staat. "Route, horloge, weer en eten";
// zonder rij eten (een korte loop) ook zonder eten.
export function briefingRowLine(view: BriefingView): string {
  const parts: string[] = [];
  if (view.map.kind === 'route') parts.push('route');
  if (view.map.kind === 'place') parts.push('loopband');
  const word: Partial<Record<BriefingRowId, string>> = { watch: 'horloge', weather: 'weer', fuel: 'eten' };
  for (const r of view.rows) if (word[r.id]) parts.push(word[r.id]!);
  if (parts.length === 0) return BRIEFING_TEXT.run;
  const text = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} en ${parts[parts.length - 1]}`;
  return upperFirst(text);
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
  if (!outdoor && modality) return { kind: 'place' };
  if (!input.routeOn) return { kind: 'none' };
  if (placeHasRoute(input.template, place)) {
    const target = routeTarget({ template: input.template, date: input.date, program: input.program, logs: input.logs, testPace: input.easyPace });
    const soon = input.date === today || input.date === addDays(today, 1);
    const onOpen = soon && resolveRouteSearch(input.routeSearch) === 'open';
    // Alleen de kilometers: de hoogtemeters staan al in de hartkaart.
    return { kind: 'route', target, line: kmText(target), search: onOpen ? 'open' : 'tap' };
  }
  // Wandelen of rugzak buiten: nog geen lus van de planner, wel plekken in de buurt. Fietsen: niets.
  const sport = (place ? modalitySport(place) : undefined) ?? templateSport(input.template);
  return sport === 'hiking' ? { kind: 'nearby' } : { kind: 'none' };
}

// ---- de lijst (spoor 3) ----------------------------------------------------------------------

// Eén rij Horloge: wat er op je horloge staat en of het afvinkt. Eerder stond het horloge drie keer
// (een vak, een regel onderaan en een knop in de onderbalk).
function watchRow(input: BriefingInput, stand: BriefingStand, place: string | undefined): BriefingRow | undefined {
  const plan = buildWorkoutPlan(input.template, input.date, input.program);
  const status = input.watchStatus;
  const sheet = watchSheet({ ...input.watch, template: input.template, garmin: plan?.garmin, status: status?.kind });
  const ticks = stand.kind === 'watch' ? BRIEFING_TEXT.watchTicks : undefined;
  if (!sheet.hasWatchSheet) return ticks ? { id: 'watch', label: BRIEFING_TEXT.watch, line: `${ticks}.`, opens: false } : undefined;
  // Een andere sport dan de workout op je horloge: eerlijk zeggen dat de oude erop staat, en wat je dan start.
  // Zonder workout van ASCEND op je horloge (zelf instellen): alleen wat je start, want de workout in het blad is die
  // van de training.
  // De echte stand, ook als de instelling Horlogestatus tonen uit staat: anders zou de regel een workout verzwijgen.
  // Amber alleen als ASCEND een workout klaarzette (of gaat zetten); stel je zelf in, dan de gewone toon.
  const other = watchPlaceState(input.template, place, status);
  if (other) return { id: 'watch', label: BRIEFING_TEXT.watch, line: ticks ? `${other.line} ${ticks}.` : other.line, opens: true, ...(other.warn ? { tone: 'warn' as const } : {}) };
  const state = watchState(input, status, plan?.garmin !== undefined);
  const line = ticks ? `${state.line}. ${ticks}.` : state.line;
  return { id: 'watch', label: BRIEFING_TEXT.watch, line, opens: true, ...(state.warn ? { tone: 'warn' as const } : {}) };
}

// De stand waarin ASCEND een workout op je horloge al zette (staat) of nog gaat zetten (komt).
const WATCH_WHEN: Record<string, 'on' | 'coming' | undefined> = { sent: 'on', stale: 'on', pending: 'coming', later: 'coming' };

const WATCH_SPORT: Record<WatchSport, Sport> = { Run: 'running', Walk: 'hiking', Hike: 'hiking', Ride: 'cycling' };
const WORKOUT_NAME: Record<Sport, string> = { running: 'hardloopworkout', hiking: 'wandelworkout', cycling: 'fietsworkout' };
// Waar je een workout van die soort op je horloge start.
const WATCH_ACTIVITY: Record<Sport, string> = { running: 'Hardlopen', hiking: 'Wandelen', cycling: 'Fietsen' };

// De workout op je horloge volgt de training. Is de gekozen manier een andere sport, dan zegt dit wat er op je
// horloge staat en wat je start. Twee gevallen (besluit 2026-11-12-stairmaster-horloge.md):
// - De manier krijgt een eigen workout (hardlopen met een manier die wandelen is, zoals de StairMaster, en de
//   instelling Eigen workout bij een andere manier aan): "Er staat een wandelworkout op. Start hem bij Wandelen."
//   Staat de oude er nog: "Er staat nog een hardloopworkout op. De wandelworkout komt eraan.", en lukte het
//   versturen niet, dan zegt de regel dat en wat je dan start.
// - Geen eigen workout (de instelling uit, of fietsen in plaats van lopen): "Er staat een hardloopworkout op.
//   Start Stair Stepper zonder workout.", of "Er komt een hardloopworkout op je horloge." zolang hij nog verstuurd
//   wordt. Zonder workout van ASCEND alleen wat je start.
// Dezelfde sport (de loopband): geen regel, die workout loop je ook op de band.
export function watchPlaceState(
  template: SessionTemplate,
  place: string | undefined,
  status: Pick<WatchStatus, 'kind' | 'wants' | 'wrote'> | undefined,
): { line: string; warn?: boolean } | undefined {
  const workout = watchSportOf(template);
  const chosen = place ? modalitySport(place) : undefined;
  if (!workout || !chosen || WATCH_SPORT[workout] === chosen) return undefined;
  const profile = getModality(template.id, place!)?.garminProfile;
  const start = profile && !profile.includes('/') ? `Start ${profile} zonder workout.` : 'Start zonder workout.';
  const onWatch = WATCH_WHEN[status?.kind ?? ''];
  const wants = WATCH_SPORT[status?.wants ?? workout];
  const wrote = WATCH_SPORT[status?.wrote ?? workout];
  if (wants !== chosen) {
    // Wat er echt op staat: de workout van de training, of nog de eigen workout van net (de instelling ging uit).
    if (onWatch === 'on') return { line: `Er staat een ${WORKOUT_NAME[wrote]} op. ${start}`, warn: true };
    if (onWatch === 'coming') return { line: `Er komt een ${WORKOUT_NAME[wants]} op je horloge. ${start}`, warn: true };
    return { line: start };
  }
  const own = WORKOUT_NAME[wants];
  switch (status?.kind) {
    case 'sent':
      return { line: `Er staat een ${own} op. Start hem bij ${WATCH_ACTIVITY[wants]}.` };
    case 'stale':
      // Een andere wijziging aan dezelfde workout: de gewone regel (Wijziging nog niet erop).
      return wrote === wants ? undefined : { line: `Er staat nog een ${WORKOUT_NAME[wrote]} op. De ${own} komt eraan.`, warn: true };
    case 'failed':
      return status.wrote
        ? { line: `Versturen lukte niet: er staat nog een ${WORKOUT_NAME[wrote]} op. ${start}`, warn: true }
        : { line: `Versturen lukte niet. ${start}`, warn: true };
    case 'pending':
    case 'later':
      return { line: `Er komt een ${own} op je horloge.` };
    default:
      // Niet gekoppeld of sturen staat uit: er komt niets, dus alleen wat je start.
      return { line: start };
  }
}

// De regel alleen, met de stand als woord (staat erop, komt eraan, of niets van ASCEND).
export function watchPlaceLine(template: SessionTemplate, place: string | undefined, onWatch: 'on' | 'coming' | undefined): string | undefined {
  return watchPlaceState(template, place, onWatch ? { kind: onWatch === 'on' ? 'sent' : 'pending' } : undefined)?.line;
}

function watchState(input: BriefingInput, status: WatchStatus | undefined, garmin: boolean): { line: string; warn?: boolean } {
  const today = toISODate(input.now);
  const shown = input.watch.showStatus ? status?.kind : undefined;
  switch (shown) {
    case 'sent': {
      const at = status?.sentAt ? new Date(status.sentAt) : undefined;
      if (!at || Number.isNaN(at.getTime())) return { line: BRIEFING_TEXT.watchSent };
      const day = toISODate(at);
      return { line: day === today ? `${BRIEFING_TEXT.watchSent}, ${formatClockTime(at)}` : `${BRIEFING_TEXT.watchSent} sinds ${formatDateNL(day)}` };
    }
    case 'stale':
      return { line: BRIEFING_TEXT.watchStale };
    case 'pending':
      return { line: BRIEFING_TEXT.watchPending };
    case 'later':
      return { line: BRIEFING_TEXT.watchLater };
    case 'failed':
      return { line: BRIEFING_TEXT.watchFailed, warn: true };
    default:
      // Niet gekoppeld, geen stand of de stand verborgen: wat het blad je dan biedt.
      return { line: garmin ? BRIEFING_TEXT.watchManual : BRIEFING_TEXT.watchFields };
  }
}

function weatherRow(input: BriefingInput, minutes: number): BriefingRow | undefined {
  if (!input.weatherOn && !input.clothingOn) return undefined;
  const at = input.weatherPlace;
  const base = { forecast: input.forecast, template: input.template, logs: input.logs, date: input.date, durationMinutes: minutes, now: input.now };
  const w = weatherForTraining(base);
  // Geen weer voor die dag: bij een plek die niet laadde zegt de regel dat, anders het vaste woord.
  if (!w) return { id: 'weather', label: BRIEFING_TEXT.weather, line: at?.state === 'failed' ? placeWeatherFailed(at.name) : BRIEFING_TEXT.noWeather, opens: true };
  const parts: string[] = [];
  if (input.weatherOn) parts.push(`${Math.round(w.tempC)} ${Math.abs(Math.round(w.tempC)) === 1 ? 'graad' : 'graden'}`);
  if (input.clothingOn) {
    const first = clothingForTraining({ ...base, adjustC: input.clothingAdjust })?.lines[0];
    // Alleen de eerste zin: de rest staat op de weerpagina erachter.
    if (first) parts.push(lowerFirst(firstSentence(first)));
  }
  if (parts.length === 0) return undefined;
  const tone = input.weatherOn && w.verdict !== 'prima' ? ('warn' as const) : undefined;
  const plain = upperFirst(parts.join(', '));
  // De plek erbij: het weer daar, of het weer van huis met de eerlijke regel dat de plek niet laadde.
  const line = at?.state === 'shown' ? placeWeatherLine(at.name, plain) : at?.state === 'failed' ? `${placeWeatherFailed(at.name)} ${PLACE_WEATHER_FROM_HOME} ${lowerFirst(plain)}.` : plain;
  return { id: 'weather', label: BRIEFING_TEXT.weather, line, opens: true, ...(tone ? { tone } : {}) };
}

function fuelRow(input: BriefingInput, minutes: number, outdoor: boolean): BriefingRow | undefined {
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
  return { id: 'fuel', label: BRIEFING_TEXT.fuel, line: upperFirst(parts.join(' en ')), opens: true };
}

// Opwarmen en rekken in één rij; het blad erachter heeft beide lijsten onder elkaar.
function stretchRow(template: SessionTemplate): BriefingRow | undefined {
  const warm = template.warmup?.length ?? 0;
  const cool = template.cooldown?.length ?? 0;
  if (warm === 0 && cool === 0) return undefined;
  const count = (n: number) => `${n} ${n === 1 ? 'oefening' : 'oefeningen'}`;
  const line = warm > 0 && cool > 0 ? `${warm} opwarmen, ${cool} rekken` : warm > 0 ? `${count(warm)} opwarmen` : `${count(cool)} rekken`;
  return { id: 'stretch', label: BRIEFING_TEXT.stretch, line, opens: true };
}

// "12 km": de afstand van de lus die je zoekt, zoals engine/routeTarget.ts#targetText, zonder hoogtemeters.
export function kmText(target: RouteTarget): string {
  return `${String(target.distanceKm).replace('.', ',')} km`;
}

// Eén zin, met de punt: de kop heeft geen Meer erachter (spoor 2).
function oneSentence(s: string): string {
  const end = s.search(/[.!?](\s|$)/);
  return end < 0 ? s : s.slice(0, end + 1);
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

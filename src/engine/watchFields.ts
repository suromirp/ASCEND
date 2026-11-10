// ASCEND: datavelden voor je horloge (docs/beslissingen/2026-11-09-datavelden-horloge.md).
//
// Per soort training welke datapagina's je op je horloge zet, met één zin waarom, en de eigen
// versies van de gebruiker ernaast. Puur: geen React, geen opslag, geen klok. Dit plant niets en
// verandert geen training; het is uitleg met een tekening.
//
// Het advies noemt velden bij hun algemene id (data/watchModels.ts). Welke velden en indelingen een
// horloge kent is data per model; een veld dat het model niet kent valt uit het advies, en in een
// bewaarde versie komt er bij het lezen een veld voor in de plaats. De bewaarde vorm zelf verandert
// daarbij niet: pas een wijziging van de gebruiker schrijft.

import { DEFAULT_WATCH_MODEL_ID, WATCH_MODELS, type WatchCell, type WatchFieldDef, type WatchModel } from '../data/watchModels';
import type { SessionTemplate } from '../models/training';
import { hasRole } from './templateRoles';

export type WatchKindId = 'zone2' | 'hills' | 'intervals' | 'longRun' | 'packHike';

export const WATCH_KINDS: readonly { id: WatchKindId; label: string }[] = [
  { id: 'zone2', label: 'Zone 2' },
  { id: 'hills', label: 'Heuvels' },
  { id: 'intervals', label: 'Intervallen' },
  { id: 'longRun', label: 'Lange duurloop' },
  { id: 'packHike', label: 'Tocht met rugzak' },
];

const KIND_IDS = new Set<string>(WATCH_KINDS.map((k) => k.id));
export const isWatchKind = (raw: unknown): raw is WatchKindId => typeof raw === 'string' && KIND_IDS.has(raw);

// Een versie van de gebruiker: per pagina de velden, van boven naar beneden en van links naar rechts.
export interface WatchVersion {
  pages: string[][];
}
export type WatchSlot = 'v2' | 'v3';
export const WATCH_SLOTS: readonly WatchSlot[] = ['v2', 'v3'];
export type WatchKindVersions = Partial<Record<WatchSlot, WatchVersion>>;
// De bewaarde vorm (AppSettings.watchFieldVersions): per soort hoogstens twee eigen versies naast het advies.
export type WatchFieldStore = Partial<Record<WatchKindId, WatchKindVersions>>;

// De grenzen van de bewaarde vorm, los van een model: ASCEND biedt 1 tot en met 4 velden per pagina.
export const WATCH_MAX_FIELDS = 4;
const STORE_MAX_PAGES = 8;
const FIELD_ID = /^[A-Za-z][A-Za-z0-9]{0,39}$/;

export function resolveWatchModel(raw: unknown): WatchModel {
  return (typeof raw === 'string' && Object.hasOwn(WATCH_MODELS, raw) ? WATCH_MODELS[raw] : undefined) ?? WATCH_MODELS[DEFAULT_WATCH_MODEL_ID];
}

// De instelling "Datavelden voor je horloge": afwezig is aan.
export const watchFieldsShown = (settings: { watchFieldsShown?: boolean }): boolean => settings.watchFieldsShown !== false;

export function fieldOf(model: WatchModel, id: string): WatchFieldDef | undefined {
  return model.fields.find((f) => f.id === id);
}
export const fieldLabel = (model: WatchModel, id: string): string => fieldOf(model, id)?.label ?? id;

// ---------------------------------------------------------------------------------------------
// Het advies

interface AdvicePageSpec {
  // Het veld waar je op stuurt: het komt op de grootste plek van de indeling.
  main: string;
  rest: string[];
  why: string;
}
interface AdviceSpec {
  pages: AdvicePageSpec[];
  // Eén regel bij de stappen die bij deze soort hoort.
  tip?: string;
  hike?: boolean;
}

// Bron per soort: docs/onderzoek/Datavelden voor je horloge.md, hoofdstuk 5. Praktijkadvies, geen studie.
const ADVICE: Record<WatchKindId, AdviceSpec> = {
  zone2: {
    pages: [
      { main: 'heartRate', rest: ['hrZone', 'timer'], why: 'Hartslag groot, want daar stuur je op.' },
      { main: 'distance', rest: ['lapPace', 'averagePace'], why: 'Tempo staat hier, zodat het je op pagina 1 niet opjaagt.' },
      { main: 'cadence', rest: ['timeOfDay'], why: 'Cadans apart, voor als je op je pas wilt letten.' },
    ],
  },
  hills: {
    pages: [
      { main: 'heartRate', rest: ['lapTime', 'lapAscent'], why: 'Hartslag groot, want tempo zegt bergop weinig.' },
      { main: 'totalAscent', rest: ['verticalSpeed', 'grade'], why: 'Totale stijging groot, want die telt hier, niet de kilometers.' },
      { main: 'laps', rest: ['lastLapTime', 'timer'], why: 'Ronden groot, zodat je weet hoeveel klimmen je hebt gehad.' },
    ],
    tip: 'Druk per klim op de rondeknop. Op een loopband kent het horloge de helling niet: Totale stijging klopt daar niet.',
  },
  intervals: {
    pages: [
      { main: 'lapTime', rest: ['lapPace', 'lapDistance', 'heartRate'], why: 'Rondetijd groot, want een blok duurt een vaste tijd.' },
      { main: 'lastLapPace', rest: ['lastLapTime', 'laps'], why: 'Je laatste blok, om in de rust te lezen wat je liep.' },
      { main: 'timer', rest: ['distance', 'averageHeartRate'], why: 'Het geheel, voor het uitlopen.' },
    ],
    tip: 'Druk per blok op de rondeknop. Een training die naar je horloge is gestuurd toont er een eigen scherm voor.',
  },
  longRun: {
    pages: [
      { main: 'heartRate', rest: ['lapPace', 'distance'], why: 'Hartslag groot, want die loopt op als je te hard begint.' },
      { main: 'timer', rest: ['averagePace', 'averageHeartRate'], why: 'Timer groot, want de lange loop telt in minuten.' },
      { main: 'timeOfDay', rest: ['totalAscent'], why: 'De klok, zodat je weet wanneer je moet eten en keren.' },
    ],
    tip: 'Zet Auto Lap op 1 km: het rondetempo is dan het tempo van de kilometer waar je in zit.',
  },
  packHike: {
    pages: [
      { main: 'totalAscent', rest: ['distance', 'timer', 'timeOfDay'], why: 'Totale stijging groot, want hoogtemeters bepalen je dag.' },
      { main: 'heartRate', rest: ['verticalSpeed', 'elevation', 'totalDescent'], why: 'Hartslag groot, want met een rugzak bergop loopt hij snel op.' },
      { main: 'sunset', rest: ['timeOfDay', 'batteryLevel'], why: 'Zon onder groot, want daarvoor wil je er zijn.' },
    ],
    hike: true,
  },
};

export interface WatchAdvicePage {
  // De velden op hun plek in de indeling van dat aantal.
  fields: string[];
  why: string;
}
export interface WatchAdvice {
  kind: WatchKindId;
  pages: WatchAdvicePage[];
  tip?: string;
  // De activiteit op het horloge waar deze pagina's bij horen.
  activity: string;
}

// Zet het stuurveld op de grootste plek van de indeling, de rest in volgorde eromheen.
function arrange(main: string, rest: string[], model: WatchModel): string[] {
  const at = Math.min(model.layouts[rest.length + 1]?.main ?? 0, rest.length);
  return [...rest.slice(0, at), main, ...rest.slice(at)];
}

// Het advies voor een soort training op dit horloge, of niets als er geen is. Een veld dat het model
// niet kent valt weg; een pagina waarvan het stuurveld wegvalt verdwijnt, want haar zin klopt dan niet.
export function watchAdvice(kind: unknown, model: WatchModel): WatchAdvice | undefined {
  if (!isWatchKind(kind)) return undefined;
  const spec = ADVICE[kind];
  const known = new Set(model.fields.map((f) => f.id));
  const pages = spec.pages
    .filter((p) => known.has(p.main))
    .map((p): WatchAdvicePage => {
      const rest = p.rest.filter((id) => known.has(id)).slice(0, WATCH_MAX_FIELDS - 1);
      return { fields: arrange(p.main, rest, model), why: p.why };
    })
    .slice(0, model.maxPages);
  if (pages.length === 0) return undefined;
  return { kind, pages, tip: spec.tip, activity: spec.hike ? model.activityHike : model.activityRun };
}

// Bij welke soort een training hoort, of niets (kracht, fietsen, een test of wedstrijd).
const KIND_BY_TEMPLATE: Record<string, WatchKindId> = {
  tpl_easy_run: 'zone2',
  tpl_hill_easy: 'zone2',
  tpl_recovery_run: 'zone2',
  tpl_strides_run: 'zone2',
  tpl_hill_intervals: 'hills',
  tpl_hills_descent: 'hills',
  tpl_bergconditie: 'hills',
  tpl_intervals: 'intervals',
  tpl_fartlek: 'intervals',
  tpl_tempo_run: 'intervals',
  tpl_progression_run: 'intervals',
  tpl_long_run: 'longRun',
  tpl_ruck_walk: 'packHike',
  tpl_mountain_hike: 'packHike',
  tpl_hike_day_one: 'packHike',
};

export function watchKindOf(template: Pick<SessionTemplate, 'id' | 'type' | 'roles'> | undefined): WatchKindId | undefined {
  if (!template) return undefined;
  const byId = Object.hasOwn(KIND_BY_TEMPLATE, template.id) ? KIND_BY_TEMPLATE[template.id] : undefined;
  if (byId) return byId;
  if (template.type === 'strength' || hasRole(template, 'test') || hasRole(template, 'race')) return undefined;
  if (hasRole(template, 'ruck') || template.type === 'hiking') return 'packHike';
  if (template.type !== 'cardio') return undefined;
  if (hasRole(template, 'long')) return 'longRun';
  if (hasRole(template, 'blocks') || hasRole(template, 'hard_run')) return 'intervals';
  if (hasRole(template, 'easy_pace')) return 'zone2';
  return undefined;
}

// ---------------------------------------------------------------------------------------------
// De bewaarde versies: defensief lezen

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function cleanVersion(raw: unknown): WatchVersion | undefined {
  if (!isRecord(raw) || !Array.isArray(raw.pages)) return undefined;
  const pages = raw.pages;
  if (pages.length < 1 || pages.length > STORE_MAX_PAGES) return undefined;
  const ok = pages.every((p) => Array.isArray(p) && p.length >= 1 && p.length <= WATCH_MAX_FIELDS && p.every((f) => typeof f === 'string' && FIELD_ID.test(f)));
  return ok ? { pages: pages.map((p) => [...(p as string[])]) } : undefined;
}

// Alleen de vorm: wat geen versie van ASCEND is valt weg, per versie. `dropped` zegt of er iets wegviel.
// Of een veld bij het model bestaat is hier geen vraag: dat regelt resolveVersion bij het lezen.
export function cleanWatchFieldStore(raw: unknown): { store?: WatchFieldStore; dropped: boolean } {
  if (raw === undefined) return { dropped: false };
  if (!isRecord(raw)) return { dropped: true };
  let dropped = false;
  const store: WatchFieldStore = {};
  for (const [kind, slots] of Object.entries(raw)) {
    if (!isWatchKind(kind) || !isRecord(slots)) {
      dropped = true;
      continue;
    }
    const versions: WatchKindVersions = {};
    for (const [slot, value] of Object.entries(slots)) {
      const version = slot === 'v2' || slot === 'v3' ? cleanVersion(value) : undefined;
      if (version) versions[slot as WatchSlot] = version;
      else dropped = true;
    }
    if (Object.keys(versions).length > 0) store[kind] = versions;
  }
  return Object.keys(store).length > 0 ? { store, dropped } : { dropped };
}

// Velden om een lege plek mee te vullen, in deze volgorde, daarna de lijst van het model.
const FILL_ORDER = ['timer', 'distance', 'heartRate', 'timeOfDay'];

function fillField(taken: readonly string[], model: WatchModel, preferred: readonly string[] = []): string {
  const known = new Set(model.fields.map((f) => f.id));
  const candidates = [...preferred, ...FILL_ORDER, ...model.fields.map((f) => f.id)];
  return candidates.find((id) => known.has(id) && !taken.includes(id)) ?? model.fields[0].id;
}

export interface ResolvedVersion {
  version: WatchVersion;
  // Hoeveel bewaarde velden dit horloge niet kent en dus vervangen zijn.
  replaced: number;
}

// Een bewaarde versie zoals het scherm hem tekent: binnen de grenzen van het model, en met een ander
// veld op de plek van een veld dat het model niet (meer) kent (het veld uit het advies op die plek als
// dat vrij is, anders het eerste vrije veld).
export function resolveVersion(store: unknown, kind: WatchKindId, slot: WatchSlot, model: WatchModel): ResolvedVersion | undefined {
  const stored = cleanWatchFieldStore(store).store?.[kind]?.[slot];
  if (!stored) return undefined;
  const known = new Set(model.fields.map((f) => f.id));
  const advice = watchAdvice(kind, model);
  let replaced = 0;
  const pages = stored.pages.slice(0, model.maxPages).map((page, p) => {
    const kept = page.filter((id) => known.has(id));
    return page.map((id, c) => {
      if (known.has(id)) return id;
      replaced++;
      const fromAdvice = advice?.pages[p]?.fields[c];
      const next = fillField(kept, model, fromAdvice ? [fromAdvice] : []);
      kept.push(next);
      return next;
    });
  });
  return { version: { pages }, replaced };
}

export function firstFreeSlot(store: unknown, kind: WatchKindId): WatchSlot | undefined {
  const versions = cleanWatchFieldStore(store).store?.[kind];
  return WATCH_SLOTS.find((slot) => !versions?.[slot]);
}

// ---------------------------------------------------------------------------------------------
// Bewerken: elke functie geeft een nieuwe waarde terug

export const copyOfAdvice = (advice: WatchAdvice): WatchVersion => ({ pages: advice.pages.map((p) => [...p.fields]) });

// Een veld op een plek. Staat het gekozen veld al op de pagina, dan wisselen de twee van plek.
export function withField(version: WatchVersion, page: number, cell: number, fieldId: string): WatchVersion {
  const current = version.pages[page];
  if (!current || cell < 0 || cell >= current.length) return version;
  const next = [...current];
  const other = next.indexOf(fieldId);
  if (other >= 0 && other !== cell) next[other] = next[cell];
  next[cell] = fieldId;
  return { pages: version.pages.map((p, i) => (i === page ? next : p)) };
}

// Het aantal velden op een pagina. Minder houdt de eerste velden; meer vult aan met het eerstvolgende
// veld uit het advies voor die pagina dat er nog niet staat, anders het eerste vrije veld.
export function withFieldCount(version: WatchVersion, page: number, count: number, model: WatchModel, advice?: WatchAdvice): WatchVersion {
  const current = version.pages[page];
  const target = Math.round(count);
  if (!current || !(target >= 1 && target <= WATCH_MAX_FIELDS) || target === current.length) return version;
  const next = current.slice(0, target);
  while (next.length < target) next.push(fillField(next, model, advice?.pages[page]?.fields ?? []));
  return { pages: version.pages.map((p, i) => (i === page ? next : p)) };
}

export function withPageAdded(version: WatchVersion, model: WatchModel): WatchVersion {
  if (version.pages.length >= model.maxPages) return version;
  return { pages: [...version.pages, [fillField([], model)]] };
}

// De laatste pagina blijft altijd staan: een versie zonder pagina's bestaat niet.
export function withPageRemoved(version: WatchVersion, page: number): WatchVersion {
  if (version.pages.length <= 1 || page < 0 || page >= version.pages.length) return version;
  return { pages: version.pages.filter((_, i) => i !== page) };
}

// De hele bewaarde waarde met één versie gezet of weggehaald (undefined is terug naar advies). Geeft
// undefined als er niets meer bewaard hoeft te worden.
export function storeWith(store: unknown, kind: WatchKindId, slot: WatchSlot, version: WatchVersion | undefined): WatchFieldStore | undefined {
  const base = cleanWatchFieldStore(store).store ?? {};
  const versions: WatchKindVersions = { ...base[kind] };
  const clean = version ? cleanVersion(version) : undefined;
  if (clean) versions[slot] = clean;
  else delete versions[slot];
  const next: WatchFieldStore = { ...base };
  if (Object.keys(versions).length > 0) next[kind] = versions;
  else delete next[kind];
  return Object.keys(next).length > 0 ? next : undefined;
}

// ---------------------------------------------------------------------------------------------
// Teksten bij een versie

// Waar een versie van het advies afwijkt, in gewone zinnen.
export function versionDiff(version: WatchVersion, advice: WatchAdvice | undefined, model: WatchModel): string[] {
  if (!advice) return [];
  const lines: string[] = [];
  const count = Math.max(version.pages.length, advice.pages.length);
  for (let p = 0; p < count; p++) {
    const mine = version.pages[p];
    const theirs = advice.pages[p]?.fields;
    if (!mine) {
      lines.push(`Pagina ${p + 1} uit het advies staat er niet in.`);
      continue;
    }
    if (!theirs) {
      lines.push(`Pagina ${p + 1} staat niet in het advies.`);
      continue;
    }
    if (mine.length !== theirs.length) {
      lines.push(`Pagina ${p + 1}: ${mine.length} ${mine.length === 1 ? 'veld' : 'velden'} in plaats van ${theirs.length}.`);
      continue;
    }
    mine.forEach((id, c) => {
      if (id !== theirs[c]) lines.push(`Pagina ${p + 1}, veld ${c + 1}: ${fieldLabel(model, id)} in plaats van ${fieldLabel(model, theirs[c])}.`);
    });
  }
  return lines;
}

export interface WatchSteps {
  steps: string[];
  notes: string[];
}

// Hoe je deze pagina's op het horloge zet: het pad van het model, dan per pagina de velden.
export function watchSteps(pages: readonly (readonly string[])[], model: WatchModel, advice?: WatchAdvice): WatchSteps {
  const activity = advice?.activity ?? model.activityRun;
  const fill = (text: string) => text.replace('{activiteit}', activity);
  const perPage = pages.map((fields, p) => `Pagina ${p + 1}: ${fields.length} ${fields.length === 1 ? 'veld' : 'velden'}. ${fields.map((id) => fieldLabel(model, id)).join(', ')}.`);
  const steps = [...model.pathOnWatch.map(fill), ...perPage];
  const notes = [fill(model.pathInApp)];
  if (advice?.tip) notes.unshift(advice.tip);
  return { steps, notes };
}

// ---------------------------------------------------------------------------------------------
// Voor het scherm: alles wat de pagina nodig heeft maar niet zelf mag bedenken

export type WatchPageState = 'off' | 'noAdvice' | 'ready';

// Wat de pagina toont: de kaart "staan uit", de kaart "geen advies", of het horloge.
export function watchPageState(settings: { watchFieldsShown?: boolean }, kind: unknown, model: WatchModel): WatchPageState {
  if (!watchFieldsShown(settings)) return 'off';
  return watchAdvice(kind, model) ? 'ready' : 'noAdvice';
}

// De regel in amber als bewaarde velden bij dit horloge niet bestaan.
export function replacedLine(count: number): string | undefined {
  if (!(count > 0)) return undefined;
  return count === 1 ? '1 veld bestaat niet op dit horloge en is vervangen.' : `${count} velden bestaan niet op dit horloge en zijn vervangen.`;
}

// Het label van de tikknop op een plek in de tekening.
export const cellAriaLabel = (page: number, cell: number, fieldName: string): string => `Pagina ${page + 1}, veld ${cell + 1}, ${fieldName}. Tik om te veranderen.`;
export const pageDotLabel = (page: number, total: number): string => `Pagina ${page + 1} van ${total}`;

// De regel onder een veld in het blad Veld kiezen: de uitleg, dan wat het veld vraagt of waar het bestaat.
export function fieldHint(field: WatchFieldDef): string | undefined {
  const parts: string[] = [];
  if (field.note) parts.push(field.note);
  if (field.needs === 'dynamics-accessory') parts.push('Vraagt een borstband met loopdynamiek of een pod.');
  if (field.only === 'run') parts.push('Alleen bij hardlopen.');
  if (field.only === 'workout') parts.push('Alleen in een gestuurde workout.');
  return parts.length > 0 ? parts.join(' ') : undefined;
}

// ---------------------------------------------------------------------------------------------
// De handelingen van de pagina: wat een tik doet, beslist hier

export type WatchTab = 'advice' | WatchSlot;
export const WATCH_SLOT_NAME: Record<WatchSlot, string> = { v2: 'Versie 2', v3: 'Versie 3' };
export const WATCH_BOTH_TAKEN = 'Het advies blijft zoals het is. Pas Versie 2 of 3 aan, of zet er een terug naar advies.';

// Mag het blad Veld kiezen open? In het advies alleen als er nog een versie vrij is voor de kopie.
export function canPickField(store: unknown, kind: WatchKindId, tab: WatchTab): boolean {
  return tab !== 'advice' || firstFreeSlot(store, kind) !== undefined;
}

export interface FieldPick {
  // Niets te bewaren: het veld stond er al, of er is geen plek.
  changed: boolean;
  store?: WatchFieldStore;
  // De versie die daarna in beeld hoort.
  tab: WatchTab;
  notice?: string;
}

// Een veld gekozen op een plek. In een versie verandert die versie. In het advies blijft het advies het
// advies: de keuze komt als kopie in de eerste vrije versie; zijn beide bezet, dan verandert er niets.
export function pickField(store: unknown, kind: WatchKindId, tab: WatchTab, page: number, cell: number, fieldId: string, model: WatchModel): FieldPick {
  const same: FieldPick = { changed: false, tab };
  if (!fieldOf(model, fieldId)) return same;
  if (tab !== 'advice') {
    const current = resolveVersion(store, kind, tab, model)?.version;
    if (!current || current.pages[page]?.[cell] === undefined || current.pages[page][cell] === fieldId) return same;
    return { changed: true, store: storeWith(store, kind, tab, withField(current, page, cell, fieldId)), tab };
  }
  const advice = watchAdvice(kind, model);
  const advised = advice?.pages[page]?.fields[cell];
  if (!advice || advised === undefined || advised === fieldId) return same;
  const free = firstFreeSlot(store, kind);
  if (!free) return { ...same, notice: WATCH_BOTH_TAKEN };
  const copy = withField(copyOfAdvice(advice), page, cell, fieldId);
  return { changed: true, store: storeWith(store, kind, free, copy), tab: free, notice: `Dit staat nu in ${WATCH_SLOT_NAME[free]}. Het advies blijft zoals het was.` };
}

// Ongedaan maken na Terug naar advies: de oude versie komt terug op haar plek, maar alleen als die plek
// nog leeg is. Staat er intussen iets nieuws, dan vervalt het ongedaan maken en blijft het nieuwe staan.
export function restoreVersion(store: unknown, kind: WatchKindId, slot: WatchSlot, version: WatchVersion): { ok: boolean; store?: WatchFieldStore } {
  if (cleanWatchFieldStore(store).store?.[kind]?.[slot]) return { ok: false };
  return { ok: true, store: storeWith(store, kind, slot, version) };
}

// Wat de pagina over het opslaan zegt. "Duurt lang" is geen mislukking: het schrijven loopt dan nog en
// de melding verdwijnt zodra het klaar is. "Lukte niet" staat er alleen als het schrijven zelf faalde.
export type WatchSaveState = 'idle' | 'slow' | 'failed';
export function saveLine(state: WatchSaveState): string | undefined {
  if (state === 'slow') return 'Opslaan duurt langer dan normaal. Even geduld.';
  if (state === 'failed') return 'Opslaan lukte niet. Probeer het opnieuw.';
  return undefined;
}

// Het wisselen van pagina via een puntje: vloeiend alleen als de beweging op Normaal staat.
// Rustig, Uit en een systeem dat geen beweging wil springen naar de eindstand.
export const pageScrollBehavior = (motion: 'full' | 'calm' | 'off'): 'smooth' | 'auto' => (motion === 'full' ? 'smooth' : 'auto');

// ---------------------------------------------------------------------------------------------
// De tekening van één plek, in eenheden van de tekening (288 bij 288)

export const WATCH_LABEL_SIZE = 14;
const LABEL_PAD = 8;
// Een voorzichtige schatting van de breedte van een tekst in Inter: te groot is veilig, te klein loopt eruit.
const LABEL_EM = 0.58;
const VALUE_EM = 0.64;
const MIN_VALUE_SIZE = 20;

export const textWidth = (text: string, size: number, em = LABEL_EM): number => text.length * size * em;

// Het label in één of twee regels die in de plek passen; breekt op een spatie, zo gelijk mogelijk.
export function labelLines(label: string, width: number): string[] {
  const max = width - LABEL_PAD * 2;
  if (textWidth(label, WATCH_LABEL_SIZE) <= max) return [label];
  const words = label.split(' ');
  let best: string[] = [label];
  let bestWorst = Infinity;
  for (let i = 1; i < words.length; i++) {
    const pair = [words.slice(0, i).join(' '), words.slice(i).join(' ')];
    const worst = Math.max(...pair.map((l) => textWidth(l, WATCH_LABEL_SIZE)));
    if (worst < bestWorst) {
      best = pair;
      bestWorst = worst;
    }
  }
  return best;
}

export interface CellBar { x: number; y: number; w: number; h: number }
export interface CellDrawing {
  cx: number;
  labelLines: string[];
  labelY: number[];
  // Per regel de breedte waarop de regel wordt ingekort (textLength), alleen voor een woord dat ook
  // na het breken niet past; anders niet gezet.
  labelFit: (number | undefined)[];
  value?: string;
  unit?: string;
  valueSize: number;
  valueY: number;
  // Een meter of grafiek heeft geen voorbeeldwaarde: drie staafjes.
  bars?: CellBar[];
}

const LINE = 16;
const GAP = 4;

export function cellDrawing(cell: WatchCell, field: WatchFieldDef | undefined, id = ''): CellDrawing {
  const label = field ? (field.short ?? field.label) : id;
  const lines = labelLines(label, cell.w);
  const avail = cell.w - LABEL_PAD * 2;
  const value = field?.sample;
  const unit = field?.unit;
  let size = cell.valueSize;
  const valueWidth = (px: number) => textWidth(value ?? '', px, VALUE_EM) + (unit ? 4 + textWidth(unit, WATCH_LABEL_SIZE) : 0);
  while (value && size > MIN_VALUE_SIZE && valueWidth(size) > avail) size -= 2;
  // Een label op twee regels in een lage plek: het cijfer wordt iets kleiner zodat alles in de plek blijft.
  while (size > MIN_VALUE_SIZE && lines.length * LINE + GAP + size > cell.h - 2) size -= 2;
  const block = lines.length * LINE + GAP + size;
  const top = cell.y + (cell.h - block) / 2;
  const labelY = lines.map((_, i) => top + 12 + i * LINE);
  const valueTop = top + lines.length * LINE + GAP;
  const valueY = valueTop + size * 0.8;
  const cx = cell.x + cell.w / 2;
  const labelFit = lines.map((l) => (textWidth(l, WATCH_LABEL_SIZE) > avail ? avail : undefined));
  const drawing: CellDrawing = { cx, labelLines: lines, labelY, labelFit, value, unit, valueSize: size, valueY };
  if (!value) {
    const h = [size * 0.4, size * 0.7, size];
    drawing.bars = h.map((bh, i) => ({ x: cx - 21 + i * 16, y: valueTop + size - bh, w: 10, h: bh }));
  }
  return drawing;
}

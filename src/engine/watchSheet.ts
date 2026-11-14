// ASCEND: wat het blad Je horloge van een training toont (docs/visie/Ontwerp Info-blad.md, richting A).
//
// Eén plek voor het horloge: de workout (vanzelf verstuurd via intervals.icu, of zelf nabouwen in
// Garmin Connect), de datavelden als tekst per pagina, en de rij naar de hartslagzones. Puur: het blad
// (components/WatchSheet.tsx) krijgt dit terug en tekent alleen. Het plant niets en verandert geen
// training; de stand zelf komt uit engine/watchStatus.ts, de velden uit engine/watchFields.ts.

import type { SessionTemplate } from '../models/training';
import type { WatchModel } from '../data/watchModels';
import type { WatchStatusKind } from './watchStatus';
import {
  WATCH_KINDS,
  WATCH_SLOTS,
  fieldLabel,
  resolveVersion,
  watchAdvice,
  watchKindOf,
  type WatchKindId,
} from './watchFields';

export interface WatchSheetInput {
  template: Pick<SessionTemplate, 'id' | 'type' | 'roles'>;
  // De workout om zelf na te bouwen (WorkoutPlan.garmin), als die er is.
  garmin?: { sport: string; lines: string[] };
  // De stand op het horloge van de geplande training; leeg bij een losse training of zolang hij laadt.
  status?: WatchStatusKind;
  // Instelling "Laten zien of het gelukt is" (settings.showWatchStatus).
  showStatus: boolean;
  // Instelling "Datavelden voor je horloge" (watchFieldsShown).
  fieldsShown: boolean;
  model: WatchModel;
  // settings.watchFieldVersions, ongelezen: een kapotte waarde telt als geen eigen versie.
  store?: unknown;
  // De gids heeft de opmerking over je horloge instellen (zones, eigen activiteit, databeelden).
  hasZonesNote: boolean;
  // De regel van de stand (watchStatusLine), voor de rij Je horloge in Week.
  statusText?: string;
}

// De delen van de groep Workout, in de volgorde van het blad.
export type WatchWorkoutPart =
  // De stand van de verstuurde workout (WatchStatusRow), met Nu versturen of Opnieuw.
  | { kind: 'status' }
  // Niet gekoppeld: één zin en de rij naar Garmin koppelen.
  | { kind: 'unlinked'; text: string; rowTitle: string; to: string }
  // Zelf nabouwen in Garmin Connect: een onderblad met de stappen.
  | { kind: 'manual'; title: string; sub: string };

export interface WatchWorkoutGroup {
  parts: WatchWorkoutPart[];
  // Geen workout voor het horloge (kracht, rust, wedstrijd): alleen deze zin.
  emptyText?: string;
}

export interface WatchFieldsGroup {
  state: 'ready' | 'noAdvice';
  title: string;
  lines: string[];
  why?: string;
  // Een eigen versie bestaat naast het advies.
  ownVersionLine?: string;
  noAdviceText?: string;
  rowTitle: string;
  to: string;
}

export interface WatchSheetView {
  hasWatchSheet: boolean;
  workout: WatchWorkoutGroup;
  fields?: WatchFieldsGroup;
  // Naar Garmin koppelen, bij Je horloge instellen (`section` gaat mee als state van de navigatie).
  zones?: { title: string; to: string; section: string };
  // De regel onder de rij Je horloge (Week, Vandaag): de stand als die er is, anders wat erin staat.
  rowSub: string;
}

export const WATCH_SHEET_TEXT = {
  title: 'Je horloge',
  button: 'Horloge',
  notLinked: 'Deze workout staat nog niet op je horloge.',
  linkRow: 'Vanzelf laten sturen',
  manual: 'Zelf nabouwen in Garmin Connect',
  noWorkout: 'Deze training zet je niet op je horloge.',
  noAdvice: 'Voor deze training heb ik geen advies.',
  ownVersion: 'Je hebt ook een eigen versie.',
  fieldsRow: 'Bekijken en aanpassen',
  // Eén titel voor de vier gidsen met een Garmin-opmerking: zones, een eigen activiteit en databeelden.
  zones: 'Je horloge instellen',
  row: 'Je horloge',
  rowSub: 'Workout en datavelden',
} as const;

export const GARMIN_PAGE = '/koppelen/garmin';
export const WATCH_FIELDS_PAGE = '/horloge/datavelden';

// Stappen tellen: een herhaling telt als één regel "Herhaal", de stappen erin wel apart.
function stepCount(lines: string[]): number {
  return lines.filter((l) => !/^\s*Herhaal/i.test(l)).length;
}

// Een stand die zegt dat de training via intervals.icu loopt (gekoppeld en de schakelaar aan).
const LINKED: ReadonlySet<WatchStatusKind> = new Set(['sent', 'stale', 'pending', 'later', 'failed']);

function workoutGroup(input: WatchSheetInput): WatchWorkoutGroup {
  const { garmin, status, showStatus } = input;
  const linked = !!status && LINKED.has(status);
  const manual: WatchWorkoutPart | undefined = garmin
    ? { kind: 'manual', title: WATCH_SHEET_TEXT.manual, sub: `${garmin.sport}, ${stepCount(garmin.lines)} ${stepCount(garmin.lines) === 1 ? 'stap' : 'stappen'}` }
    : undefined;
  const parts: WatchWorkoutPart[] = [];
  // De weg via intervals.icu staat altijd bovenaan, zelf nabouwen in Garmin Connect eronder als tweede weg
  // (de eigenaar op 14 november: hij laat versturen via intervals.icu; besluit 2026-11-14-info-blad-a.md).
  // Gekoppeld: de stand. Niet gekoppeld: de zin en Vanzelf laten sturen. Zoals de regel op het trainingsscherm:
  // met "Laten zien of het gelukt is" uit vraagt hij ook niet om te koppelen.
  if (linked && showStatus) parts.push({ kind: 'status' });
  if (!linked && status === 'unlinked' && showStatus) {
    parts.push({ kind: 'unlinked', text: WATCH_SHEET_TEXT.notLinked, rowTitle: WATCH_SHEET_TEXT.linkRow, to: GARMIN_PAGE });
  }
  if (manual) parts.push(manual);
  const goesToWatch = !!garmin || (!!status && status !== 'none');
  return goesToWatch ? { parts } : { parts, emptyText: WATCH_SHEET_TEXT.noWorkout };
}

function kindLabel(kind: WatchKindId): string {
  return WATCH_KINDS.find((k) => k.id === kind)?.label ?? '';
}

function fieldsGroup(input: WatchSheetInput, kind: WatchKindId | undefined): WatchFieldsGroup | undefined {
  if (!input.fieldsShown) return undefined;
  const advice = watchAdvice(kind, input.model);
  if (!kind || !advice) {
    return {
      state: 'noAdvice',
      title: 'Datavelden',
      lines: [],
      noAdviceText: WATCH_SHEET_TEXT.noAdvice,
      rowTitle: WATCH_SHEET_TEXT.fieldsRow,
      // Zonder soort opent de pagina op Zone 2.
      to: WATCH_FIELDS_PAGE,
    };
  }
  const own = WATCH_SLOTS.some((slot) => !!resolveVersion(input.store, kind, slot, input.model));
  return {
    state: 'ready',
    title: `Datavelden · ${kindLabel(kind)}`,
    lines: advice.pages.map((p, i) => `Pagina ${i + 1}: ${p.fields.map((id) => fieldLabel(input.model, id)).join(', ')}`),
    why: advice.pages[0]?.why,
    ownVersionLine: own ? WATCH_SHEET_TEXT.ownVersion : undefined,
    rowTitle: WATCH_SHEET_TEXT.fieldsRow,
    to: `${WATCH_FIELDS_PAGE}?soort=${kind}`,
  };
}

export function watchSheet(input: WatchSheetInput): WatchSheetView {
  const workout = workoutGroup(input);
  const hasWorkout = !workout.emptyText;
  const kind = watchKindOf(input.template);
  const hasAdvice = !!kind && !!watchAdvice(kind, input.model);
  // Het blad bestaat alleen voor een training die op het horloge kan: een workout of datavelden met advies.
  // Kracht en rust hebben geen van beide en dus geen knop Horloge. Een wedstrijd en een testloop wel: die
  // hebben een workout (Hardlopen) om op het horloge te zetten, alleen geen advies voor de datavelden.
  const hasWatchSheet = hasWorkout || (input.fieldsShown && hasAdvice);
  const fields = hasWatchSheet ? fieldsGroup(input, kind) : undefined;
  const zones = hasWatchSheet && input.hasZonesNote ? { title: WATCH_SHEET_TEXT.zones, to: GARMIN_PAGE, section: 'horloge-instellen' } : undefined;
  const linkedShown = input.showStatus && !!input.status && LINKED.has(input.status) && !!input.statusText;
  const rowSub = linkedShown ? input.statusText! : WATCH_SHEET_TEXT.rowSub;
  return { hasWatchSheet, workout, fields, zones, rowSub };
}

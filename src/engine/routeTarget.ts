// ASCEND: wat een looptraining van een route vraagt (afstand en hoogtemeters), en de keuzes van de
// instelling Route voorstellen. De afstand komt uit de training zelf, of uit de duur en je tempo
// (het echte tempo van je laatste lopen, anders het tempo uit je test, anders een rustig
// standaardtempo). Een wandeltraining is een duur, geen afstand: die gaat door engine/hikeTarget.ts
// (docs/visie/Ontwerp routes wandelen en rugzak.md). Pure: geen React, geen IndexedDB. Het verandert
// de planning nooit.

import type { SessionLog, SessionTemplate, TemplateRole } from '../models/training';
import type { Program } from '../models/program';
import type { RoutePoint, RouteStyle, RouteTarget } from '../models/route';
import type { PaceRange } from './racePaces';
import { progressionTarget } from './programLayout';
import { recentRunPace } from './recentRunPace';
import { templateSport } from './sports';
import { hasRole } from './templateRoles';
import { climbPace, type ClimbPaceState } from './climbPace';
import { walkRates, walkTarget } from './hikeTarget';
import { defaultRolesOf } from '../data/templateRoles';
import { getModalities, getModality, modalitySport } from '../data/modalities';

// Zonder eigen lopen en zonder test: 6:30 per kilometer, een rustig tempo.
export const DEFAULT_PACE_SEC_KM = 390;
// Een heuveltraining zonder getal: ongeveer drie meter stijgen per minuut training.
export const HILL_ASCENT_PER_MIN = 3;
export const MIN_ROUTE_KM = 2;
export const MAX_ROUTE_KM = 40;

export const resolveRouteStyle = (raw: unknown): RouteStyle => (raw === 'simple' ? 'simple' : 'adventure');

// Een opgeslagen sjabloon van voor een rol kent hem nog niet: dan ook de rollen van zijn id (zoals
// engine/trainingKind.ts).
const carries = (t: SessionTemplate, role: TemplateRole) => hasRole(t, role) || defaultRolesOf(t.id).includes(role);

// Een wandeltraining die een lus krijgt: een tocht, wandeldag, rugzakwandeling of klimtraining te voet
// ('walk'), of een herstelwandeling ('recovery', alleen na een tik). Trap af (rol descent) is een plek,
// geen lus. Een herstel is een wandeling als hij de keuze Herstelwandeling kent, dezelfde regel als
// engine/trainingPlace.ts#defaultPlace. De soort komt uit het sjabloon, nooit uit een tempo.
export type WalkKind = 'walk' | 'recovery';
export function walkKind(template: SessionTemplate | undefined): WalkKind | undefined {
  if (!template || template.type === 'strength') return undefined;
  if (template.type === 'recovery') return getModalities(template.id)?.some((m) => m.key === 'recovery_walk') ? 'recovery' : undefined;
  if (templateSport(template) !== 'hiking' || carries(template, 'descent')) return undefined;
  return 'walk';
}

// Een route is er voor elke looptraining en elke wandeltraining uit je planning (walkKind), niet voor
// kracht of een andere sport.
export const wantsRoute = (template: SessionTemplate | undefined): boolean =>
  !!template && template.type !== 'strength' && (templateSport(template) === 'running' || walkKind(template) !== undefined);

// Mag de Briefing bij het openen zelf een lus zoeken, als de instelling Lus zoeken dat zegt? Een
// herstelwandeling krijgt een lus alleen na een tik (advies, vraag 3 aan de eigenaar), tenzij de keuze
// Route bij wandelen (stap 5, nog zonder rij) 'withRecovery' is. Afwezig of onbekend: het advies.
export function searchesOnOpen(template: SessionTemplate | undefined, walkRoute?: unknown): boolean {
  return walkKind(template) !== 'recovery' || walkRoute === 'withRecovery';
}

// Hoort er een route bij deze training op deze plek (Waar train je?)? Alleen buiten en te voet: op de
// loopband, binnen of op de fiets is een looplus zinloos (eigenaar, 11 november). Zonder keuze, of met
// een sleutel die deze training niet kent, telt de training zelf, zoals voorheen.
export function wantsRouteAt(template: SessionTemplate | undefined, modalityKey: string | undefined): boolean {
  if (!wantsRoute(template)) return false;
  const modality = modalityKey ? getModality(template!.id, modalityKey) : undefined;
  if (!modality) return true;
  if (modality.environment !== 'outdoor') return false;
  const sport = modalitySport(modality.key);
  return sport === undefined || sport === 'running' || sport === 'hiking';
}

export interface RouteTargetInput {
  template: SessionTemplate;
  date: string;
  program?: Program | null;
  logs?: SessionLog[];
  // Het tempo uit je test voor deze training, als dat er is.
  testPace?: PaceRange;
  // Wandelen: je lichaamsgewicht (weightTrend.ts#loadBodyKg), voor de rugzak op je eigen klimtempo;
  // afwezig: de tijd wordt niet omgerekend.
  bodyKg?: number;
  // Wandelen: je klimtempo; afwezig rekent het uit `logs`.
  climb?: ClimbPaceState;
  // Wandelen, de keuzes die in stap 5 instelbaar worden (afwezig of onbekend: het advies):
  // Wandeltempo voor routes ('own' of 'norm', hikeTarget.ts#resolveWalkPace) en Als duur en
  // hoogtemeters botsen ('duration' of 'ascent', hikeTarget.ts#resolveWalkClash).
  walkPace?: unknown;
  walkClash?: unknown;
}

const clampKm = (km: number) => Math.min(MAX_ROUTE_KM, Math.max(MIN_ROUTE_KM, Math.round(km * 2) / 2));

export function routeTarget(input: RouteTargetInput): RouteTarget {
  if (walkKind(input.template)) return walkRouteTarget(input);
  const { template, date, program, logs = [], testPace } = input;
  const step = progressionTarget(template, program, date);
  const minutes = step?.minutes ?? template.durationVariants.full;
  const fixedKm = template.cardioTarget?.targetDistanceKm ?? template.outdoorTarget?.targetDistanceKm;
  const recent = recentRunPace(logs, template.id, date)?.range;
  const range = recent ?? testPace;
  const pace = range && range.fast > 0 && range.slow > 0 ? (range.fast + range.slow) / 2 : DEFAULT_PACE_SEC_KM;
  const rawKm = fixedKm ?? (minutes * 60) / pace;
  const distanceKm = clampKm(rawKm);
  const asked = step?.step.elevationGainM ?? template.outdoorTarget?.targetElevationM;
  const ascentM = asked ?? (hasRole(template, 'hills') ? Math.round((minutes * HILL_ASCENT_PER_MIN) / 10) * 10 : 0);
  return { distanceKm, ascentM: Math.max(0, ascentM) };
}

// Een wandeltraining: de duur, de hoogtemeters en de rugzak uit de stap van de week (of het sjabloon),
// naar een afstand en de hoogtemeters die in de duur passen (hikeTarget.ts#walkTarget). De duur is
// leidend; een afstand op het sjabloon telt hier niet. `ascentM` is waar de planner op mikt,
// `askedAscentM` wat de training vraagt.
function walkRouteTarget({ template, date, program, logs = [], bodyKg, climb, walkPace, walkClash }: RouteTargetInput): RouteTarget {
  const step = progressionTarget(template, program, date);
  const minutes = step?.minutes ?? template.durationVariants.full;
  const asked = step?.step.elevationGainM ?? template.outdoorTarget?.targetElevationM;
  const pack = step?.step.backpackKg ?? template.outdoorTarget?.backpackWeightKg;
  const packKg = typeof pack === 'number' && Number.isFinite(pack) && pack > 0 ? pack : undefined;
  const rates = walkRates(climb ?? climbPace(logs, date), { packKg, bodyKg, pace: walkPace });
  const t = walkTarget(minutes, asked, rates, walkClash);
  const askedAscentM = t.askedAscentM;
  return {
    distanceKm: clampKm(t.distanceKm),
    ascentM: t.ascentM,
    minutes: t.minutes,
    ...(packKg !== undefined ? { packKg } : {}),
    ...(askedAscentM > 0 ? { askedAscentM } : {}),
  };
}

// Het startpunt dat de deur uit gaat: afgerond op twee decimalen (ongeveer een kilometer), zoals de
// plek van het weer. Nooit de exacte plek en nooit een naam.
export function roundStart(place: { lat: number; lon: number }): RoutePoint {
  return { lat: Math.round(place.lat * 100) / 100, lon: Math.round(place.lon * 100) / 100 };
}

export function targetText(target: RouteTarget): string {
  const km = `${String(target.distanceKm).replace('.', ',')} km`;
  return target.ascentM >= 20 ? `${km}, ${Math.round(target.ascentM / 10) * 10} hoogtemeters` : km;
}

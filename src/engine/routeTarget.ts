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
import { walkRates, walkTarget, walkTimeText } from './hikeTarget';
import { askedAscent } from './routePlanner';
import { leaveDays } from './leave';
import type { LeavePeriod } from '../models/leave';
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
// geen lus; de ijktocht (rol calibration) loopt je vaste route, dus ook geen gezochte lus. Een herstel is een wandeling als hij de keuze Herstelwandeling kent, dezelfde regel als
// engine/trainingPlace.ts#defaultPlace. De soort komt uit het sjabloon, nooit uit een tempo.
export type WalkKind = 'walk' | 'recovery';
export function walkKind(template: SessionTemplate | undefined): WalkKind | undefined {
  if (!template || template.type === 'strength') return undefined;
  if (template.type === 'recovery') return getModalities(template.id)?.some((m) => m.key === 'recovery_walk') ? 'recovery' : undefined;
  if (templateSport(template) !== 'hiking' || carries(template, 'descent') || carries(template, 'calibration')) return undefined;
  return 'walk';
}

// Een route is er voor elke looptraining en elke wandeltraining uit je planning (walkKind), niet voor
// kracht of een andere sport.
export const wantsRoute = (template: SessionTemplate | undefined): boolean =>
  !!template && template.type !== 'strength' && (templateSport(template) === 'running' || walkKind(template) !== undefined);

// Een wandeling langer dan dit zoekt nooit vanzelf: de heuvels komen uit een cache van 3 km rond je plek,
// en voor een lus boven ongeveer 12 km is dat krap (ontwerp hoofdstuk 5). Na een tik wel.
export const AUTO_SEARCH_MAX_WALK_MIN = 180;

// Mag de Briefing bij het openen zelf een lus zoeken, als de instelling Lus zoeken dat zegt? Een
// herstelwandeling krijgt een lus alleen na een tik (advies, vraag 3 aan de eigenaar), tenzij de keuze
// Route bij wandelen (stap 5, nog zonder rij) 'withRecovery' is. Afwezig of onbekend: het advies.
// Een wandeling boven AUTO_SEARCH_MAX_WALK_MIN (`target.minutes`) zoekt alleen na een tik.
export function searchesOnOpen(template: SessionTemplate | undefined, target?: Pick<RouteTarget, 'minutes'>, walkRoute?: unknown): boolean {
  const kind = walkKind(template);
  if (kind === 'recovery' && walkRoute !== 'withRecovery') return false;
  if (kind && target?.minutes !== undefined && !(target.minutes <= AUTO_SEARCH_MAX_WALK_MIN)) return false;
  return true;
}

// Een dag van een tocht in je planning (Vrij en weg, soort trek) krijgt geen lus: je loopt je etappe.
export function isTrekDay(periods: LeavePeriod[] | undefined, date: string): boolean {
  return leaveDays(periods).get(date)?.kind === 'trek';
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
// Een wandeling heeft geen ondergrens van 2 km: bij duur eerst zou een korte wandeling anders te lang
// worden. Wel nooit korter dan de kortste lus van Korter (routeAdjust.ts#MIN_LOOP_KM, 1 km).
export const MIN_WALK_KM = 1;
const clampWalkKm = (km: number) => Math.min(MAX_ROUTE_KM, Math.max(MIN_WALK_KM, Math.round(km * 2) / 2));

// Het tempo waarop de afstand van een looptraining is bepaald: je laatste lopen, anders je test, anders het standaardtempo.
export function runPaceSecKm(logs: SessionLog[], templateId: string, date: string, testPace?: PaceRange): number {
  const range = recentRunPace(logs, templateId, date)?.range ?? testPace;
  return range && range.fast > 0 && range.slow > 0 ? (range.fast + range.slow) / 2 : DEFAULT_PACE_SEC_KM;
}

export function routeTarget(input: RouteTargetInput): RouteTarget {
  if (walkKind(input.template)) return walkRouteTarget(input);
  const { template, date, program, logs = [], testPace } = input;
  const step = progressionTarget(template, program, date);
  const minutes = step?.minutes ?? template.durationVariants.full;
  const fixedKm = template.cardioTarget?.targetDistanceKm ?? template.outdoorTarget?.targetDistanceKm;
  const pace = runPaceSecKm(logs, template.id, date, testPace);
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
    distanceKm: clampWalkKm(t.distanceKm),
    ascentM: t.ascentM,
    minutes: t.minutes,
    rates,
    ...(packKg !== undefined ? { packKg } : {}),
    ...(askedAscentM > 0 ? { askedAscentM } : {}),
  };
}

// Het startpunt dat de deur uit gaat: afgerond op twee decimalen (ongeveer een kilometer), zoals de
// plek van het weer. Nooit de exacte plek en nooit een naam.
export function roundStart(place: { lat: number; lon: number }): RoutePoint {
  return { lat: Math.round(place.lat * 100) / 100, lon: Math.round(place.lon * 100) / 100 };
}

const kmWord = (km: number) => `${String(km).replace('.', ',')} km`;

// Een wandeltraining in het blad Route: "3 uur met 500 hoogtemeters en 8 kg rugzak" (ontwerp hoofdstuk 4).
// Zonder hoogtemeters of rugzak valt dat deel weg.
function walkTargetText(target: RouteTarget & { minutes: number }): string {
  const asked = askedAscent(target);
  const parts = [
    ...(asked >= 20 ? [`${Math.round(asked / 10) * 10} hoogtemeters`] : []),
    ...(target.packKg !== undefined && target.packKg > 0 ? [`${String(Math.round(target.packKg * 10) / 10).replace('.', ',')} kg rugzak`] : []),
  ];
  const time = walkTimeText(target.minutes);
  return parts.length > 0 ? `${time} met ${parts.join(' en ')}` : time;
}

// Een wandeltraining in één korte regel, in de Briefing en De avond ervoor: "3 uur, ongeveer 8 km". De
// hoogtemeters en de rugzak staan daar al in de hartkaart. Een looptraining: undefined.
export function walkShortText(target: RouteTarget): string | undefined {
  return target.minutes === undefined ? undefined : `${walkTimeText(target.minutes)}, ongeveer ${kmWord(target.distanceKm)}`;
}

// De hoogtemeters die de training vraagt (routePlanner.ts#askedAscent), niet het getal dat in de duur past.
// Een wandeltraining zegt zijn duur (walkTargetText).
export function targetText(target: RouteTarget): string {
  if (target.minutes !== undefined) return walkTargetText({ ...target, minutes: target.minutes });
  const km = kmWord(target.distanceKm);
  const asked = askedAscent(target);
  return asked >= 20 ? `${km}, ${Math.round(asked / 10) * 10} hoogtemeters` : km;
}

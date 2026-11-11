// ASCEND: wat een looptraining van een route vraagt (afstand en hoogtemeters), en de keuzes van de
// instelling Route voorstellen. De afstand komt uit de training zelf, of uit de duur en je tempo
// (het echte tempo van je laatste lopen, anders het tempo uit je test, anders een rustig
// standaardtempo). Pure: geen React, geen IndexedDB. Het verandert de planning nooit.

import type { SessionLog, SessionTemplate } from '../models/training';
import type { Program } from '../models/program';
import type { RoutePoint, RouteStyle, RouteTarget } from '../models/route';
import type { PaceRange } from './racePaces';
import { progressionTarget } from './programLayout';
import { recentRunPace } from './recentRunPace';
import { templateSport } from './sports';
import { hasRole } from './templateRoles';
import { getModality, modalitySport } from '../data/modalities';

// Zonder eigen lopen en zonder test: 6:30 per kilometer, een rustig tempo.
export const DEFAULT_PACE_SEC_KM = 390;
// Een heuveltraining zonder getal: ongeveer drie meter stijgen per minuut training.
export const HILL_ASCENT_PER_MIN = 3;
export const MIN_ROUTE_KM = 2;
export const MAX_ROUTE_KM = 40;

export const resolveRouteStyle = (raw: unknown): RouteStyle => (raw === 'simple' ? 'simple' : 'adventure');

// Een route is er voor elke looptraining uit je planning, niet voor kracht of een andere sport.
export const wantsRoute = (template: SessionTemplate | undefined): boolean => !!template && template.type !== 'strength' && templateSport(template) === 'running';

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
}

export function routeTarget({ template, date, program, logs = [], testPace }: RouteTargetInput): RouteTarget {
  const step = progressionTarget(template, program, date);
  const minutes = step?.minutes ?? template.durationVariants.full;
  const fixedKm = template.cardioTarget?.targetDistanceKm ?? template.outdoorTarget?.targetDistanceKm;
  const recent = recentRunPace(logs, template.id, date)?.range;
  const range = recent ?? testPace;
  const pace = range && range.fast > 0 && range.slow > 0 ? (range.fast + range.slow) / 2 : DEFAULT_PACE_SEC_KM;
  const rawKm = fixedKm ?? (minutes * 60) / pace;
  const distanceKm = Math.min(MAX_ROUTE_KM, Math.max(MIN_ROUTE_KM, Math.round(rawKm * 2) / 2));
  const asked = step?.step.elevationGainM ?? template.outdoorTarget?.targetElevationM;
  const ascentM = asked ?? (hasRole(template, 'hills') ? Math.round((minutes * HILL_ASCENT_PER_MIN) / 10) * 10 : 0);
  return { distanceKm, ascentM: Math.max(0, ascentM) };
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

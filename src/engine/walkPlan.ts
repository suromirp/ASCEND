// ASCEND: een wandeling die je zelf plant (Wandeling plannen op Vandaag), zonder training: een afstand en
// hooguit een wens voor de hoogtemeters, naar het doel waarmee de bestaande routezoektocht zoekt
// (storage/routeProposal.ts#findRoutes via components/useRouteSearch.ts). Geen PlannedSession, geen log,
// geen voorstel: het plant niets en bewaart niets (besluit 2026-11-15-wandeling-plannen.md). Puur.

import type { RouteTarget } from '../models/route';
import { MIN_ASCENT_TARGET_M } from './routePlanner';
import { MAX_ROUTE_KM, MIN_WALK_KM } from './routeTarget';
import { NORM_WALK_RATES, hikeMinutes, walkTimeText } from './hikeTarget';
import { formatNumberNL } from '../utils/number';

// De chips van de afstand; Anders is een eigen getal.
export const WALK_KM_CHOICES = [3, 5, 8, 12] as const;
export type WalkKmChoice = (typeof WALK_KM_CHOICES)[number];
// Het advies: vijf kilometer, ruim een uur op de wandelnorm.
export const WALK_KM_ADVICE: WalkKmChoice = 5;

// De instelling Afstand van een wandeling (settingsDefs/vandaag.ts#wandelAfstand). Afwezig of onbekend: het advies.
export function resolveWalkKm(raw: unknown): WalkKmChoice {
  const n = typeof raw === 'string' ? Number(raw) : raw;
  return (WALK_KM_CHOICES as readonly unknown[]).includes(n) ? (n as WalkKmChoice) : WALK_KM_ADVICE;
}

// De hoogtewens: geen voorkeur, vlak, heuvelig of pittig, of een eigen getal (Anders).
export type WalkClimb = 'none' | 'flat' | 'hilly' | 'steep';
export const WALK_CLIMB_CHOICES: readonly WalkClimb[] = ['none', 'flat', 'hilly', 'steep'];
export const WALK_CLIMB_LABEL: Record<WalkClimb, string> = { none: 'Geen voorkeur', flat: 'Vlak', hilly: 'Heuvelig', steep: 'Pittig' };
// Meter stijgen per kilometer: heuvelig is een glooiende wandeling, pittig zijn echte hellingen.
export const WALK_CLIMB_PER_KM: Record<'hilly' | 'steep', number> = { hilly: 10, steep: 25 };
// Een eigen getal blijft binnen wat een lus rond je plek kan geven.
export const MAX_WALK_ASCENT_M = 2000;

export interface WalkWish {
  km: number;
  climb: WalkClimb;
  // Anders: een eigen aantal hoogtemeters; gaat voor `climb`.
  ascentM?: number;
}

const clampKm = (km: number) => (Number.isFinite(km) ? Math.min(MAX_ROUTE_KM, Math.max(MIN_WALK_KM, Math.round(km * 2) / 2)) : WALK_KM_ADVICE);
const round10 = (m: number) => Math.round(m / 10) * 10;

// De hoogtemeters waar de lus op mikt. Geen voorkeur en Vlak: nul (de planner zoekt dan een vlakke lus);
// heuvelig en pittig per kilometer, nooit onder de grens waarboven de planner hellingen zoekt.
export function walkAscent(wish: WalkWish): number {
  if (wish.ascentM !== undefined && Number.isFinite(wish.ascentM)) return Math.min(MAX_WALK_ASCENT_M, Math.max(0, round10(wish.ascentM)));
  if (wish.climb === 'none' || wish.climb === 'flat') return 0;
  return Math.max(MIN_ASCENT_TARGET_M, round10(clampKm(wish.km) * WALK_CLIMB_PER_KM[wish.climb]));
}

// Het doel van de zoektocht. `plannedWalk`: de zinnen zeggen "je wandeling" in plaats van "je training".
// `flat`: Vlak gekozen, dan telt de stijging mee in de keuze van de lus (routePlanner.ts#missScore).
// Geen `minutes`: de afstand is leidend, niet de duur (zoals bij een looptraining).
export function walkPlanTarget(wish: WalkWish): RouteTarget {
  const ascentM = walkAscent(wish);
  return {
    distanceKm: clampKm(wish.km),
    ascentM,
    plannedWalk: true,
    ...(wish.ascentM === undefined && wish.climb === 'flat' ? { flat: true } : {}),
  };
}

// Ongeveer hoe lang de wandeling duurt, op de wandelnorm (4 km per uur, zonder pauzes): wie met anderen
// loopt, loopt niet op zijn eigen klimtempo.
export function walkPlanMinutes(target: Pick<RouteTarget, 'distanceKm' | 'ascentM'>): number {
  return hikeMinutes({ km: target.distanceKm, up: target.ascentM, down: target.ascentM }, NORM_WALK_RATES);
}

// De bijregel onder de afstand: "Ongeveer 1 uur 15, zonder pauzes."
export function walkDurationLine(target: Pick<RouteTarget, 'distanceKm' | 'ascentM'>): string {
  return `Ongeveer ${walkTimeText(walkPlanMinutes(target))}, zonder pauzes.`;
}

// De regel boven de kaart: "Je wandeling: 5 km, ongeveer 1 uur 15." Met hoogtemeters erbij als je die vroeg.
export function walkPlanText(target: Pick<RouteTarget, 'distanceKm' | 'ascentM'>): string {
  const km = `${formatNumberNL(target.distanceKm, Number.isInteger(target.distanceKm) ? 0 : 1)} km`;
  const up = target.ascentM >= MIN_ASCENT_TARGET_M ? `, ${formatNumberNL(target.ascentM, 0)} hoogtemeters` : '';
  return `Je wandeling: ${km}${up}, ongeveer ${walkTimeText(walkPlanMinutes(target))}.`;
}

// Anders: een eigen afstand tussen 1 en 40 km, een eigen aantal hoogtemeters tot 2000 m.
export const WALK_KM_RANGE_LINE = `Tussen ${formatNumberNL(MIN_WALK_KM, 0)} en ${formatNumberNL(MAX_ROUTE_KM, 0)} km.`;
export const WALK_ASCENT_RANGE_LINE = `Tot ${formatNumberNL(MAX_WALK_ASCENT_M, 0)} hoogtemeters.`;
export const validWalkKm = (km: number | undefined): km is number => km !== undefined && Number.isFinite(km) && km >= MIN_WALK_KM && km <= MAX_ROUTE_KM;
export const validWalkAscent = (m: number | undefined): m is number => m !== undefined && Number.isFinite(m) && m >= 0 && m <= MAX_WALK_ASCENT_M;

// Onder de route: een wandeling is geen training en komt niet vanzelf in je logboek.
export const WALK_LOG_LINE = 'Gelopen? Log hem achteraf bij Losse training, Wandelen.';

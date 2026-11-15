// ASCEND: een route zoeken voor een training: de heuvels en paden rond de plek (de cache van
// storage/nearbyTerrain.ts), de routeplanner (BRouter, anders Valhalla) en de engine die de lussen
// kiest (engine/routePlanner.ts). Het geheel heeft een grens in tijd en gooit nooit: de uitkomst is
// altijd lussen, "zonder netwerk" of "te lang". Een route wordt niet bewaard.
//
// De eerste vraag ("mag ASCEND een route zoeken?") is een eigen sleutel op dit toestel: pas na een
// ja gaat de afgeronde plek (of je plek van nu, of je vaste punt) de deur uit.

import { MetaRepo } from './database';
import { grantTerrainConsent, getNearbyTerrain, refreshNearbyTerrain } from './nearbyTerrain';
import { brouterRoute } from '../integrations/brouter';
import { valhallaRoute } from '../integrations/valhalla';
import { isOffline, routeWithFallback } from '../integrations/routing';
import { proposeRoutes, type RoutePlans } from '../engine/routePlanner';
import { roundStart } from '../engine/routeTarget';
import type { NearbyTerrain } from '../models/nearbyTerrain';
import type { AvoidArea, RouteAnswer, RouteFn, RoutePoint, RouteTarget } from '../models/route';
import { TimeoutError, withTimeout } from '../utils/withTimeout';

const CONSENT_KEY = 'routeProposalAsked';
export const PROPOSAL_LIMIT_MS = 30_000;
// De stap heuvels en paden (Overpass en de hoogtes, samen tot 20 s) krijgt hoogstens een derde van de
// grens: bij zwak bereik bleef er anders niets over voor de routeplanner (I-8, op reis 14 november).
// Is de kaart dan niet binnen, dan zoekt de planner zonder, met wat er al bewaard lag; de aanvraag loopt
// door en komt in de cache, zodat Opnieuw hem wel heeft.
export const TERRAIN_STEP_LIMIT_MS = 10_000;
// Zo lang voor de grens vraagt de planner niets meer en geeft hij de lussen die er al zijn.
export const ROUTE_FINISH_MS = 1_000;

export async function hasRouteConsent(): Promise<boolean> {
  try {
    return (await MetaRepo.get<string>(CONSENT_KEY)) === 'yes';
  } catch {
    return false;
  }
}

// Een ja geldt ook voor het zoeken van heuvels: dezelfde afgeronde plek gaat naar OpenStreetMap.
export async function grantRouteConsent(): Promise<void> {
  try {
    await MetaRepo.set(CONSENT_KEY, 'yes');
  } catch {
    // Zonder opslag vraagt de app het de volgende keer opnieuw.
  }
  await grantTerrainConsent();
}

export type RouteSearch = { kind: 'plans'; plans: RoutePlans } | { kind: 'offline' } | { kind: 'timeout' };

export interface RouteSearchDeps {
  // Sluit het paneel, dan stopt de zoektocht: er gaat geen aanroep meer de deur uit.
  signal?: AbortSignal;
  route?: RouteFn;
  terrain?: (place: { name: string; lat: number; lon: number }, exact: boolean) => Promise<NearbyTerrain | undefined>;
  // Wat er al bewaard lag, als de kaart niet op tijd antwoordt; standaard de cache van nearbyTerrain.
  cachedTerrain?: (place: { name: string; lat: number; lon: number }, exact: boolean) => Promise<NearbyTerrain | undefined>;
  offline?: () => boolean;
  limitMs?: number;
  // Welke stap nu loopt, voor de regel tijdens het zoeken. Alleen tekst.
  onStep?: (step: RouteSearchStep) => void;
  // Waar heuvels en paden gezocht worden bij een precies startpunt; standaard dat punt zelf.
  terrainAt?: RoutePoint;
  // Stukken die de lus moet mijden (Vermijd dit stuk, engine/routeAdjust.ts).
  avoid?: AvoidArea[];
  // Grote wegen mijden in de aanvraag (instelling Grote wegen mijden); afwezig is aan.
  avoidBigRoads?: boolean;
}

export type RouteSearchStep = 'terrain' | 'routes';

// `exactStart` (Startpunt van je lus: Waar je nu bent of Vast punt) is een echt punt van de gebruiker: de lus begint en
// eindigt er precies, en ook de heuvels en paden zoekt OpenStreetMap om dat punt (vier decimalen,
// een eigen plek in de cache). Besluit 2026-11-11-route-verfijnen.md.
export async function findRoutes(place: { lat: number; lon: number }, target: RouteTarget, deps: RouteSearchDeps = {}, exactStart?: RoutePoint): Promise<RouteSearch> {
  if ((deps.offline ?? isOffline)()) return { kind: 'offline' };
  const rounded = roundStart(exactStart ?? place);
  const start = exactStart ?? rounded;
  const limitMs = deps.limitMs ?? PROPOSAL_LIMIT_MS;
  const budget = searchBudget(limitMs);
  const began = Date.now();
  // Na de tijdgrens of na sluiten stopt ook het werk erachter, niet alleen het wachten.
  let over = false;
  const stopped = () => over || deps.signal?.aborted === true;
  const inner = deps.route ?? routeWithFallback([brouterRoute({ quiet: deps.avoidBigRoads !== false }), valhallaRoute({ quiet: deps.avoidBigRoads !== false })], undefined, stopped);
  // Vlak voor de grens antwoordt een aanroep die nog loopt als "niet op tijd": de planner houdt dan de
  // beste lus die er al is, in plaats van dat de grens alles weggooit.
  const route: RouteFn = (waypoints, options) => {
    if (stopped()) return Promise.resolve({ ok: false, reason: 'timeout' });
    const left = began + budget.routesUntilMs - Date.now();
    if (left <= 0) {
      over = true;
      return Promise.resolve({ ok: false, reason: 'timeout' });
    }
    return withTimeout(inner(waypoints, options), left).catch((err: unknown): RouteAnswer => {
      // Alleen de grens stopt de rest; een andere fout van een bron is een fout, geen tijdgrens.
      if (!(err instanceof TimeoutError)) return { ok: false, reason: 'error' };
      over = true;
      return { ok: false, reason: 'timeout' };
    });
  };
  const terrainOf = deps.terrain ?? ((p, exact) => refreshNearbyTerrain(p, { exact }).catch(() => getNearbyTerrain(p, exact)));
  const cachedOf = deps.cachedTerrain ?? getNearbyTerrain;
  const search = (async (): Promise<RouteSearch> => {
    // Zonder heuvels en paden zoekt de planner nog steeds een lus, op punten rond het startpunt.
    deps.onStep?.('terrain');
    const terrainPlace = { name: '', ...(exactStart ? deps.terrainAt ?? exactStart : rounded) };
    const terrain = await withTimeout(terrainOf(terrainPlace, !!exactStart), budget.terrainMs).catch(() =>
      withTimeout(cachedOf(terrainPlace, !!exactStart), budget.cacheMs).catch(() => undefined),
    );
    if (!stopped()) deps.onStep?.('routes');
    const plans = await proposeRoutes({ start, target, terrain, anchor: !!exactStart, ...(deps.avoid && deps.avoid.length > 0 ? { avoid: deps.avoid } : {}) }, route);
    const reasons = [plans.simple, plans.adventure].map((o) => (o.ok ? undefined : o.reason));
    if (reasons.every((r) => r === 'offline')) return { kind: 'offline' };
    // Geen enkele lus en de tijd was op: dan is het de regel van de tijdgrens, met de stap erbij.
    if (reasons.every((r) => r === 'timeout')) return { kind: 'timeout' };
    return { kind: 'plans', plans };
  })();
  try {
    return await withTimeout(search, limitMs);
  } catch {
    over = true;
    return { kind: 'timeout' };
  }
}

// Hoe de grens van een zoektocht verdeeld wordt: heuvels en paden hoogstens een derde, de routeplanner
// tot vlak voor de grens. Puur, voor de tests; bij een kleine grens (tests) schalen de delen mee.
export function searchBudget(limitMs: number): { terrainMs: number; cacheMs: number; routesUntilMs: number } {
  return {
    terrainMs: Math.min(TERRAIN_STEP_LIMIT_MS, Math.round(limitMs / 3)),
    cacheMs: Math.min(2_000, Math.round(limitMs / 10)),
    routesUntilMs: limitMs - Math.min(ROUTE_FINISH_MS, Math.round(limitMs / 5)),
  };
}

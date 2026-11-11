// ASCEND: een route zoeken voor een training: de heuvels en paden rond de plek (de cache van
// storage/nearbyTerrain.ts), de routeplanner (BRouter, anders Valhalla) en de engine die de lussen
// kiest (engine/routePlanner.ts). Het geheel heeft een grens in tijd en gooit nooit: de uitkomst is
// altijd lussen, "zonder netwerk" of "te lang". Een route wordt niet bewaard.
//
// De eerste vraag ("mag ASCEND een route zoeken?") is een eigen sleutel op dit toestel: pas na een
// ja gaat de afgeronde plek (of bij Precies het eigen startpunt) de deur uit.

import { MetaRepo } from './database';
import { grantTerrainConsent, getNearbyTerrain, refreshNearbyTerrain } from './nearbyTerrain';
import { brouterRoute } from '../integrations/brouter';
import { valhallaRoute } from '../integrations/valhalla';
import { isOffline, routeWithFallback } from '../integrations/routing';
import { proposeRoutes, type RoutePlans } from '../engine/routePlanner';
import { roundStart } from '../engine/routeTarget';
import type { NearbyTerrain } from '../models/nearbyTerrain';
import type { RouteFn, RoutePoint, RouteTarget } from '../models/route';
import { withTimeout } from '../utils/withTimeout';

const CONSENT_KEY = 'routeProposalAsked';
export const PROPOSAL_LIMIT_MS = 30_000;

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
  offline?: () => boolean;
  limitMs?: number;
}

// `exactStart` (Startpunt van je lus, Precies) is het eigen punt van de gebruiker: de lus begint en
// eindigt er precies, en ook de heuvels en paden zoekt OpenStreetMap om dat punt (vier decimalen,
// een eigen plek in de cache). Besluit 2026-11-11-route-verfijnen.md.
export async function findRoutes(place: { lat: number; lon: number }, target: RouteTarget, deps: RouteSearchDeps = {}, exactStart?: RoutePoint): Promise<RouteSearch> {
  if ((deps.offline ?? isOffline)()) return { kind: 'offline' };
  const rounded = roundStart(exactStart ?? place);
  const start = exactStart ?? rounded;
  // Na de tijdgrens of na sluiten stopt ook het werk erachter, niet alleen het wachten.
  let over = false;
  const stopped = () => over || deps.signal?.aborted === true;
  const inner = deps.route ?? routeWithFallback([brouterRoute(), valhallaRoute()], undefined, stopped);
  const route: RouteFn = (waypoints) => (stopped() ? Promise.resolve({ ok: false, reason: 'timeout' }) : inner(waypoints));
  const terrainOf = deps.terrain ?? ((p, exact) => refreshNearbyTerrain(p, { exact }).catch(() => getNearbyTerrain(p, exact)));
  const search = (async (): Promise<RouteSearch> => {
    // Zonder heuvels en paden zoekt de planner nog steeds een lus, op punten rond het startpunt.
    const terrain = await terrainOf({ name: '', ...(exactStart ?? rounded) }, !!exactStart).catch(() => undefined);
    const plans = await proposeRoutes({ start, target, terrain, anchor: !!exactStart }, route);
    const reasons = [plans.simple, plans.adventure].map((o) => (o.ok ? undefined : o.reason));
    if (reasons.every((r) => r === 'offline')) return { kind: 'offline' };
    return { kind: 'plans', plans };
  })();
  try {
    return await withTimeout(search, deps.limitMs ?? PROPOSAL_LIMIT_MS);
  } catch {
    over = true;
    return { kind: 'timeout' };
  }
}

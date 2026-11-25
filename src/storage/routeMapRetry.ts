// ASCEND: Opnieuw proberen bij een ontbrekende kaart van de omgeving (I-160). Haalt alleen de heuvels en
// paden rond de plek opnieuw op (storage/nearbyTerrain.ts, dezelfde plek en afronding als findRoutes), met
// een grens in tijd; het zoeken van de lussen daarna is een gewone nieuwe zoektocht. Gooit nooit: de
// uitkomst is ja (de kaart is er) of nee (niet binnen of zonder netwerk).

import { refreshNearbyTerrain } from './nearbyTerrain';
import { roundStart } from '../engine/routeTarget';
import { isOffline } from '../integrations/routing';
import { ELEVATION_TIMEOUT_MS, OVERPASS_TIMEOUT_MS } from '../integrations/overpass';
import type { NearbyTerrain } from '../models/nearbyTerrain';
import type { RoutePoint } from '../models/route';
import { withTimeout } from '../utils/withTimeout';

// De grens van de Overpass-aanroep en de hoogtes samen.
export const MAP_RETRY_LIMIT_MS = OVERPASS_TIMEOUT_MS + ELEVATION_TIMEOUT_MS;

export interface MapRetryDeps {
  terrain?: (place: { name: string; lat: number; lon: number }, exact: boolean) => Promise<NearbyTerrain | undefined>;
  offline?: () => boolean;
  limitMs?: number;
}

export async function retryRouteMap(place: { lat: number; lon: number }, exactStart?: RoutePoint, terrainAt?: RoutePoint, deps: MapRetryDeps = {}): Promise<boolean> {
  if ((deps.offline ?? isOffline)()) return false;
  const terrainOf = deps.terrain ?? ((p, exact) => refreshNearbyTerrain(p, { exact }));
  const at = exactStart ? terrainAt ?? exactStart : roundStart(place);
  try {
    const terrain = await withTimeout(terrainOf({ name: '', lat: at.lat, lon: at.lon }, !!exactStart), deps.limitMs ?? MAP_RETRY_LIMIT_MS);
    return terrain !== undefined;
  } catch {
    return false;
  }
}
